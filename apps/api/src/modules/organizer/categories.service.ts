import { Inject, Injectable } from '@nestjs/common';
import type { CategoryCreate, CategoryPatch, CriterionInput, PenaltyTypeInput } from '@polechamp/contracts';
import { maxJudgeScore, templateForStyle } from '@polechamp/scoring';
import { and, asc, eq, gt, sql } from 'drizzle-orm';
import type { z } from 'zod';
import { DomainError } from '../../common/errors/domain-error.js';
import { DB, type Db, type Tx } from '../../db/client.js';
import {
  assertTournamentWritable,
  assertVersion,
  type CategoryRow,
  OwnershipRepository,
} from '../../db/repositories/ownership.repository.js';
import {
  category,
  categoryJudge,
  criterion,
  entry,
  judge,
  penaltyType,
  rejectedSubmission,
} from '../../db/schema.js';
import { withTx } from '../../db/tx.js';
import { AuditService, ChangeLogService, DomainEventService } from '../audit/audit.service.js';
import { LimitsService } from '../limits/limits.service.js';
import { ResultsService } from '../results/results.service.js';
import { categoryBase, toCriterion, toPenaltyType, toTenths } from './mappers.js';
import { TournamentsService } from './tournaments.service.js';
import { one } from '../../db/one.js';

/** Kategorie, kryteria i kary (03-api §3.3; IMP-124…126). */
@Injectable()
export class CategoriesService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(OwnershipRepository) private readonly owned: OwnershipRepository,
    @Inject(LimitsService) private readonly limits: LimitsService,
    @Inject(ResultsService) private readonly results: ResultsService,
    @Inject(TournamentsService) private readonly tournaments: TournamentsService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(ChangeLogService) private readonly changes: ChangeLogService,
    @Inject(DomainEventService) private readonly events: DomainEventService,
  ) {}

  async details(conn: Db | Tx, c: CategoryRow) {
    const criteria = await conn
      .select()
      .from(criterion)
      .where(eq(criterion.categoryId, c.id))
      .orderBy(asc(criterion.position));
    const penalties = await conn
      .select()
      .from(penaltyType)
      .where(eq(penaltyType.categoryId, c.id))
      .orderBy(asc(penaltyType.position));
    const { progress, entryCount, judgeCount } = await this.results.progress(conn, c);
    const [pending] = await conn
      .select({ n: sql<number>`count(*)::int` })
      .from(rejectedSubmission)
      .where(and(eq(rejectedSubmission.categoryId, c.id), eq(rejectedSubmission.resolution, 'PENDING')));
    return {
      ...categoryBase(c),
      tournamentId: c.tournamentId,
      aggregationMethod: c.aggregationMethod,
      tieBreakCriterionId: c.tieBreakCriterionId ?? criteria[0]?.id ?? null,
      maxJudgeScore: maxJudgeScore(criteria) / 100,
      entryCount,
      judgeCount,
      progress,
      pendingRejectedSubmissions: pending?.n ?? 0,
      criteria: criteria.map(toCriterion),
      penaltyTypes: penalties.map(toPenaltyType),
      version: c.version,
    };
  }

  async list(ownerId: string, tournamentId: string) {
    const t = await this.owned.tournament(this.db, tournamentId, ownerId);
    const rows = await this.db
      .select()
      .from(category)
      .where(eq(category.tournamentId, t.id))
      .orderBy(asc(category.position));
    const items = await Promise.all(
      rows.map(async (c) => {
        const { progress, entryCount } = await this.results.progress(this.db, c);
        return { ...categoryBase(c), entryCount, progress };
      }),
    );
    return { items };
  }

  async get(ownerId: string, categoryId: string) {
    const { category: c } = await this.owned.category(this.db, categoryId, ownerId);
    return this.details(this.db, c);
  }

  private async configChanged(
    tx: Tx,
    c: CategoryRow,
    scope: 'criteria' | 'penalties',
    entityType: 'criterion' | 'penalty_type',
    entityId: string,
    op: 'U' | 'D' = 'U',
  ) {
    await this.changes.append(tx, { tournamentId: c.tournamentId, entityType, entityId, op });
    await this.events.emit(tx, 'config.changed', { categoryId: c.id, scope }, c.tournamentId);
    await tx
      .update(category)
      .set({ version: sql`${category.version} + 1`, updatedAt: new Date() })
      .where(eq(category.id, c.id));
  }

  /** Nowa kategoria z kryteriami i karami z szablonu stylu (FR-301, D-SC-12). */
  async create(ownerId: string, tournamentId: string, input: CategoryCreate) {
    return withTx(this.db, async (tx) => {
      const t = await this.owned.tournament(tx, tournamentId, ownerId, true);
      assertTournamentWritable(t);
      await this.limits.assertCanAdd(tx, 'categories', t.id);
      const [last] = await tx
        .select({ max: sql<number>`coalesce(max(${category.position}), 0)::int` })
        .from(category)
        .where(eq(category.tournamentId, t.id));
      const c = one(
        await tx
          .insert(category)
          .values({
            tournamentId: t.id,
            name: input.name,
            style: input.style,
            level: input.level,
            ageGroup: input.ageGroup,
            position: (last?.max ?? 0) + 1,
          })
          .returning(),
      );
      const template = templateForStyle(input.style);
      const criteria = await tx
        .insert(criterion)
        .values(
          template.criteria.map((k, i) => ({
            categoryId: c.id,
            name: k.name,
            description: k.description,
            scaleMax: k.scaleMax,
            weightTenths: k.weightTenths,
            position: i + 1,
          })),
        )
        .returning();
      await tx.insert(penaltyType).values(
        template.penaltyTypes.map((p, i) => ({
          categoryId: c.id,
          name: p.name,
          pointsTenths: p.pointsTenths,
          maxOccurrences: p.maxOccurrences,
          position: i + 1,
        })),
      );
      const withTieBreak = one(
        await tx
          .update(category)
          .set({ tieBreakCriterionId: one(criteria).id })
          .where(eq(category.id, c.id))
          .returning(),
      );
      await this.audit.record(tx, {
        action: 'CATEGORY_CREATED',
        tournamentId: t.id,
        entityType: 'category',
        entityId: c.id,
        after: categoryBase(c),
      });
      await this.changes.append(tx, { tournamentId: t.id, entityType: 'category', entityId: c.id });
      await this.events.emit(tx, 'category.updated', { categoryId: c.id, status: 'DRAFT', version: 1 }, t.id);
      return this.details(tx, withTieBreak);
    });
  }

  async patch(ownerId: string, categoryId: string, version: number, patch: z.output<typeof CategoryPatch>) {
    return withTx(this.db, async (tx) => {
      const { category: c, tournament: t } = await this.owned.category(tx, categoryId, ownerId, true);
      assertTournamentWritable(t);
      assertVersion(c.version, version);
      const changesStyle =
        (patch.style && patch.style !== c.style) || (patch.level && patch.level !== c.level);
      if (changesStyle && c.status !== 'DRAFT')
        throw new DomainError(
          'CRITERIA_LOCKED',
          'Styl i poziom można zmienić tylko przed rozpoczęciem kategorii.',
        );
      const updated = one(
        await tx
          .update(category)
          .set({ ...patch, version: c.version + 1, updatedAt: new Date() })
          .where(eq(category.id, c.id))
          .returning(),
      );
      await this.audit.record(tx, {
        action: 'CATEGORY_UPDATED',
        tournamentId: t.id,
        entityType: 'category',
        entityId: c.id,
        before: categoryBase(c),
        after: categoryBase(updated),
      });
      await this.changes.append(tx, { tournamentId: t.id, entityType: 'category', entityId: c.id });
      await this.events.emit(
        tx,
        'category.updated',
        { categoryId: c.id, status: updated.status, version: updated.version },
        t.id,
      );
      return this.details(tx, updated);
    });
  }

  async remove(ownerId: string, categoryId: string, version: number) {
    await withTx(this.db, async (tx) => {
      const { category: c, tournament: t } = await this.owned.category(tx, categoryId, ownerId, true);
      assertTournamentWritable(t);
      assertVersion(c.version, version);
      if (c.status !== 'DRAFT') throw new DomainError('INVALID_STATE_TRANSITION');
      await tx.delete(category).where(eq(category.id, c.id));
      await this.audit.record(tx, {
        action: 'CATEGORY_DELETED',
        tournamentId: t.id,
        entityType: 'category',
        entityId: c.id,
        before: categoryBase(c),
      });
      await this.changes.append(tx, { tournamentId: t.id, entityType: 'category', entityId: c.id, op: 'D' });
    });
  }

  /** Start kategorii: warunki, panel = aktywni sędziowie, auto-start turnieju (IMP-126, TL-10). */
  async start(ownerId: string, categoryId: string) {
    return withTx(this.db, async (tx) => {
      const { category: c, tournament: t } = await this.owned.category(tx, categoryId, ownerId, true);
      assertTournamentWritable(t);
      if (c.status !== 'DRAFT') throw new DomainError('INVALID_STATE_TRANSITION');
      const count = async (q: Promise<{ n: number }[]>) => (await q)[0]?.n ?? 0;
      const n = sql<number>`count(*)::int`;
      if ((await count(tx.select({ n }).from(criterion).where(eq(criterion.categoryId, c.id)))) === 0) {
        throw new DomainError('START_REQUIREMENTS_NOT_MET', 'NO_CRITERIA');
      }
      if (
        (await count(
          tx
            .select({ n })
            .from(entry)
            .where(and(eq(entry.categoryId, c.id), eq(entry.status, 'ACTIVE'))),
        )) === 0
      ) {
        throw new DomainError('START_REQUIREMENTS_NOT_MET', 'NO_ACTIVE_ENTRIES');
      }
      const activeJudges = await tx
        .select({ id: judge.id })
        .from(judge)
        .where(and(eq(judge.tournamentId, t.id), eq(judge.isActive, true)));
      if (activeJudges.length === 0) throw new DomainError('START_REQUIREMENTS_NOT_MET', 'NO_ACTIVE_JUDGES');
      if (t.status === 'DRAFT') await this.tournaments.startWithinTx(tx, t, ownerId);

      const updated = one(
        await tx
          .update(category)
          .set({
            status: 'IN_PROGRESS',
            startedAt: new Date(),
            version: c.version + 1,
            updatedAt: new Date(),
          })
          .where(eq(category.id, c.id))
          .returning(),
      );
      await tx
        .insert(categoryJudge)
        .values(activeJudges.map((j) => ({ categoryId: c.id, judgeId: j.id })))
        .onConflictDoNothing();
      await this.audit.record(tx, {
        action: 'CATEGORY_STARTED',
        tournamentId: t.id,
        entityType: 'category',
        entityId: c.id,
        after: { panelJudgeIds: activeJudges.map((j) => j.id) },
      });
      const cursor = await this.changes.append(tx, {
        tournamentId: t.id,
        entityType: 'category',
        entityId: c.id,
      });
      await this.events.emit(
        tx,
        'category.updated',
        { categoryId: c.id, status: 'IN_PROGRESS', version: updated.version },
        t.id,
      );
      await this.events.emit(tx, 'sync.hint', { cursor }, t.id);
      // Pierwsza wersja wyników (wszystkie starty bez ocen) – `category_result` kompletny od startu.
      await this.results.recalculate(tx, c.id);
      return this.details(tx, (await this.owned.category(tx, c.id, ownerId)).category);
    });
  }

  // IMP-125 – kryteria i kary (tylko w kategorii W przygotowaniu – INT-04)
  private async editableCategory(tx: Tx, categoryId: string, ownerId: string) {
    const scope = await this.owned.category(tx, categoryId, ownerId, true);
    assertTournamentWritable(scope.tournament);
    if (scope.category.status !== 'DRAFT') throw new DomainError('CRITERIA_LOCKED');
    return scope;
  }

  async addCriterion(ownerId: string, categoryId: string, input: CriterionInput) {
    return withTx(this.db, async (tx) => {
      const { category: c } = await this.editableCategory(tx, categoryId, ownerId);
      await this.limits.assertCanAdd(tx, 'criteria', c.id);
      const [last] = await tx
        .select({ max: sql<number>`coalesce(max(${criterion.position}), 0)::int` })
        .from(criterion)
        .where(eq(criterion.categoryId, c.id));
      const row = one(
        await tx
          .insert(criterion)
          .values({
            categoryId: c.id,
            name: input.name,
            description: input.description ?? null,
            scaleMax: input.scaleMax,
            weightTenths: toTenths(input.weight),
            position: (last?.max ?? 0) + 1,
          })
          .returning(),
      );
      await this.audit.record(tx, {
        action: 'CRITERION_CREATED',
        tournamentId: c.tournamentId,
        entityType: 'criterion',
        entityId: row.id,
        after: toCriterion(row),
      });
      await this.configChanged(tx, c, 'criteria', 'criterion', row.id);
      return toCriterion(row);
    });
  }

  async patchCriterion(ownerId: string, criterionId: string, input: Partial<CriterionInput>) {
    return withTx(this.db, async (tx) => {
      const { criterion: before } = await this.owned.criterion(tx, criterionId, ownerId);
      const { category: c } = await this.editableCategory(tx, before.categoryId, ownerId);
      const row = one(
        await tx
          .update(criterion)
          .set({
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.description !== undefined ? { description: input.description } : {}),
            ...(input.scaleMax !== undefined ? { scaleMax: input.scaleMax } : {}),
            ...(input.weight !== undefined ? { weightTenths: toTenths(input.weight) } : {}),
            updatedAt: new Date(),
          })
          .where(eq(criterion.id, criterionId))
          .returning(),
      );
      await this.audit.record(tx, {
        action: 'CRITERION_UPDATED',
        tournamentId: c.tournamentId,
        entityType: 'criterion',
        entityId: criterionId,
        before: toCriterion(before),
        after: toCriterion(row),
      });
      await this.configChanged(tx, c, 'criteria', 'criterion', criterionId);
      return toCriterion(row);
    });
  }

  /** Ostatniego kryterium nie można usunąć (TL-09); rozstrzygające = nowe pierwsze, pozycje zagęszczone. */
  async removeCriterion(ownerId: string, criterionId: string) {
    await withTx(this.db, async (tx) => {
      const { criterion: row } = await this.owned.criterion(tx, criterionId, ownerId);
      const { category: c } = await this.editableCategory(tx, row.categoryId, ownerId);
      const [total] = await tx
        .select({ n: sql<number>`count(*)::int` })
        .from(criterion)
        .where(eq(criterion.categoryId, c.id));
      if ((total?.n ?? 0) <= 1) throw new DomainError('MIN_CRITERIA');
      await tx.delete(criterion).where(eq(criterion.id, criterionId));
      await tx.execute(sql`SET CONSTRAINTS criterion_position_uq DEFERRED`);
      await tx
        .update(criterion)
        .set({ position: sql`${criterion.position} - 1` })
        .where(and(eq(criterion.categoryId, c.id), gt(criterion.position, row.position)));
      const first = one(
        await tx
          .select({ id: criterion.id })
          .from(criterion)
          .where(eq(criterion.categoryId, c.id))
          .orderBy(asc(criterion.position))
          .limit(1),
      );
      if (c.tieBreakCriterionId === criterionId || c.tieBreakCriterionId === null) {
        await tx.update(category).set({ tieBreakCriterionId: first.id }).where(eq(category.id, c.id));
      }
      await this.audit.record(tx, {
        action: 'CRITERION_DELETED',
        tournamentId: c.tournamentId,
        entityType: 'criterion',
        entityId: criterionId,
        before: toCriterion(row),
      });
      await this.configChanged(tx, c, 'criteria', 'criterion', criterionId, 'D');
    });
  }

  async addPenaltyType(ownerId: string, categoryId: string, input: PenaltyTypeInput) {
    return withTx(this.db, async (tx) => {
      const { category: c } = await this.editableCategory(tx, categoryId, ownerId);
      await this.limits.assertCanAdd(tx, 'penaltyTypes', c.id);
      const [last] = await tx
        .select({ max: sql<number>`coalesce(max(${penaltyType.position}), 0)::int` })
        .from(penaltyType)
        .where(eq(penaltyType.categoryId, c.id));
      const row = one(
        await tx
          .insert(penaltyType)
          .values({
            categoryId: c.id,
            name: input.name,
            pointsTenths: toTenths(input.points),
            maxOccurrences: input.maxOccurrences,
            position: (last?.max ?? 0) + 1,
          })
          .returning(),
      );
      await this.audit.record(tx, {
        action: 'PENALTY_TYPE_CREATED',
        tournamentId: c.tournamentId,
        entityType: 'penalty_type',
        entityId: row.id,
        after: toPenaltyType(row),
      });
      await this.configChanged(tx, c, 'penalties', 'penalty_type', row.id);
      return toPenaltyType(row);
    });
  }

  async patchPenaltyType(ownerId: string, penaltyTypeId: string, input: Partial<PenaltyTypeInput>) {
    return withTx(this.db, async (tx) => {
      const { penaltyType: before } = await this.owned.penaltyType(tx, penaltyTypeId, ownerId);
      const { category: c } = await this.editableCategory(tx, before.categoryId, ownerId);
      const row = one(
        await tx
          .update(penaltyType)
          .set({
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.points !== undefined ? { pointsTenths: toTenths(input.points) } : {}),
            ...(input.maxOccurrences !== undefined ? { maxOccurrences: input.maxOccurrences } : {}),
            updatedAt: new Date(),
          })
          .where(eq(penaltyType.id, penaltyTypeId))
          .returning(),
      );
      await this.audit.record(tx, {
        action: 'PENALTY_TYPE_UPDATED',
        tournamentId: c.tournamentId,
        entityType: 'penalty_type',
        entityId: penaltyTypeId,
        before: toPenaltyType(before),
        after: toPenaltyType(row),
      });
      await this.configChanged(tx, c, 'penalties', 'penalty_type', penaltyTypeId);
      return toPenaltyType(row);
    });
  }

  async removePenaltyType(ownerId: string, penaltyTypeId: string) {
    await withTx(this.db, async (tx) => {
      const { penaltyType: row } = await this.owned.penaltyType(tx, penaltyTypeId, ownerId);
      const { category: c } = await this.editableCategory(tx, row.categoryId, ownerId);
      await tx.delete(penaltyType).where(eq(penaltyType.id, penaltyTypeId));
      await tx.execute(sql`SET CONSTRAINTS penalty_type_position_uq DEFERRED`);
      await tx
        .update(penaltyType)
        .set({ position: sql`${penaltyType.position} - 1` })
        .where(and(eq(penaltyType.categoryId, c.id), gt(penaltyType.position, row.position)));
      await this.audit.record(tx, {
        action: 'PENALTY_TYPE_DELETED',
        tournamentId: c.tournamentId,
        entityType: 'penalty_type',
        entityId: penaltyTypeId,
        before: toPenaltyType(row),
      });
      await this.configChanged(tx, c, 'penalties', 'penalty_type', penaltyTypeId, 'D');
    });
  }
}

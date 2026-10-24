import { Inject, Injectable } from '@nestjs/common';
import type { TournamentCreate } from '@polechamp/contracts';
import { tournamentProgress } from '@polechamp/scoring';
import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { z } from 'zod';
import type { TournamentPatch } from '@polechamp/contracts';
import { DomainError, validationFailed } from '../../common/errors/domain-error.js';
import { DB, type Db, type Tx } from '../../db/client.js';
import {
  assertTournamentWritable,
  assertVersion,
  OwnershipRepository,
  type TournamentRow,
} from '../../db/repositories/ownership.repository.js';
import {
  appUser,
  athlete,
  category,
  device,
  entry,
  judge,
  judgeSession,
  rejectedSubmission,
  scoreSheet,
  tournament,
} from '../../db/schema.js';
import { withTx } from '../../db/tx.js';
import { AuditService, ChangeLogService, DomainEventService } from '../audit/audit.service.js';
import { ResultsService } from '../results/results.service.js';
import { CategoryLockService } from './category-lock.service.js';
import { categoryBase, toTournament } from './mappers.js';
import { one } from '../../db/one.js';

const STATUS_ORDER = { IN_PROGRESS: 0, DRAFT: 1, FINISHED: 2 } as const;

/** Turnieje organizatora (03-api §3.2; IMP-121…123). */
@Injectable()
export class TournamentsService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(OwnershipRepository) private readonly owned: OwnershipRepository,
    @Inject(ResultsService) private readonly results: ResultsService,
    @Inject(CategoryLockService) private readonly locks: CategoryLockService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(ChangeLogService) private readonly changes: ChangeLogService,
    @Inject(DomainEventService) private readonly events: DomainEventService,
  ) {}

  private async categoryItems(tournamentId: string) {
    const rows = await this.db
      .select()
      .from(category)
      .where(eq(category.tournamentId, tournamentId))
      .orderBy(asc(category.position));
    return Promise.all(
      rows.map(async (c) => {
        const { progress, entryCount } = await this.results.progress(this.db, c);
        return { ...categoryBase(c), entryCount, progress };
      }),
    );
  }

  private summaryProgress(items: Awaited<ReturnType<TournamentsService['categoryItems']>>) {
    return tournamentProgress(items.map((c) => ({ status: c.status, progress: c.progress })));
  }

  async list(ownerId: string, status: 'active' | 'finished') {
    const statuses = status === 'active' ? (['DRAFT', 'IN_PROGRESS'] as const) : (['FINISHED'] as const);
    const rows = await this.db
      .select()
      .from(tournament)
      .where(
        and(
          eq(tournament.ownerId, ownerId),
          isNull(tournament.deletedAt),
          inArray(tournament.status, [...statuses]),
        ),
      );
    const items = await Promise.all(
      rows.map(async (t) => {
        const categories = await this.categoryItems(t.id);
        const { done, expected, percent } = this.summaryProgress(categories);
        const { version: _v, ...rest } = toTournament(t);
        return { ...rest, categoryCount: categories.length, progress: { done, expected, percent } };
      }),
    );
    // Lista (SCR-ORG-01): Trwa → W przygotowaniu → data rosnąco (bez daty na końcu); zakończone malejąco.
    items.sort((a, b) => {
      if (status === 'finished') return (b.startDate ?? '').localeCompare(a.startDate ?? '');
      return (
        STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
        (a.startDate ?? '9999').localeCompare(b.startDate ?? '9999')
      );
    });
    return { items };
  }

  async create(ownerId: string, input: TournamentCreate) {
    return withTx(this.db, async (tx) => {
      const t = one(
        await tx
          .insert(tournament)
          .values({
            ownerId,
            name: input.name,
            startDate: input.startDate,
            endDate: input.endDate,
            venue: input.venue ?? null,
          })
          .returning(),
      );
      await this.audit.record(tx, {
        action: 'TOURNAMENT_CREATED',
        tournamentId: t.id,
        entityType: 'tournament',
        entityId: t.id,
        after: toTournament(t),
      });
      return toTournament(t);
    });
  }

  async details(ownerId: string, tournamentId: string) {
    const t = await this.owned.tournament(this.db, tournamentId, ownerId);
    const categories = await this.categoryItems(t.id);
    const progress = this.summaryProgress(categories);
    const [athletes] = await this.db
      .select({ n: sql<number>`count(DISTINCT ${athlete.id})::int` })
      .from(athlete)
      .innerJoin(entry, eq(entry.athleteId, athlete.id))
      .where(and(eq(athlete.tournamentId, t.id), eq(entry.status, 'ACTIVE')));
    const [judges] = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(judge)
      .where(and(eq(judge.tournamentId, t.id), eq(judge.isActive, true)));
    const [pending] = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(rejectedSubmission)
      .where(and(eq(rejectedSubmission.tournamentId, t.id), eq(rejectedSubmission.resolution, 'PENDING')));
    return {
      ...toTournament(t),
      stats: { categories: categories.length, athletes: athletes?.n ?? 0, judges: judges?.n ?? 0 },
      progress: {
        done: progress.done,
        expected: progress.expected,
        percent: progress.percent,
        startedCategories: categories.filter((c) => c.status !== 'DRAFT').length,
      },
      pendingRejectedSubmissions: pending?.n ?? 0,
      categories,
    };
  }

  private async touch(tx: Tx, t: TournamentRow, action: string, before: object | null) {
    await this.audit.record(tx, {
      action,
      tournamentId: t.id,
      entityType: 'tournament',
      entityId: t.id,
      before: before as never,
      after: toTournament(t),
    });
    await this.changes.append(tx, { tournamentId: t.id, entityType: 'tournament', entityId: t.id });
    await this.events.emit(
      tx,
      'tournament.updated',
      { tournamentId: t.id, status: t.status, version: t.version },
      t.id,
    );
  }

  async patch(
    ownerId: string,
    tournamentId: string,
    version: number,
    patch: z.output<typeof TournamentPatch>,
  ) {
    return withTx(this.db, async (tx) => {
      const t = await this.owned.tournament(tx, tournamentId, ownerId, true);
      assertTournamentWritable(t);
      assertVersion(t.version, version);
      const startDate = patch.startDate !== undefined ? patch.startDate : t.startDate;
      const endDate = patch.endDate !== undefined ? patch.endDate : t.endDate;
      if (endDate && (!startDate || endDate < startDate))
        throw validationFailed([{ field: 'endDate', code: 'DATE_RANGE' }]);
      const updated = one(
        await tx
          .update(tournament)
          .set({ ...patch, version: t.version + 1, updatedAt: new Date() })
          .where(eq(tournament.id, t.id))
          .returning(),
      );
      await this.touch(tx, updated, 'TOURNAMENT_UPDATED', toTournament(t));
      return toTournament(updated);
    });
  }

  async remove(ownerId: string, tournamentId: string, version: number) {
    await withTx(this.db, async (tx) => {
      const t = await this.owned.tournament(tx, tournamentId, ownerId, true);
      assertVersion(t.version, version);
      if (t.status !== 'DRAFT') throw new DomainError('INVALID_STATE_TRANSITION');
      const [sheets] = await tx
        .select({ n: sql<number>`count(*)::int` })
        .from(scoreSheet)
        .innerJoin(category, eq(category.id, scoreSheet.categoryId))
        .where(eq(category.tournamentId, t.id));
      if ((sheets?.n ?? 0) > 0) throw new DomainError('HAS_SCORES');
      await tx.update(tournament).set({ deletedAt: new Date() }).where(eq(tournament.id, t.id));
      // Tablety usuniętego turnieju są unieważniane (IMP-141 krok 6).
      await tx
        .update(device)
        .set({ revokedAt: new Date() })
        .where(and(eq(device.tournamentId, t.id), isNull(device.revokedAt)));
      await this.audit.record(tx, {
        action: 'TOURNAMENT_DELETED',
        tournamentId: t.id,
        entityType: 'tournament',
        entityId: t.id,
        before: toTournament(t),
      });
    });
  }

  /** DRAFT → IN_PROGRESS; wymaga zweryfikowanego e-maila (TL-10). Używane też przy starcie kategorii. */
  async startWithinTx(tx: Tx, t: TournamentRow, ownerId: string): Promise<TournamentRow> {
    const [user] = await tx
      .select({ verified: appUser.emailVerifiedAt })
      .from(appUser)
      .where(eq(appUser.id, ownerId));
    if (!user?.verified) throw new DomainError('EMAIL_NOT_VERIFIED');
    const updated = one(
      await tx
        .update(tournament)
        .set({ status: 'IN_PROGRESS', startedAt: new Date(), version: t.version + 1, updatedAt: new Date() })
        .where(eq(tournament.id, t.id))
        .returning(),
    );
    await this.touch(tx, updated, 'TOURNAMENT_STARTED', toTournament(t));
    return updated;
  }

  async start(ownerId: string, tournamentId: string) {
    return withTx(this.db, async (tx) => {
      const t = await this.owned.tournament(tx, tournamentId, ownerId, true);
      if (t.status !== 'DRAFT') throw new DomainError('INVALID_STATE_TRANSITION');
      return toTournament(await this.startWithinTx(tx, t, ownerId));
    });
  }

  /** IN_PROGRESS → FINISHED: blokada trwających kategorii, nierozegrane, zamknięcie sesji (IMP-123). */
  async finish(ownerId: string, tournamentId: string, version: number) {
    return withTx(this.db, async (tx) => {
      const t = await this.owned.tournament(tx, tournamentId, ownerId, true);
      assertVersion(t.version, version);
      if (t.status !== 'IN_PROGRESS') throw new DomainError('INVALID_STATE_TRANSITION');
      const cats = await tx
        .select()
        .from(category)
        .where(eq(category.tournamentId, t.id))
        .orderBy(asc(category.position))
        .for('update');
      const autoLockedCategoryIds: string[] = [];
      for (const c of cats.filter((c) => c.status === 'IN_PROGRESS')) {
        await this.locks.lockWithinTx(tx, c, t, ownerId, { force: true, reason: 'TOURNAMENT_FINISHED' });
        autoLockedCategoryIds.push(c.id);
      }
      const unplayedCategoryIds = cats.filter((c) => c.status === 'DRAFT').map((c) => c.id);

      const sessions = await tx
        .update(judgeSession)
        .set({ endedAt: new Date(), endedReason: 'REVOKED' })
        .where(
          and(
            isNull(judgeSession.endedAt),
            sql`${judgeSession.judgeId} IN (SELECT id FROM judge WHERE tournament_id = ${t.id})`,
          ),
        )
        .returning({ judgeId: judgeSession.judgeId, deviceId: judgeSession.deviceId });
      for (const s of sessions) {
        await this.events.emit(
          tx,
          'session.revoked',
          { judgeId: s.judgeId, reason: 'TOURNAMENT_FINISHED' },
          t.id,
          { deviceId: s.deviceId },
        );
      }

      const finishedAt = new Date();
      const updated = one(
        await tx
          .update(tournament)
          .set({ status: 'FINISHED', finishedAt, version: t.version + 1, updatedAt: finishedAt })
          .where(eq(tournament.id, t.id))
          .returning(),
      );
      await this.audit.record(tx, {
        action: 'TOURNAMENT_FINISHED',
        tournamentId: t.id,
        entityType: 'tournament',
        entityId: t.id,
        after: { autoLockedCategoryIds, unplayedCategoryIds },
      });
      await this.changes.append(tx, { tournamentId: t.id, entityType: 'tournament', entityId: t.id });
      await this.events.emit(
        tx,
        'tournament.updated',
        { tournamentId: t.id, status: 'FINISHED', version: updated.version },
        t.id,
      );
      return {
        id: t.id,
        status: 'FINISHED' as const,
        finishedAt: finishedAt.toISOString(),
        autoLockedCategoryIds,
        unplayedCategoryIds,
        version: updated.version,
      };
    });
  }
}

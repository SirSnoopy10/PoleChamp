import { Inject, Injectable } from '@nestjs/common';
import type { JudgePatch } from '@polechamp/contracts';
import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { z } from 'zod';
import { DomainError } from '../../common/errors/domain-error.js';
import { DB, type Db, type Tx } from '../../db/client.js';
import {
  assertTournamentWritable,
  assertVersion,
  type JudgeRow,
  OwnershipRepository,
  type TournamentRow,
} from '../../db/repositories/ownership.repository.js';
import { category, categoryJudge, judge, judgeSession, scoreSheet } from '../../db/schema.js';
import { withTx } from '../../db/tx.js';
import { AuditService, ChangeLogService, DomainEventService } from '../audit/audit.service.js';
import { LimitsService } from '../limits/limits.service.js';
import { initialsOf } from './mappers.js';
import { PinService } from './pin.service.js';
import { one } from '../../db/one.js';

const isUniqueViolation = (error: unknown, constraint: string) => {
  const e = error as { cause?: { code?: string; constraint?: string } };
  return e.cause?.code === '23505' && e.cause.constraint === constraint;
};

const nameTaken = (error: unknown): never => {
  if (isUniqueViolation(error, 'judge_name_uq')) throw new DomainError('JUDGE_NAME_TAKEN');
  throw error;
};

/** Sędziowie turnieju i PIN-y (03-api §3.5; IMP-130, IMP-131). */
@Injectable()
export class JudgesService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(OwnershipRepository) private readonly owned: OwnershipRepository,
    @Inject(LimitsService) private readonly limits: LimitsService,
    @Inject(PinService) private readonly pins: PinService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(ChangeLogService) private readonly changes: ChangeLogService,
    @Inject(DomainEventService) private readonly events: DomainEventService,
  ) {}

  private async toRow(conn: Db | Tx, j: JudgeRow) {
    const [sheets] = await conn
      .select({ n: sql<number>`count(*)::int` })
      .from(scoreSheet)
      .where(eq(scoreSheet.judgeId, j.id));
    return {
      id: j.id,
      fullName: j.fullName,
      initials: j.initials,
      isActive: j.isActive,
      pinLocked: j.pinLockedAt !== null,
      sheetCount: sheets?.n ?? 0,
      version: j.version,
    };
  }

  async list(ownerId: string, tournamentId: string) {
    const t = await this.owned.tournament(this.db, tournamentId, ownerId);
    const rows = await this.db
      .select()
      .from(judge)
      .where(eq(judge.tournamentId, t.id))
      .orderBy(asc(judge.position));
    return { items: await Promise.all(rows.map((j) => this.toRow(this.db, j))) };
  }

  /** Dołączenie do paneli kategorii W przygotowaniu i Trwa (TL-18). */
  private async joinPanels(tx: Tx, tournamentId: string, judgeId: string) {
    const cats = await tx
      .select({ id: category.id })
      .from(category)
      .where(
        and(eq(category.tournamentId, tournamentId), inArray(category.status, ['DRAFT', 'IN_PROGRESS'])),
      );
    if (cats.length) {
      await tx
        .insert(categoryJudge)
        .values(cats.map((c) => ({ categoryId: c.id, judgeId })))
        .onConflictDoNothing();
    }
  }

  private async judgesChanged(tx: Tx, t: TournamentRow, judgeId: string, op: 'U' | 'D' = 'U') {
    await this.changes.append(tx, { tournamentId: t.id, entityType: 'judge', entityId: judgeId, op });
    await this.events.emit(tx, 'judges.changed', { judgeIds: [judgeId] }, t.id);
  }

  /** Zamyka aktywne sesje sędziego i wylogowuje go z tabletów (`session.revoked`). */
  private async revokeSessions(
    tx: Tx,
    t: TournamentRow,
    judgeId: string,
    reason: 'JUDGE_DEACTIVATED' | 'PIN_RESET',
  ) {
    const ended = await tx
      .update(judgeSession)
      .set({ endedAt: new Date(), endedReason: 'REVOKED' })
      .where(and(eq(judgeSession.judgeId, judgeId), isNull(judgeSession.endedAt)))
      .returning({ id: judgeSession.id });
    if (ended.length) await this.events.emit(tx, 'session.revoked', { judgeId, reason }, t.id);
  }

  async create(ownerId: string, tournamentId: string, fullName: string) {
    return withTx(this.db, async (tx) => {
      const t = await this.owned.tournament(tx, tournamentId, ownerId, true);
      assertTournamentWritable(t);
      await this.limits.assertCanAdd(tx, 'judges', t.id);
      const generated = await this.pins.generate(tx, t.id);
      const [last] = await tx
        .select({ max: sql<number>`coalesce(max(${judge.position}), 0)::int` })
        .from(judge)
        .where(eq(judge.tournamentId, t.id));
      const j = one(
        await tx
          .insert(judge)
          .values({
            tournamentId: t.id,
            fullName,
            initials: initialsOf(fullName),
            pinHash: generated.pinHash,
            pinFingerprint: generated.pinFingerprint,
            pinOfflineSalt: generated.pinOfflineSalt,
            pinOfflineVerifier: generated.pinOfflineVerifier,
            position: (last?.max ?? 0) + 1,
          })
          .returning()
          .catch(nameTaken),
      );
      await tx.insert(categoryJudge).select(
        tx
          .select({ categoryId: category.id, judgeId: sql<string>`${j.id}::uuid`.as('judge_id') })
          .from(category)
          .where(and(eq(category.tournamentId, t.id), eq(category.status, 'IN_PROGRESS'))),
      );
      await this.audit.record(tx, {
        action: 'JUDGE_CREATED',
        tournamentId: t.id,
        entityType: 'judge',
        entityId: j.id,
        after: { fullName, initials: j.initials },
      });
      await this.judgesChanged(tx, t, j.id);
      return {
        id: j.id,
        fullName: j.fullName,
        initials: j.initials,
        isActive: true,
        pin: generated.pin,
        pinShownOnce: true as const,
      };
    });
  }

  async patch(ownerId: string, judgeId: string, version: number, patch: z.output<typeof JudgePatch>) {
    return withTx(this.db, async (tx) => {
      const { tournament: t, judge: j } = await this.owned.judge(tx, judgeId, ownerId, true);
      assertTournamentWritable(t);
      assertVersion(j.version, version);
      const updated = one(
        await tx
          .update(judge)
          .set({ ...patch, version: j.version + 1, updatedAt: new Date() })
          .where(eq(judge.id, j.id))
          .returning()
          .catch(nameTaken),
      );
      if (patch.isActive === false && j.isActive) await this.revokeSessions(tx, t, j.id, 'JUDGE_DEACTIVATED');
      if (patch.isActive === true && !j.isActive) await this.joinPanels(tx, t.id, j.id);
      const action = patch.isActive === false && j.isActive ? 'JUDGE_DEACTIVATED' : 'JUDGE_UPDATED';
      await this.audit.record(tx, {
        action,
        tournamentId: t.id,
        entityType: 'judge',
        entityId: j.id,
        before: { fullName: j.fullName, initials: j.initials, isActive: j.isActive },
        after: { fullName: updated.fullName, initials: updated.initials, isActive: updated.isActive },
      });
      await this.judgesChanged(tx, t, j.id);
      return this.toRow(tx, updated);
    });
  }

  /** Nowy PIN, `pin_version + 1`, zdjęcie blokad, wylogowanie z tabletów (IMP-131). */
  async resetPin(ownerId: string, judgeId: string) {
    return withTx(this.db, async (tx) => {
      const { tournament: t, judge: j } = await this.owned.judge(tx, judgeId, ownerId, true);
      assertTournamentWritable(t);
      const generated = await this.pins.generate(tx, t.id);
      const updated = one(
        await tx
          .update(judge)
          .set({
            pinHash: generated.pinHash,
            pinFingerprint: generated.pinFingerprint,
            pinOfflineSalt: generated.pinOfflineSalt,
            pinOfflineVerifier: generated.pinOfflineVerifier,
            pinVersion: j.pinVersion + 1,
            failedPinCount: 0,
            pinLockedAt: null,
            version: j.version + 1,
            updatedAt: new Date(),
          })
          .where(eq(judge.id, j.id))
          .returning(),
      );
      await this.revokeSessions(tx, t, j.id, 'PIN_RESET');
      await this.audit.record(tx, {
        action: 'JUDGE_PIN_RESET',
        tournamentId: t.id,
        entityType: 'judge',
        entityId: j.id,
        after: { pinVersion: updated.pinVersion },
      });
      await this.judgesChanged(tx, t, j.id);
      return {
        id: j.id,
        fullName: j.fullName,
        initials: j.initials,
        isActive: j.isActive,
        pin: generated.pin,
        pinShownOnce: true as const,
      };
    });
  }

  async remove(ownerId: string, judgeId: string) {
    await withTx(this.db, async (tx) => {
      const { tournament: t, judge: j } = await this.owned.judge(tx, judgeId, ownerId, true);
      assertTournamentWritable(t);
      const [sheets] = await tx
        .select({ n: sql<number>`count(*)::int` })
        .from(scoreSheet)
        .where(eq(scoreSheet.judgeId, j.id));
      if ((sheets?.n ?? 0) > 0) throw new DomainError('HAS_SCORES');
      await tx.delete(judge).where(eq(judge.id, j.id));
      await this.audit.record(tx, {
        action: 'JUDGE_DELETED',
        tournamentId: t.id,
        entityType: 'judge',
        entityId: j.id,
        before: { fullName: j.fullName },
      });
      await this.judgesChanged(tx, t, j.id, 'D');
    });
  }
}

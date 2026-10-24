import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import type { Tx } from '../../../db/client.js';
import { one } from '../../../db/one.js';
import { device, judge, judgeSession } from '../../../db/schema.js';
import { AuditService, ChangeLogService, DomainEventService } from '../../audit/audit.service.js';
import { PIN_GLOBAL_LIMIT } from '../../devices/judge-sessions.service.js';
import {
  type HandlerResult,
  type MutationHandler,
  type MutationOf,
  type PushContext,
  rejected,
} from './types.js';

/** Sędzia turnieju urządzenia (obcy lub nieistniejący → brak; mutacja odrzucana jako nieważna sesja). */
export async function judgeOfTournament(tx: Tx, judgeId: string, tournamentId: string) {
  const [j] = await tx
    .select()
    .from(judge)
    .where(and(eq(judge.id, judgeId), eq(judge.tournamentId, tournamentId)));
  return j;
}

/**
 * Logowanie offline zgłoszone przez tablet (IMP-148): sesja `OFFLINE_PIN` z identyfikatorem z tabletu.
 * Nieaktualna wersja PIN-u → odrzucenie, ale sesja zostaje zapisana jako zamknięta, aby oceny z niej
 * dostały ten sam kod `PIN_VERSION_OUTDATED` (TC-API-087).
 */
@Injectable()
export class JudgeSessionStartedHandler implements MutationHandler<MutationOf<'JUDGE_SESSION_STARTED'>> {
  constructor(@Inject(AuditService) private readonly audit: AuditService) {}

  async handle(tx: Tx, ctx: PushContext, m: MutationOf<'JUDGE_SESSION_STARTED'>): Promise<HandlerResult> {
    const j = await judgeOfTournament(tx, m.judgeId, ctx.tournamentId);
    if (!j) return rejected('JUDGE_SESSION_INVALID');
    const [existing] = await tx
      .select()
      .from(judgeSession)
      .where(eq(judgeSession.id, m.payload.judgeSessionId));
    if (existing) {
      // Ponowne zgłoszenie tej samej sesji z tego urządzenia (nowy mutationId) jest nieszkodliwe.
      return existing.judgeId === j.id && existing.deviceId === ctx.deviceId
        ? { status: 'APPLIED' }
        : rejected('JUDGE_SESSION_INVALID');
    }
    const outdated = m.payload.pinVersion !== j.pinVersion;
    await tx.insert(judgeSession).values({
      id: m.payload.judgeSessionId,
      judgeId: j.id,
      deviceId: ctx.deviceId,
      authMode: 'OFFLINE_PIN',
      pinVersion: m.payload.pinVersion,
      startedAt: new Date(m.createdAt),
      ...(outdated ? { endedAt: ctx.receivedAt, endedReason: 'REVOKED' } : {}),
    });
    await this.audit.record(tx, {
      action: 'JUDGE_SESSION_STARTED_OFFLINE',
      tournamentId: ctx.tournamentId,
      entityType: 'judge',
      entityId: j.id,
      after: {
        sessionId: m.payload.judgeSessionId,
        deviceId: ctx.deviceId,
        version: m.payload.pinVersion,
        accepted: !outdated,
      },
    });
    return outdated ? rejected('PIN_VERSION_OUTDATED') : { status: 'APPLIED' };
  }
}

/** Wylogowanie zgłoszone przez tablet; oceny zatwierdzone wcześniej pozostają ważne (03-api §5.1). */
@Injectable()
export class JudgeSessionEndedHandler implements MutationHandler<MutationOf<'JUDGE_SESSION_ENDED'>> {
  constructor(@Inject(AuditService) private readonly audit: AuditService) {}

  async handle(tx: Tx, ctx: PushContext, m: MutationOf<'JUDGE_SESSION_ENDED'>): Promise<HandlerResult> {
    const [s] = await tx
      .select()
      .from(judgeSession)
      .where(
        and(
          eq(judgeSession.id, m.payload.judgeSessionId),
          eq(judgeSession.judgeId, m.judgeId),
          eq(judgeSession.deviceId, ctx.deviceId),
        ),
      );
    if (!s) return rejected('JUDGE_SESSION_INVALID');
    if (s.endedAt) return { status: 'APPLIED' };
    const endedAt = new Date(Math.min(new Date(m.createdAt).getTime(), ctx.receivedAt.getTime()));
    await tx.update(judgeSession).set({ endedAt, endedReason: 'LOGOUT' }).where(eq(judgeSession.id, s.id));
    await tx
      .update(device)
      .set({ activeJudgeId: null })
      .where(and(eq(device.id, ctx.deviceId), eq(device.activeJudgeId, s.judgeId)));
    await this.audit.record(tx, {
      action: 'JUDGE_SESSION_ENDED',
      tournamentId: ctx.tournamentId,
      entityType: 'judge',
      entityId: s.judgeId,
      after: { sessionId: s.id, reason: 'LOGOUT', authMode: s.authMode, deviceId: ctx.deviceId },
    });
    return { status: 'APPLIED' };
  }
}

/** Nieudane próby PIN-u offline liczą się do globalnej blokady sędziego (FR-509; IMP-148). */
@Injectable()
export class PinAttemptsReportHandler implements MutationHandler<MutationOf<'PIN_ATTEMPTS_REPORT'>> {
  constructor(
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(ChangeLogService) private readonly changes: ChangeLogService,
    @Inject(DomainEventService) private readonly events: DomainEventService,
  ) {}

  async handle(tx: Tx, ctx: PushContext, m: MutationOf<'PIN_ATTEMPTS_REPORT'>): Promise<HandlerResult> {
    const j = await judgeOfTournament(tx, m.judgeId, ctx.tournamentId);
    if (!j) return rejected('JUDGE_SESSION_INVALID');
    const updated = one(
      await tx
        .update(judge)
        .set({
          failedPinCount: sql`${judge.failedPinCount} + ${m.payload.failedCount}`,
          pinLockedAt: sql`CASE WHEN ${judge.pinLockedAt} IS NOT NULL THEN ${judge.pinLockedAt}
            WHEN ${judge.failedPinCount} + ${m.payload.failedCount} >= ${PIN_GLOBAL_LIMIT} THEN now()
            ELSE NULL END`,
        })
        .where(eq(judge.id, j.id))
        .returning(),
    );
    await this.audit.record(tx, {
      action: 'PIN_ATTEMPTS_REPORTED',
      tournamentId: ctx.tournamentId,
      entityType: 'judge',
      entityId: j.id,
      after: { failedCount: m.payload.failedCount, total: updated.failedPinCount, deviceId: ctx.deviceId },
    });
    if (updated.pinLockedAt && !j.pinLockedAt) {
      await this.audit.record(tx, {
        action: 'JUDGE_PIN_LOCKED',
        tournamentId: ctx.tournamentId,
        entityType: 'judge',
        entityId: j.id,
        after: { deviceId: ctx.deviceId },
      });
      await this.changes.append(tx, { tournamentId: ctx.tournamentId, entityType: 'judge', entityId: j.id });
      await this.events.emit(tx, 'judges.changed', { judgeIds: [j.id] }, ctx.tournamentId);
    }
    return { status: 'APPLIED' };
  }
}

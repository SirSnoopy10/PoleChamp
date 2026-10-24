import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull, sql } from 'drizzle-orm';
import type Valkey from 'iovalkey';
import { DomainError } from '../../common/errors/domain-error.js';
import { uuidv7, UUID_RE } from '../../common/ids.js';
import { DB, type Db } from '../../db/client.js';
import { one } from '../../db/one.js';
import { device, judge, judgeSession } from '../../db/schema.js';
import { withTx } from '../../db/tx.js';
import { VALKEY } from '../../infra/infra.module.js';
import { AuditService, ChangeLogService, DomainEventService } from '../audit/audit.service.js';
import { JwtService, type DeviceClaims, type JudgeClaims } from '../auth/jwt.service.js';
import { PasswordService } from '../auth/password.service.js';

/** Globalny limit błędnych PIN-ów sędziego (wszystkie urządzenia) – potem reset przez organizatora. */
export const PIN_GLOBAL_LIMIT = 10;
/** Limit urządzenia: 30 błędnych prób w 10 min (wszystkie profile) – 05-bezpieczenstwo §3.2. */
export const PIN_DEVICE_LIMIT = 30;
const PIN_DEVICE_WINDOW_MS = 10 * 60_000;

/** Logowanie sędziego PIN-em online i wylogowanie (03-api §4; IMP-143, ADR-005). */
@Injectable()
export class JudgeSessionsService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(VALKEY) private readonly valkey: Valkey,
    @Inject(PasswordService) private readonly passwords: PasswordService,
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(ChangeLogService) private readonly changes: ChangeLogService,
    @Inject(DomainEventService) private readonly events: DomainEventService,
  ) {}

  private deviceKey = (deviceId: string) => `pin-fail:device:${deviceId}`;

  private async deviceFailures(deviceId: string): Promise<{ count: number; ttlMs: number }> {
    try {
      const [count, ttl] = await Promise.all([
        this.valkey.get(this.deviceKey(deviceId)),
        this.valkey.pttl(this.deviceKey(deviceId)),
      ]);
      return { count: Number(count ?? 0), ttlMs: Math.max(0, ttl) };
    } catch {
      return { count: 0, ttlMs: 0 };
    }
  }

  private async recordDeviceFailure(deviceId: string): Promise<void> {
    await this.valkey
      .multi()
      .incr(this.deviceKey(deviceId))
      .pexpire(this.deviceKey(deviceId), PIN_DEVICE_WINDOW_MS, 'NX')
      .exec()
      .catch(() => undefined);
  }

  async login(claims: DeviceClaims, judgeId: string, pin: string) {
    if (!UUID_RE.test(judgeId)) throw new DomainError('NOT_FOUND');
    const [j] = await this.db
      .select()
      .from(judge)
      .where(and(eq(judge.id, judgeId), eq(judge.tournamentId, claims.trn)));
    if (!j) throw new DomainError('NOT_FOUND');
    if (!j.isActive) throw new DomainError('JUDGE_INACTIVE');
    if (j.pinLockedAt) throw new DomainError('PIN_LOCKED', undefined, { requiresReset: true });
    const device_ = await this.deviceFailures(claims.sub);
    if (device_.count >= PIN_DEVICE_LIMIT) {
      throw new DomainError('PIN_LOCKED', 'Zbyt wiele prób na tym urządzeniu.', {
        retryAfterSeconds: Math.max(1, Math.ceil(device_.ttlMs / 1000)),
      });
    }

    if (!(await this.passwords.verify(j.pinHash, pin))) {
      await this.recordDeviceFailure(claims.sub);
      const failed = await withTx(this.db, async (tx) => {
        const updated = one(
          await tx
            .update(judge)
            .set({
              failedPinCount: sql`${judge.failedPinCount} + 1`,
              pinLockedAt: sql`CASE WHEN ${judge.failedPinCount} + 1 >= ${PIN_GLOBAL_LIMIT} THEN now() ELSE NULL END`,
            })
            .where(eq(judge.id, j.id))
            .returning(),
        );
        await this.audit.record(tx, {
          action: 'JUDGE_LOGIN_FAILED',
          tournamentId: j.tournamentId,
          entityType: 'judge',
          entityId: j.id,
        });
        if (updated.pinLockedAt) {
          await this.audit.record(tx, {
            action: 'JUDGE_PIN_LOCKED',
            tournamentId: j.tournamentId,
            entityType: 'judge',
            entityId: j.id,
          });
          await this.changes.append(tx, {
            tournamentId: j.tournamentId,
            entityType: 'judge',
            entityId: j.id,
          });
          await this.events.emit(tx, 'judges.changed', { judgeIds: [j.id] }, j.tournamentId);
        }
        return updated;
      });
      if (failed.pinLockedAt) throw new DomainError('PIN_LOCKED', undefined, { requiresReset: true });
      throw new DomainError('PIN_INVALID', undefined, {
        remainingAttempts: PIN_GLOBAL_LIMIT - failed.failedPinCount,
      });
    }

    return withTx(this.db, async (tx) => {
      // Jedna aktywna sesja sędziego: poprzednia (na dowolnym tablecie) zostaje zastąpiona.
      const replaced = await tx
        .update(judgeSession)
        .set({ endedAt: new Date(), endedReason: 'REPLACED' })
        .where(and(eq(judgeSession.judgeId, j.id), isNull(judgeSession.endedAt)))
        .returning({ deviceId: judgeSession.deviceId });
      for (const r of replaced) {
        await this.events.emit(tx, 'session.revoked', { judgeId: j.id, reason: 'REPLACED' }, j.tournamentId, {
          deviceId: r.deviceId,
        });
        if (r.deviceId !== claims.sub) {
          await tx
            .update(device)
            .set({ activeJudgeId: null })
            .where(and(eq(device.id, r.deviceId), eq(device.activeJudgeId, j.id)));
        }
      }
      const sessionId = uuidv7();
      await tx
        .insert(judgeSession)
        .values({
          id: sessionId,
          judgeId: j.id,
          deviceId: claims.sub,
          authMode: 'ONLINE_PIN',
          pinVersion: j.pinVersion,
        });
      await tx.update(judge).set({ failedPinCount: 0 }).where(eq(judge.id, j.id));
      await tx.update(device).set({ activeJudgeId: j.id }).where(eq(device.id, claims.sub));
      await this.audit.record(tx, {
        action: 'JUDGE_LOGIN_SUCCEEDED',
        tournamentId: j.tournamentId,
        entityType: 'judge',
        entityId: j.id,
        after: { sessionId, authMode: 'ONLINE_PIN' },
      });
      const { token, expiresIn } = await this.jwt.sign({
        typ: 'judge',
        sub: j.id,
        dev: claims.sub,
        trn: j.tournamentId,
        sid: sessionId,
      });
      return { judgeToken: token, sessionId, expiresIn };
    });
  }

  async logout(claims: JudgeClaims): Promise<void> {
    await withTx(this.db, async (tx) => {
      await tx
        .update(judgeSession)
        .set({ endedAt: new Date(), endedReason: 'LOGOUT' })
        .where(and(eq(judgeSession.id, claims.sid), isNull(judgeSession.endedAt)));
      await tx
        .update(device)
        .set({ activeJudgeId: null })
        .where(and(eq(device.id, claims.dev), eq(device.activeJudgeId, claims.sub)));
      await this.audit.record(tx, {
        action: 'JUDGE_SESSION_ENDED',
        tournamentId: claims.trn,
        entityType: 'judge',
        entityId: claims.sub,
        after: { reason: 'LOGOUT' },
      });
    });
  }
}

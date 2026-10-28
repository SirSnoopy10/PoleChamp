import { Inject, Injectable } from '@nestjs/common';
import { PAIRING_ALPHABET, type Heartbeat, type PairRequest } from '@polechamp/contracts';
import { and, asc, eq, gt, isNull, lt, sql } from 'drizzle-orm';
import type Valkey from 'iovalkey';
import { randomBytes, randomInt } from 'node:crypto';
import { DomainError } from '../../common/errors/domain-error.js';
import { randomToken, safeEqual, sha256, UUID_RE } from '../../common/ids.js';
import { requestContext } from '../../common/request-context.js';
import { DB, type Db, type Tx } from '../../db/client.js';
import { one } from '../../db/one.js';
import { assertTournamentWritable, OwnershipRepository } from '../../db/repositories/ownership.repository.js';
import { device, judge, judgeSession, pairingCode, tournament } from '../../db/schema.js';
import { withTx } from '../../db/tx.js';
import { VALKEY } from '../../infra/infra.module.js';
import { AuditService, DomainEventService } from '../audit/audit.service.js';
import { JwtService } from '../auth/jwt.service.js';
import { LimitsService } from '../limits/limits.service.js';

const PAIRING_CODE_TTL_MS = 10 * 60_000;
const PAIRING_MAX_USES = 10;
/** Online = połączony albo kontakt w ciągu 75 s (2,5 × okres heartbeat – TL-35). */
export const ONLINE_WINDOW_MS = 75_000;
const STATUS_THROTTLE_MS = 5_000;

type DeviceRow = typeof device.$inferSelect;

/** Kod 8 znaków z alfabetu bez znaków mylących (0/O/1/I/L), wyświetlany jako `XXXX-XXXX`. */
export function generatePairingCode(): string {
  return Array.from({ length: 8 }, () => PAIRING_ALPHABET[randomInt(0, PAIRING_ALPHABET.length)]).join('');
}

/** Tablety sędziowskie: parowanie, tokeny, lista, odłączanie, heartbeat (03-api §3.5; IMP-140…142). */
@Injectable()
export class DevicesService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(VALKEY) private readonly valkey: Valkey,
    @Inject(OwnershipRepository) private readonly owned: OwnershipRepository,
    @Inject(LimitsService) private readonly limits: LimitsService,
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(DomainEventService) private readonly events: DomainEventService,
  ) {}

  // IMP-140
  async createPairingCode(ownerId: string, tournamentId: string) {
    return withTx(this.db, async (tx) => {
      const t = await this.owned.tournament(tx, tournamentId, ownerId);
      assertTournamentWritable(t);
      const code = generatePairingCode();
      const expiresAt = new Date(Date.now() + PAIRING_CODE_TTL_MS);
      await tx.insert(pairingCode).values({
        tournamentId: t.id,
        codeHash: sha256(code),
        expiresAt,
        maxUses: PAIRING_MAX_USES,
        createdBy: ownerId,
      });
      await this.audit.record(tx, {
        action: 'PAIRING_CODE_CREATED',
        tournamentId: t.id,
        entityType: 'tournament',
        entityId: t.id,
        after: { expiresAt: expiresAt.toISOString() },
      });
      return {
        code: `${code.slice(0, 4)}-${code.slice(4)}`,
        qrPayload: `polechamp://pair?c=${code}&t=${t.id}`,
        expiresAt: expiresAt.toISOString(),
      };
    });
  }

  // IMP-141 – parowanie (kod błędny, wygasły i wyczerpany dają ten sam błąd)
  async pair(input: PairRequest) {
    return withTx(this.db, async (tx) => {
      const [used] = await tx
        .update(pairingCode)
        .set({ useCount: sql`${pairingCode.useCount} + 1` })
        .where(
          and(
            eq(pairingCode.codeHash, sha256(input.code)),
            gt(pairingCode.expiresAt, new Date()),
            lt(pairingCode.useCount, pairingCode.maxUses),
          ),
        )
        .returning({ tournamentId: pairingCode.tournamentId, createdBy: pairingCode.createdBy });
      if (!used) throw new DomainError('PAIRING_CODE_INVALID');
      const [t] = await tx
        .select()
        .from(tournament)
        .where(and(eq(tournament.id, used.tournamentId), isNull(tournament.deletedAt)))
        .for('update');
      if (!t || t.status === 'FINISHED') throw new DomainError('PAIRING_CODE_INVALID');
      await this.limits.assertCanAdd(tx, 'devices', t.id);
      // Bez nazwy – „Tablet {n}”: kolejny numer w turnieju (licząc też odwołane), UX-33.
      const name =
        input.deviceName ??
        `Tablet ${
          one(
            await tx
              .select({ n: sql<number>`count(*)::int` })
              .from(device)
              .where(eq(device.tournamentId, t.id)),
          ).n + 1
        }`;
      const secret = randomToken();
      const pepper = randomBytes(32);
      const d = one(
        await tx
          .insert(device)
          .values({
            tournamentId: t.id,
            name,
            platform: input.platform,
            model: input.model,
            osVersion: input.osVersion,
            appVersion: input.appVersion,
            secretHash: sha256(secret),
            pepper,
            pairedBy: used.createdBy,
          })
          .returning(),
      );
      requestContext.setActor({ type: 'DEVICE', id: d.id, deviceId: d.id, tournamentId: t.id });
      await this.audit.record(tx, {
        action: 'DEVICE_PAIRED',
        tournamentId: t.id,
        entityType: 'device',
        entityId: d.id,
        after: { name: d.name, platform: d.platform, model: d.model },
      });
      await this.events.emit(
        tx,
        'device.paired',
        { deviceId: d.id, name: d.name, platform: d.platform },
        t.id,
      );
      return {
        deviceId: d.id,
        deviceSecret: secret,
        pinPepper: pepper.toString('base64'),
        tournament: { id: t.id, name: t.name },
      };
    });
  }

  async token(deviceId: string, deviceSecret: string) {
    if (!UUID_RE.test(deviceId)) throw new DomainError('UNAUTHENTICATED');
    const [d] = await this.db.select().from(device).where(eq(device.id, deviceId));
    if (!d || !safeEqual(d.secretHash, sha256(deviceSecret))) throw new DomainError('UNAUTHENTICATED');
    if (d.revokedAt) throw new DomainError('DEVICE_REVOKED');
    const { token, expiresIn } = await this.jwt.sign({ typ: 'device', sub: d.id, trn: d.tournamentId });
    return { deviceToken: token, expiresIn };
  }

  isOnline(d: Pick<DeviceRow, 'lastSeenAt'>, now = Date.now()): boolean {
    return d.lastSeenAt !== null && now - d.lastSeenAt.getTime() < ONLINE_WINDOW_MS;
  }

  private async toRow(conn: Db | Tx, d: DeviceRow) {
    let activeJudge: { id: string; fullName: string } | null = null;
    if (d.activeJudgeId) {
      const [j] = await conn
        .select({ id: judge.id, fullName: judge.fullName })
        .from(judge)
        .where(eq(judge.id, d.activeJudgeId));
      activeJudge = j ?? null;
    }
    return {
      id: d.id,
      name: d.name,
      platform: d.platform,
      online: this.isOnline(d),
      lastSeenAt: d.lastSeenAt?.toISOString() ?? null,
      lastSyncAt: d.lastSyncAt?.toISOString() ?? null,
      pendingMutations: d.pendingMutations,
      batteryLevel: d.batteryLevel === null ? null : d.batteryLevel / 100,
      activeJudge,
    };
  }

  async list(ownerId: string, tournamentId: string) {
    const t = await this.owned.tournament(this.db, tournamentId, ownerId);
    const rows = await this.db
      .select()
      .from(device)
      .where(and(eq(device.tournamentId, t.id), isNull(device.revokedAt)))
      .orderBy(asc(device.pairedAt));
    return { items: await Promise.all(rows.map((d) => this.toRow(this.db, d))) };
  }

  private async ownedDevice(tx: Tx, deviceId: string, ownerId: string) {
    if (!UUID_RE.test(deviceId)) throw new DomainError('NOT_FOUND');
    const [d] = await tx
      .select()
      .from(device)
      .where(and(eq(device.id, deviceId), isNull(device.revokedAt)));
    if (!d) throw new DomainError('NOT_FOUND');
    await this.owned.tournament(tx, d.tournamentId, ownerId);
    return d;
  }

  async rename(ownerId: string, deviceId: string, name: string) {
    return withTx(this.db, async (tx) => {
      const before = await this.ownedDevice(tx, deviceId, ownerId);
      const d = one(
        await tx
          .update(device)
          .set({ name, updatedAt: new Date() })
          .where(eq(device.id, deviceId))
          .returning(),
      );
      await this.audit.record(tx, {
        action: 'DEVICE_RENAMED',
        tournamentId: d.tournamentId,
        entityType: 'device',
        entityId: d.id,
        before: { name: before.name },
        after: { name },
      });
      await this.emitStatus(tx, d, true);
      return this.toRow(tx, d);
    });
  }

  /** Odłączenie: urządzenie unieważnione, sesje sędziów zamknięte, `session.revoked` do tabletu. */
  async revoke(ownerId: string, deviceId: string) {
    await withTx(this.db, async (tx) => {
      const d = await this.ownedDevice(tx, deviceId, ownerId);
      await tx.update(device).set({ revokedAt: new Date(), activeJudgeId: null }).where(eq(device.id, d.id));
      await tx
        .update(judgeSession)
        .set({ endedAt: new Date(), endedReason: 'REVOKED' })
        .where(and(eq(judgeSession.deviceId, d.id), isNull(judgeSession.endedAt)));
      await this.audit.record(tx, {
        action: 'DEVICE_REVOKED',
        tournamentId: d.tournamentId,
        entityType: 'device',
        entityId: d.id,
      });
      await this.events.emit(tx, 'session.revoked', { reason: 'DEVICE_REVOKED' }, d.tournamentId, {
        deviceId: d.id,
      });
    });
  }

  // IMP-142 – heartbeat
  async heartbeat(deviceId: string, payload: Heartbeat) {
    await withTx(this.db, async (tx) => {
      const d = one(
        await tx
          .update(device)
          .set({
            lastSeenAt: new Date(),
            pendingMutations: payload.pendingMutations,
            lastSyncCursor: payload.lastSyncCursor,
            batteryLevel: payload.batteryLevel === null ? null : Math.round(payload.batteryLevel * 100),
            activeJudgeId:
              payload.activeJudgeId && UUID_RE.test(payload.activeJudgeId) ? payload.activeJudgeId : null,
            updatedAt: new Date(),
          })
          .where(eq(device.id, deviceId))
          .returning(),
      );
      await this.emitStatus(tx, d);
    });
  }

  /** `device.status` do organizatora – najwyżej raz na 5 s na urządzenie (klucz w Valkey). */
  private async emitStatus(tx: Tx, d: DeviceRow, force = false) {
    if (!force) {
      const allowed = await this.valkey
        .set(`device-status:${d.id}`, '1', 'PX', STATUS_THROTTLE_MS, 'NX')
        .catch(() => 'OK');
      if (allowed !== 'OK') return;
    }
    await this.events.emit(
      tx,
      'device.status',
      {
        deviceId: d.id,
        online: this.isOnline(d),
        pendingMutations: d.pendingMutations,
        lastSeenAt: d.lastSeenAt?.toISOString() ?? null,
        activeJudgeId: d.activeJudgeId,
      },
      d.tournamentId,
    );
  }
}

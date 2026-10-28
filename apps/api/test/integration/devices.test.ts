import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { PAIRING_ALPHABET } from '@polechamp/contracts';
import { and, eq, sql } from 'drizzle-orm';
import { decodeJwt } from 'jose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { sha256 } from '../../src/common/ids.js';
import type { DbHandle } from '../../src/db/client.js';
import * as s from '../../src/db/schema.js';
import { generatePairingCode } from '../../src/modules/devices/devices.service.js';
import { TOURNAMENT_LIMITS } from '../../src/modules/limits/limits.service.js';
import { startApp } from '../support/app.js';
import { testDb } from '../support/db.js';
import { type Call, client, flushValkey, registerAndLogin } from '../support/http.js';
import { organizer } from '../support/scenario.js';
import { judgeLogin, pairTablet } from '../support/tablet.js';

let app: NestFastifyApplication;
let call: Call;
let handle: DbHandle;
let org: ReturnType<typeof organizer>;

beforeAll(async () => {
  ({ app } = await startApp());
  call = client(app);
  handle = testDb();
  await flushValkey();
  org = organizer(call, (await registerAndLogin(call)).accessToken);
});
afterAll(async () => {
  await app.close();
  await handle.pool.end();
});
beforeEach(async () => {
  await flushValkey();
});

const wrongPin = (pin: string) => (pin === '8306' ? '8307' : '8306');
const events = (tournamentId: string, type: string) =>
  handle.db
    .select()
    .from(s.domainEvent)
    .where(and(eq(s.domainEvent.tournamentId, tournamentId), eq(s.domainEvent.type, type)));

describe('parowanie i urządzenia (IMP-140, IMP-141)', () => {
  it('TC-API-061: kod parowania 8 znaków bez mylących, w bazie tylko hash', async () => {
    for (let i = 0; i < 10_000; i++) {
      const code = generatePairingCode();
      expect(code).toHaveLength(8);
      for (const ch of code) expect(PAIRING_ALPHABET).toContain(ch);
    }
    const t = await org.tournament();
    const res = await org.req('POST', `/v1/tournaments/${t.id}/pairing-codes`);
    expect(res.status).toBe(201);
    expect(res.body.code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    expect(res.body.qrPayload).toBe(`polechamp://pair?c=${res.body.code.replace('-', '')}&t=${t.id}`);
    expect(new Date(res.body.expiresAt).getTime() - Date.now()).toBeGreaterThan(9.9 * 60_000);
    const [row] = await handle.db.select().from(s.pairingCode).where(eq(s.pairingCode.tournamentId, t.id));
    expect(row!.codeHash.equals(sha256(res.body.code.replace('-', '')))).toBe(true);
    expect(JSON.stringify(row)).not.toContain(res.body.code.replace('-', ''));
  });

  it('TC-API-062 / TC-API-066: parowanie, token urządzenia 1 h, device.paired', async () => {
    const t = await org.tournament();
    const tablet = await pairTablet(call, org, t.id);
    expect(Buffer.from(tablet.pinPepper, 'base64')).toHaveLength(32);
    expect(Buffer.from(tablet.deviceSecret, 'base64url')).toHaveLength(32);
    const claims = decodeJwt(tablet.token);
    expect(claims).toMatchObject({ typ: 'device', sub: tablet.deviceId, trn: t.id });
    expect((claims.exp ?? 0) - (claims.iat ?? 0)).toBe(3600);
    const [d] = await handle.db.select().from(s.device).where(eq(s.device.id, tablet.deviceId));
    expect(d!.secretHash.equals(sha256(tablet.deviceSecret))).toBe(true);
    expect(d!.pepper.toString('base64')).toBe(tablet.pinPepper);
    expect((await events(t.id, 'device.paired')).map((e) => e.payload)).toContainEqual({
      deviceId: tablet.deviceId,
      name: 'Tablet stół 1',
      platform: 'android',
    });
  });

  it('TC-API-063: kod wygasły, wyczerpany i błędny → ten sam błąd', async () => {
    const t = await org.tournament();
    const code = (await org.req('POST', `/v1/tournaments/${t.id}/pairing-codes`)).body.code as string;
    const body = (c: string) => ({
      code: c,
      deviceName: 'T',
      platform: 'ios',
      model: 'iPad',
      osVersion: '26',
      appVersion: '1.0.0',
    });
    for (let i = 0; i < 10; i++)
      expect((await call('POST', '/v1/devices/pair', { body: body(code), ip: `10.70.0.${i}` })).status).toBe(
        201,
      );
    const exhausted = await call('POST', '/v1/devices/pair', { body: body(code), ip: '10.70.1.1' });
    const wrong = await call('POST', '/v1/devices/pair', { body: body('ABCD-EFGH'), ip: '10.70.1.2' });
    await handle.db
      .update(s.pairingCode)
      .set({ expiresAt: new Date(Date.now() - 1000), useCount: 0 })
      .where(eq(s.pairingCode.tournamentId, t.id));
    const expired = await call('POST', '/v1/devices/pair', { body: body(code), ip: '10.70.1.3' });
    for (const r of [exhausted, wrong, expired])
      expect([r.status, r.body.code]).toEqual([400, 'PAIRING_CODE_INVALID']);
  });

  it('TC-API-064: limit 20 urządzeń', async () => {
    const t = await org.tournament();
    for (let i = 0; i < TOURNAMENT_LIMITS.devices; i++) {
      await handle.db.insert(s.device).values({
        tournamentId: t.id,
        name: `T${i}`,
        platform: 'ios',
        secretHash: Buffer.alloc(32),
        pepper: Buffer.alloc(32),
      });
    }
    const code = (await org.req('POST', `/v1/tournaments/${t.id}/pairing-codes`)).body.code;
    const res = await call('POST', '/v1/devices/pair', {
      body: { code, deviceName: 'T21', platform: 'ios', model: 'x', osVersion: '1', appVersion: '1' },
    });
    expect([res.status, res.body.code]).toEqual([409, 'LIMIT_EXCEEDED']);
  });

  it('UX-33: parowanie bez nazwy – „Tablet {n}” z kolejnym numerem w turnieju', async () => {
    const t = await org.tournament();
    await pairTablet(call, org, t.id, 'Tablet przy scenie');
    const a = await pairTablet(call, org, t.id, null);
    const b = await pairTablet(call, org, t.id, null);
    const names = Object.fromEntries(
      (
        (await org.req('GET', `/v1/tournaments/${t.id}/devices`)).body.items as { id: string; name: string }[]
      ).map((d) => [d.id, d.name]),
    );
    expect([names[a.deviceId], names[b.deviceId]]).toEqual(['Tablet 2', 'Tablet 3']);
  });

  it('TC-API-065 / TC-API-067 / TC-API-069: lista, zmiana nazwy, heartbeat i stan online', async () => {
    const t = await org.tournament();
    const judge = await org.judge(t.id, 'Katarzyna Nowak');
    const a = await pairTablet(call, org, t.id, 'Tablet stół 1');
    const b = await pairTablet(call, org, t.id, 'Tablet stół 2');
    const hb = await call('POST', '/v1/devices/me/heartbeat', {
      token: a.token,
      body: { pendingMutations: 3, lastSyncCursor: 10, batteryLevel: 0.82, activeJudgeId: judge.id },
    });
    expect(hb.status).toBe(204);
    await handle.db
      .update(s.device)
      .set({ lastSeenAt: new Date(Date.now() - 120_000) })
      .where(eq(s.device.id, b.deviceId));
    const list = (await org.req('GET', `/v1/tournaments/${t.id}/devices`)).body.items as Record<
      string,
      any
    >[];
    const rowA = list.find((d) => d.id === a.deviceId)!;
    expect(rowA).toMatchObject({
      online: true,
      pendingMutations: 3,
      batteryLevel: 0.82,
      activeJudge: { id: judge.id, fullName: 'Katarzyna Nowak' },
    });
    expect(list.find((d) => d.id === b.deviceId)).toMatchObject({ online: false });
    expect((await events(t.id, 'device.status')).length).toBeGreaterThanOrEqual(1);
    const renamed = await org.req('PATCH', `/v1/devices/${a.deviceId}`, { name: 'Stół sędziowski A' });
    expect(renamed.body.name).toBe('Stół sędziowski A');
  });

  it('TC-API-068 / TC-SEC-015: odłączenie – session.revoked do tabletu, każde kolejne żądanie 401 DEVICE_REVOKED', async () => {
    const t = await org.tournament();
    const tablet = await pairTablet(call, org, t.id);
    expect((await org.req('DELETE', `/v1/devices/${tablet.deviceId}`)).status).toBe(204);
    const [revokedEvent] = await events(t.id, 'session.revoked');
    expect(revokedEvent).toMatchObject({ deviceId: tablet.deviceId, payload: { reason: 'DEVICE_REVOKED' } });
    const hb = await call('POST', '/v1/devices/me/heartbeat', {
      token: tablet.token,
      body: { pendingMutations: 0, lastSyncCursor: null, batteryLevel: null, activeJudgeId: null },
    });
    expect([hb.status, hb.body.code]).toEqual([401, 'DEVICE_REVOKED']);
    const token = await call('POST', '/v1/devices/token', {
      body: { deviceId: tablet.deviceId, deviceSecret: tablet.deviceSecret },
    });
    expect(token.body.code).toBe('DEVICE_REVOKED');
    expect((await org.req('GET', `/v1/tournaments/${t.id}/devices`)).body.items).toEqual([]);
  });
});

describe('sesje sędziów (IMP-143)', () => {
  it('TC-API-070: logowanie PIN online – token judge 12 h, sesja ONLINE_PIN', async () => {
    const t = await org.tournament();
    const judge = await org.judge(t.id, 'Katarzyna Nowak');
    const tablet = await pairTablet(call, org, t.id);
    const res = await call('POST', '/v1/judge-sessions', {
      token: tablet.token,
      body: { judgeId: judge.id, pin: judge.pin },
    });
    expect(res.status).toBe(201);
    const claims = decodeJwt(res.body.judgeToken);
    expect(claims).toMatchObject({
      typ: 'judge',
      sub: judge.id,
      dev: tablet.deviceId,
      trn: t.id,
      sid: res.body.sessionId,
    });
    expect((claims.exp ?? 0) - (claims.iat ?? 0)).toBe(43_200);
    const [session] = await handle.db
      .select()
      .from(s.judgeSession)
      .where(eq(s.judgeSession.id, res.body.sessionId));
    expect(session).toMatchObject({ authMode: 'ONLINE_PIN', deviceId: tablet.deviceId, endedAt: null });
  });

  it('TC-API-071 / TC-API-072: zły PIN – pozostałe próby, blokada po 10 łącznie z dwóch tabletów', async () => {
    const t = await org.tournament();
    const judge = await org.judge(t.id, 'Michał Woźniak');
    const a = await pairTablet(call, org, t.id, 'A');
    const b = await pairTablet(call, org, t.id, 'B');
    const first = await call('POST', '/v1/judge-sessions', {
      token: a.token,
      body: { judgeId: judge.id, pin: wrongPin(judge.pin) },
    });
    expect([first.status, first.body.code, first.body.remainingAttempts]).toEqual([401, 'PIN_INVALID', 9]);
    for (let i = 0; i < 4; i++)
      await call('POST', '/v1/judge-sessions', {
        token: a.token,
        body: { judgeId: judge.id, pin: wrongPin(judge.pin) },
      });
    for (let i = 0; i < 4; i++)
      await call('POST', '/v1/judge-sessions', {
        token: b.token,
        body: { judgeId: judge.id, pin: wrongPin(judge.pin) },
      });
    const tenth = await call('POST', '/v1/judge-sessions', {
      token: b.token,
      body: { judgeId: judge.id, pin: wrongPin(judge.pin) },
    });
    expect([tenth.status, tenth.body.code, tenth.body.requiresReset]).toEqual([423, 'PIN_LOCKED', true]);
    const correct = await call('POST', '/v1/judge-sessions', {
      token: a.token,
      body: { judgeId: judge.id, pin: judge.pin },
    });
    expect(correct.body.code).toBe('PIN_LOCKED');
    const list = (await org.req('GET', `/v1/tournaments/${t.id}/judges`)).body.items;
    expect(list[0].pinLocked).toBe(true);
    expect((await events(t.id, 'judges.changed')).length).toBeGreaterThanOrEqual(2);
  });

  it('TC-API-073: blokada urządzenia po 30 błędach w 10 min', async () => {
    const t = await org.tournament();
    const tablet = await pairTablet(call, org, t.id);
    const judges = [];
    for (const name of ['Anna Pierwsza', 'Beata Druga', 'Celina Trzecia', 'Dorota Czwarta'])
      judges.push(await org.judge(t.id, name));
    let attempts = 0;
    for (const j of judges) {
      for (let i = 0; i < 9 && attempts < 30; i++, attempts++) {
        await call('POST', '/v1/judge-sessions', {
          token: tablet.token,
          body: { judgeId: j.id, pin: wrongPin(j.pin) },
        });
      }
    }
    const blocked = await call('POST', '/v1/judge-sessions', {
      token: tablet.token,
      body: { judgeId: judges[3]!.id, pin: judges[3]!.pin },
    });
    expect([blocked.status, blocked.body.code]).toEqual([423, 'PIN_LOCKED']);
    expect(blocked.body.retryAfterSeconds).toBeGreaterThan(0);
    expect(blocked.body.retryAfterSeconds).toBeLessThanOrEqual(600);
  });

  it('TC-API-074 / TC-API-075: druga sesja zastępuje pierwszą; wylogowanie unieważnia token', async () => {
    const t = await org.tournament();
    const judge = await org.judge(t.id, 'Aleksandra Kot');
    const a = await pairTablet(call, org, t.id, 'A');
    const b = await pairTablet(call, org, t.id, 'B');
    const first = await judgeLogin(call, a.token, judge.id, judge.pin);
    const second = await judgeLogin(call, b.token, judge.id, judge.pin);
    const [old] = await handle.db.select().from(s.judgeSession).where(eq(s.judgeSession.id, first.sessionId));
    expect(old!.endedReason).toBe('REPLACED');
    const revoked = await events(t.id, 'session.revoked');
    expect(revoked.find((e) => e.deviceId === a.deviceId)?.payload).toEqual({
      judgeId: judge.id,
      reason: 'REPLACED',
    });
    const hbOld = await call('POST', '/v1/devices/me/heartbeat', {
      token: first.judgeToken,
      body: { pendingMutations: 0, lastSyncCursor: null, batteryLevel: null, activeJudgeId: null },
    });
    expect(hbOld.status).toBe(401);
    expect((await call('DELETE', '/v1/judge-sessions/current', { token: second.judgeToken })).status).toBe(
      204,
    );
    const [ended] = await handle.db
      .select()
      .from(s.judgeSession)
      .where(eq(s.judgeSession.id, second.sessionId));
    expect(ended!.endedReason).toBe('LOGOUT');
    expect((await call('DELETE', '/v1/judge-sessions/current', { token: second.judgeToken })).status).toBe(
      401,
    );
  });

  it('sędzia innego turnieju → 404, nieaktywny → JUDGE_INACTIVE, token organizatora → 403', async () => {
    const t = await org.tournament();
    const other = await org.tournament();
    const foreign = await org.judge(other.id, 'Obca Sędzia');
    const tablet = await pairTablet(call, org, t.id);
    expect(
      (
        await call('POST', '/v1/judge-sessions', {
          token: tablet.token,
          body: { judgeId: foreign.id, pin: foreign.pin },
        })
      ).status,
    ).toBe(404);
    const j = await org.judge(t.id, 'Nieaktywna Sędzia');
    await handle.db.update(s.judge).set({ isActive: false }).where(eq(s.judge.id, j.id));
    expect(
      (await call('POST', '/v1/judge-sessions', { token: tablet.token, body: { judgeId: j.id, pin: j.pin } }))
        .body.code,
    ).toBe('JUDGE_INACTIVE');
    const asOrg = await org.req('POST', '/v1/judge-sessions', { judgeId: j.id, pin: j.pin });
    expect(asOrg.status).toBe(403);
    const count = await handle.db.execute(
      sql`SELECT count(*)::int AS n FROM judge_session WHERE judge_id = ${j.id}`,
    );
    expect(count.rows[0]).toEqual({ n: 0 });
  });
});

describe('tablet po zakończeniu turnieju (IMP-717)', () => {
  it('UX-41: heartbeat działa, organizator odłącza tablet w turnieju zakończonym', async () => {
    const t = await org.tournament();
    const tablet = await pairTablet(call, org, t.id);
    await handle.db.update(s.tournament).set({ status: 'FINISHED' }).where(eq(s.tournament.id, t.id));
    const beat = await call('POST', '/v1/devices/me/heartbeat', {
      token: tablet.token,
      body: { pendingMutations: 0, lastSyncCursor: 0, batteryLevel: 0.5, activeJudgeId: null },
    });
    expect(beat.status).toBe(204);
    const revoked = await org.req('DELETE', `/v1/devices/${tablet.deviceId}`);
    expect(revoked.status).toBe(204);
    const [d] = await handle.db.select().from(s.device).where(eq(s.device.id, tablet.deviceId));
    expect(d!.revokedAt).toBeInstanceOf(Date);
  });
});

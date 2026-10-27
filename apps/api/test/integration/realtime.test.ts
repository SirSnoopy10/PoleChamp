import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { and, eq, isNull } from 'drizzle-orm';
import { decodeJwt, importJWK, SignJWT } from 'jose';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../../src/config/env.js';
import type { DbHandle } from '../../src/db/client.js';
import * as s from '../../src/db/schema.js';
import { AUDIENCE } from '../../src/modules/auth/jwt.service.js';
import { RealtimeGateway } from '../../src/modules/realtime/gateway.js';
import { EventPublisher } from '../../src/modules/realtime/publisher.js';
import { startApp } from '../support/app.js';
import { testDb } from '../support/db.js';
import { type Call, client, flushValkey, registerAndLogin } from '../support/http.js';
import { mutation, push, runningCategory } from '../support/push.js';
import { connect, listen, type RtClient, sleep } from '../support/realtime.js';
import { insertSheet, organizer } from '../support/scenario.js';
import { judgeLogin, pairTablet } from '../support/tablet.js';

let app: NestFastifyApplication;
let env: Env;
let baseUrl: string;
let call: Call;
let handle: DbHandle;
let org: ReturnType<typeof organizer>;
let orgToken: string;
const clients: RtClient[] = [];

beforeAll(async () => {
  ({ app, env } = await startApp());
  baseUrl = await listen(app);
  call = client(app);
  handle = testDb();
  await flushValkey();
  orgToken = (await registerAndLogin(call)).accessToken;
  org = organizer(call, orgToken);
});
afterAll(async () => {
  for (const c of clients) c.close();
  await app.close();
  await handle.pool.end();
});
beforeEach(async () => {
  await flushValkey();
});

const ifMatch = (v: number) => ({ 'if-match': `W/"${v}"` });
const open = async (token?: string, url = baseUrl) => {
  const c = await connect(url, token);
  clients.push(c);
  return c;
};

/** Czeka, aż publikator opublikuje wszystkie zdarzenia turnieju. */
async function drained(tournamentId: string) {
  for (let i = 0; i < 50; i++) {
    const pending = await handle.db
      .select({ id: s.domainEvent.id })
      .from(s.domainEvent)
      .where(and(eq(s.domainEvent.tournamentId, tournamentId), isNull(s.domainEvent.publishedAt)));
    if (!pending.length) return;
    await sleep(100);
  }
  throw new Error('Outbox nie został opróżniony');
}

/** Organizator i tablet zasubskrybowani na turniej z kategorią w trakcie. */
async function connected(options: Parameters<typeof runningCategory>[2] = {}) {
  const ctx = await runningCategory(call, org, options);
  const orgRt = await open(orgToken);
  const tabletRt = await open(ctx.tablet.token);
  expect((await orgRt.subscribe(ctx.t.id)).ok).toBe(true);
  expect((await tabletRt.subscribe(ctx.t.id)).ok).toBe(true);
  return { ...ctx, orgRt, tabletRt };
}

describe('gateway realtime (IMP-154)', () => {
  it('TC-RT-001: handshake z tokenem org, device, judge; bez tokenu i polling – odrzucenie', async () => {
    const { tablet, session } = await runningCategory(call, org);
    for (const token of [orgToken, tablet.token, session.judgeToken]) {
      const c = await open(token);
      expect(c.socket.connected).toBe(true);
    }
    await expect(connect(baseUrl)).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
    await expect(connect(baseUrl, 'nie-jwt')).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
    await expect(connect(baseUrl, orgToken, { transports: ['polling'] })).rejects.toThrow();
    await org.req('DELETE', `/v1/devices/${tablet.deviceId}`);
    await expect(connect(baseUrl, tablet.token)).rejects.toMatchObject({ code: 'DEVICE_REVOKED' });
  });

  it('TC-RT-002: subskrypcja cudzego turnieju → FORBIDDEN i brak zdarzeń', async () => {
    const { t, c } = await runningCategory(call, org);
    const other = organizer(call, (await registerAndLogin(call)).accessToken);
    const otherT = await other.tournament();
    const otherTablet = await pairTablet(call, other, otherT.id);
    const otherOrgRt = await open((await registerAndLogin(call)).accessToken);
    const otherTabletRt = await open(otherTablet.token);
    expect(await otherOrgRt.subscribe(t.id)).toEqual({ ok: false, code: 'FORBIDDEN' });
    expect(await otherTabletRt.subscribe(t.id)).toEqual({ ok: false, code: 'FORBIDDEN' });
    const invalid = await otherTabletRt.socket.timeout(3_000).emitWithAck('subscribe', {});
    expect(invalid).toEqual({ ok: false, code: 'VALIDATION_FAILED' });
    await org.req('POST', `/v1/categories/${c.id}/lock`, { force: true });
    await sleep(600);
    expect([...otherOrgRt.events, ...otherTabletRt.events]).toEqual([]);
  });

  it('heartbeat przez WebSocket aktualizuje stan tabletu; organizator nie może wysłać heartbeat', async () => {
    const { tablet, tabletRt, orgRt } = await connected();
    const ack = await tabletRt.socket.timeout(3_000).emitWithAck('heartbeat', {
      pendingMutations: 4,
      lastSyncCursor: 10,
      batteryLevel: 0.5,
      activeJudgeId: null,
    });
    expect(ack.ok).toBe(true);
    const [d] = await handle.db.select().from(s.device).where(eq(s.device.id, tablet.deviceId));
    expect([d!.pendingMutations, d!.batteryLevel]).toEqual([4, 50]);
    expect(await orgRt.socket.timeout(3_000).emitWithAck('heartbeat', {})).toEqual({
      ok: false,
      code: 'FORBIDDEN',
    });
  });

  it('TC-RT-010: wygaśnięcie tokenu → auth.expired, ponowne połączenie z nowym tokenem', async () => {
    const t = await org.tournament();
    const keys = JSON.parse(env.JWT_KEYS) as { active: { kid: string; privateJwk: Record<string, unknown> } };
    const key = await importJWK({ ...keys.active.privateJwk, alg: 'ES256' }, 'ES256');
    const short = await new SignJWT({ typ: 'org' })
      .setProtectedHeader({ alg: 'ES256', kid: keys.active.kid, typ: 'JWT' })
      .setSubject(decodeJwt(orgToken).sub as string)
      .setIssuer(env.JWT_ISSUER)
      .setAudience(AUDIENCE)
      .setIssuedAt()
      .setExpirationTime(Math.floor(Date.now() / 1000) + 2)
      .sign(key);
    const rt = await open(short);
    expect((await rt.subscribe(t.id)).ok).toBe(true);
    await rt.waitFor('auth.expired', undefined, 5_000);
    await sleep(100);
    expect(rt.socket.connected).toBe(false);
    const again = await open(orgToken);
    expect((await again.subscribe(t.id)).ok).toBe(true);
  });

  it('TC-RT-011: dwie instancje API z adapterem Redis – zdarzenie z A dociera do klienta na B ≤ 1 s', async () => {
    const second = await startApp({ env });
    const secondUrl = await listen(second.app);
    try {
      const { t, c, tablet } = await runningCategory(call, org);
      const onB = await open(tablet.token, secondUrl);
      expect((await onB.subscribe(t.id)).ok).toBe(true);
      const started = Date.now();
      await org.req('POST', `/v1/categories/${c.id}/lock`, { force: true });
      await onB.waitFor('category.locked', (p) => p.categoryId === c.id, 2_000);
      expect(Date.now() - started).toBeLessThan(1_000);
    } finally {
      await second.app.close();
    }
  });
});

describe('publikator outboxu (IMP-155)', () => {
  it('lider publikatora: jedna instancja publikuje, zdarzenia oznaczone published_at', async () => {
    expect(app.get(EventPublisher).isLeader).toBe(true);
    const { t, orgRt, c } = await connected();
    await org.req('POST', `/v1/categories/${c.id}/lock`, { force: true });
    await orgRt.waitFor('category.locked');
    await sleep(100);
    const pending = await handle.db
      .select()
      .from(s.domainEvent)
      .where(and(eq(s.domainEvent.tournamentId, t.id), isNull(s.domainEvent.publishedAt)));
    expect(pending).toEqual([]);
  });

  it('TC-RT-009: przerwanie przed published_at → zdarzenie dostarczone ponownie (co najmniej raz)', async () => {
    const { t, orgRt, c } = await connected();
    await drained(t.id);
    const publisher = app.get(EventPublisher);
    const spy = vi
      .spyOn(publisher as unknown as { markPublished: () => Promise<void> }, 'markPublished')
      .mockRejectedValueOnce(new Error('awaria publikatora'));
    try {
      await org.req('POST', `/v1/categories/${c.id}/lock`, { force: true });
      // Po błędzie lider oddaje rolę, przejmuje ją ponownie i emituje paczkę jeszcze raz.
      const twice = async () => {
        for (let i = 0; i < 50; i++) {
          if (orgRt.events.filter((e) => e.type === 'category.locked').length >= 2) return true;
          await sleep(100);
        }
        return false;
      };
      expect(await twice()).toBe(true);
      await drained(t.id);
    } finally {
      spy.mockRestore();
    }
  });

  it('wycofana transakcja nie emituje zdarzenia', async () => {
    const { c, judges, entries, orgRt } = await connected();
    await insertSheet(handle.db, {
      categoryId: c.id,
      entryId: entries[0]!.id,
      judgeId: judges[0]!.id,
      notes: [],
    });
    const before = orgRt.events.length;
    // Usunięcie startu z oceną kończy się HAS_SCORES – transakcja wycofana, outbox pusty.
    expect((await org.req('DELETE', `/v1/entries/${entries[0]!.id}`)).body.code).toBe('HAS_SCORES');
    await sleep(500);
    expect(orgRt.events.slice(before)).toEqual([]);
  });

  it('TC-RT-012: 100 przyjęć ocen – opóźnienie COMMIT → odbiór zdarzenia p95 ≤ 500 ms', async () => {
    const numbers = Array.from({ length: 50 }, (_, i) => i + 1);
    const { c, judges, jA, entries, tablet, session, orgRt } = await connected({ entries: numbers });
    const sessionB = await judgeLogin(call, tablet.token, judges[1]!.id, judges[1]!.pin);
    const latencies: number[] = [];
    for (const [judgeId, sessionId] of [
      [jA.id, session.sessionId],
      [judges[1]!.id, sessionB.sessionId],
    ] as const) {
      for (const e of entries) {
        const m = mutation.submit({
          judgeId,
          judgeSessionId: sessionId,
          categoryId: c.id,
          entryId: e.id,
          criteria: c.criteria,
        });
        const res = await push(call, tablet.token, [m]);
        const committedAt = Date.now();
        expect(res.body.results[0].status).toBe('APPLIED');
        await orgRt.waitFor('scoresheet.accepted', (p) => p.entryId === e.id && p.judgeId === judgeId);
        const received = orgRt.events.find(
          (ev) =>
            ev.type === 'scoresheet.accepted' &&
            ev.payload.entryId === e.id &&
            ev.payload.judgeId === judgeId,
        )!;
        latencies.push(Math.max(0, received.at - committedAt));
      }
    }
    latencies.sort((a, b) => a - b);
    expect(latencies).toHaveLength(100);
    expect(latencies[94]).toBeLessThanOrEqual(500);
  });

  it('TC-SYNC-019: Valkey niedostępny – API przyjmuje oceny, zdarzenia czekają w outboxie', async () => {
    const { t, c, jA, entries, tablet, session } = await runningCategory(call, org);
    const degraded = await startApp({
      env: { ...env, VALKEY_URL: 'redis://127.0.0.1:1', EVENT_PUBLISHER_ENABLED: false },
    });
    try {
      const callDegraded = client(degraded.app);
      const m = mutation.submit({
        judgeId: jA.id,
        judgeSessionId: session.sessionId,
        categoryId: c.id,
        entryId: entries[0]!.id,
        criteria: c.criteria,
      });
      const res = await push(callDegraded, tablet.token, [m]);
      expect([res.status, res.body.results[0].status]).toEqual([200, 'APPLIED']);
      // Publikator bez Valkey nie publikuje – zdarzenie zostaje do wysłania po powrocie Valkey.
      expect(await degraded.app.get(EventPublisher).publishBatch()).toBe(0);
      const results = await callDegraded('GET', `/v1/categories/${c.id}/results`, { token: orgToken });
      expect(results.status).toBe(200);
      // Instancja z działającym Valkey (lider) wysyła zaległe zdarzenia.
      await drained(t.id);
    } finally {
      await degraded.app.close();
    }
  });
});

describe('zdarzenia komend (IMP-156)', () => {
  it('TC-RT-003: statusy kategorii i turnieju; tablet dostaje sync.hint', async () => {
    const t = await org.tournament();
    await org.judge(t.id, 'Katarzyna Nowak');
    const c = await org.category(t.id);
    await org.entry(c.id, 1);
    const tablet = await pairTablet(call, org, t.id);
    const orgRt = await open(orgToken);
    const tabletRt = await open(tablet.token);
    await orgRt.subscribe(t.id);
    await tabletRt.subscribe(t.id);

    await org.req('POST', `/v1/categories/${c.id}/start`);
    expect(await orgRt.waitFor('tournament.updated', (p) => p.status === 'IN_PROGRESS')).toMatchObject({
      tournamentId: t.id,
    });
    expect(await tabletRt.waitFor('category.updated', (p) => p.status === 'IN_PROGRESS')).toEqual({
      categoryId: c.id,
      status: 'IN_PROGRESS',
      version: expect.any(Number),
    });
    const hint = await tabletRt.waitFor('sync.hint');
    expect(hint.cursor).toBeGreaterThan(0);
    await org.req('POST', `/v1/categories/${c.id}/lock`, { force: true });
    expect(await tabletRt.waitFor('category.locked')).toEqual({
      categoryId: c.id,
      lockedAt: expect.any(String),
    });
    await org.req('POST', `/v1/categories/${c.id}/unlock`, { reason: 'Protest' });
    expect(await tabletRt.waitFor('category.unlocked')).toEqual({ categoryId: c.id });
    const current = await org.req('GET', `/v1/tournaments/${t.id}`);
    await org.req('POST', `/v1/tournaments/${t.id}/finish`, undefined, ifMatch(current.body.version));
    expect(await tabletRt.waitFor('tournament.updated', (p) => p.status === 'FINISHED')).toMatchObject({
      tournamentId: t.id,
    });
  });

  it('TC-RT-004: start w kategorii Trwa, wycofanie, nowy sędzia, reset PIN-u → tablet pobiera zmiany', async () => {
    const { t, c, judges, tablet, tabletRt } = await connected();
    const since = (await call('GET', '/v1/sync/snapshot', { token: tablet.token })).body.cursor as number;
    const added = await org.entry(c.id, 77);
    expect(await tabletRt.waitFor('config.changed')).toEqual({ categoryId: c.id, scope: 'entries' });
    await org.req('POST', `/v1/entries/${added.id}/withdraw`);
    const newJudge = await org.judge(t.id, 'Iwona Lis');
    await tabletRt.waitFor('judges.changed', (p) => p.judgeIds.includes(newJudge.id));
    await org.req('POST', `/v1/judges/${judges[1]!.id}/pin/reset`);
    await tabletRt.waitFor('judges.changed', (p) => p.judgeIds.includes(judges[1]!.id));
    const pulled = await call('GET', `/v1/sync/changes?since=${since}`, { token: tablet.token });
    const types = pulled.body.changes.map((ch: { entityType: string }) => ch.entityType);
    expect(types).toEqual(expect.arrayContaining(['entry', 'judge', 'category']));
  });

  it('TC-RT-005 / TC-RT-007: zdarzenia wyników i odrzuceń tylko dla organizatora', async () => {
    const { c, jA, entries, session, tablet, orgRt, tabletRt } = await connected();
    const sheet = (entryId: string) =>
      mutation.submit({
        judgeId: jA.id,
        judgeSessionId: session.sessionId,
        categoryId: c.id,
        entryId,
        criteria: c.criteria,
      });
    await push(call, tablet.token, [sheet(entries[0]!.id)]);
    expect(await orgRt.waitFor('scoresheet.accepted')).toEqual({
      categoryId: c.id,
      entryId: entries[0]!.id,
      judgeId: jA.id,
      revision: 1,
    });
    expect(await orgRt.waitFor('results.updated', (p) => p.categoryId === c.id)).toEqual({
      categoryId: c.id,
      resultsVersion: expect.any(Number),
    });
    expect(await orgRt.waitFor('progress.updated')).toMatchObject({ categoryId: c.id, categoryDone: 1 });

    await org.req('POST', `/v1/categories/${c.id}/lock`, { force: true });
    await push(call, tablet.token, [sheet(entries[1]!.id)]);
    const rejected = await orgRt.waitFor('rejected.created');
    expect(rejected).toEqual({ rejectedId: expect.any(String), categoryId: c.id, judgeId: jA.id });
    await sleep(300);
    const orgOnly = [
      'scoresheet.accepted',
      'results.updated',
      'progress.updated',
      'rejected.created',
      'device.status',
      'device.paired',
    ];
    expect(tabletRt.events.filter((e) => orgOnly.includes(e.type))).toEqual([]);
  });

  it('TC-RT-006: device.status po heartbeat i device.paired po sparowaniu', async () => {
    const { t, tablet, orgRt } = await connected();
    await flushValkey();
    await call('POST', '/v1/devices/me/heartbeat', {
      token: tablet.token,
      body: { pendingMutations: 2, lastSyncCursor: 5, batteryLevel: 0.8, activeJudgeId: null },
    });
    expect(await orgRt.waitFor('device.status', (p) => p.pendingMutations === 2)).toEqual({
      deviceId: tablet.deviceId,
      online: true,
      pendingMutations: 2,
      lastSeenAt: expect.any(String),
      activeJudgeId: null,
    });
    const second = await pairTablet(call, org, t.id, 'Tablet stół 3');
    expect(await orgRt.waitFor('device.paired', (p) => p.deviceId === second.deviceId)).toEqual({
      deviceId: second.deviceId,
      name: 'Tablet stół 3',
      platform: 'android',
    });
  });

  it('TC-RT-008: session.revoked – REPLACED, PIN_RESET, JUDGE_DEACTIVATED, TOURNAMENT_FINISHED, DEVICE_REVOKED', async () => {
    const { t, judges, jA, tablet, tabletRt } = await connected({
      judges: ['Katarzyna Nowak', 'Ewa Zielińska', 'Iwona Lis', 'Monika Sowa'],
    });
    const [, jB, jC, jD] = judges;
    const tabletB = await pairTablet(call, org, t.id, 'Tablet stół 2');
    const revoked = (reason: string, judgeId?: string) =>
      tabletRt.waitFor('session.revoked', (p) => p.reason === reason && p.judgeId === judgeId);

    await judgeLogin(call, tabletB.token, jA.id, jA.pin);
    await revoked('REPLACED', jA.id);
    await judgeLogin(call, tablet.token, jB!.id, jB!.pin);
    await org.req('POST', `/v1/judges/${jB!.id}/pin/reset`);
    await revoked('PIN_RESET', jB!.id);
    await judgeLogin(call, tablet.token, jC!.id, jC!.pin);
    await org.req('PATCH', `/v1/judges/${jC!.id}`, { isActive: false }, ifMatch(1));
    await revoked('JUDGE_DEACTIVATED', jC!.id);
    await judgeLogin(call, tablet.token, jD!.id, jD!.pin);
    const current = await org.req('GET', `/v1/tournaments/${t.id}`);
    await org.req('POST', `/v1/tournaments/${t.id}/finish`, undefined, ifMatch(current.body.version));
    await revoked('TOURNAMENT_FINISHED', jD!.id);
    await org.req('DELETE', `/v1/devices/${tablet.deviceId}`);
    await revoked('DEVICE_REVOKED');
  });
});

describe('wdrożenie z połączeniami WS (IMP-505)', () => {
  it('TC-REL-005: SIGTERM – server.restarting, rozłączanie paczkami, druga instancja bez zmian, zmiany z przerwy w sync/changes', async () => {
    const second = await startApp({ env });
    const secondUrl = await listen(second.app);
    try {
      const { t, c, tablet } = await runningCategory(call, org);
      const since = (await call('GET', '/v1/sync/snapshot', { token: tablet.token })).body.cursor as number;
      // 120 połączeń na instancji wygaszanej (A) i 2 na instancji B.
      const onA: RtClient[] = [];
      for (let i = 0; i < 120; i++) onA.push(await open(orgToken));
      const tabletOnA = await open(tablet.token);
      expect((await tabletOnA.subscribe(t.id)).ok).toBe(true);
      const onB = [await open(orgToken, secondUrl), await open(tablet.token, secondUrl)];
      const closedAt: number[] = [];
      for (const rt of [...onA, tabletOnA]) rt.socket.on('disconnect', () => closedAt.push(Date.now()));

      const gateway = app.get(RealtimeGateway, { strict: false });
      const started = Date.now();
      // Na A są też połączenia z wcześniejszych testów pliku – wygaszane wszystkie.
      expect(await gateway.drain({ batch: 50, intervalMs: 300 })).toBeGreaterThanOrEqual(121);
      await vi.waitFor(() => expect(closedAt).toHaveLength(121), { timeout: 3_000 });

      for (const rt of [...onA, tabletOnA]) {
        expect(rt.events.some((e) => e.type === 'server.restarting')).toBe(true);
      }
      // Paczki po 50 co 300 ms: ≥ 121 połączeń → ≥ 3 paczki, ostatnia ≥ 600 ms po starcie.
      const batches = new Set(closedAt.map((at) => Math.round((at - started) / 300)));
      expect(batches.size).toBeGreaterThanOrEqual(3);
      expect(Math.max(...closedAt) - started).toBeGreaterThanOrEqual(550);
      // Instancja B: połączenia nietknięte, bez `server.restarting`.
      for (const rt of onB) {
        expect(rt.socket.connected).toBe(true);
        expect(rt.events.some((e) => e.type === 'server.restarting')).toBe(false);
      }

      // Zdarzenie w trakcie przerwy (tablet rozłączony) – po ponownym połączeniu klient robi pull.
      await org.req('POST', `/v1/categories/${c.id}/lock`, { force: true });
      const pulled = await call('GET', `/v1/sync/changes?since=${since}`, { token: tablet.token });
      expect(pulled.body.changes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ entityType: 'category', entity: expect.objectContaining({ id: c.id }) }),
        ]),
      );
      const back = await open(tablet.token, secondUrl);
      expect((await back.subscribe(t.id)).ok).toBe(true);
    } finally {
      await second.app.close();
    }
  });
});

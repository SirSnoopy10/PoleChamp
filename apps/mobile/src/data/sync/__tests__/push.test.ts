import type { LocalDb } from '../../local/LocalDb';
import { ScoreSheetRepo } from '../../local/scoreSheets';
import { outbox } from '../../outbox/outbox';
import { network } from '../../network/online';
import { readMeta } from '../meta';
import { nextDelay, pushOnce, type PushDeps } from '../push';
import { submitSheet } from '../submit';
import { refreshFromDb, resetSyncStore, selectSyncPillState, syncStore } from '../syncStore';
import {
  fakeApi,
  fakeSyncServer,
  json,
  openTestDb,
  problemResponse,
  testClock,
  type Handler,
} from '../../../test-utils/sync';

const SESSION = '0199c000-0000-7000-8000-000000000001';

/** Chwila startu `testClock()` – zatwierdzenia przed pierwszą wysyłką. */
const NOW = Date.parse('2026-10-26T10:00:00.000Z');

const submit = (local: LocalDb, entryId: string, valueTenths = 80) =>
  submitSheet(
    local,
    {
      judgeId: 'jA',
      judgeSessionId: SESSION,
      authMode: 'OFFLINE_PIN',
      categoryId: 'c1',
      entryId,
      criteria: [{ criterionId: 'k1', valueTenths }],
      penalties: [],
      comment: '',
      totalHundredths: valueTenths * 10,
    },
    NOW,
  );

const rows = (local: LocalDb) =>
  local.read.getAllSync<{
    state: string;
    attempts: number;
    next_attempt_at: number;
    last_error: string | null;
  }>('SELECT state, attempts, next_attempt_at, last_error FROM outbox ORDER BY seq');

describe('wysyłka (IMP-354)', () => {
  let local: LocalDb;
  let clock: ReturnType<typeof testClock>;
  beforeEach(() => {
    local = openTestDb();
    clock = testClock();
  });
  afterEach(() => {
    local.close();
    network.reset();
    resetSyncStore();
  });

  const deps = (handler: Handler, extra: Partial<PushDeps> = {}) => {
    const fake = fakeApi(handler);
    return { deps: { api: fake.api, local, clock, random: () => 0.5, ...extra }, calls: fake.calls };
  };

  it('TC-OUTBOX-003: APPLIED i DUPLICATE → DONE, arkusze SYNCED z rewizją i wynikiem serwera', async () => {
    const a = await submit(local, 'e1', 85);
    const b = await submit(local, 'e2', 70);
    const { deps: d, calls } = deps(() =>
      json({
        results: [
          {
            mutationId: a.mutationId,
            status: 'APPLIED',
            scoreSheetId: a.scoreSheetId,
            revision: 1,
            serverTotal: 8.5,
          },
          {
            mutationId: b.mutationId,
            status: 'DUPLICATE',
            scoreSheetId: b.scoreSheetId,
            revision: 1,
            serverTotal: 7,
          },
        ],
        cursor: 12,
      }),
    );
    const out = await pushOnce(d);
    expect(out).toMatchObject({ status: 'ok', sent: 2, rejections: [], serverCursor: 12 });
    expect(calls[0]).toMatchObject({ method: 'POST', path: '/v1/sync/push' });
    expect(
      (calls[0]!.body as { mutations: { mutationId: string }[] }).mutations.map((m) => m.mutationId),
    ).toEqual([a.mutationId, b.mutationId]);
    expect(rows(local).map((r) => r.state)).toEqual(['DONE', 'DONE']);
    expect(ScoreSheetRepo.forJudge(local.read, 'jA').byEntry('e1')).toMatchObject({
      syncState: 'SYNCED',
      serverRevision: 1,
      serverTotalHundredths: 850,
    });
    expect(ScoreSheetRepo.forJudge(local.read, 'jA').byEntry('e2')?.serverTotalHundredths).toBe(700);
    expect(readMeta(local.read).lastPushAt).toBe('2026-10-26T10:00:00.000Z');
  });

  it('TC-OUTBOX-004: REJECTED → FAILED_PERMANENT, arkusz REJECTED z kodem, licznik odrzuceń', async () => {
    const a = await submit(local, 'e1');
    const { deps: d } = deps(() =>
      json({
        results: [{ mutationId: a.mutationId, status: 'REJECTED', code: 'CATEGORY_LOCKED' }],
        cursor: 10,
      }),
    );
    const out = await pushOnce(d);
    expect(out).toMatchObject({
      status: 'ok',
      rejections: [{ mutationId: a.mutationId, code: 'CATEGORY_LOCKED', entryId: 'e1', categoryId: 'c1' }],
    });
    expect(rows(local)).toMatchObject([{ state: 'FAILED_PERMANENT', last_error: 'CATEGORY_LOCKED' }]);
    expect(ScoreSheetRepo.forJudge(local.read, 'jA').byEntry('e1')).toMatchObject({
      syncState: 'REJECTED',
      rejectCode: 'CATEGORY_LOCKED',
    });
    refreshFromDb(local.read, 'jA');
    expect(syncStore.getState().rejected).toBe(1);
  });

  it('TC-OUTBOX-005: RETRY i brak wyniku → QUEUED, attempts + 1, next_attempt_at w przyszłości', async () => {
    const a = await submit(local, 'e1');
    const b = await submit(local, 'e2');
    const c = await submit(local, 'e3');
    const { deps: d } = deps(() =>
      json({
        results: [
          {
            mutationId: a.mutationId,
            status: 'APPLIED',
            scoreSheetId: a.scoreSheetId,
            revision: 1,
            serverTotal: 8,
          },
          { mutationId: b.mutationId, status: 'RETRY' },
        ],
        cursor: 11,
      }),
    );
    await pushOnce(d);
    const [ra, rb, rc] = rows(local);
    expect(ra?.state).toBe('DONE');
    for (const r of [rb, rc]) {
      expect(r).toMatchObject({ state: 'QUEUED', attempts: 1 });
      expect(r!.next_attempt_at).toBeGreaterThan(clock.now());
    }
    expect(rc?.last_error).toBe('NO_RESULT');
    expect(c.mutationId).toBeDefined();
  });

  it('TC-OUTBOX-006: limit czasu 15 s, potem 503 – wszystko wraca do kolejki z backoffem', async () => {
    await submit(local, 'e1');
    await submit(local, 'e2');
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
    try {
      const hanging = deps(
        (req) =>
          new Promise<Response>((_, reject) =>
            req.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))),
          ),
      );
      const pending = pushOnce(hanging.deps);
      await jest.advanceTimersByTimeAsync(15_000);
      await expect(pending).resolves.toEqual({ status: 'retry', error: 'TIMEOUT' });
    } finally {
      jest.useRealTimers();
    }
    expect(rows(local)).toMatchObject([
      { state: 'QUEUED', attempts: 1, last_error: 'TIMEOUT' },
      { state: 'QUEUED', attempts: 1, last_error: 'TIMEOUT' },
    ]);

    clock.advance(5_000);
    const unavailable = deps(() => problemResponse(503, 'INTERNAL'));
    await expect(pushOnce(unavailable.deps)).resolves.toEqual({ status: 'retry', error: 'INTERNAL' });
    expect(rows(local).every((r) => r.state === 'QUEUED' && r.attempts === 2)).toBe(true);
    expect(rows(local).some((r) => r.state === 'DONE')).toBe(false);
  });

  it('TC-OUTBOX-007: backoff min(60 s, 2^n s) ± 20%, nigdy > 72 s', () => {
    for (let n = 0; n <= 10; n++) {
      const base = Math.min(60_000, 1000 * 2 ** n);
      const samples = Array.from({ length: 1000 }, () => nextDelay(n));
      samples.sort((x, y) => x - y);
      expect(Math.abs(samples[500]! - base)).toBeLessThanOrEqual(base * 0.05);
      expect(samples[0]).toBeGreaterThanOrEqual(base * 0.8);
      expect(samples[999]).toBeLessThanOrEqual(Math.min(base * 1.2, 72_000));
    }
  });

  it('TC-OUTBOX-010: po 20 nieudanych próbach „Wymaga uwagi”, wysyłka nadal planowana', async () => {
    const a = await submit(local, 'e1');
    await local.tx((db) => db.runSync('UPDATE outbox SET attempts = 19 WHERE mutation_id = ?', a.mutationId));
    network.reportHttpSuccess();
    await pushOnce(deps(() => problemResponse(500, 'INTERNAL')).deps);
    expect(rows(local)).toMatchObject([{ state: 'QUEUED', attempts: 20 }]);
    expect(rows(local)[0]!.next_attempt_at).toBeLessThanOrEqual(clock.now() + 72_000);
    refreshFromDb(local.read, 'jA');
    expect(selectSyncPillState(syncStore.getState())).toEqual({ kind: 'attention' });
  });

  it('TC-OUTBOX-012: 401 DEVICE_REVOKED – kolejka zostaje, stan „odłączone”', async () => {
    await submit(local, 'e1');
    await submit(local, 'e2');
    const out = await pushOnce(deps(() => problemResponse(401, 'DEVICE_REVOKED')).deps);
    expect(out).toEqual({ status: 'revoked' });
    expect(rows(local)).toMatchObject([
      { state: 'QUEUED', attempts: 0 },
      { state: 'QUEUED', attempts: 0 },
    ]);
    expect(outbox.countPending(local.read)).toBe(2);
  });

  it('401 UNAUTHENTICATED → odświeżenie tokenu i ponowienie paczki', async () => {
    const a = await submit(local, 'e1');
    let first = true;
    const refresh = jest.fn(async () => 'nowy');
    const { deps: d, calls } = deps(
      () => {
        if (first) {
          first = false;
          return problemResponse(401, 'UNAUTHENTICATED');
        }
        return json({
          results: [
            { mutationId: a.mutationId, status: 'APPLIED', scoreSheetId: a.scoreSheetId, revision: 1 },
          ],
          cursor: 11,
        });
      },
      { auth: { refresh, ensureToken: refresh, expiresAt: () => 0 } },
    );
    await expect(pushOnce(d)).resolves.toMatchObject({ status: 'ok', sent: 1 });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(calls).toHaveLength(2);
  });

  it('413 → paczka zmniejszana o połowę', async () => {
    for (let i = 0; i < 4; i++) await submit(local, `e${i}`);
    const server = fakeSyncServer();
    const { deps: d, calls } = deps(async (req) => {
      const body = (await req.clone().json()) as { mutations: unknown[] };
      return body.mutations.length > 2 ? problemResponse(413, 'PAYLOAD_TOO_LARGE') : server.handler(req);
    });
    await expect(pushOnce(d)).resolves.toMatchObject({ status: 'ok', sent: 2 });
    expect(calls.map((c) => (c.body as { mutations: unknown[] }).mutations.length)).toEqual([4, 2]);
  });

  it('TC-SYNC-001 / TC-SYNC-002: oceny offline wysłane po powrocie sieci bez duplikatów', async () => {
    for (let i = 0; i < 40; i++) await submit(local, `e${i}`);
    const offline = deps(() => {
      throw new TypeError('Network request failed');
    });
    await expect(pushOnce(offline.deps)).resolves.toEqual({ status: 'retry', error: 'NETWORK' });
    refreshFromDb(local.read, 'jA');
    expect(selectSyncPillState(syncStore.getState())).toEqual({ kind: 'offlineQueue', count: 40 });

    clock.advance(2_000);
    const server = fakeSyncServer();
    const online = deps(server.handler);
    await expect(pushOnce(online.deps)).resolves.toMatchObject({ status: 'ok', sent: 40 });
    expect(server.state.applied).toBe(40);
    expect([...server.state.sheets.values()].every((rev) => rev === 1)).toBe(true);
    expect(outbox.countPending(local.read)).toBe(0);
  });

  it('TC-SYNC-003 / TC-SYNC-005: paczka przerwana po 50 – ponowienie daje 50 DUPLICATE i 50 APPLIED', async () => {
    for (let i = 0; i < 100; i++) await submit(local, `e${i}`);
    const server = fakeSyncServer();
    server.state.failAfter = 50;
    const { deps: d } = deps(server.handler);
    await expect(pushOnce(d)).resolves.toEqual({ status: 'retry', error: 'NETWORK' });
    expect(server.state.applied).toBe(50);

    // Zabicie aplikacji w trakcie (IN_FLIGHT) i start: odtworzenie kolejki.
    await local.tx((db) => db.runSync("UPDATE outbox SET state = 'IN_FLIGHT'"));
    await outbox.recoverInFlight(local);
    clock.advance(5_000);
    const results: string[] = [];
    const watched = deps(async (req) => {
      const res = await server.handler(req);
      const body = (await res.clone().json()) as { results: { status: string }[] };
      results.push(...body.results.map((r) => r.status));
      return res;
    });
    await expect(pushOnce(watched.deps)).resolves.toMatchObject({ status: 'ok', sent: 100 });
    expect(results.filter((s) => s === 'DUPLICATE')).toHaveLength(50);
    expect(results.filter((s) => s === 'APPLIED')).toHaveLength(50);
    expect(server.state.applied).toBe(100);
    expect(
      ScoreSheetRepo.forJudge(local.read, 'jA')
        .list()
        .every((s) => s.syncState === 'SYNCED'),
    ).toBe(true);
  });

  it('TC-SYNC-004: ocena zapisana przed „zabiciem” jest wysłana po starcie', async () => {
    const a = await submit(local, 'e1');
    // Proces zabity tuż po toaście – stan w bazie to jedyne źródło prawdy.
    await outbox.recoverInFlight(local);
    const server = fakeSyncServer();
    await pushOnce(deps(server.handler).deps);
    expect(server.state.processed.has(a.mutationId)).toBe(true);
    expect(ScoreSheetRepo.forJudge(local.read, 'jA').byEntry('e1')?.syncState).toBe('SYNCED');
  });

  it('TC-SYNC-020 / TC-SYNC-021: niestabilna sieć – każda ocena przyjęta dokładnie raz', async () => {
    for (let i = 0; i < 30; i++) await submit(local, `e${i}`);
    const server = fakeSyncServer();
    let call = 0;
    const flaky = deps(async (req) => {
      call += 1;
      if (call % 3 === 1) server.state.failAfter = 7;
      return server.handler(req);
    });
    for (let round = 0; round < 50 && outbox.countPending(local.read) > 0; round++) {
      await pushOnce(flaky.deps, 10);
      clock.advance(72_000);
    }
    expect(outbox.countPending(local.read)).toBe(0);
    expect(server.state.applied).toBe(30);
    expect(local.read.getFirstSync("SELECT COUNT(*) AS n FROM outbox WHERE state = 'IN_FLIGHT'")).toEqual({
      n: 0,
    });
  });

  it('TC-SYNC-022: 300 ocen w 3 paczkach po 100', async () => {
    for (let i = 0; i < 300; i++) await submit(local, `e${i}`);
    const server = fakeSyncServer();
    const { deps: d, calls } = deps(server.handler);
    const started = performance.now();
    let more = true;
    while (more) {
      const out = await pushOnce(d);
      more = out.status === 'ok' && out.more;
    }
    expect(performance.now() - started).toBeLessThan(30_000);
    expect(calls.map((c) => (c.body as { mutations: unknown[] }).mutations.length)).toEqual([100, 100, 100]);
    expect(server.state.applied).toBe(300);
  });

  it('ponowne zatwierdzenie w trakcie wysyłki dostaje baseRevision z odpowiedzi', async () => {
    const a = await submit(local, 'e1', 80);
    const server = fakeSyncServer();
    let resubmitted = false;
    const { deps: d } = deps(async (req) => {
      if (!resubmitted) {
        resubmitted = true;
        await submit(local, 'e1', 90);
      }
      return server.handler(req);
    });
    await pushOnce(d);
    expect(ScoreSheetRepo.forJudge(local.read, 'jA').byEntry('e1')).toMatchObject({
      syncState: 'PENDING',
      serverRevision: 1,
    });
    await pushOnce(d);
    expect(server.state.sheets.get(a.scoreSheetId)).toBe(2);
    expect(ScoreSheetRepo.forJudge(local.read, 'jA').byEntry('e1')).toMatchObject({
      syncState: 'SYNCED',
      serverRevision: 2,
    });
  });
});

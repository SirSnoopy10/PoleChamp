import type { LocalDb } from '../../local/LocalDb';
import { ScoreSheetRepo } from '../../local/scoreSheets';
import { network } from '../../network/online';
import { outbox } from '../../outbox/outbox';
import { tokenStore } from '../../api/tokens';
import { diagLog } from '../diagLog';
import { syncEvents, type SyncEvent } from '../events';
import { HEARTBEAT_MS } from '../heartbeat';
import { applySnapshot } from '../snapshot';
import { submitSheet } from '../submit';
import { SyncEngine, type SyncEngineDeps } from '../SyncEngine';
import { resetSyncStore, syncStore } from '../syncStore';
import {
  fakeApi,
  fakeSyncServer,
  json,
  openTestDb,
  problemResponse,
  snapshotFixture,
  testClock,
} from '../../../test-utils/sync';

const NOW = Date.parse('2026-10-26T10:00:00.000Z');

type NetListener = (s: { isConnected: boolean; isInternetReachable: boolean | null }) => void;
type AppListener = (s: string) => void;

function fakeEnv() {
  const net: NetListener[] = [];
  const app: AppListener[] = [];
  return {
    netInfo: {
      addEventListener: (l: NetListener) => {
        net.push(l);
        return () => undefined;
      },
    } as unknown as SyncEngineDeps['netInfo'],
    appState: {
      addEventListener: (_: string, l: AppListener) => {
        app.push(l);
        return { remove: () => undefined };
      },
    } as unknown as SyncEngineDeps['appState'],
    setNet: (reachable: boolean) =>
      net.forEach((l) => l({ isConnected: reachable, isInternetReachable: reachable })),
    setApp: (state: string) => app.forEach((l) => l(state)),
  };
}

describe('SyncEngine (IMP-355)', () => {
  let local: LocalDb;
  let events: SyncEvent[];
  const clock = testClock();

  beforeEach(async () => {
    local = openTestDb();
    await applySnapshot(local, snapshotFixture(), clock);
    events = [];
    syncEvents.subscribe((e) => events.push(e));
    diagLog.clear();
  });
  afterEach(() => {
    jest.useRealTimers();
    local.close();
    syncEvents.reset();
    network.reset();
    tokenStore.reset();
    resetSyncStore();
  });

  const submit = (entryId: string) =>
    submitSheet(
      local,
      {
        judgeId: 'jA',
        judgeSessionId: '0199c000-0000-7000-8000-000000000001',
        authMode: 'OFFLINE_PIN',
        categoryId: 'c1',
        entryId,
        criteria: [{ criterionId: 'k1', valueTenths: 80 }],
        penalties: [],
        comment: '',
        totalHundredths: 800,
      },
      NOW,
    );

  /** Serwer: push (atrapa z idempotencją), puste zmiany, heartbeat REST. */
  function server(overrides: Partial<Record<string, () => Response>> = {}) {
    const sync = fakeSyncServer();
    sync.state.cursor = 10;
    const fake = fakeApi((req) => {
      const path = new URL(req.url).pathname;
      const override = overrides[path];
      if (override) return override();
      if (path === '/v1/sync/push') return sync.handler(req);
      if (path === '/v1/sync/changes')
        return json({ changes: [], cursor: sync.state.cursor, hasMore: false });
      if (path === '/v1/devices/me/heartbeat') return new Response(null, { status: 204 });
      return problemResponse(404, 'NOT_FOUND');
    });
    return { ...fake, sync };
  }

  it('TC-OUTBOX-011: dwa wyzwalacze w tym samym tyku – jedno żądanie push', async () => {
    await submit('e1');
    const { api, calls } = server();
    const engine = new SyncEngine({ api, local, clock });
    const [a, b] = [engine.push(), engine.push()];
    expect(a).toBe(b);
    await Promise.all([a, b]);
    expect(calls.filter((c) => c.path === '/v1/sync/push')).toHaveLength(1);
    expect(outbox.countPending(local.read)).toBe(0);
  });

  it('wywołanie w trakcie przebiegu ustawia „jeszcze raz” bez równoległych żądań', async () => {
    let inflight = 0;
    let maxInflight = 0;
    const sync = fakeSyncServer();
    const { api, calls } = fakeApi(async (req) => {
      inflight += 1;
      maxInflight = Math.max(maxInflight, inflight);
      await new Promise((r) => setTimeout(r, 5));
      inflight -= 1;
      const path = new URL(req.url).pathname;
      return path === '/v1/sync/push' ? sync.handler(req) : json({ changes: [], cursor: 10, hasMore: false });
    });
    await submit('e1');
    const engine = new SyncEngine({ api, local, clock });
    const first = engine.push();
    await submit('e2');
    const second = engine.pullNow();
    await Promise.all([first, second]);
    expect(maxInflight).toBe(1);
    // Pull po push (kursor serwera wyprzedził lokalny) i zakolejkowany pull – kolejno, nigdy równolegle.
    expect(calls.map((c) => c.path.split('?')[0])).toEqual([
      '/v1/sync/push',
      '/v1/sync/changes',
      '/v1/sync/changes',
    ]);
    // e2 czeka na kolejny wyzwalacz (zatwierdzenie → push).
    await engine.push();
    expect(outbox.countPending(local.read)).toBe(0);
  });

  it('wyzwalacze: powrót sieci → token, push, pull; pierwszy plan → pull i push; tło zatrzymuje timer', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
    const env = fakeEnv();
    const { api, calls } = server();
    const ensureToken = jest.fn(async () => 'tok');
    const engine = new SyncEngine({
      api,
      local,
      clock,
      netInfo: env.netInfo,
      appState: env.appState,
      auth: { ensureToken, refresh: ensureToken, expiresAt: () => 0 },
    });
    await engine.start();
    await jest.advanceTimersByTimeAsync(0);
    calls.length = 0;
    ensureToken.mockClear();

    env.setNet(false);
    await submit('e1');
    env.setNet(true);
    await jest.advanceTimersByTimeAsync(0);
    expect(ensureToken).toHaveBeenCalledTimes(1);
    expect(calls.map((c) => c.path.split('?')[0])).toEqual(['/v1/sync/push', '/v1/sync/changes']);

    calls.length = 0;
    env.setApp('active');
    await jest.advanceTimersByTimeAsync(0);
    expect(calls.map((c) => c.path.split('?')[0])).toEqual(['/v1/sync/changes']);

    calls.length = 0;
    env.setApp('background');
    await jest.advanceTimersByTimeAsync(HEARTBEAT_MS * 3);
    expect(calls).toHaveLength(0);
    engine.stop();
  });

  it('TC-SYNC-024: timer 30 s – heartbeat REST z kolejką, kursorem, baterią i sędzią; push gdy brak WS', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
    const env = fakeEnv();
    const { api, calls } = server({ '/v1/sync/push': () => problemResponse(503, 'INTERNAL') });
    const engine = new SyncEngine({
      api,
      local,
      clock,
      netInfo: env.netInfo,
      appState: env.appState,
      batteryLevel: async () => 0.42,
      activeJudgeId: () => 'jA',
    });
    await engine.start();
    await jest.advanceTimersByTimeAsync(0);
    await submit('e1');
    calls.length = 0;
    clock.advance(HEARTBEAT_MS);
    await jest.advanceTimersByTimeAsync(HEARTBEAT_MS);
    expect(calls.map((c) => c.path.split('?')[0])).toEqual([
      '/v1/sync/push',
      '/v1/sync/changes',
      '/v1/devices/me/heartbeat',
    ]);
    expect(calls.at(-1)?.body).toEqual({
      pendingMutations: 1,
      lastSyncCursor: 10,
      batteryLevel: 0.42,
      activeJudgeId: 'jA',
    });
    expect(syncStore.getState()).toMatchObject({ pending: 1, entries: { e1: 'PENDING' } });
    engine.stop();
  });

  it('heartbeat przez WebSocket, gdy połączony (bez push przy pustej kolejce)', async () => {
    const emit = jest.fn();
    const { api, calls } = server();
    network.setWsConnected(true);
    const engine = new SyncEngine({
      api,
      local,
      clock,
      socket: () => ({ connected: true, emit }) as never,
      activeJudgeId: () => null,
    });
    await engine.tick();
    expect(calls).toHaveLength(0);
    expect(emit).toHaveBeenCalledWith('heartbeat', {
      pendingMutations: 0,
      lastSyncCursor: 10,
      batteryLevel: null,
      activeJudgeId: null,
    });
  });

  it('DEVICE_REVOKED: stop, koniec sesji sędziów, kolejka zachowana, stan „odłączone”', async () => {
    await local.tx((db) =>
      db.runSync(
        "INSERT INTO local_judge_session (id, judge_id, auth_mode, pin_version, started_at, last_activity_at) VALUES ('s1', 'jA', 'OFFLINE_PIN', 1, 'x', 'x')",
      ),
    );
    await tokenStore.setJudge('jt');
    await submit('e1');
    const onRevoked = jest.fn();
    const { api, calls } = server({ '/v1/sync/push': () => problemResponse(401, 'DEVICE_REVOKED') });
    const engine = new SyncEngine({ api, local, clock, onRevoked });
    await engine.push();
    expect(engine.isRevoked()).toBe(true);
    expect(onRevoked).toHaveBeenCalledTimes(1);
    expect(syncStore.getState()).toMatchObject({ revoked: true, pending: 1 });
    expect(events).toContainEqual({ type: 'judgeSessionEnded', judgeId: 'jA', reason: 'DEVICE_REVOKED' });
    expect(tokenStore.getState().judge).toBeNull();
    await engine.syncNow();
    expect(calls).toHaveLength(1);
  });

  it('powiązania realtime: blokada kategorii natychmiast, session.revoked kończy sesję sędziego', async () => {
    await local.tx((db) =>
      db.runSync(
        "INSERT INTO local_judge_session (id, judge_id, auth_mode, pin_version, started_at, last_activity_at) VALUES ('s1', 'jB', 'ONLINE_PIN', 1, 'x', 'x')",
      ),
    );
    const { api } = server();
    const engine = new SyncEngine({ api, local, clock });
    engine.lockCategory('c1');
    engine.onSessionRevoked({ judgeId: 'jB', reason: 'REPLACED' });
    await engine.pullNow();
    expect(local.read.getFirstSync("SELECT status FROM local_category WHERE id = 'c1'")).toEqual({
      status: 'LOCKED',
    });
    expect(events).toContainEqual({ type: 'categoryStatusChanged', categoryId: 'c1', status: 'LOCKED' });
    expect(events).toContainEqual({ type: 'judgeSessionEnded', judgeId: 'jB', reason: 'REPLACED' });
    expect(engine.cursor()).toBe(10);
  });

  it('logowanie online: arkusze sędziego z GET /v1/judge/me/score-sheets', async () => {
    const { api } = server({
      '/v1/judge/me/score-sheets': () =>
        json({
          items: [
            {
              scoreSheetId: '0199c000-0000-7000-8000-0000000000aa',
              categoryId: 'c1',
              entryId: 'e2',
              criteria: [{ criterionId: 'k1', value: 7 }],
              penalties: [],
              comment: '',
              revision: 2,
              total: 7,
              updatedAt: '2026-10-26T09:00:00.000Z',
            },
          ],
        }),
    });
    const engine = new SyncEngine({ api, local, clock });
    expect(await engine.fetchJudgeSheets('jA')).toBe(1);
    expect(ScoreSheetRepo.forJudge(local.read, 'jA').byEntry('e2')).toMatchObject({
      syncState: 'SYNCED',
      serverRevision: 2,
    });
  });
});

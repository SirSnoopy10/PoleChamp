// Helpery testów ekranów sędziego (EP-08): prawdziwa baza (better-sqlite3 z migracjami aplikacji),
// atrapa API (fakeApi + fakeSyncServer), runtime trybu sędziego bez WebSocketu i porządki po teście.
import { createCipheriv, hkdfSync, pbkdf2Sync, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ComponentType } from 'react';
import { renderRouter } from 'expo-router/testing-library';
import SessionLayout from '../../app/(judge)/(session)/_layout';
import CategoriesRoute from '../../app/(judge)/(session)/categories';
import CategoryRoute from '../../app/(judge)/(session)/category/[categoryId]';
import JudgeLayout from '../../app/(judge)/_layout';
import PairRoute from '../../app/(judge)/pair';
import PinRoute from '../../app/(judge)/pin/[judgeId]';
import ProfilesRoute from '../../app/(judge)/profiles';
import RevokedRoute from '../../app/(judge)/revoked';
import type { Snapshot } from '@polechamp/contracts';
import { uuidv7 } from '../data/api/uuid';
import { secureStorage, tokenStore } from '../data/api/tokens';
import { DEVICE_KEYS } from '../data/auth/deviceAuth';
import { readJudge } from '../data/judge/queries';
import { createJudgeRuntime, setJudgeRuntime, type JudgeRuntime } from '../data/judge/runtime';
import {
  resetJudgeSession,
  restoreJudgeSession,
  startJudgeSession,
  type AuthMode,
} from '../data/judge/session';
import type { LocalDb } from '../data/local/LocalDb';
import { network } from '../data/network/online';
import { diagLog } from '../data/sync/diagLog';
import { syncEvents } from '../data/sync/events';
import { applySnapshot } from '../data/sync/snapshot';
import { refreshFromDb, resetSyncStore, syncStore } from '../data/sync/syncStore';
import { pairingStore } from '../features/pairing/pairing';
import { OrientationGuard } from '../features/system/OrientationGuard';
import { syncPopover } from '../features/sync/SyncPill';
import { toast } from '../ui/Toast';
import { act, createTestQueryClient, Providers } from './render';
import { fakeApi, fakeSyncServer, json, openTestDb, snapshotFixture, testClock, type Handler } from './sync';

interface Vector {
  pinPepper: string;
  judgeId: string;
  pinVersion: number;
  pin: string;
  salt: string;
  iterations: number;
  wrapped: string;
}

/** Wektor TL-04 (PIN 8306) – sędzia z prawdziwym weryfikatorem offline. */
export const PIN_VECTOR = (
  JSON.parse(
    readFileSync(resolve(__dirname, '../../../../packages/test-fixtures/vectors/pin-wrap.json'), 'utf8'),
  ) as { vectors: Vector[] }
).vectors[0] as Vector;

export const VECTOR_JUDGE_ID = PIN_VECTOR.judgeId;

/**
 * Weryfikator TL-04 dla dowolnego PIN-u z małą liczbą iteracji (szybkie testy limitów prób):
 * AES-256-GCM(HKDF(pepper wektora), PBKDF2(pin, sól, iteracje), aad = judgeId ‖ pinVersion).
 */
export function makeVerifier(judgeId: string, pin: string, { pinVersion = 1, iterations = 1000 } = {}) {
  const salt = randomBytes(16);
  const verifier = pbkdf2Sync(pin, salt, iterations, 32, 'sha256');
  const key = Buffer.from(
    hkdfSync('sha256', Buffer.from(PIN_VECTOR.pinPepper, 'base64'), Buffer.alloc(0), 'pc-pin-v1', 32),
  );
  const aad = Buffer.alloc(Buffer.byteLength(judgeId.toLowerCase()) + 4);
  aad.write(judgeId.toLowerCase(), 0, 'utf8');
  aad.writeUInt32BE(pinVersion, aad.length - 4);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(aad);
  const body = Buffer.concat([cipher.update(verifier), cipher.final()]);
  return {
    alg: 'PBKDF2-SHA256' as const,
    iterations,
    salt: salt.toString('base64'),
    wrapped: Buffer.concat([iv, body, cipher.getAuthTag()]).toString('base64'),
  };
}

/** Migawka prototypu z sędzią „Katarzyna Nowak” (wektor PIN) w panelu c1. */
export function judgeSnapshot(over: Partial<Snapshot> = {}): Snapshot {
  const base = snapshotFixture();
  const katarzyna = {
    id: VECTOR_JUDGE_ID,
    fullName: 'Katarzyna Nowak',
    initials: 'KN',
    isActive: true,
    pinLocked: false,
    position: 1,
    pinVersion: PIN_VECTOR.pinVersion,
    pinVerifier: {
      alg: 'PBKDF2-SHA256' as const,
      iterations: PIN_VECTOR.iterations,
      salt: PIN_VECTOR.salt,
      wrapped: PIN_VECTOR.wrapped,
    },
  };
  return {
    ...base,
    judges: [katarzyna, ...base.judges.map((j) => ({ ...j, position: j.position + 1 }))],
    categories: base.categories.map((c) =>
      c.id === 'c1' ? { ...c, panelJudgeIds: [VECTOR_JUDGE_ID, ...c.panelJudgeIds] } : c,
    ),
    ...over,
  };
}

export type Routes = Record<string, ComponentType>;

/** Trasy trybu sędziego (jak `app/(judge)`). */
export const JUDGE_ROUTES: Routes = {
  '(judge)/_layout': JudgeLayout,
  '(judge)/pair': PairRoute,
  '(judge)/profiles': ProfilesRoute,
  '(judge)/revoked': RevokedRoute,
  '(judge)/pin/[judgeId]': PinRoute,
  '(judge)/(session)/_layout': SessionLayout,
  '(judge)/(session)/categories': CategoriesRoute,
  '(judge)/(session)/category/[categoryId]': CategoryRoute,
};

export interface JudgeTestEnv {
  local: LocalDb;
  rt: JudgeRuntime;
  clock: ReturnType<typeof testClock>;
  server: ReturnType<typeof fakeSyncServer>;
  calls: ReturnType<typeof fakeApi>['calls'];
  /** Nadpisanie odpowiedzi dla ścieżki (`POST /v1/judge-sessions` itd.). */
  routes: Map<string, Handler>;
}

const stubNetInfo = { addEventListener: () => () => undefined };
const stubAppState = { addEventListener: () => ({ remove: () => undefined }) };

/**
 * Środowisko trybu sędziego per test: baza z migawką, runtime z atrapą API (sync/push z idempotencją),
 * sparowany tablet (poświadczenia w SecureStore, token urządzenia). Porządki w `afterEach`.
 */
export function setupJudge({ snapshot = judgeSnapshot }: { snapshot?: () => Snapshot } = {}) {
  const env = {} as JudgeTestEnv;
  beforeEach(async () => {
    env.local = openTestDb();
    env.clock = testClock();
    env.server = fakeSyncServer();
    env.routes = new Map();
    const handler: Handler = async (req) => {
      const url = new URL(req.url);
      const key = `${req.method} ${url.pathname}`;
      const custom = env.routes.get(key);
      if (custom) return custom(req);
      switch (key) {
        case 'GET /v1/sync/snapshot':
          return json(snapshot());
        case 'GET /v1/sync/changes':
          return json({ changes: [], cursor: env.server.state.cursor, hasMore: false });
        case 'POST /v1/sync/push':
          return env.server.handler(req);
        case 'POST /v1/devices/token':
          return json({ deviceToken: 'dev-token', expiresIn: 3600 });
        case 'POST /v1/devices/me/heartbeat':
          return new Response(null, { status: 204 });
        case 'GET /v1/judge/me/score-sheets':
          return json({ items: [] });
        case 'DELETE /v1/judge-sessions/current':
          return new Response(null, { status: 204 });
        default:
          return new Response(JSON.stringify({ status: 404, code: 'NOT_FOUND' }), { status: 404 });
      }
    };
    const { api, calls } = fakeApi(handler);
    env.calls = calls;
    env.rt = createJudgeRuntime({
      local: env.local,
      api,
      clock: env.clock,
      realtime: false,
      netInfo: stubNetInfo,
      appState: stubAppState,
    });
    setJudgeRuntime(env.rt);
    syncEvents.emit(await applySnapshot(env.local, snapshot(), env.clock));
    await secureStorage.set(DEVICE_KEYS.id, 'dev-1');
    await secureStorage.set(DEVICE_KEYS.secret, 'secret-secret-secret-secret-secret');
    await secureStorage.set(DEVICE_KEYS.pinPepper, PIN_VECTOR.pinPepper);
    await secureStorage.set(DEVICE_KEYS.tournamentId, 't1');
    await tokenStore.setDevice('dev-token');
    await tokenStore.load();
    restoreJudgeSession(env.local.read, env.clock.now());
  });
  afterEach(async () => {
    setJudgeRuntime(null);
    env.local.close();
    for (const key of Object.values(DEVICE_KEYS)) await secureStorage.set(key, null);
    await tokenStore.setJudge(null);
    await tokenStore.setDevice(null);
    tokenStore.reset();
    network.reset();
    resetSyncStore();
    resetJudgeSession();
    syncEvents.reset();
    diagLog.clear();
    toast.reset();
    pairingStore.setState({ stage: 'idle' });
    syncPopover.setState({ open: false });
  });
  return env;
}

/** Zalogowanie sędziego bez ekranu PIN (sesja jak po `JudgeAuth.login`). */
export async function signIn(
  env: JudgeTestEnv,
  judgeId = VECTOR_JUDGE_ID,
  authMode: AuthMode = 'OFFLINE_PIN',
) {
  const judge = readJudge(env.local.read, judgeId);
  if (!judge) throw new Error(`Brak sędziego ${judgeId}`);
  await startJudgeSession(
    env.local,
    {
      judge: {
        id: judge.id,
        fullName: judge.fullName,
        initials: judge.initials,
        pinVersion: judge.pinVersion,
      },
      sessionId: uuidv7(env.clock.now()),
      authMode,
      enqueueStart: authMode === 'OFFLINE_PIN',
    },
    env.clock.now(),
  );
  refreshFromDb(env.local.read, judgeId);
}

/** Trasy Expo Router w trybie sędziego (tablet). */
export async function startJudge(routes: Routes, url: string, { orientation = false } = {}) {
  const client = createTestQueryClient();
  const result = await renderRouter(routes, {
    initialUrl: url,
    wrapper: ({ children }) => (
      <Providers mode="judge" queryClient={client}>
        {orientation ? <OrientationGuard>{children}</OrientationGuard> : children}
      </Providers>
    ),
  });
  await act(async () => undefined);
  return result;
}

/** Oczekiwanie na zakończenie przebiegu synchronizacji (push w tle po zatwierdzeniu). */
export async function settleSync(env: JudgeTestEnv) {
  await act(async () => {
    await env.rt.engine.whenIdle();
    await env.rt.engine.whenIdle();
  });
}

export { syncStore };

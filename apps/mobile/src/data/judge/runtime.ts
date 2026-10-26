import type { AppState } from 'react-native';
import type NetInfo from '@react-native-community/netinfo';
import { getBatteryLevelAsync } from 'expo-battery';
import { env } from '../../config/env';
import { createAppApiClient, onDeviceRevoked, type ApiClient } from '../api';
import { tokenStore } from '../api/tokens';
import { createDeviceAuth, type DeviceAuth } from '../auth/deviceAuth';
import { localDb, type LocalDb } from '../local/LocalDb';
import { bindJudgeEvents } from '../realtime/judgeBindings';
import { createRealtimeClient, type RealtimeClient } from '../realtime/socket';
import { systemClock, type SyncClock } from '../sync/clock';
import { syncEvents } from '../sync/events';
import { SyncEngine } from '../sync/SyncEngine';
import { activeJudgeId, onSessionEnded } from './session';

/** Limit czasu klienta synchronizacji – migawka FX-MAX (push ma własny limit 15 s). */
const SYNC_TIMEOUT_MS = 30_000;

/** Zależności trybu sędziego: lokalna baza, klient API, token urządzenia i silnik synchronizacji. */
export interface JudgeRuntime {
  local: LocalDb;
  api: ApiClient;
  clock: SyncClock;
  auth: DeviceAuth;
  engine: SyncEngine;
  /** Socket.IO `/rt` (EP-09: `bindJudgeEvents`); `null` w testach i przed sparowaniem. */
  connectRealtime(tournamentId: string): void;
  dispose(): void;
}

export interface JudgeRuntimeDeps {
  local: LocalDb;
  api: ApiClient;
  clock?: SyncClock;
  /** Wyłączenie WebSocket (testy – brak serwera Socket.IO). */
  realtime?: boolean;
  netInfo?: Pick<typeof NetInfo, 'addEventListener'>;
  appState?: Pick<typeof AppState, 'addEventListener'>;
}

export function createJudgeRuntime(deps: JudgeRuntimeDeps): JudgeRuntime {
  const clock = deps.clock ?? systemClock;
  let realtime: RealtimeClient | null = null;
  let unbind: (() => void) | null = null;
  const auth = createDeviceAuth({ api: deps.api, now: () => clock.now() });
  const engine = new SyncEngine({
    api: deps.api,
    local: deps.local,
    clock,
    auth,
    activeJudgeId,
    socket: () => realtime?.socket ?? null,
    batteryLevel: () => getBatteryLevelAsync(),
    netInfo: deps.netInfo,
    appState: deps.appState,
  });
  // `401 DEVICE_REVOKED` w dowolnym żądaniu (np. logowanie PIN-em) – procedura odłączenia (06-offline §7).
  const offRevoked = onDeviceRevoked(() => void engine.revoke());
  // Sesja zakończona zdalnie (`session.revoked`) lub odrzuceniem – wylogowanie na ekranach.
  const offEvents = syncEvents.subscribe((e) => {
    if (e.type === 'judgeSessionEnded') void onSessionEnded(e.judgeId, e.reason);
  });

  return {
    local: deps.local,
    api: deps.api,
    clock,
    auth,
    engine,
    connectRealtime(tournamentId) {
      if (realtime || deps.realtime === false) return;
      realtime = createRealtimeClient({
        url: env.wsUrl,
        tournamentId,
        getToken: () => tokenStore.current('judge'),
        refreshToken: async () => void (await auth.refresh()),
        onResync: () => engine.pull(),
      });
      unbind = bindJudgeEvents(realtime.socket, engine);
    },
    dispose() {
      engine.stop();
      unbind?.();
      realtime?.close();
      realtime = null;
      offRevoked();
      offEvents();
    },
  };
}

let current: JudgeRuntime | null = null;

/** Środowisko trybu sędziego tworzone leniwie przy pierwszym ekranie tabletu. */
export function judgeRuntime(): JudgeRuntime {
  current ??= createJudgeRuntime({
    local: localDb(),
    api: createAppApiClient(undefined, SYNC_TIMEOUT_MS),
  });
  return current;
}

/** Tylko testy (i wymiana po wyczyszczeniu danych tabletu). */
export function setJudgeRuntime(runtime: JudgeRuntime | null): void {
  current?.dispose();
  current = runtime;
}

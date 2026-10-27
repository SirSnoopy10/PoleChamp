import { AppState, type AppStateStatus } from 'react-native';
import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@polechamp/contracts';
import { network } from '../network/online';

/** Zdarzenia transportu spoza kontraktu domenowego: wygaśnięcie tokenu, wygaszanie instancji API (IMP-505). */
type TransportEvents = {
  'auth.expired': () => void;
  'server.restarting': (payload: { reconnectInMs?: readonly number[] }) => void;
};

export type RtSocket = Socket<ServerToClientEvents & TransportEvents, ClientToServerEvents>;
export type ServerEvent = keyof ServerToClientEvents;

/** Bez połączenia WebSocket przez 20 s → odpytywanie (IMP-216 krok 6, NFR-303). */
export const FALLBACK_AFTER_MS = 20_000;

/**
 * Backoff ponownego połączenia (IMP-505, NFR-803): pierwsza próba losowo w 0,5–5 s
 * (2 750 ms ± 82%), kolejne podwajane do 10 s – po wdrożeniu klienci nie łączą się naraz.
 */
export const RECONNECT = { delay: 2_750, randomization: 0.818, max: 10_000 } as const;

export interface RealtimeOptions {
  url: string;
  tournamentId: string;
  getToken: () => string | null;
  /** `auth.expired`: odświeżenie tokenu przed ponownym połączeniem. */
  refreshToken: () => Promise<void>;
  /** Zmiana trybu: `true` – brak WS, klient odpytuje REST / `sync/changes`. */
  onPollingChange?: (polling: boolean) => void;
  /** Powrót z tła lub ponowne połączenie – wymuszone odświeżenie danych. */
  onResync?: () => void;
  /** Wstrzykiwane w testach. */
  connect?: typeof io;
  appState?: Pick<typeof AppState, 'addEventListener'>;
}

export interface RealtimeClient {
  socket: RtSocket;
  isPolling: () => boolean;
  close: () => void;
}

/**
 * Klient Socket.IO `/rt` (IMP-216): tylko `websocket`, `auth` jako funkcja (bieżący token),
 * backoff z rozrzutem, `subscribe` po każdym połączeniu, ponowne połączenie po powrocie z tła.
 */
export function createRealtimeClient(options: RealtimeOptions): RealtimeClient {
  const connect = options.connect ?? io;
  const socket: RtSocket = connect(`${options.url}/rt`, {
    transports: ['websocket'],
    auth: (cb) => cb({ token: options.getToken() }),
    reconnectionDelay: RECONNECT.delay,
    reconnectionDelayMax: RECONNECT.max,
    randomizationFactor: RECONNECT.randomization,
  });

  let polling = false;
  let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
  const setPolling = (next: boolean) => {
    if (polling === next) return;
    polling = next;
    options.onPollingChange?.(next);
  };
  const armFallback = () => {
    if (fallbackTimer) return;
    fallbackTimer = setTimeout(() => {
      fallbackTimer = null;
      if (!socket.connected) setPolling(true);
    }, FALLBACK_AFTER_MS);
  };
  const disarmFallback = () => {
    if (fallbackTimer) clearTimeout(fallbackTimer);
    fallbackTimer = null;
  };

  armFallback();
  let connectedBefore = false;
  let backgrounded = false;
  socket.on('connect', () => {
    network.setWsConnected(true);
    disarmFallback();
    socket.emit('subscribe', { tournamentId: options.tournamentId });
    const wasPolling = polling;
    if (polling) setPolling(false);
    // Każde ponowne połączenie (wdrożenie API, zerwana sieć) i koniec odpytywania → pull /
    // unieważnienie zapytań: zdarzenia z przerwy nie przychodzą przez WS (IMP-505).
    if (connectedBefore || wasPolling) options.onResync?.();
    connectedBefore = true;
  });
  // Wygaszanie instancji API: serwer zaraz rozłączy – ponowne połączenie wg backoffu z rozrzutem.
  socket.on('server.restarting', () => network.setWsConnected(false));
  socket.on('disconnect', () => {
    network.setWsConnected(false);
    // Rozłączenie w tle jest zamierzone – bez przełączania na odpytywanie.
    if (!backgrounded) armFallback();
  });
  socket.on('connect_error', () => {
    network.setWsConnected(false);
    armFallback();
  });
  socket.on('auth.expired', () => {
    socket.disconnect();
    void options
      .refreshToken()
      .catch(() => undefined)
      .finally(() => socket.connect());
  });

  const appState = options.appState ?? AppState;
  const sub = appState.addEventListener('change', (status: AppStateStatus) => {
    // W tle bez WebSocketu (IMP-503): brak pingów co 25 s i wybudzeń radia; po powrocie resync.
    if (status === 'background') {
      backgrounded = true;
      disarmFallback();
      socket.disconnect();
      return;
    }
    if (status !== 'active') return;
    if (!socket.connected) socket.connect();
    if (backgrounded) {
      backgrounded = false;
      // `connect` po powrocie z tła zrobi resync – bez podwójnego pull.
      connectedBefore = false;
    }
    options.onResync?.();
  });

  return {
    socket,
    isPolling: () => polling,
    close() {
      disarmFallback();
      sub.remove();
      socket.removeAllListeners();
      socket.disconnect();
      network.setWsConnected(false);
    },
  };
}

/** Odpytywanie zastępcze: organizator co 15 s, tablet co 30 s (03-api §6). */
export const POLL_INTERVAL_MS = { org: 15_000, judge: 30_000 } as const;

export function startPolling(intervalMs: number, poll: () => void): () => void {
  const id = setInterval(poll, intervalMs);
  return () => clearInterval(id);
}

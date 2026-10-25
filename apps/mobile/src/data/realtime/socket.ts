import { AppState, type AppStateStatus } from 'react-native';
import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@polechamp/contracts';
import { network } from '../network/online';

export type RtSocket = Socket<ServerToClientEvents & { 'auth.expired': () => void }, ClientToServerEvents>;
export type ServerEvent = keyof ServerToClientEvents;

/** Bez połączenia WebSocket przez 20 s → odpytywanie (IMP-216 krok 6, NFR-303). */
export const FALLBACK_AFTER_MS = 20_000;

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
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10_000,
    randomizationFactor: 0.5,
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
  socket.on('connect', () => {
    network.setWsConnected(true);
    disarmFallback();
    socket.emit('subscribe', { tournamentId: options.tournamentId });
    if (polling) {
      setPolling(false);
      options.onResync?.();
    }
  });
  socket.on('disconnect', () => {
    network.setWsConnected(false);
    armFallback();
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
    if (status !== 'active') return;
    if (!socket.connected) socket.connect();
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

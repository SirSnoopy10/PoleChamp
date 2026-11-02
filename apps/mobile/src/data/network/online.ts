import { useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

/** Okno „online” po ostatnim udanym żądaniu HTTP (TL-45). */
export const HTTP_ONLINE_WINDOW_MS = 60_000;
/** Sonda HTTP bez WebSocketu – krócej niż okno, żeby bezczynny ekran nie przechodził w offline. */
export const ONLINE_PROBE_MS = 45_000;

interface NetworkState {
  wsConnected: boolean;
  lastHttpAt: number | null;
  /** System zgłosił brak łączności – do jej powrotu lub odpowiedzi serwera. */
  connectionLost: boolean;
}

const INITIAL: NetworkState = { wsConnected: false, lastHttpAt: null, connectionLost: false };
let state = INITIAL;
let online = false;
const listeners = new Set<() => void>();
let expiry: ReturnType<typeof setTimeout> | null = null;

function compute(now = Date.now()): boolean {
  if (state.connectionLost) return false;
  return state.wsConnected || (state.lastHttpAt !== null && now - state.lastHttpAt < HTTP_ONLINE_WINDOW_MS);
}

function update(patch: Partial<NetworkState>) {
  state = { ...state, ...patch };
  const next = compute();
  // Ponowna ocena po wygaśnięciu okna HTTP (bez nowych żądań stan przechodzi w offline).
  if (expiry) clearTimeout(expiry);
  if (!state.wsConnected && state.lastHttpAt !== null) {
    expiry = setTimeout(() => update({}), Math.max(0, state.lastHttpAt + HTTP_ONLINE_WINDOW_MS - Date.now()));
  }
  if (next !== online) {
    online = next;
    listeners.forEach((l) => l());
  }
}

/**
 * Stan „online” aplikacji (IMP-215, TL-45): połączony WebSocket **lub** udane żądanie HTTP < 60 s.
 * NetInfo nie potwierdza „online” (tylko wyzwala ponowną próbę), ale jego „brak łączności” wystarcza
 * do przejścia w offline.
 */
export const network = {
  isOnline: () => online,
  /** Połączony WebSocket (timer synchronizacji działa, gdy go brak – 06-offline §3.1). */
  isWsConnected: () => state.wsConnected,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  /** Odpowiedź serwera (dowolny status HTTP) – serwer osiągalny. */
  reportHttpSuccess(now = Date.now()) {
    update({ lastHttpAt: now, connectionLost: false });
  },
  /** Błąd sieci / limit czasu – bez odpowiedzi serwera. */
  reportHttpFailure() {
    update({ lastHttpAt: null });
  },
  setWsConnected(connected: boolean) {
    update({ wsConnected: connected });
  },
  /** System zgłosił brak łączności – offline od razu, bez czekania na limit czasu (UX2-10). */
  reportConnectionLost() {
    update({ lastHttpAt: null, connectionLost: true });
  },
  /**
   * Łączność wróciła. Stan gniazda zostaje prawdziwy: krótki zanik nie rozłącza WebSocketu, więc bez
   * zdarzenia `connect` – zerowanie go dawałoby fałszywe „offline” po wygaśnięciu okna HTTP.
   */
  reportConnectionBack() {
    update({ connectionLost: false });
  },
  /** Tylko testy. */
  reset() {
    if (expiry) clearTimeout(expiry);
    state = INITIAL;
    online = false;
    listeners.forEach((l) => l());
  },
};

export function useOnline(): boolean {
  return useSyncExternalStore(network.subscribe, network.isOnline, network.isOnline);
}

/** NetInfo jako wyzwalacz: odzyskanie łączności → `onReconnect` (np. zapytanie kontrolne, `pull`). */
export function useReconnectTrigger(onReconnect: () => void): void {
  useEffect(
    () =>
      NetInfo.addEventListener((s) => {
        if (s.isConnected === false) network.reportConnectionLost();
        else if (s.isConnected && s.isInternetReachable !== false) {
          const wasOffline = !network.isOnline();
          network.reportConnectionBack();
          if (wasOffline) onReconnect();
        }
      }),
    [onReconnect],
  );
}

/**
 * Sonda „online” bez WebSocketu: na ekranach bez gniazda (np. lista turniejów) stan wygasałby po 60 s
 * bezczynności i blokował zapisy. Co `ONLINE_PROBE_MS` (nie w tle) lekkie żądanie –
 * odpowiedź przedłuża okno HTTP, brak odpowiedzi zgłasza offline (middleware `reportHttp*`).
 */
export function useOnlineProbe(probe: () => Promise<unknown>, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    const tick = () => {
      if (AppState.currentState === 'background' || state.wsConnected) return;
      probe().catch(() => undefined);
    };
    const timer = setInterval(tick, ONLINE_PROBE_MS);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') tick();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [probe, enabled]);
}

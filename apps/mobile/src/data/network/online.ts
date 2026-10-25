import { useEffect, useSyncExternalStore } from 'react';
import NetInfo from '@react-native-community/netinfo';

/** Okno „online” po ostatnim udanym żądaniu HTTP (TL-45). */
export const HTTP_ONLINE_WINDOW_MS = 60_000;

interface NetworkState {
  wsConnected: boolean;
  lastHttpAt: number | null;
}

let state: NetworkState = { wsConnected: false, lastHttpAt: null };
let online = false;
const listeners = new Set<() => void>();
let expiry: ReturnType<typeof setTimeout> | null = null;

function compute(now = Date.now()): boolean {
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
 * NetInfo nie jest źródłem prawdy – tylko wyzwala ponowną próbę (`onReconnectHint`).
 */
export const network = {
  isOnline: () => online,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  /** Odpowiedź serwera (dowolny status HTTP) – serwer osiągalny. */
  reportHttpSuccess(now = Date.now()) {
    update({ lastHttpAt: now });
  },
  /** Błąd sieci / limit czasu – bez odpowiedzi serwera. */
  reportHttpFailure() {
    update({ lastHttpAt: null });
  },
  setWsConnected(connected: boolean) {
    update({ wsConnected: connected });
  },
  /** Tylko testy. */
  reset() {
    if (expiry) clearTimeout(expiry);
    state = { wsConnected: false, lastHttpAt: null };
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
        if (s.isConnected && s.isInternetReachable !== false && !network.isOnline()) onReconnect();
      }),
    [onReconnect],
  );
}

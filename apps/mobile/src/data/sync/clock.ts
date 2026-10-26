import { uuidv7 } from '../api/uuid';

/** Zegar synchronizacji (wstrzykiwany w testach). */
export interface SyncClock {
  /** Czas ścienny urządzenia (ms). */
  now(): number;
  /**
   * Licznik monotoniczny (ms) do `sync_meta.last_sync_monotonic_ms` (okno logowania offline, TL-21).
   * W JS dostępny jest licznik procesu (`performance.now()`), ważny tylko w bieżącym uruchomieniu.
   */
  monotonicMs(): number;
  /** Identyfikator uruchomienia, w którym licznik monotoniczny jest porównywalny. */
  bootId(): string;
}

/** Uruchomienie procesu aplikacji – po restarcie (aplikacji lub systemu) liczy się zegar ścienny. */
const BOOT_ID = uuidv7();

export const systemClock: SyncClock = {
  now: () => Date.now(),
  monotonicMs: () => Math.round(globalThis.performance?.now() ?? Date.now()),
  bootId: () => BOOT_ID,
};

/** Znacznik udanej synchronizacji w `sync_meta` (TL-21). */
export const syncMark = (clock: SyncClock) => ({
  lastSyncMonotonicMs: clock.monotonicMs(),
  lastSyncBootId: clock.bootId(),
  lastSyncWallMs: clock.now(),
});

/** Zegar synchronizacji (wstrzykiwany w testach). */
export interface SyncClock {
  /** Czas ścienny urządzenia (ms). */
  now(): number;
  /**
   * Licznik monotoniczny (ms) do `sync_meta.last_sync_monotonic_ms` (okno logowania offline, TL-21).
   * W JS dostępny tylko licznik procesu (`performance.now()`); zegar od uruchomienia systemu – EP-08.
   */
  monotonicMs(): number;
}

export const systemClock: SyncClock = {
  now: () => Date.now(),
  monotonicMs: () => Math.round(globalThis.performance?.now() ?? Date.now()),
};

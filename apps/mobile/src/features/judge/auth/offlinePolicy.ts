import type { LocalJudge, LocalTournament } from '../../../data/judge/queries';
import type { SyncClock } from '../../../data/sync/clock';
import type { SyncMeta } from '../../../data/sync/meta';

/** Okno logowania offline od ostatniej synchronizacji (FR-510, ADR-005). */
export const OFFLINE_WINDOW_MS = 24 * 3600_000;
/** Seria błędnych PIN-ów przed blokadą czasową (FR-509). */
export const ATTEMPTS_PER_SERIES = 5;
const BASE_LOCK_S = 30;
const MAX_LOCK_S = 15 * 60;

/** Blokada po `level`-tej serii: 30, 60, 120, 240, 480, 900 s (TC-STATE-004). */
export const lockSeconds = (level: number) => Math.min(MAX_LOCK_S, BASE_LOCK_S * 2 ** Math.max(0, level - 1));

/**
 * Czas od ostatniej udanej synchronizacji (TL-21): w tym samym uruchomieniu licznik monotoniczny
 * (odporny na przestawienie zegara), po restarcie zegar ścienny; cofnięcie zegara poniżej czasu
 * synchronizacji = przekroczenie okna (`Infinity`).
 */
export function elapsedSinceSync(
  meta: Pick<SyncMeta, 'lastSyncBootId' | 'lastSyncMonotonicMs' | 'lastSyncWallMs'>,
  clock: SyncClock,
): number {
  if (meta.lastSyncWallMs === null) return Infinity;
  if (meta.lastSyncBootId === clock.bootId() && meta.lastSyncMonotonicMs !== null) {
    const elapsed = clock.monotonicMs() - meta.lastSyncMonotonicMs;
    return elapsed < 0 ? Infinity : elapsed;
  }
  const now = clock.now();
  return now < meta.lastSyncWallMs ? Infinity : now - meta.lastSyncWallMs;
}

export type OfflineDecision =
  | { kind: 'allowed' }
  | { kind: 'needsOnline' }
  | { kind: 'lockedReset' }
  | { kind: 'locked'; seconds: number };

/**
 * Warunki logowania offline (TC-STATE-005): zgoda organizatora, okno 24 h, brak blokady PIN-u
 * (serwer: do resetu; lokalnie: czasowa) i weryfikator w bazie. Zgodność `pinVersion` sprawdza
 * odszyfrowanie weryfikatora (`aad` z wersją – TL-04).
 */
export function offlineDecision(
  tournament: LocalTournament | null,
  judge: LocalJudge,
  meta: Pick<SyncMeta, 'lastSyncBootId' | 'lastSyncMonotonicMs' | 'lastSyncWallMs'>,
  clock: SyncClock,
): OfflineDecision {
  if (judge.pinLocked) return { kind: 'lockedReset' };
  if (judge.lockedUntil) {
    const left = Date.parse(judge.lockedUntil) - clock.now();
    if (left > 0) return { kind: 'locked', seconds: Math.ceil(left / 1000) };
  }
  if (!tournament?.allowOfflinePinLogin) return { kind: 'needsOnline' };
  if (!judge.wrappedVerifier || !judge.pinOfflineSalt || !judge.pinIterations) return { kind: 'needsOnline' };
  if (elapsedSinceSync(meta, clock) >= OFFLINE_WINDOW_MS) return { kind: 'needsOnline' };
  return { kind: 'allowed' };
}

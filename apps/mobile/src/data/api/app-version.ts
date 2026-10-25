import * as Application from 'expo-application';

/** Porównanie wersji `x.y.z` (brakujące człony = 0). Wynik < 0, gdy `a` jest starsza. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => Number.parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => Number.parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

export const appVersion = (): string => Application.nativeApplicationVersion ?? '0.0.0';
export const appBuild = (): string => Application.nativeBuildVersion ?? '0';

export interface UpdateState {
  /** Wersja aplikacji niższa niż `minAppVersion` (NFR-706). */
  updateRequired: boolean;
  /** Wersja niższa niż `minSyncAppVersion` – outbox tabletu zatrzymany (IMP-217). */
  syncBlocked: boolean;
  minAppVersion: string | null;
  minSyncAppVersion: string | null;
}

let state: UpdateState = {
  updateRequired: false,
  syncBlocked: false,
  minAppVersion: null,
  minSyncAppVersion: null,
};
const listeners = new Set<() => void>();

/** Sygnał „wymagana aktualizacja” z nagłówka `X-Min-App-Version` i `GET /v1/app-config`. */
export const updateSignal = {
  getState: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  report(
    versions: { minAppVersion?: string | null; minSyncAppVersion?: string | null },
    current = appVersion(),
  ) {
    const minAppVersion = versions.minAppVersion ?? state.minAppVersion;
    const minSyncAppVersion = versions.minSyncAppVersion ?? state.minSyncAppVersion;
    const next: UpdateState = {
      minAppVersion,
      minSyncAppVersion,
      updateRequired: !!minAppVersion && compareVersions(current, minAppVersion) < 0,
      syncBlocked: !!minSyncAppVersion && compareVersions(current, minSyncAppVersion) < 0,
    };
    if (JSON.stringify(next) === JSON.stringify(state)) return;
    state = next;
    listeners.forEach((l) => l());
  },
  /** Tylko testy. */
  reset() {
    state = { updateRequired: false, syncBlocked: false, minAppVersion: null, minSyncAppVersion: null };
    listeners.forEach((l) => l());
  },
};

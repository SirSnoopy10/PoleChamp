import { onlineManager, QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import type { Persister } from '@tanstack/react-query-persist-client';
import type { MMKV } from 'react-native-mmkv';
import { storage, StorageKey } from '../../storage/mmkv';
import { ApiError } from '../api/errors';
import { network } from '../network/online';

export const STALE_TIME_MS = 30_000;
export const GC_TIME_MS = 24 * 60 * 60 * 1000;

/** 2 ponowienia poza błędami 4xx (błąd klienta nie zniknie po powtórzeniu). */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
  return failureCount < 2;
}

/**
 * QueryClient organizatora (IMP-215): `staleTime` 30 s, `gcTime` 24 h. `networkMode: 'always'` – stan
 * „online” (TL-45) wynika z odpowiedzi HTTP, więc żądania nie mogą czekać na „online” (zakleszczenie
 * przy zimnym starcie); brak sieci kończy się błędem `NETWORK`, a ekrany pokazują cache z banerem.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: STALE_TIME_MS, gcTime: GC_TIME_MS, retry: shouldRetry, networkMode: 'always' },
      // Zapisy nie są ponawiane automatycznie – organizator widzi błąd i decyduje (FR-807).
      mutations: { retry: false, networkMode: 'always' },
    },
  });
}

/** Persystencja cache w MMKV 4 – ekrany organizatora pokazują ostatnie dane bez sieci. */
export function createMmkvPersister(mmkv: MMKV = storage): Persister {
  return createAsyncStoragePersister({
    key: StorageKey.queryCache,
    throttleTime: 1000,
    storage: {
      getItem: (key) => mmkv.getString(key) ?? null,
      setItem: (key, value) => mmkv.set(key, value),
      removeItem: (key) => void mmkv.remove(key),
    },
  });
}

/** TanStack Query „online” = definicja aplikacji (TL-45), nie NetInfo. */
export function bindOnlineManager(): () => void {
  onlineManager.setOnline(network.isOnline());
  return network.subscribe(() => onlineManager.setOnline(network.isOnline()));
}

/** Wylogowanie i usunięcie konta: cache w pamięci i w MMKV (IMP-215 krok 6). */
export async function clearQueryCache(client: QueryClient, persister: Persister): Promise<void> {
  client.clear();
  await persister.removeClient();
}

export const queryClient = createQueryClient();
export const queryPersister = createMmkvPersister();

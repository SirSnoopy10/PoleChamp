/**
 * Test kompilacji klienta API (IMP-067 krok 4) – sprawdzany przez `pnpm typecheck`, nie uruchamiany.
 * Zmiana kontraktu w `@polechamp/contracts` bez regeneracji `api-types` łamie te wywołania.
 */
import type { ApiClient } from './client';
import type { ApiBody, ApiResponse } from './types';

export async function contractCheck(client: ApiClient) {
  const list = await client.GET('/v1/tournaments');
  const tournaments: ApiResponse<'/v1/tournaments', 'get'> | undefined = list.data;

  const body: ApiBody<'/v1/sync/push', 'post'> = { deviceTime: new Date().toISOString(), mutations: [] };
  const pushed = await client.POST('/v1/sync/push', { body });
  const results: ApiResponse<'/v1/sync/push', 'post'>['results'] | undefined = pushed.data?.results;

  // @ts-expect-error – nieistniejąca ścieżka
  await client.GET('/v1/nie-ma-takiej');
  // @ts-expect-error – zła treść żądania
  await client.POST('/v1/sync/push', { body: { mutations: 'x' } });

  return { tournaments, results };
}

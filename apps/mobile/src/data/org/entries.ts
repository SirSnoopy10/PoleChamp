import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { EntryCreate, EntryRow } from '@polechamp/contracts';
import { api, unwrap, type ApiError } from '../api';
import { queryKeys } from '../query/keys';
import { ifMatch, refreshOnConflict } from './tournament';

/** `GET /v1/categories/{id}/entries?q=` – lista startowa (IMP-265). */
export function useEntries(categoryId: string, q = '') {
  return useQuery<EntryRow[], ApiError>({
    queryKey: queryKeys.entries(categoryId, q),
    queryFn: async () =>
      (
        await unwrap(
          api.GET('/v1/categories/{categoryId}/entries', {
            params: { path: { categoryId }, query: q ? { q } : {} },
          }),
        )
      ).items,
    placeholderData: keepPreviousData,
  });
}

/**
 * Najmniejszy wolny numer większy od maks. w kategorii (TC-STATE-015), z pominięciem numerów zajętych
 * w turnieju, o ile są znane (`taken`). Konflikt z nieznanym numerem zgłosi API (`START_NUMBER_TAKEN`).
 */
export function suggestStartNumber(
  entries: readonly Pick<EntryRow, 'startNumber'>[],
  taken: ReadonlySet<number> = new Set(),
): number {
  let n = entries.reduce((m, e) => Math.max(m, e.startNumber), 0) + 1;
  while (taken.has(n) && n < 9999) n++;
  return Math.min(9999, n);
}

/** Wycofane na końcu, w grupie kolejność startowa (SCR-ORG-07). */
export function orderEntries<T extends Pick<EntryRow, 'status' | 'startOrder'>>(entries: readonly T[]): T[] {
  return [...entries].sort(
    (a, b) =>
      Number(a.status === 'WITHDRAWN') - Number(b.status === 'WITHDRAWN') || a.startOrder - b.startOrder,
  );
}

export type EntryPatchBody = Partial<EntryCreate>;

type EntryActionPath =
  '/v1/entries/{entryId}/withdraw' | '/v1/entries/{entryId}/restore' | '/v1/entries/{entryId}/anonymize';

/** Wycofanie, przywrócenie, „Usuń dane osobowe” (IMP-267). */
function useEntryAction(path: EntryActionPath, refresh: () => Promise<unknown>) {
  return useMutation<unknown, ApiError, string>({
    mutationFn: async (entryId) => {
      await unwrap(api.POST(path, { params: { path: { entryId } } }));
      await refresh();
    },
  });
}

/** Mutacje zawodniczek (IMP-266, IMP-267) – każda odświeża listę, wyniki i kategorię. */
export function useEntryMutations(categoryId: string) {
  const queryClient = useQueryClient();
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['entries', categoryId] }),
      queryClient.invalidateQueries({ queryKey: queryKeys.results(categoryId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.category(categoryId) }),
    ]);
  return {
    create: useMutation<EntryRow, ApiError, { body: EntryCreate; idempotencyKey: string }>({
      mutationFn: async ({ body, idempotencyKey }) => {
        const row = await unwrap(
          api.POST('/v1/categories/{categoryId}/entries', {
            params: { path: { categoryId } },
            body,
            headers: { 'Idempotency-Key': idempotencyKey },
          }),
        );
        await refresh();
        return row;
      },
    }),
    update: useMutation<unknown, ApiError, { entryId: string; version: number; body: EntryPatchBody }>({
      mutationFn: async ({ entryId, version, body }) => {
        await unwrap(
          api.PATCH('/v1/entries/{entryId}', {
            params: { path: { entryId }, header: ifMatch(version) },
            body,
          }),
        );
        await refresh();
      },
      onError: (e) => refreshOnConflict(queryClient, e, ['entries', categoryId]),
    }),
    withdraw: useEntryAction('/v1/entries/{entryId}/withdraw', refresh),
    restore: useEntryAction('/v1/entries/{entryId}/restore', refresh),
    anonymize: useEntryAction('/v1/entries/{entryId}/anonymize', refresh),
    remove: useMutation<unknown, ApiError, string>({
      mutationFn: async (entryId) => {
        await unwrap(api.DELETE('/v1/entries/{entryId}', { params: { path: { entryId } } }));
        await refresh();
      },
    }),
  };
}

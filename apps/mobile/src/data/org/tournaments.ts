import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { TournamentCreate, TournamentListItem } from '@polechamp/contracts';
import { api, unwrap, type ApiError } from '../api';
import { queryKeys } from '../query/keys';

export type TournamentStatus = TournamentListItem['status'];
export type TournamentListStatus = 'active' | 'finished';

/** Status API → wariant pigułki (09-design-system §4.4). */
export const STATUS_PILL = { DRAFT: 'draft', IN_PROGRESS: 'live', FINISHED: 'done' } as const;

const STATUS_ORDER: Record<TournamentStatus, number> = { IN_PROGRESS: 0, DRAFT: 1, FINISHED: 2 };

/** Aktywne: Trwa → W przygotowaniu, w grupie data rosnąco, brak daty na końcu (TC-STATE-012). */
export function sortActive<T extends Pick<TournamentListItem, 'status' | 'startDate' | 'name'>>(
  items: readonly T[],
): T[] {
  return [...items].sort(
    (a, b) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      (a.startDate ?? '￿').localeCompare(b.startDate ?? '￿') ||
      a.name.localeCompare(b.name, 'pl'),
  );
}

/** Zakończone: data malejąco, brak daty na końcu (TC-STATE-012). */
export function sortFinished<T extends Pick<TournamentListItem, 'startDate' | 'name'>>(
  items: readonly T[],
): T[] {
  return [...items].sort(
    (a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? '') || a.name.localeCompare(b.name, 'pl'),
  );
}

/** Grupy listy SCR-ORG-01: sekcja „Zakończone” tylko gdy niepusta (`finished === null`). */
export function groupTournaments(
  active: readonly TournamentListItem[],
  finished: readonly TournamentListItem[],
) {
  return { active: sortActive(active), finished: finished.length ? sortFinished(finished) : null };
}

/** `GET /v1/tournaments?status=` – opcje zapytania wspólne dla listy i splashu (prefetch, IMP-254). */
export const tournamentsQuery = (status: TournamentListStatus) =>
  queryOptions<TournamentListItem[], ApiError>({
    queryKey: queryKeys.tournaments(status),
    queryFn: async () => (await unwrap(api.GET('/v1/tournaments', { params: { query: { status } } }))).items,
  });

/** Lista turniejów SCR-ORG-01 (IMP-255). */
export function useTournaments(status: TournamentListStatus) {
  return useQuery(tournamentsQuery(status));
}

/**
 * `POST /v1/tournaments` (IMP-256). `idempotencyKey` powstaje przy otwarciu arkusza i zostaje przy
 * ponowieniu po błędzie sieci – serwer nie utworzy drugiego turnieju (TC-EDGE-031).
 */
export function useCreateTournament() {
  const queryClient = useQueryClient();
  return useMutation<{ id: string }, ApiError, { body: TournamentCreate; idempotencyKey: string }>({
    mutationFn: async ({ body, idempotencyKey }) => {
      const created = await unwrap(
        api.POST('/v1/tournaments', { body, headers: { 'Idempotency-Key': idempotencyKey } }),
      );
      await queryClient.invalidateQueries({ queryKey: queryKeys.tournaments('active') });
      return created;
    },
  });
}

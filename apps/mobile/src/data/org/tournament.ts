import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { DeviceRow, TournamentDetails } from '@polechamp/contracts';
import { api, unwrap, type ApiError } from '../api';
import { queryKeys } from '../query/keys';

/** Nagłówek `If-Match: W/"<version>"` (03-api – współbieżność). */
export const ifMatch = (version: number) => ({ 'If-Match': `W/"${version}"` });

/** `409 CONFLICT_VERSION` → świeże dane w cache (toast błędu pokazuje ekran). */
export function refreshOnConflict(
  queryClient: QueryClient,
  error: ApiError,
  ...keys: (readonly unknown[])[]
) {
  if (error.code !== 'CONFLICT_VERSION') return;
  for (const queryKey of keys) void queryClient.invalidateQueries({ queryKey });
}

/** `GET /v1/tournaments/{id}` – szczegóły z wersją do `If-Match` (IMP-257). */
export function useTournament(id: string, enabled = true) {
  return useQuery<TournamentDetails, ApiError>({
    queryKey: queryKeys.tournament(id),
    enabled,
    queryFn: () =>
      unwrap(api.GET('/v1/tournaments/{tournamentId}', { params: { path: { tournamentId: id } } })),
  });
}

/** `GET /v1/tournaments/{id}/devices` – tablety turnieju (SCR-ORG-04 TL-48, SCR-ORG-14). */
export function useDevices(tournamentId: string, enabled = true) {
  return useQuery<DeviceRow[], ApiError>({
    queryKey: queryKeys.devices(tournamentId),
    queryFn: async () =>
      (
        await unwrap(
          api.GET('/v1/tournaments/{tournamentId}/devices', { params: { path: { tournamentId } } }),
        )
      ).items,
    enabled,
  });
}

function useInvalidateTournament(id: string) {
  const queryClient = useQueryClient();
  return {
    queryClient,
    invalidate: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.tournament(id) }),
        queryClient.invalidateQueries({ queryKey: ['tournaments'] }),
      ]);
    },
  };
}

/** `POST /v1/tournaments/{id}/start` (IMP-257). */
export function useStartTournament(id: string) {
  const { invalidate } = useInvalidateTournament(id);
  return useMutation<unknown, ApiError>({
    mutationFn: async () => {
      await unwrap(
        api.POST('/v1/tournaments/{tournamentId}/start', { params: { path: { tournamentId: id } } }),
      );
      await invalidate();
    },
  });
}

/** `POST /v1/tournaments/{id}/finish` z `If-Match` (IMP-258). */
export function useFinishTournament(id: string) {
  const { queryClient, invalidate } = useInvalidateTournament(id);
  return useMutation<unknown, ApiError, { version: number }>({
    mutationFn: async ({ version }) => {
      await unwrap(
        api.POST('/v1/tournaments/{tournamentId}/finish', {
          params: { path: { tournamentId: id }, header: ifMatch(version) },
        }),
      );
      await invalidate();
    },
    onError: (e) => refreshOnConflict(queryClient, e, queryKeys.tournament(id)),
  });
}

export interface TournamentPatchBody {
  name?: string;
  startDate?: string | null;
  endDate?: string | null;
  venue?: string | null;
}

/** `PATCH /v1/tournaments/{id}` z `If-Match` (IMP-259). */
export function useUpdateTournament(id: string) {
  const { queryClient, invalidate } = useInvalidateTournament(id);
  return useMutation<unknown, ApiError, { body: TournamentPatchBody; version: number }>({
    mutationFn: async ({ body, version }) => {
      await unwrap(
        api.PATCH('/v1/tournaments/{tournamentId}', {
          params: { path: { tournamentId: id }, header: ifMatch(version) },
          body,
        }),
      );
      await invalidate();
    },
    onError: (e) => refreshOnConflict(queryClient, e, queryKeys.tournament(id)),
  });
}

/** `DELETE /v1/tournaments/{id}` z `If-Match` (IMP-259): turniej znika z cache. */
export function useDeleteTournament(id: string) {
  const queryClient = useQueryClient();
  return useMutation<unknown, ApiError, { version: number }>({
    mutationFn: async ({ version }) => {
      await unwrap(
        api.DELETE('/v1/tournaments/{tournamentId}', {
          params: { path: { tournamentId: id }, header: ifMatch(version) },
        }),
      );
      queryClient.removeQueries({ queryKey: queryKeys.tournament(id) });
      await queryClient.invalidateQueries({ queryKey: ['tournaments'] });
    },
    onError: (e) => refreshOnConflict(queryClient, e, queryKeys.tournament(id)),
  });
}

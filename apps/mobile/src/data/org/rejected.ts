import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { RejectedSubmission } from '@polechamp/contracts';
import { api, unwrap, type ApiError } from '../api';
import { queryKeys } from '../query/keys';

/** `GET /v1/tournaments/{id}/rejected-submissions?resolution=PENDING` (IMP-272). */
export function useRejected(tournamentId: string, enabled = true) {
  return useQuery<RejectedSubmission[], ApiError>({
    queryKey: queryKeys.rejected(tournamentId),
    queryFn: async () =>
      (
        await unwrap(
          api.GET('/v1/tournaments/{tournamentId}/rejected-submissions', {
            params: { path: { tournamentId }, query: { resolution: 'PENDING' } },
          }),
        )
      ).items,
    enabled,
  });
}

/** Przyjęcie / odrzucenie odrzuconej oceny – odświeża listę, turniej, kategorię i ranking. */
export function useResolveRejected(tournamentId: string) {
  const queryClient = useQueryClient();
  const refresh = (categoryId: string) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.rejected(tournamentId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.tournament(tournamentId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.category(categoryId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.results(categoryId) }),
    ]);
  return {
    accept: useMutation<RejectedSubmission, ApiError, RejectedSubmission>({
      mutationFn: async (item) => {
        const result = await unwrap(
          api.POST('/v1/rejected-submissions/{rejectedId}/accept', {
            params: { path: { rejectedId: item.id } },
          }),
        );
        await refresh(item.category.id);
        return result;
      },
    }),
    discard: useMutation<unknown, ApiError, RejectedSubmission>({
      mutationFn: async (item) => {
        await unwrap(
          api.POST('/v1/rejected-submissions/{rejectedId}/discard', {
            params: { path: { rejectedId: item.id } },
          }),
        );
        await refresh(item.category.id);
      },
    }),
  };
}

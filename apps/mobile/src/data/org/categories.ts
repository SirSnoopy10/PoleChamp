import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CategoryCreate, CategoryDetails } from '@polechamp/contracts';
import { api, unwrap, type ApiError } from '../api';
import { queryKeys } from '../query/keys';
import { ifMatch, refreshOnConflict } from './tournament';

export type CategoryPatchBody = Partial<CategoryCreate>;

/** `GET /v1/categories/{id}` – kategoria z kryteriami, karami i wersją (IMP-261). */
export function useCategory(id: string) {
  return useQuery<CategoryDetails, ApiError>({
    queryKey: queryKeys.category(id),
    queryFn: () => unwrap(api.GET('/v1/categories/{categoryId}', { params: { path: { categoryId: id } } })),
  });
}

/** `POST /v1/tournaments/{id}/categories` (IMP-260) – kryteria i kary z szablonu stylu. */
export function useCreateCategory(tournamentId: string) {
  const queryClient = useQueryClient();
  return useMutation<CategoryDetails, ApiError, { body: CategoryCreate; idempotencyKey: string }>({
    mutationFn: async ({ body, idempotencyKey }) => {
      const created = await unwrap(
        api.POST('/v1/tournaments/{tournamentId}/categories', {
          params: { path: { tournamentId } },
          body,
          headers: { 'Idempotency-Key': idempotencyKey },
        }),
      );
      queryClient.setQueryData(queryKeys.category(created.id), created);
      await queryClient.invalidateQueries({ queryKey: queryKeys.tournament(tournamentId) });
      return created;
    },
  });
}

/** `PATCH /v1/categories/{id}` z `If-Match` (IMP-260) – tylko zmienione pola. */
export function useUpdateCategory(category: Pick<CategoryDetails, 'id' | 'tournamentId'>) {
  const queryClient = useQueryClient();
  return useMutation<CategoryDetails, ApiError, { body: CategoryPatchBody; version: number }>({
    mutationFn: async ({ body, version }) => {
      const updated = await unwrap(
        api.PATCH('/v1/categories/{categoryId}', {
          params: { path: { categoryId: category.id }, header: ifMatch(version) },
          body,
        }),
      );
      queryClient.setQueryData(queryKeys.category(category.id), updated);
      await queryClient.invalidateQueries({ queryKey: queryKeys.tournament(category.tournamentId) });
      return updated;
    },
    onError: (e) => refreshOnConflict(queryClient, e, queryKeys.category(category.id)),
  });
}

/** `DELETE /v1/categories/{id}` z `If-Match` (IMP-260). */
export function useDeleteCategory(category: Pick<CategoryDetails, 'id' | 'tournamentId'>) {
  const queryClient = useQueryClient();
  return useMutation<unknown, ApiError, { version: number }>({
    mutationFn: async ({ version }) => {
      await unwrap(
        api.DELETE('/v1/categories/{categoryId}', {
          params: { path: { categoryId: category.id }, header: ifMatch(version) },
        }),
      );
      queryClient.removeQueries({ queryKey: queryKeys.category(category.id) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.tournament(category.tournamentId) });
    },
    onError: (e) => refreshOnConflict(queryClient, e, queryKeys.category(category.id)),
  });
}

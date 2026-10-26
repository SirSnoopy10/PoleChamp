import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CategoryCreate, CategoryDetails, CriterionInput, PenaltyTypeInput } from '@polechamp/contracts';
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

function useCategoryInvalidation(category: Pick<CategoryDetails, 'id' | 'tournamentId'>) {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.category(category.id) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.results(category.id) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.tournament(category.tournamentId) }),
    ]);
  };
}

/** `POST /v1/categories/{id}/start` (IMP-261) – warunki FR-308 w `START_REQUIREMENTS_NOT_MET.detail`. */
export function useStartCategory(category: Pick<CategoryDetails, 'id' | 'tournamentId'>) {
  const invalidate = useCategoryInvalidation(category);
  return useMutation<unknown, ApiError>({
    mutationFn: async () => {
      await unwrap(
        api.POST('/v1/categories/{categoryId}/start', { params: { path: { categoryId: category.id } } }),
      );
      await invalidate();
    },
  });
}

/** `POST /v1/categories/{id}/lock` (IMP-261, IMP-271): `409 LOCK_WARNINGS` → arkusz SCR-ORG-18. */
export function useLockCategory(category: Pick<CategoryDetails, 'id' | 'tournamentId'>) {
  const invalidate = useCategoryInvalidation(category);
  return useMutation<unknown, ApiError, { force: boolean }>({
    mutationFn: async ({ force }) => {
      await unwrap(
        api.POST('/v1/categories/{categoryId}/lock', {
          params: { path: { categoryId: category.id } },
          body: { force },
        }),
      );
      await invalidate();
    },
  });
}

/** `POST /v1/categories/{id}/unlock` (IMP-261). */
export function useUnlockCategory(category: Pick<CategoryDetails, 'id' | 'tournamentId'>) {
  const invalidate = useCategoryInvalidation(category);
  return useMutation<unknown, ApiError>({
    mutationFn: async () => {
      await unwrap(
        api.POST('/v1/categories/{categoryId}/unlock', {
          params: { path: { categoryId: category.id } },
          body: {},
        }),
      );
      await invalidate();
    },
  });
}

export type CriterionBody = CriterionInput;
export type PenaltyBody = PenaltyTypeInput;

/** Kryteria i kary (IMP-263, IMP-264): każda zmiana odświeża `['category', id]`. */
export function useCriteriaMutations(categoryId: string) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.category(categoryId) });
  return {
    createCriterion: useMutation<unknown, ApiError, CriterionBody>({
      mutationFn: async (body) => {
        await unwrap(
          api.POST('/v1/categories/{categoryId}/criteria', { params: { path: { categoryId } }, body }),
        );
        await refresh();
      },
    }),
    updateCriterion: useMutation<unknown, ApiError, { id: string; body: Partial<CriterionBody> }>({
      mutationFn: async ({ id, body }) => {
        await unwrap(
          api.PATCH('/v1/criteria/{criterionId}', { params: { path: { criterionId: id } }, body }),
        );
        await refresh();
      },
    }),
    deleteCriterion: useMutation<unknown, ApiError, string>({
      mutationFn: async (id) => {
        await unwrap(api.DELETE('/v1/criteria/{criterionId}', { params: { path: { criterionId: id } } }));
        await refresh();
      },
    }),
    createPenalty: useMutation<unknown, ApiError, PenaltyBody>({
      mutationFn: async (body) => {
        await unwrap(
          api.POST('/v1/categories/{categoryId}/penalty-types', { params: { path: { categoryId } }, body }),
        );
        await refresh();
      },
    }),
    updatePenalty: useMutation<unknown, ApiError, { id: string; body: Partial<PenaltyBody> }>({
      mutationFn: async ({ id, body }) => {
        await unwrap(
          api.PATCH('/v1/penalty-types/{penaltyTypeId}', { params: { path: { penaltyTypeId: id } }, body }),
        );
        await refresh();
      },
    }),
    deletePenalty: useMutation<unknown, ApiError, string>({
      mutationFn: async (id) => {
        await unwrap(
          api.DELETE('/v1/penalty-types/{penaltyTypeId}', { params: { path: { penaltyTypeId: id } } }),
        );
        await refresh();
      },
    }),
  };
}

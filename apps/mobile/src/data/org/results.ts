import { useQuery } from '@tanstack/react-query';
import type { ResultsResponse } from '@polechamp/contracts';
import { api, unwrap, type ApiError } from '../api';
import { queryKeys } from '../query/keys';

export type CategoryResults = ResultsResponse;

/** `GET /v1/categories/{id}/results` – ranking na żywo (IMP-268); `results.updated` unieważnia klucz. */
export function useResults(categoryId: string, enabled = true) {
  return useQuery<CategoryResults, ApiError>({
    queryKey: queryKeys.results(categoryId),
    queryFn: () =>
      unwrap(api.GET('/v1/categories/{categoryId}/results', { params: { path: { categoryId } } })),
    enabled,
  });
}

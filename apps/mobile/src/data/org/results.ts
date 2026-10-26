import { useQuery } from '@tanstack/react-query';
import type { ResultsResponse } from '@polechamp/contracts';
import type { EntryScoreSheets, ScoreSheetRevision, TournamentResults } from './types';
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

/** `GET /v1/tournaments/{id}/results` – podgląd PDF zakresu turniej (IMP-270). */
export function useTournamentResults(tournamentId: string, enabled = true) {
  return useQuery<TournamentResults, ApiError>({
    queryKey: ['tournamentResults', tournamentId],
    queryFn: () =>
      unwrap(api.GET('/v1/tournaments/{tournamentId}/results', { params: { path: { tournamentId } } })),
    enabled,
  });
}

/** `GET /v1/entries/{id}/score-sheets` – oceny zawodniczki (SCR-ORG-19, IMP-269). */
export function useEntryScoreSheets(entryId: string | null) {
  return useQuery<EntryScoreSheets, ApiError>({
    queryKey: queryKeys.scoreSheets(entryId ?? ''),
    queryFn: () =>
      unwrap(api.GET('/v1/entries/{entryId}/score-sheets', { params: { path: { entryId: entryId ?? '' } } })),
    enabled: !!entryId,
  });
}

/** `GET /v1/score-sheets/{id}/revisions` – historia zmian, ładowana przy rozwinięciu (IMP-269). */
export function useRevisions(scoreSheetId: string, enabled: boolean) {
  return useQuery<ScoreSheetRevision[], ApiError>({
    queryKey: ['revisions', scoreSheetId],
    queryFn: async () =>
      (
        await unwrap(
          api.GET('/v1/score-sheets/{scoreSheetId}/revisions', { params: { path: { scoreSheetId } } }),
        )
      ).items,
    enabled,
  });
}

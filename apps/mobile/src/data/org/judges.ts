import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { JudgeRow } from '@polechamp/contracts';
import { api, unwrap, type ApiError } from '../api';
import { queryKeys } from '../query/keys';
import { ifMatch, refreshOnConflict } from './tournament';

/** Odpowiedź z jednorazowym PIN-em – trzymana tylko w stanie arkusza (bez cache, bez logów). */
export interface JudgeWithPin {
  id: string;
  fullName: string;
  pin: string;
}

/** `GET /v1/tournaments/{id}/judges` (IMP-273). */
export function useJudges(tournamentId: string) {
  return useQuery<JudgeRow[], ApiError>({
    queryKey: queryKeys.judges(tournamentId),
    queryFn: async () =>
      (await unwrap(api.GET('/v1/tournaments/{tournamentId}/judges', { params: { path: { tournamentId } } })))
        .items,
  });
}

/** Mutacje sędziów (IMP-274): po każdej `['judges', id]` i `['tournament', id]` (kafel „Sędziowie”). */
export function useJudgeMutations(tournamentId: string) {
  const queryClient = useQueryClient();
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.judges(tournamentId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.tournament(tournamentId) }),
    ]);
  const pinOf = (r: { id: string; fullName: string; pin: string }): JudgeWithPin => ({
    id: r.id,
    fullName: r.fullName,
    pin: r.pin,
  });
  return {
    // Dodanie i reset PIN-u bez `useMutation` – wynik z PIN-em nie trafia do MutationCache (IMP-274 krok 3).
    async create(fullName: string, idempotencyKey: string): Promise<JudgeWithPin> {
      const created = await unwrap(
        api.POST('/v1/tournaments/{tournamentId}/judges', {
          params: { path: { tournamentId } },
          body: { fullName },
          headers: { 'Idempotency-Key': idempotencyKey },
        }),
      );
      await refresh();
      return pinOf(created);
    },
    async resetPin(judge: JudgeRow): Promise<JudgeWithPin> {
      const reset = await unwrap(
        api.POST('/v1/judges/{judgeId}/pin/reset', { params: { path: { judgeId: judge.id } } }),
      );
      await refresh();
      return pinOf(reset);
    },
    update: useMutation<
      unknown,
      ApiError,
      { judge: JudgeRow; body: { fullName?: string; initials?: string; isActive?: boolean } }
    >({
      mutationFn: async ({ judge, body }) => {
        await unwrap(
          api.PATCH('/v1/judges/{judgeId}', {
            params: { path: { judgeId: judge.id }, header: ifMatch(judge.version) },
            body,
          }),
        );
        await refresh();
      },
      onError: (e) => refreshOnConflict(queryClient, e, queryKeys.judges(tournamentId)),
    }),
    remove: useMutation<unknown, ApiError, JudgeRow>({
      mutationFn: async (judge) => {
        await unwrap(api.DELETE('/v1/judges/{judgeId}', { params: { path: { judgeId: judge.id } } }));
        await refresh();
      },
    }),
  };
}

/** Urządzenia (IMP-275, IMP-276): kod parowania, zmiana nazwy, odłączenie. */
export function useDeviceMutations(tournamentId: string) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.devices(tournamentId) });
  return {
    pairingCode: useMutation<{ code: string; qrPayload: string; expiresAt: string }, ApiError>({
      mutationFn: () =>
        unwrap(
          api.POST('/v1/tournaments/{tournamentId}/pairing-codes', { params: { path: { tournamentId } } }),
        ),
    }),
    rename: useMutation<unknown, ApiError, { deviceId: string; name: string }>({
      mutationFn: async ({ deviceId, name }) => {
        await unwrap(api.PATCH('/v1/devices/{deviceId}', { params: { path: { deviceId } }, body: { name } }));
        await refresh();
      },
    }),
    revoke: useMutation<unknown, ApiError, string>({
      mutationFn: async (deviceId) => {
        await unwrap(api.DELETE('/v1/devices/{deviceId}', { params: { path: { deviceId } } }));
        await refresh();
      },
    }),
  };
}

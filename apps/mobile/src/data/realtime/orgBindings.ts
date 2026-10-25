import type { QueryClient } from '@tanstack/react-query';
import type { ServerEventPayload, TournamentDetails } from '@polechamp/contracts';
import { queryKeys } from '../query/keys';
import type { RtSocket } from './socket';
import { createVersionGate } from './versions';

const percent = (done: number, expected: number) => (expected ? Math.round((done * 100) / expected) : 0);

/** `progress.updated` → paski postępu w cache bez zapytania (IMP-216 krok 3). */
export function applyProgress(
  details: TournamentDetails | undefined,
  e: ServerEventPayload<'progress.updated'>,
): TournamentDetails | undefined {
  if (!details) return details;
  return {
    ...details,
    progress: {
      ...details.progress,
      done: e.done,
      expected: e.expected,
      percent: percent(e.done, e.expected),
    },
    categories: details.categories.map((c) =>
      c.id === e.categoryId
        ? {
            ...c,
            progress: {
              done: e.categoryDone,
              expected: e.categoryExpected,
              percent: percent(e.categoryDone, e.categoryExpected),
            },
          }
        : c,
    ),
  };
}

/** Zdarzenia realtime organizatora → aktualizacja/unieważnienie zapytań TanStack Query. */
export function bindOrgEvents(socket: RtSocket, queryClient: QueryClient, tournamentId: string): () => void {
  const gate = createVersionGate();
  const handlers = {
    'progress.updated': (e: ServerEventPayload<'progress.updated'>) =>
      queryClient.setQueryData<TournamentDetails>(queryKeys.tournament(tournamentId), (old) =>
        applyProgress(old, e),
      ),
    'results.updated': (e: ServerEventPayload<'results.updated'>) => {
      if (gate.accept(`results:${e.categoryId}`, e.resultsVersion)) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.results(e.categoryId) });
      }
    },
    'tournament.updated': (e: ServerEventPayload<'tournament.updated'>) => {
      if (gate.accept(`tournament:${e.tournamentId}`, e.version)) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.tournament(e.tournamentId) });
        void queryClient.invalidateQueries({ queryKey: ['tournaments'] });
      }
    },
    'category.updated': (e: ServerEventPayload<'category.updated'>) => {
      if (gate.accept(`category:${e.categoryId}`, e.version)) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.category(e.categoryId) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.tournament(tournamentId) });
      }
    },
    'scoresheet.accepted': (e: ServerEventPayload<'scoresheet.accepted'>) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.scoreSheets(e.entryId) });
    },
    'device.status': () => void queryClient.invalidateQueries({ queryKey: queryKeys.devices(tournamentId) }),
    'device.paired': () => void queryClient.invalidateQueries({ queryKey: queryKeys.devices(tournamentId) }),
    'rejected.created': () =>
      void queryClient.invalidateQueries({ queryKey: queryKeys.rejected(tournamentId) }),
  } as const;
  for (const [event, handler] of Object.entries(handlers)) socket.on(event as never, handler as never);
  return () => {
    for (const [event, handler] of Object.entries(handlers)) socket.off(event as never, handler as never);
  };
}

/** Fabryka kluczy zapytań organizatora (IMP-215 krok 2) – jedno miejsce dla unieważnień realtime. */
export const queryKeys = {
  tournaments: (status?: string) => ['tournaments', status ?? 'all'] as const,
  tournament: (id: string) => ['tournament', id] as const,
  category: (id: string) => ['category', id] as const,
  entries: (categoryId: string, q = '') => ['entries', categoryId, q] as const,
  results: (categoryId: string) => ['results', categoryId] as const,
  judges: (tournamentId: string) => ['judges', tournamentId] as const,
  devices: (tournamentId: string) => ['devices', tournamentId] as const,
  rejected: (tournamentId: string) => ['rejected', tournamentId] as const,
  scoreSheets: (entryId: string) => ['scoreSheets', entryId] as const,
  me: () => ['me'] as const,
  appConfig: () => ['appConfig'] as const,
};

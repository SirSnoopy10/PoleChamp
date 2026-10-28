import { router, useLocalSearchParams } from 'expo-router';
import { useCategoryEntries } from '../../../src/data/org/entries';
import { useTournament } from '../../../src/data/org/tournament';
import { useOrgRealtime } from '../../../src/data/realtime/useOrgRealtime';
import { TournamentAthletesScreen } from '../../../src/features/tournaments/TournamentAthletesScreen';

/** Zawodniczki turnieju pogrupowane po kategoriach – z kafelka „Zawodniczki” SCR-ORG-03. */
export default function AthletesRoute() {
  const { tournamentId: id } = useLocalSearchParams<{ tournamentId: string }>();
  const tournament = useTournament(id);
  const categories = tournament.data?.categories;
  const entries = useCategoryEntries((categories ?? []).map((c) => c.id));
  useOrgRealtime(id);

  return (
    <TournamentAthletesScreen
      groups={categories?.map((category, i) => ({ category, entries: entries[i]?.data }))}
      error={tournament.isError || entries.some((q) => q.isError)}
      onBack={() => (router.canGoBack() ? router.back() : router.replace(`/t/${id}`))}
      onRetry={() => {
        void tournament.refetch();
        for (const q of entries) if (q.isError) void q.refetch();
      }}
      onOpenCategory={(categoryId) => router.push(`/c/${categoryId}?tab=entries`)}
    />
  );
}

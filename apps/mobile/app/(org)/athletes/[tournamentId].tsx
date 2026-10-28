import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import type { EntryRow, TournamentDetails } from '@polechamp/contracts';
import { useCanWrite } from '../../../src/data/network/useCanWrite';
import { suggestStartNumber, useCategoryEntries, useEntryMutations } from '../../../src/data/org/entries';
import { useTournament } from '../../../src/data/org/tournament';
import { useOrgRealtime } from '../../../src/data/realtime/useOrgRealtime';
import { EntrySheet } from '../../../src/features/entries/EntrySheet';
import { TournamentAthletesScreen } from '../../../src/features/tournaments/TournamentAthletesScreen';
import { useSheet } from '../../../src/ui/sheet';

type Category = TournamentDetails['categories'][number];

/** Arkusz SCR-ORG-17 dla zawodniczki z wybranej kategorii (mutacje odświeżają listę kategorii i turniej). */
function CategoryEntrySheet({
  sheet,
  category,
  entry,
  entries,
  tournamentFinished,
  canWrite,
}: {
  sheet: ReturnType<typeof useSheet>;
  category: Category;
  entry: EntryRow | undefined;
  entries: EntryRow[];
  tournamentFinished: boolean;
  canWrite: boolean;
}) {
  const mutations = useEntryMutations(category.id);
  const listClosed = category.status === 'LOCKED' || tournamentFinished;
  return (
    <EntrySheet
      {...sheet.props}
      entry={entry}
      suggestedNumber={suggestStartNumber(entries)}
      numberLocked={listClosed}
      canChangeList={!listClosed && canWrite}
      tournamentFinished={tournamentFinished}
      onCreate={(body, idempotencyKey) => mutations.create.mutateAsync({ body, idempotencyKey })}
      onUpdate={(e, body) => mutations.update.mutateAsync({ entryId: e.id, version: e.version, body })}
      onWithdraw={(e) => mutations.withdraw.mutateAsync(e.id)}
      onRestore={(e) => mutations.restore.mutateAsync(e.id)}
      onRemove={(e) => mutations.remove.mutateAsync(e.id)}
      onAnonymize={(e) => mutations.anonymize.mutateAsync(e.id)}
    />
  );
}

/** Zawodniczki turnieju pogrupowane po kategoriach – z kafelka „Zawodniczki” SCR-ORG-03. */
export default function AthletesRoute() {
  const { tournamentId: id } = useLocalSearchParams<{ tournamentId: string }>();
  const tournament = useTournament(id);
  const categories = tournament.data?.categories;
  const entries = useCategoryEntries((categories ?? []).map((c) => c.id));
  const canWrite = useCanWrite(tournament.data?.status);
  const finished = tournament.data?.status === 'FINISHED';
  const sheet = useSheet();
  const [target, setTarget] = useState<{ category: Category; entry?: EntryRow } | null>(null);
  useOrgRealtime(id);

  const open = (category: Category, entry?: EntryRow) => {
    setTarget({ category, entry });
    sheet.open();
  };
  const entriesOf = (categoryId: string) =>
    entries[(categories ?? []).findIndex((c) => c.id === categoryId)]?.data ?? [];

  return (
    <>
      <TournamentAthletesScreen
        groups={categories?.map((category, i) => ({ category, entries: entries[i]?.data }))}
        error={tournament.isError || entries.some((q) => q.isError)}
        onBack={() => (router.canGoBack() ? router.back() : router.replace(`/t/${id}`))}
        onRetry={() => {
          void tournament.refetch();
          for (const q of entries) if (q.isError) void q.refetch();
        }}
        onOpenCategory={(categoryId) => router.push(`/c/${categoryId}?tab=entries&from=athletes`)}
        onOpenEntry={(entry, category) => open(category, entry)}
        onAdd={(category) => open(category)}
        canAdd={(category) => canWrite && !finished && category.status !== 'LOCKED'}
      />
      {target ? (
        <CategoryEntrySheet
          sheet={sheet}
          category={target.category}
          entry={
            target.entry &&
            (entriesOf(target.category.id).find((e) => e.id === target.entry?.id) ?? target.entry)
          }
          entries={entriesOf(target.category.id)}
          tournamentFinished={finished}
          canWrite={canWrite}
        />
      ) : null}
    </>
  );
}

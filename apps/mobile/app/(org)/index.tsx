import { router } from 'expo-router';
import { useState } from 'react';
import { useCreateTournament, useTournaments } from '../../src/data/org/tournaments';
import { NewTournamentSheet } from '../../src/features/tournaments/NewTournamentSheet';
import { TournamentListScreen } from '../../src/features/tournaments/TournamentListScreen';
import { useSheet } from '../../src/ui/sheet';

/** SCR-ORG-01 – lista turniejów (IMP-255) z arkuszem SCR-ORG-02 (IMP-256). */
export default function TournamentsRoute() {
  const active = useTournaments('active');
  const finished = useTournaments('finished');
  const create = useCreateTournament();
  const sheet = useSheet();
  const [refreshing, setRefreshing] = useState(false);

  const refetch = async () => {
    await Promise.all([active.refetch(), finished.refetch()]);
  };

  return (
    <>
      <TournamentListScreen
        active={active.data}
        finished={finished.data}
        loading={active.isPending || finished.isPending}
        error={active.isError || finished.isError}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          void refetch().finally(() => setRefreshing(false));
        }}
        onRetry={() => void refetch()}
        onOpen={(id) => router.push(`/t/${id}`)}
        onCreate={sheet.open}
        onAccount={() => router.push('/account')}
      />
      <NewTournamentSheet
        {...sheet.props}
        onCreate={(body, idempotencyKey) => create.mutateAsync({ body, idempotencyKey })}
        onCreated={(id) => router.push(`/t/${id}`)}
      />
    </>
  );
}

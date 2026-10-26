import type { TournamentListItem } from '@polechamp/contracts';
import { NewTournamentSheet } from '../../../features/tournaments/NewTournamentSheet';
import {
  TournamentListScreen,
  type TournamentListData,
} from '../../../features/tournaments/TournamentListScreen';
import { Button } from '../../../ui/Button';
import { useSheet } from '../../../ui/sheet';
import { registerSection } from '../registry';

const noop = () => undefined;
const base = { categoryCount: 0, progress: { done: 0, expected: 0, percent: 0 }, endDate: null };
export const FX_TOURNAMENTS: TournamentListItem[] = [
  {
    ...base,
    id: 't1',
    name: 'Mistrzostwa Polski Pole Sport 2026',
    status: 'IN_PROGRESS',
    startDate: '2026-10-03',
    endDate: '2026-10-04',
    venue: 'Warszawa, Hala Torwar',
    categoryCount: 8,
    progress: { done: 173, expected: 215, percent: 80 },
  },
  {
    ...base,
    id: 't2',
    name: 'Puchar Wiosny PoleChamp',
    status: 'DRAFT',
    startDate: '2027-04-18',
    venue: 'Poznań, Arena',
    categoryCount: 3,
  },
];
const FINISHED: TournamentListItem[] = [
  {
    ...base,
    id: 't3',
    name: 'Zimowy Puchar PoleChamp',
    status: 'FINISHED',
    startDate: '2026-02-08',
    venue: 'Kraków, Tauron Arena',
  },
  {
    ...base,
    id: 't4',
    name: 'Otwarte Mistrzostwa Śląska',
    status: 'FINISHED',
    startDate: '2025-11-22',
    venue: 'Katowice, Spodek',
  },
];

const screen = (data: Partial<TournamentListData>) => () => (
  <TournamentListScreen
    active={undefined}
    finished={undefined}
    loading={false}
    error={false}
    refreshing={false}
    {...data}
    onRefresh={noop}
    onRetry={noop}
    onOpen={noop}
    onCreate={noop}
    onAccount={noop}
  />
);

function NewTournamentExample() {
  const sheet = useSheet();
  return (
    <>
      <Button label="Nowy turniej" onPress={sheet.open} />
      <NewTournamentSheet
        {...sheet.props}
        onCreate={() => new Promise((resolve) => setTimeout(() => resolve({ id: 't9' }), 800))}
        onCreated={noop}
      />
    </>
  );
}

/** SCR-ORG-01 / SCR-ORG-02 (IMP-255, IMP-256). */
registerSection({
  id: 'tournaments',
  title: 'SCR-ORG-01/02 Turnieje',
  cases: [
    { id: 'list', title: 'Lista: dane', render: screen({ active: FX_TOURNAMENTS, finished: FINISHED }) },
    { id: 'loading', title: 'Lista: ładowanie', render: screen({ loading: true }) },
    { id: 'empty', title: 'Lista: brak turniejów', render: screen({ active: [], finished: [] }) },
    { id: 'no-active', title: 'Lista: brak aktywnych', render: screen({ active: [], finished: FINISHED }) },
    { id: 'error', title: 'Lista: błąd', render: screen({ error: true }) },
    { id: 'new', title: 'Nowy turniej (arkusz)', render: () => <NewTournamentExample /> },
  ],
});

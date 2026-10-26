import type { TournamentDetails, TournamentListItem } from '@polechamp/contracts';
import { CategoryFormSheet } from '../../../features/categories/CategoryFormSheet';
import { EditTournamentSheet } from '../../../features/tournaments/EditTournamentSheet';
import { FinishTournamentSheet } from '../../../features/tournaments/FinishTournamentSheet';
import { TournamentDetailsScreen } from '../../../features/tournaments/TournamentDetailsScreen';
import { categoryDetails, categoryItem, device, tournamentDetails } from '../../../test-utils/fixtures';
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

const details =
  (tournament: TournamentDetails | undefined, extra: { emailUnverified?: boolean } = {}) =>
  () => (
    <TournamentDetailsScreen
      tournament={tournament}
      loading={!tournament}
      error={false}
      canWrite
      emailUnverified={!!extra.emailUnverified}
      starting={false}
      onBack={noop}
      onRetry={noop}
      onEdit={noop}
      onPdf={noop}
      onJudges={noop}
      onStart={noop}
      onFinish={noop}
      onAddCategory={noop}
      onOpenCategory={noop}
      onRejected={noop}
      onResendCode={noop}
    />
  );
const wait = () => new Promise((resolve) => setTimeout(resolve, 600));

function SheetExample({ kind }: { kind: 'finish' | 'edit' | 'category-new' | 'category-live' }) {
  const sheet = useSheet();
  const tour = tournamentDetails({
    status: kind === 'edit' ? 'DRAFT' : 'IN_PROGRESS',
    pendingRejectedSubmissions: 2,
  });
  return (
    <>
      <Button label="Otwórz arkusz" onPress={sheet.open} />
      {kind === 'finish' ? (
        <FinishTournamentSheet
          {...sheet.props}
          tournament={{ ...tour, categories: [...tour.categories, categoryItem('c9')] }}
          devices={[device('d1', { name: 'Tablet stół 2', pendingMutations: 3 })]}
          busy={false}
          onConfirm={sheet.close}
        />
      ) : kind === 'edit' ? (
        <EditTournamentSheet
          {...sheet.props}
          tournament={tour}
          onSave={wait}
          onDelete={wait}
          onDeleted={noop}
        />
      ) : (
        <CategoryFormSheet
          {...sheet.props}
          canWrite
          category={kind === 'category-live' ? categoryDetails({ status: 'IN_PROGRESS' }) : undefined}
          onCreate={wait}
          onUpdate={wait}
        />
      )}
    </>
  );
}

/** SCR-ORG-01…05, SCR-ORG-20 (IMP-255…260). */
registerSection({
  id: 'tournaments',
  title: 'SCR-ORG-01…05 Turnieje',
  cases: [
    { id: 'list', title: 'Lista: dane', render: screen({ active: FX_TOURNAMENTS, finished: FINISHED }) },
    { id: 'loading', title: 'Lista: ładowanie', render: screen({ loading: true }) },
    { id: 'empty', title: 'Lista: brak turniejów', render: screen({ active: [], finished: [] }) },
    { id: 'no-active', title: 'Lista: brak aktywnych', render: screen({ active: [], finished: FINISHED }) },
    { id: 'error', title: 'Lista: błąd', render: screen({ error: true }) },
    { id: 'new', title: 'Nowy turniej (arkusz)', render: () => <NewTournamentExample /> },
    { id: 'details', title: 'Szczegóły: Trwa', render: details(tournamentDetails()) },
    {
      id: 'details-draft',
      title: 'Szczegóły: W przygotowaniu, banery',
      render: details(tournamentDetails({ status: 'DRAFT', pendingRejectedSubmissions: 2 }), {
        emailUnverified: true,
      }),
    },
    {
      id: 'details-finished',
      title: 'Szczegóły: Zakończona (UI-02)',
      render: details(
        tournamentDetails({
          status: 'FINISHED',
          categories: [categoryItem('c8', { name: 'Pole Art Masters' })],
        }),
      ),
    },
    {
      id: 'details-empty',
      title: 'Szczegóły: brak kategorii',
      render: details(tournamentDetails({ status: 'DRAFT', categories: [] })),
    },
    { id: 'details-loading', title: 'Szczegóły: ładowanie', render: details(undefined) },
    { id: 'finish', title: 'Zakończyć turniej? (TL-48)', render: () => <SheetExample kind="finish" /> },
    { id: 'edit', title: 'Edytuj turniej (W przygotowaniu)', render: () => <SheetExample kind="edit" /> },
    { id: 'category-new', title: 'Nowa kategoria', render: () => <SheetExample kind="category-new" /> },
    {
      id: 'category-live',
      title: 'Edytuj kategorię (Trwa)',
      render: () => <SheetExample kind="category-live" />,
    },
  ],
});

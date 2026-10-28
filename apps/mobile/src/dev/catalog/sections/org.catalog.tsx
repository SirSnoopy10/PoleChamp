import { useState } from 'react';
import type { CategoryDetails, ResultsResponse } from '@polechamp/contracts';
import { AccountScreen } from '../../../features/account/AccountScreen';
import { CategoryScreen, type CategoryTab } from '../../../features/categories/CategoryScreen';
import { CriteriaTab } from '../../../features/categories/tabs/CriteriaTab';
import { EntriesTab } from '../../../features/categories/tabs/EntriesTab';
import { ResultsTab } from '../../../features/categories/tabs/ResultsTab';
import { PairTabletSheet } from '../../../features/devices/PairTabletSheet';
import { JudgesDevicesScreen, type JudgesTab } from '../../../features/judges/JudgesDevicesScreen';
import { JudgeSheet } from '../../../features/judges/JudgeSheet';
import { Button } from '../../../ui/Button';
import { useSheet } from '../../../ui/sheet';
import { categoryDetails, device } from '../../../test-utils/fixtures';
import { registerSection } from '../registry';

const noop = () => undefined;
const wait = () => new Promise((resolve) => setTimeout(resolve, 600));

const ENTRIES = [
  ['Zuzanna Król', 'Aerial Dreams Warszawa', 5],
  ['Agnieszka Mazur', 'PoleFit Kraków', 5],
  ['Amelia Król', 'Pole Passion Gdańsk', 3],
  ['Paulina Lewandowska', 'Fly High Lublin', 0],
].map(([name, club, done], i) => ({
  id: `e${41 + i}`,
  startNumber: 41 + i,
  startOrder: i + 1,
  status: i === 3 ? ('WITHDRAWN' as const) : ('ACTIVE' as const),
  version: 1,
  athlete: { id: `a${i}`, fullName: name as string, club: club as string, isMinor: false },
  judged: { done: done as number, expected: 5 },
}));

const RESULTS: ResultsResponse = {
  categoryId: 'c3',
  status: 'IN_PROGRESS',
  resultsVersion: 3,
  maxJudgeScore: 65,
  judgeCount: 5,
  formula: 'MEAN',
  tieBreak: { criterionId: 'k1', criterionName: 'Technika' },
  rows: ENTRIES.slice(0, 3).map((e, i) => ({
    entryId: e.id,
    rank: i + 1,
    startNumber: e.startNumber,
    fullName: e.athlete.fullName,
    club: e.athlete.club,
    entryStatus: 'ACTIVE' as const,
    official: 55.5 - i * 0.4,
    display: String(55.5 - i * 0.4).replace('.', ','),
    sheetCount: e.judged.done,
    isComplete: e.judged.done === 5,
    isProvisional: false,
  })),
};

function Category({ category }: { category: CategoryDetails }) {
  const [tab, setTab] = useState<CategoryTab>('criteria');
  return (
    <CategoryScreen
      category={category}
      tournamentStatus="IN_PROGRESS"
      loading={false}
      error={false}
      canWrite
      tab={tab}
      onTab={setTab}
      busy={null}
      onBack={noop}
      onRetry={noop}
      onEdit={noop}
      onAction={noop}
      onRejected={noop}
    >
      {tab === 'criteria' ? (
        <CriteriaTab
          category={category}
          editable={category.status === 'DRAFT'}
          locked={category.status !== 'DRAFT'}
          onAddCriterion={noop}
          onEditCriterion={noop}
          onAddPenalty={noop}
          onEditPenalty={noop}
        />
      ) : tab === 'entries' ? (
        <EntriesTab
          entries={ENTRIES}
          total={ENTRIES.length}
          loading={false}
          error={false}
          query=""
          onQuery={noop}
          canAdd
          onAdd={noop}
          onOpen={noop}
          onRetry={noop}
        />
      ) : (
        <ResultsTab results={RESULTS} loading={false} error={false} onRetry={noop} onOpen={noop} />
      )}
    </CategoryScreen>
  );
}

function Judges({ empty }: { empty?: boolean }) {
  const [tab, setTab] = useState<JudgesTab>('judges');
  const judge = (id: string, fullName: string, extra: object) => ({
    id,
    fullName,
    initials: '',
    isActive: true,
    pinLocked: false,
    sheetCount: 0,
    version: 1,
    ...extra,
  });
  return (
    <JudgesDevicesScreen
      judges={
        empty
          ? []
          : [
              judge('j1', 'Anna Nowak', { sheetCount: 12 }),
              judge('j2', 'Ewa Lis', { pinLocked: true }),
              judge('j3', 'Jan Kowal', { isActive: false }),
            ]
      }
      devices={
        empty
          ? []
          : [
              device('d1', { name: 'Tablet stół 1', activeJudge: { id: 'j1', fullName: 'Anna Nowak' } }),
              device('d2', { name: 'Tablet stół 2', online: false, pendingMutations: 3, batteryLevel: 0.12 }),
            ]
      }
      loading={false}
      error={false}
      tab={tab}
      onTab={setTab}
      canWrite
      canManageDevices
      finished={false}
      now={Date.parse('2026-10-03T10:05:00Z')}
      onBack={noop}
      onRetry={noop}
      onAddJudge={noop}
      onOpenJudge={noop}
      onOpenDevice={noop}
      onPair={noop}
    />
  );
}

function SheetExample({ kind }: { kind: 'pair' | 'judge' }) {
  const sheet = useSheet();
  return (
    <>
      <Button label="Otwórz arkusz" onPress={sheet.open} />
      {kind === 'pair' ? (
        <PairTabletSheet
          {...sheet.props}
          devices={[]}
          onCreateCode={async () => ({
            code: 'K7QM4ZTX',
            qrPayload: 'polechamp://pair?c=K7QM4ZTX&t=t1',
            expiresAt: new Date(Date.now() + 120_000).toISOString(),
          })}
        />
      ) : (
        <JudgeSheet
          {...sheet.props}
          canWrite
          onCreate={async (fullName) => ({ id: 'j9', fullName, pin: '4821' })}
          onUpdate={wait}
          onResetPin={async () => ({ id: 'j9', fullName: 'x', pin: '1357' })}
          onDelete={wait}
        />
      )}
    </>
  );
}

const account = (emailVerified: boolean) => () => (
  <AccountScreen
    me={{
      id: 'u1',
      email: 'anna@example.com',
      displayName: 'Anna Organizatorka',
      emailVerified,
      locale: 'pl',
    }}
    config={undefined}
    loading={false}
    error={false}
    version="1.0.0"
    canWrite
    loggingOut={false}
    onBack={noop}
    onRetry={noop}
    onVerify={noop}
    onOpenLink={noop}
    onLogout={noop}
    onDelete={wait}
  />
);

/** SCR-ORG-06…08, SCR-ORG-14…16, SCR-ORG-21 (IMP-261…277). */
registerSection({
  id: 'org',
  title: 'SCR-ORG-06…21 Kategoria, sędziowie, konto',
  cases: [
    {
      id: 'category-draft',
      title: 'Kategoria: W przygotowaniu',
      render: () => <Category category={categoryDetails()} />,
    },
    {
      id: 'category-live',
      title: 'Kategoria: Trwa (zablokowane kryteria, baner)',
      render: () => (
        <Category category={categoryDetails({ status: 'IN_PROGRESS', pendingRejectedSubmissions: 3 })} />
      ),
    },
    { id: 'judges', title: 'Sędziowie i urządzenia', render: () => <Judges /> },
    { id: 'judges-empty', title: 'Sędziowie: puste', render: () => <Judges empty /> },
    { id: 'pair', title: 'Sparuj tablet', render: () => <SheetExample kind="pair" /> },
    { id: 'judge-new', title: 'Nowy sędzia → PIN', render: () => <SheetExample kind="judge" /> },
    { id: 'account', title: 'Konto: zweryfikowane', render: account(true) },
    { id: 'account-unverified', title: 'Konto: niezweryfikowane', render: account(false) },
  ],
});

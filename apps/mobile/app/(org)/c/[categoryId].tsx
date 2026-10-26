import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import type { CategoryDetails, EntryRow, LockWarnings, ResultsResponse } from '@polechamp/contracts';
import { useCanWrite } from '../../../src/data/network/useCanWrite';
import {
  useCategory,
  useCriteriaMutations,
  useDeleteCategory,
  useLockCategory,
  useStartCategory,
  useUnlockCategory,
  useUpdateCategory,
} from '../../../src/data/org/categories';
import { suggestStartNumber, useEntries, useEntryMutations } from '../../../src/data/org/entries';
import { useResolveRejected, useRejected } from '../../../src/data/org/rejected';
import { useResults } from '../../../src/data/org/results';
import { useTournament } from '../../../src/data/org/tournament';
import { useOrgRealtime } from '../../../src/data/realtime/useOrgRealtime';
import { CategoryFormSheet, toastSaveError } from '../../../src/features/categories/CategoryFormSheet';
import { CategoryScreen, type CategoryTab } from '../../../src/features/categories/CategoryScreen';
import { CriterionSheet } from '../../../src/features/categories/CriterionSheet';
import { LockWarningsSheet } from '../../../src/features/categories/LockWarningsSheet';
import { PenaltySheet } from '../../../src/features/categories/PenaltySheet';
import { CriteriaTab } from '../../../src/features/categories/tabs/CriteriaTab';
import { EntriesTab } from '../../../src/features/categories/tabs/EntriesTab';
import { ResultsTab } from '../../../src/features/categories/tabs/ResultsTab';
import { EntrySheet } from '../../../src/features/entries/EntrySheet';
import { PdfPreviewSheet } from '../../../src/features/exports/PdfPreviewSheet';
import { RejectedSheet } from '../../../src/features/rejected/RejectedSheet';
import { EntryScoresSheet } from '../../../src/features/results/EntryScoresSheet';
import type { CategoryAction } from '../../../src/features/org/CategoryActionBar';
import { useSheet } from '../../../src/ui/sheet';
import { toast } from '../../../src/ui/Toast';

type Criterion = CategoryDetails['criteria'][number];
type Penalty = CategoryDetails['penaltyTypes'][number];

const TABS: readonly CategoryTab[] = ['criteria', 'entries', 'results'];
const START_REQUIREMENT = {
  NO_CRITERIA: 'toasts:startRequirement.criteria',
  NO_ACTIVE_ENTRIES: 'toasts:startRequirement.entries',
  NO_ACTIVE_JUDGES: 'toasts:startRequirement.judges',
} as const;

/** Wartość po 250 ms bez zmian (wyszukiwanie listy startowej). */
function useDebounced<T>(value: T, ms = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

/** SCR-ORG-06/07/08 – szczegóły kategorii z zakładkami i arkuszami SCR-ORG-05, 09, 10, 11, 17, 18. */
export default function CategoryRoute() {
  const params = useLocalSearchParams<{ categoryId: string; tab?: string }>();
  const id = params.categoryId;
  const tab: CategoryTab = TABS.includes(params.tab as CategoryTab)
    ? (params.tab as CategoryTab)
    : 'criteria';
  const query = useCategory(id);
  const category = query.data;
  const tournamentId = category?.tournamentId ?? '';
  const tournament = useTournament(tournamentId, !!category);
  const tournamentStatus = tournament.data?.status;
  const canWrite = useCanWrite(tournamentStatus);
  const ref = { id, tournamentId };

  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim());
  const entries = useEntries(id, q);
  const pdfSheet = useSheet();
  const rejectedSheet = useSheet();
  const results = useResults(id, tab === 'results' || pdfSheet.visible);
  const rejected = useRejected(tournamentId, rejectedSheet.visible);
  const resolve = useResolveRejected(tournamentId);
  const [scoresRow, setScoresRow] = useState<ResultsResponse['rows'][number] | null>(null);
  useOrgRealtime(category?.tournamentId);

  const start = useStartCategory(ref);
  const lock = useLockCategory(ref);
  const unlock = useUnlockCategory(ref);
  const update = useUpdateCategory(ref);
  const remove = useDeleteCategory(ref);
  const config = useCriteriaMutations(id);
  const entryMutations = useEntryMutations(id);

  const editSheet = useSheet();
  const criterionSheet = useSheet();
  const penaltySheet = useSheet();
  const entrySheet = useSheet();
  const [criterion, setCriterion] = useState<Criterion | undefined>();
  const [penalty, setPenalty] = useState<Penalty | undefined>();
  const [entry, setEntry] = useState<EntryRow | undefined>();
  const [lockWarnings, setLockWarnings] = useState<LockWarnings | null>(null);
  const [busy, setBusy] = useState<CategoryAction | null>(null);

  const doLock = (force: boolean) =>
    lock.mutate(
      { force },
      {
        onSuccess: () => {
          setLockWarnings(null);
          toast.success('toasts:categoryLocked');
        },
        onError: (e) => {
          if (e.code === 'LOCK_WARNINGS' && e.problem) {
            const p = e.problem as unknown as Partial<LockWarnings>;
            return setLockWarnings({
              missingSheets: p.missingSheets ?? 0,
              devicesWithPending: p.devicesWithPending ?? [],
              offlineDevices: p.offlineDevices ?? [],
            });
          }
          setLockWarnings(null);
          toastSaveError(e);
        },
        onSettled: () => setBusy(null),
      },
    );

  const onAction = (action: CategoryAction) => {
    if (action === 'exportPdf') return pdfSheet.open();
    setBusy(action);
    if (action === 'lock') return doLock(false);
    const mutation = action === 'start' ? start : unlock;
    mutation.mutate(undefined, {
      onSuccess: () =>
        toast.success(action === 'start' ? 'toasts:categoryStarted' : 'toasts:categoryUnlocked'),
      onError: (e) => {
        if (e.code === 'START_REQUIREMENTS_NOT_MET') {
          const key = START_REQUIREMENT[e.problem?.detail as keyof typeof START_REQUIREMENT];
          return key ? toast.error(key) : toastSaveError(e);
        }
        // Podwójny tap – kategoria już rozpoczęta (TC-EDGE-031).
        if (e.code === 'INVALID_STATE_TRANSITION') return void query.refetch();
        toastSaveError(e);
        if (e.code === 'EMAIL_NOT_VERIFIED') router.push('/verify-email');
      },
      onSettled: () => setBusy(null),
    });
  };

  const editable = !!category && category.status === 'DRAFT' && canWrite;
  const listClosed = category?.status === 'LOCKED' || tournamentStatus === 'FINISHED';

  return (
    <CategoryScreen
      category={category}
      tournamentStatus={tournamentStatus}
      loading={query.isPending || tournament.isPending}
      error={query.isError || tournament.isError}
      canWrite={canWrite}
      tab={tab}
      onTab={(next) => router.setParams({ tab: next })}
      busy={busy}
      onBack={() => (router.canGoBack() ? router.back() : router.replace(`/t/${tournamentId}`))}
      onRetry={() => void Promise.all([query.refetch(), tournament.refetch()])}
      onEdit={editSheet.open}
      onAction={onAction}
      onRejected={rejectedSheet.open}
      sheets={
        category ? (
          <>
            <CategoryFormSheet
              {...editSheet.props}
              category={category}
              canWrite={canWrite}
              onUpdate={(body, version) => update.mutateAsync({ body, version })}
              onDelete={(version) => remove.mutateAsync({ version })}
              onDeleted={() => router.replace(`/t/${tournamentId}`)}
            />
            <CriterionSheet
              {...criterionSheet.props}
              criterion={criterion}
              onCreate={(body) => config.createCriterion.mutateAsync(body)}
              onUpdate={(cid, body) => config.updateCriterion.mutateAsync({ id: cid, body })}
              onDelete={(cid) => config.deleteCriterion.mutateAsync(cid)}
            />
            <PenaltySheet
              {...penaltySheet.props}
              penalty={penalty}
              onCreate={(body) => config.createPenalty.mutateAsync(body)}
              onUpdate={(pid, body) => config.updatePenalty.mutateAsync({ id: pid, body })}
              onDelete={(pid) => config.deletePenalty.mutateAsync(pid)}
            />
            <EntrySheet
              {...entrySheet.props}
              entry={entry}
              suggestedNumber={suggestStartNumber(entries.data ?? [])}
              numberLocked={listClosed}
              canChangeList={!listClosed && canWrite}
              onCreate={(body, idempotencyKey) => entryMutations.create.mutateAsync({ body, idempotencyKey })}
              onUpdate={(e, body) =>
                entryMutations.update.mutateAsync({ entryId: e.id, version: e.version, body })
              }
              onWithdraw={(e) => entryMutations.withdraw.mutateAsync(e.id)}
              onRestore={(e) => entryMutations.restore.mutateAsync(e.id)}
              onRemove={(e) => entryMutations.remove.mutateAsync(e.id)}
              onAnonymize={(e) => entryMutations.anonymize.mutateAsync(e.id)}
            />
            {tournament.data ? (
              <PdfPreviewSheet
                {...pdfSheet.props}
                tournament={tournament.data}
                categoryId={id}
                results={results.data ? [results.data] : undefined}
              />
            ) : null}
            <RejectedSheet
              {...rejectedSheet.props}
              items={rejected.data}
              loading={rejected.isPending}
              categoryId={id}
              lockedCategoryIds={new Set(category.status === 'LOCKED' ? [id] : [])}
              canWrite={canWrite}
              onAccept={(item) => resolve.accept.mutateAsync(item)}
              onDiscard={(item) => resolve.discard.mutateAsync(item)}
            />
            <EntryScoresSheet
              row={scoresRow}
              judgeCount={results.data?.judgeCount ?? category.judgeCount}
              onClose={() => setScoresRow(null)}
            />
            <LockWarningsSheet
              warnings={lockWarnings}
              onClose={() => setLockWarnings(null)}
              busy={lock.isPending}
              onForce={() => doLock(true)}
            />
          </>
        ) : null
      }
    >
      {category && tab === 'criteria' ? (
        <CriteriaTab
          category={category}
          editable={editable}
          locked={category.status !== 'DRAFT'}
          onAddCriterion={() => {
            setCriterion(undefined);
            criterionSheet.open();
          }}
          onEditCriterion={(c) => {
            setCriterion(c);
            criterionSheet.open();
          }}
          onAddPenalty={() => {
            setPenalty(undefined);
            penaltySheet.open();
          }}
          onEditPenalty={(p) => {
            setPenalty(p);
            penaltySheet.open();
          }}
        />
      ) : null}
      {category && tab === 'entries' ? (
        <EntriesTab
          entries={entries.data}
          total={category.entryCount}
          loading={entries.isPending}
          error={entries.isError}
          query={search}
          onQuery={setSearch}
          canAdd={!listClosed && canWrite}
          onAdd={() => {
            setEntry(undefined);
            entrySheet.open();
          }}
          onOpen={(e) => {
            setEntry(e);
            entrySheet.open();
          }}
          onRetry={() => void entries.refetch()}
        />
      ) : null}
      {category && tab === 'results' ? (
        <ResultsTab
          results={results.data}
          loading={results.isPending}
          error={results.isError}
          onRetry={() => void results.refetch()}
          onOpen={setScoresRow}
        />
      ) : null}
    </CategoryScreen>
  );
}

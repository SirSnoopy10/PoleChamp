import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { color, layout, radius, shadow } from '@polechamp/tokens';
import { listQueue, readCategory } from '../../data/judge/queries';
import { judgeRuntime } from '../../data/judge/runtime';
import { useJudgeSession, type ActiveJudge } from '../../data/judge/session';
import { useLocalQuery } from '../../data/judge/useLocalQuery';
import { ScoreSheetRepo } from '../../data/local/scoreSheets';
import { syncEvents, type SyncEvent } from '../../data/sync/events';
import { countQueueRejections } from '../../data/sync/RejectionHandler';
import { refreshFromDb } from '../../data/sync/syncStore';
import { useT } from '../../i18n';
import { Icon } from '../../ui/Icon';
import { Text } from '../../ui/Text';
import { toast } from '../../ui/Toast';
import { nextUnscoredEntry, readScoreFormModel } from '../scoring/model';
import { NoOwnScore, ScoreForm } from '../scoring/ScoreForm';
import { QueuePanel } from './QueuePanel';
import { TwoPaneLayout } from './TwoPaneLayout';

const KEEP_AWAKE_TAG = 'judge-scoring';

const sheetsOf = (judgeId: string) => (e: SyncEvent) =>
  (e.type === 'sheetsChanged' && e.judgeIds.includes(judgeId)) ||
  (e.type === 'rejected' && e.judgeId === judgeId) ||
  e.type === 'snapshotApplied';

function PickAthlete() {
  const t = useT();
  return (
    <View testID="pick-athlete" style={styles.center}>
      <View style={[styles.circle, shadow.sm]}>
        <Icon name="hand-pointing" size={24} color={color.accent} />
      </View>
      <Text variant="bodyS" color={color.neutral[400]} align="center">
        {t('judge:queue.pick')}
      </Text>
    </View>
  );
}

function CategoryBody({
  judge,
  categoryId,
  entryId,
}: {
  judge: ActiveJudge;
  categoryId: string;
  entryId: string | null;
}) {
  const router = useRouter();
  const { judgeId } = judge;
  const category = useLocalQuery((db) => readCategory(db, judgeId, categoryId), [judgeId, categoryId]);
  const queue = useLocalQuery(
    (db) => listQueue(db, categoryId),
    [categoryId],
    (e) => e.type !== 'judgeLocked',
  );
  const scored = useLocalQuery(
    (db) =>
      new Set(
        ScoreSheetRepo.forJudge(db, judgeId)
          .list(categoryId)
          .map((s) => s.entryId),
      ),
    [judgeId, categoryId],
    sheetsOf(judgeId),
  );
  const rejectedCount = useLocalQuery(
    (db) => countQueueRejections(db, judgeId, categoryId),
    [judgeId, categoryId],
    sheetsOf(judgeId),
  );
  // Konfiguracja formularza czytana ponownie tylko przy zmianie schematu (szkic chroni wpisane wartości).
  const [configVersion, setConfigVersion] = useState(0);
  const model = useLocalQuery(
    (db) => (entryId ? readScoreFormModel(db, judgeId, entryId) : null),
    [judgeId, entryId, configVersion],
    () => false,
  );
  const sheet = useLocalQuery(
    (db) => (entryId ? ScoreSheetRepo.forJudge(db, judgeId).byEntry(entryId) : null),
    [judgeId, entryId],
    sheetsOf(judgeId),
  );
  const [listChanged, setListChanged] = useState(false);

  useEffect(() => refreshFromDb(judgeRuntime().local.read, judgeId), [judgeId]);
  useEffect(() => setListChanged(false), [entryId]);
  useEffect(
    () =>
      syncEvents.subscribe((e) => {
        if (e.type === 'startListChanged' && e.categoryId === categoryId) {
          toast.info('toasts:startListUpdated');
          if (entryId) setListChanged(true);
        }
        if (e.type === 'formOutdated' && e.judgeId === judgeId && e.entryId === entryId) {
          toast.info('errors:SCHEMA_MISMATCH');
          setConfigVersion((v) => v + 1);
        }
        if (e.type === 'snapshotApplied') setConfigVersion((v) => v + 1);
      }),
    [categoryId, entryId, judgeId],
  );

  if (!category || category.status === 'DRAFT') return <Redirect href="/categories" />;
  const locked = category.status === 'LOCKED';
  const select = (id: string) => router.setParams({ entry: id });
  const advance = () => {
    const db = judgeRuntime().local.read;
    const done = new Set(
      ScoreSheetRepo.forJudge(db, judgeId)
        .list(categoryId)
        .map((s) => s.entryId),
    );
    const next = entryId ? nextUnscoredEntry(listQueue(db, categoryId), done, entryId) : null;
    router.setParams({ entry: next ?? '' });
  };

  let main = <PickAthlete />;
  if (model && model.entry.categoryId === categoryId) {
    if (locked && !sheet) main = <NoOwnScore />;
    else
      main = (
        <ScoreForm
          key={`${model.entry.id}:${configVersion}:${locked}`}
          judge={judge}
          model={model}
          sheet={sheet}
          readOnly={locked}
          othersUnscored={queue.some((e) => e.id !== model.entry.id && !scored.has(e.id))}
          listChanged={listChanged}
          onSubmitted={advance}
          onReload={() => setConfigVersion((v) => v + 1)}
        />
      );
  }

  return (
    <TwoPaneLayout
      side={
        <QueuePanel
          category={category}
          queue={queue}
          selectedId={entryId}
          rejectedCount={rejectedCount}
          onSelect={select}
          onBack={() => router.replace('/categories')}
        />
      }
    >
      {main}
    </TwoPaneLayout>
  );
}

/**
 * SCR-JDG-04/05 – kategoria (IMP-308…316): kolejka w panelu bocznym, formularz oceny wybranej
 * zawodniczki (`?entry=`) w panelu prawym; ekran nie gaśnie (`expo-keep-awake`).
 */
export function JudgeCategoryScreen({ categoryId, entryId }: { categoryId: string; entryId: string | null }) {
  useKeepAwake(KEEP_AWAKE_TAG, { suppressDeactivateWarnings: true });
  const judge = useJudgeSession((s) => s.active);
  if (!judge) return null;
  return <CategoryBody judge={judge} categoryId={categoryId} entryId={entryId} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: layout[14], padding: layout[28] },
  circle: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.surface,
  },
});

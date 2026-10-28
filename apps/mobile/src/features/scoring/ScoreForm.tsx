import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { color, layout } from '@polechamp/tokens';
import { judgeRuntime } from '../../data/judge/runtime';
import { ScoreSheetRepo, type LocalScoreSheet } from '../../data/local/scoreSheets';
import type { ActiveJudge } from '../../data/judge/session';
import { useOnline } from '../../data/network/online';
import { useT } from '../../i18n';
import { Badge } from '../../ui/Badge';
import { Banner } from '../../ui/Banner';
import { Button } from '../../ui/Button';
import { TextArea } from '../../ui/form';
import { Icon } from '../../ui/Icon';
import { CriterionCard } from '../../ui/scoring/CriterionCard';
import { PenaltyCounter } from '../../ui/scoring/PenaltyCounter';
import { Text } from '../../ui/Text';
import { toast } from '../../ui/Toast';
import { attachDraftAutosave } from './draft';
import { createScoreFormStore, formValues, useForm, type ScoreFormStore } from './formStore';
import { submitLabelKey, type ScoreFormModel } from './model';
import { ScoreFooter } from './ScoreFooter';
import { submitScore } from './submitScore';

/** Siatka auto-fill: kolumny min. 320 dp, odstęp 12 (≈ 800 dp panelu → dwie kolumny). */
const MIN_COLUMN = 320;
const GAP = layout[12];

function useColumns() {
  const [width, setWidth] = useState(0);
  const columns = Math.max(1, Math.floor((width + GAP) / (MIN_COLUMN + GAP)));
  const cell = width ? (width - GAP * (columns - 1)) / columns : 0;
  return { onLayout: (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width), cell };
}

function CriterionField({
  store,
  c,
  disabled,
}: {
  store: ScoreFormStore;
  c: ScoreFormModel['criteria'][number];
  disabled: boolean;
}) {
  const value = useForm(store, (s) => s.criteria[c.id] ?? 0);
  const set = useForm(store, (s) => s.setCriterion);
  return (
    <CriterionCard
      id={c.id}
      name={c.name}
      description={c.description}
      weightTenths={c.weightTenths}
      scaleMax={c.scaleMax}
      stepTenths={c.stepTenths}
      value={value}
      onChange={set}
      disabled={disabled}
    />
  );
}

function PenaltyField({
  store,
  p,
  disabled,
}: {
  store: ScoreFormStore;
  p: ScoreFormModel['penalties'][number];
  disabled: boolean;
}) {
  const count = useForm(store, (s) => s.penalties[p.id] ?? 0);
  const set = useForm(store, (s) => s.setPenalty);
  return (
    <PenaltyCounter
      id={p.id}
      name={p.name}
      pointsTenths={p.pointsTenths}
      maxOccurrences={p.maxOccurrences}
      count={count}
      onChange={set}
      disabled={disabled}
    />
  );
}

function CommentField({ store, disabled }: { store: ScoreFormStore; disabled: boolean }) {
  const t = useT();
  const comment = useForm(store, (s) => s.comment);
  const set = useForm(store, (s) => s.setComment);
  return (
    <TextArea
      label={t('judge:commentLabel')}
      value={comment}
      onChangeText={set}
      placeholder={t('judge:form.commentPlaceholder')}
      maxLength={500}
      counterFrom={400}
      minHeight={76}
      editable={!disabled}
      testID="score-comment"
    />
  );
}

/** Tekst powodu odrzucenia bez kropki końcowej („…: {powód}.”). */
const reasonText = (text: string) => text.replace(/[.…]+$/, '');

export interface ScoreFormProps {
  judge: ActiveJudge;
  model: ScoreFormModel;
  /** Bieżący arkusz sędziego (stan synchronizacji, odrzucenie) – odświeżany bez resetu formularza. */
  sheet: LocalScoreSheet | null;
  /** Kategoria zablokowana – podgląd (IMP-314). */
  readOnly: boolean;
  /** Są inne nieocenione starty (etykieta „Zatwierdź i dalej”). */
  othersUnscored: boolean;
  /** Lista startowa zmieniła się w trakcie edycji (IMP-316). */
  listChanged: boolean;
  onSubmitted: () => void;
  /** Wersja serwera pobrana („Pokaż aktualną”) – ponowne wczytanie formularza. */
  onReload: () => void;
}

/**
 * Formularz oceny SCR-JDG-05 (IMP-309…316): nagłówek zawodniczki, siatki kryteriów i kar, komentarz,
 * stała stopka z wynikiem na żywo. Autozapis szkicu co 300 ms (i przy przejściu w tło), zatwierdzenie
 * w transakcji lokalnej z toastem po `COMMIT`. W kategorii zablokowanej tylko podgląd (bez stopki).
 */
export function ScoreForm({
  judge,
  model,
  sheet,
  readOnly,
  othersUnscored,
  listChanged,
  onSubmitted,
  onReload,
}: ScoreFormProps) {
  const t = useT();
  const online = useOnline();
  const store = useMemo(() => createScoreFormStore(model.initial), [model]);
  const draft = useRef<ReturnType<typeof attachDraftAutosave> | null>(null);
  const grid = useColumns();
  const penaltyGrid = useColumns();
  const [showingCurrent, setShowingCurrent] = useState(false);
  const { entry } = model;

  useEffect(() => {
    if (readOnly) return;
    const saver = attachDraftAutosave(store, judgeRuntime().local, judge.judgeId, entry.id);
    draft.current = saver;
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') void saver.flush();
    });
    return () => {
      sub.remove();
      saver.dispose();
      draft.current = null;
    };
  }, [store, readOnly, judge.judgeId, entry.id]);

  const submit = async () => {
    const state = store.getState();
    // UX-02: blokada od pierwszego tapnięcia do końca transakcji lokalnej (stan synchroniczny – drugie
    // `onPress` w tej samej klatce widzi `submitting`); późniejsze tapnięcie z tą samą treścią
    // nie tworzy mutacji (`submitSheet`).
    if (state.submitting) return;
    store.setState({ submitting: true });
    draft.current?.cancel();
    try {
      await submitScore(judgeRuntime(), judge, {
        categoryId: entry.categoryId,
        entryId: entry.id,
        values: formValues(state),
        config: model.config,
      });
      toast.success('toasts:scoreSaved', { name: entry.fullName });
      onSubmitted();
    } catch {
      toast.error('toasts:saveFailed');
    } finally {
      store.setState({ submitting: false });
    }
  };

  const showCurrent = async () => {
    setShowingCurrent(true);
    try {
      const rt = judgeRuntime();
      await rt.engine.fetchJudgeSheets(judge.judgeId);
      draft.current?.cancel();
      await rt.local.tx((db) => ScoreSheetRepo.forJudge(db, judge.judgeId).deleteDraft(entry.id));
      onReload();
    } catch {
      toast.error('toasts:saveFailed');
    } finally {
      setShowingCurrent(false);
    }
  };

  const stale = sheet?.syncState === 'REJECTED' && sheet.rejectCode === 'STALE_REVISION';
  const rejected = sheet?.syncState === 'REJECTED' && !stale;

  return (
    <View testID="score-form" style={styles.root}>
      <KeyboardAwareScrollView
        testID="score-form-scroll"
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bottomOffset={layout[24]}
      >
        <View style={styles.athlete}>
          <Badge variant="number" value={entry.startNumber} size={56} />
          <View style={styles.athleteText}>
            <Text variant="titleS" numberOfLines={1} testID="athlete-name">
              {entry.fullName}
            </Text>
            {entry.club ? (
              <Text variant="meta" color={color.neutral[400]} numberOfLines={1}>
                {entry.club}
              </Text>
            ) : null}
          </View>
          {sheet ? <Badge variant="scored" /> : null}
        </View>
        {rejected ? (
          <Banner
            variant="rejected"
            text={t('judge:sheetRejected', {
              reason: reasonText(t(`errors:${sheet.rejectCode ?? 'INTERNAL'}` as never)),
            })}
            testID="form-rejected-banner"
          />
        ) : null}
        {stale ? (
          <View style={styles.bannerRow}>
            <View style={styles.bannerText}>
              <Banner variant="rejected" text={t('errors:STALE_REVISION')} testID="form-stale-banner" />
            </View>
            <Button
              variant="ghost"
              label={t('judge:form.showCurrent')}
              onPress={() => void showCurrent()}
              disabled={!online || judge.authMode !== 'ONLINE_PIN'}
              loading={showingCurrent}
              testID="show-current"
            />
          </View>
        ) : null}
        {listChanged ? (
          <Banner variant="emailVerify" text={t('toasts:startListUpdated')} testID="form-list-banner" />
        ) : null}
        <View style={readOnly ? styles.readOnly : null} pointerEvents={readOnly ? 'none' : 'auto'}>
          <Text variant="kicker" color={color.neutral[400]} style={styles.kicker}>
            {t('judge:form.criteria')}
          </Text>
          <View style={styles.grid} onLayout={grid.onLayout}>
            {model.criteria.map((c) => (
              <View key={c.id} style={{ width: grid.cell || '100%' }}>
                <CriterionField store={store} c={c} disabled={readOnly} />
              </View>
            ))}
          </View>
          {model.penalties.length ? (
            <>
              <Text variant="kicker" color={color.neutral[400]} style={[styles.kicker, styles.section]}>
                {t('judge:form.penalties')}
              </Text>
              <View style={styles.grid} onLayout={penaltyGrid.onLayout}>
                {model.penalties.map((p) => (
                  <View key={p.id} style={{ width: penaltyGrid.cell || '100%' }}>
                    <PenaltyField store={store} p={p} disabled={readOnly} />
                  </View>
                ))}
              </View>
            </>
          ) : null}
          <View style={styles.section}>
            <CommentField store={store} disabled={readOnly} />
          </View>
        </View>
      </KeyboardAwareScrollView>
      {readOnly ? null : (
        <ScoreFooter
          store={store}
          config={model.config}
          maxHundredths={model.maxHundredths}
          label={t(submitLabelKey(!!sheet, othersUnscored))}
          onSubmit={() => void submit()}
        />
      )}
    </View>
  );
}

/** Kategoria zablokowana, start bez oceny tego sędziego (IMP-314 – wartości domyślne nie udają noty). */
export function NoOwnScore() {
  const t = useT();
  return (
    <View testID="no-own-score" style={styles.center}>
      <Icon name="circle-dashed" size={24} color={color.neutral[400]} />
      <Text variant="bodyS" color={color.neutral[400]} align="center">
        {t('judge:form.noScore')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingTop: layout[22],
    paddingHorizontal: layout[26],
    paddingBottom: layout[24],
    gap: layout[16],
  },
  athlete: { flexDirection: 'row', alignItems: 'center', gap: layout[16], marginBottom: layout[6] },
  athleteText: { flex: 1, minWidth: 0 },
  bannerRow: { flexDirection: 'row', alignItems: 'center', gap: layout[12] },
  bannerText: { flex: 1 },
  readOnly: { opacity: 0.55 },
  kicker: { marginBottom: layout[10] },
  section: { marginTop: layout[20] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: layout[12] },
});

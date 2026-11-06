import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { formatPenaltySum, formatScore, sheetTotal, type CategoryConfig } from '@polechamp/scoring';
import { color, layout, radius } from '@polechamp/tokens';
import { useT } from '../../i18n';
import { Button } from '../../ui/Button';
import { FadedDivider } from '../../ui/layout/FadedDivider';
import { Text } from '../../ui/Text';
import { useForm, type ScoreFormStore } from './formStore';

export interface ScoreFooterProps {
  store: ScoreFormStore;
  config: CategoryConfig;
  maxHundredths: number;
  label: string;
  onSubmit: () => void;
}

/**
 * Stała stopka SCR-JDG-05 (IMP-312): „Twój wynik” liczony na żywo `sheetTotal` (≤ 50 ms – NFR-104),
 * „/ {max}”, chip „kary −{suma}” (gdy > 0) i przycisk zatwierdzenia z etykietą wg TC-STATE-002.
 */
export function ScoreFooter({ store, config, maxHundredths, label, onSubmit }: ScoreFooterProps) {
  const submitting = useForm(store, (s) => s.submitting);
  return (
    <View testID="score-footer" style={styles.footer}>
      <FadedDivider position="top" />
      <LiveTotal store={store} config={config} maxHundredths={maxHundredths} />
      <View style={styles.spacer} />
      <Button
        label={label}
        size={52}
        onBar
        icon="arrow-right"
        iconPosition="end"
        loading={submitting}
        onPress={onSubmit}
        testID="score-submit"
      />
    </View>
  );
}

/**
 * Wynik na żywo (IMP-500): jedyna część stopki subskrybująca noty i kary – przycisk i separator
 * nie renderują się przy każdym kroku suwaka; `sheetTotal` liczony raz na zmianę wartości.
 */
const LiveTotal = memo(function LiveTotal({
  store,
  config,
  maxHundredths,
}: Pick<ScoreFooterProps, 'store' | 'config' | 'maxHundredths'>) {
  const t = useT();
  const criteria = useForm(store, (s) => s.criteria);
  const penalties = useForm(store, (s) => s.penalties);
  // Coś nieruszone – wynik zawiera wartości domyślne, nie jest jeszcze oceną sędziego (P14, UX2-09).
  const fromDefaults = useForm(store, (s) => Object.keys(s.untouched).length > 0);
  const total = useMemo(() => sheetTotal({ criteria, penalties }, config), [criteria, penalties, config]);
  return (
    <>
      <View>
        <Text variant="kicker" color={color.neutral[400]} style={styles.kicker}>
          {t('judge:form.yourScore')}
        </Text>
        <View style={styles.score}>
          <Text
            variant="numXL"
            tabular
            color={fromDefaults ? color.neutral[500] : undefined}
            testID="score-total"
          >
            {formatScore(total.totalHundredths, 2)}
          </Text>
          <Text variant="meta" color={color.neutral[500]}>
            {t('judge:form.outOf', { max: formatScore(maxHundredths, 1) })}
          </Text>
        </View>
        {fromDefaults ? (
          <Text variant="caption" color={color.accentRamp[300]} testID="score-from-defaults">
            {t('judge:form.fromDefaults')}
          </Text>
        ) : null}
      </View>
      {total.penaltyHundredths > 0 ? (
        <View testID="penalty-chip" style={styles.chip}>
          <Text variant="caption" tabular color={color.neutral[200]}>
            {t('judge:form.penaltyChip', { sum: formatPenaltySum(total.penaltyHundredths) })}
          </Text>
        </View>
      ) : null}
    </>
  );
});

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: layout[14],
    paddingVertical: layout[14],
    paddingHorizontal: layout[26],
    backgroundColor: color.mix.surface45OnBg,
  },
  kicker: { textTransform: 'none', letterSpacing: 0 },
  score: { flexDirection: 'row', alignItems: 'baseline', gap: layout[4] },
  chip: {
    paddingVertical: layout[4],
    paddingHorizontal: layout[10],
    borderRadius: radius.pill,
    backgroundColor: color.neutral[900],
  },
  spacer: { flex: 1 },
});

import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { formatTenths } from '@polechamp/scoring';
import { color, radius, shadow } from '@polechamp/tokens';
import { useT } from '../../i18n';
import { Badge } from '../Badge';
import { Text } from '../Text';
import { RepeatButton } from './RepeatButton';
import { ScoreSlider } from './ScoreSlider';

export interface CriterionCardProps {
  id: string;
  name: string;
  description?: string | null;
  weightTenths: number;
  scaleMax: number;
  stepTenths?: number;
  /** Nota w dziesiątych. */
  value: number;
  onChange: (id: string, tenths: number) => void;
  disabled?: boolean;
  /** Wartość domyślna, której sędzia nie ruszył – przygaszona z podpisem (UX-14). */
  untouched?: boolean;
}

/**
 * Karta kryterium SCR-JDG-05 (IMP-309/310): nazwa + waga „×{w}” + opis (2 linie), wartość „8,5 /10”
 * bez zawijania (UI-05), „−” 44 dp, suwak, „+” 44 dp (±0,5 z przycięciem do [0; skala]).
 */
export const CriterionCard = memo(function CriterionCard({
  id,
  name,
  description,
  weightTenths,
  scaleMax,
  stepTenths = 5,
  value,
  onChange,
  disabled = false,
  untouched = false,
}: CriterionCardProps) {
  const t = useT();
  const max = scaleMax * 10;
  const set = (tenths: number) => onChange(id, Math.min(max, Math.max(0, tenths)));
  return (
    <View testID={`criterion-${id}`} style={[styles.card, shadow.sm]}>
      <View style={styles.top}>
        <View style={styles.names}>
          <View style={styles.nameRow}>
            <Text variant="body" numberOfLines={2} style={styles.name}>
              {name}
            </Text>
            <Badge variant="weight" value={weightTenths} compact />
          </View>
          {description ? (
            <Text variant="caption" color={color.neutral[400]} numberOfLines={2}>
              {description}
            </Text>
          ) : null}
        </View>
        <View style={styles.valueColumn}>
          <View style={styles.value}>
            <Text
              variant="numXL"
              tabular
              color={untouched ? color.neutral[500] : color.accentRamp[200]}
              numberOfLines={1}
              testID={`criterion-${id}-value`}
            >
              {formatTenths(value)}
            </Text>
            <Text variant="meta" color={color.neutral[500]} numberOfLines={1}>
              {t('judge:form.scale', { max: scaleMax })}
            </Text>
          </View>
          {untouched ? (
            <Text
              variant="caption"
              color={color.accentRamp[300]}
              numberOfLines={1}
              testID={`criterion-${id}-untouched`}
            >
              {t('judge:form.untouched')}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.controls}>
        <RepeatButton
          icon="minus"
          size={44}
          disabled={disabled || value <= 0}
          onStep={() => set(value - stepTenths)}
          accessibilityLabel={t('judge:form.decrease', { name })}
          testID={`criterion-${id}-minus`}
        />
        <ScoreSlider
          value={value}
          scaleMax={scaleMax}
          stepTenths={stepTenths}
          onChange={(v) => onChange(id, v)}
          disabled={disabled}
          accessibilityLabel={t('judge:form.sliderA11y', { name, value: formatTenths(value), max: scaleMax })}
          testID={`criterion-${id}-slider`}
        />
        <RepeatButton
          icon="plus"
          size={44}
          disabled={disabled || value >= max}
          onStep={() => set(value + stepTenths)}
          accessibilityLabel={t('judge:form.increase', { name })}
          testID={`criterion-${id}-plus`}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: { padding: 16, gap: 16, borderRadius: radius.lg, backgroundColor: color.surface },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  names: { flex: 1, minWidth: 0, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flexShrink: 1, fontFamily: 'Inter_500Medium' },
  valueColumn: { alignItems: 'flex-end', flexShrink: 0, gap: 2 },
  value: { flexDirection: 'row', alignItems: 'baseline' },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});

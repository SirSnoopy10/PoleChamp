import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { formatPenaltyPoints } from '@polechamp/scoring';
import { color, radius, shadow } from '@polechamp/tokens';
import { useT } from '../../i18n';
import { Text } from '../Text';
import { RepeatButton } from './RepeatButton';

export interface PenaltyCounterProps {
  id: string;
  name: string;
  pointsTenths: number;
  maxOccurrences: number;
  count: number;
  onChange: (id: string, count: number) => void;
  disabled?: boolean;
}

/**
 * Karta kary SCR-JDG-05 (IMP-311): „−{pkt} pkt za każde · maks. {n}×”, −/+ 40 dp (strefa 44 – G-27),
 * licznik 22 dp; przy liczniku > 0 tło accent 10% i obrys accent-700; „+” przy maksimum opacity 0,35.
 */
export const PenaltyCounter = memo(function PenaltyCounter({
  id,
  name,
  pointsTenths,
  maxOccurrences,
  count,
  onChange,
  disabled = false,
}: PenaltyCounterProps) {
  const t = useT();
  const set = (n: number) => onChange(id, Math.min(maxOccurrences, Math.max(0, n)));
  const active = count > 0;
  return (
    <View
      testID={`penalty-${id}`}
      style={[styles.card, active ? styles.active : shadow.sm]}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={t('judge:form.penaltyA11y', { name, count, max: maxOccurrences })}
      accessibilityValue={{ min: 0, max: maxOccurrences, now: count }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        if (disabled) return;
        if (e.nativeEvent.actionName === 'increment') set(count + 1);
        if (e.nativeEvent.actionName === 'decrement') set(count - 1);
      }}
    >
      <View style={styles.names}>
        {/* Nazwa kary w 2 liniach – bez ucinania typowych nazw (UX-35). */}
        <Text variant="body" numberOfLines={2} style={styles.name}>
          {name}
        </Text>
        <Text variant="caption" color={color.neutral[400]} numberOfLines={1}>
          {t('judge:form.penaltyHint', { points: formatPenaltyPoints(pointsTenths), max: maxOccurrences })}
        </Text>
      </View>
      <RepeatButton
        icon="minus"
        size={40}
        disabled={disabled || count <= 0}
        onStep={() => set(count - 1)}
        accessibilityLabel={t('judge:form.decrease', { name })}
        testID={`penalty-${id}-minus`}
      />
      <Text variant="numL" tabular align="center" style={styles.count} testID={`penalty-${id}-count`}>
        {count}
      </Text>
      <RepeatButton
        icon="plus"
        size={40}
        disabled={disabled || count >= maxOccurrences}
        onStep={() => set(count + 1)}
        accessibilityLabel={t('judge:form.increase', { name })}
        testID={`penalty-${id}-plus`}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 12,
    paddingBottom: 12,
    paddingRight: 12,
    paddingLeft: 16,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
  },
  active: {
    backgroundColor: color.mix.accent10OnSurface,
    borderWidth: 1,
    borderColor: color.accentRamp[700],
  },
  names: { flex: 1, minWidth: 0, gap: 2 },
  name: { fontFamily: 'Inter_500Medium' },
  count: { width: 26 },
});

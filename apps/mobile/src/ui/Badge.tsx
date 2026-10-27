import { StyleSheet, View } from 'react-native';
import { formatPenaltyPoints, formatWeight } from '@polechamp/scoring';
import { color, radius } from '@polechamp/tokens';
import { useT } from '../i18n';
import { Icon } from './Icon';
import { Text } from './Text';

export type BadgeProps =
  | { variant: 'weight'; /** Waga w dziesiątych (15 → „×1,5”). */ value: number; compact?: boolean }
  | {
      variant: 'penalty';
      /** Punkty kary w dziesiątych (5 → „−0,5 pkt”). */ value: number;
      compact?: boolean;
    }
  | { variant: 'number'; value: number; size?: 38 | 56; tone?: 'accent' | 'neutral' }
  | { variant: 'scored' };

/** Odznaki (09-design-system §4.3, IMP-204). Liczby przez formatery `@polechamp/scoring`. */
export function Badge(props: BadgeProps) {
  const t = useT();
  switch (props.variant) {
    case 'weight':
    case 'penalty': {
      const weight = props.variant === 'weight';
      const text = weight ? formatWeight(props.value) : formatPenaltyPoints(props.value);
      return (
        <View
          testID={`badge-${props.variant}`}
          accessible
          accessibilityLabel={weight ? t('badge.weightA11y', { weight: text }) : text}
          style={[
            styles.chip,
            props.compact ? styles.chipCompact : null,
            { backgroundColor: weight ? color.accentRamp[900] : color.neutral[900] },
          ]}
        >
          <Text
            variant="caption"
            tabular
            numberOfLines={1}
            color={weight ? color.accentRamp[300] : color.neutral[200]}
            style={{ fontSize: props.compact ? 11 : 12, lineHeight: props.compact ? 14 : 16 }}
          >
            {text}
          </Text>
        </View>
      );
    }
    case 'number': {
      const size = props.size ?? 38;
      const accent = (props.tone ?? 'accent') === 'accent';
      return (
        <View
          testID="badge-number"
          accessible
          accessibilityLabel={t('badge.numberA11y', { number: props.value })}
          style={[
            styles.number,
            {
              width: size,
              height: size,
              borderRadius: size === 56 ? radius.r16 : radius.r11,
              backgroundColor: accent ? color.accentRamp[900] : color.neutral[900],
            },
          ]}
        >
          <Text
            variant={size === 56 ? 'numL' : 'subhead'}
            tabular
            numberOfLines={1}
            color={accent ? color.accentRamp[200] : color.neutral[200]}
          >
            {props.value}
          </Text>
        </View>
      );
    }
    case 'scored':
      return (
        <View
          testID="badge-scored"
          accessible
          style={[styles.chip, styles.scored, { backgroundColor: color.accentRamp[900] }]}
        >
          <Icon name="check-circle" weight="fill" size={13} color={color.accentRamp[300]} />
          <Text variant="caption" color={color.accentRamp[300]} numberOfLines={1} style={{ lineHeight: 16 }}>
            {t('badge.scored')}
          </Text>
        </View>
      );
  }
}

const styles = StyleSheet.create({
  chip: { alignSelf: 'flex-start', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6 },
  chipCompact: { paddingVertical: 1, paddingHorizontal: 6, borderRadius: 5 },
  number: { alignItems: 'center', justifyContent: 'center' },
  scored: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999 },
});

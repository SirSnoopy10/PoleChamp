import { Pressable, StyleSheet, View } from 'react-native';
import { color, radius, shadow } from '@polechamp/tokens';
import { Text } from './Text';

export interface Segment<K extends string> {
  key: K;
  label: string;
  /** Licznik obok etykiety (11 dp, opacity 0,7). */
  count?: number;
}

export interface SegmentedControlProps<K extends string> {
  segments: readonly Segment<K>[];
  value: K;
  onChange: (key: K) => void;
  testID?: string;
}

/** Zakładki SCR-ORG-03 (09-design-system §4.6, UI-08): aktywny tint + obrys accent-700. */
export function SegmentedControl<K extends string>({
  segments,
  value,
  onChange,
  testID,
}: SegmentedControlProps<K>) {
  return (
    <View testID={testID ?? 'segmented'} accessibilityRole="tablist" style={styles.grid}>
      {segments.map((segment) => {
        const active = segment.key === value;
        const label = segment.count === undefined ? segment.label : `${segment.label}, ${segment.count}`;
        return (
          <Pressable
            key={segment.key}
            testID={`segment-${segment.key}`}
            accessibilityRole="tab"
            // 36 dp + 2 × 4 dp = 44 dp strefy dotyku (NFR-203).
            hitSlop={{ top: 4, bottom: 4 }}
            accessibilityLabel={label}
            accessibilityState={{ selected: active }}
            onPress={() => onChange(segment.key)}
            style={[
              styles.segment,
              active
                ? { backgroundColor: color.mix.accent14OnBg, borderColor: color.accentRamp[700] }
                : { borderColor: 'transparent' },
            ]}
          >
            <Text
              variant="meta"
              numberOfLines={1}
              color={active ? color.accentRamp[200] : color.neutral[300]}
            >
              {segment.label}
            </Text>
            {segment.count !== undefined ? (
              <Text
                testID={`segment-${segment.key}-count`}
                variant="micro"
                tabular
                numberOfLines={1}
                color={active ? color.accentRamp[200] : color.neutral[300]}
                style={styles.count}
              >
                {segment.count}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    gap: 3,
    padding: 3,
    borderRadius: radius.r11,
    backgroundColor: color.surface,
    ...shadow.sm,
  },
  segment: {
    flex: 1,
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  count: { opacity: 0.7 },
});

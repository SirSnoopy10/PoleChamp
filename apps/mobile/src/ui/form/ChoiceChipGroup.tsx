import { Pressable, StyleSheet, View } from 'react-native';
import { color } from '@polechamp/tokens';
import { Text } from '../Text';

export interface ChoiceOption<V extends string> {
  value: V;
  label: string;
}

export interface ChoiceChipGroupProps<V extends string> {
  label?: string;
  options: readonly ChoiceOption<V>[];
  value: V | null;
  onChange: (value: V) => void;
  disabled?: boolean;
  /** Podpis stanu nieaktywnego (np. „Kategoria trwa – zmiana niedostępna”). */
  disabledHint?: string;
  testID?: string;
}

/** Grupa chipów jednokrotnego wyboru (09-design-system §4.7, TC-UI-007): `radiogroup` / `radio`. */
export function ChoiceChipGroup<V extends string>({
  label,
  options,
  value,
  onChange,
  disabled,
  disabledHint,
  testID,
}: ChoiceChipGroupProps<V>) {
  return (
    <View style={styles.frame}>
      {label ? (
        <Text variant="caption" color="rgba(233,233,237,0.70)">
          {label}
        </Text>
      ) : null}
      <View
        testID={testID}
        accessibilityRole="radiogroup"
        accessibilityLabel={label}
        accessibilityState={{ disabled: !!disabled }}
        style={[styles.group, disabled && styles.disabled]}
      >
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              accessibilityState={{ checked: selected, disabled: !!disabled }}
              disabled={disabled}
              onPress={() => onChange(option.value)}
              hitSlop={{ top: 4, bottom: 4 }}
              style={[
                styles.chip,
                selected
                  ? { backgroundColor: color.accentRamp[900], borderColor: color.accent }
                  : { backgroundColor: color.bg, borderColor: color.divider },
              ]}
            >
              <Text variant="meta" color={selected ? color.accentRamp[200] : color.neutral[300]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {disabled && disabledHint ? (
        <Text variant="caption" color={color.neutral[400]}>
          {disabledHint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { gap: 5 },
  group: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 13, borderRadius: 999, borderWidth: 1 },
  disabled: { opacity: 0.45 },
});

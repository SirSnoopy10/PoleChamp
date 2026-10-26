import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { color, radius } from '@polechamp/tokens';

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Etykieta dostępności (pełny tekst zgody bez linków). */
  accessibilityLabel: string;
  /** Treść obok pola – może zawierać linki (zagnieżdżone `Text` z `onPress`). */
  children: ReactNode;
  testID?: string;
}

/** Pole zgody 22 dp (obrys neutral-600, zaznaczone – obrys i kwadrat accent) ze strefą dotyku 44 dp. */
export function Checkbox({ checked, onChange, accessibilityLabel, children, testID }: CheckboxProps) {
  return (
    <View style={styles.row}>
      <Pressable
        testID={testID}
        accessibilityRole="checkbox"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ checked }}
        onPress={() => onChange(!checked)}
        hitSlop={11}
        style={[styles.box, { borderColor: checked ? color.accent : color.neutral[600] }]}
      >
        {checked ? <View testID={testID ? `${testID}-mark` : undefined} style={styles.mark} /> : null}
      </Pressable>
      <View style={styles.label}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  box: {
    width: 22,
    height: 22,
    marginTop: 1,
    borderWidth: 1.5,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Zestaw ikon jest zamknięty (09-design-system §3) – zaznaczenie to wypełniony kwadrat accent.
  mark: { width: 12, height: 12, borderRadius: 2, backgroundColor: color.accent },
  label: { flex: 1 },
});

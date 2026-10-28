import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { color, radius } from '@polechamp/tokens';
import { FieldFrame } from './FieldFrame';

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Etykieta dostępności (pełny tekst zgody bez linków). */
  accessibilityLabel: string;
  /** Treść obok pola – może zawierać linki (zagnieżdżone `Text` z `onPress`). */
  children: ReactNode;
  /** Błąd pod polem – ten sam styl co w pozostałych polach (UX-23). */
  error?: string;
  testID?: string;
}

/**
 * Pole zgody 22 dp (obrys neutral-600, zaznaczone – obrys i kwadrat accent). Cały wiersz (min. 44 dp)
 * przełącza zgodę (UX-23); linki w treści przejmują własne dotknięcia. Dla czytnika ekranu
 * przełącznikiem jest kwadrat z pełną etykietą, a linki pozostają osobno dostępne.
 */
export function Checkbox({ checked, onChange, accessibilityLabel, children, error, testID }: CheckboxProps) {
  const toggle = () => onChange(!checked);
  return (
    <FieldFrame error={error}>
      <Pressable
        testID={testID ? `${testID}-row` : undefined}
        accessible={false}
        onPress={toggle}
        style={styles.row}
      >
        <Pressable
          testID={testID}
          accessibilityRole="checkbox"
          accessibilityLabel={accessibilityLabel}
          accessibilityState={{ checked }}
          onPress={toggle}
          hitSlop={11}
          style={[
            styles.box,
            { borderColor: error ? color.accentRamp[300] : checked ? color.accent : color.neutral[600] },
          ]}
        >
          {checked ? <View testID={testID ? `${testID}-mark` : undefined} style={styles.mark} /> : null}
        </Pressable>
        <View style={styles.label}>{children}</View>
      </Pressable>
    </FieldFrame>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, minHeight: 44, paddingVertical: 11 },
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

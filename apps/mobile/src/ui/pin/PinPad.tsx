import { Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { color, shadow } from '@polechamp/tokens';
import { useT } from '../../i18n';
import { Icon } from '../Icon';
import { Text } from '../Text';

const KEY = 76;
const ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', 'back'],
] as const;

export interface PinPadProps {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  /** Blokada czasowa / weryfikacja w toku – opacity 0,45, bez reakcji (SCR-JDG-08). */
  disabled?: boolean;
}

/**
 * Klawiatura PIN 3×4 (SCR-JDG-02, IMP-304): klawisze 76 dp, odstępy 14/22, backspace bez tła.
 * Cyfry nie są nigdzie wyświetlane ani logowane; `filterTouchesWhenObscured` chroni przed nakładkami
 * (Android tapjacking). Wciśnięcie – rozjaśnienie i lekka wibracja.
 */
export function PinPad({ onDigit, onBackspace, disabled = false }: PinPadProps) {
  const t = useT();
  const press = (action: () => void) => () => {
    if (disabled) return;
    void Haptics.selectionAsync().catch(() => undefined);
    action();
  };
  return (
    <View
      testID="pin-pad"
      style={[styles.grid, disabled && styles.disabled]}
      pointerEvents={disabled ? 'none' : 'auto'}
    >
      {ROWS.map((row, r) => (
        <View key={r} style={styles.row}>
          {row.map((key, k) => {
            if (key === '') return <View key={k} style={styles.blank} />;
            const back = key === 'back';
            return (
              <Pressable
                key={k}
                testID={back ? 'pin-key-back' : `pin-key-${key}`}
                onPress={press(back ? onBackspace : () => onDigit(key))}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel={back ? t('judge:pin.backspace') : t('judge:pin.digit', { digit: key })}
                accessibilityState={{ disabled }}
                // @ts-expect-error – prop Androida (RN View), brak w typach Pressable.
                filterTouchesWhenObscured
                style={({ pressed }) => [
                  styles.key,
                  back ? null : [styles.digitKey, shadow.sm],
                  pressed && !back ? styles.pressed : null,
                ]}
              >
                {back ? (
                  <Icon name="backspace" size={26} color={color.neutral[300]} />
                ) : (
                  <Text variant="pin" tabular>
                    {key}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: 14 },
  row: { flexDirection: 'row', gap: 22 },
  key: { width: KEY, height: KEY, borderRadius: KEY / 2, alignItems: 'center', justifyContent: 'center' },
  digitKey: { backgroundColor: color.surface },
  // Rozjaśnienie (brightness 1,5) – RN nie ma filtrów jasności, jaśniejsza powierzchnia.
  pressed: { backgroundColor: color.neutral[800] },
  blank: { width: KEY, height: KEY },
  disabled: { opacity: 0.45 },
});

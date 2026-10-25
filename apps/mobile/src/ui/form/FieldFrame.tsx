import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { color } from '@polechamp/tokens';
import { Icon } from '../Icon';
import { Text } from '../Text';

/** Kolory obrysu pola: spoczynek neutral-600 (adaptacja a11y NFR-202), fokus accent, błąd accent-300. */
export function borderColorFor(focused: boolean, error?: string): string {
  if (error) return color.accentRamp[300];
  return focused ? color.accent : color.neutral[600];
}

export interface FieldFrameProps {
  label?: string;
  error?: string;
  /** Tekst pod polem bez błędu (np. licznik znaków). */
  helper?: ReactNode;
  children: ReactNode;
  testID?: string;
}

/** Etykieta 12 dp (tekst 70%), pole i komunikat błędu pod polem (09-design-system §4.8). */
export function FieldFrame({ label, error, helper, children, testID }: FieldFrameProps) {
  return (
    <View testID={testID} style={styles.frame}>
      {label ? (
        <Text variant="caption" color="rgba(233,233,237,0.70)" style={styles.label}>
          {label}
        </Text>
      ) : null}
      {children}
      {error ? (
        <View style={styles.error} accessibilityLiveRegion="polite">
          <Icon name="warning-circle" size={14} color={color.accentRamp[300]} />
          <Text variant="caption" color={color.accentRamp[300]} style={styles.errorText}>
            {error}
          </Text>
        </View>
      ) : (
        helper
      )}
    </View>
  );
}

export const fieldStyles = StyleSheet.create({
  input: {
    minHeight: 44,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: color.bg,
    color: color.text,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
  },
});

const styles = StyleSheet.create({
  frame: { gap: 5 },
  label: { marginBottom: 0 },
  error: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  errorText: { flex: 1 },
});

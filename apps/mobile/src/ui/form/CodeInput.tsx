import { useRef, useState, type ComponentRef } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { color, radius } from '@polechamp/tokens';
import { Text } from '../Text';

export interface CodeInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  /** Etykieta dostępności całego pola. */
  accessibilityLabel: string;
  error?: boolean;
  editable?: boolean;
  testID?: string;
}

/**
 * Kod jednorazowy jako `length` pól 44×52 dp (SCR-ORG-13): jedno ukryte pole tekstowe pod spodem
 * – wklejenie całego kodu i autouzupełnianie z e-maila/SMS (`oneTimeCode`) działają bez przeskoków.
 */
export function CodeInput({
  value,
  onChange,
  length = 6,
  accessibilityLabel,
  error,
  editable = true,
  testID,
}: CodeInputProps) {
  const ref = useRef<ComponentRef<typeof TextInput>>(null);
  const [focused, setFocused] = useState(false);
  const digits = value.split('');
  return (
    <Pressable
      accessible={false}
      onPress={() => ref.current?.focus()}
      style={styles.row}
      testID={testID ? `${testID}-boxes` : undefined}
    >
      {Array.from({ length }, (_, i) => {
        const active = focused && i === Math.min(value.length, length - 1);
        const border = error ? color.accentRamp[300] : active ? color.accent : color.neutral[600];
        return (
          <View key={i} style={[styles.box, { borderColor: border }]}>
            <Text variant="titleS" tabular>
              {digits[i] ?? ''}
            </Text>
          </View>
        );
      })}
      <TextInput
        ref={ref}
        testID={testID}
        accessibilityLabel={accessibilityLabel}
        value={value}
        onChangeText={(text) => onChange(text.replace(/\D/g, '').slice(0, length))}
        maxLength={length}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        editable={editable}
        caretHidden
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={styles.hidden}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  box: {
    width: 44,
    height: 52,
    borderWidth: 1,
    borderRadius: radius.md,
    backgroundColor: color.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hidden: { ...StyleSheet.absoluteFill, opacity: 0.01, color: 'transparent' },
});

import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { color } from '@polechamp/tokens';
import { formatDecimal } from '@polechamp/i18n';
import { useT } from '../../i18n';
import { Button } from '../Button';
import { useThemeSettings } from '../theme/ThemeProvider';
import { borderColorFor, FieldFrame, fieldStyles } from './FieldFrame';

/** „1,5” i „1.5” → 1.5; pusty lub niepoprawny tekst → `null`. */
export function parseDecimal(text: string): number | null {
  const normalized = text.trim().replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  return Number(normalized);
}

/** Wyświetlanie bez zbędnych zer: 2 → „2”, 1.5 → „1,5”. */
export const formatNumber = (value: number) =>
  Number.isInteger(value) ? String(value) : formatDecimal(value, 1);

export interface NumberFieldProps {
  label: string;
  value: number | null;
  onChange: (value: number | null, text: string) => void;
  error?: string;
  /** Stepper −/+ z krokiem (domyślnie 0,5) w granicach min–max. */
  stepper?: { step?: number; min: number; max: number };
  editable?: boolean;
  testID?: string;
}

/** Pole liczbowe: klawiatura numeryczna, przecinek i kropka, opcjonalny stepper (TC-UI-009). */
export function NumberField({
  label,
  value,
  onChange,
  error,
  stepper,
  editable = true,
  testID,
}: NumberFieldProps) {
  const t = useT();
  const { maxFontScale } = useThemeSettings();
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState(value === null ? '' : formatNumber(value));

  // Zmiana wartości z zewnątrz (stepper, reset formularza) nadpisuje tekst, o ile nie trwa edycja.
  useEffect(() => {
    if (!focused) setText(value === null ? '' : formatNumber(value));
  }, [value, focused]);

  const step = stepper?.step ?? 0.5;
  const bump = (dir: 1 | -1) => {
    if (!stepper) return;
    const base = value ?? stepper.min;
    const next = Math.min(stepper.max, Math.max(stepper.min, Math.round((base + dir * step) / step) * step));
    setText(formatNumber(next));
    onChange(next, formatNumber(next));
  };

  const input = (
    <TextInput
      testID={testID}
      value={text}
      editable={editable}
      keyboardType="decimal-pad"
      inputMode="decimal"
      accessibilityLabel={label}
      accessibilityHint={error}
      aria-invalid={!!error}
      selectionColor={color.accent}
      cursorColor={color.accent}
      maxFontSizeMultiplier={maxFontScale}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChangeText={(next) => {
        setText(next);
        onChange(parseDecimal(next), next);
      }}
      style={[
        fieldStyles.input,
        styles.input,
        { borderColor: borderColorFor(focused, error) },
        !editable && styles.disabled,
      ]}
    />
  );

  return (
    <FieldFrame label={label} error={error}>
      {stepper ? (
        <View style={styles.row}>
          <Button
            variant="iconRound"
            roundSize={44}
            icon="minus"
            accessibilityLabel={`${t('form.decrement')}: ${label}`}
            disabled={!editable || (value ?? stepper.min) <= stepper.min}
            onPress={() => bump(-1)}
          />
          <View style={styles.grow}>{input}</View>
          <Button
            variant="iconRound"
            roundSize={44}
            icon="plus"
            accessibilityLabel={`${t('form.increment')}: ${label}`}
            disabled={!editable || (value ?? stepper.min) >= stepper.max}
            onPress={() => bump(1)}
          />
        </View>
      ) : (
        input
      )}
    </FieldFrame>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  grow: { flex: 1 },
  input: { fontVariant: ['tabular-nums'], textAlign: 'center' },
  disabled: { opacity: 0.45 },
});

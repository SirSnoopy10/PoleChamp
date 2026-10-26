import { useState, type ComponentRef, type Ref } from 'react';
import { TextInput, type TextInputProps } from 'react-native';
import { color } from '@polechamp/tokens';
import { useThemeSettings } from '../theme/ThemeProvider';
import { borderColorFor, FieldFrame, fieldStyles } from './FieldFrame';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string;
  testID?: string;
  /** Fokus z kodu (kolejność pól „Dalej”). */
  ref?: Ref<ComponentRef<typeof TextInput>>;
}

/** Pole tekstowe z etykietą i błędem pod polem (IMP-207, TC-UI-008). */
export function TextField({
  label,
  error,
  testID,
  onFocus,
  onBlur,
  accessibilityHint,
  ref,
  ...input
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const { maxFontScale } = useThemeSettings();
  return (
    <FieldFrame label={label} error={error}>
      <TextInput
        ref={ref}
        testID={testID}
        accessibilityLabel={label}
        accessibilityHint={error ?? accessibilityHint}
        accessibilityState={{ disabled: input.editable === false }}
        aria-invalid={!!error}
        placeholderTextColor={color.neutral[500]}
        selectionColor={color.accent}
        cursorColor={color.accent}
        maxFontSizeMultiplier={maxFontScale}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...input}
        style={[fieldStyles.input, { borderColor: borderColorFor(focused, error) }]}
      />
    </FieldFrame>
  );
}

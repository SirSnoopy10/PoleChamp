import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { color } from '@polechamp/tokens';
import { Icon } from '../Icon';
import { Text } from '../Text';
import { useThemeSettings } from '../theme/ThemeProvider';
import { borderColorFor, FieldFrame, fieldStyles } from './FieldFrame';

export interface PasswordFieldProps extends Omit<TextInputProps, 'style' | 'secureTextEntry'> {
  label: string;
  error?: string;
  /** Podpowiedź pod polem bez błędu (np. „Min. 10 znaków.”). */
  hint?: string;
  showLabel: string;
  hideLabel: string;
  testID?: string;
}

/** Pole hasła z przełącznikiem `eye` / `eye-slash` (SCR-ORG-13, SCR-ORG-21). */
export function PasswordField({
  label,
  error,
  hint,
  showLabel,
  hideLabel,
  testID,
  onFocus,
  onBlur,
  ...input
}: PasswordFieldProps) {
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const { maxFontScale } = useThemeSettings();
  return (
    <FieldFrame label={label} error={error} helper={hint ? <TextHint text={hint} /> : null}>
      <View>
        <TextInput
          testID={testID}
          accessibilityLabel={label}
          accessibilityHint={error ?? hint}
          aria-invalid={!!error}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
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
          style={[fieldStyles.input, styles.input, { borderColor: borderColorFor(focused, error) }]}
        />
        <Pressable
          testID={testID ? `${testID}-toggle` : undefined}
          accessibilityRole="button"
          accessibilityLabel={visible ? hideLabel : showLabel}
          onPress={() => setVisible((v) => !v)}
          style={styles.toggle}
        >
          <Icon name={visible ? 'eye-slash' : 'eye'} size={20} color={color.neutral[400]} />
        </Pressable>
      </View>
    </FieldFrame>
  );
}

function TextHint({ text }: { text: string }) {
  return (
    <Text variant="caption" color={color.neutral[400]}>
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  input: { paddingRight: 44 },
  toggle: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

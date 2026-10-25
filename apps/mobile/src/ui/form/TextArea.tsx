import { useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';
import { color } from '@polechamp/tokens';
import { useT } from '../../i18n';
import { Text } from '../Text';
import { useThemeSettings } from '../theme/ThemeProvider';
import { borderColorFor, FieldFrame, fieldStyles } from './FieldFrame';

export interface TextAreaProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  placeholder?: string;
  /** Limit znaków (komentarz sędziego: 500); nadmiar przy wklejeniu obcinany. */
  maxLength?: number;
  /** Licznik widoczny od tej liczby znaków (komentarz: 400). */
  counterFrom?: number;
  /** 76 (komentarz sędziego) / 90 dp. */
  minHeight?: 76 | 90;
  editable?: boolean;
  testID?: string;
}

/** Pole wielowierszowe z licznikiem „{n}/{max}” (TC-UI-010). */
export function TextArea({
  label,
  value,
  onChangeText,
  error,
  placeholder,
  maxLength = 500,
  counterFrom = 400,
  minHeight = 76,
  editable = true,
  testID,
}: TextAreaProps) {
  const t = useT();
  const { maxFontScale } = useThemeSettings();
  const [focused, setFocused] = useState(false);
  const counter =
    value.length >= counterFrom ? (
      <Text
        testID={testID ? `${testID}-counter` : undefined}
        variant="caption"
        tabular
        color={color.neutral[400]}
        align="right"
      >
        {t('form.charCount', { count: value.length, max: maxLength })}
      </Text>
    ) : null;
  return (
    <FieldFrame label={label} error={error} helper={counter}>
      <TextInput
        testID={testID}
        multiline
        value={value}
        editable={editable}
        placeholder={placeholder}
        placeholderTextColor={color.neutral[500]}
        accessibilityLabel={label}
        accessibilityHint={error}
        selectionColor={color.accent}
        cursorColor={color.accent}
        maxFontSizeMultiplier={maxFontScale}
        maxLength={maxLength}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChangeText={(next) => onChangeText(next.slice(0, maxLength))}
        textAlignVertical="top"
        style={[fieldStyles.input, styles.area, { minHeight, borderColor: borderColorFor(focused, error) }]}
      />
    </FieldFrame>
  );
}

const styles = StyleSheet.create({ area: { paddingVertical: 8, lineHeight: 21 } });

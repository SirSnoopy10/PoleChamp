import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { color, radius } from '@polechamp/tokens';
import { Icon } from '../Icon';
import { useThemeSettings } from '../theme/ThemeProvider';
import { borderColorFor, fieldStyles } from './FieldFrame';

export interface SearchFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  testID?: string;
}

/** Pole wyszukiwania z ikoną `magnifying-glass` (SCR-ORG-07). */
export function SearchField({ value, onChangeText, placeholder, testID }: SearchFieldProps) {
  const [focused, setFocused] = useState(false);
  const { maxFontScale } = useThemeSettings();
  return (
    <View style={[styles.frame, { borderColor: borderColorFor(focused) }]}>
      <Icon name="magnifying-glass" size={18} color={color.neutral[400]} />
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        accessibilityLabel={placeholder}
        accessibilityRole="search"
        placeholderTextColor={color.neutral[500]}
        selectionColor={color.accent}
        cursorColor={color.accent}
        maxFontSizeMultiplier={maxFontScale}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[fieldStyles.input, styles.input]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 10,
    borderWidth: 1,
    borderRadius: radius.md,
    backgroundColor: color.bg,
  },
  input: { flex: 1, borderWidth: 0, paddingLeft: 0 },
});

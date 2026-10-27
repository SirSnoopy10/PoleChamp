import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type Insets,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';
import { useTheme } from './theme/ThemeProvider';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'iconRound';
/** 28 – akcja w wierszu nagłówka sekcji; strefa dotyku dopełniona `hitSlop` do 44 dp. */
export type ButtonSize = 28 | 44 | 48 | 52;
export type IconRoundSize = 30 | 36 | 40 | 44;

export interface ButtonProps {
  variant?: ButtonVariant;
  /** Tekst przycisku; dla `iconRound` wymagany `accessibilityLabel`. */
  label?: string;
  onPress?: () => void;
  size?: ButtonSize;
  /** Średnica koła dla `iconRound`. */
  roundSize?: IconRoundSize;
  icon?: IconName;
  iconPosition?: 'start' | 'end';
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  /** Akcja usuwająca (secondary, ghost): tekst neutral-300. */
  destructive?: boolean;
  /** Tło `accent10OnBg` dla primary w `StickyActionBar` i stopce. */
  onBar?: boolean;
  /** `iconRound` z obrysem i ikoną accent, bez wypełnienia („+” na SCR-ORG-01). */
  outlined?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

const MIN_TOUCH = 44;

/** Strefa dotyku dopełniona do 44 × 44 dp (NFR-203). */
function hitSlopFor(width: number, height: number): Insets | undefined {
  const h = Math.max(0, (MIN_TOUCH - width) / 2);
  const v = Math.max(0, (MIN_TOUCH - height) / 2);
  return h || v ? { left: h, right: h, top: v, bottom: v } : undefined;
}

/** Przycisk Nocturne (09-design-system §4.1, IMP-203). Bez wypełnienia akcentem. */
export function Button({
  variant = 'primary',
  label,
  onPress,
  size = 48,
  roundSize = 36,
  icon,
  iconPosition = 'start',
  fullWidth,
  disabled,
  loading,
  destructive,
  onBar,
  outlined,
  accessibilityLabel,
  accessibilityHint,
  testID,
  style,
}: ButtonProps) {
  const { color, radius } = useTheme();
  const mix = color.mix;
  const [focused, setFocused] = useState(false);
  const inactive = disabled || loading;
  const round = variant === 'iconRound';

  const textColor =
    variant === 'secondary'
      ? destructive
        ? color.neutral[300]
        : color.text
      : (round && !outlined) || (variant === 'ghost' && destructive)
        ? color.neutral[300]
        : color.accent;
  const iconSize = round ? Math.round(roundSize * 0.5) : 18;

  const frame = (pressed: boolean): ViewStyle => {
    switch (variant) {
      case 'primary':
        return {
          borderWidth: 1,
          borderColor: color.accent,
          backgroundColor: pressed ? mix.accent12OnBg : onBar ? mix.accent10OnBg : 'transparent',
        };
      case 'secondary':
        return {
          borderWidth: 1,
          borderColor: color.divider,
          backgroundColor: pressed ? 'rgba(233,233,237,0.14)' : 'transparent',
        };
      case 'ghost':
        return {
          backgroundColor: pressed ? 'rgba(145,132,217,0.18)' : 'transparent',
          paddingHorizontal: 2.8,
        };
      case 'iconRound':
        return outlined
          ? {
              borderWidth: 1,
              borderColor: color.accent,
              backgroundColor: pressed ? mix.accent12OnBg : 'transparent',
            }
          : { backgroundColor: pressed ? color.neutral[700] : color.neutral[800] };
    }
  };

  const content = loading ? (
    <ActivityIndicator testID="button-spinner" size="small" color={textColor} />
  ) : icon ? (
    <Icon name={icon} size={iconSize} color={textColor} />
  ) : null;

  const width = round ? roundSize : MIN_TOUCH;
  const height = round ? roundSize : size;

  return (
    <Pressable
      testID={testID}
      onPress={inactive ? undefined : onPress}
      disabled={inactive}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      hitSlop={hitSlopFor(width, height)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      style={({ pressed }) => [
        styles.base,
        round
          ? { width: roundSize, height: roundSize, borderRadius: radius.pill }
          : { minHeight: size, borderRadius: radius.r12, paddingHorizontal: variant === 'ghost' ? 2.8 : 16 },
        fullWidth && styles.fullWidth,
        frame(pressed && !inactive),
        inactive && styles.disabled,
        style,
      ]}
    >
      {focused ? (
        <View pointerEvents="none" style={[styles.focusRing, { borderColor: color.accent }]} />
      ) : null}
      {iconPosition === 'start' || round ? content : null}
      {label && !round ? (
        <Text
          variant="subhead"
          color={textColor}
          numberOfLines={1}
          style={{ fontSize: size === 44 ? 14 : 15 }}
        >
          {label}
        </Text>
      ) : null}
      {iconPosition === 'end' && !round ? content : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  fullWidth: { alignSelf: 'stretch', flexGrow: 1 },
  disabled: { opacity: 0.45 },
  focusRing: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderWidth: 2,
    borderRadius: 16,
  },
});

import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { typography, type TypographyStyle } from '@polechamp/tokens';
import { useTheme, useThemeSettings } from './theme/ThemeProvider';

/** Aliasy wariantów z planu (IMP-202) na style typografii z tokenów. */
const ALIASES = { title: 'titleM', caption: 'caption' } as const;
export type TextVariant = TypographyStyle | keyof typeof ALIASES;

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: string;
  /** Cyfry tabelaryczne (`tabular-nums`) dla liczb i wyników. */
  tabular?: boolean;
  align?: TextStyle['textAlign'];
}

const resolve = (variant: TextVariant): TypographyStyle =>
  variant in ALIASES ? ALIASES[variant as keyof typeof ALIASES] : (variant as TypographyStyle);

/** Symulacja powiększenia czcionki w DevCatalog (z limitem trybu jak przy skali systemowej). */
const scaled = (fontSize: number, lineHeight: number, scale: number): TextStyle => ({
  fontSize: fontSize * scale,
  lineHeight: lineHeight * scale,
});

/** Tekst Nocturne: font Inter, style z tokenów, limit skalowania per tryb (NFR-204). */
export function Text({ variant = 'body', color, tabular, align, style, ...rest }: TextProps) {
  const theme = useTheme();
  const { maxFontScale, fontScale } = useThemeSettings();
  // Android ignoruje rodzinę Inter przy jawnym fontWeight – waga wynika z nazwy fontu.
  const { fontWeight: _weight, ...base } = typography[resolve(variant)];
  return (
    <RNText
      maxFontSizeMultiplier={maxFontScale}
      allowFontScaling={fontScale === null}
      {...rest}
      style={[
        base as TextStyle,
        { color: color ?? theme.roles.textPrimary },
        tabular ? { fontVariant: ['tabular-nums'] } : null,
        align ? { textAlign: align } : null,
        style,
        fontScale ? scaled(base.fontSize, base.lineHeight, fontScale) : null,
      ]}
    />
  );
}

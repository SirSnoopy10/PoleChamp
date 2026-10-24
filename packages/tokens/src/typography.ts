/** Typografia Inter 400/500 (`@expo-google-fonts/inter`) – 09-design-system §2.5. */
export const fontFamily = { regular: 'Inter_400Regular', medium: 'Inter_500Medium' } as const;

type Weight = '400' | '500';

interface TextStyle {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  fontWeight: Weight;
  letterSpacing?: number;
  textTransform?: 'uppercase';
  fontVariant?: ['tabular-nums'];
}

const HEADING_TRACKING = -0.015;

function style(
  fontSize: number,
  lineHeight: number,
  weight: Weight,
  extra: Partial<TextStyle> = {},
): TextStyle {
  return {
    fontFamily: weight === '500' ? fontFamily.medium : fontFamily.regular,
    fontSize,
    lineHeight,
    fontWeight: weight,
    ...extra,
  };
}

const heading = (size: number, line: number) =>
  style(size, line, '500', { letterSpacing: HEADING_TRACKING * size });
const numeric = (size: number, line: number) => style(size, line, '500', { fontVariant: ['tabular-nums'] });

export const typography = {
  display: heading(32, 36),
  titleL: heading(28, 32),
  titleM: heading(26, 31),
  titleS: heading(24, 28),
  heading: heading(20, 24),
  cardTitle: heading(18, 22.5),
  subhead: style(16, 20, '500'),
  body: style(15, 23, '400'),
  bodyS: style(14, 21, '400'),
  meta: style(13, 18, '400'),
  caption: style(12, 17, '400'),
  kicker: style(11.5, 14, '400', { textTransform: 'uppercase', letterSpacing: 0.08 * 11.5 }),
  micro: style(11, 13, '400'),
  numXL: numeric(30, 30),
  numL: numeric(22, 26),
  numM: numeric(18, 22),
  pin: style(26, 30, '500'),
} as const satisfies Record<string, TextStyle>;

export type TypographyStyle = keyof typeof typography;

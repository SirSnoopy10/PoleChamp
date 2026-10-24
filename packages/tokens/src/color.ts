/** Kolory Nocturne 1:1 z design/_ds/nocturne/styles.css (09-design-system §2.1, IMP-068). */
export const color = {
  bg: '#161826',
  surface: '#232532',
  text: '#e9e9ed',
  accent: '#9184d9',
  /** color-mix(text 16%, transparent) – ≈ #383946 na bg, #434450 na surface. */
  divider: 'rgba(233,233,237,0.16)',
  neutral: {
    100: '#f3f5fe',
    200: '#e4e7f5',
    300: '#cfd3e5',
    400: '#b2b6ca',
    500: '#9397ab',
    600: '#75798c',
    700: '#595d6c',
    800: '#3f424d',
    900: '#292b31',
  },
  accentRamp: {
    100: '#f5f4ff',
    200: '#e7e5fe',
    300: '#d2cefd',
    400: '#b5abfc',
    500: '#968ae0',
    600: '#796cbf',
    700: '#5d5294',
    800: '#423a6a',
    900: '#2b2741',
  },
  section: '#262a60',
  /**
   * Odpowiedniki `color-mix()` z prototypu – React Native nie wspiera color-mix, więc wartości nieprzezroczyste.
   */
  mix: {
    accent9OnSurface: '#2d2e41',
    accent10OnBg: '#222338',
    accent14OnBg: '#27273f',
    accent10OnSurface: '#2e2f43',
    surface45OnBg: '#1c1e2b',
    accent12OnBg: '#25253b',
    accent12OnSurface: '#303046',
    glowAccent900_70: '#252339',
  },
  overlay: {
    sheetBackdrop: 'rgba(41,43,49,0.70)',
    dialogBackdrop: 'rgba(41,43,49,0.50)',
  },
} as const;

export type ColorToken = typeof color;

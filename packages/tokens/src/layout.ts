import { color } from './color.js';

/** Odstępy Nocturne (gęstość 0,7×) – 09-design-system §2.2. */
export const space = { 1: 2.8, 2: 5.6, 3: 8.4, 4: 11.2, 6: 16.8, 8: 22.4 } as const;

/**
 * Skala pomocnicza wartości z prototypu (10, 12, 14…). Ekrany korzystają tylko z niej i `space` – Q-08.
 * Klucz = wartość w dp, żeby zapis `layout[16]` był czytelny.
 */
export const layout = {
  4: 4,
  6: 6,
  8: 8,
  10: 10,
  12: 12,
  14: 14,
  16: 16,
  18: 18,
  20: 20,
  22: 22,
  24: 24,
  26: 26,
  28: 28,
  34: 34,
  48: 48,
} as const;

/** Wymiary stałe: margines ekranu i wysokości kontrolek. */
export const size = {
  screenGutter: 16,
  control: 44,
  controlL: 48,
  controlXL: 52,
  hitSlopMin: 44,
} as const;

/** Promienie – 09-design-system §2.3. */
export const radius = {
  sm: 4,
  md: 8,
  r11: 11,
  r12: 12,
  lg: 14,
  r16: 16,
  sheet: 22,
  pill: 999,
} as const;

/** Elewacja RN – odpowiedniki `--shadow-*` (09-design-system §2.4). */
export const shadow = {
  sm: { borderWidth: 1, borderColor: color.neutral[800] },
  md: {
    borderWidth: 1,
    borderColor: color.neutral[700],
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 9,
    shadowOpacity: 0.55,
    elevation: 8,
  },
  lg: {
    borderWidth: 1,
    borderColor: color.neutral[500],
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowRadius: 20,
    shadowOpacity: 0.65,
    elevation: 16,
  },
  thumb: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    shadowOpacity: 0.5,
    elevation: 4,
  },
} as const;

/** Ruch – 09-design-system §2.6 (krzywe jako punkty kontrolne cubic-bezier). */
export const motion = {
  sheetIn: { duration: 260, easing: [0.2, 0.8, 0.2, 1] },
  backdropFade: { duration: 180, easing: 'ease' },
  toast: { duration: 220, offset: 10 },
  splashRise: { duration: 600, delays: [200, 350] },
  splashProgress: { duration: 4200, easing: [0.4, 0.1, 0.3, 1] },
  splashExit: { duration: 500 },
  rankingReorder: { duration: 200 },
  /** NFR-207: przy „ogranicz ruch” animacje natychmiast albo fade ≤ 150 ms. */
  reducedMaxDuration: 150,
} as const;

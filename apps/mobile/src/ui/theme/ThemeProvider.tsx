import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { color, layout, motion, radius, role, shadow, size, space, typography } from '@polechamp/tokens';

/** Theme Nocturne z `@polechamp/tokens` (IMP-202). Jedyny motyw – aplikacja jest ciemna (ADR-001). */
export const theme = { color, roles: role, space, layout, size, radius, shadow, typography, motion } as const;
export type Theme = typeof theme;

export interface ThemeSettings {
  /** Limit powiększenia czcionki systemowej: organizator 1,3, sędzia 1,2 (NFR-204). */
  maxFontScale: number;
  /** Wymuszone „Ogranicz ruch” (DevCatalog); `null` = ustawienie systemowe. */
  reducedMotion: boolean | null;
  /** Symulowana skala czcionki (DevCatalog: 1,0 / 1,3); `null` = skala systemowa. */
  fontScale: number | null;
}

const ThemeContext = createContext<{ theme: Theme; settings: ThemeSettings }>({
  theme,
  settings: { maxFontScale: 1.3, reducedMotion: null, fontScale: null },
});

export function ThemeProvider({
  children,
  maxFontScale = 1.3,
  reducedMotion = null,
  fontScale = null,
}: Partial<ThemeSettings> & { children: ReactNode }) {
  const value = useMemo(
    () => ({ theme, settings: { maxFontScale, reducedMotion, fontScale } }),
    [maxFontScale, reducedMotion, fontScale],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = (): Theme => useContext(ThemeContext).theme;
export const useThemeSettings = (): ThemeSettings => useContext(ThemeContext).settings;

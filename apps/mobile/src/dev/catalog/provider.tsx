import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { I18nProvider } from '../../i18n';
import { MAX_FONT_SCALE, useMode } from '../../mode/mode';
import { ThemeProvider } from '../../ui/theme/ThemeProvider';

export type CatalogWidth = 'phone' | 'tablet';

export interface CatalogSettings {
  fontScale: 1 | 1.3;
  reducedMotion: boolean;
  width: CatalogWidth;
  pseudo: boolean;
}

interface CatalogContextValue extends CatalogSettings {
  update: (patch: Partial<CatalogSettings>) => void;
}

const CatalogContext = createContext<CatalogContextValue | null>(null);

/** Przełączniki katalogu: skala czcionki, „Ogranicz ruch”, szerokość okna, pseudolokalizacja. */
export function CatalogSettingsProvider({ children }: { children: ReactNode }) {
  const { mode } = useMode();
  const [settings, setSettings] = useState<CatalogSettings>({
    fontScale: 1,
    reducedMotion: false,
    width: 'phone',
    pseudo: false,
  });
  const value = useMemo(
    () => ({
      ...settings,
      update: (patch: Partial<CatalogSettings>) => setSettings((s) => ({ ...s, ...patch })),
    }),
    [settings],
  );
  return (
    <CatalogContext.Provider value={value}>
      <ThemeProvider
        maxFontScale={MAX_FONT_SCALE[mode ?? 'org']}
        fontScale={settings.fontScale === 1 ? null : settings.fontScale}
        reducedMotion={settings.reducedMotion}
      >
        <I18nProvider pseudo={settings.pseudo}>{children}</I18nProvider>
      </ThemeProvider>
    </CatalogContext.Provider>
  );
}

export function useCatalogSettings(): CatalogContextValue {
  const value = useContext(CatalogContext);
  if (!value) throw new Error('useCatalogSettings poza CatalogSettingsProvider');
  return value;
}

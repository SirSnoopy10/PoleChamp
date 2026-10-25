import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { storage, StorageKey } from '../storage/mmkv';

/** Tryb urządzenia wybrany w SCR-SYS-01 (IMP-213). */
export type AppMode = 'org' | 'judge';

/** Limit powiększenia czcionki systemowej per tryb (NFR-204). */
export const MAX_FONT_SCALE: Record<AppMode, number> = { org: 1.3, judge: 1.2 };

export function readStoredMode(): AppMode | null {
  const value = storage.getString(StorageKey.mode);
  return value === 'org' || value === 'judge' ? value : null;
}

interface ModeContextValue {
  mode: AppMode | null;
  setMode: (mode: AppMode | null) => void;
}

const ModeContext = createContext<ModeContextValue>({ mode: null, setMode: () => undefined });

export function ModeProvider({ children, initial }: { children: ReactNode; initial?: AppMode | null }) {
  const [mode, setState] = useState<AppMode | null>(() =>
    initial !== undefined ? initial : readStoredMode(),
  );
  const setMode = useCallback((next: AppMode | null) => {
    if (next) storage.set(StorageKey.mode, next);
    else storage.remove(StorageKey.mode);
    setState(next);
  }, []);
  const value = useMemo(() => ({ mode, setMode }), [mode, setMode]);
  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
}

export const useMode = () => useContext(ModeContext);

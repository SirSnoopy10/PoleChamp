import { useEffect } from 'react';
import { BackHandler, Platform } from 'react-native';
import { Redirect, Slot, usePathname } from 'expo-router';
import { useSession } from '../../src/data/api/useSession';
import { deviceCapabilities } from '../../src/features/system/deviceCapabilities';
import { judgeRedirect } from '../../src/features/system/guards';
import { useMode } from '../../src/mode/mode';

/** Ekrany, na których przycisk wstecz Androida nie zamyka aplikacji (formularz oceny, PIN). */
const BLOCK_BACK = /^\/(category|pin)\//;

/**
 * Tryb sędziego (IMP-220): bez stosu (kategorie ↔ kategoria), strażnik urządzenia i sesji
 * sędziego. Link `polechamp://pair?c=…&t=…` na świeżej instalacji tabletu ustawia tryb sędziego.
 */
export default function JudgeLayout() {
  const { mode, setMode } = useMode();
  const session = useSession();
  const pathname = usePathname();

  useEffect(() => {
    if (mode === null && pathname === '/pair' && deviceCapabilities().supportsJudge) setMode('judge');
  }, [mode, pathname, setMode]);

  useEffect(() => {
    if (Platform.OS !== 'android' || !BLOCK_BACK.test(pathname)) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [pathname]);

  if (!session.loaded) return null;
  const target = judgeRedirect({ mode, session, pathname });
  if (target) return <Redirect href={target as never} />;
  return <Slot />;
}

import { useEffect } from 'react';
import { BackHandler, Platform } from 'react-native';
import { Redirect, Slot, usePathname } from 'expo-router';
import { useSession } from '../../src/data/api/useSession';
import { useJudgeSession } from '../../src/data/judge/session';
import { useSyncStore } from '../../src/data/sync/syncStore';
import { useJudgeSessionToasts } from '../../src/features/judge/session/useJudgeSession';
import { usePairingStage } from '../../src/features/pairing/pairing';
import { deviceCapabilities } from '../../src/features/system/deviceCapabilities';
import { judgeRedirect } from '../../src/features/system/guards';
import { useMode } from '../../src/mode/mode';

/** Ekrany, na których przycisk wstecz Androida nic nie robi (PIN); kategoria ma własną obsługę (UX2-29). */
const BLOCK_BACK = /^\/pin\//;

/**
 * Tryb sędziego (IMP-220, IMP-300): strażnik urządzenia i sesji sędziego (z `local_judge_session` –
 * sesja online i offline), odłączenie tabletu → SCR-JDG-10. Ponowny PIN po przerwie to nakładka
 * w powłoce sesji (`JudgeShell`). Link `polechamp://pair?c=…&t=…` na świeżej instalacji ustawia tryb.
 */
export default function JudgeLayout() {
  const { mode, setMode } = useMode();
  const session = useSession();
  const pathname = usePathname();
  const judgeId = useJudgeSession((s) => s.active?.judgeId ?? null);
  const restored = useJudgeSession((s) => s.restored);
  const revoked = useSyncStore((s) => s.revoked);
  const pairing = usePairingStage();
  useJudgeSessionToasts();

  useEffect(() => {
    if (mode === null && pathname === '/pair' && deviceCapabilities().supportsJudge) setMode('judge');
  }, [mode, pathname, setMode]);

  useEffect(() => {
    if (Platform.OS !== 'android' || !BLOCK_BACK.test(pathname)) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [pathname]);

  if (pathname === '/pair' && pairing !== 'idle') return <Slot />;
  if (!session.loaded || (mode === 'judge' && session.device && !restored)) return null;
  const target = judgeRedirect({ mode, session: { ...session, judge: judgeId }, pathname, revoked });
  if (target) return <Redirect href={target as never} />;
  return <Slot />;
}

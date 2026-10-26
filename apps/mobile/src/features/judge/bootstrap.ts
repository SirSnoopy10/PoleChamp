import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { ApiError } from '../../data/api';
import { loadDeviceCredentials } from '../../data/auth/deviceAuth';
import { judgeRuntime, type JudgeRuntime } from '../../data/judge/runtime';
import { restoreJudgeSession } from '../../data/judge/session';
import { readMeta } from '../../data/sync/meta';
import { Sentry } from '../../observability/sentry';
import type { SplashStage } from '../../ui/splash/SplashScreen';
import { TabletDataLifecycle } from './TabletDataLifecycle';

type JudgeStage = Extract<SplashStage, 'connecting' | 'loadingStartLists' | 'ready'>;

/**
 * Rozruch tabletu pod splashem (IMP-302, SCR-JDG-00): sesja sędziego z bazy → token urządzenia →
 * `SyncEngine.start()` (odtworzenie `IN_FLIGHT` → `QUEUED`, TL-20) → push zaległych i pull zmian
 * (migawka przy `CURSOR_EXPIRED`). Niesparowany – od razu „gotowe” (strażnik → SCR-JDG-06);
 * `DEVICE_REVOKED` – `syncStore.revoked` (→ SCR-JDG-10). Bez sieci splash kończy się po 4,3 s
 * (`SPLASH_MAX_MS`), a ekrany działają na danych z SQLite.
 */
export async function bootstrapJudge(rt: JudgeRuntime, onStage: (stage: JudgeStage) => void): Promise<void> {
  try {
    await TabletDataLifecycle.autoWipe(rt.local, rt.clock.now());
    restoreJudgeSession(rt.local.read, rt.clock.now());
    const creds = await loadDeviceCredentials();
    if (!creds) return;
    onStage('connecting');
    try {
      await rt.auth.ensureToken();
    } catch (error) {
      if (error instanceof ApiError && error.code === 'DEVICE_REVOKED') {
        await rt.engine.revoke();
        return;
      }
      // Offline / limit czasu – start na danych lokalnych, silnik ponowi przy powrocie sieci.
    }
    onStage('loadingStartLists');
    rt.connectRealtime(readMeta(rt.local.read).tournamentId ?? creds.tournamentId);
    await rt.engine.start();
    await rt.engine.whenIdle();
  } finally {
    onStage('ready');
  }
}

/** Etap splashu tabletu (raz przy starcie aplikacji – jak `useOrgSplashStage`). */
export function useJudgeSplashStage(active: boolean): JudgeStage {
  const [stage, setStage] = useState<JudgeStage>('connecting');
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let rt: JudgeRuntime;
    try {
      rt = judgeRuntime();
    } catch (error) {
      // Baza niedostępna (np. podgląd Expo web bez SQLite) – splash się kończy, błąd do Sentry.
      Sentry.captureException(error);
      setStage('ready');
      return;
    }
    void bootstrapJudge(rt, (next) => !cancelled && setStage(next)).catch((error: unknown) =>
      Sentry.captureException(error),
    );
    // Retencja po zakończeniu turnieju także przy powrocie na pierwszy plan (IMP-319 krok 3).
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void TabletDataLifecycle.autoWipe(rt.local, rt.clock.now());
    });
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, [active]);
  return stage;
}

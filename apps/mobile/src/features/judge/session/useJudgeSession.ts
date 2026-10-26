import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { unwrap } from '../../../data/api';
import { network } from '../../../data/network/online';
import { outbox } from '../../../data/outbox/outbox';
import { judgeRuntime } from '../../../data/judge/runtime';
import {
  endActiveSession,
  judgeSessionStore,
  needsReauth,
  requireReauth,
  touchActivity,
} from '../../../data/judge/session';
import type { JudgeSessionEndReason } from '../../../data/sync/events';
import { toast } from '../../../ui/Toast';

/** Sprawdzanie bezczynności 2 h (dokładność minuty wystarcza). */
const IDLE_CHECK_MS = 60_000;

/** Komunikaty zdalnego zakończenia sesji (IMP-306 krok 2); bez komunikatu – SCR-JDG-01/10 mówią same. */
const ENDED_TOAST: Partial<Record<JudgeSessionEndReason, string>> = {
  REPLACED: 'toasts:sessionReplaced',
  PIN_CHANGED: 'errors:PIN_VERSION_OUTDATED',
  PIN_VERSION_OUTDATED: 'errors:PIN_VERSION_OUTDATED',
  JUDGE_INACTIVE: 'errors:JUDGE_INACTIVE',
  JUDGE_REMOVED: 'errors:JUDGE_INACTIVE',
  JUDGE_SESSION_INVALID: 'errors:JUDGE_SESSION_INVALID',
};

/** Toast po zdalnym zakończeniu sesji sędziego (strażnik przenosi na SCR-JDG-01). */
export function useJudgeSessionToasts(): void {
  useEffect(
    () =>
      judgeSessionStore.subscribe((s, prev) => {
        if (!s.ended || s.ended === prev.ended) return;
        const key = ENDED_TOAST[s.ended];
        if (key) toast.info(key);
        judgeSessionStore.setState({ ended: null });
      }),
    [],
  );
}

/**
 * Ponowne uwierzytelnienie (FR-511, TC-STATE-006): czas przejścia w tło i bezczynność. Po 15 min
 * w tle lub 2 h bez dotknięcia – SCR-JDG-02 tego sędziego z powrotem na bieżący ekran.
 */
export function useReauthTimers(): void {
  useEffect(() => {
    const { clock } = judgeRuntime();
    const check = () => {
      const s = judgeSessionStore.getState();
      if (s.active && !s.reauth && needsReauth(s, clock.now())) requireReauth();
    };
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') judgeSessionStore.setState({ backgroundAt: clock.now() });
      if (state === 'active') {
        check();
        judgeSessionStore.setState({ backgroundAt: null });
      }
    });
    const id = setInterval(check, IDLE_CHECK_MS);
    return () => {
      sub.remove();
      clearInterval(id);
    };
  }, []);
}

/** Dotknięcie ekranu przez sędziego (licznik bezczynności). */
export const onJudgeTouch = () => {
  const rt = judgeRuntime();
  touchActivity(rt.local, rt.clock.now());
};

/**
 * Wylogowanie (SCR-JDG-09): przy niepustej kolejce dialog z liczbą niewysłanych ocen, inaczej od razu.
 * Sesja online – `DELETE /v1/judge-sessions/current` (gdy online), offline – `JUDGE_SESSION_ENDED`.
 */
export function useLogout() {
  const [confirmCount, setConfirmCount] = useState(0);
  const logout = useCallback(async () => {
    setConfirmCount(0);
    const rt = judgeRuntime();
    const active = judgeSessionStore.getState().active;
    if (active?.authMode === 'ONLINE_PIN' && network.isOnline()) {
      await unwrap(rt.api.DELETE('/v1/judge-sessions/current')).catch(() => undefined);
    }
    await endActiveSession(rt.local, rt.clock.now());
    void rt.engine.push();
  }, []);
  const request = useCallback(() => {
    const pending = outbox.countPending(judgeRuntime().local.read);
    if (pending > 0) setConfirmCount(pending);
    else void logout();
  }, [logout]);
  return { request, logout, confirmCount, cancel: () => setConfirmCount(0) };
}

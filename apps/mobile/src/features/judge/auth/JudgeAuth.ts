import { JudgeSessionCreated } from '@polechamp/contracts';
import { verifyPinOffline, VerifierUnavailableError } from '../../../crypto/pinVerifier';
import { ApiError, unwrap, uuidv7 } from '../../../data/api';
import { tokenStore } from '../../../data/api/tokens';
import { loadDeviceCredentials } from '../../../data/auth/deviceAuth';
import { readJudge, readTournament, type LocalJudge } from '../../../data/judge/queries';
import type { JudgeRuntime } from '../../../data/judge/runtime';
import { startJudgeSession } from '../../../data/judge/session';
import { network } from '../../../data/network/online';
import { outbox } from '../../../data/outbox/outbox';
import { readMeta } from '../../../data/sync/meta';
import { syncEvents } from '../../../data/sync/events';
import { ATTEMPTS_PER_SERIES, lockSeconds, offlineDecision } from './offlinePolicy';

/** Limit czasu logowania online – potem ścieżka offline (sędzia nie czeka 30 s przy słabej sieci). */
export const ONLINE_LOGIN_TIMEOUT_MS = 8_000;

export type LoginResult =
  | { kind: 'ok'; authMode: 'ONLINE_PIN' | 'OFFLINE_PIN' }
  | { kind: 'invalid' }
  | { kind: 'locked'; seconds: number }
  | { kind: 'lockedReset' }
  | { kind: 'needsOnline' }
  | { kind: 'inactive' }
  | { kind: 'revoked' };

const judgeInput = (j: LocalJudge) => ({
  id: j.id,
  fullName: j.fullName,
  initials: j.initials,
  pinVersion: j.pinVersion,
});

/** `null` – serwer nieosiągalny (sieć, limit czasu, 5xx): logowanie offline. */
async function loginOnline(rt: JudgeRuntime, judge: LocalJudge, pin: string): Promise<LoginResult | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ONLINE_LOGIN_TIMEOUT_MS);
  try {
    const res = JudgeSessionCreated.parse(
      await unwrap(
        rt.api.POST('/v1/judge-sessions', { body: { judgeId: judge.id, pin }, signal: controller.signal }),
      ),
    );
    await tokenStore.setJudge(res.judgeToken);
    await startJudgeSession(
      rt.local,
      { judge: judgeInput(judge), sessionId: res.sessionId, authMode: 'ONLINE_PIN', enqueueStart: false },
      rt.clock.now(),
    );
    // Własne arkusze z serwera (np. oceny z innego tabletu) – w tle, ekran nie czeka.
    void rt.engine.fetchJudgeSheets(judge.id).catch(() => undefined);
    void rt.engine.push();
    return { kind: 'ok', authMode: 'ONLINE_PIN' };
  } catch (error) {
    if (!(error instanceof ApiError) || error.code === 'NETWORK' || error.code === 'TIMEOUT') return null;
    if (error.status >= 500) return null;
    switch (error.code) {
      case 'PIN_INVALID':
        return { kind: 'invalid' };
      case 'PIN_LOCKED':
        return error.problem?.requiresReset
          ? { kind: 'lockedReset' }
          : { kind: 'locked', seconds: error.retryAfterSeconds ?? 30 };
      case 'JUDGE_INACTIVE':
        return { kind: 'inactive' };
      case 'DEVICE_REVOKED':
        return { kind: 'revoked' };
      default:
        return { kind: 'needsOnline' };
    }
  } finally {
    clearTimeout(timer);
  }
}

/** Błędny PIN offline: licznik w SQLite, co 5 błędów blokada z eskalacją i `PIN_ATTEMPTS_REPORT`. */
async function registerOfflineFailure(rt: JudgeRuntime, judge: LocalJudge): Promise<LoginResult> {
  const now = rt.clock.now();
  const result = await rt.local.tx((db): LoginResult => {
    const failed = judge.failedAttempts + 1;
    if (failed % ATTEMPTS_PER_SERIES !== 0) {
      db.runSync('UPDATE local_judge SET failed_attempts = ? WHERE id = ?', failed, judge.id);
      return { kind: 'invalid' };
    }
    const level = judge.lockLevel + 1;
    const seconds = lockSeconds(level);
    const lockedUntil = new Date(now + seconds * 1000).toISOString();
    db.runSync(
      'UPDATE local_judge SET failed_attempts = ?, lock_level = ?, locked_until = ? WHERE id = ?',
      failed,
      level,
      lockedUntil,
      judge.id,
    );
    outbox.enqueue(
      db,
      {
        type: 'PIN_ATTEMPTS_REPORT',
        judgeId: judge.id,
        authMode: 'OFFLINE_PIN',
        payload: { failedCount: ATTEMPTS_PER_SERIES, lockedUntil },
      },
      now,
    );
    return { kind: 'locked', seconds };
  });
  if (result.kind === 'locked') syncEvents.emit([{ type: 'judgeLocked', judgeId: judge.id }]);
  return result;
}

async function loginOffline(rt: JudgeRuntime, judge: LocalJudge, pin: string): Promise<LoginResult> {
  const decision = offlineDecision(readTournament(rt.local.read), judge, readMeta(rt.local.read), rt.clock);
  if (decision.kind !== 'allowed') return decision;
  const creds = await loadDeviceCredentials();
  if (!creds) return { kind: 'needsOnline' };
  let valid: boolean;
  try {
    valid = await verifyPinOffline(pin, creds.pinPepper, {
      judgeId: judge.id,
      pinVersion: judge.pinVersion,
      wrapped: judge.wrappedVerifier as string,
      salt: judge.pinOfflineSalt as string,
      iterations: judge.pinIterations as number,
    });
  } catch (error) {
    if (error instanceof VerifierUnavailableError) return { kind: 'needsOnline' };
    throw error;
  }
  if (!valid) return registerOfflineFailure(rt, judge);
  await startJudgeSession(
    rt.local,
    {
      judge: judgeInput(judge),
      sessionId: uuidv7(rt.clock.now()),
      authMode: 'OFFLINE_PIN',
      enqueueStart: true,
    },
    rt.clock.now(),
  );
  void rt.engine.push();
  return { kind: 'ok', authMode: 'OFFLINE_PIN' };
}

/**
 * Logowanie sędziego PIN-em (IMP-305, FR-508…510): online – `POST /v1/judge-sessions` (serwer liczy
 * próby); bez serwera – weryfikator lokalny (TL-04) w oknie 24 h z lokalnymi limitami prób.
 * PIN żyje tylko w argumentach – nie trafia do stanu, logów ani bazy.
 */
export const JudgeAuth = {
  async login(rt: JudgeRuntime, judgeId: string, pin: string): Promise<LoginResult> {
    const judge = readJudge(rt.local.read, judgeId);
    if (!judge || !judge.isActive) return { kind: 'inactive' };
    // Bez potwierdzonego połączenia (TL-45) najpierw weryfikator lokalny – bez czekania na limit czasu.
    const onlineFirst = network.isOnline() || !readTournament(rt.local.read)?.allowOfflinePinLogin;
    if (onlineFirst) {
      const online = await loginOnline(rt, judge, pin);
      if (online) return online;
    }
    const offline = await loginOffline(rt, readJudge(rt.local.read, judgeId) ?? judge, pin);
    if (offline.kind !== 'needsOnline' || onlineFirst) return offline;
    return (await loginOnline(rt, judge, pin)) ?? offline;
  },
};

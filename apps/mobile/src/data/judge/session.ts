import { createStore, useStore } from 'zustand';
import { tokenStore } from '../api/tokens';
import type { Db, LocalDb } from '../local/LocalDb';
import { outbox } from '../outbox/outbox';
import { endJudgeSessions } from '../sync/apply';
import type { JudgeSessionEndReason } from '../sync/events';

export type AuthMode = 'ONLINE_PIN' | 'OFFLINE_PIN';

/** Zalogowany sędzia (wspólny tablet – naraz jeden). */
export interface ActiveJudge {
  judgeId: string;
  sessionId: string;
  authMode: AuthMode;
  fullName: string;
  initials: string;
  pinVersion: number;
}

/** Ponowny PIN po 15 min w tle i po 2 h bezczynności (FR-511, TC-STATE-006). */
export const REAUTH_BACKGROUND_MS = 15 * 60_000;
export const REAUTH_IDLE_MS = 2 * 3600_000;
/** Zapis `last_activity_at` w SQLite najwyżej co minutę (bez zapisu przy każdym dotknięciu). */
const ACTIVITY_PERSIST_MS = 60_000;

export interface JudgeSessionState {
  active: ActiveJudge | null;
  /** Sesja trwa, ale wymaga ponownego PIN-u (SCR-JDG-02 w wariancie ponownego uwierzytelnienia). */
  reauth: boolean;
  lastActivityAt: number;
  backgroundAt: number | null;
  /** Powód ostatniego zdalnego zakończenia sesji (toast na SCR-JDG-01). */
  ended: JudgeSessionEndReason | null;
  /** Ostatnie zdalne zakończenie (kto, dlaczego) – baner na SCR-JDG-01 do następnego logowania (U7). */
  endedNotice: { judgeName: string; reason: JudgeSessionEndReason } | null;
  /** Sesja odczytana z bazy przy starcie (strażnik tras czeka na `true`). */
  restored: boolean;
}

const initial = (): JudgeSessionState => ({
  active: null,
  reauth: false,
  lastActivityAt: 0,
  backgroundAt: null,
  ended: null,
  endedNotice: null,
  restored: false,
});

export const judgeSessionStore = createStore<JudgeSessionState>()(() => initial());

export const useJudgeSession = <T>(selector: (s: JudgeSessionState) => T): T =>
  useStore(judgeSessionStore, selector);

export const activeJudgeId = () => judgeSessionStore.getState().active?.judgeId ?? null;

interface OpenSessionRow {
  id: string;
  judge_id: string;
  auth_mode: AuthMode;
  pin_version: number;
  last_activity_at: string;
  full_name: string;
  initials: string;
}

/**
 * Odtworzenie otwartej sesji po starcie aplikacji: ostatnia niezakończona sesja aktywnego sędziego.
 * Po przerwie dłuższej niż 15 min wymagany ponowny PIN (jak po powrocie z tła).
 */
export function restoreJudgeSession(db: Db, now: number): void {
  const row = db.getFirstSync<OpenSessionRow>(
    `SELECT s.id, s.judge_id, s.auth_mode, s.pin_version, s.last_activity_at, j.full_name, j.initials
     FROM local_judge_session s JOIN local_judge j ON j.id = s.judge_id
     WHERE s.ended_at IS NULL AND j.is_active = 1 ORDER BY s.started_at DESC LIMIT 1`,
  );
  if (!row) {
    judgeSessionStore.setState({ active: null, reauth: false, restored: true });
    return;
  }
  const last = Date.parse(row.last_activity_at);
  judgeSessionStore.setState({
    active: {
      judgeId: row.judge_id,
      sessionId: row.id,
      authMode: row.auth_mode,
      fullName: row.full_name,
      initials: row.initials,
      pinVersion: row.pin_version,
    },
    reauth: !(now - last < REAUTH_BACKGROUND_MS),
    lastActivityAt: last,
    restored: true,
  });
}

/** `JUDGE_SESSION_ENDED` dla zamykanej sesji offline (serwer zna tylko sesje zgłoszone mutacją). */
function enqueueEnded(db: Db, judgeId: string, now: number) {
  for (const s of db.getAllSync<{ id: string }>(
    "SELECT id FROM local_judge_session WHERE judge_id = ? AND ended_at IS NULL AND auth_mode = 'OFFLINE_PIN'",
    judgeId,
  )) {
    outbox.enqueue(
      db,
      { type: 'JUDGE_SESSION_ENDED', judgeId, authMode: 'OFFLINE_PIN', payload: { judgeSessionId: s.id } },
      now,
    );
  }
}

export interface StartSessionInput {
  judge: { id: string; fullName: string; initials: string; pinVersion: number };
  sessionId: string;
  authMode: AuthMode;
  /** Sesja offline: `JUDGE_SESSION_STARTED` w outboxie (IMP-305 krok 5). */
  enqueueStart: boolean;
}

/**
 * Nowa sesja sędziego w jednej transakcji: zamknięcie otwartych sesji na tablecie (wspólny tablet –
 * jeden sędzia naraz), wiersz `local_judge_session`, zerowanie lokalnych prób PIN.
 */
export async function startJudgeSession(local: LocalDb, input: StartSessionInput, now: number) {
  const nowIso = new Date(now).toISOString();
  const { judge } = input;
  await local.tx((db) => {
    for (const { judge_id } of db.getAllSync<{ judge_id: string }>(
      'SELECT DISTINCT judge_id FROM local_judge_session WHERE ended_at IS NULL',
    )) {
      enqueueEnded(db, judge_id, now);
      endJudgeSessions(db, judge_id, judge_id === judge.id ? 'REPLACED' : 'LOGOUT', nowIso);
    }
    db.runSync(
      `INSERT INTO local_judge_session (id, judge_id, auth_mode, pin_version, started_at, last_activity_at,
         server_token_present) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      input.sessionId,
      judge.id,
      input.authMode,
      judge.pinVersion,
      nowIso,
      nowIso,
      input.authMode === 'ONLINE_PIN' ? 1 : 0,
    );
    db.runSync(
      'UPDATE local_judge SET failed_attempts = 0, lock_level = 0, locked_until = NULL WHERE id = ?',
      judge.id,
    );
    if (input.enqueueStart) {
      outbox.enqueue(
        db,
        {
          type: 'JUDGE_SESSION_STARTED',
          judgeId: judge.id,
          authMode: input.authMode,
          payload: { judgeSessionId: input.sessionId, pinVersion: judge.pinVersion },
        },
        now,
      );
    }
  });
  judgeSessionStore.setState({
    active: {
      judgeId: judge.id,
      sessionId: input.sessionId,
      authMode: input.authMode,
      fullName: judge.fullName,
      initials: judge.initials,
      pinVersion: judge.pinVersion,
    },
    reauth: false,
    lastActivityAt: now,
    backgroundAt: null,
    ended: null,
    endedNotice: null,
    restored: true,
  });
}

/**
 * Wylogowanie (SCR-JDG-09, IMP-306 krok 4): sesja zamknięta, offline – `JUDGE_SESSION_ENDED` w outboxie,
 * token sędziego wyczyszczony (kolejka wysyła się dalej tokenem urządzenia). Szkice zostają.
 */
export async function endActiveSession(
  local: LocalDb,
  now: number,
  reason: JudgeSessionEndReason = 'LOGOUT',
) {
  const active = judgeSessionStore.getState().active;
  if (!active) return;
  await local.tx((db) => {
    enqueueEnded(db, active.judgeId, now);
    endJudgeSessions(db, active.judgeId, reason, new Date(now).toISOString());
  });
  judgeSessionStore.setState({ active: null, reauth: false, backgroundAt: null });
  await tokenStore.setJudge(null);
}

/** Sesja zakończona zdalnie lub odrzuceniem (zdarzenie `judgeSessionEnded` – już zapisane w bazie). */
export async function onSessionEnded(judgeId: string, reason: JudgeSessionEndReason): Promise<void> {
  if (activeJudgeId() !== judgeId) return;
  const judgeName = judgeSessionStore.getState().active?.fullName ?? '';
  judgeSessionStore.setState({
    active: null,
    reauth: false,
    ended: reason,
    endedNotice: { judgeName, reason },
  });
  await tokenStore.setJudge(null);
}

let persistedAt = 0;

/** Interakcja sędziego (dotyk) – licznik bezczynności; do bazy najwyżej co minutę. */
export function touchActivity(local: LocalDb, now: number): void {
  const { active, reauth } = judgeSessionStore.getState();
  if (!active || reauth) return;
  judgeSessionStore.setState({ lastActivityAt: now });
  if (now - persistedAt < ACTIVITY_PERSIST_MS) return;
  persistedAt = now;
  void local.tx((db) =>
    db.runSync(
      'UPDATE local_judge_session SET last_activity_at = ? WHERE id = ?',
      new Date(now).toISOString(),
      active.sessionId,
    ),
  );
}

/** Wymuszenie ponownego PIN-u (nakładka nad bieżącym ekranem – formularz zostaje zamontowany). */
export function requireReauth(): void {
  if (!judgeSessionStore.getState().active) return;
  judgeSessionStore.setState({ reauth: true });
}

/**
 * Reguły ponownego uwierzytelnienia (TC-STATE-006): powrót z tła po ≥ 15 min albo ≥ 2 h bez
 * interakcji. Zwraca `true`, gdy sesja wymaga PIN-u.
 */
export function needsReauth(s: Pick<JudgeSessionState, 'lastActivityAt' | 'backgroundAt'>, now: number) {
  if (s.backgroundAt !== null && now - s.backgroundAt >= REAUTH_BACKGROUND_MS) return true;
  return now - s.lastActivityAt >= REAUTH_IDLE_MS;
}

/** Tylko testy. */
export function resetJudgeSession(): void {
  persistedAt = 0;
  judgeSessionStore.setState(initial(), true);
}

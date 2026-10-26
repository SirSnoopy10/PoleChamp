import { uuidv7 } from '../../../data/api/uuid';
import { readJudge, readTournament } from '../../../data/judge/queries';
import {
  judgeSessionStore,
  needsReauth,
  REAUTH_BACKGROUND_MS,
  REAUTH_IDLE_MS,
  requireReauth,
} from '../../../data/judge/session';
import { network } from '../../../data/network/online';
import { outbox } from '../../../data/outbox/outbox';
import { syncEvents } from '../../../data/sync/events';
import { readMeta } from '../../../data/sync/meta';
import { refreshFromDb } from '../../../data/sync/syncStore';
import {
  JUDGE_ROUTES,
  judgeSnapshot,
  makeVerifier,
  PIN_VECTOR,
  setupJudge,
  signIn,
  startJudge,
  VECTOR_JUDGE_ID,
} from '../../../test-utils/judge';
import { act, fireEvent, screen, waitFor } from '../../../test-utils/render';
import { json, problemResponse } from '../../../test-utils/sync';
import { JudgeAuth } from '../auth/JudgeAuth';
import { VERIFY_DELAY_MS } from '../PinScreen';
import { elapsedSinceSync, lockSeconds, offlineDecision, OFFLINE_WINDOW_MS } from '../auth/offlinePolicy';

const env = setupJudge();

/** Wpisanie PIN-u i odczekanie 160 ms (`renderRouter` włącza fałszywe timery Jest). */
async function typePin(pin: string) {
  const login = jest.spyOn(JudgeAuth, 'login');
  for (const d of pin) await fireEvent.press(screen.getByTestId(`pin-key-${d}`));
  await act(async () => {
    jest.advanceTimersByTime(VERIFY_DELAY_MS);
  });
  // Weryfikacja (HTTP, PBKDF2) biegnie poza fałszywymi timerami – czekamy na jej wynik.
  await act(async () => {
    await login.mock.results.at(-1)?.value;
  });
  login.mockRestore();
}

/** Odliczanie blokady (timer co 1 s – każdy krok po ponownym renderze). */
async function tick(seconds: number) {
  for (let i = 0; i < seconds; i++) {
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
  }
}

/** Sędzia jA z szybkim weryfikatorem (PIN 1234, 1000 iteracji) – testy limitów prób. */
async function fastVerifier(pin = '1234') {
  const v = makeVerifier('jA', pin);
  await env.local.tx((db) =>
    db.runSync(
      'UPDATE local_judge SET wrapped_verifier = ?, pin_offline_salt = ?, pin_iterations = ? WHERE id = ?',
      v.wrapped,
      v.salt,
      v.iterations,
      'jA',
    ),
  );
}

describe('IMP-303: wybór profilu (SCR-JDG-01)', () => {
  it('TC-E2E-JDG-004: aktywni sędziowie wg position, zablokowany z „PIN zablokowany”, nieaktywny ukryty', async () => {
    await env.local.tx((db) => {
      db.runSync("UPDATE local_judge SET pin_locked = 1 WHERE id = 'jB'");
      db.runSync("UPDATE local_judge SET is_active = 0 WHERE id = 'jC'");
    });
    const r = await startJudge(JUDGE_ROUTES, '/profiles');
    expect(r.getPathname()).toBe('/profiles');
    expect(screen.getByText('Panel sędziego')).toBeOnTheScreen();
    expect(screen.getByTestId('tournament-name')).toHaveTextContent('Puchar Polski');
    expect(screen.getByText('Wybierz swój profil')).toBeOnTheScreen();
    expect(screen.getByTestId(`profile-${VECTOR_JUDGE_ID}`)).toBeOnTheScreen();
    expect(screen.queryByTestId('profile-jC')).toBeNull();
    expect(screen.getByTestId('profile-jB')).toHaveAccessibleName('Sędzia jB, sędzia, PIN zablokowany');
    expect(screen.getAllByText('PIN zablokowany')).toHaveLength(1);
    await fireEvent.press(screen.getByTestId('profile-jA'));
    expect(r.getPathname()).toBe('/pin/jA');
  });

  it('TC-EDGE-056: brak sędziów – „Organizator nie dodał jeszcze sędziów.”', async () => {
    await env.local.tx((db) => db.runSync('UPDATE local_judge SET is_active = 0'));
    await startJudge(JUDGE_ROUTES, '/profiles');
    expect(screen.getByTestId('profiles-empty')).toHaveTextContent('Organizator nie dodał jeszcze sędziów.');
  });

  it('TC-EDGE-026: 30 sędziów – siatka 3 kolumn w przewijanym widoku', async () => {
    await env.local.tx((db) => {
      for (let i = 0; i < 27; i++) {
        db.runSync(
          `INSERT INTO local_judge (id, full_name, initials, position, is_active, pin_locked, pin_version)
           VALUES (?, ?, 'X', ?, 1, 0, 1)`,
          `x${i}`,
          `Sędzia o bardzo długim nazwisku numer ${i}`,
          10 + i,
        );
      }
    });
    await startJudge(JUDGE_ROUTES, '/profiles');
    expect(screen.getAllByTestId(/^profile-/)).toHaveLength(31);
  });

  it('TC-E2E-JDG-027: turniej zakończony – „Sparuj z nowym turniejem” zablokowany przy kolejce, potem czyści dane', async () => {
    await env.local.tx((db) => db.runSync("UPDATE local_tournament SET status = 'FINISHED'"));
    // Sesja offline zakończona, `JUDGE_SESSION_STARTED` niewysłane – kolejka niepusta.
    await signIn(env, 'jA');
    judgeSessionStore.setState({ active: null });
    refreshFromDb(env.local.read);
    await startJudge(JUDGE_ROUTES, '/profiles');
    expect(screen.getByText('Turniej „Puchar Polski” został zakończony.')).toBeOnTheScreen();
    expect(screen.getByTestId('pair-new')).toBeDisabled();
    expect(screen.getByTestId('send-first')).toHaveTextContent(
      'Najpierw wyślij 1 ocenę – połącz tablet z internetem.',
    );
    await act(async () => {
      await env.local.tx((db) => db.runSync('DELETE FROM outbox'));
      refreshFromDb(env.local.read);
    });
    expect(screen.getByTestId('pair-new')).toBeEnabled();
    await fireEvent.press(screen.getByTestId('pair-new'));
    expect(screen.getByText('Dane tego turnieju zostaną usunięte z tabletu.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('pair-new-confirm'));
    await waitFor(() => expect(screen.getByTestId('pair-screen')).toBeOnTheScreen());
    expect(readTournament(env.local.read)).toBeNull();
  });
});

describe('IMP-304: klawiatura PIN (SCR-JDG-02)', () => {
  it('TC-UI-018 / TC-A11Y-014: kropki 0–4, backspace, etykiety bez wartości cyfr', async () => {
    await fastVerifier();
    await startJudge(JUDGE_ROUTES, '/pin/jA');
    const dots = () => screen.getAllByTestId('pin-dot-filled').length;
    expect(screen.queryAllByTestId('pin-dot-filled')).toHaveLength(0);
    for (const d of '123') await fireEvent.press(screen.getByTestId(`pin-key-${d}`));
    expect(dots()).toBe(3);
    expect(screen.getByTestId('pin-dots')).toHaveAccessibleName('Wpisano 3 z 4 cyfr');
    await fireEvent.press(screen.getByTestId('pin-key-back'));
    expect(dots()).toBe(2);
    expect(screen.getByTestId('pin-key-back')).toHaveAccessibleName('Usuń cyfrę');
    expect(screen.getByTestId('pin-key-7')).toHaveAccessibleName('Cyfra 7');
    expect(screen.queryByText('12')).toBeNull();
  });

  it('TC-EDGE-029: 6 szybkich cyfr – przyjęte 4, jedna weryfikacja', async () => {
    await fastVerifier();
    const login = jest.spyOn(JudgeAuth, 'login');
    const r = await startJudge(JUDGE_ROUTES, '/pin/jA');
    for (const d of '123456') await fireEvent.press(screen.getByTestId(`pin-key-${d}`));
    await act(async () => {
      jest.advanceTimersByTime(VERIFY_DELAY_MS);
    });
    await waitFor(() => expect(r.getPathname()).toBe('/categories'));
    expect(login).toHaveBeenCalledTimes(1);
    expect(login.mock.calls[0]?.[2]).toBe('1234');
    login.mockRestore();
  });

  it('TC-E2E-JDG-005: zły PIN – komunikat i wyczyszczenie; „Zmień sędziego” wraca do profili', async () => {
    await fastVerifier();
    const r = await startJudge(JUDGE_ROUTES, '/pin/jA');
    expect(screen.getByText('Wpisz 4-cyfrowy PIN')).toBeOnTheScreen();
    await typePin('9999');
    await waitFor(() =>
      expect(screen.getByTestId('pin-message')).toHaveTextContent('Nieprawidłowy PIN — spróbuj ponownie'),
    );
    expect(screen.queryAllByTestId('pin-dot-filled')).toHaveLength(0);
    await fireEvent.press(screen.getByTestId('pin-key-1'));
    expect(screen.queryByTestId('pin-message')).toBeNull();
    await fireEvent.press(screen.getByText('Zmień sędziego'));
    expect(r.getPathname()).toBe('/profiles');
  });
});

describe('IMP-305: logowanie online / offline (SCR-JDG-08)', () => {
  it('TC-E2E-JDG-008: offline z prawdziwym weryfikatorem (PBKDF2 600k) – sesja OFFLINE_PIN i JUDGE_SESSION_STARTED', async () => {
    const r = await startJudge(JUDGE_ROUTES, `/pin/${VECTOR_JUDGE_ID}`);
    await typePin(PIN_VECTOR.pin);
    await waitFor(() => expect(r.getPathname()).toBe('/categories'), { timeout: 5000 });
    expect(screen.getByText('Dzień dobry, Katarzyna')).toBeOnTheScreen();
    expect(judgeSessionStore.getState().active).toMatchObject({
      judgeId: VECTOR_JUDGE_ID,
      authMode: 'OFFLINE_PIN',
    });
    const types = env.local.read
      .getAllSync<{ type: string }>('SELECT type FROM outbox ORDER BY seq')
      .map((m) => m.type);
    expect(types).toContain('JUDGE_SESSION_STARTED');
    expect(screen.getByTestId('sync-pill')).toBeOnTheScreen();
  }, 15_000);

  it('TC-E2E-JDG-008: synchronizacja 25 h temu – „Połącz tablet z internetem, aby się zalogować.”', async () => {
    await fastVerifier();
    env.clock.advance(25 * 3600_000);
    await startJudge(JUDGE_ROUTES, '/pin/jA');
    await typePin('1234');
    await waitFor(() =>
      expect(screen.getByTestId('pin-message')).toHaveTextContent(
        'Połącz tablet z internetem, aby się zalogować.',
      ),
    );
  });

  it('online: POST /v1/judge-sessions → token sędziego, sesja ONLINE_PIN, własne arkusze', async () => {
    network.reportHttpSuccess();
    env.routes.set('POST /v1/judge-sessions', () =>
      json({ judgeToken: 'jdg-token', sessionId: uuidv7(), expiresIn: 3600 }, 201),
    );
    const r = await startJudge(JUDGE_ROUTES, '/pin/jA');
    await typePin('5555');
    await waitFor(() => expect(r.getPathname()).toBe('/categories'));
    expect(env.calls.find((c) => c.path === '/v1/judge-sessions')?.body).toEqual({
      judgeId: 'jA',
      pin: '5555',
    });
    expect(judgeSessionStore.getState().active?.authMode).toBe('ONLINE_PIN');
    await waitFor(() => expect(env.calls.some((c) => c.path === '/v1/judge/me/score-sheets')).toBe(true));
  });

  it('online: PIN_LOCKED z retryAfter – odliczanie i klawiatura nieaktywna; requiresReset – kłódka', async () => {
    network.reportHttpSuccess();
    env.routes.set('POST /v1/judge-sessions', () =>
      json({ status: 423, code: 'PIN_LOCKED', title: 'x', retryAfterSeconds: 30 }, 423),
    );
    await startJudge(JUDGE_ROUTES, '/pin/jA');
    await typePin('1111');
    await waitFor(() =>
      expect(screen.getByTestId('pin-message')).toHaveTextContent('Zbyt wiele prób. Spróbuj za 30 s.'),
    );
    expect(screen.getByTestId('pin-key-1')).toBeDisabled();
    await tick(10);
    expect(screen.getByTestId('pin-message')).toHaveTextContent('Zbyt wiele prób. Spróbuj za 20 s.');
    await tick(20);
    expect(screen.getByTestId('pin-key-1')).toBeEnabled();
  });

  it('TC-E2E-JDG-007: blokada do resetu – „PIN zablokowany. Poproś organizatora o reset.”, klawiatura ukryta', async () => {
    network.reportHttpSuccess();
    env.routes.set('POST /v1/judge-sessions', () =>
      json({ status: 423, code: 'PIN_LOCKED', title: 'x', requiresReset: true }, 423),
    );
    await startJudge(JUDGE_ROUTES, '/pin/jA');
    await typePin('1111');
    await waitFor(() =>
      expect(screen.getByTestId('pin-message')).toHaveTextContent(
        'PIN zablokowany. Poproś organizatora o reset.',
      ),
    );
    expect(screen.queryByTestId('pin-pad')).toBeNull();
    expect(screen.getByTestId('pin-locked-icon', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.getByText('Zmień sędziego')).toBeOnTheScreen();
  });

  it('online PIN_INVALID → komunikat; błąd sieci → ścieżka offline', async () => {
    await fastVerifier();
    network.reportHttpSuccess();
    env.routes.set('POST /v1/judge-sessions', () => problemResponse(401, 'PIN_INVALID'));
    await startJudge(JUDGE_ROUTES, '/pin/jA');
    await typePin('1234');
    await waitFor(() =>
      expect(screen.getByTestId('pin-message')).toHaveTextContent('Nieprawidłowy PIN — spróbuj ponownie'),
    );
    env.routes.set('POST /v1/judge-sessions', () => {
      throw new TypeError('Network request failed');
    });
    await typePin('1234');
    await waitFor(() => expect(judgeSessionStore.getState().active?.authMode).toBe('OFFLINE_PIN'));
  });

  it('TC-STATE-004 / TC-E2E-JDG-006: 5 błędów → 30 s, potem 60, 120…900 s; blokada w SQLite przetrwa restart', async () => {
    await fastVerifier();
    const expected = [30, 60, 120, 240, 480, 900];
    for (const seconds of expected) {
      for (let i = 1; i <= 5; i++) {
        const res = await JudgeAuth.login(env.rt, 'jA', '0000');
        expect(res).toEqual(i < 5 ? { kind: 'invalid' } : { kind: 'locked', seconds });
      }
      // „Restart”: stan wyłącznie z bazy – logowanie odrzucone do końca blokady.
      expect(await JudgeAuth.login(env.rt, 'jA', '1234')).toEqual({ kind: 'locked', seconds });
      env.clock.advance(seconds * 1000);
    }
    const reports = outbox.pending(env.local.read).filter((m) => m.type === 'PIN_ATTEMPTS_REPORT');
    expect(reports).toHaveLength(6);
    expect(reports[0]?.mutation.payload).toMatchObject({ failedCount: 5 });
    expect(await JudgeAuth.login(env.rt, 'jA', '1234')).toEqual({ kind: 'ok', authMode: 'OFFLINE_PIN' });
    expect(readJudge(env.local.read, 'jA')).toMatchObject({
      failedAttempts: 0,
      lockLevel: 0,
      lockedUntil: null,
    });
  });

  it('TC-STATE-004: lockSeconds – eskalacja z limitem 15 min', () => {
    expect([1, 2, 3, 4, 5, 6, 7].map(lockSeconds)).toEqual([30, 60, 120, 240, 480, 900, 900]);
  });

  it('TC-STATE-005: warunki logowania offline (zgoda, 24 h, restart, cofnięty zegar, blokady, wersja PIN)', async () => {
    const judge = readJudge(env.local.read, VECTOR_JUDGE_ID)!;
    const tournament = readTournament(env.local.read)!;
    const meta = () => readMeta(env.local.read);
    const decide = (over: Partial<typeof judge> = {}, t = tournament) =>
      offlineDecision(t, { ...judge, ...over }, meta(), env.clock).kind;

    expect(decide()).toBe('allowed');
    expect(decide({}, { ...tournament, allowOfflinePinLogin: false })).toBe('needsOnline');
    expect(decide({ pinLocked: true })).toBe('lockedReset');
    env.clock.advance(3 * 3600_000);
    expect(decide()).toBe('allowed');
    env.clock.advance(22 * 3600_000);
    expect(decide()).toBe('needsOnline');

    // Restart systemu: zegar ścienny; cofnięty poniżej czasu synchronizacji – przekroczenie.
    const synced = meta().lastSyncWallMs!;
    env.clock.restart();
    env.clock.setWall(synced + 3 * 3600_000);
    expect(elapsedSinceSync(meta(), env.clock)).toBe(3 * 3600_000);
    expect(decide()).toBe('allowed');
    env.clock.setWall(synced - 3600_000);
    expect(decide()).toBe('needsOnline');
    env.clock.setWall(synced + OFFLINE_WINDOW_MS);
    expect(decide()).toBe('needsOnline');

    // Niezgodna wersja PIN-u: weryfikator się nie odszyfrowuje → logowanie wymaga sieci.
    env.clock.setWall(synced + 3600_000);
    await env.local.tx((db) =>
      db.runSync('UPDATE local_judge SET pin_version = 2 WHERE id = ?', VECTOR_JUDGE_ID),
    );
    expect(await JudgeAuth.login(env.rt, VECTOR_JUDGE_ID, PIN_VECTOR.pin)).toEqual({ kind: 'needsOnline' });
  }, 15_000);
});

describe('IMP-306: sesja sędziego i wylogowanie (SCR-JDG-09)', () => {
  it('TC-STATE-006: ponowny PIN po 15 min w tle i po 2 h bezczynności', () => {
    const t0 = 1_000_000;
    expect(needsReauth({ lastActivityAt: t0, backgroundAt: t0 }, t0 + REAUTH_BACKGROUND_MS - 1000)).toBe(
      false,
    );
    expect(needsReauth({ lastActivityAt: t0, backgroundAt: t0 }, t0 + REAUTH_BACKGROUND_MS)).toBe(true);
    expect(needsReauth({ lastActivityAt: t0, backgroundAt: null }, t0 + REAUTH_IDLE_MS - 60_000)).toBe(false);
    expect(needsReauth({ lastActivityAt: t0, backgroundAt: null }, t0 + REAUTH_IDLE_MS)).toBe(true);
  });

  it('TC-E2E-JDG-020 / TC-EDGE-046: ponowne uwierzytelnienie – PIN tego sędziego z „Wyloguj”, powrót na ekran', async () => {
    await fastVerifier();
    await signIn(env, 'jA');
    const r = await startJudge(JUDGE_ROUTES, '/category/c1?entry=e1');
    expect(screen.getByTestId('score-form')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('criterion-k1-plus'));
    expect(screen.getByTestId('criterion-k1-value')).toHaveTextContent('5,5');
    await act(async () => requireReauth());
    expect(screen.getByTestId('reauth-overlay')).toBeOnTheScreen();
    expect(screen.getByTestId('pin-logout')).toBeOnTheScreen();
    expect(screen.queryByText('Zmień sędziego')).toBeNull();
    await typePin('1234');
    await waitFor(() => expect(screen.queryByTestId('reauth-overlay')).toBeNull());
    // Ten sam ekran i formularz z wpisaną wartością; nic nie zatwierdzono automatycznie.
    expect(r.getPathname()).toBe('/category/c1');
    expect(screen.getByTestId('criterion-k1-value')).toHaveTextContent('5,5');
    expect(env.local.read.getFirstSync('SELECT COUNT(*) AS n FROM local_score_sheet')).toEqual({ n: 0 });
  });

  it('TC-STATE-006: po 15 min w tle – nakładka PIN tego sędziego; „Wyloguj” kończy sesję', async () => {
    await fastVerifier();
    await signIn(env, 'jA');
    const r = await startJudge(JUDGE_ROUTES, '/categories');
    judgeSessionStore.setState({ backgroundAt: env.clock.now() });
    env.clock.advance(REAUTH_BACKGROUND_MS);
    await act(async () => {
      jest.advanceTimersByTime(60_000);
    });
    expect(screen.getByTestId('reauth-overlay')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('pin-logout'));
    await waitFor(() => expect(r.getPathname()).toBe('/profiles'));
  });

  it('TC-UI-015 / TC-E2E-JDG-019: wylogowanie z kolejką – dialog „Masz 2 niewysłane oceny…”, Anuluj / Wyloguj', async () => {
    await signIn(env, 'jA');
    await env.local.tx((db) =>
      outbox.enqueue(db, {
        type: 'PIN_ATTEMPTS_REPORT',
        judgeId: 'jA',
        authMode: 'OFFLINE_PIN',
        payload: { failedCount: 5, lockedUntil: null },
      }),
    );
    const r = await startJudge(JUDGE_ROUTES, '/categories');
    await fireEvent.press(screen.getByTestId('judge-logout'));
    expect(screen.getByText('Wylogować się?')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Masz 2 niewysłane oceny. Zostaną wysłane automatycznie, gdy tablet połączy się z siecią.',
      ),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Anuluj'));
    expect(screen.queryByText('Wylogować się?')).toBeNull();
    expect(r.getPathname()).toBe('/categories');
    await fireEvent.press(screen.getByTestId('judge-logout'));
    await fireEvent.press(screen.getByTestId('logout-confirm'));
    await waitFor(() => expect(r.getPathname()).toBe('/profiles'));
    // Sesja offline zamknięta mutacją – wysyłka idzie dalej tokenem urządzenia (TC-EDGE-060).
    const types = env.local.read.getAllSync<{ type: string }>('SELECT type FROM outbox').map((m) => m.type);
    expect(types).toContain('JUDGE_SESSION_ENDED');
  });

  it('TC-E2E-JDG-020: pusta kolejka – wylogowanie natychmiastowe (sesja online: DELETE /judge-sessions/current)', async () => {
    await signIn(env, 'jA', 'ONLINE_PIN');
    network.reportHttpSuccess();
    const r = await startJudge(JUDGE_ROUTES, '/categories');
    await fireEvent.press(screen.getByTestId('judge-logout'));
    await waitFor(() => expect(r.getPathname()).toBe('/profiles'));
    expect(env.calls.some((c) => c.method === 'DELETE' && c.path === '/v1/judge-sessions/current')).toBe(
      true,
    );
  });

  it('TC-E2E-JDG-021: session.revoked REPLACED – wybór profilu z „Zalogowano Cię na innym urządzeniu.”', async () => {
    await signIn(env, 'jA', 'ONLINE_PIN');
    const r = await startJudge(JUDGE_ROUTES, '/categories');
    await act(async () => {
      env.rt.engine.onSessionRevoked({ reason: 'REPLACED', judgeId: 'jA' } as never);
      await env.local.tx(() => undefined);
    });
    await waitFor(() => expect(r.getPathname()).toBe('/profiles'));
    expect(screen.getByText('Zalogowano Cię na innym urządzeniu.')).toBeOnTheScreen();
  });

  it('TC-EDGE-047: szkic per sędzia – po wylogowaniu jA formularz jB nie widzi wartości jA', async () => {
    await signIn(env, 'jA');
    await env.local.tx((db) =>
      db.runSync(
        "INSERT INTO local_draft (judge_id, entry_id, payload, updated_at) VALUES ('jA', 'e1', ?, '2026-10-26')",
        JSON.stringify({ criteria: { k1: 95 }, penalties: {}, comment: '' }),
      ),
    );
    await signIn(env, 'jB');
    await startJudge(JUDGE_ROUTES, '/category/c1?entry=e1');
    expect(screen.getByTestId('criterion-k1-value')).toHaveTextContent('5,0');
  });

  it('TC-UI-025: nagłówek – gavel, „Panel sędziego”, turniej, pigułka, chip sędziego, wylogowanie', async () => {
    await signIn(env, VECTOR_JUDGE_ID);
    await startJudge(JUDGE_ROUTES, '/categories');
    const header = screen.getByTestId('judge-header');
    expect(header).toHaveTextContent(/Panel sędziego/);
    expect(screen.getByTestId('judge-header-tournament')).toHaveTextContent('Puchar Polski');
    expect(screen.getByTestId('judge-header-gavel', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.getByTestId('judge-chip')).toHaveTextContent('KNKatarzyna Nowak');
    expect(screen.getByTestId('judge-logout')).toHaveAccessibleName('Wyloguj');
    expect(screen.getByTestId('sync-pill')).toBeOnTheScreen();
  });

  it('zdarzenie judgeSessionEnded innego sędziego nie wylogowuje bieżącego', async () => {
    await signIn(env, 'jA');
    await act(async () =>
      syncEvents.emit([{ type: 'judgeSessionEnded', judgeId: 'jB', reason: 'PIN_CHANGED' }]),
    );
    expect(judgeSessionStore.getState().active?.judgeId).toBe('jA');
    expect(judgeSnapshot().judges).toHaveLength(4);
  });
});

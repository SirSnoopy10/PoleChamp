import * as Camera from 'expo-camera';
import { tokenStore } from '../../../data/api/tokens';
import { DEVICE_KEYS, loadDeviceCredentials } from '../../../data/auth/deviceAuth';
import { secureStorage } from '../../../data/api/tokens';
import { readTournament } from '../../../data/judge/queries';
import { judgeSessionStore } from '../../../data/judge/session';
import { outbox } from '../../../data/outbox/outbox';
import { readMeta } from '../../../data/sync/meta';
import { syncStore } from '../../../data/sync/syncStore';
import {
  JUDGE_ROUTES,
  judgeSnapshot,
  PIN_VECTOR,
  setupJudge,
  signIn,
  startJudge,
} from '../../../test-utils/judge';
import { act, fireEvent, screen, waitFor } from '../../../test-utils/render';
import { json, problemResponse } from '../../../test-utils/sync';
import { bootstrapJudge } from '../bootstrap';
import { buildPendingExport } from '../exportPending';
import { maskPairingCode, parsePairingLink } from '../../pairing/pairing';
import { TabletDataLifecycle, TOURNAMENT_RETENTION_MS } from '../TabletDataLifecycle';

const env = setupJudge();
const setPermission = (Camera as unknown as { __setPermission: (p: object | null) => void }).__setPermission;

const pairResponse = {
  deviceId: 'dev-2',
  deviceSecret: 'x'.repeat(40),
  pinPepper: PIN_VECTOR.pinPepper,
  tournament: { id: 't1', name: 'Puchar Polski' },
};

/** Tablet niesparowany: bez poświadczeń, tokenu i danych turnieju. */
async function unpaired() {
  await act(async () => {
    await TabletDataLifecycle.wipeAll(env.local);
  });
  expect(tokenStore.getState().device).toBeNull();
}

afterEach(() => setPermission({ granted: true, canAskAgain: true }));

describe('IMP-301: parowanie tabletu (SCR-JDG-06)', () => {
  it('maska kodu i odczyt linku QR', () => {
    expect(maskPairingCode('k7qm4ztx')).toBe('K7QM-4ZTX');
    expect(maskPairingCode('K7Q')).toBe('K7Q');
    expect(parsePairingLink('polechamp://pair?c=K7QM4ZTX&t=01a17987-7fa9-7787-a7a4-4607ae877f78')).toEqual({
      code: 'K7QM4ZTX',
      tournamentId: '01a17987-7fa9-7787-a7a4-4607ae877f78',
    });
    expect(parsePairingLink('https://polechamp.app/pair?c=k7qm-4ztx')).toEqual({
      code: 'K7QM4ZTX',
      tournamentId: null,
    });
    expect(parsePairingLink('https://example.com/pair?c=K7QM4ZTX')).toBeNull();
  });

  it('TC-E2E-JDG-001: kod → sekret i pepper w SecureStore → token → migawka → wybór profilu', async () => {
    await unpaired();
    env.routes.set('POST /v1/devices/pair', () => json(pairResponse, 201));
    const r = await startJudge(JUDGE_ROUTES, '/pair');
    expect(screen.getByText('Sparuj tablet z turniejem')).toBeOnTheScreen();
    expect(screen.getByText('Zeskanuj kod QR')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByTestId('pair-code'), 'k7qm4ztx');
    expect(screen.getByTestId('pair-code')).toHaveDisplayValue('K7QM-4ZTX');
    await fireEvent.changeText(screen.getByTestId('pair-device-name'), 'Tablet stół 1');
    await fireEvent.press(screen.getByTestId('pair-connect'));
    await waitFor(() => expect(r.getPathname()).toBe('/profiles'));
    expect(env.calls.find((c) => c.path === '/v1/devices/pair')?.body).toMatchObject({
      code: 'K7QM4ZTX',
      deviceName: 'Tablet stół 1',
    });
    expect(await loadDeviceCredentials()).toMatchObject({
      deviceId: 'dev-2',
      pinPepper: PIN_VECTOR.pinPepper,
    });
    expect(readTournament(env.local.read)?.name).toBe('Puchar Polski');
    expect(screen.getByText('Wybierz swój profil')).toBeOnTheScreen();
  });

  it('TC-E2E-JDG-002 / TC-EDGE-069: brak kamery, zły kod, brak sieci', async () => {
    await unpaired();
    setPermission({ granted: false, canAskAgain: false });
    env.routes.set('POST /v1/devices/pair', () => problemResponse(400, 'PAIRING_CODE_INVALID'));
    await startJudge(JUDGE_ROUTES, '/pair');
    expect(screen.getByText('Brak dostępu do kamery. Wpisz kod ręcznie.')).toBeOnTheScreen();
    expect(screen.getByTestId('pair-open-settings')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByTestId('pair-code'), 'K7QM-4ZTY');
    await fireEvent.press(screen.getByTestId('pair-connect'));
    await waitFor(() =>
      expect(screen.getByTestId('pair-error')).toHaveTextContent('Kod jest nieprawidłowy lub wygasł.'),
    );
    env.routes.set('POST /v1/devices/pair', () => {
      throw new TypeError('Network request failed');
    });
    await fireEvent.press(screen.getByTestId('pair-connect'));
    await waitFor(() =>
      expect(screen.getByTestId('pair-error')).toHaveTextContent('Parowanie wymaga połączenia z internetem.'),
    );
    env.routes.set('POST /v1/devices/pair', () => problemResponse(409, 'LIMIT_EXCEEDED'));
    await fireEvent.press(screen.getByTestId('pair-connect'));
    await waitFor(() => expect(screen.getByTestId('pair-error')).toHaveTextContent('Osiągnięto limit (20).'));
    expect(tokenStore.getState().device).toBeNull();
  });
});

describe('IMP-302: rozruch tabletu (SCR-JDG-00)', () => {
  it('TC-E2E-JDG-003: online – token, odtworzenie IN_FLIGHT, push i pull; etapy splashu', async () => {
    await signIn(env, 'jA');
    await env.local.tx((db) => db.runSync("UPDATE outbox SET state = 'IN_FLIGHT'"));
    const stages: string[] = [];
    await bootstrapJudge(env.rt, (s) => stages.push(s));
    expect(stages).toEqual(['connecting', 'loadingStartLists', 'ready']);
    const paths = env.calls.map((c) => c.path.split('?')[0]);
    expect(paths.slice(0, 1)).toEqual(['/v1/devices/token']);
    expect(paths).toContain('/v1/sync/push');
    expect(paths).toContain('/v1/sync/changes');
    expect(outbox.countPending(env.local.read)).toBe(0);
    expect(judgeSessionStore.getState()).toMatchObject({ restored: true, active: { judgeId: 'jA' } });
    env.rt.engine.stop();
  });

  it('TC-E2E-JDG-003: offline – start na danych lokalnych (bez wyjątku), „gotowe”', async () => {
    env.routes.set('POST /v1/devices/token', () => {
      throw new TypeError('Network request failed');
    });
    env.routes.set('GET /v1/sync/changes', () => {
      throw new TypeError('Network request failed');
    });
    const stages: string[] = [];
    await bootstrapJudge(env.rt, (s) => stages.push(s));
    expect(stages.at(-1)).toBe('ready');
    expect(readTournament(env.local.read)?.name).toBe('Puchar Polski');
    expect(syncStore.getState().revoked).toBe(false);
    env.rt.engine.stop();
  });

  it('DEVICE_REVOKED przy tokenie → SCR-JDG-10; niesparowany → SCR-JDG-06', async () => {
    env.routes.set('POST /v1/devices/token', () => problemResponse(401, 'DEVICE_REVOKED'));
    await bootstrapJudge(env.rt, () => undefined);
    expect(syncStore.getState().revoked).toBe(true);
    const r = await startJudge(JUDGE_ROUTES, '/profiles');
    expect(r.getPathname()).toBe('/revoked');
  });
});

describe('IMP-318: urządzenie odłączone (SCR-JDG-10)', () => {
  it('TC-E2E-JDG-026 / TC-SYNC-030: liczba niewysłanych, eksport JSON bez sekretów, „Sparuj ponownie”', async () => {
    await signIn(env, 'jA');
    await act(async () => {
      env.rt.engine.onSessionRevoked({ reason: 'DEVICE_REVOKED', judgeId: null } as never);
      await env.local.tx(() => undefined);
    });
    expect(judgeSessionStore.getState().active).toBeNull();
    const r = await startJudge(JUDGE_ROUTES, '/categories');
    expect(r.getPathname()).toBe('/revoked');
    expect(screen.getByText('To urządzenie zostało odłączone od turnieju')).toBeOnTheScreen();
    expect(screen.getByTestId('revoked-pending')).toHaveTextContent('Na tablecie jest 1 niewysłana ocena.');
    expect(screen.getByText('Eksportuj niewysłane oceny')).toBeOnTheScreen();

    const exported = buildPendingExport(env.local.read, 'dev-1', new Date('2026-10-26T12:00:00Z'));
    expect(exported.tournament).toEqual({ id: 't1', name: 'Puchar Polski' });
    expect(exported.mutations.map((m) => m.type)).toEqual(['JUDGE_SESSION_STARTED']);
    expect(JSON.stringify(exported)).not.toMatch(/secret|pepper|token|"pin"/i);

    await fireEvent.press(screen.getByTestId('revoked-pair'));
    await waitFor(() => expect(r.getPathname()).toBe('/pair'));
    expect(await secureStorage.get(DEVICE_KEYS.secret)).toBeNull();
    expect(outbox.countPending(env.local.read)).toBe(1);
  });

  it('„Wyczyść dane” z potwierdzeniem – baza i SecureStore puste', async () => {
    await act(async () => {
      env.rt.engine.onSessionRevoked({ reason: 'DEVICE_REVOKED', judgeId: null } as never);
      await env.local.tx(() => undefined);
    });
    const r = await startJudge(JUDGE_ROUTES, '/revoked');
    await fireEvent.press(screen.getByTestId('revoked-wipe'));
    expect(
      screen.getByText('Dane turnieju, w tym niewysłane oceny, zostaną usunięte z tabletu.'),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('wipe-confirm'));
    await waitFor(() => expect(r.getPathname()).toBe('/pair'));
    expect(readTournament(env.local.read)).toBeNull();
    expect(await loadDeviceCredentials()).toBeNull();
  });
});

describe('IMP-319: cykl życia danych tabletu', () => {
  it('TC-SYNC-037 / TC-EDGE-059: usunięcie 7 dni po zakończeniu, tylko przy pustej kolejce', async () => {
    await env.local.tx((db) =>
      db.runSync("UPDATE sync_meta SET tournament_finished_at = '2026-10-26T10:00:00.000Z'"),
    );
    env.clock.advance(6 * 24 * 3600_000);
    expect(await TabletDataLifecycle.autoWipe(env.local, env.clock.now())).toBe(false);
    env.clock.advance(2 * 24 * 3600_000);
    await signIn(env, 'jA');
    expect(await TabletDataLifecycle.autoWipe(env.local, env.clock.now())).toBe(false);
    await env.local.tx((db) => db.runSync('DELETE FROM outbox'));
    expect(env.clock.now() - Date.parse('2026-10-26T10:00:00.000Z')).toBeGreaterThan(TOURNAMENT_RETENTION_MS);
    expect(await TabletDataLifecycle.autoWipe(env.local, env.clock.now())).toBe(true);
    for (const table of [
      'local_judge',
      'local_entry',
      'local_score_sheet',
      'local_draft',
      'local_judge_session',
    ]) {
      expect(env.local.read.getFirstSync(`SELECT COUNT(*) AS n FROM ${table}`)).toEqual({ n: 0 });
    }
    expect(readMeta(env.local.read)).toMatchObject({
      tournamentId: null,
      cursor: 0,
      tournamentFinishedAt: null,
    });
    expect(await loadDeviceCredentials()).toBeNull();
  });

  it('wipeTournament z keepPending – niewysłane mutacje zostają, reszta danych usunięta', async () => {
    await signIn(env, 'jA');
    await TabletDataLifecycle.wipeTournament(env.local, { keepPending: true });
    expect(outbox.countPending(env.local.read)).toBe(1);
    expect(readTournament(env.local.read)).toBeNull();
    expect(judgeSnapshot().tournament.id).toBe('t1');
  });
});

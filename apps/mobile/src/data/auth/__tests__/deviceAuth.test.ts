import * as SecureStore from 'expo-secure-store';
import { storage } from '../../../storage/mmkv';
import { tokenStore } from '../../api/tokens';
import { applySnapshot } from '../../sync/snapshot';
import { pushOnce } from '../../sync/push';
import { submitSheet } from '../../sync/submit';
import {
  fakeApi,
  fakeSyncServer,
  json,
  openTestDb,
  problemResponse,
  snapshotFixture,
  testClock,
} from '../../../test-utils/sync';
import {
  clearDeviceCredentials,
  createDeviceAuth,
  DEVICE_KEYS,
  loadDeviceCredentials,
  saveDeviceCredentials,
} from '../deviceAuth';

const PAIR = {
  deviceId: 'd1',
  deviceSecret: 's'.repeat(43),
  pinPepper: 'A'.repeat(43) + '=',
  tournament: { id: 't1', name: 'Puchar' },
};

const secureStore = (SecureStore as unknown as { __store: Map<string, string> }).__store;

describe('uwierzytelnianie urządzenia (IMP-356)', () => {
  afterEach(async () => {
    await clearDeviceCredentials();
    tokenStore.reset();
  });

  it('pobiera token sekretem z SecureStore i odświeża 5 min przed wygaśnięciem (single-flight)', async () => {
    await saveDeviceCredentials(PAIR);
    let t = 0;
    let n = 0;
    const { api, calls } = fakeApi(() => json({ deviceToken: `tok${++n}`, expiresIn: 3600 }));
    const auth = createDeviceAuth({ api, now: () => t });

    const [a, b] = await Promise.all([auth.ensureToken(), auth.ensureToken()]);
    expect([a, b]).toEqual(['tok1', 'tok1']);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      path: '/v1/devices/token',
      body: { deviceId: 'd1', deviceSecret: PAIR.deviceSecret },
    });
    expect(tokenStore.getState().device).toBe('tok1');

    t = 54 * 60_000;
    expect(await auth.ensureToken()).toBe('tok1');
    t = 55 * 60_000;
    expect(await auth.ensureToken()).toBe('tok2');
  });

  it('DEVICE_REVOKED przy pobieraniu tokenu wywołuje procedurę odłączenia', async () => {
    await saveDeviceCredentials(PAIR);
    const onRevoked = jest.fn();
    const { api } = fakeApi(() => problemResponse(401, 'DEVICE_REVOKED'));
    await expect(createDeviceAuth({ api, onRevoked }).ensureToken()).rejects.toMatchObject({
      code: 'DEVICE_REVOKED',
    });
    expect(onRevoked).toHaveBeenCalledTimes(1);
  });

  it('bez sparowania brak tokenu', async () => {
    const { api, calls } = fakeApi(() => json({}));
    expect(await createDeviceAuth({ api }).ensureToken()).toBeNull();
    expect(calls).toHaveLength(0);
    expect(await loadDeviceCredentials()).toBeNull();
  });

  it('odświeżenie tokenu w trakcie push (401 UNAUTHENTICATED)', async () => {
    await saveDeviceCredentials(PAIR);
    const local = openTestDb();
    try {
      const clock = testClock();
      await submitSheet(
        local,
        {
          judgeId: 'jA',
          judgeSessionId: '0199c000-0000-7000-8000-000000000001',
          authMode: 'OFFLINE_PIN',
          categoryId: 'c1',
          entryId: 'e1',
          criteria: [{ criterionId: 'k1', valueTenths: 80 }],
          penalties: [],
          comment: '',
          totalHundredths: 800,
        },
        clock.now(),
      );
      const server = fakeSyncServer();
      let expired = true;
      const { api, calls } = fakeApi((req) => {
        const path = new URL(req.url).pathname;
        if (path === '/v1/devices/token') return json({ deviceToken: 'swiezy', expiresIn: 3600 });
        if (expired) {
          expired = false;
          return problemResponse(401, 'UNAUTHENTICATED');
        }
        return server.handler(req);
      });
      const auth = createDeviceAuth({ api, now: clock.now });
      await expect(pushOnce({ api, local, clock, auth })).resolves.toMatchObject({ status: 'ok', sent: 1 });
      expect(calls.map((c) => c.path)).toEqual(['/v1/sync/push', '/v1/devices/token', '/v1/sync/push']);
      expect(tokenStore.getState().device).toBe('swiezy');
    } finally {
      local.close();
    }
  });

  it('TC-SEC-016: sekrety tylko w SecureStore – brak tokenów i sekretów w SQLite i MMKV', async () => {
    await saveDeviceCredentials(PAIR);
    await tokenStore.setDevice('token-urzadzenia');
    await tokenStore.setJudge('token-sedziego');
    const local = openTestDb();
    try {
      await applySnapshot(local, snapshotFixture(), testClock());
      const secrets = [PAIR.deviceSecret, PAIR.pinPepper, 'token-urzadzenia', 'token-sedziego'];
      const dump = local.read
        .getAllSync<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table'")
        .flatMap(({ name }) => local.read.getAllSync(`SELECT * FROM ${name}`))
        .map((row) => JSON.stringify(row))
        .join('\n');
      const mmkv = storage
        .getAllKeys()
        .map((k) => `${k}=${storage.getString(k) ?? ''}`)
        .join('\n');
      for (const s of secrets) {
        expect(dump).not.toContain(s);
        expect(mmkv).not.toContain(s);
      }
      expect(secureStore.get(DEVICE_KEYS.secret)).toBe(PAIR.deviceSecret);
      expect(secureStore.get(DEVICE_KEYS.pinPepper)).toBe(PAIR.pinPepper);
      // Weryfikatory PIN w SQLite wyłącznie w postaci zaszyfrowanej (`wrapped`, TL-04).
      expect(local.read.getFirstSync('SELECT wrapped_verifier FROM local_judge WHERE id = ?', 'jA')).toEqual({
        wrapped_verifier: snapshotFixture().judges[0]!.pinVerifier!.wrapped,
      });
    } finally {
      local.close();
    }
  });
});

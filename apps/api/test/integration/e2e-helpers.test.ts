import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { SEED_PINS, seedRanking } from '@polechamp/test-fixtures';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadEnv } from '../../src/config/env.js';
import { startApp, testEnv } from '../support/app.js';
import { type Call, client, flushValkey } from '../support/http.js';
import { organizer } from '../support/scenario.js';
import { judgeLogin, pairTablet } from '../support/tablet.js';

let app: NestFastifyApplication;
let call: Call;

beforeAll(async () => {
  await flushValkey();
  ({ app } = await startApp({ env: await testEnv({ E2E_HELPERS: '1', DEPLOY_ENV: 'staging' }) }));
  call = client(app);
});
afterAll(async () => {
  await app.close();
});

describe('helpery E2E (IMP-454)', () => {
  it('FX-SEED: konto, turnieje t1–t4, ranking c3 i postęp t1 jak w prototypie, PIN-y seedu', async () => {
    const seeded = await call('POST', '/__e2e/seed/FX-SEED');
    expect(seeded.status).toBe(201);
    const { email, password, ids, pins } = seeded.body as {
      email: string;
      password: string;
      ids: Record<string, string>;
      pins: Record<string, string>;
    };
    expect(pins).toEqual(SEED_PINS);
    const login = await call('POST', '/v1/auth/login', { body: { email, password } });
    const org = organizer(call, login.body.accessToken as string);

    const list = (await org.req('GET', '/v1/tournaments?status=active')).body.items as { id: string }[];
    expect(list.map((t) => t.id).sort()).toEqual([ids.t1, ids.t2].sort());
    const t1 = (await org.req('GET', `/v1/tournaments/${ids.t1}`)).body;
    expect([t1.status, t1.progress.done, t1.progress.expected]).toEqual(['IN_PROGRESS', 173, 215]);
    const t3 = (await org.req('GET', `/v1/tournaments/${ids.t3}`)).body;
    expect(t3.status).toBe('FINISHED');

    const results = (await org.req('GET', `/v1/categories/${ids.c3}/results`)).body;
    expect(results.rows.map((r: any) => [r.startNumber, r.rank, r.display, r.sheetCount])).toEqual(
      seedRanking('c3').map((r) => [r.startNumber, r.rank, r.display, r.sheetCount]),
    );

    const tablet = await pairTablet(call, org, ids.t1 as string);
    const session = await judgeLogin(call, tablet.token, ids.jA as string, SEED_PINS.jA);
    expect(session.judgeToken).toBeTruthy();
  });

  it('reset, zegar i kod z e-maila', async () => {
    expect((await call('POST', '/__e2e/reset')).status).toBe(200);
    const seeded = (await call('POST', '/__e2e/seed/FX-EMPTY')).body;
    const login = await call('POST', '/v1/auth/login', {
      body: { email: seeded.email, password: seeded.password },
    });
    expect(login.status).toBe(200);
    await call('POST', '/v1/auth/password/forgot', { body: { email: seeded.email } });
    const mail = (await call('GET', `/__e2e/emails/last?to=${encodeURIComponent(seeded.email)}`)).body;
    expect(mail.template).toBeTruthy();

    const shifted = await call('POST', '/__e2e/clock', {
      body: { table: 'app_user', column: 'locked_until', id: seeded.userId, interval: '16 minutes' },
    });
    expect(shifted.body.updated).toBe(1);
    const denied = await call('POST', '/__e2e/clock', {
      body: { table: 'app_user', column: 'password_hash', id: seeded.userId, interval: '1 days' },
    });
    expect(denied.status).toBe(422);
    expect((await call('POST', '/__e2e/seed/FX-NIEZNANA')).status).toBe(422);
  });

  it('TC-SEC-018: bez flagi trasy nie istnieją, w produkcji flaga przerywa start', async () => {
    const { app: plain } = await startApp();
    try {
      const res = await plain.inject({ method: 'POST', url: '/__e2e/reset' });
      expect(res.statusCode).toBe(404);
    } finally {
      await plain.close();
    }
    const base = await testEnv();
    expect(() =>
      loadEnv({
        ...Object.fromEntries(Object.entries(base).map(([k, v]) => [k, String(v)])),
        E2E_HELPERS: '1',
        DEPLOY_ENV: 'production',
      }),
    ).toThrow(/E2E_HELPERS/);
  });
});

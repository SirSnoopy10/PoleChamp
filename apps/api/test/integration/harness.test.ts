import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { inject } from 'vitest';
import { checkResponse } from '../support/contract.js';
import { backdate, freezeAppClock, truncateAll } from '../setup/isolation.js';
import { rtClient } from '../setup/rt-client.js';
import { AUTH_CONTEXTS, authWorld, type AuthWorld } from '../setup/tokens.js';
import { startApp } from '../support/app.js';
import { type Call, client, flushValkey } from '../support/http.js';
import { listen } from '../support/realtime.js';

let app: NestFastifyApplication;
let call: Call;
let world: AuthWorld;

async function count(table: string): Promise<number> {
  const c = new pg.Client({ connectionString: inject('adminDatabaseUrl') });
  await c.connect();
  const { rows } = await c.query<{ n: string }>(`SELECT count(*) AS n FROM ${table}`);
  await c.end();
  return Number(rows[0]!.n);
}

beforeAll(async () => {
  await truncateAll();
  await flushValkey();
  ({ app } = await startApp());
  call = client(app);
  world = await authWorld(call);
});
afterAll(async () => {
  await app.close();
});

describe('harness testów integracyjnych (IMP-451)', () => {
  it('fabryka tokenów daje 8 kontekstów TC-AUTHZ z oczekiwanym dostępem', async () => {
    expect(Object.keys(world.tokens).sort()).toEqual([...AUTH_CONTEXTS].sort());
    const get = (ctx: keyof AuthWorld['tokens']) =>
      call('GET', `/v1/tournaments/${world.ids.tournamentId}`, { token: world.tokens[ctx] });
    expect((await get('orgOwner')).status).toBe(200);
    expect((await get('orgOther')).status).toBe(404);
    expect((await get('device')).status).toBe(403);
    expect((await get('none')).status).toBe(401);
    const snap = (ctx: keyof AuthWorld['tokens']) =>
      call('GET', '/v1/sync/snapshot', { token: world.tokens[ctx] });
    expect((await snap('device')).status).toBe(200);
    expect((await snap('judge')).status).toBe(200);
    const revoked = await snap('deviceRevoked');
    expect([revoked.status, revoked.body.code]).toEqual([401, 'DEVICE_REVOKED']);
  });

  it('truncateAll czyści dane, a backdate cofa czas wierszy', async () => {
    expect(await count('tournament')).toBe(2);
    expect(
      await backdate('tournament', 'created_at', { column: 'id', value: world.ids.tournamentId }, '40 days'),
    ).toBe(1);
  });

  it('sterowany zegar podmienia tylko Date', async () => {
    const clock = freezeAppClock('2026-10-03T08:00:00Z');
    try {
      expect(new Date().toISOString()).toBe('2026-10-03T08:00:00.000Z');
      clock.advance(60_000);
      expect(new Date().toISOString()).toBe('2026-10-03T08:01:00.000Z');
      expect((await call('GET', '/v1/app-config')).status).toBe(200);
    } finally {
      clock.restore();
    }
  });

  it('TC-CI-002: walidator kontraktu wykrywa treść i status spoza kontraktu', async () => {
    const ok = await call('GET', '/v1/app-config');
    expect(checkResponse('GET', '/v1/app-config', 200, ok.body)).toBeNull();
    expect(checkResponse('GET', '/v1/app-config', 200, { foo: 1 })).toMatch(/app-config → 200/);
    expect(checkResponse('GET', '/v1/app-config', 201, ok.body)).toMatch(/nieopisany/);
    expect(checkResponse('GET', '/v1/tournaments', 404, { bad: true })).toMatch(/Problem/);
    expect(checkResponse('GET', '/health/live', 200, {})).toBeNull();
  });

  it('klient Socket.IO czeka na zdarzenie turnieju', async () => {
    const base = await listen(app);
    const rt = await rtClient(base, world.tokens.orgOwner!, world.ids.tournamentId);
    try {
      expect(rt.socket.connected).toBe(true);
      await expect(rt.waitForEvent('nieistniejace', () => true, 50)).rejects.toThrow('Brak zdarzenia');
    } finally {
      rt.close();
    }
  });
});

import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { routes } from '@polechamp/contracts';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/bootstrap.js';
import { testEnv } from '../support/app.js';
import { flushValkey } from '../support/http.js';

/**
 * IMP-102 / TC-CI-002: trasy NestJS ↔ tabela tras `@polechamp/contracts` (OpenAPI).
 * Trasa bez kontraktu = błąd; kontrakt bez trasy musi być na liście zadań kolejnych epików.
 */
const PENDING_EPICS: Record<string, string> = {
  'GET /v1/judge/me/score-sheets': 'EP-04',
  'GET /v1/categories/{categoryId}/results': 'EP-04',
  'GET /v1/tournaments/{tournamentId}/results': 'EP-05',
  'GET /v1/entries/{entryId}/score-sheets': 'EP-04',
  'GET /v1/score-sheets/{scoreSheetId}/revisions': 'EP-04',
  'POST /v1/exports': 'EP-05',
  'GET /v1/exports/{exportId}': 'EP-05',
  'GET /v1/tournaments/{tournamentId}/audit-log': 'EP-05',
  'POST /v1/entries/{entryId}/anonymize': 'EP-05',
};

const nestRoutes = new Set<string>();
let app: NestFastifyApplication;

beforeAll(async () => {
  await flushValkey();
  app = await createApp(await testEnv(), { logger: false });
  app
    .getHttpAdapter()
    .getInstance()
    .addHook('onRoute', (route) => {
      const methods = Array.isArray(route.method) ? route.method : [route.method];
      for (const m of methods) {
        if (m === 'HEAD' || route.url.startsWith('/health')) continue;
        nestRoutes.add(`${m} ${route.url.replace(/:(\w+)/g, '{$1}')}`);
      }
    });
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
});
afterAll(async () => {
  await app.close();
});

const contract = routes.map((r) => ({ key: `${r.method.toUpperCase()} ${r.path}`, route: r }));

describe('trasy API ↔ kontrakt OpenAPI', () => {
  it('każda trasa NestJS ma kontrakt', () => {
    const known = new Set(contract.map((c) => c.key));
    expect([...nestRoutes].filter((r) => !known.has(r))).toEqual([]);
  });

  it('każdy kontrakt ma trasę albo zadanie w kolejnym epiku', () => {
    const missing = contract.map((c) => c.key).filter((k) => !nestRoutes.has(k) && !PENDING_EPICS[k]);
    expect(missing).toEqual([]);
    const stale = Object.keys(PENDING_EPICS).filter((k) => nestRoutes.has(k));
    expect(stale).toEqual([]);
  });

  it('x-permissions zgodne z guardem: PUBLIC bez tokenu ≠ 401, pozostałe 401', async () => {
    for (const { key, route } of contract) {
      if (!nestRoutes.has(key)) continue;
      const url = route.path.replace(/\{\w+\}/g, '00000000-0000-7000-8000-000000000000');
      const res = await app.inject({
        method: route.method.toUpperCase() as 'GET',
        url,
        remoteAddress: `10.7.${Math.floor(Math.random() * 250)}.1`,
      });
      if (route.permission === 'PUBLIC') expect(res.statusCode, key).not.toBe(401);
      else expect([res.statusCode, res.json().code], key).toEqual([401, 'UNAUTHENTICATED']);
    }
  });
});

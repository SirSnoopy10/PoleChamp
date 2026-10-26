import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startApp } from '../support/app.js';
import { type Call, client, flushValkey, registerAndLogin } from '../support/http.js';
import { mutation, push, runningCategory } from '../support/push.js';
import { organizer } from '../support/scenario.js';

/**
 * IMP-452 / TC-CI-002: aplikacja N−1 i N−2 działa z bieżącym API. Kontrakty wydań są zapisywane
 * w `packages/contracts/history/vX.Y.Z.json` (krok workflow wydania); żądania starego klienta muszą
 * pasować do starego schematu żądania, a odpowiedzi bieżącego API – do starego schematu odpowiedzi.
 */
const HISTORY = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../packages/contracts/history');

const semver = (f: string) =>
  f
    .replace(/^v|\.json$/g, '')
    .split('.')
    .map(Number);
const versions = readdirSync(HISTORY)
  .filter((f) => /^v\d+\.\d+\.\d+\.json$/.test(f))
  .sort((a, b) => {
    const [x, y] = [semver(a), semver(b)];
    return x[0]! - y[0]! || x[1]! - y[1]! || x[2]! - y[2]!;
  })
  .slice(-3); // N, N−1, N−2

type Doc = { info: { version: string }; paths: Record<string, Record<string, any>> };

function validatorFor(doc: Doc) {
  const ajv = new Ajv2020({ strict: false, allErrors: false });
  addFormats(ajv);
  ajv.addSchema({ ...doc, $id: 'api' });
  const ptr = (path: string) => path.replace(/~/g, '~0').replace(/\//g, '~1');
  return {
    has: (method: string, path: string) => Boolean(doc.paths[path]?.[method]),
    request(method: string, path: string, body: unknown) {
      const v = ajv.compile({
        $ref: `api#/paths/${ptr(path)}/${method}/requestBody/content/application~1json/schema`,
      });
      return v(body) ? null : ajv.errorsText(v.errors);
    },
    response(method: string, path: string, status: number, body: unknown) {
      const res = doc.paths[path]?.[method]?.responses?.[String(status)];
      if (!res) return `status ${status} nieopisany`;
      if (!res.content) return body === undefined ? null : 'oczekiwano pustej treści';
      const v = ajv.compile({
        $ref: `api#/paths/${ptr(path)}/${method}/responses/${status}/content/application~1json/schema`,
      });
      return v(body) ? null : ajv.errorsText(v.errors);
    },
  };
}

let app: NestFastifyApplication;
let call: Call;

beforeAll(async () => {
  await flushValkey();
  ({ app } = await startApp());
  call = client(app);
});
afterAll(async () => {
  await app.close();
});

describe('zgodność wsteczna API (IMP-452)', () => {
  it('historia kontraktów zawiera co najmniej bieżące wydanie', () => {
    expect(versions.length).toBeGreaterThan(0);
  });

  describe.each(versions)('TC-CI-002: klient z kontraktem %s', (file) => {
    const doc = JSON.parse(readFileSync(resolve(HISTORY, file), 'utf8')) as Doc;
    const v = validatorFor(doc);

    it('sync/snapshot, sync/push, sync/changes i wyniki zgodne ze starym schematem', async () => {
      const org = organizer(call, (await registerAndLogin(call)).accessToken);
      const fx = await runningCategory(call, org);
      const errors: string[] = [];
      const check = (label: string, problem: string | null) => problem && errors.push(`${label}: ${problem}`);

      const snap = await call('GET', '/v1/sync/snapshot', { token: fx.tablet.token });
      check('GET /v1/sync/snapshot', v.response('get', '/v1/sync/snapshot', snap.status, snap.body));

      const m = mutation.submit({
        judgeId: fx.jA.id,
        judgeSessionId: fx.session.sessionId,
        categoryId: fx.c.id,
        entryId: fx.entries[0]!.id,
        criteria: fx.c.criteria,
        notes: [8, 7.5, 7, 8.5, 9],
      });
      const body = { deviceTime: new Date().toISOString(), mutations: [m] };
      check('POST /v1/sync/push (żądanie)', v.request('post', '/v1/sync/push', body));
      const pushed = await push(call, fx.tablet.token, [m]);
      check('POST /v1/sync/push', v.response('post', '/v1/sync/push', pushed.status, pushed.body));
      expect(pushed.body.results[0].status).toBe('APPLIED');

      const changes = await call('GET', '/v1/sync/changes?since=0', { token: fx.tablet.token });
      check('GET /v1/sync/changes', v.response('get', '/v1/sync/changes', changes.status, changes.body));

      const results = await org.req('GET', `/v1/categories/${fx.c.id}/results`);
      check(
        'GET /v1/categories/{categoryId}/results',
        v.response('get', '/v1/categories/{categoryId}/results', results.status, results.body),
      );
      expect(errors).toEqual([]);
    });
  });
});

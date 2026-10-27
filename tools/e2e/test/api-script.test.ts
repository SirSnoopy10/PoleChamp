import { PushRequest } from '@polechamp/contracts';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

/** `_shared/api.js` wykonany jak w Maestro (GraalJS: globalne `http`, `json`, `output`) na atrapie API. */
const script = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../../../apps/mobile/e2e/maestro/_shared/api.js'),
  'utf8',
);

function run(env: Record<string, string>, output: Record<string, any>) {
  const requests: { method: string; url: string; body: any }[] = [];
  const respond = (method: string, url: string, opts: { body?: string }) => {
    const body = opts.body ? JSON.parse(opts.body) : undefined;
    requests.push({ method, url, body });
    const path = url.replace('http://api', '');
    const reply = (v: unknown) => ({ status: 200, body: JSON.stringify(v) });
    if (path === '/v1/auth/login') return reply({ accessToken: 'org' });
    if (path.endsWith('/pairing-codes')) return reply({ code: 'K7QM4ZTX' });
    if (path === '/v1/devices/pair') return reply({ deviceId: 'd1', deviceSecret: 's' });
    if (path === '/v1/devices/token') return reply({ deviceToken: 'dev' });
    if (path === '/v1/judge-sessions') return reply({ sessionId: '01a17987-7fa9-7787-a7a4-4607ae877f78' });
    if (path.startsWith('/v1/categories/'))
      return reply({
        criteria: [
          { id: 'k1', weight: 2 },
          { id: 'k2', weight: 1.5 },
        ],
      });
    if (path === '/v1/sync/push') return reply({ results: [{ status: 'APPLIED' }] });
    return reply({});
  };
  runInNewContext(script, {
    ...env,
    API_URL: 'http://api',
    output,
    json: JSON.parse,
    http: {
      get: (url: string, opts: { body?: string }) => respond('GET', url, opts),
      post: (url: string, opts: { body?: string }) => respond('POST', url, opts),
      request: (url: string, opts: { method: string; body?: string }) => respond(opts.method, url, opts),
    },
  });
  return requests;
}

describe('_shared/api.js (IMP-467)', () => {
  it('submit wysyła mutację zgodną z kontraktem sync/push', () => {
    const output = {
      email: 'e@x.test',
      password: 'p',
      ids: { t1: 't-uuid', c3: 'c-uuid', u26: 'e-uuid', jB: 'j-uuid' },
      pins: { jB: '4719' },
    };
    const reqs = run(
      { ACTION: 'submit', TOURNAMENT: 't1', CATEGORY: 'c3', ENTRY: 'u26', JUDGE: 'jB', NOTE: '8' },
      output,
    );
    const push = reqs.find((r) => r.url.endsWith('/v1/sync/push'))!;
    const parsed = PushRequest.safeParse(push.body);
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
    expect(push.body.mutations[0].payload.clientTotal).toBe(28);
    expect((output as any).pushStatus).toBe('APPLIED');
    expect(reqs.find((r) => r.url.endsWith('/v1/judge-sessions'))!.body).toEqual({
      judgeId: 'j-uuid',
      pin: '4719',
    });
  });

  it('seed zapisuje konto, identyfikatory i PIN-y', () => {
    const output: Record<string, any> = {};
    run({ ACTION: 'seed', FIXTURE: 'FX-SEED' }, output);
    expect(Object.keys(output)).toEqual(expect.arrayContaining(['email', 'ids', 'pins']));
  });
});

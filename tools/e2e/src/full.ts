import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { FULL_TOURNAMENT, maestroRunner, orchestrate, percentile, seedEnv } from './orchestrator.ts';

/**
 * `node tools/e2e/src/full.ts --api http://10.0.2.2:3000 --phone emulator-5554 --tablet emulator-5556`
 * – pełny turniej na dwóch urządzeniach (IMP-457); raport `reports/full.json` z p50/p95 (TC-PERF-005)
 * i wpisami audytu turnieju.
 */
const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  if (i < 0 || !process.argv[i + 1]) throw new Error(`Brak --${name}`);
  return process.argv[i + 1]!;
};

const api = arg('api');
const json = async (path: string, init?: RequestInit) => {
  const res = await fetch(`${api}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
  });
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return res.json() as Promise<any>;
};

await json('/__e2e/reset', { method: 'POST' });
const seed = await json('/__e2e/seed/FX-SEED', { method: 'POST' });
const env = { ...seedEnv(seed), API_URL: api };
const flows = resolve(import.meta.dirname, '../../../apps/mobile/e2e/maestro');
const result = await orchestrate(
  FULL_TOURNAMENT,
  { phone: arg('phone'), tablet: arg('tablet') },
  env,
  maestroRunner(flows),
);

const login = await json('/v1/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email: seed.email, password: seed.password }),
});
const audit = await json(`/v1/tournaments/${seed.ids.t1}/audit-log?limit=200`, {
  headers: { authorization: `Bearer ${login.accessToken}` },
});
const report = {
  ok: result.ok,
  stages: result.results,
  latency: Object.fromEntries(
    Object.entries(result.latencies).map(([k, v]) => [
      k,
      { n: v.length, p50: percentile(v, 50), p95: percentile(v, 95) },
    ]),
  ),
  auditActions: [...new Set((audit.items as { action: string }[]).map((e) => e.action))].sort(),
};
writeFileSync(resolve(import.meta.dirname, '../reports/full.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.latency));
process.exit(result.ok ? 0 : 1);

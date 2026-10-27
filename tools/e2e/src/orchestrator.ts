import { spawn } from 'node:child_process';

/**
 * Orkiestrator pełnego turnieju (IMP-457): dwa urządzenia (telefon organizatora, tablet sędziego) i API.
 * Etapy biegną kolejno – koniec etapu jest barierą („tablet sparowany”, „kategoria rozpoczęta”,
 * „ocena zatwierdzona”); kroki jednego etapu na różnych urządzeniach biegną równolegle.
 * Dane (konto, identyfikatory, PIN-y) z `POST /__e2e/seed/FX-…` trafiają do przepływów jako `--env`.
 */
export type DeviceRole = 'phone' | 'tablet';

export interface Step {
  device: DeviceRole;
  flow: string;
  /** Pomiar opóźnienia: czas od końca etapu z `since` do końca tego kroku (TC-PERF-005). */
  measure?: { name: string; since: string };
}

export interface Stage {
  name: string;
  steps: Step[];
}

export interface RunResult {
  stage: string;
  device: DeviceRole;
  flow: string;
  ok: boolean;
  startedAt: number;
  endedAt: number;
}

export type Runner = (device: string, flow: string, env: Record<string, string>) => Promise<boolean>;

/** Maestro CLI na wskazanym urządzeniu (`adb devices` / `xcrun simctl list` – identyfikator). */
export const maestroRunner =
  (flowsDir: string): Runner =>
  (device, flow, env) =>
    new Promise((resolve) => {
      const args = ['--device', device, 'test', `${flowsDir}/${flow}`];
      for (const [k, v] of Object.entries(env)) args.push('--env', `${k}=${v}`);
      const child = spawn('maestro', args, { stdio: 'inherit', shell: process.platform === 'win32' });
      child.on('exit', (code) => resolve(code === 0));
    });

/** Spłaszczenie wyniku seedu do zmiennych przepływów: EMAIL, PASSWORD, ID_t1, ID_c3, PIN_jA… */
export function seedEnv(seed: {
  email: string;
  password: string;
  ids: Record<string, string>;
  pins: Record<string, string>;
}) {
  const env: Record<string, string> = { EMAIL: seed.email, PASSWORD: seed.password };
  for (const [k, v] of Object.entries(seed.ids)) env[`ID_${k.replace(/[^\w]/g, '_')}`] = v;
  for (const [k, v] of Object.entries(seed.pins)) env[`PIN_${k}`] = v;
  return env;
}

export async function orchestrate(
  stages: readonly Stage[],
  devices: Record<DeviceRole, string>,
  env: Record<string, string>,
  run: Runner,
  now: () => number = Date.now,
): Promise<{ ok: boolean; results: RunResult[]; latencies: Record<string, number[]> }> {
  const results: RunResult[] = [];
  const stageEnd = new Map<string, number>();
  const latencies: Record<string, number[]> = {};
  for (const stage of stages) {
    const outcomes = await Promise.all(
      stage.steps.map(async (step) => {
        const startedAt = now();
        const ok = await run(devices[step.device], step.flow, env);
        const endedAt = now();
        if (step.measure) {
          const since = stageEnd.get(step.measure.since);
          if (since !== undefined) (latencies[step.measure.name] ??= []).push(endedAt - since);
        }
        return { stage: stage.name, device: step.device, flow: step.flow, ok, startedAt, endedAt };
      }),
    );
    results.push(...outcomes);
    stageEnd.set(stage.name, Math.max(...outcomes.map((o) => o.endedAt)));
    if (outcomes.some((o) => !o.ok)) return { ok: false, results, latencies };
  }
  return { ok: true, results, latencies };
}

/** Percentyl metodą najbliższej rangi (p50/p95 dla raportu TC-PERF-005). */
export function percentile(values: readonly number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)]!;
}

/** Scenariusz TC-E2E-FULL-001…006: konfiguracja → parowanie → ocenianie → ranking → blokada → PDF → zakończenie. */
export const FULL_TOURNAMENT: readonly Stage[] = [
  { name: 'konfiguracja', steps: [{ device: 'phone', flow: 'full/org-01-setup.yaml' }] },
  { name: 'tablet-sparowany', steps: [{ device: 'tablet', flow: 'full/judge-01-pair.yaml' }] },
  { name: 'kategoria-rozpoczeta', steps: [{ device: 'phone', flow: 'full/org-02-start.yaml' }] },
  { name: 'ocena-zatwierdzona', steps: [{ device: 'tablet', flow: 'full/judge-02-score.yaml' }] },
  {
    name: 'ranking',
    steps: [
      // TC-PERF-005: ocena → ranking u organizatora ≤ 2 s (p95).
      {
        device: 'phone',
        flow: 'full/org-03-ranking.yaml',
        measure: { name: 'ocena→ranking', since: 'ocena-zatwierdzona' },
      },
    ],
  },
  { name: 'blokada', steps: [{ device: 'phone', flow: 'full/org-04-lock.yaml' }] },
  {
    name: 'blokada-na-tablecie',
    steps: [
      // Status kategorii → tablet ≤ 3 s (p95).
      {
        device: 'tablet',
        flow: 'full/judge-03-locked.yaml',
        measure: { name: 'status→tablet', since: 'blokada' },
      },
    ],
  },
  { name: 'pdf-i-zakonczenie', steps: [{ device: 'phone', flow: 'full/org-05-pdf-finish.yaml' }] },
];

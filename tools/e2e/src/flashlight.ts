import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { percentile } from './orchestrator.ts';

/**
 * Pomiar płynności formularza oceny na Androidzie (IMP-500, TC-PERF-004): Flashlight
 * (binarium spoza npm – `curl https://get.flashlight.dev | bash`) uruchamia przepływ Maestro
 * `perf/tc-perf-004-score-form.yaml` i zapisuje próbki FPS / CPU (wątki UI i JS) / RAM.
 * Budżet: FPS ≥ 55 dla 95% próbek (5. percentyl), CPU wątku JS bez stałego nasycenia.
 */
export interface FlashlightMeasure {
  fps?: number;
  ram?: number;
  cpu?: { perName?: Record<string, number> };
}

export interface FlashlightResult {
  iterations: { measures: FlashlightMeasure[] }[];
}

export interface FpsSummary {
  samples: number;
  fpsP5: number | null;
  fpsP50: number | null;
  jsThreadCpuP95: number | null;
  uiThreadCpuP95: number | null;
  ramMbMax: number | null;
  pass: boolean;
}

export const FPS_BUDGET = 55;

/** Nazwy wątków w Flashlight: JS (Hermes) – `mqt_js` / `mqt_v_js`, UI – `UI Thread` / `RenderThread`. */
const threadCpu = (m: FlashlightMeasure, names: readonly string[]) => {
  const per = m.cpu?.perName ?? {};
  const hit = names.find((n) => n in per);
  return hit === undefined ? null : per[hit]!;
};

export function summarizeFlashlight(result: FlashlightResult, budget = FPS_BUDGET): FpsSummary {
  const measures = result.iterations.flatMap((i) => i.measures);
  const fps = measures.flatMap((m) => (typeof m.fps === 'number' ? [m.fps] : []));
  const js = measures.flatMap((m) => {
    const v = threadCpu(m, ['mqt_v_js', 'mqt_js']);
    return v === null ? [] : [v];
  });
  const ui = measures.flatMap((m) => {
    const v = threadCpu(m, ['UI Thread', 'RenderThread']);
    return v === null ? [] : [v];
  });
  const ram = measures.flatMap((m) => (typeof m.ram === 'number' ? [m.ram] : []));
  const fpsP5 = percentile(fps, 5);
  return {
    samples: fps.length,
    fpsP5,
    fpsP50: percentile(fps, 50),
    jsThreadCpuP95: percentile(js, 95),
    uiThreadCpuP95: percentile(ui, 95),
    ramMbMax: ram.length ? Math.round(Math.max(...ram)) : null,
    pass: fpsP5 !== null && fpsP5 >= budget,
  };
}

/** Argumenty `flashlight test` dla przepływu Maestro (5 iteracji po 30 s). */
export function flashlightArgs(flow: string, out: string, iterations = 5): string[] {
  return [
    'test',
    '--bundleId',
    'app.polechamp',
    '--testCommand',
    `maestro test ${flow}`,
    '--duration',
    '30000',
    '--iterationCount',
    String(iterations),
    '--resultsFilePath',
    out,
    '--resultsTitle',
    'TC-PERF-004 formularz oceny',
  ];
}

/** `node tools/e2e/src/flashlight.ts [wynik.json]` – pomiar (wymaga adb, Maestro, Flashlight) i podsumowanie. */
if (/flashlight\.ts$/.test(process.argv[1] ?? '')) {
  const out = process.argv[2] ?? 'flashlight-tc-perf-004.json';
  if (!process.argv.includes('--summary-only')) {
    execFileSync(
      'flashlight',
      flashlightArgs('apps/mobile/e2e/maestro/perf/tc-perf-004-score-form.yaml', out),
      {
        stdio: 'inherit',
      },
    );
  }
  const summary = summarizeFlashlight(JSON.parse(readFileSync(out, 'utf8')) as FlashlightResult);
  console.log(JSON.stringify(summary, null, 2));
  process.exitCode = summary.pass ? 0 : 1;
}

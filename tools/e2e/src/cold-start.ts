import { execFileSync } from 'node:child_process';
import { percentile } from './orchestrator.ts';

/**
 * Zimny start na Androidzie (IMP-501, TC-PERF-001): `am force-stop` + `am start -W` N razy, p90 z
 * `TotalTime` (do pierwszej klatki). TTI aplikacji (koniec splasha) – pomiar `time_to_interactive`
 * w Sentry (`markInteractive`). iOS – Xcode Instruments, szablon App Launch (ręcznie).
 */
export const COLD_START_BUDGET_MS = 3000;

export function parseAmStartMs(out: string): number | null {
  const m = /^TotalTime:\s*(\d+)/m.exec(out) ?? /^WaitTime:\s*(\d+)/m.exec(out);
  return m ? Number(m[1]) : null;
}

export interface ColdStartSummary {
  runs: number;
  p50: number | null;
  p90: number | null;
  max: number | null;
  pass: boolean;
}

export function summarizeColdStart(
  samples: readonly number[],
  budget = COLD_START_BUDGET_MS,
): ColdStartSummary {
  const p90 = percentile(samples, 90);
  return {
    runs: samples.length,
    p50: percentile(samples, 50),
    p90,
    max: samples.length ? Math.max(...samples) : null,
    pass: p90 !== null && p90 <= budget,
  };
}

/** `node tools/e2e/src/cold-start.ts <serial> [przebiegi=20]` – wymaga zainstalowanego buildu preview. */
if (/cold-start\.ts$/.test(process.argv[1] ?? '')) {
  const [serial, runs = '20'] = process.argv.slice(2);
  if (!serial) throw new Error('Podaj numer seryjny urządzenia (adb devices)');
  const adb = (...args: string[]) =>
    execFileSync('adb', ['-s', serial, 'shell', ...args], { encoding: 'utf8' });
  const samples: number[] = [];
  for (let i = 0; i < Number(runs); i++) {
    adb('am', 'force-stop', 'app.polechamp');
    await new Promise((r) => setTimeout(r, 2000));
    const ms = parseAmStartMs(adb('am', 'start', '-W', '-n', 'app.polechamp/.MainActivity'));
    if (ms !== null) samples.push(ms);
    await new Promise((r) => setTimeout(r, 5000));
  }
  const summary = summarizeColdStart(samples);
  console.log(JSON.stringify(summary, null, 2));
  process.exitCode = summary.pass ? 0 : 1;
}

import { execFileSync } from 'node:child_process';
import { percentile } from './orchestrator.ts';

/**
 * Pomiary na urządzeniach referencyjnych (IMP-463): pamięć (TC-PERF-014, `dumpsys meminfo` – TOTAL PSS)
 * i bateria (TC-PERF-015, `dumpsys battery` – poziom %) próbkowane w trakcie przebiegu Maestro.
 * iOS – Xcode Instruments (Allocations, Energy Log), ręcznie.
 */
export function parseMeminfoKb(out: string): number | null {
  const m = /TOTAL PSS:\s+(\d+)/.exec(out) ?? /^\s*TOTAL\s+(\d+)/m.exec(out);
  return m ? Number(m[1]) : null;
}

export function parseBatteryLevel(out: string): number | null {
  const m = /^\s*level:\s*(\d+)/m.exec(out);
  return m ? Number(m[1]) : null;
}

export interface MetricsSummary {
  samples: number;
  memoryMbP50: number | null;
  memoryMbMax: number | null;
  batteryDropPct: number | null;
}

export function summarize(memKb: readonly number[], battery: readonly number[]): MetricsSummary {
  const mb = memKb.map((k) => Math.round(k / 1024));
  return {
    samples: memKb.length,
    memoryMbP50: percentile(mb, 50),
    memoryMbMax: mb.length ? Math.max(...mb) : null,
    batteryDropPct: battery.length >= 2 ? battery[0]! - battery[battery.length - 1]! : null,
  };
}

/** `node tools/e2e/src/device-metrics.ts <serial> <minuty>` – próbka co 30 s. */
if (/device-metrics\.ts$/.test(process.argv[1] ?? '')) {
  const [serial, minutes = '30'] = process.argv.slice(2);
  if (!serial) throw new Error('Podaj numer seryjny urządzenia (adb devices)');
  const adb = (...args: string[]) =>
    execFileSync('adb', ['-s', serial, 'shell', ...args], { encoding: 'utf8' });
  const mem: number[] = [];
  const bat: number[] = [];
  const end = Date.now() + Number(minutes) * 60_000;
  while (Date.now() < end) {
    const kb = parseMeminfoKb(adb('dumpsys', 'meminfo', 'app.polechamp'));
    const lvl = parseBatteryLevel(adb('dumpsys', 'battery'));
    if (kb !== null) mem.push(kb);
    if (lvl !== null) bat.push(lvl);
    await new Promise((r) => setTimeout(r, 30_000));
  }
  console.log(JSON.stringify(summarize(mem, bat)));
}

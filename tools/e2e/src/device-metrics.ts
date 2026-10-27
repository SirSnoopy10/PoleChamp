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

/** Progi TC-PERF-014 (RSS ≤ 300 MB, wzrost < 10% w ostatnich 30 min) i TC-PERF-015 (≤ 12% baterii / h). */
export const DEVICE_BUDGET = { memoryMbMax: 300, growthPct: 10, batteryPctPerHour: 12 } as const;

export interface DeviceAssessment extends MetricsSummary {
  memoryGrowthLast30Pct: number | null;
  batteryPctPerHour: number | null;
  memoryPass: boolean;
  batteryPass: boolean;
}

/** Ocena przebiegu (IMP-503): próbki co `intervalMs`; wzrost = ostatnia próbka vs pierwsza z ostatnich 30 min. */
export function assessRun(
  memKb: readonly number[],
  battery: readonly number[],
  intervalMs: number,
): DeviceAssessment {
  const base = summarize(memKb, battery);
  const window = Math.max(1, Math.round((30 * 60_000) / intervalMs));
  const tail = memKb.slice(-window - 1);
  const growth =
    memKb.length > window && tail[0]! > 0 ? ((tail[tail.length - 1]! - tail[0]!) / tail[0]!) * 100 : null;
  const hours = battery.length >= 2 ? ((battery.length - 1) * intervalMs) / 3_600_000 : 0;
  const perHour = hours > 0 && base.batteryDropPct !== null ? base.batteryDropPct / hours : null;
  return {
    ...base,
    memoryGrowthLast30Pct: growth === null ? null : Math.round(growth * 10) / 10,
    batteryPctPerHour: perHour === null ? null : Math.round(perHour * 10) / 10,
    memoryPass:
      base.memoryMbMax !== null &&
      base.memoryMbMax <= DEVICE_BUDGET.memoryMbMax &&
      (growth === null || growth < DEVICE_BUDGET.growthPct),
    batteryPass: perHour !== null && perHour <= DEVICE_BUDGET.batteryPctPerHour,
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
  console.log(JSON.stringify(assessRun(mem, bat, 30_000), null, 2));
}

import { describe, expect, it } from 'vitest';
import { assessRun, parseBatteryLevel, parseMeminfoKb, summarize } from '../src/device-metrics.ts';

describe('pomiary urządzeń (IMP-463)', () => {
  it('TC-PERF-014/015: parsowanie dumpsys i podsumowanie', () => {
    expect(parseMeminfoKb('App Summary\n           TOTAL PSS:   187432            TOTAL RSS:   250000')).toBe(
      187432,
    );
    expect(parseMeminfoKb('                 TOTAL   201234   180000')).toBe(201234);
    expect(parseMeminfoKb('No process found')).toBeNull();
    expect(
      parseBatteryLevel('Current Battery Service state:\n  AC powered: false\n  level: 87\n  scale: 100'),
    ).toBe(87);
    expect(summarize([180 * 1024, 200 * 1024, 190 * 1024], [90, 88, 85])).toEqual({
      samples: 3,
      memoryMbP50: 190,
      memoryMbMax: 200,
      batteryDropPct: 5,
    });
  });
});

describe('ocena przebiegu tabletu (IMP-503)', () => {
  it('TC-PERF-014/015: wzrost pamięci w ostatnich 30 min i bateria na godzinę', () => {
    // Próbki co 15 min przez 2 h: pamięć stabilna ~190 MB, bateria 100 → 82 (9%/h).
    const mb = (v: number) => v * 1024;
    const stable = assessRun(
      [180, 186, 188, 190, 189, 191, 190, 192, 191].map(mb),
      [100, 98, 96, 93, 91, 89, 86, 84, 82],
      15 * 60_000,
    );
    expect(stable).toMatchObject({
      memoryMbMax: 192,
      batteryPctPerHour: 9,
      memoryPass: true,
      batteryPass: true,
    });
    expect(stable.memoryGrowthLast30Pct).toBeCloseTo(0.5, 1);

    const leaking = assessRun([150, 170, 190, 210, 235, 260].map(mb), [100, 96, 92, 88, 84, 80], 15 * 60_000);
    expect(leaking.memoryGrowthLast30Pct).toBeGreaterThan(10);
    expect(leaking.memoryPass).toBe(false);
    expect(leaking.batteryPctPerHour).toBe(16);
    expect(leaking.batteryPass).toBe(false);
  });
});

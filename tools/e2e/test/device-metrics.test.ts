import { describe, expect, it } from 'vitest';
import { parseBatteryLevel, parseMeminfoKb, summarize } from '../src/device-metrics.ts';

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

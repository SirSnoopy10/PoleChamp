import { describe, expect, it } from 'vitest';
import { parseAmStartMs, summarizeColdStart } from '../src/cold-start.ts';

describe('zimny start (IMP-501)', () => {
  it('TC-PERF-001: parsowanie `am start -W` i p90 ≤ 3,0 s', () => {
    const out =
      'Starting: Intent { cmp=app.polechamp/.MainActivity }\nStatus: ok\nLaunchState: COLD\nTotalTime: 1874\nWaitTime: 1901\nComplete';
    expect(parseAmStartMs(out)).toBe(1874);
    expect(parseAmStartMs('Error: Activity not started')).toBeNull();

    const ok = summarizeColdStart([1800, 1900, 2000, 2100, 2200, 2300, 2400, 2500, 2600, 3400]);
    expect(ok).toMatchObject({ runs: 10, p50: 2200, p90: 2600, max: 3400, pass: true });
    expect(summarizeColdStart([3100, 3200, 2900]).pass).toBe(false);
    expect(summarizeColdStart([]).pass).toBe(false);
  });
});

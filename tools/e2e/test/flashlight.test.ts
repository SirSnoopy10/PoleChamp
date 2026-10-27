import { describe, expect, it } from 'vitest';
import { flashlightArgs, summarizeFlashlight } from '../src/flashlight.ts';

const measure = (fps: number, js: number) => ({
  fps,
  ram: 180.4,
  cpu: { perName: { mqt_v_js: js, 'UI Thread': 20 } },
});

describe('Flashlight (IMP-500)', () => {
  it('TC-PERF-004: budżet 55 fps dla 95% próbek', () => {
    const ok = summarizeFlashlight({
      iterations: [{ measures: Array.from({ length: 40 }, (_, i) => measure(i === 0 ? 48 : 59, 30)) }],
    });
    expect(ok).toMatchObject({
      samples: 40,
      fpsP5: 59,
      fpsP50: 59,
      jsThreadCpuP95: 30,
      ramMbMax: 180,
      pass: true,
    });

    const slow = summarizeFlashlight({
      iterations: [{ measures: Array.from({ length: 20 }, (_, i) => measure(i < 3 ? 40 : 60, 90)) }],
    });
    expect(slow.fpsP5).toBe(40);
    expect(slow.pass).toBe(false);
    expect(summarizeFlashlight({ iterations: [] })).toMatchObject({ samples: 0, fpsP5: null, pass: false });
  });

  it('TC-PERF-004: przepływ Maestro i parametry przebiegu', () => {
    const args = flashlightArgs('perf/x.yaml', 'out.json');
    expect(args).toContain('maestro test perf/x.yaml');
    expect(args.slice(args.indexOf('--iterationCount'), args.indexOf('--iterationCount') + 2)).toEqual([
      '--iterationCount',
      '5',
    ]);
  });
});

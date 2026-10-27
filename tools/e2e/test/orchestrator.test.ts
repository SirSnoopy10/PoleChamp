import { describe, expect, it } from 'vitest';
import { FULL_TOURNAMENT, orchestrate, percentile, seedEnv, type Stage } from '../src/orchestrator.ts';

describe('orkiestrator pełnego turnieju (IMP-457)', () => {
  it('etapy są barierami, kroki etapu biegną równolegle, opóźnienia liczone od końca etapu', async () => {
    let t = 0;
    const log: string[] = [];
    const stages: Stage[] = [
      {
        name: 'a',
        steps: [
          { device: 'phone', flow: 'p1' },
          { device: 'tablet', flow: 't1' },
        ],
      },
      { name: 'b', steps: [{ device: 'phone', flow: 'p2', measure: { name: 'lat', since: 'a' } }] },
    ];
    const res = await orchestrate(
      stages,
      { phone: 'P', tablet: 'T' },
      { EMAIL: 'x' },
      async (device, flow, env) => {
        log.push(`${device}:${flow}:${env.EMAIL}`);
        t += flow === 'p2' ? 1500 : 100;
        return true;
      },
      () => t,
    );
    expect(res.ok).toBe(true);
    expect(log).toEqual(['P:p1:x', 'T:t1:x', 'P:p2:x']);
    expect(res.latencies.lat).toEqual([1500]);
  });

  it('porażka etapu zatrzymuje scenariusz', async () => {
    const run = async (_d: string, flow: string) => flow !== 'full/org-02-start.yaml';
    const res = await orchestrate(FULL_TOURNAMENT, { phone: 'P', tablet: 'T' }, {}, run);
    expect(res.ok).toBe(false);
    expect(res.results.map((r) => r.flow).at(-1)).toBe('full/org-02-start.yaml');
  });

  it('percentyle i zmienne seedu', () => {
    expect(percentile([5, 1, 4, 2, 3], 50)).toBe(3);
    expect(
      percentile(
        Array.from({ length: 20 }, (_, i) => i + 1),
        95,
      ),
    ).toBe(19);
    expect(percentile([], 95)).toBeNull();
    expect(
      seedEnv({ email: 'e', password: 'p', ids: { t1: 'T', c3_k1: 'K' }, pins: { jA: '8306' } }),
    ).toEqual({
      EMAIL: 'e',
      PASSWORD: 'p',
      ID_t1: 'T',
      ID_c3_k1: 'K',
      PIN_jA: '8306',
    });
  });
});

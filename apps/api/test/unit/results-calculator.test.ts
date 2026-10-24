import type { CategoryConfig } from '@polechamp/scoring';
import { describe, expect, it } from 'vitest';
import { rankCategory, type CalculatorInput } from '../../src/modules/results/calculator.js';

const WEIGHTS = [20, 15, 10, 10, 10];
const config: CategoryConfig = {
  criteria: WEIGHTS.map((weightTenths, i) => ({ id: `k${i}`, scaleMax: 10, weightTenths })),
  penaltyTypes: [
    { id: 'p0', pointsTenths: 20, maxOccurrences: 3 },
    { id: 'p1', pointsTenths: 10, maxOccurrences: 3 },
    { id: 'p2', pointsTenths: 5, maxOccurrences: 3 },
  ],
  tieBreakCriterionId: 'k0',
};

/** Kategoria `entries` × `judges` z kompletem arkuszy; noty zależne od numeru startu. */
function category(
  entryCount: number,
  judges: number,
  notes = (e: number, j: number, k: number) => 50 + ((e + j + k) % 10) * 5,
): CalculatorInput {
  const entries: CalculatorInput['entries'][number][] = [];
  const sheets: CalculatorInput['sheets'][number][] = [];
  const values: CalculatorInput['values'][number][] = [];
  const penalties: CalculatorInput['penalties'][number][] = [];
  for (let e = 0; e < entryCount; e++) {
    entries.push({ id: `e${e}`, startNumber: e + 1, startOrder: e + 1, status: 'ACTIVE' });
    for (let j = 0; j < judges; j++) {
      const id = `s${e}-${j}`;
      sheets.push({ id, entryId: `e${e}`, judgeId: `j${j}` });
      WEIGHTS.forEach((_, k) =>
        values.push({ scoreSheetId: id, criterionId: `k${k}`, valueTenths: notes(e, j, k) }),
      );
      penalties.push({ scoreSheetId: id, penaltyTypeId: 'p0', count: (e + j) % 7 === 0 ? 1 : 0 });
    }
  }
  return {
    config,
    judgeCount: judges,
    aggregationMethod: 'MEAN',
    categoryStatus: 'IN_PROGRESS',
    entries,
    sheets,
    values,
    penalties,
  };
}

describe('kalkulator wyników kategorii (IMP-150)', () => {
  it('TC-PERF-016: 300 startów × 30 sędziów – przeliczenie bez I/O < 20 ms (mediana)', () => {
    const input = category(300, 30);
    rankCategory(input); // rozgrzanie JIT
    const times: number[] = [];
    for (let i = 0; i < 15; i++) {
      const started = performance.now();
      const rows = rankCategory(input);
      times.push(performance.now() - started);
      expect(rows).toHaveLength(300);
    }
    times.sort((a, b) => a - b);
    expect(times[Math.floor(times.length / 2)]).toBeLessThan(20);
  });

  it('wynik sędziego, średnia i remis rozstrzygnięty Techniką (zgodnie z P9)', () => {
    // Start 1: 9×2 + 7×1,5 + 8 + 8 + 8 = 52,5; start 2: 7×2 + 9×1,5 + 9 + 8 + 8 = 52,5 – remis,
    // wyższa średnia Techniki daje startowi 1 pierwsze miejsce.
    const input = category(2, 3, (e, _j, k) => {
      if (k === 0) return e === 0 ? 90 : 70;
      if (k === 1) return e === 0 ? 70 : 90;
      if (k === 2) return e === 0 ? 80 : 90;
      return 80;
    });
    const noPenalties = { ...input, penalties: input.penalties.map((p) => ({ ...p, count: 0 })) };
    const rows = rankCategory(noPenalties);
    expect(rows.map((r) => [r.entryId, r.rank, r.aggregate.officialHundredths])).toEqual([
      ['e0', 1, 5250],
      ['e1', 2, 5250],
    ]);
    expect(rows[0]!.aggregate.isComplete).toBe(true);
  });

  it('start bez kompletu ocen jest wstępny, wycofany bez miejsca', () => {
    const input = category(3, 2);
    const partial: CalculatorInput = {
      ...input,
      judgeCount: 3,
      entries: input.entries.map((e, i) => (i === 2 ? { ...e, status: 'WITHDRAWN' as const } : e)),
    };
    const rows = rankCategory(partial);
    expect(rows.find((r) => r.entryId === 'e0')!.aggregate.isComplete).toBe(false);
    expect(rows.find((r) => r.entryId === 'e2')!.rank).toBeNull();
  });
});

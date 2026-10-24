import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  aggregate,
  aggregateEntry,
  formatScore,
  maxJudgeScore,
  rankEntries,
  sheetTotal,
  type CategoryConfig,
  type RankInput,
  type SheetInput,
} from '../src/index.js';

const RUNS = 10_000;

/** Losowa konfiguracja z domen MVP: 1–12 kryteriów, skale 1–20, wagi 0,5–5, 0–10 kar. */
const configArb: fc.Arbitrary<CategoryConfig> = fc.record({
  criteria: fc
    .array(
      fc.record({
        scaleMax: fc.integer({ min: 1, max: 20 }),
        weightTenths: fc.integer({ min: 1, max: 10 }).map((w) => w * 5),
      }),
      { minLength: 1, maxLength: 12 },
    )
    .map((cs) => cs.map((c, i) => ({ ...c, id: `c${i}` }))),
  penaltyTypes: fc
    .array(
      fc.record({
        pointsTenths: fc.integer({ min: 1, max: 100 }).map((p) => p * 5),
        maxOccurrences: fc.integer({ min: 1, max: 10 }),
      }),
      { maxLength: 10 },
    )
    .map((ps) => ps.map((p, i) => ({ ...p, id: `p${i}` }))),
});

const configWithSheet = configArb.chain((config) =>
  fc
    .record({
      notes: fc.tuple(
        ...config.criteria.map((c) => fc.integer({ min: 0, max: c.scaleMax * 2 }).map((h) => h * 5)),
      ),
      counts: fc.tuple(...config.penaltyTypes.map((p) => fc.integer({ min: 0, max: p.maxOccurrences }))),
    })
    .map(({ notes, counts }): [CategoryConfig, SheetInput] => [
      config,
      {
        criteria: Object.fromEntries(config.criteria.map((c, i) => [c.id, notes[i] ?? 0])),
        penalties: Object.fromEntries(config.penaltyTypes.map((p, i) => [p.id, counts[i] ?? 0])),
      },
    ]),
);

/** Referencja half-up na BigInt (licznik/mianownik). */
function referenceMean(totals: readonly number[]): number {
  const sum = totals.reduce((a, b) => a + BigInt(b), 0n);
  const n = BigInt(totals.length);
  const q = sum / n;
  return Number(2n * (sum - q * n) >= n ? q + 1n : q);
}

describe('właściwości silnika punktacji (IMP-056)', () => {
  it('TC-SCORING-027: 0 ≤ T ≤ MAX', () => {
    fc.assert(
      fc.property(configWithSheet, ([config, sheet]) => {
        const { totalHundredths } = sheetTotal(sheet, config);
        return totalHundredths >= 0 && totalHundredths <= maxJudgeScore(config.criteria);
      }),
      { numRuns: RUNS },
    );
  });

  it('TC-SCORING-028: monotoniczność względem not i kar', () => {
    fc.assert(
      fc.property(configWithSheet, fc.nat(), ([config, sheet], pick) => {
        const before = sheetTotal(sheet, config).totalHundredths;
        const c = config.criteria[pick % config.criteria.length];
        if (c && (sheet.criteria[c.id] ?? 0) < c.scaleMax * 10) {
          const up = { ...sheet, criteria: { ...sheet.criteria, [c.id]: (sheet.criteria[c.id] ?? 0) + 5 } };
          if (sheetTotal(up, config).totalHundredths < before) return false;
        }
        const p = config.penaltyTypes[pick % Math.max(1, config.penaltyTypes.length)];
        if (p && (sheet.penalties[p.id] ?? 0) < p.maxOccurrences) {
          const more = {
            ...sheet,
            penalties: { ...sheet.penalties, [p.id]: (sheet.penalties[p.id] ?? 0) + 1 },
          };
          if (sheetTotal(more, config).totalHundredths > before) return false;
        }
        return true;
      }),
      { numRuns: RUNS },
    );
  });

  it('TC-SCORING-029: średnia zgodna z referencją BigInt i niezależna od kolejności', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 120_000 }), { minLength: 1, maxLength: 30 }),
        (totals) => {
          const r = aggregate(totals);
          return r === referenceMean(totals) && r === aggregate([...totals].reverse());
        },
      ),
      { numRuns: RUNS },
    );
  });

  it('TC-SCORING-030: ranking „1, 2, 2, 4” niezależny od kolejności wejścia', () => {
    const rowsArb = fc
      .array(
        fc.record({
          totals: fc.array(fc.constantFrom(4800, 5000, 5250, 5500), { maxLength: 3 }),
          tie: fc.constantFrom(80, 90),
          pen: fc.constantFrom(0, 100),
          withdrawn: fc.boolean(),
        }),
        { maxLength: 300 },
      )
      .map((rows) =>
        rows.map((r, i): RankInput => ({
          entryId: `e${i}`,
          startNumber: i + 1,
          startOrder: i + 1,
          entryStatus: r.withdrawn ? 'WITHDRAWN' : 'ACTIVE',
          aggregate: aggregateEntry(
            r.totals.map((t, j) => ({
              judgeId: `j${j}`,
              totalHundredths: t,
              penaltyHundredths: r.pen,
              tieBreakTenths: r.tie,
            })),
            3,
          ),
        })),
      );
    fc.assert(
      fc.property(rowsArb, fc.nat(), (rows, seed) => {
        const shuffled = [...rows].sort(
          (a, b) => ((a.startNumber * 7919 + seed) % 101) - ((b.startNumber * 7919 + seed) % 101),
        );
        const ranked = rankEntries(rows, { categoryStatus: 'IN_PROGRESS' });
        const again = rankEntries(shuffled, { categoryStatus: 'IN_PROGRESS' });
        if (JSON.stringify(ranked) !== JSON.stringify(again)) return false;
        const scored = ranked.filter((r) => r.rank !== null);
        const key = (r: RankInput) =>
          [
            r.aggregate.officialHundredths,
            r.aggregate.tieBreakHundredths,
            -(r.aggregate.penaltyMeanHundredths ?? 0),
          ] as const;
        const better = (a: RankInput, b: RankInput) => {
          const [x, y] = [key(a), key(b)];
          for (let i = 0; i < 3; i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) > (y[i] ?? 0);
          return false;
        };
        return (
          scored.every((r) => r.rank === 1 + scored.filter((o) => better(o, r)).length) &&
          ranked
            .filter((r) => r.rank === null)
            .every((r) => r.entryStatus === 'WITHDRAWN' || r.aggregate.sheetCount === 0)
        );
      }),
      { numRuns: 300 },
    );
  });

  it('TC-SCORING-032: wszystkie wartości wyjściowe są całkowite', () => {
    fc.assert(
      fc.property(configWithSheet, ([config, sheet]) => {
        const t = sheetTotal(sheet, config);
        const agg = aggregateEntry(
          [
            {
              judgeId: 'j',
              totalHundredths: t.totalHundredths,
              penaltyHundredths: t.penaltyHundredths,
              tieBreakTenths: 50,
            },
          ],
          1,
        );
        return [...Object.values(t), ...Object.values(agg)].every(
          (v) => typeof v !== 'number' || Number.isInteger(v),
        );
      }),
      { numRuns: RUNS },
    );
  });

  it('TC-SCORING-034: wyświetlanie 1 miejsca zgodne z referencją dziesiętną half-up', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 150_000 }), (h) => {
        const tenths = referenceMean(Array.from({ length: 10 }, () => 0).map((_, i) => (i === 0 ? h : 0)));
        // referenceMean([h, 0×9]) = round_half_up(h / 10) – ta sama operacja co prezentacja wyniku.
        const expected = `${Math.floor(tenths / 10)},${tenths % 10}`;
        return formatScore(h) === expected && /^\d+,\d$/.test(formatScore(h));
      }),
      { numRuns: RUNS },
    );
  });
});

describe('referencja testowa', () => {
  it('referenceMean: half-up', () => {
    expect([referenceMean([5400, 5625]), referenceMean([1, 2]), referenceMean([1, 1, 2])]).toEqual([
      5513, 2, 1,
    ]);
  });
});

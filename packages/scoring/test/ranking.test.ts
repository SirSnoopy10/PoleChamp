import { describe, expect, it } from 'vitest';
import {
  aggregate,
  aggregateEntry,
  expectedJudges,
  formatRanking,
  formatScore,
  penaltyMean,
  rankEntries,
  summarizeSheet,
  tieBreakMean,
  type EntryAggregate,
  type RankInput,
  type SheetSummary,
} from '../src/index.js';
import { configFor, poleSportSheet } from './helpers.js';

/** Podsumowania arkuszy z samych wyników sędziów (Technika i kary neutralne). */
function sheets(totals: readonly number[], tieBreakTenths = 80, penalty = 0): SheetSummary[] {
  return totals.map((t, i) => ({
    judgeId: `j${i}`,
    totalHundredths: t,
    penaltyHundredths: penalty,
    tieBreakTenths,
  }));
}

function entry(
  startNumber: number,
  agg: EntryAggregate,
  entryStatus: 'ACTIVE' | 'WITHDRAWN' = 'ACTIVE',
): RankInput {
  return { entryId: `e${startNumber}`, startNumber, startOrder: startNumber, entryStatus, aggregate: agg };
}

/** Kategoria c3 „Pole Sport Advanced” z prototypu (03-analiza-designu §8.6), J = 5. */
const C3: [number, number[]][] = [
  [41, [5400, 5050, 5500, 5350, 5025]],
  [42, [5100, 5375, 5100, 5250, 5525]],
  [43, [5525, 5625, 5525, 5300, 5400]],
  [44, [4800, 4800, 4800, 4800, 4800]],
  [45, [5450, 5425, 5275, 5525, 5475]],
  [46, [5400, 5625]],
  [47, [5475, 5600, 5575]],
  [48, []],
  [49, []],
];
const c3Rows = C3.map(([nr, totals]) => entry(nr, aggregateEntry(sheets(totals), 5)));

describe('agregacja (IMP-053)', () => {
  it('TC-SCORING-004: P4 – średnia 5 sędziów 54,75 → „54,8”', () => {
    const r = aggregate([5525, 5625, 5525, 5300, 5400]);
    expect(r).toBe(5475);
    expect(formatScore(r)).toBe('54,8');
  });

  it('TC-SCORING-005: P5 – „54,3”', () => {
    const r = aggregate([5450, 5425, 5275, 5525, 5475]);
    expect(r).toBe(5430);
    expect(formatScore(r)).toBe('54,3');
  });

  it('TC-SCORING-008: P8 – połówka 55,125 → 55,13 → „55,1”', () => {
    const r = aggregate([5400, 5625]);
    expect(r).toBe(5513);
    expect(formatScore(r)).toBe('55,1');
  });

  it('TC-SCORING-013: P13 – średnia obcięta (v1.1)', () => {
    expect(aggregate([5525, 5625, 5525, 5300, 5400], 'TRIMMED_MEAN')).toBe(5483);
    expect(aggregate([5400, 5625], 'TRIMMED_MEAN')).toBe(aggregate([5400, 5625]));
    expect(aggregate([])).toBeNull();
  });

  it('TC-SCORING-015: średnia tylko z ocen złożonych (n, nie J)', () => {
    const agg = aggregateEntry(sheets([5400, 5600]), 5);
    expect(agg).toMatchObject({
      sheetCount: 2,
      expectedCount: 5,
      officialHundredths: 5500,
      isComplete: false,
    });
  });

  it('TC-SCORING-022: kary liczone w arkuszu każdego sędziego', () => {
    const config = configFor();
    const s1 = summarizeSheet('j1', poleSportSheet([8, 8, 8, 8, 8], 1), config);
    const s2 = summarizeSheet('j2', poleSportSheet([8, 8, 8, 8, 8]), config);
    expect(s1.totalHundredths).toBe(s2.totalHundredths - 200);
    expect(penaltyMean([s1.penaltyHundredths, s2.penaltyHundredths])).toBe(100);
    expect(aggregateEntry([s1, s2], 2).penaltyMeanHundredths).toBe(100);
  });

  it('TC-SCORING-033: średnia Techniki i kar – wzory całkowitoliczbowe', () => {
    expect(tieBreakMean([90, 85])).toBe(875);
    expect(penaltyMean([200, 0])).toBe(100);
    expect(tieBreakMean([])).toBeNull();
    expect(penaltyMean([])).toBeNull();
  });

  it('summarizeSheet: kryterium rozstrzygające z konfiguracji lub pierwsze', () => {
    const config = configFor();
    const sheet = poleSportSheet([9, 7, 8, 8, 8]);
    expect(summarizeSheet('j', sheet, config).tieBreakTenths).toBe(90);
    expect(summarizeSheet('j', sheet, { ...config, tieBreakCriterionId: 'artistry' }).tieBreakTenths).toBe(
      70,
    );
    expect(summarizeSheet('j', sheet, { criteria: [], penaltyTypes: [] }).tieBreakTenths).toBe(0);
  });

  it('TC-SCORING-040: liczba sędziów oczekiwanych J', () => {
    const panel = [
      { judgeId: 'jA', isActive: true },
      { judgeId: 'jB', isActive: true },
      { judgeId: 'jC', isActive: true },
      { judgeId: 'jD', isActive: false },
      { judgeId: 'jE', isActive: false },
    ];
    expect(expectedJudges(panel, ['jA', 'jE'])).toBe(4);
  });
});

describe('ranking (IMP-054)', () => {
  it('TC-SCORING-006: P6 – pozorny remis 52,70 / 52,65 w c3', () => {
    const ranked = rankEntries(c3Rows, { categoryStatus: 'IN_PROGRESS' });
    const display = formatRanking(
      ranked.map((r) => ({ rank: r.rank, officialHundredths: r.aggregate.officialHundredths })),
    );
    const table = ranked.map((r, i) => [r.startNumber, r.rank, display[i]]);
    expect(table).toEqual([
      [47, 1, '55,50'],
      [46, 2, '55,13'],
      [43, 3, '54,75'],
      [45, 4, '54,30'],
      [42, 5, '52,70'],
      [41, 6, '52,65'],
      [44, 7, '48,00'],
      [48, null, '—'],
      [49, null, '—'],
    ]);
  });

  it('TC-SCORING-007: P7 – wynik niekompletny 3/5 i flaga „wstępny”', () => {
    const inProgress = rankEntries(c3Rows, { categoryStatus: 'IN_PROGRESS' })[0];
    const locked = rankEntries(c3Rows, { categoryStatus: 'LOCKED' })[0];
    expect(inProgress).toMatchObject({ startNumber: 47, rank: 1, isProvisional: false });
    expect(inProgress?.aggregate).toMatchObject({
      officialHundredths: 5550,
      sheetCount: 3,
      isComplete: false,
    });
    expect(formatScore(inProgress?.aggregate.officialHundredths ?? null)).toBe('55,5');
    expect(locked?.isProvisional).toBe(true);
  });

  it('TC-SCORING-009: P9 – remis rozstrzygnięty Techniką', () => {
    const a = aggregateEntry(
      [
        { judgeId: 'j1', totalHundredths: 5450, penaltyHundredths: 0, tieBreakTenths: 90 },
        { judgeId: 'j2', totalHundredths: 5400, penaltyHundredths: 0, tieBreakTenths: 85 },
      ],
      2,
    );
    const b = aggregateEntry(sheets([5425, 5425], 85), 2);
    expect([a.officialHundredths, b.officialHundredths, a.tieBreakHundredths, b.tieBreakHundredths]).toEqual([
      5425, 5425, 875, 850,
    ]);
    const ranked = rankEntries([entry(2, b), entry(1, a)], { categoryStatus: 'IN_PROGRESS' });
    expect(ranked.map((r) => [r.startNumber, r.rank])).toEqual([
      [1, 1],
      [2, 2],
    ]);
  });

  it('TC-SCORING-010: P10 – remis karami oraz ex aequo (1, 2, 3, 3, 5)', () => {
    const mk = (r: number, tie: number, pen: number): EntryAggregate => ({
      sheetCount: 2,
      expectedCount: 2,
      sumHundredths: r * 2,
      officialHundredths: r,
      tieBreakHundredths: tie,
      penaltyMeanHundredths: pen,
      isComplete: true,
    });
    const input = [
      entry(7, mk(4825, 700, 0)),
      entry(6, mk(4900, 750, 0)),
      entry(5, mk(4900, 750, 0)),
      entry(4, mk(5000, 800, 100)),
      entry(3, mk(5000, 800, 0)),
    ];
    const ranked = rankEntries(input, { categoryStatus: 'IN_PROGRESS' });
    expect(ranked.map((r) => [r.startNumber, r.rank])).toEqual([
      [3, 1],
      [4, 2],
      [5, 3],
      [6, 3],
      [7, 5],
    ]);
  });

  it('TC-SCORING-018: kolejność kryteriów remisu', () => {
    const mk = (tie: number, pen: number) => aggregateEntry(sheets([5000, 5000], tie, pen), 2);
    const order = (x: EntryAggregate, y: EntryAggregate) =>
      rankEntries([entry(2, x), entry(1, y)], { categoryStatus: 'IN_PROGRESS' }).map((r) => [
        r.startNumber,
        r.rank,
      ]);
    expect(order(mk(90, 0), mk(80, 0))).toEqual([
      [2, 1],
      [1, 2],
    ]);
    expect(order(mk(80, 0), mk(80, 100))).toEqual([
      [2, 1],
      [1, 2],
    ]);
    expect(order(mk(80, 0), mk(80, 0))).toEqual([
      [1, 1],
      [2, 1],
    ]);
  });

  it('TC-SCORING-020: starty bez ocen na końcu wg kolejności startowej', () => {
    const ranked = rankEntries([...c3Rows].reverse(), { categoryStatus: 'IN_PROGRESS' });
    expect(ranked.slice(-2).map((r) => [r.startNumber, r.rank, r.isProvisional])).toEqual([
      [48, null, false],
      [49, null, false],
    ]);
  });

  it('TC-SCORING-024: start wycofany poza rankingiem, za startami bez ocen', () => {
    const best = aggregateEntry(sheets([6400, 6400, 6400, 6400, 6400]), 5);
    const ranked = rankEntries([...c3Rows, entry(50, best, 'WITHDRAWN')], { categoryStatus: 'IN_PROGRESS' });
    const last = ranked.at(-1);
    expect(last).toMatchObject({ startNumber: 50, rank: null, entryStatus: 'WITHDRAWN' });
    expect(ranked[0]).toMatchObject({ startNumber: 47, rank: 1 });
  });

  it('TC-SCORING-025: flaga „wstępny” zależnie od statusu i PDF', () => {
    const rows = [
      entry(1, aggregateEntry(sheets([5000, 5000, 5000]), 5)),
      entry(2, aggregateEntry(sheets([4000, 4000, 4000, 4000, 4000]), 5)),
    ];
    const flags = (opts: Parameters<typeof rankEntries>[1]) =>
      rankEntries(rows, opts).map((r) => r.isProvisional);
    expect(flags({ categoryStatus: 'IN_PROGRESS' })).toEqual([false, false]);
    expect(flags({ categoryStatus: 'LOCKED' })).toEqual([true, false]);
    expect(flags({ categoryStatus: 'IN_PROGRESS', forPdf: true })).toEqual([true, false]);
  });
});

describe('ranking – przypadki obronne', () => {
  it('nieznane kryterium rozstrzygające daje 0', () => {
    const config = { ...configFor(), tieBreakCriterionId: 'missing' };
    expect(summarizeSheet('j', poleSportSheet([9, 9, 9, 9, 9]), config).tieBreakTenths).toBe(0);
  });

  it('brakujące średnie w agregacie są traktowane jako 0', () => {
    const partial: EntryAggregate = {
      sheetCount: 1,
      expectedCount: 1,
      sumHundredths: 0,
      officialHundredths: null,
      tieBreakHundredths: null,
      penaltyMeanHundredths: null,
      isComplete: true,
    };
    const full = aggregateEntry(sheets([100]), 1);
    const ranked = rankEntries([entry(1, partial), entry(2, full)], { categoryStatus: 'IN_PROGRESS' });
    expect(ranked.map((r) => [r.startNumber, r.rank])).toEqual([
      [2, 1],
      [1, 2],
    ]);
  });
});

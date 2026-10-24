import { describe, expect, it } from 'vitest';
import {
  defaultSheet,
  formatPenaltySum,
  formatScore,
  maxJudgeScore,
  mulTenths,
  roundHalfUpDiv,
  sheetTotal,
  templateForStyle,
  toTenths,
  validateCategoryConfig,
  validateSheet,
} from '../src/index.js';
import { configFor, poleSportSheet } from './helpers.js';

const poleSport = configFor('POLE_SPORT');

describe('arkusz sędziego (IMP-052)', () => {
  it('TC-SCORING-001: P1 – arkusz bez kar 54,25 → „54,3”', () => {
    const t = sheetTotal(poleSportSheet([8.5, 8.5, 8, 8, 8.5]), poleSport);
    expect(t).toEqual({ criteriaHundredths: 5425, penaltyHundredths: 0, totalHundredths: 5425 });
    expect(formatScore(t.totalHundredths)).toBe('54,3');
  });

  it('TC-SCORING-002: P2 – Upadek ×2 → 50,25 → „50,3”, chip „−4,0”', () => {
    const t = sheetTotal(poleSportSheet([8.5, 8.5, 8, 8, 8.5], 2), poleSport);
    expect(t.penaltyHundredths).toBe(400);
    expect(t.totalHundredths).toBe(5025);
    expect(formatScore(t.totalHundredths)).toBe('50,3');
    expect(formatPenaltySum(t.penaltyHundredths)).toBe('−4,0');
  });

  it('TC-SCORING-003: P3 – arkusz demo z Przekroczeniem czasu ×1', () => {
    const t = sheetTotal(poleSportSheet([8.5, 9, 8, 9, 7.5], 0, 1), poleSport);
    expect(t).toEqual({ criteriaHundredths: 5500, penaltyHundredths: 100, totalHundredths: 5400 });
    expect(formatScore(t.totalHundredths)).toBe('54,0');
  });

  it('TC-SCORING-011: P11 – obcięcie do zera', () => {
    const t = sheetTotal(poleSportSheet([0.5, 0.5, 0.5, 0.5, 0.5], 3), poleSport);
    expect(t).toEqual({ criteriaHundredths: 325, penaltyHundredths: 600, totalHundredths: 0 });
    expect(formatScore(t.totalHundredths)).toBe('0,0');
    expect(formatPenaltySum(t.penaltyHundredths)).toBe('−6,0');
  });

  it('TC-SCORING-012: P12 – Exotic: 6 kryteriów, maks. 75', () => {
    const exotic = configFor('EXOTIC');
    const sheet = {
      criteria: { technique: 80, artistry: 85, choreography: 75, floorwork: 90, flow: 80, overall: 80 },
      penalties: { fall: 0, overtime: 2 },
    };
    const t = sheetTotal(sheet, exotic);
    expect(t).toEqual({ criteriaHundredths: 6125, penaltyHundredths: 200, totalHundredths: 5925 });
    expect(formatScore(t.totalHundredths)).toBe('59,3');
    expect(maxJudgeScore(exotic.criteria)).toBe(7500);
  });

  it('TC-SCORING-014: P14 – wartości domyślne nowego formularza', () => {
    const sheet = defaultSheet(poleSport);
    expect(Object.values(sheet.criteria)).toEqual([50, 50, 50, 50, 50]);
    expect(sheet.penalties).toEqual({ fall: 0, overtime: 0 });
    expect(sheet.comment).toBe('');
    expect(sheetTotal(sheet, poleSport).totalHundredths).toBe(3250);
    expect(formatScore(maxJudgeScore(poleSport.criteria))).toBe('65,0');
  });

  it('TC-SCORING-017: obcięcie do 0 nie zmienia sumy kar', () => {
    const config = {
      criteria: [{ id: 'a', scaleMax: 10, weightTenths: 10 }],
      penaltyTypes: poleSport.penaltyTypes,
    };
    const t = sheetTotal({ criteria: { a: 30 }, penalties: { fall: 3 } }, config);
    expect(t).toEqual({ criteriaHundredths: 300, penaltyHundredths: 600, totalHundredths: 0 });
  });

  it('TC-SCORING-023: wartość początkowa = połowa skali', () => {
    const config = {
      criteria: [1, 7, 10, 20].map((scaleMax, i) => ({ id: `c${i}`, scaleMax, weightTenths: 10 })),
      penaltyTypes: poleSport.penaltyTypes,
    };
    const sheet = defaultSheet(config);
    expect(Object.values(sheet.criteria)).toEqual([5, 35, 50, 100]);
    expect(Object.values(sheet.penalties)).toEqual([0, 0]);
  });

  it('TC-SCORING-026: szablony stylów', () => {
    for (const style of ['POLE_SPORT', 'POLE_ART', 'DOUBLES'] as const) {
      const t = templateForStyle(style);
      expect(t.criteria).toHaveLength(5);
      expect(maxJudgeScore(t.criteria)).toBe(6500);
    }
    const exotic = templateForStyle('EXOTIC');
    expect(exotic.criteria).toHaveLength(6);
    expect(exotic.criteria[3]).toMatchObject({
      name: 'Praca na podłodze',
      description: 'Floorwork i przejścia parterowe',
    });
    expect(maxJudgeScore(exotic.criteria)).toBe(7500);
    for (const style of ['POLE_SPORT', 'POLE_ART', 'EXOTIC', 'DOUBLES'] as const) {
      expect(templateForStyle(style).penaltyTypes).toEqual([
        { key: 'fall', name: 'Upadek', pointsTenths: 20, maxOccurrences: 3 },
        { key: 'overtime', name: 'Przekroczenie czasu', pointsTenths: 10, maxOccurrences: 2 },
      ]);
    }
    expect(templateForStyle('POLE_SPORT').criteria[0]).toEqual({
      key: 'technique',
      name: 'Technika',
      scaleMax: 10,
      weightTenths: 20,
      description: 'Siła, elementy na rurze',
    });
  });

  it('TC-SCORING-037: maksymalny wynik sędziego', () => {
    expect(maxJudgeScore(poleSport.criteria)).toBe(6500);
    expect(maxJudgeScore(configFor('EXOTIC').criteria)).toBe(7500);
    const custom = [
      { id: 'a', scaleMax: 7, weightTenths: 15 },
      { id: 'b', scaleMax: 10, weightTenths: 20 },
    ];
    expect(formatScore(maxJudgeScore(custom))).toBe('30,5');
  });

  it('TC-SCORING-021: kompletność arkusza względem konfiguracji', () => {
    const ok = poleSportSheet([8, 8, 8, 8, 8]);
    const withoutFlow = { ...ok, criteria: { ...ok.criteria } } as {
      criteria: Record<string, number>;
      penalties: Record<string, number>;
    };
    delete withoutFlow.criteria.flow;
    const results = [
      validateSheet(withoutFlow, poleSport),
      validateSheet({ ...ok, criteria: { ...ok.criteria, extra: 50 } }, poleSport),
      validateSheet({ ...ok, penalties: { fall: 1 } }, poleSport),
      validateSheet({ ...ok, criteria: { ...ok.criteria, technique: 105 } }, poleSport),
      validateSheet({ ...ok, criteria: { ...ok.criteria, technique: 83 } }, poleSport),
      validateSheet({ ...ok, penalties: { fall: 4, overtime: 0 } }, poleSport),
    ];
    expect(results.map((r) => (r.ok ? 'OK' : r.code))).toEqual([
      'SCHEMA_MISMATCH',
      'SCHEMA_MISMATCH',
      'OK',
      'OUT_OF_RANGE',
      'INVALID_STEP',
      'OUT_OF_RANGE',
    ]);
  });

  it('validateSheet: nieznana kara, ujemna nota i za długi komentarz', () => {
    const ok = poleSportSheet([8, 8, 8, 8, 8]);
    const codes = [
      validateSheet({ ...ok, penalties: { fall: 0, foul: 1 } }, poleSport),
      validateSheet({ ...ok, criteria: { ...ok.criteria, technique: -5 } }, poleSport),
      validateSheet({ ...ok, penalties: { fall: 1.5 } }, poleSport),
      validateSheet({ ...ok, comment: 'x'.repeat(501) }, poleSport),
      validateSheet({ ...ok, comment: 'x'.repeat(500) }, poleSport),
    ].map((r) => (r.ok ? 'OK' : r.code));
    expect(codes).toEqual(['SCHEMA_MISMATCH', 'OUT_OF_RANGE', 'OUT_OF_RANGE', 'TOO_LONG', 'OK']);
  });
});

describe('arytmetyka stałoprzecinkowa (IMP-051)', () => {
  it('TC-SCORING-016: roundHalfUpDiv na liczbach całkowitych', () => {
    const pairs: [number, number][] = [
      [11025, 2],
      [27375, 5],
      [1, 3],
      [2, 3],
      [0, 7],
      [999999, 1000],
    ];
    const out = pairs.map(([n, d]) => roundHalfUpDiv(n, d));
    expect(out).toEqual([5513, 5475, 0, 1, 0, 1000]);
    expect(out.every(Number.isInteger)).toBe(true);
    expect(roundHalfUpDiv(5, 2)).toBe(3);
    expect(roundHalfUpDiv(4, 2)).toBe(2);
    expect(() => roundHalfUpDiv(-1, 2)).toThrow(RangeError);
    expect(() => roundHalfUpDiv(1, 0)).toThrow(RangeError);
    expect(() => roundHalfUpDiv(1.5, 2)).toThrow(RangeError);
  });

  it('TC-SCORING-039: parsowanie liczb z API do dziesiątych', () => {
    const out = [8.5, 10, 0, 8.3, '8,5', -0.5, 8.25, Number.NaN].map((v) => {
      const r = toTenths(v);
      return r.ok ? r.value : r.code;
    });
    expect(out).toEqual([
      85,
      100,
      0,
      'INVALID_STEP',
      'INVALID_FORMAT',
      'OUT_OF_RANGE',
      'INVALID_STEP',
      'INVALID_FORMAT',
    ]);
  });

  it('TC-SCORING-044: domeny konfiguracji kategorii', () => {
    const criterion = { scaleMax: 10, weightTenths: 20 };
    const penalty = { pointsTenths: 20, maxOccurrences: 3 };
    const cases = [
      { criteria: [], penaltyTypes: [] },
      { criteria: Array.from({ length: 13 }, () => criterion), penaltyTypes: [] },
      { criteria: [criterion], penaltyTypes: Array.from({ length: 11 }, () => penalty) },
      { criteria: [{ scaleMax: 10, weightTenths: 3 }], penaltyTypes: [] },
      { criteria: [{ scaleMax: 21, weightTenths: 10 }], penaltyTypes: [] },
      { criteria: [criterion], penaltyTypes: [{ pointsTenths: 505, maxOccurrences: 1 }] },
      { criteria: [criterion], penaltyTypes: [{ pointsTenths: 20, maxOccurrences: 0 }] },
      { criteria: [criterion], penaltyTypes: [{ pointsTenths: 20, maxOccurrences: 11 }] },
      { criteria: [criterion], penaltyTypes: [penalty] },
    ];
    expect(
      cases.map((c) => validateCategoryConfig(c)).map((r) => (r.ok ? 'OK' : `${r.code}@${r.field}`)),
    ).toEqual([
      'MIN_CRITERIA@criteria',
      'LIMIT_EXCEEDED@criteria',
      'LIMIT_EXCEEDED@penaltyTypes',
      'INVALID_STEP@criteria.0.weight',
      'OUT_OF_RANGE@criteria.0.scaleMax',
      'OUT_OF_RANGE@penaltyTypes.0.points',
      'OUT_OF_RANGE@penaltyTypes.0.maxOccurrences',
      'OUT_OF_RANGE@penaltyTypes.0.maxOccurrences',
      'OK',
    ]);
  });
});

describe('przypadki obronne', () => {
  it('sheetTotal: brakująca nota lub licznik liczą się jako 0 (szkic formularza)', () => {
    const t = sheetTotal({ criteria: { technique: 100 }, penalties: {} }, poleSport);
    expect(t).toEqual({ criteriaHundredths: 2000, penaltyHundredths: 0, totalHundredths: 2000 });
  });

  it('mulTenths: nota × waga w setnych', () => {
    expect(mulTenths(85, 15)).toBe(1275);
  });
});

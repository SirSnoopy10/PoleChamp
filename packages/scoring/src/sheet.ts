import type { CategoryConfig, CriterionConfig, Hundredths, Result, SheetInput, Tenths } from './types.js';

const MAX_COMMENT = 500;

export interface SheetTotal {
  criteriaHundredths: Hundredths;
  penaltyHundredths: Hundredths;
  /** T = max(0, K − P) (D-SC-03). */
  totalHundredths: Hundredths;
}

/** Wynik sędziego: K = Σ v×w, P = Σ n×c, T = max(0, K − P) – wszystko w setnych. */
export function sheetTotal(sheet: SheetInput, config: CategoryConfig): SheetTotal {
  const criteriaHundredths = config.criteria.reduce(
    (sum, c) => sum + (sheet.criteria[c.id] ?? 0) * c.weightTenths,
    0,
  );
  const penaltyHundredths = config.penaltyTypes.reduce(
    (sum, p) => sum + (sheet.penalties[p.id] ?? 0) * p.pointsTenths * 10,
    0,
  );
  return {
    criteriaHundredths,
    penaltyHundredths,
    totalHundredths: Math.max(0, criteriaHundredths - penaltyHundredths),
  };
}

/** MAX = Σ S×w w setnych (65 pkt → 6500 dla Pole Sport, 7500 dla Exotic). */
export function maxJudgeScore(
  criteria: readonly Pick<CriterionConfig, 'scaleMax' | 'weightTenths'>[],
): Hundredths {
  return criteria.reduce((sum, c) => sum + c.scaleMax * 10 * c.weightTenths, 0);
}

/** Nowy formularz: noty = połowa skali, kary 0, komentarz pusty (D-SC-09, P14). */
export function defaultSheet(config: CategoryConfig): Required<SheetInput> {
  return {
    criteria: Object.fromEntries(config.criteria.map((c) => [c.id, c.scaleMax * 5])),
    penalties: Object.fromEntries(config.penaltyTypes.map((p) => [p.id, 0])),
    comment: '',
  };
}

/**
 * Walidacja arkusza względem konfiguracji kategorii (INT-02, TC-SCORING-021).
 * Zbiór kryteriów musi być równy konfiguracji; brak licznika kary oznacza 0, nieznana kara to błąd schematu.
 */
export function validateSheet(sheet: SheetInput, config: CategoryConfig): Result<SheetInput> {
  const criterionIds = config.criteria.map((c) => c.id);
  const penaltyIds = config.penaltyTypes.map((p) => p.id);
  const sheetCriterionIds = Object.keys(sheet.criteria);
  if (
    sheetCriterionIds.length !== criterionIds.length ||
    !criterionIds.every((id) => sheetCriterionIds.includes(id)) ||
    !Object.keys(sheet.penalties).every((id) => penaltyIds.includes(id))
  ) {
    return { ok: false, code: 'SCHEMA_MISMATCH' };
  }
  for (const c of config.criteria) {
    // Komplet kluczy sprawdzony wyżej.
    const v = sheet.criteria[c.id] as Tenths;
    if (!Number.isInteger(v) || v % 5 !== 0)
      return { ok: false, code: 'INVALID_STEP', field: `criteria.${c.id}` };
    if (v < 0 || v > c.scaleMax * 10) return { ok: false, code: 'OUT_OF_RANGE', field: `criteria.${c.id}` };
  }
  for (const p of config.penaltyTypes) {
    const n = sheet.penalties[p.id] ?? 0;
    if (!Number.isInteger(n) || n < 0 || n > p.maxOccurrences) {
      return { ok: false, code: 'OUT_OF_RANGE', field: `penalties.${p.id}` };
    }
  }
  if ((sheet.comment ?? '').length > MAX_COMMENT) return { ok: false, code: 'TOO_LONG', field: 'comment' };
  return { ok: true, value: sheet };
}

import type { Hundredths, Result, Tenths } from './types.js';

const MAX_CRITERIA = 12;
const MAX_PENALTY_TYPES = 10;

/** Nota/waga/kara z API (liczba JSON z krokiem `stepTenths`, domyślnie 0,5) → dziesiąte. */
export function toTenths(decimal: unknown, stepTenths: Tenths = 5): Result<Tenths> {
  if (typeof decimal !== 'number' || !Number.isFinite(decimal)) return { ok: false, code: 'INVALID_FORMAT' };
  if (decimal < 0) return { ok: false, code: 'OUT_OF_RANGE' };
  const scaled = decimal * 10;
  const tenths = Math.round(scaled);
  if (Math.abs(scaled - tenths) > 1e-9 || tenths % stepTenths !== 0)
    return { ok: false, code: 'INVALID_STEP' };
  return { ok: true, value: tenths };
}

/** Dzielenie z zaokrągleniem ROUND_HALF_UP na liczbach całkowitych: ⌊(2·num + den) / (2·den)⌋. */
export function roundHalfUpDiv(num: number, den: number): number {
  if (!Number.isInteger(num) || !Number.isInteger(den) || num < 0 || den <= 0) {
    throw new RangeError(`roundHalfUpDiv: wymagane całkowite num ≥ 0 i den > 0 (num=${num}, den=${den})`);
  }
  return Math.floor((2 * num + den) / (2 * den));
}

/** Nota × waga (dziesiąte × dziesiąte) → setne. */
export function mulTenths(value: Tenths, weight: Tenths): Hundredths {
  return value * weight;
}

function stepAndRange(value: number, step: number, min: number, max: number): Result<number> {
  if (!Number.isInteger(value) || value % step !== 0) return { ok: false, code: 'INVALID_STEP' };
  if (value < min || value > max) return { ok: false, code: 'OUT_OF_RANGE' };
  return { ok: true, value };
}

export const validateScaleMax = (scaleMax: number): Result<number> => stepAndRange(scaleMax, 1, 1, 20);
export const validateWeightTenths = (weight: Tenths): Result<number> => stepAndRange(weight, 5, 5, 50);
export const validatePenaltyPointsTenths = (points: Tenths): Result<number> =>
  stepAndRange(points, 5, 5, 500);
export const validateMaxOccurrences = (max: number): Result<number> => stepAndRange(max, 1, 1, 10);
/** Krok noty: 1, 5 albo 10 dziesiątych (0,1 / 0,5 / 1 pkt). */
export const validateStepTenths = (step: Tenths): Result<number> =>
  step === 1 || step === 5 || step === 10 ? { ok: true, value: step } : { ok: false, code: 'INVALID_STEP' };

export interface CategoryConfigInput {
  criteria: readonly { scaleMax: number; weightTenths: Tenths; stepTenths?: Tenths }[];
  penaltyTypes: readonly { pointsTenths: Tenths; maxOccurrences: number }[];
}

/** Domeny konfiguracji kategorii (FR-305, FR-306, FR-307; TC-SCORING-044). */
export function validateCategoryConfig(config: CategoryConfigInput): Result<CategoryConfigInput> {
  if (config.criteria.length === 0) return { ok: false, code: 'MIN_CRITERIA', field: 'criteria' };
  if (config.criteria.length > MAX_CRITERIA) return { ok: false, code: 'LIMIT_EXCEEDED', field: 'criteria' };
  if (config.penaltyTypes.length > MAX_PENALTY_TYPES) {
    return { ok: false, code: 'LIMIT_EXCEEDED', field: 'penaltyTypes' };
  }
  const checks: [string, Result<number>][] = [
    ...config.criteria.flatMap((c, i): [string, Result<number>][] => [
      [`criteria.${i}.scaleMax`, validateScaleMax(c.scaleMax)],
      [`criteria.${i}.weight`, validateWeightTenths(c.weightTenths)],
      [`criteria.${i}.step`, validateStepTenths(c.stepTenths ?? 5)],
    ]),
    ...config.penaltyTypes.flatMap((p, i): [string, Result<number>][] => [
      [`penaltyTypes.${i}.points`, validatePenaltyPointsTenths(p.pointsTenths)],
      [`penaltyTypes.${i}.maxOccurrences`, validateMaxOccurrences(p.maxOccurrences)],
    ]),
  ];
  for (const [field, result] of checks) {
    if (!result.ok) return { ok: false, code: result.code, field };
  }
  return { ok: true, value: config };
}

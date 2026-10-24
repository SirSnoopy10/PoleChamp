import { roundHalfUpDiv } from './fixed.js';
import { sheetTotal } from './sheet.js';
import type { AggregationMethod, CategoryConfig, Hundredths, SheetInput, Tenths } from './types.js';

const TRIM_MIN_JUDGES = 5;

/** Wynik oficjalny startu R w setnych: średnia ze złożonych arkuszy, half-up (D-SC-01, D-SC-02). */
export function aggregate(
  totals: readonly Hundredths[],
  method: AggregationMethod = 'MEAN',
): Hundredths | null {
  if (totals.length === 0) return null;
  let values = totals;
  if (method === 'TRIMMED_MEAN' && totals.length >= TRIM_MIN_JUDGES) {
    // v1.1 (07-reguly §3.2): odrzucenie jednej najwyższej i jednej najniższej wartości.
    values = [...totals].sort((a, b) => a - b).slice(1, -1);
  }
  return roundHalfUpDiv(sum(values), values.length);
}

/** Średnia not kryterium rozstrzygającego w setnych: ⌊(2·10·Σv + n) / (2·n)⌋ (TL-30). */
export function tieBreakMean(valuesTenths: readonly Tenths[]): Hundredths | null {
  return valuesTenths.length === 0 ? null : roundHalfUpDiv(10 * sum(valuesTenths), valuesTenths.length);
}

/** Średnia punktów karnych (nieobciętych) w setnych (D-SC-04, D-SC-08). */
export function penaltyMean(penaltiesHundredths: readonly Hundredths[]): Hundredths | null {
  return penaltiesHundredths.length === 0
    ? null
    : roundHalfUpDiv(sum(penaltiesHundredths), penaltiesHundredths.length);
}

export interface PanelJudge {
  judgeId: string;
  isActive: boolean;
}

/** J = sędziowie panelu aktywni lub z co najmniej jedną oceną w kategorii (07-reguly §3.1, §7). */
export function expectedJudges(panel: readonly PanelJudge[], judgesWithSheets: Iterable<string>): number {
  const withSheets = new Set(judgesWithSheets);
  return panel.filter((j) => j.isActive || withSheets.has(j.judgeId)).length;
}

export const isComplete = (sheetCount: number, expected: number): boolean => sheetCount >= expected;

export interface SheetSummary {
  judgeId: string;
  totalHundredths: Hundredths;
  penaltyHundredths: Hundredths;
  tieBreakTenths: Tenths;
}

/** Podsumowanie arkusza potrzebne do agregacji i remisów. */
export function summarizeSheet(judgeId: string, sheet: SheetInput, config: CategoryConfig): SheetSummary {
  const tieBreakId = config.tieBreakCriterionId ?? config.criteria[0]?.id;
  const { totalHundredths, penaltyHundredths } = sheetTotal(sheet, config);
  return {
    judgeId,
    totalHundredths,
    penaltyHundredths,
    tieBreakTenths: tieBreakId === undefined ? 0 : (sheet.criteria[tieBreakId] ?? 0),
  };
}

/** Odpowiednik wiersza `category_result`. */
export interface EntryAggregate {
  sheetCount: number;
  expectedCount: number;
  sumHundredths: Hundredths;
  officialHundredths: Hundredths | null;
  tieBreakHundredths: Hundredths | null;
  penaltyMeanHundredths: Hundredths | null;
  isComplete: boolean;
}

export function aggregateEntry(
  sheets: readonly SheetSummary[],
  expectedCount: number,
  method: AggregationMethod = 'MEAN',
): EntryAggregate {
  const totals = sheets.map((s) => s.totalHundredths);
  return {
    sheetCount: sheets.length,
    expectedCount,
    sumHundredths: sum(totals),
    officialHundredths: aggregate(totals, method),
    tieBreakHundredths: tieBreakMean(sheets.map((s) => s.tieBreakTenths)),
    penaltyMeanHundredths: penaltyMean(sheets.map((s) => s.penaltyHundredths)),
    isComplete: isComplete(sheets.length, expectedCount),
  };
}

function sum(values: readonly number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

import type { AggregationMethod, EntryStatus, Hundredths } from './types.js';

export interface CanonicalCategory {
  categoryId: string;
  resultsVersion: number;
  aggregationMethod: AggregationMethod;
  judgeCount: number;
}

export interface CanonicalRow {
  entryId: string;
  startNumber: number;
  entryStatus: EntryStatus;
  rank: number | null;
  officialHundredths: Hundredths | null;
  sheetCount: number;
  isComplete: boolean;
}

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

/** Serializacja z posortowanymi kluczami, bez białych znaków; dopuszcza tylko liczby całkowite. */
export function canonicalJson(value: Json): string {
  if (value === null || typeof value === 'boolean') return String(value);
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) throw new RangeError(`canonicalJson: liczba niecałkowita ${value}`);
    return String(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k] as Json)}`).join(',')}}`;
}

/**
 * Kanoniczny JSON wyników kategorii do `final_results_hash` (FR-706, TL-16). Zawiera wyłącznie pola
 * wyników – bez imion, nazwisk, klubów i znaczników czasu – więc pseudonimizacja nie zmienia sumy.
 */
export function canonicalResults(category: CanonicalCategory, rows: readonly CanonicalRow[]): string {
  const entries = [...rows]
    .sort((a, b) => (a.entryId < b.entryId ? -1 : 1))
    .map((r): Json => ({
      entryId: r.entryId,
      startNumber: r.startNumber,
      entryStatus: r.entryStatus,
      rank: r.rank,
      officialHundredths: r.officialHundredths,
      sheetCount: r.sheetCount,
      isComplete: r.isComplete,
    }));
  return canonicalJson({
    categoryId: category.categoryId,
    resultsVersion: category.resultsVersion,
    aggregationMethod: category.aggregationMethod,
    judgeCount: category.judgeCount,
    entries,
  });
}

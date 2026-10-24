import {
  type AggregationMethod,
  aggregateEntry,
  type CategoryConfig,
  type CategoryStatus,
  type EntryStatus,
  rankEntries,
  type RankedRow,
  type SheetSummary,
  summarizeSheet,
} from '@polechamp/scoring';
import { groupBy } from '../../common/group-by.js';

export interface CalculatorInput {
  config: CategoryConfig;
  judgeCount: number;
  aggregationMethod: AggregationMethod;
  categoryStatus: CategoryStatus;
  forPdf?: boolean;
  entries: readonly { id: string; startNumber: number; startOrder: number; status: EntryStatus }[];
  sheets: readonly { id: string; entryId: string; judgeId: string }[];
  values: readonly { scoreSheetId: string; criterionId: string; valueTenths: number }[];
  penalties: readonly { scoreSheetId: string; penaltyTypeId: string; count: number }[];
}

/**
 * Ranking kategorii bez I/O (IMP-150, 04 §10): wynik sędziego, agregat startu i miejsca silnikiem
 * `@polechamp/scoring`. Liniowo względem liczby not – 300 startów × 30 sędziów < 20 ms (TC-PERF-016).
 */
export function rankCategory(input: CalculatorInput): RankedRow[] {
  const valuesBy = groupBy(input.values, (v) => v.scoreSheetId);
  const penaltiesBy = groupBy(input.penalties, (p) => p.scoreSheetId);
  const summaries = new Map<string, SheetSummary[]>();
  for (const s of input.sheets) {
    const summary = summarizeSheet(
      s.judgeId,
      {
        criteria: Object.fromEntries((valuesBy.get(s.id) ?? []).map((v) => [v.criterionId, v.valueTenths])),
        penalties: Object.fromEntries((penaltiesBy.get(s.id) ?? []).map((p) => [p.penaltyTypeId, p.count])),
      },
      input.config,
    );
    const list = summaries.get(s.entryId);
    if (list) list.push(summary);
    else summaries.set(s.entryId, [summary]);
  }
  return rankEntries(
    input.entries.map((e) => ({
      entryId: e.id,
      startNumber: e.startNumber,
      startOrder: e.startOrder,
      entryStatus: e.status,
      aggregate: aggregateEntry(summaries.get(e.id) ?? [], input.judgeCount, input.aggregationMethod),
    })),
    { categoryStatus: input.categoryStatus, forPdf: input.forPdf },
  );
}

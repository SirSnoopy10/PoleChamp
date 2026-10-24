import type { EntryAggregate } from './aggregate.js';
import type { CategoryStatus, EntryStatus } from './types.js';

export interface RankInput {
  entryId: string;
  startNumber: number;
  startOrder: number;
  entryStatus: EntryStatus;
  aggregate: EntryAggregate;
}

export interface RankedRow extends RankInput {
  /** Miejsce; `null` dla startów bez ocen (D-SC-06) i wycofanych (D-SC-10). */
  rank: number | null;
  /** Wynik niekompletny w kategorii zablokowanej lub w PDF (D-SC-11). */
  isProvisional: boolean;
}

export interface RankOptions {
  categoryStatus: CategoryStatus;
  forPdf?: boolean;
}

/** Brak średniej (start bez ocen) porównuje się jak 0. */
const n = (value: number | null): number => value ?? 0;

/** Ujemne, gdy `a` jest wyżej w rankingu; 0 przy pełnym remisie (R → Technika → kary, D-SC-04). */
function compareScore(a: EntryAggregate, b: EntryAggregate): number {
  return (
    n(b.officialHundredths) - n(a.officialHundredths) ||
    n(b.tieBreakHundredths) - n(a.tieBreakHundredths) ||
    n(a.penaltyMeanHundredths) - n(b.penaltyMeanHundredths)
  );
}

/**
 * Ranking kategorii w formacie „1, 2, 2, 4”. Kolejność wyjścia: starty z ocenami (ex aequo wg numeru
 * startowego), potem bez ocen wg kolejności startowej, na końcu wycofane.
 */
export function rankEntries(rows: readonly RankInput[], options: RankOptions): RankedRow[] {
  const provisionalContext = options.categoryStatus === 'LOCKED' || options.forPdf === true;
  const scored = rows.filter((r) => r.entryStatus === 'ACTIVE' && r.aggregate.sheetCount > 0);
  const unscored = rows.filter((r) => r.entryStatus === 'ACTIVE' && r.aggregate.sheetCount === 0);
  const withdrawn = rows.filter((r) => r.entryStatus === 'WITHDRAWN');

  scored.sort((a, b) => compareScore(a.aggregate, b.aggregate) || a.startNumber - b.startNumber);
  const byOrder = (a: RankInput, b: RankInput) => a.startOrder - b.startOrder;

  const ranked: RankedRow[] = [];
  scored.forEach((row, i) => {
    const prev = ranked[i - 1];
    const tied = prev !== undefined && compareScore(prev.aggregate, row.aggregate) === 0;
    ranked.push({
      ...row,
      rank: tied ? prev.rank : i + 1,
      isProvisional: provisionalContext && !row.aggregate.isComplete,
    });
  });
  const unranked = (row: RankInput): RankedRow => ({ ...row, rank: null, isProvisional: false });
  return [...ranked, ...unscored.sort(byOrder).map(unranked), ...withdrawn.sort(byOrder).map(unranked)];
}

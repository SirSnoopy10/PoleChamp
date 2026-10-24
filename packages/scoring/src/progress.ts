import { roundHalfUpDiv } from './fixed.js';
import type { CategoryStatus } from './types.js';

export interface Progress {
  done: number;
  expected: number;
  /** round(100·done/expected); 0 przy braku oczekiwanych ocen. */
  percent: number;
}

function progress(done: number, expected: number): Progress {
  return { done, expected, percent: expected === 0 ? 0 : roundHalfUpDiv(100 * done, expected) };
}

/** Kategoria: done = arkusze aktywnych startów, expected = aktywne starty × J (07-reguly §3.3). */
export function categoryProgress(
  sheetCount: number,
  activeEntryCount: number,
  expectedJudges: number,
): Progress {
  return progress(sheetCount, activeEntryCount * expectedJudges);
}

export interface TournamentProgress extends Progress {
  /** false → tekst „Brak rozpoczętych kategorii”. */
  hasStartedCategories: boolean;
}

/** Turniej: suma po kategoriach Trwa i Zakończona („{done} z {exp} ocen w rozpoczętych kategoriach”). */
export function tournamentProgress(
  categories: readonly { status: CategoryStatus; progress: Progress }[],
): TournamentProgress {
  const started = categories.filter((c) => c.status !== 'DRAFT');
  const done = started.reduce((s, c) => s + c.progress.done, 0);
  const expected = started.reduce((s, c) => s + c.progress.expected, 0);
  return { ...progress(done, expected), hasStartedCategories: started.length > 0 };
}

/** Tablet sędziego: „{x}/{y} ocenione” – własne arkusze / aktywne starty w kategorii. */
export function judgeProgress(ownSheetCount: number, activeEntryCount: number): Progress {
  return progress(ownSheetCount, activeEntryCount);
}

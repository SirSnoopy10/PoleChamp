import { roundHalfUpDiv } from './fixed.js';
import type { Hundredths, Tenths } from './types.js';

/** Znak minus U+2212 (UI-14) – nigdy dywiz. */
export const MINUS = '−';
export const NO_SCORE = '—';

/** Wynik w setnych → „54,3” (1 miejsce, half-up z R – D-SC-05) albo „52,70” (2 miejsca); `null` → „—”. */
export function formatScore(hundredths: Hundredths | null, decimals: 1 | 2 = 1): string {
  if (hundredths === null) return NO_SCORE;
  if (decimals === 2) return `${Math.floor(hundredths / 100)},${String(hundredths % 100).padStart(2, '0')}`;
  return formatTenths(roundHalfUpDiv(hundredths, 10));
}

/** Nota w dziesiątych → zawsze 1 miejsce: „8,5”, „10,0”. */
export function formatTenths(tenths: Tenths): string {
  return `${Math.floor(tenths / 10)},${tenths % 10}`;
}

/** Liczba w dziesiątych bez zbędnych zer: 20 → „2”, 15 → „1,5”. */
function compactTenths(tenths: Tenths): string {
  return tenths % 10 === 0 ? String(tenths / 10) : formatTenths(tenths);
}

/** Waga: „×2”, „×1,5”. */
export const formatWeight = (weightTenths: Tenths): string => `×${compactTenths(weightTenths)}`;

/** Punkty za jedno wystąpienie kary: „−2 pkt”, „−0,5 pkt”. */
export const formatPenaltyPoints = (pointsTenths: Tenths): string =>
  `${MINUS}${compactTenths(pointsTenths)} pkt`;

/** Suma kar w formularzu (1 miejsce): 400 → „−4,0”. */
export const formatPenaltySum = (penaltyHundredths: Hundredths): string =>
  `${MINUS}${formatScore(penaltyHundredths)}`;

export interface RankingDisplayRow {
  rank: number | null;
  officialHundredths: Hundredths | null;
}

/**
 * Teksty wyników w kolejności rankingu. Gdy sąsiednie wiersze o różnych miejscach mają ten sam tekst
 * po zaokrągleniu do 0,1, oba (i ich wiersze ex aequo) pokazują 2 miejsca (07-reguly §4, D-SC-05).
 */
export function formatRanking(rows: readonly RankingDisplayRow[]): string[] {
  const oneDecimal = rows.map((r) => formatScore(r.officialHundredths));
  const twoDecimalRanks = new Set<number>();
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1];
    const b = rows[i];
    if (a?.rank == null || b?.rank == null || a.rank === b.rank) continue;
    if (oneDecimal[i - 1] === oneDecimal[i]) {
      twoDecimalRanks.add(a.rank);
      twoDecimalRanks.add(b.rank);
    }
  }
  return rows.map((r) =>
    formatScore(r.officialHundredths, r.rank !== null && twoDecimalRanks.has(r.rank) ? 2 : 1),
  );
}

/** Szerokość paska w rankingu: min(1, R / MAX), nigdy ujemna. */
export function barRatio(totalHundredths: Hundredths | null, maxHundredths: Hundredths): number {
  if (totalHundredths === null || maxHundredths <= 0) return 0;
  return Math.min(1, Math.max(0, totalHundredths / maxHundredths));
}

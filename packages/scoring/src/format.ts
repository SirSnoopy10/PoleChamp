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

/** Teksty wyników w kolejności rankingu: zawsze 2 miejsca (07-reguly §4, D-SC-05). */
export function formatRanking(rows: readonly RankingDisplayRow[]): string[] {
  return rows.map((r) => formatScore(r.officialHundredths, 2));
}

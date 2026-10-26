/**
 * FX-MAX – turniej maksymalny NFR-801: 60 kategorii, 1 500 startów (300 w pierwszej), 30 sędziów,
 * 20 urządzeń, każda kategoria z 12 kryteriami i 10 karami. Dane deterministyczne, bez losowania.
 */
import type { CategoryFx, EntryFx, JudgeFx, TournamentFx } from './factories.js';

export const FX_MAX_LIMITS = {
  categories: 60,
  entries: 1_500,
  largestCategory: 300,
  judges: 30,
  devices: 20,
  criteria: 12,
  penalties: 10,
} as const;

export function fxMax() {
  const L = FX_MAX_LIMITS;
  const tournament: TournamentFx = {
    id: 'tmax',
    name: 'Turniej maksymalny NFR-801',
    status: 'IN_PROGRESS',
    startDate: '2026-10-03',
    endDate: '2026-10-04',
    venue: 'Warszawa',
    allowOfflinePinLogin: true,
  };
  const judges: JudgeFx[] = Array.from({ length: L.judges }, (_, i) => ({
    id: `j${i + 1}`,
    fullName: `Sędzia Testowa ${i + 1}`,
    initials: `S${i + 1}`,
    isActive: true,
    pin: String(8306 + i * 7),
    pinVersion: 1,
    position: i + 1,
  }));
  // 300 + 20 × 21 + 39 × 20 = 1 500.
  const sizes = [
    L.largestCategory,
    ...Array.from({ length: L.categories - 1 }, (_, i) => (i < 20 ? 21 : 20)),
  ];
  const categories: CategoryFx[] = sizes.map((_, c) => ({
    id: `c${c + 1}`,
    tournamentId: tournament.id,
    name: `Kategoria ${c + 1}`,
    style: 'POLE_SPORT',
    level: 'PRO',
    ageGroup: 'Senior 18+',
    position: c + 1,
    status: 'IN_PROGRESS',
    aggregationMethod: 'MEAN',
    tieBreakCriterionId: null,
    criteria: Array.from({ length: L.criteria }, (_, k) => ({
      id: `c${c + 1}_k${k + 1}`,
      name: `Kryterium ${k + 1}`,
      description: 'Opis kryterium oceny',
      scaleMax: 10,
      step: 0.5 as const,
      weight: 1,
      position: k + 1,
    })),
    penaltyTypes: Array.from({ length: L.penalties }, (_, p) => ({
      id: `c${c + 1}_p${p + 1}`,
      name: `Kara ${p + 1}`,
      points: 0.5,
      maxOccurrences: 3,
      position: p + 1,
    })),
  }));
  let n = 0;
  const entries: EntryFx[] = sizes.flatMap((size, c) =>
    Array.from({ length: size }, (_, e) => {
      n += 1;
      return {
        id: `e${n}`,
        categoryId: `c${c + 1}`,
        startNumber: n,
        startOrder: e + 1,
        fullName: `Zawodniczka Testowa ${n}`,
        club: 'Klub Sportowy',
        status: 'ACTIVE' as const,
      };
    }),
  );
  const devices = Array.from({ length: L.devices }, (_, i) => ({ id: `d${i + 1}`, name: `Tablet ${i + 1}` }));
  return { tournament, judges, categories, entries, devices };
}

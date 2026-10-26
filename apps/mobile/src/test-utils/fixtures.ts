import type { CategoryDetails, DeviceRow, TournamentDetails } from '@polechamp/contracts';

type CategoryItem = TournamentDetails['categories'][number];

/** Kategoria na liście turnieju (FX-SEED – skrót). */
export const categoryItem = (id: string, over: Partial<CategoryItem> = {}): CategoryItem => ({
  id,
  name: id,
  style: 'POLE_SPORT',
  level: 'BEGINNER',
  ageGroup: 'Open',
  status: 'DRAFT',
  entryCount: 0,
  progress: { done: 0, expected: 0, percent: 0 },
  ...over,
});

/** Turniej t1 z FX-SEED: 8 kategorii, 61 zawodniczek, 5 sędziów, 173/215 ocen. */
export const tournamentDetails = (over: Partial<TournamentDetails> = {}): TournamentDetails => ({
  id: 't1',
  name: 'Mistrzostwa Polski Pole Sport 2026',
  status: 'IN_PROGRESS',
  startDate: '2026-10-03',
  endDate: '2026-10-04',
  venue: 'Warszawa, Hala Torwar',
  version: 7,
  stats: { categories: 8, athletes: 61, judges: 5 },
  progress: { done: 173, expected: 215, percent: 80, startedCategories: 5 },
  pendingRejectedSubmissions: 0,
  categories: [
    categoryItem('c1', {
      name: 'Pole Sport Beginner',
      status: 'LOCKED',
      entryCount: 9,
      progress: { done: 45, expected: 45, percent: 100 },
    }),
    categoryItem('c3', {
      name: 'Pole Sport Advanced',
      level: 'ADVANCED',
      status: 'IN_PROGRESS',
      entryCount: 9,
      progress: { done: 30, expected: 45, percent: 67 },
    }),
    categoryItem('c8', { name: 'Pole Art Masters', style: 'POLE_ART', level: 'ELITE', entryCount: 4 }),
  ],
  ...over,
});

/** Kategoria „Pole Sport Advanced” (5 kryteriów, 2 kary). */
export const categoryDetails = (over: Partial<CategoryDetails> = {}): CategoryDetails => ({
  id: 'c3',
  tournamentId: 't1',
  name: 'Pole Sport Advanced',
  style: 'POLE_SPORT',
  level: 'ADVANCED',
  ageGroup: 'Open',
  status: 'DRAFT',
  aggregationMethod: 'MEAN',
  tieBreakCriterionId: 'k1',
  maxJudgeScore: 65,
  entryCount: 9,
  judgeCount: 5,
  progress: { done: 0, expected: 45, percent: 0 },
  criteria: [
    { id: 'k1', name: 'Technika', scaleMax: 10, step: 0.5, weight: 2, position: 1 },
    { id: 'k2', name: 'Choreografia', scaleMax: 10, step: 0.5, weight: 1.5, position: 2 },
    { id: 'k3', name: 'Elementy siłowe', scaleMax: 10, step: 0.5, weight: 1, position: 3 },
    { id: 'k4', name: 'Elastyczność', scaleMax: 10, step: 0.5, weight: 1, position: 4 },
    { id: 'k5', name: 'Wrażenie artystyczne', scaleMax: 10, step: 0.5, weight: 1, position: 5 },
  ],
  penaltyTypes: [
    { id: 'p1', name: 'Upadek', points: 2, maxOccurrences: 3, position: 1 },
    { id: 'p2', name: 'Dotknięcie podłoża', points: 0.5, maxOccurrences: 5, position: 2 },
  ],
  version: 3,
  ...over,
});

export const device = (id: string, over: Partial<DeviceRow> = {}): DeviceRow => ({
  id,
  name: id,
  platform: 'android',
  online: true,
  lastSeenAt: '2026-10-03T10:00:00Z',
  lastSyncAt: '2026-10-03T10:00:00Z',
  pendingMutations: 0,
  batteryLevel: 0.8,
  activeJudge: null,
  ...over,
});

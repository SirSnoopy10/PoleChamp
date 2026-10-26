/**
 * Fikstury FX-* ze strategii testów (00-strategia §5) na bazie seedu prototypu (IMP-450).
 * Wartości punktowe w formacie silnika punktacji: dziesiąte (noty, wagi, kary) i setne (wyniki).
 */
import {
  aggregateEntry,
  type CategoryConfig,
  type CategoryStatus,
  categoryProgress,
  formatRanking,
  type Hundredths,
  rankEntries,
  type SheetInput,
  type Style,
  summarizeSheet,
} from '@polechamp/scoring';
import { buildSeed, type SeedCategory, type SeedData, type SeedSheet, type SeedStatus } from './seed.js';

export type Level = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'PRO' | 'ELITE';
export type TournamentStatus = 'DRAFT' | 'IN_PROGRESS' | 'FINISHED';

let cached: SeedData | undefined;

/** FX-SEED: dane prototypu (zamrożone – nie modyfikuj, używaj fabryk). */
export function seed(): SeedData {
  cached ??= deepFreeze(buildSeed());
  return cached;
}

const STYLE: Record<SeedCategory['style'], Style> = {
  'Pole Sport': 'POLE_SPORT',
  'Pole Art': 'POLE_ART',
  Exotic: 'EXOTIC',
};

export const toStyle = (s: SeedCategory['style']): Style => STYLE[s];
export const toLevel = (l: SeedCategory['level']): Level => l.toUpperCase() as Level;

export function toCategoryStatus(s: SeedStatus): CategoryStatus {
  return s === 'trwa' ? 'IN_PROGRESS' : s === 'zakończona' ? 'LOCKED' : 'DRAFT';
}

export function toTournamentStatus(s: SeedStatus): TournamentStatus {
  return s === 'trwa' ? 'IN_PROGRESS' : s === 'zakończona' ? 'FINISHED' : 'DRAFT';
}

/** Liczba dziesiętna z prototypu (8.5, 1.5) → dziesiąte. */
export const tenths = (v: number): number => Math.round(v * 10);

export function seedCategory(id: string): SeedCategory {
  const c = seed().categories.find((x) => x.id === id);
  if (!c) throw new Error(`Brak kategorii ${id} w seedzie`);
  return c;
}

export function categoryConfig(c: SeedCategory): CategoryConfig {
  return {
    criteria: c.criteria.map((k) => ({ id: k.id, scaleMax: k.scale, weightTenths: tenths(k.weight) })),
    penaltyTypes: c.penalties.map((p) => ({
      id: p.id,
      pointsTenths: tenths(p.value),
      maxOccurrences: p.max,
    })),
  };
}

export function sheetInput(sheet: SeedSheet): SheetInput {
  return {
    criteria: Object.fromEntries(Object.entries(sheet.vals).map(([k, v]) => [k, tenths(v)])),
    penalties: { ...sheet.pens },
    comment: sheet.comment,
  };
}

/** Arkusze kategorii w kolejności startów i sędziów (jA…jE). */
export function categorySheets(categoryId: string) {
  const c = seedCategory(categoryId);
  const { judges, scores, participants } = seed();
  const out: { participantId: string; startNumber: number; judgeId: string; sheet: SeedSheet }[] = [];
  for (const pid of c.participantIds) {
    const byJudge = scores[categoryId]?.[pid] ?? {};
    for (const j of judges) {
      const sheet = byJudge[j.id];
      if (sheet)
        out.push({ participantId: pid, startNumber: participants[pid]!.number, judgeId: j.id, sheet });
    }
  }
  return out;
}

export interface SeedRankingRow {
  rank: number | null;
  startNumber: number;
  fullName: string;
  club: string;
  officialHundredths: Hundredths | null;
  display: string;
  sheetCount: number;
}

/** Ranking kategorii z seedu liczony silnikiem `@polechamp/scoring` (J = 5 sędziów). */
export function seedRanking(categoryId: string): SeedRankingRow[] {
  const c = seedCategory(categoryId);
  const config = categoryConfig(c);
  const { judges, participants, scores } = seed();
  const rows = c.participantIds.map((pid, i) => {
    const byJudge = scores[categoryId]?.[pid] ?? {};
    const summaries = judges
      .filter((j) => byJudge[j.id])
      .map((j) => summarizeSheet(j.id, sheetInput(byJudge[j.id]!), config));
    return {
      entryId: pid,
      startNumber: participants[pid]!.number,
      startOrder: i + 1,
      entryStatus: 'ACTIVE' as const,
      aggregate: aggregateEntry(summaries, judges.length),
    };
  });
  const ranked = rankEntries(rows, { categoryStatus: toCategoryStatus(c.status) });
  const display = formatRanking(
    ranked.map((r) => ({ rank: r.rank, officialHundredths: r.aggregate.officialHundredths })),
  );
  return ranked.map((r, i) => ({
    rank: r.rank,
    startNumber: r.startNumber,
    fullName: participants[r.entryId]!.name,
    club: participants[r.entryId]!.club,
    officialHundredths: r.aggregate.officialHundredths,
    display: display[i]!,
    sheetCount: r.aggregate.sheetCount,
  }));
}

/** Wyniki sędziów (setne, kolejność jA…jE) per numer startowy – np. c3 dla TC-API-090. */
export function seedJudgeTotals(categoryId: string): [number, Hundredths[]][] {
  const c = seedCategory(categoryId);
  const config = categoryConfig(c);
  const { participants, scores, judges } = seed();
  return c.participantIds.map((pid) => {
    const byJudge = scores[categoryId]?.[pid] ?? {};
    const totals = judges.flatMap((j) => {
      const sheet = byJudge[j.id];
      return sheet ? [summarizeSheet(j.id, sheetInput(sheet), config).totalHundredths] : [];
    });
    return [participants[pid]!.number, totals];
  });
}

/** Postęp kategorii z seedu (arkusze / starty × 5 sędziów). */
export function seedCategoryProgress(categoryId: string) {
  const c = seedCategory(categoryId);
  return categoryProgress(categorySheets(categoryId).length, c.participantIds.length, seed().judges.length);
}

/** Opis fikstury: turniej i kategorie z seedu albo dane syntetyczne. */
export interface FixtureDef {
  id: string;
  description: string;
  tournamentIds: readonly string[];
  categoryIds: readonly string[];
}

const categoriesOf = (tid: string) =>
  seed()
    .categories.filter((c) => c.tournamentId === tid)
    .map((c) => c.id);

export const FX = {
  SEED: {
    id: 'FX-SEED',
    description: 'Seed prototypu: t1–t4, c1–c18, 5 sędziów',
    tournamentIds: ['t1', 't2', 't3', 't4'],
    categoryIds: [],
  },
  T1C3: {
    id: 'FX-T1C3',
    description: 't1 (Trwa) + c3 Pole Sport Advanced (9 startów nr 41–49, 30/45 ocen)',
    tournamentIds: ['t1'],
    categoryIds: ['c3'],
  },
  FINISHED: {
    id: 'FX-FINISHED',
    description: 't3 Zimowy Puchar PoleChamp (Zakończona)',
    tournamentIds: ['t3'],
    categoryIds: [],
  },
  EMPTY: {
    id: 'FX-EMPTY',
    description: 'Konto zweryfikowane bez turniejów',
    tournamentIds: [],
    categoryIds: [],
  },
  UNVERIFIED: {
    id: 'FX-UNVERIFIED',
    description: 'Konto niezweryfikowane, turniej DRAFT z kategorią gotową do startu',
    tournamentIds: [],
    categoryIds: [],
  },
  DRAFT_CAT: {
    id: 'FX-DRAFT-CAT',
    description: 'Turniej DRAFT z kategorią DRAFT (szablon Pole Sport) bez zawodniczek',
    tournamentIds: [],
    categoryIds: [],
  },
  ORG_OTHER: {
    id: 'FX-ORG-OTHER',
    description: 'Drugi organizator z własnym turniejem i tabletem',
    tournamentIds: [],
    categoryIds: [],
  },
  TABLET: {
    id: 'FX-TABLET',
    description: 'Tablet „Tablet stół 1” sparowany z t1, nikt niezalogowany',
    tournamentIds: ['t1'],
    categoryIds: [],
  },
  TABLET_JA: {
    id: 'FX-TABLET-JA',
    description: 'FX-TABLET + zalogowana online Katarzyna Nowak',
    tournamentIds: ['t1'],
    categoryIds: [],
  },
  OFFLINE: {
    id: 'FX-OFFLINE',
    description: 'Tablet offline, ostatnia synchronizacja < 24 h',
    tournamentIds: ['t1'],
    categoryIds: [],
  },
  MAX: {
    id: 'FX-MAX',
    description: 'NFR-801: 60 kategorii, 1 500 startów, 30 sędziów, 20 urządzeń, 12 kryteriów, 10 kar',
    tournamentIds: [],
    categoryIds: [],
  },
} as const satisfies Record<string, FixtureDef>;

/** Kategorie turnieju z seedu (np. `FX.FINISHED` → c12…c15). */
export const fixtureCategories = (fx: FixtureDef): string[] =>
  fx.categoryIds.length > 0 ? [...fx.categoryIds] : fx.tournamentIds.flatMap(categoriesOf);

/** Dane drugiego organizatora (FX-ORG-OTHER). */
export const ORG_OTHER = {
  email: 'inny.organizator@example.test',
  password: 'Inne-Haslo-Testowe-2026!',
  tournamentName: 'Turniej innego organizatora',
  deviceName: 'Tablet obcy',
} as const;

/** Nazwa tabletu z FX-TABLET. */
export const TABLET_NAME = 'Tablet stół 1';

function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    for (const v of Object.values(value)) deepFreeze(v);
    Object.freeze(value);
  }
  return value;
}

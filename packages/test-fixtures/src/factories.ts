/**
 * Fabryki encji testowych (IMP-450) z nadpisywalnymi polami. Kształt = kontrakty API (wartości dziesiętne),
 * więc te same obiekty służą do żądań API, wstawiania do bazy (po mapowaniu w `apps/api/test/support`)
 * i do migawki tabletu (`toSnapshot`) zapisywanej w SQLite.
 */
import type { Snapshot } from '@polechamp/contracts';
import {
  categoryConfig,
  type Level,
  seed,
  seedCategory,
  toCategoryStatus,
  toLevel,
  toStyle,
  toTournamentStatus,
  type TournamentStatus,
} from './fixtures.js';
import type { SeedSheet } from './seed.js';

type CategoryStatus = 'DRAFT' | 'IN_PROGRESS' | 'LOCKED';
type Style = 'POLE_SPORT' | 'POLE_ART' | 'EXOTIC' | 'DOUBLES';

let seq = 0;
/** Kolejny numer w obrębie procesu testów (unikalne nazwy, numery startowe). */
export const nextSeq = (): number => ++seq;
export const resetFactories = (): void => {
  seq = 0;
};

/** Deterministyczny UUID (wersja 7, wariant 8) z prefiksu i numeru – czytelny w logach testów. */
export function testUuid(kind: number, n: number): string {
  return `00000000-0000-7${String(kind).padStart(3, '0')}-8000-${String(n).padStart(12, '0')}`;
}

export interface TournamentFx {
  id: string;
  name: string;
  status: TournamentStatus;
  startDate: string | null;
  endDate: string | null;
  venue: string | null;
  allowOfflinePinLogin: boolean;
}

export interface CriterionFx {
  id: string;
  name: string;
  description: string | null;
  scaleMax: number;
  step: 0.5;
  weight: number;
  position: number;
}

export interface PenaltyTypeFx {
  id: string;
  name: string;
  points: number;
  maxOccurrences: number;
  position: number;
}

export interface CategoryFx {
  id: string;
  tournamentId: string;
  name: string;
  style: Style;
  level: Level;
  ageGroup: string;
  position: number;
  status: CategoryStatus;
  aggregationMethod: 'MEAN' | 'TRIMMED_MEAN';
  tieBreakCriterionId: string | null;
  criteria: CriterionFx[];
  penaltyTypes: PenaltyTypeFx[];
}

export interface EntryFx {
  id: string;
  categoryId: string;
  startNumber: number;
  startOrder: number;
  fullName: string;
  club: string | null;
  status: 'ACTIVE' | 'WITHDRAWN';
}

export interface JudgeFx {
  id: string;
  fullName: string;
  initials: string;
  isActive: boolean;
  pin: string;
  pinVersion: number;
  position: number;
}

export interface ScoreSheetFx {
  id: string;
  categoryId: string;
  entryId: string;
  judgeId: string;
  /** Noty jako liczby dziesiętne (krok 0,5), w kolejności kryteriów. */
  criteria: { criterionId: string; value: number }[];
  penalties: { penaltyTypeId: string; count: number }[];
  comment: string;
  revision: number;
  authMode: 'ONLINE_PIN' | 'OFFLINE_PIN';
}

export function makeTournament(over: Partial<TournamentFx> = {}): TournamentFx {
  const n = nextSeq();
  return {
    id: testUuid(1, n),
    name: `Turniej testowy ${n}`,
    status: 'DRAFT',
    startDate: '2026-10-03',
    endDate: '2026-10-04',
    venue: 'Warszawa, Hala Torwar',
    allowOfflinePinLogin: true,
    ...over,
  };
}

/** Kryteria szablonu Pole Sport (03-analiza-designu §8.3). */
export function poleSportCriteria(prefix: string): CriterionFx[] {
  return categoryCriteria(seedCategory('c3').criteria, prefix);
}

function categoryCriteria(
  src: readonly { name: string; scale: number; weight: number; desc: string }[],
  prefix: string,
) {
  return src.map((k, i) => ({
    id: `${prefix}_k${i + 1}`,
    name: k.name,
    description: k.desc,
    scaleMax: k.scale,
    step: 0.5 as const,
    weight: k.weight,
    position: i + 1,
  }));
}

export function makeCategory(over: Partial<CategoryFx> & { tournamentId: string }): CategoryFx {
  const n = nextSeq();
  const id = over.id ?? testUuid(2, n);
  return {
    id,
    name: `Pole Sport Advanced ${n}`,
    style: 'POLE_SPORT',
    level: 'ADVANCED',
    ageGroup: 'Senior 18+',
    position: 1,
    status: 'DRAFT',
    aggregationMethod: 'MEAN',
    tieBreakCriterionId: null,
    criteria: poleSportCriteria(id),
    penaltyTypes: [
      { id: `${id}_p1`, name: 'Upadek', points: 2, maxOccurrences: 3, position: 1 },
      { id: `${id}_p2`, name: 'Przekroczenie czasu', points: 1, maxOccurrences: 2, position: 2 },
    ],
    ...over,
  };
}

export function makeEntry(over: Partial<EntryFx> & { categoryId: string }): EntryFx {
  const n = nextSeq();
  return {
    id: testUuid(3, n),
    startNumber: n,
    startOrder: n,
    fullName: `Zawodniczka Testowa ${n}`,
    club: 'Klub Sportowy',
    status: 'ACTIVE',
    ...over,
  };
}

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .map((p) => p[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 3);

export function makeJudge(over: Partial<JudgeFx> = {}): JudgeFx {
  const n = nextSeq();
  const fullName = over.fullName ?? `Sędzia Testowa ${n}`;
  return {
    id: testUuid(4, n),
    fullName,
    initials: initialsOf(fullName),
    isActive: true,
    pin: String(8000 + ((n * 37) % 1000)).padStart(4, '0'),
    pinVersion: 1,
    position: n,
    ...over,
  };
}

/** Arkusz z notami dziesiętnymi; domyślnie połowa skali (G-18) i bez kar. */
export function makeScoreSheet(
  category: Pick<CategoryFx, 'id' | 'criteria' | 'penaltyTypes'>,
  over: Partial<ScoreSheetFx> & { entryId: string; judgeId: string; notes?: number[] },
): ScoreSheetFx {
  const { notes, ...rest } = over;
  return {
    id: testUuid(5, nextSeq()),
    categoryId: category.id,
    criteria: category.criteria.map((k, i) => ({ criterionId: k.id, value: notes?.[i] ?? k.scaleMax / 2 })),
    penalties: category.penaltyTypes.map((p) => ({ penaltyTypeId: p.id, count: 0 })),
    comment: '',
    revision: 1,
    authMode: 'ONLINE_PIN',
    ...rest,
  };
}

/** Turniej z seedu jako encje fabryk (identyfikatory jak w prototypie: t1, c3, u1, jA). */
export function seedTournament(tournamentId: string) {
  const s = seed();
  const t = s.tournaments.find((x) => x.id === tournamentId);
  if (!t) throw new Error(`Brak turnieju ${tournamentId} w seedzie`);
  const tournament: TournamentFx = {
    id: t.id,
    name: t.name,
    status: toTournamentStatus(t.status),
    startDate: null,
    endDate: null,
    venue: t.place,
    allowOfflinePinLogin: true,
  };
  const judges: JudgeFx[] = s.judges.map((j, i) => ({
    id: j.id,
    fullName: j.name,
    initials: initialsOf(j.name),
    isActive: true,
    pin: j.pin,
    pinVersion: 1,
    position: i + 1,
  }));
  const seedCats = s.categories.filter((c) => c.tournamentId === tournamentId);
  const categories: CategoryFx[] = seedCats.map((c, i) => ({
    id: c.id,
    tournamentId,
    name: c.name,
    style: toStyle(c.style),
    level: toLevel(c.level),
    ageGroup: c.ageGroup,
    position: i + 1,
    status: toCategoryStatus(c.status),
    aggregationMethod: 'MEAN',
    tieBreakCriterionId: null,
    criteria: categoryCriteria(c.criteria, c.id).map((k, j) => ({ ...k, id: c.criteria[j]!.id })),
    penaltyTypes: c.penalties.map((p, j) => ({
      id: p.id,
      name: p.name,
      points: p.value,
      maxOccurrences: p.max,
      position: j + 1,
    })),
  }));
  const entries: EntryFx[] = seedCats.flatMap((c) =>
    c.participantIds.map((pid, i) => {
      const p = s.participants[pid]!;
      return {
        id: pid,
        categoryId: c.id,
        startNumber: p.number,
        startOrder: i + 1,
        fullName: p.name,
        club: p.club,
        status: 'ACTIVE' as const,
      };
    }),
  );
  const sheets: ScoreSheetFx[] = seedCats.flatMap((c) =>
    c.participantIds.flatMap((pid) =>
      s.judges.flatMap((j) => {
        const sheet = s.scores[c.id]?.[pid]?.[j.id];
        return sheet ? [seedSheet(c.id, pid, j.id, sheet)] : [];
      }),
    ),
  );
  return { tournament, judges, categories, entries, sheets };
}

function seedSheet(categoryId: string, entryId: string, judgeId: string, sheet: SeedSheet): ScoreSheetFx {
  const c = seedCategory(categoryId);
  return {
    id: `${categoryId}:${entryId}:${judgeId}`,
    categoryId,
    entryId,
    judgeId,
    criteria: c.criteria.map((k) => ({ criterionId: k.id, value: sheet.vals[k.id] ?? 0 })),
    penalties: c.penalties.map((p) => ({ penaltyTypeId: p.id, count: sheet.pens[p.id] ?? 0 })),
    comment: sheet.comment,
    revision: 1,
    authMode: 'ONLINE_PIN',
  };
}

/** Konfiguracja punktacji kategorii z seedu (re-eksport dla testów). */
export { categoryConfig };

export interface SnapshotOptions {
  cursor?: number;
  serverTime?: string;
  /** Weryfikator PIN-u na sędziego (`null` – logowanie offline niedostępne). */
  pinVerifier?: (judge: JudgeFx) => Snapshot['judges'][number]['pinVerifier'];
  /** Sędziowie panelu kategorii; domyślnie wszyscy. */
  panelJudgeIds?: (category: CategoryFx) => string[];
}

/**
 * Migawka tabletu (`GET /v1/sync/snapshot`) z fikstury, np. `toSnapshot(seedTournament('t1'), deviceId)`.
 * `deviceId` trafia do niej tylko pośrednio (migawka jest per urządzenie – kursor i weryfikatory).
 */
export function toSnapshot(
  fx: { tournament: TournamentFx; judges: JudgeFx[]; categories: CategoryFx[]; entries: EntryFx[] },
  _deviceId: string,
  options: SnapshotOptions = {},
): Snapshot {
  const { tournament, judges, categories, entries } = fx;
  return {
    cursor: options.cursor ?? 1,
    serverTime: options.serverTime ?? '2026-10-03T08:00:00.000Z',
    tournament: {
      id: tournament.id,
      name: tournament.name,
      status: tournament.status,
      allowOfflinePinLogin: tournament.allowOfflinePinLogin,
    },
    judges: judges.map((j) => ({
      id: j.id,
      fullName: j.fullName,
      initials: j.initials,
      isActive: j.isActive,
      pinLocked: false,
      position: j.position,
      pinVersion: j.pinVersion,
      pinVerifier: options.pinVerifier?.(j) ?? null,
    })),
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      style: c.style,
      level: c.level,
      ageGroup: c.ageGroup,
      position: c.position,
      status: c.status,
      aggregationMethod: c.aggregationMethod,
      tieBreakCriterionId: c.tieBreakCriterionId,
      panelJudgeIds: options.panelJudgeIds?.(c) ?? judges.map((j) => j.id),
      criteria: c.criteria,
      penaltyTypes: c.penaltyTypes,
      entries: entries
        .filter((e) => e.categoryId === c.id)
        .map((e) => ({
          id: e.id,
          startNumber: e.startNumber,
          startOrder: e.startOrder,
          fullName: e.fullName,
          club: e.club,
          status: e.status,
        })),
    })),
  };
}

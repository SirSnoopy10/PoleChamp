import { sheetTotal } from '@polechamp/scoring';
import { asc, eq } from 'drizzle-orm';
import { uuidv7 } from '../../src/common/ids.js';
import type { Db } from '../../src/db/client.js';
import * as s from '../../src/db/schema.js';
import type { Call } from './http.js';

const FIRST_NAMES = [
  'Agnieszka',
  'Amelia',
  'Magdalena',
  'Paulina',
  'Natalia',
  'Lena',
  'Weronika',
  'Julia',
  'Ola',
];
const LAST_NAMES = [
  'Mazur',
  'Król',
  'Kaczmarek',
  'Lewandowska',
  'Sikora',
  'Adamczyk',
  'Walczak',
  'Kamińska',
  'Nowak',
];

/** Imię i nazwisko bez cyfr (walidacja `PersonName`), różne dla numerów startowych. */
const defaultName = (n: number) => `${FIRST_NAMES[n % 9]} ${LAST_NAMES[Math.floor(n / 9) % 9]}`;

/** Scenariusze testowe organizatora przez API (bez skrótów w bazie, poza arkuszami ocen). */
export function organizer(call: Call, token: string) {
  const req = (method: Parameters<Call>[0], url: string, body?: unknown, headers?: Record<string, string>) =>
    call(method, url, { token, body, headers });
  return {
    req,
    token,
    async tournament(body: Record<string, unknown> = {}) {
      const res = await req('POST', '/v1/tournaments', {
        name: 'Mistrzostwa Polski Pole Sport 2026',
        startDate: '2026-10-03',
        endDate: '2026-10-04',
        venue: 'Warszawa, Hala Torwar',
        ...body,
      });
      return res.body as { id: string; version: number };
    },
    async category(tournamentId: string, body: Record<string, unknown> = {}) {
      const res = await req('POST', `/v1/tournaments/${tournamentId}/categories`, {
        name: 'Pole Sport Advanced',
        style: 'POLE_SPORT',
        level: 'ADVANCED',
        ageGroup: 'Senior 18+',
        ...body,
      });
      return res.body as {
        id: string;
        version: number;
        criteria: { id: string }[];
        penaltyTypes: { id: string }[];
      };
    },
    async entry(categoryId: string, startNumber: number, fullName = defaultName(startNumber)) {
      const res = await req('POST', `/v1/categories/${categoryId}/entries`, {
        startNumber,
        fullName,
        club: 'Aerial Dreams Warszawa',
      });
      return res.body as { id: string; startOrder: number; version: number };
    },
    async judge(tournamentId: string, fullName: string) {
      const res = await req('POST', `/v1/tournaments/${tournamentId}/judges`, { fullName });
      return res.body as { id: string; pin: string };
    },
  };
}

/**
 * Arkusz oceny wstawiony bezpośrednio (ścieżka `sync/push` powstaje w EP-04). Noty w punktach
 * w kolejności kryteriów kategorii; wynik liczony silnikiem punktacji jak na serwerze.
 */
export async function insertSheet(
  db: Db,
  input: { categoryId: string; entryId: string; judgeId: string; notes: number[]; penalties?: number[] },
) {
  const criteria = await db
    .select()
    .from(s.criterion)
    .where(eq(s.criterion.categoryId, input.categoryId))
    .orderBy(asc(s.criterion.position));
  const penaltyTypes = await db
    .select()
    .from(s.penaltyType)
    .where(eq(s.penaltyType.categoryId, input.categoryId))
    .orderBy(asc(s.penaltyType.position));
  const sheet = {
    criteria: Object.fromEntries(criteria.map((c, i) => [c.id, Math.round((input.notes[i] ?? 5) * 10)])),
    penalties: Object.fromEntries(penaltyTypes.map((p, i) => [p.id, input.penalties?.[i] ?? 0])),
  };
  const totals = sheetTotal(sheet, { criteria, penaltyTypes });
  const id = uuidv7();
  await db.insert(s.scoreSheet).values({
    id,
    categoryId: input.categoryId,
    entryId: input.entryId,
    judgeId: input.judgeId,
    criteriaTotalHundredths: totals.criteriaHundredths,
    penaltyTotalHundredths: totals.penaltyHundredths,
    totalHundredths: totals.totalHundredths,
    authMode: 'ONLINE_PIN',
  });
  await db.insert(s.scoreValue).values(
    Object.entries(sheet.criteria).map(([criterionId, valueTenths]) => ({
      scoreSheetId: id,
      criterionId,
      valueTenths,
    })),
  );
  await db.insert(s.scorePenalty).values(
    Object.entries(sheet.penalties).map(([penaltyTypeId, count]) => ({
      scoreSheetId: id,
      penaltyTypeId,
      count,
    })),
  );
  return { id, total: totals.totalHundredths };
}

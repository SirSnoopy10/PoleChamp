import type { CategoryRow, TournamentRow } from '../../db/repositories/ownership.repository.js';
import type { criterion, penaltyType } from '../../db/schema.js';

/** Mapowanie wierszy bazy na kształty z `@polechamp/contracts` (liczby punktowe w dziesiątych → dziesiętne). */
export const toTournament = (t: TournamentRow) => ({
  id: t.id,
  name: t.name,
  status: t.status,
  startDate: t.startDate,
  endDate: t.endDate,
  venue: t.venue,
  version: t.version,
});

export const toCriterion = (c: typeof criterion.$inferSelect) => ({
  id: c.id,
  name: c.name,
  description: c.description,
  scaleMax: c.scaleMax,
  step: 0.5 as const,
  weight: c.weightTenths / 10,
  position: c.position,
});

export const toPenaltyType = (p: typeof penaltyType.$inferSelect) => ({
  id: p.id,
  name: p.name,
  points: p.pointsTenths / 10,
  maxOccurrences: p.maxOccurrences,
  position: p.position,
});

export const categoryBase = (c: CategoryRow) => ({
  id: c.id,
  name: c.name,
  style: c.style,
  level: c.level,
  ageGroup: c.ageGroup,
  status: c.status,
});

/** Decimal → dziesiąte (wagi, punkty karne). Wartości zwalidowane schematem (krok 0,5). */
export const toTenths = (value: number) => Math.round(value * 10);

/** Inicjały z pierwszych liter słów, maks. 3 (02-model §2.9): „Katarzyna Nowak” → „KN”. */
export const initialsOf = (fullName: string) =>
  fullName
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w[0] ?? '').toLocaleUpperCase('pl'))
    .join('')
    .slice(0, 3);

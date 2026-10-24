import { inject } from 'vitest';
import { uuidv7 } from '../../src/common/ids.js';
import { createDb, type DbHandle } from '../../src/db/client.js';
import * as s from '../../src/db/schema.js';

/** Połączenie rolą `pc_app` do testów warstwy danych. */
export function testDb(): DbHandle {
  return createDb({ url: inject('databaseUrl'), max: 5 });
}

/** Minimalne dane: organizator → turniej → kategoria (Pole Sport) → kryterium, kara, sędzia, start. */
export async function seedBasics(db: DbHandle['db']) {
  const [user] = await db
    .insert(s.appUser)
    .values({
      email: `org-${uuidv7()}@test.pl`,
      passwordHash: 'x',
      displayName: 'Organizator',
      termsAcceptedAt: new Date(),
      termsVersion: '2026-11',
    })
    .returning();
  const [tournament] = await db
    .insert(s.tournament)
    .values({ ownerId: user!.id, name: 'Mistrzostwa testowe', startDate: '2026-10-03' })
    .returning();
  const [category] = await db
    .insert(s.category)
    .values({ tournamentId: tournament!.id, name: 'Pole Sport Advanced', position: 1 })
    .returning();
  const [criterion] = await db
    .insert(s.criterion)
    .values({ categoryId: category!.id, name: 'Technika', weightTenths: 20, position: 1 })
    .returning();
  const [penalty] = await db
    .insert(s.penaltyType)
    .values({ categoryId: category!.id, name: 'Upadek', pointsTenths: 20, maxOccurrences: 3, position: 1 })
    .returning();
  const [judge] = await db
    .insert(s.judge)
    .values({
      tournamentId: tournament!.id,
      fullName: 'Katarzyna Nowak',
      initials: 'KN',
      pinHash: 'x',
      pinFingerprint: Buffer.from(uuidv7()),
      pinOfflineSalt: Buffer.alloc(16),
      pinOfflineVerifier: Buffer.alloc(32),
      position: 1,
    })
    .returning();
  const [athlete] = await db
    .insert(s.athlete)
    .values({ tournamentId: tournament!.id, fullName: 'Natalia Sikora' })
    .returning();
  const [entry] = await db
    .insert(s.entry)
    .values({
      tournamentId: tournament!.id,
      categoryId: category!.id,
      athleteId: athlete!.id,
      startNumber: 47,
      startOrder: 1,
    })
    .returning();
  return {
    user: user!,
    tournament: tournament!,
    category: category!,
    criterion: criterion!,
    penalty: penalty!,
    judge: judge!,
    athlete: athlete!,
    entry: entry!,
  };
}

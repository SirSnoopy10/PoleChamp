import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { uuidv7 } from '../../src/common/ids.js';
import { requestContext } from '../../src/common/request-context.js';
import type { DbHandle } from '../../src/db/client.js';
import * as s from '../../src/db/schema.js';
import { withTx } from '../../src/db/tx.js';
import { seedBasics, testDb } from '../support/db.js';

let handle: DbHandle;
let seed: Awaited<ReturnType<typeof seedBasics>>;

/** Kod błędu PostgreSQL z wyjątku Drizzle (błąd sterownika jest w `cause`). */
async function pgCode(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise;
    return undefined;
  } catch (error) {
    const e = error as { code?: string; cause?: { code?: string } };
    return e.cause?.code ?? e.code;
  }
}

async function insertSheet(values: { value: number; count: number }) {
  const sheetId = uuidv7();
  return withTx(handle.db, async (tx) => {
    await tx.insert(s.scoreSheet).values({
      id: sheetId,
      categoryId: seed.category.id,
      entryId: seed.entry.id,
      judgeId: seed.judge.id,
      criteriaTotalHundredths: 0,
      penaltyTotalHundredths: 0,
      totalHundredths: 0,
      authMode: 'ONLINE_PIN',
    });
    await tx
      .insert(s.scoreValue)
      .values({ scoreSheetId: sheetId, criterionId: seed.criterion.id, valueTenths: values.value });
    await tx
      .insert(s.scorePenalty)
      .values({ scoreSheetId: sheetId, penaltyTypeId: seed.penalty.id, count: values.count });
    return sheetId;
  });
}

beforeAll(async () => {
  handle = testDb();
  seed = await seedBasics(handle.db);
});
afterAll(async () => {
  await handle.pool.end();
});

describe('IMP-103: withTx z kontekstem aktora', () => {
  it('ustawia app.actor_* i app.request_id widoczne w transakcji', async () => {
    const requestId = uuidv7();
    const row = await requestContext.run(
      { requestId, ip: null, actor: { type: 'ORGANIZER', id: seed.user.id } },
      () =>
        withTx(handle.db, async (tx) => {
          const result = await tx.execute<{ type: string; id: string; req: string }>(
            sql`SELECT current_setting('app.actor_type') AS type, current_setting('app.actor_id') AS id,
                       current_setting('app.request_id') AS req`,
          );
          return result.rows[0];
        }),
    );
    expect(row).toEqual({ type: 'ORGANIZER', id: seed.user.id, req: requestId });
  });

  it('wycofuje transakcję przy wyjątku', async () => {
    await expect(
      withTx(handle.db, async (tx) => {
        await tx
          .update(s.tournament)
          .set({ name: 'Zmieniona' })
          .where(eq(s.tournament.id, seed.tournament.id));
        throw new Error('przerwij');
      }),
    ).rejects.toThrow('przerwij');
    const [t] = await handle.db.select().from(s.tournament).where(eq(s.tournament.id, seed.tournament.id));
    expect(t?.name).toBe('Mistrzostwa testowe');
  });
});

describe('IMP-105: ograniczenia konfiguracji turnieju', () => {
  it('TC-INT-010: numer startowy unikalny w turnieju (także równolegle)', async () => {
    const athletes = await handle.db
      .insert(s.athlete)
      .values([
        { tournamentId: seed.tournament.id, fullName: 'A' },
        { tournamentId: seed.tournament.id, fullName: 'B' },
      ])
      .returning();
    const results = await Promise.allSettled(
      athletes.map((a, i) =>
        handle.db.insert(s.entry).values({
          tournamentId: seed.tournament.id,
          categoryId: seed.category.id,
          athleteId: a.id,
          startNumber: 50,
          startOrder: 10 + i,
        }),
      ),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
    expect((rejected.reason as { cause?: { code?: string } }).cause?.code).toBe('23505');
  });

  it('waga 5,5 i skala 21 odrzucone przez CHECK', async () => {
    const base = { categoryId: seed.category.id, name: 'X', position: 90 };
    expect(await pgCode(handle.db.insert(s.criterion).values({ ...base, weightTenths: 55 }))).toBe('23514');
    expect(await pgCode(handle.db.insert(s.criterion).values({ ...base, weightTenths: 3 }))).toBe('23514');
    expect(
      await pgCode(handle.db.insert(s.criterion).values({ ...base, weightTenths: 10, scaleMax: 21 })),
    ).toBe('23514');
  });

  it('zamiana pozycji dwóch kryteriów w jednej transakcji (DEFERRABLE)', async () => {
    const [second] = await handle.db
      .insert(s.criterion)
      .values({ categoryId: seed.category.id, name: 'Artyzm', weightTenths: 15, position: 2 })
      .returning();
    await withTx(handle.db, async (tx) => {
      await tx.execute(sql`SET CONSTRAINTS criterion_position_uq DEFERRED`);
      await tx.update(s.criterion).set({ position: 2 }).where(eq(s.criterion.id, seed.criterion.id));
      await tx.update(s.criterion).set({ position: 1 }).where(eq(s.criterion.id, second!.id));
    });
    const rows = await handle.db
      .select()
      .from(s.criterion)
      .where(eq(s.criterion.categoryId, seed.category.id));
    expect(rows.find((r) => r.id === second!.id)?.position).toBe(1);
  });

  it('niepełnoletnia bez zgody opiekuna odrzucona', async () => {
    expect(
      await pgCode(
        handle.db
          .insert(s.athlete)
          .values({ tournamentId: seed.tournament.id, fullName: 'Julia', isMinor: true }),
      ),
    ).toBe('23514');
  });

  it('data końcowa bez początkowej odrzucona', async () => {
    expect(
      await pgCode(
        handle.db
          .insert(s.tournament)
          .values({ ownerId: seed.user.id, name: 'Zła data', endDate: '2027-01-01' }),
      ),
    ).toBe('23514');
  });
});

describe('IMP-106: ocenianie w bazie', () => {
  it('TC-INT-003: nota ponad skalę, ujemna i licznik ponad limit odrzucone (CHECK + wyzwalacz)', async () => {
    // Krok noty (0,1 / 0,5 / 1) sprawdza silnik punktacji przed zapisem – migracja 0012 (IMP-700).
    expect(await pgCode(insertSheet({ value: 105, count: 0 }))).toBe('23514');
    expect(await pgCode(insertSheet({ value: -5, count: 0 }))).toBe('23514');
    expect(await pgCode(insertSheet({ value: 85, count: 4 }))).toBe('23514');
  });

  it('jeden arkusz na sędziego i start', async () => {
    await insertSheet({ value: 85, count: 1 });
    expect(await pgCode(insertSheet({ value: 90, count: 0 }))).toBe('23505');
  });

  it('TC-INT-006: start z ocenami nie może zostać usunięty bezpośrednio w bazie', async () => {
    // ON DELETE RESTRICT → restrict_violation.
    expect(await pgCode(handle.db.delete(s.entry).where(eq(s.entry.id, seed.entry.id)))).toBe('23001');
  });
});

import { randomUUID } from 'node:crypto';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { createDb, type DbHandle } from '../../src/db/client.js';
import * as s from '../../src/db/schema.js';
import { ExportStorage } from '../../src/infra/storage.js';
import { ChangeLogService } from '../../src/modules/audit/audit.service.js';
import { RetentionJob } from '../../src/worker/retention/retention.job.js';
import { testEnv } from '../support/app.js';
import { seedBasics } from '../support/db.js';
import { insertSheet } from '../support/scenario.js';

const NOW = new Date('2029-01-15T03:00:00Z');
const monthsAgo = (m: number, days = 0) => {
  const d = new Date(NOW);
  d.setUTCMonth(d.getUTCMonth() - m);
  d.setUTCDate(d.getUTCDate() - days);
  return d;
};
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 24 * 3600_000);
const silent = { info: () => undefined, error: () => undefined };

let admin: DbHandle;
let retention: DbHandle;
let storage: ExportStorage;

function job(months = 24, dryRun = false) {
  return new RetentionJob(retention.db, new ChangeLogService(), storage, silent, {
    pseudonymizeMonths: months,
    dryRun,
  });
}

/** Turniej zakończony `finishedAt` z zawodniczką (klub, rok), sędzią, oceną, wpisem audytu i rewizją. */
async function finishedTournament(finishedAt: Date) {
  const seed = await seedBasics(admin.db);
  await admin.db
    .update(s.athlete)
    .set({ club: 'Łódź Pole Studio', birthYear: 2001 })
    .where(eq(s.athlete.id, seed.athlete.id));
  await admin.db
    .update(s.tournament)
    .set({ status: 'FINISHED', finishedAt })
    .where(eq(s.tournament.id, seed.tournament.id));
  const sheet = await insertSheet(admin.db, {
    categoryId: seed.category.id,
    entryId: seed.entry.id,
    judgeId: seed.judge.id,
    notes: [8],
  });
  await admin.db.insert(s.scoreSheetRevision).values({
    scoreSheetId: sheet.id,
    revision: 1,
    snapshot: { total: 16, comment: 'Natalia upadła przy wejściu' },
    actorType: 'JUDGE',
  });
  await admin.db.insert(s.auditLog).values({
    tournamentId: seed.tournament.id,
    actorType: 'ORGANIZER',
    action: 'ATHLETE_UPDATED',
    entityType: 'athlete',
    entityId: seed.athlete.id,
    before: { fullName: 'Natalia Sikora', club: null },
    after: { fullName: 'Natalia Sikora', club: 'Łódź Pole Studio', startNumber: 47 },
  });
  return { ...seed, sheetId: sheet.id };
}

beforeAll(async () => {
  admin = createDb({ url: inject('adminDatabaseUrl'), max: 3 });
  retention = createDb({ url: inject('retentionDatabaseUrl'), max: 2 });
  storage = new ExportStorage(await testEnv());
});
afterAll(async () => {
  await admin.pool.end();
  await retention.pool.end();
  storage.close();
});

describe('zadanie retencji (IMP-176)', () => {
  it('TC-RODO-001: pseudonimizacja po 24 mies. z czyszczeniem audytu i rewizji; turniej sprzed 23 mies. bez zmian; idempotencja', async () => {
    const old = await finishedTournament(monthsAgo(24, 1));
    const recent = await finishedTournament(monthsAgo(23));
    const hashBefore = (
      await admin.db.select().from(s.category).where(eq(s.category.id, old.category.id))
    )[0]!.finalResultsHash;

    const report = await job().run(NOW);
    expect(report.pseudonymizedAthletes).toBeGreaterThanOrEqual(1);

    const [a] = await admin.db.select().from(s.athlete).where(eq(s.athlete.id, old.athlete.id));
    expect(a).toMatchObject({ fullName: 'Zawodniczka nr 47', club: null, birthYear: null });
    expect(a!.pseudonymizedAt).not.toBeNull();
    const [j] = await admin.db.select().from(s.judge).where(eq(s.judge.id, old.judge.id));
    expect(j).toMatchObject({ fullName: 'Sędzia 1', initials: 'S1' });
    const [audit] = await admin.db.select().from(s.auditLog).where(eq(s.auditLog.entityId, old.athlete.id));
    expect(audit!.before).toEqual({});
    expect(audit!.after).toEqual({ startNumber: 47 });
    const [rev] = await admin.db
      .select()
      .from(s.scoreSheetRevision)
      .where(eq(s.scoreSheetRevision.scoreSheetId, old.sheetId));
    expect(rev!.snapshot).toEqual({ total: 16 });
    const [sheet] = await admin.db.select().from(s.scoreSheet).where(eq(s.scoreSheet.id, old.sheetId));
    expect(sheet!.totalHundredths).toBeGreaterThan(0);
    const [cat] = await admin.db.select().from(s.category).where(eq(s.category.id, old.category.id));
    expect(cat!.finalResultsHash).toBe(hashBefore);
    const changes = await admin.db
      .select()
      .from(s.changeLog)
      .where(eq(s.changeLog.tournamentId, old.tournament.id));
    expect(changes.map((c) => c.entityType).sort()).toEqual(['athlete', 'judge']);

    const [untouched] = await admin.db.select().from(s.athlete).where(eq(s.athlete.id, recent.athlete.id));
    expect(untouched).toMatchObject({
      fullName: 'Natalia Sikora',
      club: 'Łódź Pole Studio',
      pseudonymizedAt: null,
    });

    const second = await job().run(NOW);
    expect([second.pseudonymizedAthletes, second.pseudonymizedJudges]).toEqual([0, 0]);
  });

  it('TC-RODO-002: konfigurowalny okres – 12 miesięcy', async () => {
    const t = await finishedTournament(monthsAgo(13));
    await job(24).run(NOW);
    expect(
      (await admin.db.select().from(s.athlete).where(eq(s.athlete.id, t.athlete.id)))[0]!.pseudonymizedAt,
    ).toBeNull();
    await job(12).run(NOW);
    expect(
      (await admin.db.select().from(s.athlete).where(eq(s.athlete.id, t.athlete.id)))[0]!.pseudonymizedAt,
    ).not.toBeNull();
  });

  it('TC-AUDIT-004: IP zerowane tylko we wpisach starszych niż 90 dni; --dry-run nic nie zmienia', async () => {
    const [newer, older] = await admin.db
      .insert(s.auditLog)
      .values([
        { actorType: 'ORGANIZER', action: 'LOGIN', occurredAt: daysAgo(89), ip: '10.1.1.89' },
        { actorType: 'ORGANIZER', action: 'LOGIN', occurredAt: daysAgo(91), ip: '10.1.1.91' },
      ])
      .returning({ id: s.auditLog.id });
    const ips = async () =>
      (
        await admin.db
          .select()
          .from(s.auditLog)
          .where(inArray(s.auditLog.id, [newer!.id, older!.id]))
      )
        .sort((a, b) => a.id - b.id)
        .map((r) => r.ip);
    const dry = await job(24, true).run(NOW);
    expect(dry.auditIpCleared).toBeGreaterThanOrEqual(1);
    expect(await ips()).toEqual(['10.1.1.89', '10.1.1.91']);
    await job().run(NOW);
    expect(await ips()).toEqual(['10.1.1.89', null]);
  });

  it('TC-RODO-005: dane techniczne – change_log 30 dni po turnieju, idempotency_key 24 h, eksporty, partycje > 36 mies.', async () => {
    const old = await finishedTournament(daysAgo(31));
    const fresh = await finishedTournament(daysAgo(29));
    for (const t of [old, fresh]) {
      await admin.db
        .insert(s.changeLog)
        .values({ tournamentId: t.tournament.id, entityType: 'entry', entityId: t.entry.id, op: 'U' });
    }
    const keys = [randomUUID(), randomUUID()];
    await admin.db.insert(s.idempotencyKey).values([
      {
        key: keys[0]!,
        userId: old.user.id,
        method: 'POST',
        path: '/x',
        requestHash: '0'.repeat(64),
        responseStatus: 201,
        createdAt: new Date(NOW.getTime() - 25 * 3600_000),
      },
      {
        key: keys[1]!,
        userId: old.user.id,
        method: 'POST',
        path: '/x',
        requestHash: '0'.repeat(64),
        responseStatus: 201,
        createdAt: new Date(NOW.getTime() - 23 * 3600_000),
      },
    ]);
    const key = `exports/${old.tournament.id}/expired.pdf`;
    await storage.put(key, new Uint8Array([1]), 'application/pdf');
    const [expired] = await admin.db
      .insert(s.exportJob)
      .values({
        tournamentId: old.tournament.id,
        scope: 'TOURNAMENT',
        status: 'DONE',
        s3Key: key,
        expiresAt: daysAgo(1),
      })
      .returning();
    await admin.db.execute(
      sql`CREATE TABLE audit_log_2020_01 PARTITION OF audit_log FOR VALUES FROM ('2020-01-01') TO ('2020-02-01')`,
    );

    const events = await admin.db
      .insert(s.domainEvent)
      .values([
        { type: 'sync.hint', payload: {}, publishedAt: daysAgo(8) },
        { type: 'sync.hint', payload: {}, publishedAt: daysAgo(6) },
        { type: 'sync.hint', payload: {} },
      ])
      .returning({ id: s.domainEvent.id });

    const report = await job().run(NOW);

    const leftEvents = await admin.db
      .select({ id: s.domainEvent.id })
      .from(s.domainEvent)
      .where(
        inArray(
          s.domainEvent.id,
          events.map((e) => e.id),
        ),
      );
    expect(leftEvents.map((e) => e.id)).toEqual(events.slice(1).map((e) => e.id));
    const logs = async (id: string) => admin.db.$count(s.changeLog, eq(s.changeLog.tournamentId, id));
    expect(await logs(old.tournament.id)).toBe(0);
    expect(await logs(fresh.tournament.id)).toBe(1);
    const left = await admin.db.select().from(s.idempotencyKey).where(inArray(s.idempotencyKey.key, keys));
    expect(left.map((k) => k.key)).toEqual([keys[1]]);
    expect(await admin.db.$count(s.exportJob, eq(s.exportJob.id, expired!.id))).toBe(0);
    expect(await storage.exists(key)).toBe(false);
    expect(report.auditPartitionsDropped).toBeGreaterThanOrEqual(1);
    const part = await admin.db.execute(sql`SELECT 1 FROM pg_class WHERE relname = 'audit_log_2020_01'`);
    expect(part.rows).toHaveLength(0);
  });

  it('TC-API-019: konto usunięte > 30 dni temu – twarde usunięcie z audytem ACCOUNT_PURGED; < 30 dni zostaje', async () => {
    const gone = await finishedTournament(monthsAgo(2));
    const kept = await finishedTournament(monthsAgo(2));
    await admin.db
      .update(s.appUser)
      .set({ deletedAt: daysAgo(31) })
      .where(eq(s.appUser.id, gone.user.id));
    await admin.db
      .update(s.appUser)
      .set({ deletedAt: daysAgo(29) })
      .where(eq(s.appUser.id, kept.user.id));

    const report = await job().run(NOW);

    expect(report.accountsPurged).toBeGreaterThanOrEqual(1);
    expect(await admin.db.$count(s.appUser, eq(s.appUser.id, gone.user.id))).toBe(0);
    expect(await admin.db.$count(s.tournament, eq(s.tournament.id, gone.tournament.id))).toBe(0);
    expect(await admin.db.$count(s.athlete, eq(s.athlete.id, gone.athlete.id))).toBe(0);
    const [purged] = await admin.db
      .select()
      .from(s.auditLog)
      .where(and(eq(s.auditLog.action, 'ACCOUNT_PURGED'), eq(s.auditLog.entityId, gone.user.id)));
    expect(purged).toMatchObject({ actorType: 'SYSTEM', after: { tournamentsDeleted: 1 } });
    const [oldAudit] = await admin.db
      .select()
      .from(s.auditLog)
      .where(eq(s.auditLog.entityId, gone.athlete.id));
    expect(oldAudit!.after).toEqual({ startNumber: 47 });
    expect(await admin.db.$count(s.appUser, eq(s.appUser.id, kept.user.id))).toBe(1);
  });
});

import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { canonicalResults } from '@polechamp/scoring';
import { and, eq, sql } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { uuidv7 } from '../../src/common/ids.js';
import type { DbHandle } from '../../src/db/client.js';
import * as s from '../../src/db/schema.js';
import { TOURNAMENT_LIMITS } from '../../src/modules/limits/limits.service.js';
import { isForbiddenPin } from '../../src/modules/organizer/pin.service.js';
import { startApp } from '../support/app.js';
import { testDb } from '../support/db.js';
import {
  type Call,
  client,
  flushValkey,
  registerAndLogin,
  STRONG_PASSWORD,
  uniqueEmail,
} from '../support/http.js';
import { insertSheet, organizer } from '../support/scenario.js';

let app: NestFastifyApplication;
let call: Call;
let handle: DbHandle;
let org: ReturnType<typeof organizer>;
let other: ReturnType<typeof organizer>;

beforeAll(async () => {
  ({ app } = await startApp());
  call = client(app);
  handle = testDb();
  await flushValkey();
  org = organizer(call, (await registerAndLogin(call)).accessToken);
  other = organizer(call, (await registerAndLogin(call)).accessToken);
});
afterAll(async () => {
  await app.close();
  await handle.pool.end();
});
beforeEach(async () => {
  await flushValkey();
});

const ifMatch = (v: number) => ({ 'if-match': `W/"${v}"` });

/** Turniej z kategorią w toku: 3 starty, 2 sędziów. */
async function runningCategory() {
  const t = await org.tournament();
  const c = await org.category(t.id);
  const entries = [
    await org.entry(c.id, 41, 'Zuzanna Król'),
    await org.entry(c.id, 42),
    await org.entry(c.id, 43),
  ];
  const judges = [await org.judge(t.id, 'Katarzyna Nowak'), await org.judge(t.id, 'Michał Woźniak')];
  const started = await org.req('POST', `/v1/categories/${c.id}/start`);
  expect(started.status).toBe(200);
  return { t, c, entries, judges };
}

describe('turnieje (IMP-121…123)', () => {
  it('TC-API-022: utworzenie z Idempotency-Key, ETag W/"1"', async () => {
    const key = uuidv7();
    const body = {
      name: 'Puchar Wiosny PoleChamp',
      startDate: '2027-04-18',
      endDate: null,
      venue: 'Poznań, Arena',
    };
    const first = await org.req('POST', '/v1/tournaments', body, { 'idempotency-key': key });
    expect(first.status).toBe(201);
    expect(first.headers.etag).toBe('W/"1"');
    expect(first.body).toMatchObject({ status: 'DRAFT', version: 1 });
    const second = await org.req('POST', '/v1/tournaments', body, { 'idempotency-key': key });
    expect(second.status).toBe(201);
    expect(second.headers['idempotent-replayed']).toBe('true');
    expect(second.body.id).toBe(first.body.id);
    const count = await handle.db.execute(
      sql`SELECT count(*)::int AS n FROM tournament WHERE name = 'Puchar Wiosny PoleChamp' AND owner_id = (SELECT owner_id FROM tournament WHERE id = ${first.body.id})`,
    );
    expect(count.rows[0]).toEqual({ n: 1 });
    const reused = await org.req(
      'POST',
      '/v1/tournaments',
      { ...body, name: 'Inna nazwa' },
      { 'idempotency-key': key },
    );
    expect([reused.status, reused.body.code]).toEqual([422, 'IDEMPOTENCY_KEY_REUSED']);
  });

  it('TC-API-023: turniej bez daty i miejsca', async () => {
    const res = await org.req('POST', '/v1/tournaments', {
      name: 'Bez daty',
      startDate: null,
      endDate: null,
    });
    expect(res.body).toMatchObject({ startDate: null, endDate: null, venue: null });
  });

  it('TC-API-025: edycja z If-Match i konflikt wersji', async () => {
    const t = await org.tournament();
    const first = await org.req(
      'PATCH',
      `/v1/tournaments/${t.id}`,
      { venue: 'Kraków, Tauron Arena' },
      ifMatch(1),
    );
    expect([first.status, first.headers.etag]).toEqual([200, 'W/"2"']);
    const second = await org.req('PATCH', `/v1/tournaments/${t.id}`, { venue: 'Gdańsk' }, ifMatch(1));
    expect([second.status, second.body.code]).toEqual([409, 'CONFLICT_VERSION']);
    const missing = await org.req('PATCH', `/v1/tournaments/${t.id}`, { venue: 'Gdańsk' });
    expect(missing.status).toBe(428);
    const badDates = await org.req('PATCH', `/v1/tournaments/${t.id}`, { endDate: '2026-01-01' }, ifMatch(2));
    expect(badDates.body.errors).toEqual([{ field: 'endDate', code: 'DATE_RANGE' }]);
  });

  it('TC-API-026: usunięcie DRAFT 204, IN_PROGRESS 409', async () => {
    const draft = await org.tournament();
    expect((await org.req('DELETE', `/v1/tournaments/${draft.id}`, undefined, ifMatch(1))).status).toBe(204);
    expect((await org.req('GET', `/v1/tournaments/${draft.id}`)).status).toBe(404);
    const { t } = await runningCategory();
    const current = (await org.req('GET', `/v1/tournaments/${t.id}`)).body;
    const res = await org.req('DELETE', `/v1/tournaments/${t.id}`, undefined, ifMatch(current.version));
    expect([res.status, res.body.code]).toEqual([409, 'INVALID_STATE_TRANSITION']);
  });

  it('TC-API-027 / TC-API-028: start turnieju i wymóg weryfikacji e-maila', async () => {
    const t = await org.tournament();
    const started = await org.req('POST', `/v1/tournaments/${t.id}/start`);
    expect(started.body).toMatchObject({ status: 'IN_PROGRESS', version: 2 });
    const events = await handle.db.select().from(s.domainEvent).where(eq(s.domainEvent.tournamentId, t.id));
    expect(events.map((e) => e.type)).toContain('tournament.updated');

    const email = uniqueEmail();
    await call('POST', '/v1/auth/register', {
      body: {
        email,
        password: STRONG_PASSWORD,
        displayName: 'Nowa',
        acceptTerms: true,
        termsVersion: '2026-11',
      },
    });
    const login = await call('POST', '/v1/auth/login', { body: { email, password: STRONG_PASSWORD } });
    const unverified = organizer(call, login.body.accessToken);
    const t2 = await unverified.tournament();
    const res = await unverified.req('POST', `/v1/tournaments/${t2.id}/start`);
    expect([res.status, res.body.code]).toEqual([403, 'EMAIL_NOT_VERIFIED']);
  });

  it('TC-SEC-011: zasoby innego organizatora → 404', async () => {
    const { t, c, entries, judges } = await runningCategory();
    for (const [method, url] of [
      ['GET', `/v1/tournaments/${t.id}`],
      ['GET', `/v1/categories/${c.id}`],
      ['GET', `/v1/categories/${c.id}/entries`],
      ['POST', `/v1/entries/${entries[0]!.id}/withdraw`],
      ['POST', `/v1/judges/${judges[0]!.id}/pin/reset`],
      ['GET', '/v1/tournaments/nie-uuid'],
    ] as const) {
      const res = await other.req(method, url);
      expect([res.status, res.body.code], url).toEqual([404, 'NOT_FOUND']);
    }
    const mine = (await other.req('GET', '/v1/tournaments')).body.items as { id: string }[];
    expect(mine.map((i) => i.id)).not.toContain(t.id);
  });

  it('TC-API-021 / TC-API-024: lista i szczegóły z postępem', async () => {
    const { t, c, entries, judges } = await runningCategory();
    await insertSheet(handle.db, {
      categoryId: c.id,
      entryId: entries[0]!.id,
      judgeId: judges[0]!.id,
      notes: [8.5, 8.5, 8, 8, 8.5],
    });
    const details = (await org.req('GET', `/v1/tournaments/${t.id}`)).body;
    expect(details.stats).toEqual({ categories: 1, athletes: 3, judges: 2 });
    expect(details.progress).toEqual({ done: 1, expected: 6, percent: 17, startedCategories: 1 });
    expect(details.categories[0]).toMatchObject({
      status: 'IN_PROGRESS',
      entryCount: 3,
      progress: { done: 1, expected: 6 },
    });
    const list = (await org.req('GET', '/v1/tournaments?status=active')).body.items as {
      id: string;
      status: string;
      progress: unknown;
    }[];
    expect(list.find((i) => i.id === t.id)).toMatchObject({
      categoryCount: 1,
      progress: { done: 1, expected: 6, percent: 17 },
    });
    const statuses = list.map((i) => i.status);
    expect(statuses.indexOf('DRAFT')).toBeGreaterThan(statuses.lastIndexOf('IN_PROGRESS'));
  });

  it('TC-API-029 / TC-API-030: zakończenie turnieju i tryb tylko do odczytu', async () => {
    const { t, c, entries } = await runningCategory();
    const unplayed = await org.category(t.id, { name: 'Exotic Pro', style: 'EXOTIC', level: 'PRO' });
    const current = (await org.req('GET', `/v1/tournaments/${t.id}`)).body;
    const res = await org.req('POST', `/v1/tournaments/${t.id}/finish`, undefined, ifMatch(current.version));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: 'FINISHED',
      autoLockedCategoryIds: [c.id],
      unplayedCategoryIds: [unplayed.id],
    });
    const locked = (await org.req('GET', `/v1/categories/${c.id}`)).body;
    expect(locked.status).toBe('LOCKED');
    const [cat] = await handle.db.select().from(s.category).where(eq(s.category.id, c.id));
    expect(cat?.finalResultsHash).toMatch(/^[0-9a-f]{64}$/);
    const again = await org.req(
      'POST',
      `/v1/tournaments/${t.id}/finish`,
      undefined,
      ifMatch(res.body.version),
    );
    expect(again.body.code).toBe('INVALID_STATE_TRANSITION');
    for (const [method, url, body] of [
      ['POST', `/v1/tournaments/${t.id}/categories`, { name: 'X', style: 'POLE_ART', level: 'PRO' }],
      ['POST', `/v1/tournaments/${t.id}/judges`, { fullName: 'Nowy Sędzia' }],
      ['POST', `/v1/categories/${unplayed.id}/entries`, { startNumber: 99, fullName: 'Ktoś Nowy' }],
      ['POST', `/v1/categories/${c.id}/unlock`, {}],
      ['POST', `/v1/entries/${entries[0]!.id}/withdraw`, undefined],
    ] as const) {
      const r = await org.req(method, url, body);
      expect([r.status, r.body.code], url).toEqual([409, 'TOURNAMENT_FINISHED']);
    }
    // Wyjątek RODO (TL-17): sprostowanie nazwiska działa, numer nie.
    const e = (await org.req('GET', `/v1/categories/${c.id}/entries`)).body.items[0];
    const fix = await org.req(
      'PATCH',
      `/v1/entries/${e.id}`,
      { fullName: 'Zuzanna Królowa' },
      ifMatch(e.version),
    );
    expect(fix.status).toBe(200);
    const number = await org.req(
      'PATCH',
      `/v1/entries/${e.id}`,
      { startNumber: 77 },
      ifMatch(fix.body.version),
    );
    expect(number.body.code).toBe('TOURNAMENT_FINISHED');
    expect((await org.req('GET', `/v1/tournaments/${t.id}`)).status).toBe(200);
  });
});

describe('kategorie, kryteria i kary (IMP-124, IMP-125, IMP-132)', () => {
  it('TC-API-031: kategoria Exotic z szablonu stylu', async () => {
    const t = await org.tournament();
    const res = await org.req('POST', `/v1/tournaments/${t.id}/categories`, {
      name: 'Exotic Pro',
      style: 'EXOTIC',
      level: 'PRO',
      ageGroup: '',
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ ageGroup: 'Open', maxJudgeScore: 75, status: 'DRAFT' });
    expect(res.body.criteria).toHaveLength(6);
    expect(res.body.criteria[3]).toMatchObject({
      name: 'Praca na podłodze',
      weight: 1,
      scaleMax: 10,
      position: 4,
    });
    expect(res.body.criteria[0]).toMatchObject({ name: 'Technika', weight: 2 });
    expect(res.body.penaltyTypes).toEqual([
      expect.objectContaining({ name: 'Upadek', points: 2, maxOccurrences: 3 }),
      expect.objectContaining({ name: 'Przekroczenie czasu', points: 1, maxOccurrences: 2 }),
    ]);
    expect(res.body.tieBreakCriterionId).toBe(res.body.criteria[0].id);
  });

  it('TC-API-032 / TC-API-033: edycja wg statusu i usunięcie', async () => {
    const { c } = await runningCategory();
    const current = (await org.req('GET', `/v1/categories/${c.id}`)).body;
    const renamed = await org.req(
      'PATCH',
      `/v1/categories/${c.id}`,
      { name: 'Pole Sport Adv.', ageGroup: 'Senior' },
      ifMatch(current.version),
    );
    expect(renamed.status).toBe(200);
    const style = await org.req(
      'PATCH',
      `/v1/categories/${c.id}`,
      { style: 'POLE_ART' },
      ifMatch(renamed.body.version),
    );
    expect(style.body.code).toBe('CRITERIA_LOCKED');
    const del = await org.req('DELETE', `/v1/categories/${c.id}`, undefined, ifMatch(renamed.body.version));
    expect(del.body.code).toBe('INVALID_STATE_TRANSITION');
    const t = await org.tournament();
    const draft = await org.category(t.id);
    expect(
      (await org.req('DELETE', `/v1/categories/${draft.id}`, undefined, ifMatch(draft.version))).status,
    ).toBe(204);
  });

  it('TC-API-042…046: CRUD kryteriów i kar, MIN_CRITERIA, limity, walidacje', async () => {
    const t = await org.tournament();
    const c = await org.category(t.id);
    const added = await org.req('POST', `/v1/categories/${c.id}/criteria`, {
      name: 'Synchronizacja',
      scaleMax: 10,
      weight: 1.5,
    });
    expect(added.body).toMatchObject({ position: 6, weight: 1.5, step: 0.5 });
    const stepped = await org.req('PATCH', `/v1/criteria/${added.body.id}`, { step: 1 });
    expect(stepped.body.step).toBe(1);
    const badStep = await org.req('PATCH', `/v1/criteria/${added.body.id}`, { step: 0.2 });
    expect(badStep.status).toBe(422);
    expect((await org.req('GET', `/v1/categories/${c.id}`)).body.maxJudgeScore).toBe(80);
    const patched = await org.req('PATCH', `/v1/criteria/${added.body.id}`, { weight: 2.5 });
    expect(patched.body.weight).toBe(2.5);
    expect((await org.req('DELETE', `/v1/criteria/${added.body.id}`)).status).toBe(204);
    expect((await org.req('GET', `/v1/categories/${c.id}`)).body.maxJudgeScore).toBe(65);
    const invalid = await org.req('POST', `/v1/categories/${c.id}/criteria`, {
      name: 'X',
      scaleMax: 21,
      weight: 0.3,
    });
    expect(invalid.body.errors).toEqual(
      expect.arrayContaining([
        { field: 'scaleMax', code: 'OUT_OF_RANGE' },
        { field: 'weight', code: 'INVALID_STEP' },
      ]),
    );

    // Usunięcie pierwszego kryterium – nowe rozstrzygające, pozycje zagęszczone; ostatniego nie można usunąć.
    const before = (await org.req('GET', `/v1/categories/${c.id}`)).body;
    expect((await org.req('DELETE', `/v1/criteria/${before.criteria[0].id}`)).status).toBe(204);
    const after = (await org.req('GET', `/v1/categories/${c.id}`)).body;
    expect(after.criteria.map((k: { position: number }) => k.position)).toEqual([1, 2, 3, 4]);
    expect(after.tieBreakCriterionId).toBe(after.criteria[0].id);
    for (const k of after.criteria.slice(1)) await org.req('DELETE', `/v1/criteria/${k.id}`);
    const last = await org.req('DELETE', `/v1/criteria/${after.criteria[0].id}`);
    expect([last.status, last.body.code]).toEqual([409, 'MIN_CRITERIA']);

    for (let i = 0; i < TOURNAMENT_LIMITS.criteria - 1; i++) {
      await org.req('POST', `/v1/categories/${c.id}/criteria`, { name: `K${i}`, scaleMax: 10, weight: 1 });
    }
    const over = await org.req('POST', `/v1/categories/${c.id}/criteria`, {
      name: 'K13',
      scaleMax: 10,
      weight: 1,
    });
    expect([over.status, over.body.code, over.body.max]).toEqual([409, 'LIMIT_EXCEEDED', 12]);
    for (let i = 0; i < TOURNAMENT_LIMITS.penaltyTypes - 2; i++) {
      await org.req('POST', `/v1/categories/${c.id}/penalty-types`, {
        name: `P${i}`,
        points: 0.5,
        maxOccurrences: 1,
      });
    }
    const overP = await org.req('POST', `/v1/categories/${c.id}/penalty-types`, {
      name: 'P11',
      points: 1,
      maxOccurrences: 1,
    });
    expect([overP.body.code, overP.body.max]).toEqual(['LIMIT_EXCEEDED', 10]);
  });

  it('TC-INT-004: kryteria i kary zablokowane po starcie', async () => {
    const { c } = await runningCategory();
    const details = (await org.req('GET', `/v1/categories/${c.id}`)).body;
    for (const [method, url, body] of [
      ['POST', `/v1/categories/${c.id}/criteria`, { name: 'X', scaleMax: 10, weight: 1 }],
      ['PATCH', `/v1/criteria/${details.criteria[0].id}`, { weight: 1 }],
      ['DELETE', `/v1/criteria/${details.criteria[1].id}`, undefined],
      ['POST', `/v1/categories/${c.id}/penalty-types`, { name: 'X', points: 1, maxOccurrences: 1 }],
      ['DELETE', `/v1/penalty-types/${details.penaltyTypes[0].id}`, undefined],
    ] as const) {
      expect((await org.req(method, url, body)).body.code, url).toBe('CRITERIA_LOCKED');
    }
  });
});

describe('start kategorii (IMP-126)', () => {
  it('TC-API-034: brakujące warunki', async () => {
    const t = await org.tournament();
    const c = await org.category(t.id);
    const noEntries = await org.req('POST', `/v1/categories/${c.id}/start`);
    expect([noEntries.status, noEntries.body.code, noEntries.body.detail]).toEqual([
      409,
      'START_REQUIREMENTS_NOT_MET',
      'NO_ACTIVE_ENTRIES',
    ]);
    await org.entry(c.id, 1);
    const noJudges = await org.req('POST', `/v1/categories/${c.id}/start`);
    expect(noJudges.body.detail).toBe('NO_ACTIVE_JUDGES');
    expect((await org.req('GET', `/v1/categories/${c.id}`)).body.status).toBe('DRAFT');
  });

  it('TC-API-035: start ustala panel i rozpoczyna turniej', async () => {
    const { t, c, judges } = await runningCategory();
    expect((await org.req('GET', `/v1/tournaments/${t.id}`)).body.status).toBe('IN_PROGRESS');
    const panel = await handle.db.select().from(s.categoryJudge).where(eq(s.categoryJudge.categoryId, c.id));
    expect(panel.map((p) => p.judgeId).sort()).toEqual(judges.map((j) => j.id).sort());
    const types = (
      await handle.db.select().from(s.domainEvent).where(eq(s.domainEvent.tournamentId, t.id))
    ).map((e) => e.type);
    expect(types).toEqual(expect.arrayContaining(['category.updated', 'tournament.updated', 'sync.hint']));
  });
});

describe('blokada kategorii (IMP-127)', () => {
  it('TC-API-037…040: ostrzeżenia, blokada wymuszona z sumą kontrolną, odblokowanie', async () => {
    const { t, c, entries, judges } = await runningCategory();
    await insertSheet(handle.db, {
      categoryId: c.id,
      entryId: entries[0]!.id,
      judgeId: judges[0]!.id,
      notes: [8.5, 8.5, 8, 8, 8.5],
    });
    const [tablet] = await handle.db
      .insert(s.device)
      .values({
        tournamentId: t.id,
        name: 'Tablet stół 2',
        platform: 'android',
        secretHash: Buffer.alloc(32),
        pepper: Buffer.alloc(32),
        lastSeenAt: new Date(),
        pendingMutations: 3,
      })
      .returning();
    const warn = await org.req('POST', `/v1/categories/${c.id}/lock`, { force: false });
    expect(warn.status).toBe(409);
    expect(warn.body).toMatchObject({ code: 'LOCK_WARNINGS', missingSheets: 5 });
    expect(warn.body.devicesWithPending).toEqual([
      expect.objectContaining({ deviceId: tablet!.id, pendingMutations: 3 }),
    ]);

    const locked = await org.req('POST', `/v1/categories/${c.id}/lock`, { force: true });
    expect(locked.status).toBe(200);
    // Wersja 1 powstaje przy starcie kategorii (IMP-150), blokada daje kolejną.
    expect(locked.body).toMatchObject({ status: 'LOCKED', resultsVersion: 2 });
    const rows = await handle.db.select().from(s.categoryResult).where(eq(s.categoryResult.categoryId, c.id));
    const expected = createHash('sha256')
      .update(
        canonicalResults(
          { categoryId: c.id, resultsVersion: 2, aggregationMethod: 'MEAN', judgeCount: 2 },
          rows.map((r) => {
            const e = entries.find((x) => x.id === r.entryId)!;
            return {
              entryId: r.entryId,
              startNumber: [41, 42, 43][entries.indexOf(e)]!,
              entryStatus: 'ACTIVE' as const,
              rank: r.rank,
              officialHundredths: r.officialHundredths,
              sheetCount: r.sheetCount,
              isComplete: r.isComplete,
            };
          }),
        ),
      )
      .digest('hex');
    expect(locked.body.finalResultsHash).toBe(expected);
    expect(rows.find((r) => r.entryId === entries[0]!.id)).toMatchObject({
      officialHundredths: 5425,
      rank: 1,
      sheetCount: 1,
      isComplete: false,
    });

    const unlock = await org.req('POST', `/v1/categories/${c.id}/unlock`, { reason: 'Protest trenerki' });
    expect(unlock.body.status).toBe('IN_PROGRESS');
    const [cat] = await handle.db.select().from(s.category).where(eq(s.category.id, c.id));
    expect(cat?.finalResultsHash).toBeNull();
    const audit = await handle.db.execute(
      sql`SELECT after FROM audit_log WHERE entity_id = ${c.id} AND action = 'CATEGORY_UNLOCKED'`,
    );
    expect(JSON.stringify(audit.rows[0])).toContain('Protest trenerki');
  });
});

describe('lista startowa (IMP-128, IMP-129)', () => {
  it('TC-API-047 / TC-L10N-006: lista, liczniki i wyszukiwanie bez polskich znaków', async () => {
    const { c, entries, judges } = await runningCategory();
    await insertSheet(handle.db, {
      categoryId: c.id,
      entryId: entries[2]!.id,
      judgeId: judges[0]!.id,
      notes: [8, 8, 8, 8, 8],
    });
    const list = (await org.req('GET', `/v1/categories/${c.id}/entries`)).body.items;
    expect(list.map((e: { startOrder: number }) => e.startOrder)).toEqual([1, 2, 3]);
    expect(list[2].judged).toEqual({ done: 1, expected: 2 });
    const found = (await org.req('GET', `/v1/categories/${c.id}/entries?q=zuzanna%20krol`)).body.items;
    expect(found.map((e: { athlete: { fullName: string } }) => e.athlete.fullName)).toEqual(['Zuzanna Król']);
    expect((await org.req('GET', `/v1/categories/${c.id}/entries?q=43`)).body.items).toHaveLength(1);
  });

  it('TC-API-048…050 / TC-EDGE-012: numer zajęty, zgoda opiekuna, emoji, kategoria zablokowana', async () => {
    const { t, c } = await runningCategory();
    const other = await org.category(t.id, { name: 'Pole Art', style: 'POLE_ART', level: 'PRO' });
    const added = await org.entry(c.id, 50, 'Julia Kamińska');
    expect(added.startOrder).toBe(4);
    const taken = await org.req('POST', `/v1/categories/${other.id}/entries`, {
      startNumber: 41,
      fullName: 'Inna Osoba',
    });
    expect([taken.status, taken.body.code, taken.body.number]).toEqual([409, 'START_NUMBER_TAKEN', 41]);
    const minor = await org.req('POST', `/v1/categories/${c.id}/entries`, {
      startNumber: 51,
      fullName: 'Ola Młoda',
      birthYear: new Date().getFullYear() - 14,
    });
    expect(minor.body.errors).toEqual([{ field: 'guardianConsentConfirmed', code: 'REQUIRED' }]);
    const ok = await org.req('POST', `/v1/categories/${c.id}/entries`, {
      startNumber: 51,
      fullName: 'Ola Młoda',
      birthYear: new Date().getFullYear() - 14,
      guardianConsentConfirmed: true,
    });
    expect(ok.body.athlete.isMinor).toBe(true);
    const emoji = await org.req('POST', `/v1/categories/${c.id}/entries`, {
      startNumber: 52,
      fullName: 'Ola 💃',
    });
    expect(emoji.body.errors).toEqual([{ field: 'fullName', code: 'INVALID_FORMAT' }]);
    await org.req('POST', `/v1/categories/${c.id}/lock`, { force: true });
    const lockedAdd = await org.req('POST', `/v1/categories/${c.id}/entries`, {
      startNumber: 53,
      fullName: 'Za Późno',
    });
    expect(lockedAdd.body.code).toBe('CATEGORY_LOCKED');
  });

  it('TC-API-051 / TC-API-052: wycofanie, przywrócenie, usunięcie startu z ocenami', async () => {
    const { c, entries, judges } = await runningCategory();
    await insertSheet(handle.db, {
      categoryId: c.id,
      entryId: entries[0]!.id,
      judgeId: judges[0]!.id,
      notes: [9, 9, 9, 9, 9],
    });
    const withdrawn = await org.req('POST', `/v1/entries/${entries[0]!.id}/withdraw`);
    expect(withdrawn.body.status).toBe('WITHDRAWN');
    const [result] = await handle.db
      .select()
      .from(s.categoryResult)
      .where(and(eq(s.categoryResult.categoryId, c.id), eq(s.categoryResult.entryId, entries[0]!.id)));
    expect(result).toMatchObject({ rank: null, sheetCount: 1 });
    expect((await org.req('POST', `/v1/entries/${entries[0]!.id}/withdraw`)).body.code).toBe(
      'INVALID_STATE_TRANSITION',
    );
    const restored = await org.req('POST', `/v1/entries/${entries[0]!.id}/restore`);
    expect(restored.body).toMatchObject({ status: 'ACTIVE', startOrder: 1 });
    const del = await org.req('DELETE', `/v1/entries/${entries[0]!.id}`);
    expect([del.status, del.body.code]).toEqual([409, 'HAS_SCORES']);
    expect((await org.req('DELETE', `/v1/entries/${entries[1]!.id}`)).status).toBe(204);
    const list = (await org.req('GET', `/v1/categories/${c.id}/entries`)).body.items;
    expect(list.map((e: { startOrder: number }) => e.startOrder)).toEqual([1, 2]);
  });
});

describe('sędziowie i PIN-y (IMP-130, IMP-131)', () => {
  it('TC-EDGE-028: generator PIN-ów omija zakazane wzorce', () => {
    for (const pin of ['0000', '7777', '0123', '6789', '9876', '1987', '2026', '1234', '5678']) {
      expect(isForbiddenPin(pin), pin).toBe(true);
    }
    for (const pin of ['8306', '4071', '1357']) expect(isForbiddenPin(pin), pin).toBe(false);
  });

  it('TC-API-055 / TC-API-060: PIN tylko w odpowiedzi 201, unikalny, lista bez sekretów', async () => {
    const t = await org.tournament();
    const created = await org.req('POST', `/v1/tournaments/${t.id}/judges`, { fullName: 'Katarzyna Nowak' });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ initials: 'KN', isActive: true, pinShownOnce: true });
    expect(created.body.pin).toMatch(/^\d{4}$/);
    expect(isForbiddenPin(created.body.pin)).toBe(false);
    const [row] = await handle.db.select().from(s.judge).where(eq(s.judge.id, created.body.id));
    expect(row!.pinHash).toMatch(/^\$argon2id\$/);
    expect(row!.pinOfflineVerifier).toHaveLength(32);
    const list = await org.req('GET', `/v1/tournaments/${t.id}/judges`);
    expect(list.body.items[0]).toEqual({
      id: created.body.id,
      fullName: 'Katarzyna Nowak',
      initials: 'KN',
      isActive: true,
      pinLocked: false,
      sheetCount: 0,
      version: 1,
    });
    expect(JSON.stringify(list.body)).not.toContain(created.body.pin);
    const audit = await handle.db.execute(
      sql`SELECT after FROM audit_log WHERE entity_id = ${created.body.id}`,
    );
    expect(JSON.stringify(audit.rows)).not.toContain(created.body.pin);
  });

  it('TC-API-056: duplikat imienia i nazwiska bez rozróżniania wielkości liter', async () => {
    const t = await org.tournament();
    await org.judge(t.id, 'Katarzyna Nowak');
    const dup = await org.req('POST', `/v1/tournaments/${t.id}/judges`, { fullName: '  katarzyna nowak ' });
    expect([dup.status, dup.body.code]).toEqual([409, 'JUDGE_NAME_TAKEN']);
  });

  it('TC-API-057: dezaktywacja i reaktywacja z panelami (TL-18)', async () => {
    const { c, judges } = await runningCategory();
    const j = judges[1]!;
    const deactivated = await org.req('PATCH', `/v1/judges/${j.id}`, { isActive: false }, ifMatch(1));
    expect(deactivated.body.isActive).toBe(false);
    await handle.db.delete(s.categoryJudge).where(eq(s.categoryJudge.judgeId, j.id));
    const reactivated = await org.req(
      'PATCH',
      `/v1/judges/${j.id}`,
      { isActive: true },
      ifMatch(deactivated.body.version),
    );
    expect(reactivated.body.isActive).toBe(true);
    const panel = await handle.db
      .select()
      .from(s.categoryJudge)
      .where(and(eq(s.categoryJudge.categoryId, c.id), eq(s.categoryJudge.judgeId, j.id)));
    expect(panel).toHaveLength(1);
  });

  it('TC-API-058: reset PIN-u – nowa wersja, blokada zdjęta, sesje zamknięte', async () => {
    const { t, judges } = await runningCategory();
    const j = judges[0]!;
    const [d] = await handle.db
      .insert(s.device)
      .values({
        tournamentId: t.id,
        name: 'Tablet 1',
        platform: 'ios',
        secretHash: Buffer.alloc(32),
        pepper: Buffer.alloc(32),
      })
      .returning();
    await handle.db
      .insert(s.judgeSession)
      .values({ id: uuidv7(), judgeId: j.id, deviceId: d!.id, authMode: 'ONLINE_PIN', pinVersion: 1 });
    await handle.db
      .update(s.judge)
      .set({ pinLockedAt: new Date(), failedPinCount: 10 })
      .where(eq(s.judge.id, j.id));
    const reset = await org.req('POST', `/v1/judges/${j.id}/pin/reset`);
    expect(reset.body.pin).toMatch(/^\d{4}$/);
    const [row] = await handle.db.select().from(s.judge).where(eq(s.judge.id, j.id));
    expect(row).toMatchObject({ pinVersion: 2, pinLockedAt: null, failedPinCount: 0 });
    const sessions = await handle.db.select().from(s.judgeSession).where(eq(s.judgeSession.judgeId, j.id));
    expect(sessions.every((x) => x.endedReason === 'REVOKED')).toBe(true);
    const revoked = await handle.db
      .select()
      .from(s.domainEvent)
      .where(and(eq(s.domainEvent.tournamentId, t.id), eq(s.domainEvent.type, 'session.revoked')));
    expect(revoked.map((e) => e.payload)).toContainEqual({ judgeId: j.id, reason: 'PIN_RESET' });
  });

  it('TC-API-059: usunięcie sędziego z ocenami', async () => {
    const { c, entries, judges } = await runningCategory();
    await insertSheet(handle.db, {
      categoryId: c.id,
      entryId: entries[0]!.id,
      judgeId: judges[0]!.id,
      notes: [8, 8, 8, 8, 8],
    });
    expect((await org.req('DELETE', `/v1/judges/${judges[0]!.id}`)).body.code).toBe('HAS_SCORES');
    const t2 = await org.tournament();
    const free = await org.judge(t2.id, 'Bez Ocen');
    expect((await org.req('DELETE', `/v1/judges/${free.id}`)).status).toBe(204);
  });
});

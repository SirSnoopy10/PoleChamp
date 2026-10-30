import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { asc, eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { DbHandle } from '../../src/db/client.js';
import * as s from '../../src/db/schema.js';
import { seedJudgeTotals } from '@polechamp/test-fixtures';
import { startApp } from '../support/app.js';
import { testDb } from '../support/db.js';
import { type Call, client, flushValkey, registerAndLogin } from '../support/http.js';
import { mutation, push, runningCategory } from '../support/push.js';
import { insertSheet, organizer } from '../support/scenario.js';
import { judgeLogin, pairTablet } from '../support/tablet.js';

let app: NestFastifyApplication;
let call: Call;
let handle: DbHandle;
let org: ReturnType<typeof organizer>;

beforeAll(async () => {
  ({ app } = await startApp());
  call = client(app);
  handle = testDb();
  await flushValkey();
  org = organizer(call, (await registerAndLogin(call)).accessToken);
});
afterAll(async () => {
  await app.close();
  await handle.pool.end();
});
beforeEach(async () => {
  await flushValkey();
});

const ifMatch = (v: number) => ({ 'if-match': `W/"${v}"` });
const JUDGES = ['Katarzyna Nowak', 'Ewa Zielińska', 'Iwona Lis', 'Monika Sowa', 'Dorota Pawlak'];

describe('przeliczanie wyników (IMP-150)', () => {
  it('TC-API-110: dodanie szóstego sędziego → J = 6, wyniki niekompletne; dezaktywacja bez ocen → J = 5', async () => {
    const t = await org.tournament();
    const judges = [];
    for (const name of JUDGES) judges.push(await org.judge(t.id, name));
    const c = await org.category(t.id);
    const entries = [];
    for (let n = 41; n <= 49; n++) entries.push(await org.entry(c.id, n));
    await org.req('POST', `/v1/categories/${c.id}/start`);
    for (const e of entries.slice(0, 6)) {
      for (const j of judges) {
        await insertSheet(handle.db, {
          categoryId: c.id,
          entryId: e.id,
          judgeId: j.id,
          notes: [8, 8, 8, 8, 8],
        });
      }
    }
    const results = () =>
      handle.db.select().from(s.categoryResult).where(eq(s.categoryResult.categoryId, c.id));

    const sixth = await org.judge(t.id, 'Halina Kos');
    let details = (await org.req('GET', `/v1/categories/${c.id}`)).body;
    expect([details.judgeCount, details.progress.done, details.progress.expected]).toEqual([6, 30, 54]);
    const afterAdd = await results();
    expect(afterAdd).toHaveLength(9);
    expect(afterAdd.every((r) => !r.isComplete && r.expectedCount === 6)).toBe(true);

    await org.req('PATCH', `/v1/judges/${sixth.id}`, { isActive: false }, ifMatch(1));
    details = (await org.req('GET', `/v1/categories/${c.id}`)).body;
    expect([details.judgeCount, details.progress.done, details.progress.expected]).toEqual([5, 30, 45]);
    const afterDeactivate = await results();
    expect(afterDeactivate.filter((r) => r.isComplete)).toHaveLength(6);
    const [cat] = await handle.db.select().from(s.category).where(eq(s.category.id, c.id));
    const updates = await handle.db
      .select()
      .from(s.domainEvent)
      .where(eq(s.domainEvent.type, 'results.updated'))
      .orderBy(asc(s.domainEvent.id));
    expect(
      updates.filter((e) => (e.payload as { categoryId: string }).categoryId === c.id).at(-1)!.payload,
    ).toEqual({
      categoryId: c.id,
      resultsVersion: cat!.resultsVersion,
    });
  });
});

/** Kategoria c3 z seedu prototypu (FX-T1C3, 03-analiza-designu §8.6): wyniki sędziów w setnych, J = 5. */
const C3 = seedJudgeTotals('c3');

/** Noty Pole Sport (wagi 2; 1,5; 1; 1; 1, krok 0,5) dające zadany wynik sędziego w setnych. */
function notesFor(totalHundredths: number): number[] {
  const units = totalHundredths / 25; // 4a + 3b + 2(c + d + e), noty w połówkach punktu
  for (let a = 18; a >= 0; a--) {
    for (let b = 18; b >= 0; b--) {
      const rest = units - 4 * a - 3 * b;
      if (rest < 0 || rest % 2 !== 0 || rest / 2 > 60) continue;
      const s = rest / 2;
      const c = Math.floor(s / 3);
      const d = Math.floor((s - c) / 2);
      return [a, b, c, d, s - c - d].map((x) => x / 2);
    }
  }
  throw new Error(`Brak not dla ${totalHundredths}`);
}

/** Turniej z kategorią c3: oceny przez `sync/push`, nr 43 z oceną offline i poprawką, nr 41 z 3 rewizjami. */
async function buildC3() {
  const t = await org.tournament();
  const judges: { id: string; pin: string }[] = [];
  for (const name of JUDGES) judges.push(await org.judge(t.id, name));
  const c = await org.category(t.id);
  const entries = new Map<number, { id: string }>();
  for (const [nr] of C3) entries.set(nr, await org.entry(c.id, nr));
  await org.req('POST', `/v1/categories/${c.id}/start`);
  const tablet = await pairTablet(call, org, t.id);
  const sessions: string[] = [];
  for (const j of judges) sessions.push((await judgeLogin(call, tablet.token, j.id, j.pin)).sessionId);
  const offline = mutation.sessionStarted(judges[4]!.id, 1);
  const sheets = new Map<string, ReturnType<typeof mutation.submit>>();
  const batch: unknown[] = [offline];
  for (const [nr, totals] of C3) {
    totals.forEach((total, i) => {
      const isOffline = nr === 43 && i === 4;
      const m = mutation.submit({
        judgeId: judges[i]!.id,
        judgeSessionId: isOffline ? offline.payload.judgeSessionId : sessions[i]!,
        authMode: isOffline ? 'OFFLINE_PIN' : 'ONLINE_PIN',
        categoryId: c.id,
        entryId: entries.get(nr)!.id,
        criteria: c.criteria,
        notes: notesFor(total),
        comment: nr === 43 ? `Ocena sędziego ${i + 1}` : '',
        clientTotal: total / 100,
      });
      sheets.set(`${nr}:${i}`, m);
      batch.push(m);
    });
  }
  const res = await push(call, tablet.token, batch);
  expect(res.body.results.every((r: { status: string }) => r.status === 'APPLIED')).toBe(true);
  // Poprawki z tymi samymi notami: nr 43 sędzia 1 (rev 2), nr 41 sędzia 2 (rev 2 i 3).
  const correct = (key: string, baseRevision: number) => {
    const m = sheets.get(key)!;
    return mutation.submit({
      judgeId: m.judgeId,
      judgeSessionId: m.judgeSessionId,
      categoryId: c.id,
      entryId: m.payload.entryId,
      criteria: c.criteria,
      notes: m.payload.criteria.map((k) => k.value),
      comment: m.payload.comment,
      scoreSheetId: m.payload.scoreSheetId,
      baseRevision,
    });
  };
  await push(call, tablet.token, [correct('43:0', 1), correct('41:1', 1)]);
  await push(call, tablet.token, [correct('41:1', 2)]);
  return { t, c, judges, entries, tablet, sheets };
}

describe('wyniki, oceny i rewizje (IMP-151, IMP-152) – fikstura c3', () => {
  let fx: Awaited<ReturnType<typeof buildC3>>;

  beforeAll(async () => {
    await flushValkey();
    fx = await buildC3();
  });

  it('TC-API-090: ranking kategorii c3 – kolejność, teksty, rozstrzygnięcie Techniką, ETag', async () => {
    const res = await org.req('GET', `/v1/categories/${fx.c.id}/results`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      categoryId: fx.c.id,
      status: 'IN_PROGRESS',
      maxJudgeScore: 65,
      judgeCount: 5,
      formula: 'MEAN',
      tieBreak: { criterionId: fx.c.criteria[0]!.id, criterionName: 'Technika' },
    });
    const table = res.body.rows.map((r: any) => [r.startNumber, r.rank, r.display, r.sheetCount]);
    expect(table).toEqual([
      [47, 1, '55,50', 3],
      [46, 2, '55,13', 2],
      [43, 3, '54,75', 5],
      [45, 4, '54,30', 5],
      [42, 5, '52,70', 5],
      [41, 6, '52,65', 5],
      [44, 7, '48,00', 5],
      [48, null, '—', 0],
      [49, null, '—', 0],
    ]);
    expect(res.body.rows[0]).toMatchObject({
      official: 55.5,
      isComplete: false,
      isProvisional: true, // UX2-01
      entryStatus: 'ACTIVE',
    });
    expect(res.body.rows[0].fullName).toBeTruthy();
    expect(res.headers.etag).toBe(`W/"${res.body.resultsVersion}"`);
    const cached = await org.req('GET', `/v1/categories/${fx.c.id}/results`, undefined, {
      'if-none-match': res.headers.etag as string,
    });
    expect(cached.status).toBe(304);
  });

  it('TC-API-094: oceny startu nr 43 – 5 arkuszy, poprawiony i offline, podsumowanie', async () => {
    const res = await org.req('GET', `/v1/entries/${fx.entries.get(43)!.id}/score-sheets`);
    expect(res.status).toBe(200);
    expect(res.body.items.map((s: any) => s.judge.id)).toEqual(fx.judges.map((j) => j.id));
    const [first] = res.body.items;
    expect(first).toMatchObject({
      total: 55.25,
      revision: 2,
      revisionCount: 2,
      authMode: 'ONLINE_PIN',
      comment: 'Ocena sędziego 1',
    });
    expect(first.criteria[0]).toMatchObject({ name: 'Technika', weight: 2 });
    expect(first.penalties.map((p: any) => p.count)).toEqual(fx.c.penaltyTypes.map(() => 0));
    expect(res.body.items[4]).toMatchObject({ authMode: 'OFFLINE_PIN', revisionCount: 1 });
    expect(res.body.missingJudges).toEqual([]);
    expect(res.body.summary).toEqual({
      official: 54.75,
      display: '54,75',
      rank: 3,
      sheetCount: 5,
      expectedCount: 5,
    });
    const partial = await org.req('GET', `/v1/entries/${fx.entries.get(47)!.id}/score-sheets`);
    expect(partial.body.missingJudges.map((j: any) => j.id)).toEqual(fx.judges.slice(3).map((j) => j.id));
  });

  it('TC-API-095: historia rewizji – 3 wpisy rosnąco z wartościami, trybem i actorType', async () => {
    const id = fx.sheets.get('41:1')!.payload.scoreSheetId;
    const res = await org.req('GET', `/v1/score-sheets/${id}/revisions`);
    expect(res.body.items.map((r: any) => [r.revision, r.total, r.actorType, r.authMode])).toEqual([
      [1, 50.5, 'JUDGE', 'ONLINE_PIN'],
      [2, 50.5, 'JUDGE', 'ONLINE_PIN'],
      [3, 50.5, 'JUDGE', 'ONLINE_PIN'],
    ]);
    expect(res.body.items[0].criteria).toHaveLength(5);
    const times = res.body.items.map((r: any) => new Date(r.createdAt).getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it('TC-AUTHZ-046…049: inny organizator 404, tablet 403', async () => {
    const other = organizer(call, (await registerAndLogin(call)).accessToken);
    const urls = [
      `/v1/categories/${fx.c.id}/results`,
      `/v1/tournaments/${fx.t.id}/results`,
      `/v1/entries/${fx.entries.get(43)!.id}/score-sheets`,
      `/v1/score-sheets/${fx.sheets.get('41:1')!.payload.scoreSheetId}/revisions`,
    ];
    for (const url of urls) {
      expect((await other.req('GET', url)).status, url).toBe(404);
      expect((await call('GET', url, { token: fx.tablet.token })).status, url).toBe(403);
    }
  });

  it('TC-API-091 / TC-API-092 / UX-12: wycofany start na końcu bez miejsca; po blokadzie niekompletne wstępne', async () => {
    await org.req('POST', `/v1/entries/${fx.entries.get(44)!.id}/withdraw`);
    const withdrawn = (await org.req('GET', `/v1/categories/${fx.c.id}/results`)).body.rows;
    expect(withdrawn.at(-1)).toMatchObject({ startNumber: 44, entryStatus: 'WITHDRAWN', rank: null });
    await org.req('POST', `/v1/categories/${fx.c.id}/lock`, { force: true });
    // UX2-38: sędzia dodany po blokadzie nie zmienia J zapisanego z wynikami.
    await org.judge(fx.t.id, 'Sędzia Po Blokadzie');
    const locked = (await org.req('GET', `/v1/categories/${fx.c.id}/results`)).body;
    expect(locked.status).toBe('LOCKED');
    expect(locked.judgeCount).toBe(5);
    const flags = locked.rows
      .filter((r: any) => r.rank !== null)
      .map((r: any) => [r.startNumber, r.isProvisional]);
    expect(flags).toEqual([
      [47, true],
      [46, true],
      [43, false],
      [45, false],
      [42, false],
      [41, false],
    ]);
  });

  it('TC-API-093: wyniki całego turnieju – kategorie w kolejności, nierozegrana oznaczona', async () => {
    const draft = await org.category(fx.t.id, { name: 'Exotic Open', style: 'EXOTIC' });
    await org.entry(draft.id, 60);
    const current = await org.req('GET', `/v1/tournaments/${fx.t.id}`);
    await org.req('POST', `/v1/tournaments/${fx.t.id}/finish`, undefined, ifMatch(current.body.version));
    const res = await org.req('GET', `/v1/tournaments/${fx.t.id}/results`);
    expect(res.body.tournamentId).toBe(fx.t.id);
    expect(res.body.categories.map((c: any) => [c.categoryId, c.status, c.unplayed ?? false])).toEqual([
      [fx.c.id, 'LOCKED', false],
      [draft.id, 'DRAFT', true],
    ]);
    expect(res.body.categories[1].rows).toEqual([
      expect.objectContaining({ startNumber: 60, display: '—', rank: null }),
    ]);
  });
});

describe('własne arkusze sędziego (IMP-153)', () => {
  it('TC-API-089 / TC-SYNC-039: jA dostaje 6 swoich arkuszy, bez arkuszy jB i innych turniejów', async () => {
    const { t, c, judges, jA, entries, tablet, session } = await runningCategory(call, org, {
      entries: [1, 2, 3, 4, 5, 6],
    });
    const jB = judges[1]!;
    const sessionB = await judgeLogin(call, tablet.token, jB.id, jB.pin);
    const sheet = (judgeId: string, judgeSessionId: string, entryId: string) =>
      mutation.submit({ judgeId, judgeSessionId, categoryId: c.id, entryId, criteria: c.criteria });
    const own = entries.map((e) => sheet(jA.id, session.sessionId, e.id));
    const others = entries.slice(0, 4).map((e) => sheet(jB.id, sessionB.sessionId, e.id));
    await push(call, tablet.token, [...own, ...others]);
    const other = await runningCategory(call, org);
    await push(call, other.tablet.token, [
      mutation.submit({
        judgeId: other.jA.id,
        judgeSessionId: other.session.sessionId,
        categoryId: other.c.id,
        entryId: other.entries[0]!.id,
        criteria: other.c.criteria,
      }),
    ]);

    // Sędzia loguje się na nowym tablecie i odzyskuje swoje oceny.
    const newTablet = await pairTablet(call, org, t.id, 'Tablet zapasowy');
    const sessionA = await judgeLogin(call, newTablet.token, jA.id, jA.pin);
    const res = await call('GET', '/v1/judge/me/score-sheets', { token: sessionA.judgeToken });
    expect(res.status).toBe(200);
    expect(res.body.items.map((s: any) => s.scoreSheetId).sort()).toEqual(
      own.map((m) => m.payload.scoreSheetId).sort(),
    );
    expect(res.body.items[0]).toEqual({
      scoreSheetId: expect.any(String),
      categoryId: c.id,
      entryId: expect.any(String),
      criteria: expect.arrayContaining([expect.objectContaining({ value: 5 })]),
      penalties: expect.any(Array),
      comment: '',
      revision: 1,
      total: 32.5,
      updatedAt: expect.any(String),
    });
    expect((await call('GET', '/v1/judge/me/score-sheets', { token: tablet.token })).status).toBe(403);
    expect((await org.req('GET', '/v1/judge/me/score-sheets')).status).toBe(403);
  });
});

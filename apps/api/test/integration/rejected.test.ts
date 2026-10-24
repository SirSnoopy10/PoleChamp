import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { DbHandle } from '../../src/db/client.js';
import * as s from '../../src/db/schema.js';
import { startApp } from '../support/app.js';
import { testDb } from '../support/db.js';
import { type Call, client, flushValkey, registerAndLogin } from '../support/http.js';
import { mutation, push, runningCategory } from '../support/push.js';
import { organizer } from '../support/scenario.js';
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
const statuses = (res: { body: Record<string, any> }) =>
  (res.body.results as { status: string; code?: string }[]).map((r) => r.code ?? r.status);
const lock = (categoryId: string) => org.req('POST', `/v1/categories/${categoryId}/lock`, { force: true });
const unlock = (categoryId: string) =>
  org.req('POST', `/v1/categories/${categoryId}/unlock`, { reason: 'Odrzucone oceny tabletu' });
const pending = async (tournamentId: string) =>
  (await org.req('GET', `/v1/tournaments/${tournamentId}/rejected-submissions?resolution=PENDING`)).body
    .items as { id: string; entry: { id: string }; reason: string }[];

/** Kategoria w trakcie z ocenami jA (po jednej na start) odrzuconymi po blokadzie (TC-SYNC-007). */
async function lockedWithRejected(startNumbers?: number[]) {
  const ctx = await runningCategory(call, org, { entries: startNumbers });
  const { c, jA, entries, tablet, session } = ctx;
  await lock(c.id);
  const sheets = entries.map((e, i) =>
    mutation.submit({
      judgeId: jA.id,
      judgeSessionId: session.sessionId,
      categoryId: c.id,
      entryId: e.id,
      criteria: c.criteria,
      notes: [8.5, 8.5, 8, 8, 8.5 - i],
    }),
  );
  const res = await push(call, tablet.token, sheets);
  return { ...ctx, sheets, res };
}

describe('odrzucone zgłoszenia (IMP-149)', () => {
  it('TC-SYNC-007 / TC-API-096: CATEGORY_LOCKED na liście PENDING, wyniki bez zmian, liczniki', async () => {
    const { t, c, jA, entries, res } = await lockedWithRejected([44, 45, 46, 47]);
    expect(statuses(res)).toEqual(Array(4).fill('CATEGORY_LOCKED'));
    const [cat] = await handle.db.select().from(s.category).where(eq(s.category.id, c.id));
    const sheets = await handle.db.select().from(s.scoreSheet).where(eq(s.scoreSheet.categoryId, c.id));
    expect(sheets).toHaveLength(0);

    // Jedno zgłoszenie odrzucone ostatecznie nie liczy się do PENDING.
    const last = (await pending(t.id)).find((i) => i.entry.id === entries[3]!.id)!;
    await org.req('POST', `/v1/rejected-submissions/${last.id}/discard`);
    const items = await pending(t.id);
    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({
      judge: { id: jA.id, fullName: 'Katarzyna Nowak' },
      category: { id: c.id, name: 'Pole Sport Advanced' },
      reason: 'CATEGORY_LOCKED',
      resolution: 'PENDING',
    });
    const totals = items.map((i: any) => [i.entry.startNumber, i.payloadTotal]).sort();
    expect(totals).toEqual([
      [44, 54.25],
      [45, 53.25],
      [46, 52.25],
    ]);
    expect(items.every((i: any) => entries.some((e) => e.id === i.entry.id) && i.entry.fullName)).toBe(true);
    const all = (await org.req('GET', `/v1/tournaments/${t.id}/rejected-submissions`)).body.items;
    expect(all).toHaveLength(4);
    expect((await org.req('GET', `/v1/tournaments/${t.id}`)).body.pendingRejectedSubmissions).toBe(3);
    expect((await org.req('GET', `/v1/categories/${c.id}`)).body.pendingRejectedSubmissions).toBe(3);
    // Wyniki ostateczne bez zmian: wersja i suma kontrolna jak po blokadzie.
    const [now] = await handle.db.select().from(s.category).where(eq(s.category.id, c.id));
    expect([now!.status, now!.resultsVersion, now!.finalResultsHash]).toEqual([
      'LOCKED',
      cat!.resultsVersion,
      cat!.finalResultsHash,
    ]);
  });

  it('TC-API-097: przyjęcie przy LOCKED 409, po odblokowaniu 200, wycofany start 409, PIN_VERSION_OUTDATED 200', async () => {
    const { t, c, judges, entries, tablet } = await lockedWithRejected();
    const items = await pending(t.id);
    const byEntry = (id: string) => items.find((i) => i.entry.id === id)!;
    const locked = await org.req('POST', `/v1/rejected-submissions/${items[0]!.id}/accept`);
    expect([locked.status, locked.body.code]).toEqual([409, 'CATEGORY_LOCKED']);
    await unlock(c.id);
    const ok = await org.req('POST', `/v1/rejected-submissions/${byEntry(entries[0]!.id).id}/accept`);
    expect([ok.status, ok.body.resolution]).toEqual([200, 'ACCEPTED']);
    await org.req('POST', `/v1/entries/${entries[1]!.id}/withdraw`);
    const withdrawn = await org.req('POST', `/v1/rejected-submissions/${byEntry(entries[1]!.id).id}/accept`);
    expect([withdrawn.status, withdrawn.body.code]).toEqual([409, 'ENTRY_WITHDRAWN']);

    // Ocena z sesji offline ze starą wersją PIN-u – organizator może ją świadomie przyjąć (TL-13).
    const jB = judges[1]!;
    await org.req('POST', `/v1/judges/${jB.id}/pin/reset`);
    const started = mutation.sessionStarted(jB.id, 1);
    const sheet = mutation.submit({
      judgeId: jB.id,
      judgeSessionId: started.payload.judgeSessionId,
      authMode: 'OFFLINE_PIN',
      categoryId: c.id,
      entryId: entries[2]!.id,
      criteria: c.criteria,
    });
    expect(statuses(await push(call, tablet.token, [started, sheet]))).toEqual([
      'PIN_VERSION_OUTDATED',
      'PIN_VERSION_OUTDATED',
    ]);
    const outdated = (await pending(t.id)).find((i) => i.reason === 'PIN_VERSION_OUTDATED')!;
    const accepted = await org.req('POST', `/v1/rejected-submissions/${outdated.id}/accept`);
    expect([accepted.status, accepted.body.resolution]).toEqual([200, 'ACCEPTED']);
    const [stored] = await handle.db
      .select()
      .from(s.scoreSheet)
      .where(and(eq(s.scoreSheet.entryId, entries[2]!.id), eq(s.scoreSheet.judgeId, jB.id)));
    expect(stored!.authMode).toBe('OFFLINE_PIN');

    const current = await org.req('GET', `/v1/tournaments/${t.id}`);
    await org.req('POST', `/v1/tournaments/${t.id}/finish`, undefined, ifMatch(current.body.version));
    const remaining = (
      await org.req('GET', `/v1/tournaments/${t.id}/rejected-submissions?resolution=PENDING`)
    ).body.items[0];
    const finished = await org.req('POST', `/v1/rejected-submissions/${remaining.id}/accept`);
    expect([finished.status, finished.body.code]).toEqual([409, 'TOURNAMENT_FINISHED']);
  });

  it('TC-API-098 / TC-SYNC-008: przyjęcie tworzy rewizję organizatora, przelicza wyniki, trafia na tablet', async () => {
    const { t, c, entries, tablet, sheets } = await lockedWithRejected();
    const since = (await call('GET', '/v1/sync/snapshot', { token: tablet.token })).body.cursor as number;
    await unlock(c.id);
    const [cat] = await handle.db.select().from(s.category).where(eq(s.category.id, c.id));
    const target = (await pending(t.id)).find((i) => i.entry.id === entries[0]!.id)!;
    const res = await org.req('POST', `/v1/rejected-submissions/${target.id}/accept`);
    expect(res.status).toBe(200);
    expect(res.body.newerSheetExists).toBe(false);

    const scoreSheetId = sheets[0]!.payload.scoreSheetId;
    const [sheet] = await handle.db.select().from(s.scoreSheet).where(eq(s.scoreSheet.id, scoreSheetId));
    expect([sheet!.revision, sheet!.totalHundredths, sheet!.deviceId]).toEqual([1, 5425, tablet.deviceId]);
    const [rev] = await handle.db
      .select()
      .from(s.scoreSheetRevision)
      .where(eq(s.scoreSheetRevision.scoreSheetId, scoreSheetId));
    expect(rev!.actorType).toBe('ORGANIZER');
    const [audit] = await handle.db
      .select()
      .from(s.auditLog)
      .where(and(eq(s.auditLog.tournamentId, t.id), eq(s.auditLog.action, 'REJECTED_SUBMISSION_ACCEPTED')));
    expect(audit!.actorType).toBe('ORGANIZER');
    const [after] = await handle.db.select().from(s.category).where(eq(s.category.id, c.id));
    expect(after!.resultsVersion).toBeGreaterThan(cat!.resultsVersion);
    const audiences = await handle.db
      .select({ audience: s.changeLog.audience })
      .from(s.changeLog)
      .where(eq(s.changeLog.entityId, scoreSheetId));
    expect(audiences.map((a) => a.audience)).toContain(`DEVICE:${tablet.deviceId}`);

    // Tablet (token urządzenia) dostaje przyjęty arkusz ze swojego deviceId.
    const pulled = await call('GET', `/v1/sync/changes?since=${since}`, { token: tablet.token });
    const change = pulled.body.changes.find((ch: { entityType: string }) => ch.entityType === 'score_sheet');
    expect(change.entity).toMatchObject({
      id: scoreSheetId,
      revision: 1,
      total: 54.25,
      entryId: entries[0]!.id,
    });
  });

  it('TC-API-099: odrzucenie ostateczne, ponowna decyzja → 409', async () => {
    const { t } = await lockedWithRejected();
    const [item] = await pending(t.id);
    const discarded = await org.req('POST', `/v1/rejected-submissions/${item!.id}/discard`);
    expect([discarded.status, discarded.body.resolution]).toEqual([200, 'DISCARDED']);
    const again = await org.req('POST', `/v1/rejected-submissions/${item!.id}/discard`);
    expect([again.status, again.body.code]).toEqual([409, 'INVALID_STATE_TRANSITION']);
    const accept = await org.req('POST', `/v1/rejected-submissions/${item!.id}/accept`);
    expect([accept.status, accept.body.code]).toEqual([409, 'INVALID_STATE_TRANSITION']);
    const [audit] = await handle.db
      .select()
      .from(s.auditLog)
      .where(and(eq(s.auditLog.tournamentId, t.id), eq(s.auditLog.action, 'REJECTED_SUBMISSION_DISCARDED')));
    expect(audit).toBeDefined();
  });

  it('TC-EDGE-033: przyjęcie odrzuconego po nowszej ocenie sędziego → rev 3 i newerSheetExists', async () => {
    const { t, c, jA, entries, tablet, session } = await runningCategory(call, org);
    const base = {
      judgeId: jA.id,
      judgeSessionId: session.sessionId,
      categoryId: c.id,
      entryId: entries[0]!.id,
      criteria: c.criteria,
    };
    const first = mutation.submit({ ...base, notes: [6, 6, 6, 6, 6] });
    await push(call, tablet.token, [first]);
    await lock(c.id);
    const edit = { scoreSheetId: first.payload.scoreSheetId, baseRevision: 1 };
    expect(
      statuses(
        await push(call, tablet.token, [mutation.submit({ ...base, ...edit, notes: [9, 9, 9, 9, 9] })]),
      ),
    ).toEqual(['CATEGORY_LOCKED']);
    await unlock(c.id);
    expect(
      statuses(
        await push(call, tablet.token, [mutation.submit({ ...base, ...edit, notes: [7, 7, 7, 7, 7] })]),
      ),
    ).toEqual(['APPLIED']);
    const [item] = await pending(t.id);
    const res = await org.req('POST', `/v1/rejected-submissions/${item!.id}/accept`);
    expect([res.status, res.body.newerSheetExists]).toEqual([200, true]);
    const [sheet] = await handle.db
      .select()
      .from(s.scoreSheet)
      .where(eq(s.scoreSheet.id, first.payload.scoreSheetId));
    expect([sheet!.revision, sheet!.totalHundredths]).toEqual([3, 5850]);
  });

  it('TC-API-078: tablet widzi tylko arkusze ze swojego urządzenia, sędzia – własne', async () => {
    const {
      t,
      c,
      judges,
      jA,
      entries,
      tablet: tabletA,
      session: sessionA,
    } = await runningCategory(call, org);
    const jB = judges[1]!;
    const tabletB = await pairTablet(call, org, t.id, 'Tablet stół 2');
    const sessionBonB = await judgeLogin(call, tabletB.token, jB.id, jB.pin);
    const since = (await call('GET', '/v1/sync/snapshot', { token: tabletA.token })).body.cursor as number;
    const sheetA = mutation.submit({
      judgeId: jA.id,
      judgeSessionId: sessionA.sessionId,
      categoryId: c.id,
      entryId: entries[0]!.id,
      criteria: c.criteria,
    });
    const sheetB = mutation.submit({
      judgeId: jB.id,
      judgeSessionId: sessionBonB.sessionId,
      categoryId: c.id,
      entryId: entries[0]!.id,
      criteria: c.criteria,
    });
    await push(call, tabletA.token, [sheetA]);
    await push(call, tabletB.token, [sheetB]);
    // Ocena jB wystawiona na tablecie A (sesja z B) – odrzucona i przyjęta przez organizatora (TL-49).
    const sheetBonA = mutation.submit({
      judgeId: jB.id,
      judgeSessionId: sessionBonB.sessionId,
      categoryId: c.id,
      entryId: entries[1]!.id,
      criteria: c.criteria,
    });
    expect(statuses(await push(call, tabletA.token, [sheetBonA]))).toEqual(['JUDGE_SESSION_INVALID']);
    const [rejected] = await pending(t.id);
    expect((await org.req('POST', `/v1/rejected-submissions/${rejected!.id}/accept`)).status).toBe(200);

    const sheetIds = async (token: string) =>
      (await call('GET', `/v1/sync/changes?since=${since}`, { token })).body.changes
        .filter((ch: { entityType: string }) => ch.entityType === 'score_sheet')
        .map((ch: { entity: { id: string } }) => ch.entity.id)
        .sort();
    const fromA = [sheetA.payload.scoreSheetId, sheetBonA.payload.scoreSheetId].sort();
    expect(await sheetIds(tabletA.token)).toEqual(fromA);
    // Sędzia jA na A: własne arkusze i pochodzące z tego tabletu (jeden kursor urządzenia), nigdy arkusz jB z B.
    expect(await sheetIds(sessionA.judgeToken)).toEqual(fromA);
    expect(await sheetIds(tabletB.token)).toEqual([sheetB.payload.scoreSheetId]);
    expect(await sheetIds(sessionBonB.judgeToken)).toEqual(
      [sheetB.payload.scoreSheetId, sheetBonA.payload.scoreSheetId].sort(),
    );
  });

  it('TC-AUTHZ-050…052: tablet i sędzia 403, inny organizator 404', async () => {
    const { t, tablet, session } = await lockedWithRejected();
    const [item] = await pending(t.id);
    const other = organizer(call, (await registerAndLogin(call)).accessToken);
    for (const [method, url] of [
      ['GET', `/v1/tournaments/${t.id}/rejected-submissions`],
      ['POST', `/v1/rejected-submissions/${item!.id}/accept`],
      ['POST', `/v1/rejected-submissions/${item!.id}/discard`],
    ] as const) {
      expect((await call(method, url, { token: tablet.token })).status, url).toBe(403);
      expect((await call(method, url, { token: session.judgeToken })).status, url).toBe(403);
      expect((await other.req(method, url)).status, url).toBe(404);
    }
  });
});

import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { and, count, eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { uuidv7 } from '../../src/common/ids.js';
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
const NOTES_54_25 = [8.5, 8.5, 8, 8, 8.5];

const events = (tournamentId: string, type: string) =>
  handle.db
    .select()
    .from(s.domainEvent)
    .where(and(eq(s.domainEvent.tournamentId, tournamentId), eq(s.domainEvent.type, type)));
const audits = (tournamentId: string, action: string) =>
  handle.db
    .select()
    .from(s.auditLog)
    .where(and(eq(s.auditLog.tournamentId, tournamentId), eq(s.auditLog.action, action)));
const rejections = (tournamentId: string) =>
  handle.db.select().from(s.rejectedSubmission).where(eq(s.rejectedSubmission.tournamentId, tournamentId));
const statuses = (res: { body: Record<string, any> }) =>
  (res.body.results as { status: string; code?: string }[]).map((r) => r.code ?? r.status);

describe('sync/push: paczki i idempotencja (IMP-146)', () => {
  it('TC-API-080: paczka 101 mutacji → 413, żadna nie przetworzona', async () => {
    const { tablet, jA } = await runningCategory(call, org);
    const batch = Array.from({ length: 101 }, () => mutation.sessionStarted(jA.id));
    const res = await push(call, tablet.token, batch);
    expect([res.status, res.body.code]).toEqual([413, 'VALIDATION_FAILED']);
    const [n] = await handle.db
      .select({ n: count() })
      .from(s.processedMutation)
      .where(
        inArray(
          s.processedMutation.mutationId,
          batch.map((m) => m.mutationId),
        ),
      );
    expect(n!.n).toBe(0);
  });

  it('TC-API-082 / TC-API-083: ponowna wysyłka → DUPLICATE; ten sam mutationId z inną treścią → REJECTED', async () => {
    const { t, c, jA, entries, tablet, session } = await runningCategory(call, org);
    const m = mutation.submit({
      judgeId: jA.id,
      judgeSessionId: session.sessionId,
      categoryId: c.id,
      entryId: entries[1]!.id,
      criteria: c.criteria,
      notes: NOTES_54_25,
      clientTotal: 54.25,
    });
    const first = await push(call, tablet.token, [m]);
    expect(first.body.results[0]).toEqual({
      mutationId: m.mutationId,
      status: 'APPLIED',
      scoreSheetId: m.payload.scoreSheetId,
      revision: 1,
      serverTotal: 54.25,
    });
    const accepted = (await events(t.id, 'scoresheet.accepted')).length;

    const again = await push(call, tablet.token, [m]);
    expect(again.body.results[0]).toEqual({ ...first.body.results[0], status: 'DUPLICATE' });
    expect(await events(t.id, 'scoresheet.accepted')).toHaveLength(accepted);
    const revisions = await handle.db
      .select()
      .from(s.scoreSheetRevision)
      .where(eq(s.scoreSheetRevision.scoreSheetId, m.payload.scoreSheetId));
    expect(revisions).toHaveLength(1);

    const changed = {
      ...m,
      payload: {
        ...m.payload,
        criteria: [{ ...m.payload.criteria[0]!, value: 9 }, ...m.payload.criteria.slice(1)],
      },
    };
    const reused = await push(call, tablet.token, [changed]);
    expect(reused.body.results[0]).toEqual({
      mutationId: m.mutationId,
      status: 'REJECTED',
      code: 'IDEMPOTENCY_KEY_REUSED',
    });
    const [sheet] = await handle.db
      .select()
      .from(s.scoreSheet)
      .where(eq(s.scoreSheet.id, m.payload.scoreSheetId));
    expect([sheet!.revision, sheet!.totalHundredths]).toEqual([1, 5425]);
    expect(await rejections(t.id)).toHaveLength(0);
  });

  it('TC-SYNC-003: paczka przerwana po 50 mutacjach – ponowienie 50 × DUPLICATE i 50 × APPLIED', async () => {
    const { jA, tablet } = await runningCategory(call, org);
    const batch = Array.from({ length: 100 }, () => mutation.sessionStarted(jA.id));
    const half = await push(call, tablet.token, batch.slice(0, 50));
    expect(statuses(half)).toEqual(Array(50).fill('APPLIED'));
    const full = await push(call, tablet.token, batch);
    expect(statuses(full)).toEqual([...Array(50).fill('DUPLICATE'), ...Array(50).fill('APPLIED')]);
    const [n] = await handle.db
      .select({ n: count() })
      .from(s.judgeSession)
      .where(and(eq(s.judgeSession.deviceId, tablet.deviceId), eq(s.judgeSession.authMode, 'OFFLINE_PIN')));
    expect(n!.n).toBe(100);
    expect(typeof full.body.cursor).toBe('number');
  });

  it('blokada wiersza w środku paczki → wcześniejsze APPLIED zostają, od niej RETRY; ponowienie kończy paczkę', async () => {
    const { judges, jA, tablet } = await runningCategory(call, org);
    const jB = judges[1]!;
    const batch = [
      mutation.sessionStarted(jA.id),
      mutation.pinAttempts(jB.id, 1),
      mutation.sessionStarted(jA.id),
    ];
    const blocker = await handle.pool.connect();
    try {
      await blocker.query('BEGIN');
      await blocker.query('SELECT 1 FROM judge WHERE id = $1 FOR UPDATE', [jB.id]);
      const res = await push(call, tablet.token, batch);
      expect(res.status).toBe(200);
      expect(statuses(res)).toEqual(['APPLIED', 'RETRY', 'RETRY']);
    } finally {
      await blocker.query('ROLLBACK');
      blocker.release();
    }
    const retried = await push(call, tablet.token, batch);
    expect(statuses(retried)).toEqual(['DUPLICATE', 'APPLIED', 'APPLIED']);
    const [j] = await handle.db.select().from(s.judge).where(eq(s.judge.id, jB.id));
    expect(j!.failedPinCount).toBe(1);
  });

  it('TC-AUTHZ-061: tablet i sędzia ✔, organizator 403; walidacja treści → 422', async () => {
    const { jA, tablet, session } = await runningCategory(call, org);
    expect((await push(call, session.judgeToken, [mutation.sessionStarted(jA.id)])).status).toBe(200);
    const asOrg = await org.req('POST', '/v1/sync/push', {
      deviceTime: new Date().toISOString(),
      mutations: [mutation.sessionStarted(jA.id)],
    });
    expect(asOrg.status).toBe(403);
    const invalid = await push(call, tablet.token, [{ ...mutation.sessionStarted(jA.id), type: 'UNKNOWN' }]);
    expect([invalid.status, invalid.body.code]).toEqual([422, 'VALIDATION_FAILED']);
  });
});

describe('SUBMIT_SCORE_SHEET (IMP-147)', () => {
  it('TC-API-081: przyjęcie oceny, wynik serwera, przeliczenie, zdarzenia i audyt', async () => {
    const { t, c, jA, entries, tablet, session } = await runningCategory(call, org);
    const [before] = await handle.db.select().from(s.category).where(eq(s.category.id, c.id));
    const m = mutation.submit({
      judgeId: jA.id,
      judgeSessionId: session.sessionId,
      categoryId: c.id,
      entryId: entries[1]!.id,
      criteria: c.criteria,
      notes: NOTES_54_25,
      penalties: c.penaltyTypes.map((p) => ({ penaltyTypeId: p.id, count: 0 })),
      clientTotal: 60,
      comment: 'Ładna interpretacja muzyki.',
    });
    const res = await push(call, tablet.token, [m]);
    expect(res.body.results[0]).toMatchObject({ status: 'APPLIED', revision: 1, serverTotal: 54.25 });

    const [sheet] = await handle.db
      .select()
      .from(s.scoreSheet)
      .where(eq(s.scoreSheet.id, m.payload.scoreSheetId));
    expect(sheet).toMatchObject({
      totalHundredths: 5425,
      clientTotalHundredths: 6000,
      authMode: 'ONLINE_PIN',
      deviceId: tablet.deviceId,
      judgeSessionId: session.sessionId,
      lastMutationId: m.mutationId,
      comment: 'Ładna interpretacja muzyki.',
    });
    const [after] = await handle.db.select().from(s.category).where(eq(s.category.id, c.id));
    expect(after!.resultsVersion).toBe(before!.resultsVersion + 1);
    const [result] = await handle.db
      .select()
      .from(s.categoryResult)
      .where(and(eq(s.categoryResult.categoryId, c.id), eq(s.categoryResult.entryId, entries[1]!.id)));
    expect([result!.sheetCount, result!.sumHundredths]).toEqual([1, 5425]);
    expect((await events(t.id, 'scoresheet.accepted')).map((e) => e.payload)).toEqual([
      { categoryId: c.id, entryId: entries[1]!.id, judgeId: jA.id, revision: 1 },
    ]);
    expect((await events(t.id, 'results.updated')).at(-1)!.payload).toEqual({
      categoryId: c.id,
      resultsVersion: after!.resultsVersion,
    });
    expect((await events(t.id, 'progress.updated')).at(-1)!.payload).toMatchObject({
      categoryId: c.id,
      categoryDone: 1,
      categoryExpected: 6,
      done: 1,
      expected: 6,
    });
    const [submitted] = await audits(t.id, 'SCORE_SHEET_SUBMITTED');
    expect(submitted).toMatchObject({ actorType: 'JUDGE', actorId: jA.id, deviceId: tablet.deviceId });
    const [mismatch] = await audits(t.id, 'SCORE_TOTAL_MISMATCH');
    expect(mismatch!.after).toEqual({ clientTotalHundredths: 6000, serverTotalHundredths: 5425 });
    const [rev] = await handle.db
      .select()
      .from(s.scoreSheetRevision)
      .where(eq(s.scoreSheetRevision.scoreSheetId, m.payload.scoreSheetId));
    expect(rev).toMatchObject({
      revision: 1,
      actorType: 'JUDGE',
      mutationId: m.mutationId,
      deviceId: tablet.deviceId,
    });
    expect(rev!.snapshot).toMatchObject({ totalHundredths: 5425, comment: 'Ładna interpretacja muzyki.' });
    const log = await handle.db
      .select({ audience: s.changeLog.audience })
      .from(s.changeLog)
      .where(
        and(eq(s.changeLog.entityType, 'score_sheet'), eq(s.changeLog.entityId, m.payload.scoreSheetId)),
      );
    expect(log.map((l) => l.audience).sort()).toEqual([`DEVICE:${tablet.deviceId}`, `JUDGE:${jA.id}`]);
  });

  it('TC-API-084: aktualizacja arkusza (rev 2), potem nieaktualna rewizja → STALE_REVISION bez rejected_submission', async () => {
    const { t, c, jA, entries, tablet, session } = await runningCategory(call, org);
    const base = {
      judgeId: jA.id,
      judgeSessionId: session.sessionId,
      categoryId: c.id,
      entryId: entries[0]!.id,
      criteria: c.criteria,
    };
    const first = mutation.submit({ ...base, notes: [6, 6, 6, 6, 6] });
    const second = mutation.submit({
      ...base,
      scoreSheetId: first.payload.scoreSheetId,
      baseRevision: 1,
      notes: [7, 7, 7, 7, 7],
    });
    const res = await push(call, tablet.token, [first, second]);
    expect(res.body.results.map((r: { revision: number }) => r.revision)).toEqual([1, 2]);
    expect(res.body.results[1].serverTotal).toBe(45.5);
    const stale = mutation.submit({ ...base, scoreSheetId: first.payload.scoreSheetId, baseRevision: 1 });
    const otherId = mutation.submit({ ...base, baseRevision: 0 });
    expect(statuses(await push(call, tablet.token, [stale, otherId]))).toEqual([
      'STALE_REVISION',
      'STALE_REVISION',
    ]);
    expect(await rejections(t.id)).toHaveLength(0);
  });

  it('TC-API-085 / TC-INT-002: brak noty kryterium → SCHEMA_MISMATCH; brak licznika kary = 0', async () => {
    const { t, c, jA, entries, tablet, session } = await runningCategory(call, org);
    const base = {
      judgeId: jA.id,
      judgeSessionId: session.sessionId,
      categoryId: c.id,
      criteria: c.criteria,
    };
    const four = mutation.submit({ ...base, entryId: entries[0]!.id });
    four.payload.criteria = four.payload.criteria.slice(0, 4);
    const offStep = mutation.submit({ ...base, entryId: entries[0]!.id, notes: [7.25, 5, 5, 5, 5] });
    const unknownPenalty = mutation.submit({
      ...base,
      entryId: entries[0]!.id,
      penalties: [{ penaltyTypeId: uuidv7(), count: 1 }],
    });
    const noPenalties = mutation.submit({ ...base, entryId: entries[1]!.id });
    expect(statuses(await push(call, tablet.token, [four, offStep, unknownPenalty, noPenalties]))).toEqual([
      'SCHEMA_MISMATCH',
      'SCHEMA_MISMATCH',
      'SCHEMA_MISMATCH',
      'APPLIED',
    ]);
    const penalties = await handle.db
      .select()
      .from(s.scorePenalty)
      .where(eq(s.scorePenalty.scoreSheetId, noPenalties.payload.scoreSheetId));
    expect(penalties.map((p) => p.count)).toEqual(c.penaltyTypes.map(() => 0));
    expect(await rejections(t.id)).toHaveLength(0);
  });

  it('TC-INT-009: pole total w treści mutacji → 422 UNKNOWN_FIELD; wynik zawsze z silnika', async () => {
    const { c, jA, entries, tablet, session } = await runningCategory(call, org);
    const m = mutation.submit({
      judgeId: jA.id,
      judgeSessionId: session.sessionId,
      categoryId: c.id,
      entryId: entries[0]!.id,
      criteria: c.criteria,
    });
    const res = await push(call, tablet.token, [{ ...m, payload: { ...m.payload, total: 65 } }]);
    expect([res.status, res.body.code]).toEqual([422, 'VALIDATION_FAILED']);
    expect(res.body.errors).toContainEqual(expect.objectContaining({ code: 'UNKNOWN_FIELD' }));
  });

  it('TC-API-086: sesja innego tabletu i sesja niezgłoszona → JUDGE_SESSION_INVALID + rejected_submission', async () => {
    const { t, c, jA, entries, tablet, session } = await runningCategory(call, org);
    const tabletB = await pairTablet(call, org, t.id, 'Tablet stół 2');
    const base = { judgeId: jA.id, categoryId: c.id, criteria: c.criteria };
    const foreign = mutation.submit({ ...base, judgeSessionId: session.sessionId, entryId: entries[0]!.id });
    const unknown = mutation.submit({ ...base, judgeSessionId: uuidv7(), entryId: entries[1]!.id });
    expect(statuses(await push(call, tabletB.token, [foreign]))).toEqual(['JUDGE_SESSION_INVALID']);
    expect(statuses(await push(call, tablet.token, [unknown]))).toEqual(['JUDGE_SESSION_INVALID']);
    const rows = await rejections(t.id);
    expect(rows.map((r) => [r.reason, r.mutationId, r.deviceId]).sort()).toEqual(
      [
        ['JUDGE_SESSION_INVALID', foreign.mutationId, tabletB.deviceId],
        ['JUDGE_SESSION_INVALID', unknown.mutationId, tablet.deviceId],
      ].sort(),
    );
    expect(rows[0]!.payload).toMatchObject({ type: 'SUBMIT_SCORE_SHEET', payload: { categoryId: c.id } });
    expect(await events(t.id, 'rejected.created')).toHaveLength(2);
    expect(await audits(t.id, 'SCORE_SHEET_REJECTED')).toHaveLength(2);
  });

  it('TC-API-087: sesja offline ze starą wersją PIN-u → sesja i arkusz PIN_VERSION_OUTDATED', async () => {
    const { t, c, judges, entries, tablet } = await runningCategory(call, org);
    const jB = judges[1]!;
    await org.req('POST', `/v1/judges/${jB.id}/pin/reset`);
    const started = mutation.sessionStarted(jB.id, 1);
    const sheet = mutation.submit({
      judgeId: jB.id,
      judgeSessionId: started.payload.judgeSessionId,
      authMode: 'OFFLINE_PIN',
      categoryId: c.id,
      entryId: entries[0]!.id,
      criteria: c.criteria,
    });
    expect(statuses(await push(call, tablet.token, [started, sheet]))).toEqual([
      'PIN_VERSION_OUTDATED',
      'PIN_VERSION_OUTDATED',
    ]);
    expect((await rejections(t.id)).map((r) => r.reason)).toEqual(['PIN_VERSION_OUTDATED']);
  });

  it('TC-INT-001 / TC-SYNC-031 / TC-SYNC-032: warunki przyjęcia – każdy kod z wpisem rejected_submission', async () => {
    const { t, c, judges, jA, entries, tablet, session } = await runningCategory(call, org, {
      judges: ['Katarzyna Nowak', 'Ewa Zielińska', 'Iwona Lis'],
    });
    const [, jB, jC] = judges;
    const sessionB = await judgeLogin(call, tablet.token, jB!.id, jB!.pin);
    const sheet = (
      judgeId: string,
      judgeSessionId: string,
      entryId: string,
      categoryId = c.id,
      criteria = c.criteria,
    ) => mutation.submit({ judgeId, judgeSessionId, categoryId, entryId, criteria });

    // Kategoria nierozpoczęta (TC-SYNC-031).
    const draft = await org.category(t.id, { name: 'Pole Sport Beginner', level: 'BEGINNER' });
    const draftEntry = await org.entry(draft.id, 90);
    // Sędzia spoza panelu: dodany, gdy kategoria była zablokowana (TC-SYNC-032).
    await org.req('POST', `/v1/categories/${c.id}/lock`, { force: true });
    const jX = await org.judge(t.id, 'Monika Lis');
    await org.req('POST', `/v1/categories/${c.id}/unlock`, { reason: 'Protest trenerki' });
    const sessionX = await judgeLogin(call, tablet.token, jX.id, jX.pin);
    // Sędzia nieaktywny i wycofany start.
    await org.req('PATCH', `/v1/judges/${jC!.id}`, { isActive: false }, ifMatch(1));
    await org.req('POST', `/v1/entries/${entries[2]!.id}/withdraw`);
    const res = await push(call, tablet.token, [
      sheet(jA.id, session.sessionId, draftEntry.id, draft.id, draft.criteria),
      sheet(jX.id, sessionX.sessionId, entries[0]!.id),
      sheet(jC!.id, uuidv7(), entries[0]!.id),
      sheet(jA.id, session.sessionId, entries[2]!.id),
    ]);
    expect(statuses(res)).toEqual([
      'CATEGORY_NOT_STARTED',
      'JUDGE_NOT_IN_PANEL',
      'JUDGE_INACTIVE',
      'ENTRY_WITHDRAWN',
    ]);

    await org.req('POST', `/v1/categories/${c.id}/lock`, { force: true });
    expect(
      statuses(await push(call, tablet.token, [sheet(jB!.id, sessionB.sessionId, entries[0]!.id)])),
    ).toEqual(['CATEGORY_LOCKED']);
    const current = await org.req('GET', `/v1/tournaments/${t.id}`);
    await org.req('POST', `/v1/tournaments/${t.id}/finish`, undefined, ifMatch(current.body.version));
    expect(
      statuses(await push(call, tablet.token, [sheet(jB!.id, sessionB.sessionId, entries[1]!.id)])),
    ).toEqual(['TOURNAMENT_FINISHED']);
    expect((await rejections(t.id)).map((r) => r.reason).sort()).toEqual(
      [
        'CATEGORY_LOCKED',
        'CATEGORY_NOT_STARTED',
        'ENTRY_WITHDRAWN',
        'JUDGE_INACTIVE',
        'JUDGE_NOT_IN_PANEL',
        'TOURNAMENT_FINISHED',
      ].sort(),
    );
  });

  it('TC-AUDIT-003: zegar tabletu przesunięty o +6 min → ocena przyjęta, CLOCK_SKEW w audycie', async () => {
    const { t, c, jA, entries, tablet, session } = await runningCategory(call, org);
    const future = new Date(Date.now() + 6 * 60_000).toISOString();
    const m = mutation.submit({
      judgeId: jA.id,
      judgeSessionId: session.sessionId,
      categoryId: c.id,
      entryId: entries[0]!.id,
      criteria: c.criteria,
      createdAt: future,
    });
    expect(statuses(await push(call, tablet.token, [m], future))).toEqual(['APPLIED']);
    const [skew] = await audits(t.id, 'CLOCK_SKEW');
    expect((skew!.after as { skewSeconds: number }).skewSeconds).toBeGreaterThanOrEqual(355);
  });
});

describe('sesje offline i raporty prób PIN (IMP-148)', () => {
  it('sesja offline zgłoszona w paczce przed oceną, wylogowanie nie unieważnia ocen', async () => {
    const { c, judges, entries, tablet } = await runningCategory(call, org);
    const jB = judges[1]!;
    const started = mutation.sessionStarted(jB.id, 1);
    const base = {
      judgeId: jB.id,
      judgeSessionId: started.payload.judgeSessionId,
      authMode: 'OFFLINE_PIN' as const,
      categoryId: c.id,
      criteria: c.criteria,
    };
    const first = mutation.submit({ ...base, entryId: entries[0]!.id });
    const ended = mutation.sessionEnded(jB.id, started.payload.judgeSessionId);
    const second = mutation.submit({ ...base, entryId: entries[1]!.id });
    expect(statuses(await push(call, tablet.token, [started, first, ended, second]))).toEqual([
      'APPLIED',
      'APPLIED',
      'APPLIED',
      'APPLIED',
    ]);
    const [sessionRow] = await handle.db
      .select()
      .from(s.judgeSession)
      .where(eq(s.judgeSession.id, started.payload.judgeSessionId));
    expect(sessionRow).toMatchObject({
      authMode: 'OFFLINE_PIN',
      deviceId: tablet.deviceId,
      endedReason: 'LOGOUT',
    });
    const [sheet] = await handle.db
      .select()
      .from(s.scoreSheet)
      .where(eq(s.scoreSheet.id, first.payload.scoreSheetId));
    expect(sheet!.authMode).toBe('OFFLINE_PIN');
    const foreignEnd = mutation.sessionEnded(jB.id, uuidv7());
    expect(statuses(await push(call, tablet.token, [foreignEnd]))).toEqual(['JUDGE_SESSION_INVALID']);
  });

  it('TC-API-072: 7 błędów online + raport 3 offline → blokada, logowanie 423 requiresReset', async () => {
    const { t, judges, tablet } = await runningCategory(call, org);
    const jB = judges[1]!;
    const wrong = jB.pin === '8306' ? '8307' : '8306';
    for (let i = 0; i < 7; i++) {
      await call('POST', '/v1/judge-sessions', { token: tablet.token, body: { judgeId: jB.id, pin: wrong } });
    }
    const changedBefore = (await events(t.id, 'judges.changed')).length;
    expect(statuses(await push(call, tablet.token, [mutation.pinAttempts(jB.id, 3)]))).toEqual(['APPLIED']);
    const login = await call('POST', '/v1/judge-sessions', {
      token: tablet.token,
      body: { judgeId: jB.id, pin: jB.pin },
    });
    expect([login.status, login.body.code, login.body.requiresReset]).toEqual([423, 'PIN_LOCKED', true]);
    const list = await org.req('GET', `/v1/tournaments/${t.id}/judges`);
    expect(list.body.items.find((j: { id: string }) => j.id === jB.id).pinLocked).toBe(true);
    expect((await events(t.id, 'judges.changed')).length).toBe(changedBefore + 1);
    expect(await audits(t.id, 'PIN_ATTEMPTS_REPORTED')).toHaveLength(1);
  });

  it('TC-API-088: raport 4 prób dwukrotnie – duplikat nie zwiększa licznika, nowy zwiększa', async () => {
    const { judges, tablet } = await runningCategory(call, org);
    const jB = judges[1]!;
    const report = mutation.pinAttempts(jB.id, 4);
    await push(call, tablet.token, [report]);
    expect(statuses(await push(call, tablet.token, [report]))).toEqual(['DUPLICATE']);
    const counter = async () =>
      (await handle.db.select().from(s.judge).where(eq(s.judge.id, jB.id)))[0]!.failedPinCount;
    expect(await counter()).toBe(4);
    await push(call, tablet.token, [mutation.pinAttempts(jB.id, 4)]);
    expect(await counter()).toBe(8);
  });

  it('raporty 6 + 5 prób z dwóch tabletów → globalna blokada PIN-u', async () => {
    const { t, judges, tablet } = await runningCategory(call, org);
    const jB = judges[1]!;
    const tabletB = await pairTablet(call, org, t.id, 'Tablet stół 2');
    await push(call, tablet.token, [mutation.pinAttempts(jB.id, 6)]);
    const [mid] = await handle.db.select().from(s.judge).where(eq(s.judge.id, jB.id));
    expect(mid!.pinLockedAt).toBeNull();
    await push(call, tabletB.token, [mutation.pinAttempts(jB.id, 5)]);
    const [locked] = await handle.db.select().from(s.judge).where(eq(s.judge.id, jB.id));
    expect([locked!.failedPinCount, locked!.pinLockedAt]).toEqual([11, expect.any(Date)]);
    expect(await audits(t.id, 'JUDGE_PIN_LOCKED')).toHaveLength(1);
  });
});

import type { LocalDb } from '../../local/LocalDb';
import { SCHEMA_VERSION } from '../../local/migrations';
import { ScoreSheetRepo, upsertScoreSheet } from '../../local/scoreSheets';
import { syncEvents, type SyncEvent } from '../events';
import { readMeta, writeMeta } from '../meta';
import { pull } from '../pull';
import { applySnapshot } from '../snapshot';
import {
  fakeApi,
  json,
  judge,
  openTestDb,
  problemResponse,
  snapshotFixture,
  testClock,
  type Handler,
} from '../../../test-utils/sync';

type ChangeIn = { seq: number; entityType: string; op: 'U' | 'D'; entity: Record<string, unknown> };
const page = (changes: ChangeIn[], cursor: number, hasMore = false) => json({ changes, cursor, hasMore });

const category = (over: Record<string, unknown> = {}) => {
  const { criteria: _c, penaltyTypes: _p, entries: _e, ...c } = snapshotFixture().categories[0]!;
  return { ...c, lockedAt: null, ...over };
};

describe('pobieranie zmian (IMP-352)', () => {
  let local: LocalDb;
  let events: SyncEvent[];
  const clock = testClock();

  beforeEach(async () => {
    local = openTestDb();
    await applySnapshot(local, snapshotFixture(), clock);
    events = [];
    syncEvents.subscribe((e) => events.push(e));
  });
  afterEach(() => {
    local.close();
    syncEvents.reset();
  });

  const run = (handler: Handler) => {
    const fake = fakeApi(handler);
    return pull({ api: fake.api, local, clock }).then(() => fake.calls);
  };

  it('stronicuje do hasMore = false i zapisuje kursor po każdej stronie', async () => {
    const pages = [
      page(
        [
          {
            seq: 11,
            entityType: 'entry',
            op: 'U',
            entity: {
              id: 'e4',
              categoryId: 'c1',
              startNumber: 44,
              startOrder: 4,
              fullName: 'Nowa',
              club: null,
              status: 'ACTIVE',
            },
          },
        ],
        11,
        true,
      ),
      page(
        [
          {
            seq: 12,
            entityType: 'entry',
            op: 'U',
            entity: {
              id: 'e2',
              categoryId: 'c1',
              startNumber: 42,
              startOrder: 2,
              fullName: 'Zawodniczka 2',
              club: null,
              status: 'WITHDRAWN',
            },
          },
        ],
        15,
      ),
    ];
    const calls = await run(() => pages.shift()!);
    expect(calls.map((c) => c.path)).toEqual([
      '/v1/sync/changes?since=10&limit=500',
      '/v1/sync/changes?since=11&limit=500',
    ]);
    expect(readMeta(local.read)).toMatchObject({ cursor: 15, lastPullAt: '2026-10-26T10:00:00.000Z' });
    expect(local.read.getAllSync('SELECT id, status FROM local_entry ORDER BY start_order')).toEqual([
      { id: 'e1', status: 'ACTIVE' },
      { id: 'e2', status: 'WITHDRAWN' },
      { id: 'e3', status: 'ACTIVE' },
      { id: 'e4', status: 'ACTIVE' },
    ]);
    expect(events).toContainEqual({ type: 'startListChanged', categoryId: 'c1' });
  });

  it('błąd strony nie przesuwa kursora (transakcja wycofana)', async () => {
    await expect(
      run(() =>
        page(
          [
            {
              seq: 11,
              entityType: 'entry',
              op: 'U',
              entity: {
                id: 'e9',
                categoryId: 'nieznana',
                startNumber: 1,
                startOrder: 1,
                fullName: 'X',
                status: 'ACTIVE',
              },
            },
          ],
          11,
        ),
      ),
    ).rejects.toThrow(/FOREIGN KEY/);
    expect(readMeta(local.read).cursor).toBe(10);
  });

  it('TC-STATE-010: nowa pin_version kończy sesję OFFLINE_PIN, pin_locked blokuje profil', async () => {
    await local.tx((db) => {
      db.runSync(
        "INSERT INTO local_judge_session (id, judge_id, auth_mode, pin_version, started_at, last_activity_at) VALUES ('sB', 'jB', 'OFFLINE_PIN', 1, 'x', 'x')",
      );
      db.runSync("UPDATE local_judge SET failed_attempts = 2 WHERE id = 'jB'");
    });
    await run(() =>
      page([{ seq: 11, entityType: 'judge', op: 'U', entity: judge('jB', 2, { pinVersion: 2 }) }], 11),
    );
    expect(local.read.getFirstSync('SELECT end_reason FROM local_judge_session WHERE id = ?', 'sB')).toEqual({
      end_reason: 'PIN_CHANGED',
    });
    expect(
      local.read.getFirstSync('SELECT pin_version, failed_attempts FROM local_judge WHERE id = ?', 'jB'),
    ).toEqual({
      pin_version: 2,
      failed_attempts: 0,
    });
    expect(events).toContainEqual({ type: 'judgeSessionEnded', judgeId: 'jB', reason: 'PIN_CHANGED' });

    await run(() =>
      page(
        [
          {
            seq: 12,
            entityType: 'judge',
            op: 'U',
            entity: judge('jB', 2, { pinVersion: 2, pinLocked: true, pinVerifier: null }),
          },
        ],
        12,
      ),
    );
    expect(
      local.read.getFirstSync('SELECT pin_locked, wrapped_verifier FROM local_judge WHERE id = ?', 'jB'),
    ).toEqual({
      pin_locked: 1,
      wrapped_verifier: null,
    });
    expect(events).toContainEqual({ type: 'judgeLocked', judgeId: 'jB' });
  });

  it('TC-SYNC-016: CURSOR_EXPIRED → pełna migawka bez utraty outboxu i arkuszy', async () => {
    await local.tx((db) => {
      upsertScoreSheet(db, {
        id: 's1',
        categoryId: 'c1',
        entryId: 'e1',
        judgeId: 'jA',
        revision: 1,
        serverRevision: 0,
        syncState: 'PENDING',
        rejectCode: null,
        totalHundredths: 1700,
        serverTotalHundredths: null,
        comment: '',
        submittedAtLocal: 'x',
        values: [],
        penalties: [],
      });
      db.runSync(
        "INSERT INTO outbox (mutation_id, type, judge_id, payload, created_at, next_attempt_at, state) VALUES ('m1', 'SUBMIT_SCORE_SHEET', 'jA', '{}', 0, 0, 'QUEUED')",
      );
    });
    const finished = snapshotFixture({
      cursor: 99,
      tournament: { id: 't1', name: 'Puchar Polski', status: 'FINISHED', allowOfflinePinLogin: true },
    });
    const calls = await run((req) =>
      new URL(req.url).pathname === '/v1/sync/changes'
        ? problemResponse(410, 'CURSOR_EXPIRED')
        : json(finished),
    );
    expect(calls.map((c) => c.path)).toEqual(['/v1/sync/changes?since=10&limit=500', '/v1/sync/snapshot']);
    expect(readMeta(local.read)).toMatchObject({
      cursor: 99,
      tournamentFinishedAt: '2026-10-26T10:00:00.000Z',
    });
    expect(local.read.getFirstSync('SELECT COUNT(*) AS n FROM outbox')).toEqual({ n: 1 });
    expect(ScoreSheetRepo.forJudge(local.read, 'jA').list()).toHaveLength(1);
  });

  it('niezgodny schema_version → migawka zamiast zmian', async () => {
    await local.tx((db) => writeMeta(db, { schemaVersion: 1 }));
    const calls = await run(() => json(snapshotFixture({ cursor: 50 })));
    expect(calls.map((c) => c.path)).toEqual(['/v1/sync/snapshot']);
    expect(readMeta(local.read)).toMatchObject({ cursor: 50, schemaVersion: SCHEMA_VERSION });
  });

  it('TC-SYNC-029: odblokowanie kategorii zmienia lokalny status bez restartu', async () => {
    await local.tx((db) => db.runSync("UPDATE local_category SET status = 'LOCKED' WHERE id = 'c1'"));
    await run(() =>
      page([{ seq: 11, entityType: 'category', op: 'U', entity: category({ status: 'IN_PROGRESS' }) }], 11),
    );
    expect(local.read.getFirstSync('SELECT status FROM local_category WHERE id = ?', 'c1')).toEqual({
      status: 'IN_PROGRESS',
    });
    expect(events).toContainEqual({ type: 'categoryStatusChanged', categoryId: 'c1', status: 'IN_PROGRESS' });
    // Zmiana kategorii nie usuwa jej kryteriów i startów (upsert, nie REPLACE).
    expect(local.read.getFirstSync("SELECT COUNT(*) AS n FROM local_entry WHERE category_id = 'c1'")).toEqual(
      { n: 3 },
    );
  });

  it('TC-SYNC-038: sędzia dodany do panelu w trakcie widzi kategorię', async () => {
    await run(() =>
      page(
        [
          { seq: 11, entityType: 'judge', op: 'U', entity: judge('jD', 4) },
          {
            seq: 12,
            entityType: 'category',
            op: 'U',
            entity: category({ panelJudgeIds: ['jA', 'jB', 'jD'] }),
          },
        ],
        12,
      ),
    );
    const panel = local.read.getFirstSync<{ panel_judge_ids: string }>(
      "SELECT panel_judge_ids FROM local_category WHERE id = 'c1'",
    );
    expect(JSON.parse(panel!.panel_judge_ids)).toContain('jD');
    expect(ScoreSheetRepo.forJudge(local.read, 'jD').countScored('c1')).toBe(0);
    expect(events).toContainEqual({ type: 'judgesChanged' });
  });

  it('TC-EDGE-061: usunięta kategoria znika (op = D) bez błędów', async () => {
    await run(() => page([{ seq: 11, entityType: 'category', op: 'D', entity: { id: 'c2' } }], 11));
    expect(local.read.getAllSync('SELECT id FROM local_category')).toEqual([{ id: 'c1' }]);
    expect(
      local.read.getFirstSync("SELECT COUNT(*) AS n FROM local_criterion WHERE category_id = 'c2'"),
    ).toEqual({ n: 0 });
    expect(events).toContainEqual({ type: 'categoryStatusChanged', categoryId: 'c2', status: 'DELETED' });
  });

  it('arkusze z serwera (TL-49): SYNCED z rewizją serwera, lokalny PENDING zachowuje treść', async () => {
    const sheet = {
      id: 's1',
      scoreSheetId: 's1',
      judgeId: 'jA',
      categoryId: 'c1',
      entryId: 'e1',
      criteria: [{ criterionId: 'k1', value: 8.5 }],
      penalties: [{ penaltyTypeId: 'p1', count: 1 }],
      comment: 'ok',
      revision: 2,
      total: 17.25,
      authMode: 'ONLINE_PIN',
      updatedAt: '2026-10-26T09:00:00.000Z',
    };
    await run(() => page([{ seq: 11, entityType: 'score_sheet', op: 'U', entity: sheet }], 11));
    const synced = ScoreSheetRepo.forJudge(local.read, 'jA').byEntry('e1');
    expect(synced).toMatchObject({
      syncState: 'SYNCED',
      serverRevision: 2,
      serverTotalHundredths: 1725,
      values: [{ criterionId: 'k1', valueTenths: 85 }],
    });

    await local.tx((db) =>
      db.runSync("UPDATE local_score_sheet SET sync_state = 'PENDING', comment = 'lokalny' WHERE id = 's1'"),
    );
    await run(() =>
      page(
        [
          {
            seq: 12,
            entityType: 'score_sheet',
            op: 'U',
            entity: { ...sheet, revision: 3, comment: 'serwer' },
          },
        ],
        12,
      ),
    );
    expect(ScoreSheetRepo.forJudge(local.read, 'jA').byEntry('e1')).toMatchObject({
      syncState: 'PENDING',
      comment: 'lokalny',
      serverRevision: 3,
    });
    expect(events).toContainEqual({ type: 'sheetsChanged', judgeIds: ['jA'] });
  });
});

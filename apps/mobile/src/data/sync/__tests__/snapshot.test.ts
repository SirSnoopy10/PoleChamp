import { upsertScoreSheet } from '../../local/scoreSheets';
import type { LocalDb } from '../../local/LocalDb';
import { SCHEMA_VERSION } from '../../local/migrations';
import { syncEvents, type SyncEvent } from '../events';
import { readMeta } from '../meta';
import { syncSnapshot } from '../pull';
import { applySnapshot } from '../snapshot';
import {
  fakeApi,
  fxMaxSnapshot,
  json,
  judge,
  openTestDb,
  snapshotFixture,
  testClock,
} from '../../../test-utils/sync';

const count = (local: LocalDb, table: string) =>
  local.read.getFirstSync<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table}`)?.n;

describe('migawka (IMP-351)', () => {
  let local: LocalDb;
  const clock = testClock();
  beforeEach(() => {
    local = openTestDb();
  });
  afterEach(() => {
    local.close();
    syncEvents.reset();
  });

  it('pobiera migawkę i zapisuje dane referencyjne oraz sync_meta', async () => {
    const { api, calls } = fakeApi(() => json(snapshotFixture()));
    const events: SyncEvent[] = [];
    syncEvents.subscribe((e) => events.push(e));
    await syncSnapshot({ api, local, clock });

    expect(calls.map((c) => c.path)).toEqual(['/v1/sync/snapshot']);
    expect(count(local, 'local_category')).toBe(2);
    expect(count(local, 'local_criterion')).toBe(3);
    expect(count(local, 'local_entry')).toBe(3);
    expect(count(local, 'local_judge')).toBe(3);
    expect(
      local.read.getFirstSync('SELECT weight_tenths, step_tenths FROM local_criterion WHERE id = ?', 'k2'),
    ).toEqual({ weight_tenths: 15, step_tenths: 5 });
    expect(local.read.getFirstSync('SELECT panel_judge_ids FROM local_category WHERE id = ?', 'c1')).toEqual({
      panel_judge_ids: '["jA","jB"]',
    });
    expect(readMeta(local.read)).toMatchObject({
      tournamentId: 't1',
      cursor: 10,
      lastSyncServerTime: '2026-10-26T10:00:05.000Z',
      lastSyncMonotonicMs: 1000,
      serverTimeOffsetMs: 5000,
      schemaVersion: SCHEMA_VERSION,
      lastSyncBootId: 'boot-1',
      lastSyncWallMs: Date.parse('2026-10-26T10:00:00.000Z'),
    });
    expect(events).toContainEqual({ type: 'snapshotApplied' });
  });

  it('nie usuwa arkuszy, szkiców ani outboxu i zachowuje liczniki prób PIN', async () => {
    await applySnapshot(local, snapshotFixture(), clock);
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
        submittedAtLocal: '2026-10-26T10:01:00.000Z',
        values: [{ criterionId: 'k1', valueTenths: 85 }],
        penalties: [],
      });
      db.runSync(
        "INSERT INTO outbox (mutation_id, type, judge_id, payload, created_at, next_attempt_at, state) VALUES ('m1', 'SUBMIT_SCORE_SHEET', 'jA', '{}', 0, 0, 'QUEUED')",
      );
      db.runSync("INSERT INTO local_draft VALUES ('jA', 'e2', '{}', 'x')");
      db.runSync("UPDATE local_judge SET failed_attempts = 3, lock_level = 1 WHERE id = 'jB'");
    });

    // Druga migawka: c2 usunięta, jC usunięty.
    const next = snapshotFixture({ cursor: 20 });
    next.categories = next.categories.slice(0, 1);
    next.judges = [judge('jA', 1), judge('jB', 2)];
    await applySnapshot(local, next, clock);

    expect(count(local, 'local_score_sheet')).toBe(1);
    expect(count(local, 'local_score_value')).toBe(1);
    expect(count(local, 'outbox')).toBe(1);
    expect(count(local, 'local_draft')).toBe(1);
    expect(count(local, 'local_category')).toBe(1);
    expect(count(local, 'local_criterion')).toBe(2);
    expect(count(local, 'local_judge')).toBe(2);
    expect(
      local.read.getFirstSync('SELECT failed_attempts, lock_level FROM local_judge WHERE id = ?', 'jB'),
    ).toEqual({ failed_attempts: 3, lock_level: 1 });
    expect(readMeta(local.read).cursor).toBe(20);
  });

  it('błąd zapisu wycofuje całą migawkę', async () => {
    await applySnapshot(local, snapshotFixture(), clock);
    const broken = snapshotFixture({ cursor: 30 });
    broken.categories[0]!.entries.push({ ...broken.categories[0]!.entries[0]! });
    await expect(applySnapshot(local, broken, clock)).rejects.toThrow(/UNIQUE/);
    expect(readMeta(local.read).cursor).toBe(10);
    expect(count(local, 'local_category')).toBe(2);
  });

  it('TC-SYNC-036 / TC-PERF-008: migawka FX-MAX – rozmiar JSON i zapis ≤ 2 s', async () => {
    const snap = fxMaxSnapshot();
    const body = JSON.stringify(snap);
    expect(body.length).toBeLessThanOrEqual(1.5 * 1024 * 1024);
    const started = performance.now();
    await applySnapshot(local, snap, clock);
    const ms = performance.now() - started;
    expect(count(local, 'local_entry')).toBe(1500);
    expect(count(local, 'local_criterion')).toBe(720);
    expect(count(local, 'local_penalty_type')).toBe(600);
    expect(ms).toBeLessThan(2000);
  });
});

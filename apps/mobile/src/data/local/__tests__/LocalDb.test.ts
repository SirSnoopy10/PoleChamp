import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabaseSync } from 'expo-sqlite';
import { applyPragmas, LocalDb } from '../LocalDb';
import { MIGRATIONS, migrate } from '../migrations';
import { ScoreSheetRepo, upsertScoreSheet, type LocalScoreSheet } from '../scoreSheets';

const sheet = (over: Partial<LocalScoreSheet> = {}): LocalScoreSheet => ({
  id: 'sheet-1',
  categoryId: 'c1',
  entryId: 'e1',
  judgeId: 'jA',
  revision: 1,
  serverRevision: 0,
  syncState: 'PENDING',
  rejectCode: null,
  totalHundredths: 2450,
  serverTotalHundredths: null,
  comment: 'ok',
  submittedAtLocal: '2026-10-26T10:00:00.000Z',
  values: [{ criterionId: 'k1', valueTenths: 85 }],
  penalties: [{ penaltyTypeId: 'p1', count: 1 }],
  ...over,
});

describe('LocalDb (IMP-350)', () => {
  let local: LocalDb;
  beforeEach(() => {
    local = LocalDb.open('test.db');
  });
  afterEach(() => local.close());

  it('migracja od zera tworzy schemat danych offline', () => {
    const tables = local.read
      .getAllSync<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .map((t) => t.name);
    expect(tables).toEqual(
      expect.arrayContaining([
        'sync_meta',
        'local_tournament',
        'local_category',
        'local_criterion',
        'local_penalty_type',
        'local_entry',
        'local_judge',
        'local_judge_session',
        'local_score_sheet',
        'local_score_value',
        'local_score_penalty',
        'local_draft',
        'outbox',
      ]),
    );
    expect(local.read.getFirstSync<{ user_version: number }>('PRAGMA user_version')?.user_version).toBe(
      MIGRATIONS.length,
    );
    expect(migrate(local.db)).toBe(MIGRATIONS.length);
    expect(local.read.getFirstSync<{ cursor: number }>('SELECT cursor FROM sync_meta')?.cursor).toBe(0);
  });

  it('arkusz jest unikalny dla pary (start, sędzia)', async () => {
    await local.tx((db) => upsertScoreSheet(db, sheet()));
    await expect(local.tx((db) => upsertScoreSheet(db, sheet({ id: 'sheet-2' })))).rejects.toThrow(/UNIQUE/);
    await local.tx((db) => upsertScoreSheet(db, sheet({ id: 'sheet-3', judgeId: 'jB' })));
    expect(local.read.getFirstSync<{ n: number }>('SELECT COUNT(*) AS n FROM local_score_sheet')?.n).toBe(2);
  });

  it('wycofuje transakcję po błędzie i wykonuje transakcje kolejno', async () => {
    const order: string[] = [];
    const first = local.tx(async (db) => {
      upsertScoreSheet(db, sheet());
      await Promise.resolve();
      order.push('a');
    });
    const failing = local.tx(() => {
      order.push('b');
      throw new Error('boom');
    });
    await first;
    await expect(failing).rejects.toThrow('boom');
    expect(order).toEqual(['a', 'b']);
    expect(ScoreSheetRepo.forJudge(local.read, 'jA').list()).toHaveLength(1);
  });

  it('TC-STATE-008 / TC-SYNC-040: zapytania sędziego widzą tylko jego arkusze i szkice', async () => {
    await local.tx((db) => {
      upsertScoreSheet(db, sheet());
      upsertScoreSheet(db, sheet({ id: 'sheet-b', judgeId: 'jB', totalHundredths: 1000 }));
      ScoreSheetRepo.forJudge(db, 'jA').saveDraft('e2', { k1: 7 });
      ScoreSheetRepo.forJudge(db, 'jB').saveDraft('e2', { k1: 3 });
    });
    const jB = ScoreSheetRepo.forJudge(local.read, 'jB');
    expect(jB.list().map((s) => s.id)).toEqual(['sheet-b']);
    expect(jB.list('c1').map((s) => s.judgeId)).toEqual(['jB']);
    expect(jB.byEntry('e1')?.totalHundredths).toBe(1000);
    expect(jB.countScored('c1')).toBe(1);
    expect(jB.draft('e2')).toEqual({ k1: 3 });
    const jA = ScoreSheetRepo.forJudge(local.read, 'jA').byEntry('e1');
    expect(jA?.values).toEqual([{ criterionId: 'k1', valueTenths: 85 }]);
    expect(jA?.penalties).toEqual([{ penaltyTypeId: 'p1', count: 1 }]);
  });
});

describe('PRAGMA trwałości (TL-20)', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'pc-db-'));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('WAL, synchronous = FULL, foreign_keys; fullfsync tylko na iOS', () => {
    const db = openDatabaseSync('wal.db', undefined, dir);
    applyPragmas(db, 'ios');
    const pragma = (name: string) => Object.values(db.getFirstSync<object>(`PRAGMA ${name}`) ?? {})[0];
    expect(pragma('journal_mode')).toBe('wal');
    expect(pragma('synchronous')).toBe(2);
    expect(pragma('foreign_keys')).toBe(1);
    expect(pragma('fullfsync')).toBe(1);
    expect(pragma('checkpoint_fullfsync')).toBe(1);
    db.closeSync();

    const android = openDatabaseSync('android.db', undefined, dir);
    applyPragmas(android, 'android');
    expect(Object.values(android.getFirstSync<object>('PRAGMA fullfsync') ?? {})[0]).toBe(0);
    android.closeSync();
  });
});

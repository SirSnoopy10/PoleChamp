import { mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalDb } from '../../local/LocalDb';
import { ScoreSheetRepo } from '../../local/scoreSheets';
import { submitSheet, type SubmitSheetInput } from '../../sync/submit';
import { outbox, type NewMutation } from '../outbox';

const UUIDV7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const NOW = Date.parse('2026-10-26T10:00:00.000Z');
const SESSION = '0199c000-0000-7000-8000-000000000001';

const input = (over: Partial<SubmitSheetInput> = {}): SubmitSheetInput => ({
  judgeId: 'jA',
  judgeSessionId: '0199c000-0000-7000-8000-000000000001',
  authMode: 'OFFLINE_PIN',
  categoryId: 'c1',
  entryId: 'e1',
  criteria: [{ criterionId: 'k1', valueTenths: 85 }],
  penalties: [],
  comment: '',
  totalHundredths: 850,
  ...over,
});

const sessionEvent = (n: number): NewMutation => ({
  type: 'JUDGE_SESSION_ENDED',
  judgeId: 'jA',
  authMode: 'OFFLINE_PIN',
  payload: { judgeSessionId: `0199c000-0000-7000-8000-${String(n).padStart(12, '0')}` },
});

const states = (local: LocalDb) =>
  local.read.getAllSync<{ state: string }>('SELECT state FROM outbox ORDER BY seq').map((r) => r.state);

describe('outbox (IMP-353)', () => {
  let local: LocalDb;
  beforeEach(() => {
    local = LocalDb.open('test.db');
  });
  afterEach(() => {
    jest.restoreAllMocks();
    local.close();
  });

  it('TC-OUTBOX-001: arkusz i mutacja w jednej transakcji', async () => {
    jest.spyOn(outbox, 'enqueue').mockImplementationOnce(() => {
      throw new Error('awaria po zapisie arkusza');
    });
    await expect(submitSheet(local, input(), NOW)).rejects.toThrow('awaria');
    expect(ScoreSheetRepo.forJudge(local.read, 'jA').list()).toHaveLength(0);
    expect(states(local)).toEqual([]);

    const { mutationId, scoreSheetId } = await submitSheet(local, input(), NOW);
    expect(mutationId).toMatch(UUIDV7);
    expect(scoreSheetId).toMatch(UUIDV7);
    expect(ScoreSheetRepo.forJudge(local.read, 'jA').byEntry('e1')?.syncState).toBe('PENDING');
    expect(states(local)).toEqual(['QUEUED']);
    const [entry] = outbox.pending(local.read);
    expect(entry?.mutation).toMatchObject({
      mutationId,
      type: 'SUBMIT_SCORE_SHEET',
      createdAt: '2026-10-26T10:00:00.000Z',
      payload: {
        scoreSheetId,
        baseRevision: 0,
        criteria: [{ criterionId: 'k1', value: 8.5 }],
        clientTotal: 8.5,
      },
    });
  });

  it('TC-OUTBOX-002: FIFO i paczki ≤ 100', async () => {
    await local.tx((db) => {
      for (let i = 0; i < 250; i++) outbox.enqueue(db, sessionEvent(i), NOW);
    });
    const sizes: number[] = [];
    let lastSeq = 0;
    for (let i = 0; i < 3; i++) {
      const batch = await outbox.nextBatch(local, 100, NOW);
      sizes.push(batch.length);
      expect(batch.every((e) => e.state === 'IN_FLIGHT')).toBe(true);
      expect(batch[0]!.seq).toBeGreaterThan(lastSeq);
      expect(batch.map((e) => e.seq)).toEqual([...batch.map((e) => e.seq)].sort((a, b) => a - b));
      lastSeq = batch.at(-1)!.seq;
      await local.tx((db) => batch.forEach((e) => outbox.markDone(db, e.mutationId, NOW)));
    }
    expect(sizes).toEqual([100, 100, 50]);
    expect(await outbox.nextBatch(local, 100, NOW)).toEqual([]);
  });

  it('nextBatch pomija wpisy z next_attempt_at w przyszłości', async () => {
    await local.tx((db) => outbox.enqueue(db, sessionEvent(1), NOW));
    const [e] = await outbox.nextBatch(local, 100, NOW);
    await local.tx((db) => outbox.markRetry(db, e!.mutationId, 1, NOW + 1000, 'RETRY'));
    expect(await outbox.nextBatch(local, 100, NOW + 999)).toHaveLength(0);
    expect(await outbox.nextBatch(local, 100, NOW + 1000)).toHaveLength(1);
  });

  it('TC-OUTBOX-008: odtworzenie po starcie – IN_FLIGHT → QUEUED z tymi samymi mutationId', async () => {
    await local.tx((db) => {
      for (let i = 0; i < 5; i++) outbox.enqueue(db, sessionEvent(i), NOW);
    });
    const ids = (await outbox.nextBatch(local, 100, NOW)).map((e) => e.mutationId);
    expect(states(local)).toEqual(Array(5).fill('IN_FLIGHT'));
    expect(await outbox.recoverInFlight(local)).toBe(5);
    expect((await outbox.nextBatch(local, 100, NOW)).map((e) => e.mutationId)).toEqual(ids);
  });

  it('TC-OUTBOX-009: retencja DONE 24 h, FAILED_PERMANENT do zakończenia turnieju', async () => {
    const ids = await local.tx((db) => [1, 2, 3].map((i) => outbox.enqueue(db, sessionEvent(i), NOW)));
    await local.tx((db) => {
      outbox.markDone(db, ids[0]!, NOW - 25 * 3600_000);
      outbox.markDone(db, ids[1]!, NOW - 23 * 3600_000);
      outbox.markFailedPermanent(db, ids[2]!, 'CATEGORY_LOCKED');
    });
    expect(await outbox.cleanup(local, NOW)).toBe(1);
    expect(states(local)).toEqual(['DONE', 'FAILED_PERMANENT']);
    expect(outbox.countFailed(local.read)).toBe(1);
    expect(await outbox.cleanup(local, NOW, true)).toBe(1);
    expect(states(local)).toEqual(['DONE']);
  });

  it('TC-OUTBOX-013: 5 000 mutacji – zapis ≤ 100 ms, nextBatch ≤ 50 ms, baza ≤ 5 MB', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'pc-outbox-'));
    const file = LocalDb.open('outbox.db', dir);
    try {
      await file.tx((db) => {
        for (let i = 0; i < 5000; i++) {
          outbox.enqueue(
            db,
            {
              judgeId: 'jA',
              authMode: 'OFFLINE_PIN',
              type: 'SUBMIT_SCORE_SHEET',
              judgeSessionId: SESSION,
              payload: {
                scoreSheetId: `0199c000-0000-7000-8000-${String(i).padStart(12, '0')}`,
                categoryId: 'c1',
                entryId: `e${i}`,
                baseRevision: 0,
                // Typowy arkusz (5 kryteriów); 12 kryteriów × 5 000 to ~7 MB – poza budżetem NFR-301.
                criteria: Array.from({ length: 5 }, (_, k) => ({ criterionId: `c1_k${k}`, value: 8.5 })),
                penalties: [{ penaltyTypeId: 'p1', count: 1 }],
                comment: 'Komentarz sędziego do występu',
                clientTotal: 101.5,
              },
            } as NewMutation,
            NOW,
          );
        }
      });
      let started = performance.now();
      await submitSheet(file, input({ entryId: 'nowy' }), NOW);
      expect(performance.now() - started).toBeLessThan(100);
      started = performance.now();
      expect(await outbox.nextBatch(file, 100, NOW)).toHaveLength(100);
      expect(performance.now() - started).toBeLessThan(50);
      file.db.execSync('PRAGMA wal_checkpoint(TRUNCATE)');
      expect(statSync(join(dir, 'outbox.db')).size).toBeLessThanOrEqual(5 * 1024 * 1024);
    } finally {
      file.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('TC-OUTBOX-014: aktualizacja oceny po synchronizacji – nowa mutacja z baseRevision = 1', async () => {
    const first = await submitSheet(local, input(), NOW);
    await local.tx((db) => {
      outbox.markDone(db, first.mutationId!, NOW);
      db.runSync(
        "UPDATE local_score_sheet SET sync_state = 'SYNCED', server_revision = 1 WHERE id = ?",
        first.scoreSheetId,
      );
    });
    const second = await submitSheet(
      local,
      input({ criteria: [{ criterionId: 'k1', valueTenths: 90 }] }),
      NOW + 1,
    );
    expect(second.scoreSheetId).toBe(first.scoreSheetId);
    expect(second.mutationId).not.toBe(first.mutationId);
    const sheet = ScoreSheetRepo.forJudge(local.read, 'jA').byEntry('e1');
    expect(sheet).toMatchObject({ syncState: 'PENDING', revision: 2, serverRevision: 1 });
    const queued = outbox.pending(local.read);
    expect(queued).toHaveLength(1);
    expect(queued[0]!.mutation).toMatchObject({
      payload: { baseRevision: 1, scoreSheetId: first.scoreSheetId },
    });
  });

  it('TC-OUTBOX-015: ponowne zatwierdzenie przed wysyłką zastępuje mutację w miejscu', async () => {
    const first = await submitSheet(local, input(), NOW);
    await local.tx((db) => outbox.enqueue(db, sessionEvent(9), NOW));
    const second = await submitSheet(local, input({ comment: 'poprawka' }), NOW + 5);
    const pending = outbox.pending(local.read);
    expect(pending.map((e) => e.type)).toEqual(['SUBMIT_SCORE_SHEET', 'JUDGE_SESSION_ENDED']);
    expect(pending[0]!.mutationId).toBe(second.mutationId);
    expect(pending[0]!.mutationId).not.toBe(first.mutationId);
    expect(pending[0]!.mutation).toMatchObject({ payload: { comment: 'poprawka', baseRevision: 0 } });
    expect(local.read.getFirstSync('SELECT COUNT(*) AS n FROM local_score_sheet')).toEqual({ n: 1 });
  });

  it('mutacja IN_FLIGHT nie jest zastępowana; rebase ustawia baseRevision po przyjęciu', async () => {
    const first = await submitSheet(local, input(), NOW);
    await outbox.nextBatch(local, 100, NOW);
    const second = await submitSheet(local, input({ comment: 'po wysłaniu' }), NOW + 5);
    expect(outbox.pending(local.read).map((e) => e.mutationId)).toEqual([
      first.mutationId,
      second.mutationId,
    ]);
    await local.tx((db) => {
      outbox.markDone(db, first.mutationId!, NOW);
      outbox.rebase(db, first.scoreSheetId, 1);
    });
    expect(outbox.pending(local.read)[0]!.mutation).toMatchObject({ payload: { baseRevision: 1 } });
    expect(outbox.countPending(local.read)).toBe(1);
  });
});

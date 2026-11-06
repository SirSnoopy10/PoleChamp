import type { Mutation } from '@polechamp/contracts';
import { uuidv7 } from '../api/uuid';
import type { Db, LocalDb } from '../local/LocalDb';

export type OutboxState = 'QUEUED' | 'IN_FLIGHT' | 'DONE' | 'FAILED_PERMANENT';

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
/** Mutacja przed nadaniem `mutationId` i `createdAt` (nadaje `enqueue`). */
export type NewMutation = DistributiveOmit<Mutation, 'mutationId' | 'createdAt'>;

export interface OutboxEntry {
  seq: number;
  mutationId: string;
  type: Mutation['type'];
  judgeId: string;
  scoreSheetId: string | null;
  mutation: Mutation;
  createdAt: number;
  attempts: number;
  nextAttemptAt: number;
  lastError: string | null;
  state: OutboxState;
}

interface Row {
  seq: number;
  mutation_id: string;
  type: Mutation['type'];
  judge_id: string;
  score_sheet_id: string | null;
  payload: string;
  created_at: number;
  attempts: number;
  next_attempt_at: number;
  last_error: string | null;
  state: OutboxState;
}

const toEntry = (r: Row): OutboxEntry => ({
  seq: r.seq,
  mutationId: r.mutation_id,
  type: r.type,
  judgeId: r.judge_id,
  scoreSheetId: r.score_sheet_id,
  mutation: JSON.parse(r.payload) as Mutation,
  createdAt: r.created_at,
  attempts: r.attempts,
  nextAttemptAt: r.next_attempt_at,
  lastError: r.last_error,
  state: r.state,
});

export const OUTBOX_BATCH = 100;
/** Wpisy `DONE` usuwane po 24 h (06-offline §3.2 pkt 6). */
export const DONE_RETENTION_MS = 24 * 3600_000;
/** Próg ostrzeżenia „Wymaga uwagi” (IMP-354 krok 5). */
export const ATTENTION_ATTEMPTS = 20;

const sheetIdOf = (m: NewMutation) => (m.type === 'SUBMIT_SCORE_SHEET' ? m.payload.scoreSheetId : null);

/**
 * Trwała kolejka mutacji tabletu (IMP-353, FIFO po `seq`).
 *
 * Zasada ponownego zatwierdzenia przed wysyłką (TC-OUTBOX-015): niewysłana (`QUEUED`) mutacja
 * `SUBMIT_SCORE_SHEET` tego samego arkusza jest zastępowana **w miejscu** – nowy `mutation_id`
 * i treść, ta sama pozycja w kolejce (kolejność względem zdarzeń sesji zostaje), więc serwer dostaje
 * jedną rewizję. Mutacji `IN_FLIGHT` się nie rusza: nowa trafia na koniec kolejki, a po przyjęciu
 * poprzedniej `rebase` ustawia jej `baseRevision` na rewizję z odpowiedzi serwera.
 */
export const outbox = {
  /** Zawsze w transakcji wywołującego (razem z zapisem arkusza – TC-OUTBOX-001). Zwraca `mutationId`. */
  enqueue(db: Db, m: NewMutation, now = Date.now()): string {
    const mutationId = uuidv7(now);
    const mutation = { ...m, mutationId, createdAt: new Date(now).toISOString() } as Mutation;
    const sheetId = sheetIdOf(m);
    const queued =
      sheetId === null
        ? null
        : db.getFirstSync<{ seq: number }>(
            "SELECT seq FROM outbox WHERE score_sheet_id = ? AND state = 'QUEUED' ORDER BY seq DESC",
            sheetId,
          );
    if (queued) {
      db.runSync(
        `UPDATE outbox SET mutation_id = ?, payload = ?, created_at = ?, attempts = 0, next_attempt_at = ?,
           last_error = NULL WHERE seq = ?`,
        mutationId,
        JSON.stringify(mutation),
        now,
        now,
        queued.seq,
      );
      return mutationId;
    }
    db.runSync(
      `INSERT INTO outbox (mutation_id, type, judge_id, score_sheet_id, payload, created_at, attempts,
         next_attempt_at, state) VALUES (?, ?, ?, ?, ?, ?, 0, ?, 'QUEUED')`,
      mutationId,
      m.type,
      m.judgeId,
      sheetId,
      JSON.stringify(mutation),
      now,
      now,
    );
    return mutationId;
  },

  /** Do `limit` wpisów `QUEUED` gotowych do wysyłki (FIFO), oznaczonych `IN_FLIGHT` w tej samej transakcji. */
  nextBatch(local: LocalDb, limit = OUTBOX_BATCH, now = Date.now()): Promise<OutboxEntry[]> {
    return local.tx((db) => {
      const rows = db.getAllSync<Row>(
        "SELECT * FROM outbox WHERE state = 'QUEUED' AND next_attempt_at <= ? ORDER BY seq LIMIT ?",
        now,
        limit,
      );
      if (rows.length) {
        db.runSync(
          `UPDATE outbox SET state = 'IN_FLIGHT' WHERE seq IN (${rows.map(() => '?').join(', ')})`,
          rows.map((r) => r.seq),
        );
      }
      return rows.map((r) => ({ ...toEntry(r), state: 'IN_FLIGHT' as const }));
    });
  },

  markDone(db: Db, mutationId: string, now = Date.now()): void {
    db.runSync(
      "UPDATE outbox SET state = 'DONE', done_at = ?, last_error = NULL WHERE mutation_id = ?",
      now,
      mutationId,
    );
  },

  markRetry(db: Db, mutationId: string, attempts: number, nextAt: number, error: string): void {
    db.runSync(
      "UPDATE outbox SET state = 'QUEUED', attempts = ?, next_attempt_at = ?, last_error = ? WHERE mutation_id = ?",
      attempts,
      nextAt,
      error,
      mutationId,
    );
  },

  markFailedPermanent(db: Db, mutationId: string, code: string): void {
    db.runSync(
      "UPDATE outbox SET state = 'FAILED_PERMANENT', last_error = ? WHERE mutation_id = ?",
      code,
      mutationId,
    );
  },

  /** Arkusz przyjęty z rewizją `revision` → czekające mutacje tego arkusza dostają nowe `baseRevision`. */
  rebase(db: Db, scoreSheetId: string, revision: number): void {
    const rows = db.getAllSync<Row>(
      "SELECT * FROM outbox WHERE score_sheet_id = ? AND state = 'QUEUED'",
      scoreSheetId,
    );
    for (const r of rows) {
      const m = JSON.parse(r.payload) as Mutation;
      if (m.type !== 'SUBMIT_SCORE_SHEET' || m.payload.baseRevision >= revision) continue;
      m.payload.baseRevision = revision;
      db.runSync('UPDATE outbox SET payload = ? WHERE seq = ?', JSON.stringify(m), r.seq);
    }
  },

  /** Start aplikacji (TL-20): proces mógł zginąć w trakcie wysyłki – `IN_FLIGHT` wraca do `QUEUED`. */
  recoverInFlight(local: LocalDb): Promise<number> {
    return local.tx(
      (db) => db.runSync("UPDATE outbox SET state = 'QUEUED' WHERE state = 'IN_FLIGHT'").changes,
    );
  },

  /** Retencja: `DONE` > 24 h; `FAILED_PERMANENT` dopiero po zakończeniu turnieju. */
  cleanup(local: LocalDb, now = Date.now(), tournamentFinished = false): Promise<number> {
    return local.tx((db) => {
      let removed = db.runSync(
        "DELETE FROM outbox WHERE state = 'DONE' AND done_at < ?",
        now - DONE_RETENTION_MS,
      ).changes;
      if (tournamentFinished) {
        removed += db.runSync("DELETE FROM outbox WHERE state = 'FAILED_PERMANENT'").changes;
      }
      return removed;
    });
  },

  countPending(db: Db): number {
    return (
      db.getFirstSync<{ n: number }>(
        "SELECT COUNT(*) AS n FROM outbox WHERE state IN ('QUEUED', 'IN_FLIGHT')",
      )?.n ?? 0
    );
  },

  /**
   * Odrzucenia wymagające uwagi („Wymaga uwagi”). Wiersze `FAILED_PERMANENT` zostają do końca turnieju,
   * więc ocena rozwiązana później (organizator przyjął ją po odblokowaniu, sędzia ocenił ponownie)
   * nie może już podtrzymywać ostrzeżenia – liczymy tylko arkusze nadal w stanie `REJECTED`
   * (jak lista w popoverze) i odrzucone mutacje bez arkusza.
   */
  countFailed(db: Db): number {
    return (
      db.getFirstSync<{ n: number }>(
        `SELECT COUNT(*) AS n FROM outbox o
         WHERE o.state = 'FAILED_PERMANENT'
           AND (o.score_sheet_id IS NULL OR EXISTS (
             SELECT 1 FROM local_score_sheet s WHERE s.id = o.score_sheet_id AND s.sync_state = 'REJECTED'))`,
      )?.n ?? 0
    );
  },

  /** Najwięcej prób wśród niewysłanych (ostrzeżenie po 20 – TC-OUTBOX-010). */
  maxAttempts(db: Db): number {
    return (
      db.getFirstSync<{ n: number | null }>(
        "SELECT MAX(attempts) AS n FROM outbox WHERE state IN ('QUEUED', 'IN_FLIGHT')",
      )?.n ?? 0
    );
  },

  /** Niewysłane mutacje (ekran odłączonego urządzenia, eksport – 06-offline §7). */
  pending(db: Db): OutboxEntry[] {
    return db
      .getAllSync<Row>("SELECT * FROM outbox WHERE state IN ('QUEUED', 'IN_FLIGHT') ORDER BY seq")
      .map(toEntry);
  },
};

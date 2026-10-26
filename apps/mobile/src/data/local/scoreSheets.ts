import type { Db } from './LocalDb';

export type SheetSyncState = 'PENDING' | 'SYNCED' | 'REJECTED';

export interface LocalScoreSheet {
  id: string;
  categoryId: string;
  entryId: string;
  judgeId: string;
  revision: number;
  serverRevision: number;
  syncState: SheetSyncState;
  rejectCode: string | null;
  totalHundredths: number;
  serverTotalHundredths: number | null;
  comment: string;
  submittedAtLocal: string;
  values: { criterionId: string; valueTenths: number }[];
  penalties: { penaltyTypeId: string; count: number }[];
}

interface SheetRow {
  id: string;
  category_id: string;
  entry_id: string;
  judge_id: string;
  revision: number;
  server_revision: number;
  sync_state: SheetSyncState;
  reject_code: string | null;
  total_hundredths: number;
  server_total_hundredths: number | null;
  comment: string;
  submitted_at_local: string;
}

const COLUMNS =
  'id, category_id, entry_id, judge_id, revision, server_revision, sync_state, reject_code, ' +
  'total_hundredths, server_total_hundredths, comment, submitted_at_local';

function hydrate(db: Db, row: SheetRow): LocalScoreSheet {
  return {
    id: row.id,
    categoryId: row.category_id,
    entryId: row.entry_id,
    judgeId: row.judge_id,
    revision: row.revision,
    serverRevision: row.server_revision,
    syncState: row.sync_state,
    rejectCode: row.reject_code,
    totalHundredths: row.total_hundredths,
    serverTotalHundredths: row.server_total_hundredths,
    comment: row.comment,
    submittedAtLocal: row.submitted_at_local,
    values: db.getAllSync<{ criterionId: string; valueTenths: number }>(
      'SELECT criterion_id AS criterionId, value_tenths AS valueTenths FROM local_score_value ' +
        'WHERE score_sheet_id = ? ORDER BY criterion_id',
      row.id,
    ),
    penalties: db.getAllSync<{ penaltyTypeId: string; count: number }>(
      'SELECT penalty_type_id AS penaltyTypeId, count FROM local_score_penalty ' +
        'WHERE score_sheet_id = ? ORDER BY penalty_type_id',
      row.id,
    ),
  };
}

/** Zapis arkusza (wartości i kary zastępowane w całości) – wywołujący otwiera transakcję. */
export function upsertScoreSheet(db: Db, sheet: Omit<LocalScoreSheet, 'judgeId'> & { judgeId: string }) {
  db.runSync(
    `INSERT INTO local_score_sheet (${COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET revision = excluded.revision, server_revision = excluded.server_revision,
       sync_state = excluded.sync_state, reject_code = excluded.reject_code,
       total_hundredths = excluded.total_hundredths, server_total_hundredths = excluded.server_total_hundredths,
       comment = excluded.comment, submitted_at_local = excluded.submitted_at_local`,
    sheet.id,
    sheet.categoryId,
    sheet.entryId,
    sheet.judgeId,
    sheet.revision,
    sheet.serverRevision,
    sheet.syncState,
    sheet.rejectCode,
    sheet.totalHundredths,
    sheet.serverTotalHundredths,
    sheet.comment,
    sheet.submittedAtLocal,
  );
  db.runSync('DELETE FROM local_score_value WHERE score_sheet_id = ?', sheet.id);
  db.runSync('DELETE FROM local_score_penalty WHERE score_sheet_id = ?', sheet.id);
  for (const v of sheet.values) {
    db.runSync(
      'INSERT INTO local_score_value (score_sheet_id, criterion_id, value_tenths) VALUES (?, ?, ?)',
      sheet.id,
      v.criterionId,
      v.valueTenths,
    );
  }
  for (const p of sheet.penalties) {
    db.runSync(
      'INSERT INTO local_score_penalty (score_sheet_id, penalty_type_id, count) VALUES (?, ?, ?)',
      sheet.id,
      p.penaltyTypeId,
      p.count,
    );
  }
}

/**
 * Arkusze i szkice jednego sędziego (FR-610, TC-STATE-008): każde zapytanie ma warunek `judge_id`,
 * więc ekrany sędziego nie mają dostępu do ocen innych sędziów na wspólnym tablecie.
 */
export const ScoreSheetRepo = {
  forJudge(db: Db, judgeId: string) {
    return {
      list(categoryId?: string): LocalScoreSheet[] {
        const rows = categoryId
          ? db.getAllSync<SheetRow>(
              `SELECT ${COLUMNS} FROM local_score_sheet WHERE judge_id = ? AND category_id = ?`,
              judgeId,
              categoryId,
            )
          : db.getAllSync<SheetRow>(`SELECT ${COLUMNS} FROM local_score_sheet WHERE judge_id = ?`, judgeId);
        return rows.map((r) => hydrate(db, r));
      },
      byEntry(entryId: string): LocalScoreSheet | null {
        const row = db.getFirstSync<SheetRow>(
          `SELECT ${COLUMNS} FROM local_score_sheet WHERE judge_id = ? AND entry_id = ?`,
          judgeId,
          entryId,
        );
        return row ? hydrate(db, row) : null;
      },
      /** Postęp w kategorii: liczba ocenionych startów. */
      countScored(categoryId: string): number {
        return (
          db.getFirstSync<{ n: number }>(
            'SELECT COUNT(*) AS n FROM local_score_sheet WHERE judge_id = ? AND category_id = ?',
            judgeId,
            categoryId,
          )?.n ?? 0
        );
      },
      draft(entryId: string): unknown {
        const row = db.getFirstSync<{ payload: string }>(
          'SELECT payload FROM local_draft WHERE judge_id = ? AND entry_id = ?',
          judgeId,
          entryId,
        );
        return row ? (JSON.parse(row.payload) as unknown) : null;
      },
      saveDraft(entryId: string, payload: unknown, now = new Date()): void {
        db.runSync(
          `INSERT INTO local_draft (judge_id, entry_id, payload, updated_at) VALUES (?, ?, ?, ?)
           ON CONFLICT (judge_id, entry_id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`,
          judgeId,
          entryId,
          JSON.stringify(payload),
          now.toISOString(),
        );
      },
      deleteDraft(entryId: string): void {
        db.runSync('DELETE FROM local_draft WHERE judge_id = ? AND entry_id = ?', judgeId, entryId);
      },
    };
  },
};

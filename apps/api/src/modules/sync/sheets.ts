import { asc, inArray, type SQL } from 'drizzle-orm';
import { groupBy } from '../../common/group-by.js';
import type { Db, Tx } from '../../db/client.js';
import { scorePenalty, scoreSheet, scoreValue } from '../../db/schema.js';

type Conn = Db | Tx;

/** Arkusz w kształcie `JudgeScoreSheet` (03-api §4) – noty w punktach, wynik serwera. */
export interface SheetView {
  scoreSheetId: string;
  judgeId: string;
  categoryId: string;
  entryId: string;
  criteria: { criterionId: string; value: number }[];
  penalties: { penaltyTypeId: string; count: number }[];
  comment: string;
  revision: number;
  total: number;
  authMode: 'ONLINE_PIN' | 'OFFLINE_PIN';
  updatedAt: string;
}

/** Arkusze spełniające warunek, z notami i karami (dwa zapytania zbiorcze zamiast N+1). */
export async function loadSheets(conn: Conn, where: SQL | undefined): Promise<SheetView[]> {
  const sheets = await conn.select().from(scoreSheet).where(where).orderBy(asc(scoreSheet.submittedAt));
  if (!sheets.length) return [];
  const ids = sheets.map((s) => s.id);
  const [values, penalties] = await Promise.all([
    conn.select().from(scoreValue).where(inArray(scoreValue.scoreSheetId, ids)),
    conn.select().from(scorePenalty).where(inArray(scorePenalty.scoreSheetId, ids)),
  ]);
  const valuesBy = groupBy(values, (v) => v.scoreSheetId);
  const penaltiesBy = groupBy(penalties, (p) => p.scoreSheetId);
  return sheets.map((s) => ({
    scoreSheetId: s.id,
    judgeId: s.judgeId,
    categoryId: s.categoryId,
    entryId: s.entryId,
    criteria: (valuesBy.get(s.id) ?? []).map((v) => ({
      criterionId: v.criterionId,
      value: v.valueTenths / 10,
    })),
    penalties: (penaltiesBy.get(s.id) ?? []).map((p) => ({ penaltyTypeId: p.penaltyTypeId, count: p.count })),
    comment: s.comment,
    revision: s.revision,
    total: s.totalHundredths / 100,
    authMode: s.authMode,
    updatedAt: s.submittedAt.toISOString(),
  }));
}

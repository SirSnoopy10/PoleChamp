import { uuidv7 } from '../api/uuid';
import type { LocalDb } from '../local/LocalDb';
import { ScoreSheetRepo, upsertScoreSheet } from '../local/scoreSheets';
import { outbox } from '../outbox/outbox';

export interface SubmitSheetInput {
  judgeId: string;
  judgeSessionId: string;
  authMode: 'ONLINE_PIN' | 'OFFLINE_PIN';
  categoryId: string;
  entryId: string;
  criteria: { criterionId: string; valueTenths: number }[];
  penalties: { penaltyTypeId: string; count: number }[];
  comment: string;
  /** Wynik liczony lokalnie (`sheetTotal` z `@polechamp/scoring`) – podgląd i `clientTotal`. */
  totalHundredths: number;
}

const key = (
  criteria: SubmitSheetInput['criteria'],
  penalties: SubmitSheetInput['penalties'],
  comment: string,
) =>
  JSON.stringify([
    [...criteria]
      .sort((a, b) => a.criterionId.localeCompare(b.criterionId))
      .map((c) => [c.criterionId, c.valueTenths]),
    [...penalties]
      .sort((a, b) => a.penaltyTypeId.localeCompare(b.penaltyTypeId))
      .map((p) => [p.penaltyTypeId, p.count]),
    comment,
  ]);

/**
 * Zatwierdzenie oceny (TC-OUTBOX-001, 014): arkusz `PENDING` i mutacja w outboxie w jednej transakcji.
 * `scoreSheetId` jest stały dla pary (start, sędzia); `baseRevision` = ostatnia znana rewizja serwera.
 * Obietnica kończy się po `COMMIT` – dopiero wtedy toast „Zapisano ocenę…”. Ponowne zatwierdzenie tej samej
 * treści (np. podwójne tapnięcie – UX-02) nie tworzy mutacji: `mutationId = null`.
 */
export function submitSheet(local: LocalDb, input: SubmitSheetInput, now = Date.now()) {
  return local.tx((db) => {
    const repo = ScoreSheetRepo.forJudge(db, input.judgeId);
    const existing = repo.byEntry(input.entryId);
    if (
      existing &&
      existing.syncState !== 'REJECTED' &&
      key(existing.values, existing.penalties, existing.comment) ===
        key(input.criteria, input.penalties, input.comment)
    ) {
      repo.deleteDraft(input.entryId);
      return { scoreSheetId: existing.id, revision: existing.revision, mutationId: null };
    }
    const scoreSheetId = existing?.id ?? uuidv7(now);
    const revision = (existing?.revision ?? 0) + 1;
    const baseRevision = existing?.serverRevision ?? 0;
    upsertScoreSheet(db, {
      id: scoreSheetId,
      categoryId: input.categoryId,
      entryId: input.entryId,
      judgeId: input.judgeId,
      revision,
      serverRevision: baseRevision,
      syncState: 'PENDING',
      rejectCode: null,
      totalHundredths: input.totalHundredths,
      serverTotalHundredths: existing?.serverTotalHundredths ?? null,
      comment: input.comment,
      submittedAtLocal: new Date(now).toISOString(),
      values: input.criteria,
      penalties: input.penalties,
    });
    repo.deleteDraft(input.entryId);
    const mutationId = outbox.enqueue(
      db,
      {
        type: 'SUBMIT_SCORE_SHEET',
        judgeId: input.judgeId,
        authMode: input.authMode,
        judgeSessionId: input.judgeSessionId,
        payload: {
          scoreSheetId,
          categoryId: input.categoryId,
          entryId: input.entryId,
          baseRevision,
          criteria: input.criteria.map((c) => ({ criterionId: c.criterionId, value: c.valueTenths / 10 })),
          penalties: input.penalties,
          comment: input.comment,
          clientTotal: input.totalHundredths / 100,
        },
      },
      now,
    );
    return { scoreSheetId, revision, mutationId };
  });
}

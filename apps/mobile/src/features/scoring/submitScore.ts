import { sheetTotal, type CategoryConfig } from '@polechamp/scoring';
import type { JudgeRuntime } from '../../data/judge/runtime';
import type { ActiveJudge } from '../../data/judge/session';
import { syncEvents } from '../../data/sync/events';
import { submitSheet } from '../../data/sync/submit';
import { refreshFromDb } from '../../data/sync/syncStore';
import type { FormValues } from './model';

/**
 * Zatwierdzenie oceny (IMP-313, TC-OUTBOX-001): arkusz `PENDING` + `SUBMIT_SCORE_SHEET` w outboxie
 * + usunięcie szkicu w jednej transakcji (`submitSheet`). Obietnica kończy się po `COMMIT` – dopiero
 * wtedy toast; wysyłka w tle (bez czekania).
 */
export async function submitScore(
  rt: JudgeRuntime,
  judge: ActiveJudge,
  input: { categoryId: string; entryId: string; values: FormValues; config: CategoryConfig },
) {
  const { values, config } = input;
  const result = await submitSheet(
    rt.local,
    {
      judgeId: judge.judgeId,
      judgeSessionId: judge.sessionId,
      authMode: judge.authMode,
      categoryId: input.categoryId,
      entryId: input.entryId,
      criteria: config.criteria.map((c) => ({ criterionId: c.id, valueTenths: values.criteria[c.id] ?? 0 })),
      penalties: config.penaltyTypes.map((p) => ({
        penaltyTypeId: p.id,
        count: values.penalties[p.id] ?? 0,
      })),
      comment: values.comment.trim(),
      totalHundredths: sheetTotal(values, config).totalHundredths,
    },
    rt.clock.now(),
  );
  refreshFromDb(rt.local.read, judge.judgeId);
  syncEvents.emit([{ type: 'sheetsChanged', judgeIds: [judge.judgeId] }]);
  void rt.engine.push();
  return result;
}

import type { Db } from '../local/LocalDb';
import { ScoreSheetRepo } from '../local/scoreSheets';
import { endJudgeSessions } from './apply';
import { syncEvents, type JudgeSessionEndReason, type RejectionBanner, type SyncEvent } from './events';
import { syncSnapshot, type SyncDeps } from './pull';
import type { Rejection } from './push';

/** Reakcja tabletu na kod odrzucenia (06-offline §5, IMP-357). */
export interface RejectionPlan {
  /** Tekst banera / komunikatu: `errors:<CODE>`. */
  messageKey: string;
  banner: RejectionBanner;
  /** Zakończenie lokalnej sesji sędziego (powrót do wyboru profilu / PIN-u). */
  endSession: JudgeSessionEndReason | null;
  /** Pełna migawka i mapowanie szkicu po `criterion_id` (`SCHEMA_MISMATCH`). */
  snapshot: boolean;
}

const SESSION_END: Partial<Record<string, JudgeSessionEndReason>> = {
  PIN_VERSION_OUTDATED: 'PIN_VERSION_OUTDATED',
  JUDGE_SESSION_INVALID: 'JUDGE_SESSION_INVALID',
  JUDGE_INACTIVE: 'JUDGE_INACTIVE',
};

/** Kody pokazywane w banerze odrzuceń kolejki SCR-JDG-04 (TL-11). */
export const QUEUE_BANNER_CODES = ['CATEGORY_LOCKED', 'TOURNAMENT_FINISHED'] as const;

/**
 * Tabela kod → stan, baner i akcja sesji. Arkusz odrzucony zawsze ma `sync_state = REJECTED`
 * z `reject_code` (ikona `warning-circle` w kolejce); `STALE_REVISION` czeka na decyzję sędziego
 * („Pokaż aktualną” – IMP-316), `SCHEMA_MISMATCH` wraca do edycji.
 */
export function planRejection(code: string): RejectionPlan {
  const endSession = SESSION_END[code] ?? null;
  let banner: RejectionBanner = 'queue';
  if (endSession) banner = 'session';
  else if (code === 'STALE_REVISION' || code === 'SCHEMA_MISMATCH' || code === 'ENTRY_WITHDRAWN')
    banner = 'form';
  return { messageKey: `errors:${code}`, banner, endSession, snapshot: code === 'SCHEMA_MISMATCH' };
}

/** Szkic z odrzuconego arkusza – tylko kryteria i kary obecne w bieżącej konfiguracji kategorii. */
function remapDraft(db: Db, judgeId: string, entryId: string): boolean {
  const repo = ScoreSheetRepo.forJudge(db, judgeId);
  const sheet = repo.byEntry(entryId);
  if (!sheet) return false;
  const criteria = new Set(
    db
      .getAllSync<{ id: string }>('SELECT id FROM local_criterion WHERE category_id = ?', sheet.categoryId)
      .map((r) => r.id),
  );
  const penalties = new Set(
    db
      .getAllSync<{ id: string }>('SELECT id FROM local_penalty_type WHERE category_id = ?', sheet.categoryId)
      .map((r) => r.id),
  );
  repo.saveDraft(entryId, {
    criteria: Object.fromEntries(
      sheet.values.filter((v) => criteria.has(v.criterionId)).map((v) => [v.criterionId, v.valueTenths]),
    ),
    penalties: Object.fromEntries(
      sheet.penalties.filter((p) => penalties.has(p.penaltyTypeId)).map((p) => [p.penaltyTypeId, p.count]),
    ),
    comment: sheet.comment,
  });
  return true;
}

/** Zastosowanie odrzuceń z paczki push: sesje, migawka, szkice i zdarzenia dla ekranów. */
export async function handleRejections(
  deps: SyncDeps,
  rejections: readonly Rejection[],
): Promise<SyncEvent[]> {
  if (!rejections.length) return [];
  const plans = rejections.map((r) => ({ r, plan: planRejection(r.code) }));
  if (plans.some((p) => p.plan.snapshot)) await syncSnapshot(deps);
  const now = new Date(deps.clock.now()).toISOString();
  const events = await deps.local.tx((db) => {
    const out: SyncEvent[] = [];
    const ended = new Set<string>();
    for (const { r, plan } of plans) {
      out.push({
        type: 'rejected',
        judgeId: r.judgeId,
        entryId: r.entryId,
        categoryId: r.categoryId,
        code: r.code,
        messageKey: plan.messageKey,
        banner: plan.banner,
      });
      if (plan.endSession && !ended.has(r.judgeId)) {
        ended.add(r.judgeId);
        if (endJudgeSessions(db, r.judgeId, plan.endSession, now)) {
          out.push({ type: 'judgeSessionEnded', judgeId: r.judgeId, reason: plan.endSession });
        }
      }
      if (plan.snapshot && r.entryId && remapDraft(db, r.judgeId, r.entryId)) {
        out.push({ type: 'formOutdated', judgeId: r.judgeId, entryId: r.entryId });
      }
    }
    return out;
  });
  syncEvents.emit(events);
  return events;
}

/** Liczba ocen sędziego odrzuconych przez blokadę kategorii / zakończenie turnieju (baner SCR-JDG-04). */
export function countQueueRejections(db: Db, judgeId: string, categoryId?: string): number {
  const codes = QUEUE_BANNER_CODES.map(() => '?').join(', ');
  const params: unknown[] = [judgeId, ...QUEUE_BANNER_CODES];
  if (categoryId) params.push(categoryId);
  return (
    db.getFirstSync<{ n: number }>(
      `SELECT COUNT(*) AS n FROM local_score_sheet WHERE judge_id = ? AND sync_state = 'REJECTED'
       AND reject_code IN (${codes}) ${categoryId ? 'AND category_id = ?' : ''}`,
      params as never,
    )?.n ?? 0
  );
}

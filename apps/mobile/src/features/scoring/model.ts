import { defaultSheet, maxJudgeScore, type CategoryConfig } from '@polechamp/scoring';
import {
  readCategoryConfig,
  readEntry,
  type FormCriterion,
  type FormPenalty,
  type LocalEntry,
} from '../../data/judge/queries';
import type { Db } from '../../data/local/LocalDb';
import { ScoreSheetRepo, type LocalScoreSheet } from '../../data/local/scoreSheets';

/** Wartości formularza: noty w dziesiątych, liczniki kar, komentarz (jak `local_draft.payload`). */
export interface FormValues {
  criteria: Record<string, number>;
  penalties: Record<string, number>;
  comment: string;
}

export interface ScoreFormModel {
  entry: LocalEntry;
  criteria: FormCriterion[];
  penalties: FormPenalty[];
  config: CategoryConfig;
  /** Maksymalny wynik sędziego w setnych („/ 65,0”). */
  maxHundredths: number;
  sheet: LocalScoreSheet | null;
  initial: FormValues;
  source: 'draft' | 'sheet' | 'default';
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

/** Szkic z bazy – tylko liczby dla istniejących kryteriów / kar (konfiguracja mogła się zmienić). */
function draftValues(raw: unknown, base: FormValues, model: Pick<ScoreFormModel, 'criteria' | 'penalties'>) {
  if (!isRecord(raw)) return null;
  const criteria = { ...base.criteria };
  const penalties = { ...base.penalties };
  const c = isRecord(raw.criteria) ? raw.criteria : {};
  const p = isRecord(raw.penalties) ? raw.penalties : {};
  for (const k of model.criteria) {
    const v = c[k.id];
    if (typeof v === 'number' && v >= 0 && v <= k.scaleMax * 10 && v % 5 === 0) criteria[k.id] = v;
  }
  for (const k of model.penalties) {
    const v = p[k.id];
    if (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= k.maxOccurrences) penalties[k.id] = v;
  }
  const comment = typeof raw.comment === 'string' ? raw.comment.slice(0, 500) : base.comment;
  return { criteria, penalties, comment };
}

/**
 * Model formularza SCR-JDG-05 (IMP-309, IMP-315): konfiguracja kategorii (po `position`), arkusz
 * sędziego i szkic. Wartości początkowe: szkic → zapisana ocena → połowa skali (`defaultSheet`).
 */
export function readScoreFormModel(db: Db, judgeId: string, entryId: string): ScoreFormModel | null {
  const entry = readEntry(db, entryId);
  if (!entry) return null;
  const { criteria, penalties } = readCategoryConfig(db, entry.categoryId);
  const config: CategoryConfig = {
    criteria: criteria.map((c) => ({ id: c.id, scaleMax: c.scaleMax, weightTenths: c.weightTenths })),
    penaltyTypes: penalties.map((p) => ({
      id: p.id,
      pointsTenths: p.pointsTenths,
      maxOccurrences: p.maxOccurrences,
    })),
  };
  const repo = ScoreSheetRepo.forJudge(db, judgeId);
  const sheet = repo.byEntry(entryId);
  const defaults = defaultSheet(config);
  const fromSheet: FormValues | null = sheet
    ? {
        criteria: {
          ...defaults.criteria,
          ...Object.fromEntries(
            sheet.values
              .filter((v) => v.criterionId in defaults.criteria)
              .map((v) => [v.criterionId, v.valueTenths]),
          ),
        },
        penalties: {
          ...defaults.penalties,
          ...Object.fromEntries(
            sheet.penalties
              .filter((p) => p.penaltyTypeId in defaults.penalties)
              .map((p) => [p.penaltyTypeId, p.count]),
          ),
        },
        comment: sheet.comment,
      }
    : null;
  const base: FormValues = fromSheet ?? {
    criteria: { ...defaults.criteria },
    penalties: { ...defaults.penalties },
    comment: '',
  };
  const draft = draftValues(repo.draft(entryId), base, { criteria, penalties });
  return {
    entry,
    criteria,
    penalties,
    config,
    maxHundredths: maxJudgeScore(criteria),
    sheet,
    initial: draft ?? base,
    source: draft ? 'draft' : sheet ? 'sheet' : 'default',
  };
}

/**
 * Następna nieoceniona zawodniczka (TL-46): pierwszy aktywny start bez arkusza tego sędziego
 * (`PENDING`/`SYNCED`/`REJECTED` = oceniona; szkic nie jest oceną), od początku listy, bez bieżącej.
 */
export function nextUnscoredEntry(
  queue: readonly { id: string }[],
  scored: ReadonlySet<string>,
  currentId: string,
): string | null {
  return queue.find((e) => e.id !== currentId && !scored.has(e.id))?.id ?? null;
}

/** Etykieta przycisku zatwierdzenia (TC-STATE-002). */
export function submitLabelKey(hasSheet: boolean, othersUnscored: boolean, autoAdvance = true) {
  if (hasSheet) return 'judge:form.update' as const;
  if (othersUnscored && autoAdvance) return 'judge:form.submitNext' as const;
  return 'judge:form.submit' as const;
}

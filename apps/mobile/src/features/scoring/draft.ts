import type { LocalDb } from '../../data/local/LocalDb';
import { ScoreSheetRepo } from '../../data/local/scoreSheets';
import { formValues, type ScoreFormStore } from './formStore';
import type { FormValues } from './model';

/** Debounce zapisu szkicu (FR-611, TC-STATE-007). */
export const DRAFT_DEBOUNCE_MS = 300;

/**
 * Autozapis szkicu (IMP-315): `local_draft` per (sędzia, start) 300 ms po ostatniej zmianie;
 * `flush` – natychmiast (przejście w tło, zmiana zawodniczki, ponowny PIN). Zwraca funkcję sprzątającą.
 */
export function attachDraftAutosave(store: ScoreFormStore, local: LocalDb, judgeId: string, entryId: string) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: FormValues | null = null;
  const write = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    const values = pending;
    pending = null;
    if (!values) return Promise.resolve();
    return local.tx((db) => ScoreSheetRepo.forJudge(db, judgeId).saveDraft(entryId, values));
  };
  const unsubscribe = store.subscribe((s, prev) => {
    if (s.criteria === prev.criteria && s.penalties === prev.penalties && s.comment === prev.comment) return;
    pending = formValues(s);
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void write(), DRAFT_DEBOUNCE_MS);
  });
  return {
    flush: write,
    /** Zatwierdzenie usuwa szkic w swojej transakcji – oczekujący zapis nie może go odtworzyć. */
    cancel() {
      if (timer) clearTimeout(timer);
      timer = null;
      pending = null;
    },
    dispose() {
      unsubscribe();
      void write();
    },
  };
}

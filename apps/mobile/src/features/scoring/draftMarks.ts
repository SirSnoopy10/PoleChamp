import { createStore, useStore } from 'zustand';

/**
 * Znaczniki szkiców w kolejce (UX-14): stan z `local_draft` przy odczycie kolejki, a zmiany na bieżąco
 * z autozapisu i zatwierdzenia – bez zdarzeń `syncEvents`, które przeładowałyby otwarty formularz.
 */
const marks = createStore<{ keys: Record<string, boolean> }>(() => ({ keys: {} }));

const key = (judgeId: string, entryId: string) => `${judgeId}:${entryId}`;

export function markDraft(judgeId: string, entryId: string, present: boolean) {
  const k = key(judgeId, entryId);
  if (marks.getState().keys[k] === present) return;
  marks.setState((s) => ({ keys: { ...s.keys, [k]: present } }));
}

export const useHasDraft = (judgeId: string, entryId: string, fromDb: boolean) =>
  useStore(marks, (s) => s.keys[key(judgeId, entryId)] ?? fromDb);

export const resetDraftMarks = () => marks.setState({ keys: {} });

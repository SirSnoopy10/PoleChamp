import { createStore, useStore, type StoreApi } from 'zustand';
import type { FormValues } from './model';

export interface ScoreFormState extends FormValues {
  submitting: boolean;
  setCriterion: (id: string, tenths: number) => void;
  setPenalty: (id: string, count: number) => void;
  setComment: (comment: string) => void;
}

export type ScoreFormStore = StoreApi<ScoreFormState>;

/**
 * Stan jednego formularza (IMP-309 krok 6): Zustand per formularz – karty subskrybują swoje pole,
 * więc zmiana jednej noty nie renderuje pozostałych kart.
 */
export function createScoreFormStore(initial: FormValues): ScoreFormStore {
  return createStore<ScoreFormState>()((set) => ({
    ...initial,
    submitting: false,
    setCriterion: (id, tenths) =>
      set((s) => (s.criteria[id] === tenths ? s : { criteria: { ...s.criteria, [id]: tenths } })),
    setPenalty: (id, count) =>
      set((s) => (s.penalties[id] === count ? s : { penalties: { ...s.penalties, [id]: count } })),
    setComment: (comment) => set({ comment: comment.slice(0, 500) }),
  }));
}

export const useForm = <T>(store: ScoreFormStore, selector: (s: ScoreFormState) => T): T =>
  useStore(store, selector);

export const formValues = (s: FormValues): FormValues => ({
  criteria: s.criteria,
  penalties: s.penalties,
  comment: s.comment,
});

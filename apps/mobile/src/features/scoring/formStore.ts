import { createStore, useStore, type StoreApi } from 'zustand';
import type { FormValues } from './model';

export interface ScoreFormState extends FormValues {
  submitting: boolean;
  /** Kryteria z wartością domyślną, których sędzia nie ruszył (nowa ocena – UX-14). */
  untouched: Record<string, true>;
  setCriterion: (id: string, tenths: number) => void;
  setPenalty: (id: string, count: number) => void;
  setComment: (comment: string) => void;
}

export type ScoreFormStore = StoreApi<ScoreFormState>;

/**
 * Stan jednego formularza (IMP-309 krok 6): Zustand per formularz – karty subskrybują swoje pole,
 * więc zmiana jednej noty nie renderuje pozostałych kart.
 */
export function createScoreFormStore(initial: FormValues, untouched: readonly string[] = []): ScoreFormStore {
  return createStore<ScoreFormState>()((set) => ({
    ...initial,
    submitting: false,
    untouched: Object.fromEntries(untouched.map((id) => [id, true as const])),
    // Każda zmiana (także powrót do tej samej wartości suwakiem) zdejmuje oznaczenie „nieruszone”.
    setCriterion: (id, tenths) =>
      set((s) => {
        const touched = s.untouched[id] ? { untouched: withoutKey(s.untouched, id) } : {};
        return s.criteria[id] === tenths
          ? { ...s, ...touched }
          : { criteria: { ...s.criteria, [id]: tenths }, ...touched };
      }),
    setPenalty: (id, count) =>
      set((s) => (s.penalties[id] === count ? s : { penalties: { ...s.penalties, [id]: count } })),
    setComment: (comment) => set({ comment: comment.slice(0, 500) }),
  }));
}

const withoutKey = (record: Record<string, true>, key: string): Record<string, true> =>
  Object.fromEntries(Object.entries(record).filter(([k]) => k !== key)) as Record<string, true>;

export const useForm = <T>(store: ScoreFormStore, selector: (s: ScoreFormState) => T): T =>
  useStore(store, selector);

export const formValues = (s: FormValues): FormValues => ({
  criteria: s.criteria,
  penalties: s.penalties,
  comment: s.comment,
});

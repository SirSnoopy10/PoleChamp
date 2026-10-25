import { useCallback, useState, type ReactNode } from 'react';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useReducedMotion } from '../motion';

/** Czas podmiany treści „drugiego kroku” (09-design-system §4.9). */
export const SHEET_STEP_MS = 180;

/** Kroki w jednym arkuszu (np. formularz → potwierdzenie usunięcia, TC-UI-012). */
export function useSheetStep<S extends string>(initial: S) {
  const [step, setStep] = useState<S>(initial);
  const reset = useCallback(() => setStep(initial), [initial]);
  return { step, setStep, reset };
}

/** Kontener kroku: zmiana `stepKey` podmienia treść z przenikaniem 180 ms. */
export function SheetStep({ stepKey, children }: { stepKey: string; children: ReactNode }) {
  const reduced = useReducedMotion();
  const ms = reduced ? 0 : SHEET_STEP_MS;
  return (
    <Animated.View key={stepKey} entering={FadeIn.duration(ms)} exiting={FadeOut.duration(ms / 2)}>
      {children}
    </Animated.View>
  );
}

import { createContext, useContext, type RefObject } from 'react';
import type { TextInstance } from '../Text';

/** Dostęp treści arkusza do jego zamknięcia i tytułu (fokus czytnika po otwarciu). */
export const SheetContext = createContext<{
  close: () => void;
  titleRef: RefObject<TextInstance | null>;
} | null>(null);

export function useSheetContext() {
  const value = useContext(SheetContext);
  if (!value) throw new Error('Komponent arkusza użyty poza <Sheet>');
  return value;
}

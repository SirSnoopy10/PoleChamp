import { useReducedMotion as useSystemReducedMotion } from 'react-native-reanimated';
import { useThemeSettings } from './theme/ThemeProvider';

/** „Ogranicz ruch”: ustawienie systemowe albo przełącznik DevCatalog (NFR-207). */
export function useReducedMotion(): boolean {
  const system = useSystemReducedMotion();
  const { reducedMotion } = useThemeSettings();
  return reducedMotion ?? system;
}

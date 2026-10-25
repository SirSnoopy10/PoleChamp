import { useOnline } from './online';

/**
 * Zapisy organizatora dozwolone tylko online i w turnieju niezakończonym (IMP-215 krok 4, FR-807).
 * Przyciski zapisu dostają `disabled` (opacity 0,45).
 */
export function useCanWrite(tournamentStatus?: 'DRAFT' | 'IN_PROGRESS' | 'FINISHED'): boolean {
  const online = useOnline();
  return online && tournamentStatus !== 'FINISHED';
}

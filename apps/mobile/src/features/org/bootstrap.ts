import { useEffect, useState } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { tournamentsQuery } from '../../data/org/tournaments';
import type { SplashStage } from '../../ui/splash/SplashScreen';

type OrgStage = Extract<SplashStage, 'loadingTournaments' | 'syncingResults' | 'ready'>;

/**
 * Ładowanie danych pod splashem organizatora (IMP-254): turnieje aktywne → zakończone → gotowe.
 * Wygasły token odświeża middleware (`TOKEN_REUSED` → logowanie); błąd sieci kończy ładowanie
 * – lista pokaże cache MMKV z banerem offline. Limit 4,3 s pilnuje `SplashScreen`.
 */
export async function bootstrapOrg(
  queryClient: QueryClient,
  onStage: (stage: OrgStage) => void,
): Promise<void> {
  try {
    onStage('loadingTournaments');
    await queryClient.prefetchQuery(tournamentsQuery('active'));
    onStage('syncingResults');
    await queryClient.prefetchQuery(tournamentsQuery('finished'));
  } finally {
    onStage('ready');
  }
}

/** Etap splashu organizatora: bez sesji od razu „gotowe” (strażnik przejdzie do SCR-ORG-13). */
export function useOrgSplashStage(active: boolean, loggedIn: boolean): OrgStage {
  const queryClient = useQueryClient();
  const [stage, setStage] = useState<OrgStage>('loadingTournaments');
  useEffect(() => {
    if (!active) return;
    if (!loggedIn) return setStage('ready');
    let cancelled = false;
    void bootstrapOrg(queryClient, (next) => !cancelled && setStage(next));
    return () => {
      cancelled = true;
    };
    // Tylko przy starcie aplikacji – późniejsze logowanie nie pokazuje splashu ponownie (bez zależności).
  }, [active]);
  return stage;
}

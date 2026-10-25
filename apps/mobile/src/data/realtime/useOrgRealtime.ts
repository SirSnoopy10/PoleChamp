import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { env } from '../../config/env';
import { api } from '../api';
import { tokenStore } from '../api/tokens';
import { queryKeys } from '../query/keys';
import { bindOrgEvents } from './orgBindings';
import { createRealtimeClient, POLL_INTERVAL_MS, startPolling } from './socket';

/**
 * Realtime ekranów turnieju organizatora (IMP-216): zdarzenia → cache zapytań, a przy braku
 * WebSocket odpytywanie `GET /v1/tournaments/{id}` co 15 s.
 */
export function useOrgRealtime(tournamentId: string | undefined): void {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!tournamentId) return;
    let stopPolling: (() => void) | null = null;
    const refresh = () =>
      void queryClient.invalidateQueries({ queryKey: queryKeys.tournament(tournamentId) });
    const client = createRealtimeClient({
      url: env.wsUrl,
      tournamentId,
      getToken: () => tokenStore.current('org'),
      // Dowolne żądanie przez middleware odświeża token przy 401; `me` jest lekkie.
      refreshToken: async () => void (await api.GET('/v1/me')),
      onResync: refresh,
      onPollingChange: (polling) => {
        stopPolling?.();
        stopPolling = polling ? startPolling(POLL_INTERVAL_MS.org, refresh) : null;
      },
    });
    const unbind = bindOrgEvents(client.socket, queryClient, tournamentId);
    return () => {
      unbind();
      stopPolling?.();
      client.close();
    };
  }, [tournamentId, queryClient]);
}

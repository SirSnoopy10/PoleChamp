import { QueryClient, useQuery } from '@tanstack/react-query';
import { persistQueryClientRestore, persistQueryClientSave } from '@tanstack/react-query-persist-client';
import { Text } from 'react-native';
import { createMMKV } from 'react-native-mmkv';
import { act, renderWithProviders, screen } from '../../../test-utils/render';
import { Button } from '../../../ui/Button';
import { OfflineBanner } from '../../../ui/OfflineBanner';
import { ApiError } from '../../api/errors';
import { renderHook } from '@testing-library/react-native';
import { HTTP_ONLINE_WINDOW_MS, ONLINE_PROBE_MS, network, useOnlineProbe } from '../../network/online';
import { useCanWrite } from '../../network/useCanWrite';
import { queryKeys } from '../keys';
import { clearQueryCache, createMmkvPersister, createQueryClient, shouldRetry } from '../queryClient';

function SaveButton({ status }: { status?: 'IN_PROGRESS' | 'FINISHED' }) {
  const canWrite = useCanWrite(status);
  return <Button label="Zapisz" disabled={!canWrite} />;
}

// Klienci z `gcTime` 24 h trzymają timery – czyszczone po każdym teście, żeby Jest się zakończył.
const clients: QueryClient[] = [];
const newClient = () => {
  const c = createQueryClient();
  clients.push(c);
  return c;
};

describe('TanStack Query, cache MMKV i offline (IMP-215)', () => {
  afterEach(() => {
    network.reset();
    clients.splice(0).forEach((c) => c.clear());
    jest.useRealTimers();
  });

  it('online = WebSocket lub udane HTTP < 60 s (TL-45)', () => {
    jest.useFakeTimers();
    expect(network.isOnline()).toBe(false);
    network.reportHttpSuccess();
    expect(network.isOnline()).toBe(true);
    jest.advanceTimersByTime(HTTP_ONLINE_WINDOW_MS + 1);
    expect(network.isOnline()).toBe(false);
    network.setWsConnected(true);
    jest.advanceTimersByTime(HTTP_ONLINE_WINDOW_MS * 2);
    expect(network.isOnline()).toBe(true);
  });

  it('sonda bez WebSocketu podtrzymuje „online” na bezczynnym ekranie; brak odpowiedzi – offline', async () => {
    jest.useFakeTimers();
    let reachable = true;
    const probe = jest.fn(async () => {
      if (reachable) network.reportHttpSuccess();
      else network.reportHttpFailure();
    });
    const hook = await renderHook(() => useOnlineProbe(probe));
    network.reportHttpSuccess();
    for (let i = 0; i < 4; i++) await act(async () => jest.advanceTimersByTime(ONLINE_PROBE_MS));
    expect(probe).toHaveBeenCalledTimes(4);
    expect(network.isOnline()).toBe(true);
    reachable = false;
    await act(async () => jest.advanceTimersByTime(ONLINE_PROBE_MS));
    expect(network.isOnline()).toBe(false);
    network.setWsConnected(true);
    await act(async () => jest.advanceTimersByTime(ONLINE_PROBE_MS));
    expect(probe).toHaveBeenCalledTimes(5);
    await hook.unmount();
  });

  it('TC-STATE-011: offline – zapisy zablokowane, baner offline, odczyt z cache', async () => {
    const client = newClient();
    client.setQueryData<{ name: string }[]>(queryKeys.tournaments(), [{ name: 'Mistrzostwa Polski' }]);
    function Screen() {
      const { data } = useQuery<{ name: string }[]>({
        queryKey: queryKeys.tournaments(),
        queryFn: () => Promise.reject(new ApiError({ code: 'NETWORK', status: 0 })),
        staleTime: Infinity,
        retry: false,
      });
      return (
        <>
          <OfflineBanner />
          <Text>{data?.[0]?.name}</Text>
          <SaveButton status="IN_PROGRESS" />
        </>
      );
    }
    const { unmount } = await renderWithProviders(<Screen />, { queryClient: client });
    expect(
      screen.getByText('Brak połączenia – dane mogą być nieaktualne. Zmiany są niedostępne.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Mistrzostwa Polski')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Zapisz' })).toBeDisabled();
    await act(async () => network.setWsConnected(true));
    expect(screen.queryByTestId('offline-banner')).toBeNull();
    expect(screen.getByRole('button', { name: 'Zapisz' })).toBeEnabled();
    // Odmontowanie przed `clear()` – inaczej nieaktywne zapytanie planuje odśmiecanie za 24 h.
    await unmount();
  });

  it('turniej zakończony blokuje zapisy także online', async () => {
    network.setWsConnected(true);
    await renderWithProviders(<SaveButton status="FINISHED" />);
    expect(screen.getByRole('button', { name: 'Zapisz' })).toBeDisabled();
  });

  it('ponowienia: 2 dla błędów sieci/5xx, 0 dla 4xx', () => {
    expect(shouldRetry(0, new ApiError({ code: 'NETWORK', status: 0 }))).toBe(true);
    expect(shouldRetry(2, new ApiError({ code: 'INTERNAL', status: 500 }))).toBe(false);
    expect(shouldRetry(0, new ApiError({ code: 'NOT_FOUND', status: 404 }))).toBe(false);
  });

  it('cache odtwarzany po restarcie z MMKV i czyszczony przy wylogowaniu', async () => {
    const mmkv = createMMKV({ id: 'test-cache' });
    const persister = createMmkvPersister(mmkv);
    const before = newClient();
    before.setQueryData(queryKeys.me(), { displayName: 'Anna' });
    await persistQueryClientSave({ queryClient: before, persister });

    const after: QueryClient = newClient();
    await persistQueryClientRestore({ queryClient: after, persister });
    expect(after.getQueryData(queryKeys.me())).toEqual({ displayName: 'Anna' });

    await clearQueryCache(after, persister);
    expect(after.getQueryData(queryKeys.me())).toBeUndefined();
    const fresh = newClient();
    await persistQueryClientRestore({ queryClient: fresh, persister });
    expect(fresh.getQueryData(queryKeys.me())).toBeUndefined();
  });
});

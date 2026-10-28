import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { ApiError } from '../../api';
import { useEntryMutations } from '../entries';
import { confirmOnTimeout } from '../categories';
import { RejectedSheet } from '../../../features/rejected/RejectedSheet';
import { act, renderHook, renderWithProviders, screen } from '../../../test-utils/render';
import { API, setupOrgServer } from '../../../test-utils/org';
import type { RejectedSubmission } from '@polechamp/contracts';

const timeout = () => new ApiError({ code: 'TIMEOUT', status: 0 });

describe('IMP-703: spójny stan organizatora', () => {
  it('UX-04: limit czasu, a serwer zapisał zmianę → sukces; stan inny → pierwotny błąd', async () => {
    const run = () => Promise.reject(timeout());
    await expect(
      confirmOnTimeout(run, async () => ({ status: 'IN_PROGRESS' }), ['IN_PROGRESS']),
    ).resolves.toBeUndefined();
    await expect(
      confirmOnTimeout(run, async () => ({ status: 'LOCKED' }), ['IN_PROGRESS']),
    ).rejects.toMatchObject({ code: 'TIMEOUT' });
    const other = new ApiError({ code: 'INTERNAL', status: 500 });
    const check = jest.fn();
    await expect(confirmOnTimeout(() => Promise.reject(other), check, ['LOCKED'])).rejects.toBe(other);
    expect(check).not.toHaveBeenCalled();
  });

  it('UX-03: otwarcie arkusza odświeża dane; „Przyjmij” przy zablokowanej kategorii z powodem obok', async () => {
    const item = {
      id: 'r1',
      category: { id: 'c1', name: 'Pole Sport Junior' },
      entry: { id: 'e1', startNumber: 41, fullName: 'Zuzanna Król' },
      judge: { id: 'j1', fullName: 'Katarzyna Nowak' },
      reason: 'CATEGORY_LOCKED',
      payloadTotal: 54.25,
      receivedAt: '2026-10-28T10:00:00Z',
      newerSheetExists: false,
    } as unknown as RejectedSubmission;
    const onOpen = jest.fn();
    const props = {
      onClose: jest.fn(),
      items: [item],
      loading: false,
      canWrite: true,
      onAccept: jest.fn(),
      onDiscard: jest.fn(),
      onOpen,
    };
    const view = await renderWithProviders(
      <RejectedSheet {...props} visible lockedCategoryIds={new Set(['c1'])} />,
    );
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('rejected-accept-r1')).toBeDisabled();
    expect(screen.getByTestId('rejected-locked-r1')).toHaveTextContent(
      'Aby przyjąć, odblokuj kategorię „Pole Sport Junior”.',
    );
    await view.rerender(<RejectedSheet {...props} visible lockedCategoryIds={new Set()} />);
    expect(screen.getByTestId('rejected-accept-r1')).toBeEnabled();
    expect(screen.queryByTestId('rejected-locked-r1')).toBeNull();
    await view.unmount();
  });
});

describe('IMP-703: unieważnienia po zapisach', () => {
  const { server } = setupOrgServer();

  it('UX-10: dodanie zawodniczki odświeża turniej (licznik zawodniczek)', async () => {
    server.use(
      http.post(`${API}/v1/categories/c1/entries`, () => HttpResponse.json({ id: 'e9' }, { status: 201 })),
    );
    // Mutacje bez zegara gc (domyślnie 5 min) – inaczej Jest nie kończy procesu.
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false, gcTime: 0 } } });
    const spy = jest.spyOn(queryClient, 'invalidateQueries');
    const { result, unmount } = await renderHook(() => useEntryMutations('c1'), {
      wrapper: ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
    });
    await act(async () => {
      await result.current.create.mutateAsync({
        body: { fullName: 'Nowa Zawodniczka', startNumber: 9 } as never,
        idempotencyKey: '0190a000-0000-7000-8000-000000000009',
      });
    });
    expect(spy.mock.calls.map((c) => c[0]?.queryKey)).toContainEqual(['tournament']);
    await unmount();
    queryClient.clear();
  });
});

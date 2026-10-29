import { http, HttpResponse } from 'msw';
import type { DeviceRow, JudgeRow } from '@polechamp/contracts';
import OrgLayout from '../../../../app/(org)/_layout';
import JudgesRoute from '../../../../app/(org)/judges/[tournamentId]';
import { device, tournamentDetails } from '../../../test-utils/fixtures';
import { API, noContent, problem, setupOrgServer, startOrg } from '../../../test-utils/org';
import { act, fireEvent, screen, waitFor, within } from '../../../test-utils/render';
import { formatPairingCode, mmss } from '../../devices/PairTabletSheet';

jest.mock('../../../data/realtime/useOrgRealtime', () => ({ useOrgRealtime: () => undefined }));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(async () => true) }));
jest.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: jest.fn(async () => undefined),
  deactivateKeepAwake: jest.fn(async () => undefined),
}));

const { server, state } = setupOrgServer();
const routes = { '(org)/_layout': OrgLayout, '(org)/judges/[tournamentId]': JudgesRoute };

const judge = (id: string, over: Partial<JudgeRow> = {}): JudgeRow => ({
  id,
  fullName: id,
  initials: 'AN',
  isActive: true,
  pinLocked: false,
  sheetCount: 0,
  version: 1,
  ...over,
});

function mockLists(
  judges: JudgeRow[],
  devices: DeviceRow[],
  status: 'DRAFT' | 'IN_PROGRESS' = 'IN_PROGRESS',
) {
  const box = { judges, devices };
  server.use(
    http.get(`${API}/v1/tournaments/t2`, () => HttpResponse.json(tournamentDetails({ id: 't2', status }))),
    http.get(`${API}/v1/tournaments/t2/judges`, () => HttpResponse.json({ items: box.judges })),
    http.get(`${API}/v1/tournaments/t2/devices`, () => HttpResponse.json({ items: box.devices })),
  );
  return box;
}

describe('SCR-ORG-14 sędziowie i urządzenia (IMP-273)', () => {
  it('UX-27: stany sędziów: aktywny z ocenami, PIN zablokowany, nieaktywny; stan pusty urządzeń', async () => {
    mockLists(
      [
        judge('j1', { fullName: 'Anna Nowak', sheetCount: 12 }),
        judge('j2', { fullName: 'Ewa Lis', pinLocked: true }),
        judge('j3', { fullName: 'Jan Kowal', isActive: false }),
      ],
      [],
    );
    const r = await startOrg(routes, '/judges/t2', state);
    expect(await screen.findByText('Aktywny · 12 ocen')).toBeOnTheScreen();
    expect(screen.getByText('PIN zablokowany')).toBeOnTheScreen();
    expect(screen.getByText('Nieaktywny')).toBeOnTheScreen();
    // UX-27: zakładka liczy aktywnych sędziów – jak kafel „Sędziowie” na ekranie turnieju.
    expect(screen.getByTestId('segment-judges-count')).toHaveTextContent('2');
    await fireEvent.press(screen.getAllByText('Tablety')[0]!);
    expect(await screen.findByText('Brak sparowanych tabletów.')).toBeOnTheScreen();
    await r.unmount();
  });

  it('TC-E2E-ORG-031: „Offline od 5 min · 3 niewysłane oceny”, bateria, zalogowany sędzia', async () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000 - 1000).toISOString();
    mockLists(
      [],
      [
        device('d1', {
          name: 'Tablet stół 1',
          activeJudge: { id: 'j1', fullName: 'Anna Nowak' },
          batteryLevel: 0.82,
        }),
        device('d2', { name: 'Tablet stół 2', online: false, lastSeenAt: fiveMinAgo, pendingMutations: 3 }),
      ],
    );
    const r = await startOrg(routes, '/judges/t2?tab=devices', state);
    expect(await screen.findByText('Online · Anna Nowak')).toBeOnTheScreen();
    expect(screen.getByText('Offline od 5 min · 3 niewysłane oceny')).toBeOnTheScreen();
    expect(screen.getByText('82%')).toBeOnTheScreen();
    await r.unmount();
  });
});

describe('SCR-ORG-15 sędzia (IMP-274)', () => {
  it('TC-E2E-ORG-028: dodanie → PIN jednorazowo, „Kopiuj”; duplikat nazwiska pod polem', async () => {
    const box = mockLists([], []);
    let attempts = 0;
    server.use(
      http.post(`${API}/v1/tournaments/t2/judges`, async ({ request }) => {
        const { fullName } = (await request.json()) as { fullName: string };
        if (++attempts === 1) return problem(409, 'JUDGE_NAME_TAKEN');
        box.judges = [judge('j9', { fullName })];
        return HttpResponse.json(
          { id: 'j9', fullName, initials: 'KN', isActive: true, pin: '4821', pinShownOnce: true },
          { status: 201 },
        );
      }),
    );
    const r = await startOrg(routes, '/judges/t2', state);
    await fireEvent.press(await screen.findByText('Dodaj'));
    await fireEvent.changeText(screen.getByTestId('judge-name'), 'Katarzyna Nowak');
    await fireEvent.press(screen.getByTestId('judge-save'));
    expect(await screen.findByText('Sędzia o tym imieniu i nazwisku już istnieje.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('judge-save'));
    expect(await screen.findByText('PIN – Katarzyna Nowak')).toBeOnTheScreen();
    for (const d of ['4', '8', '2', '1']) expect(screen.getByText(d)).toBeOnTheScreen();
    expect(screen.getByText('Zapisz PIN – nie będzie można go ponownie wyświetlić.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('pin-copy'));
    expect(await screen.findByText('Skopiowano PIN')).toBeOnTheScreen();
    // UX-07: tło nie zamyka PIN-u bez pytania; „Pokaż PIN” wraca, „Gotowe” zamyka.
    await fireEvent.press(screen.getByTestId('judge-sheet-backdrop', { includeHiddenElements: true }));
    expect(await screen.findByText('Zapisałeś PIN?')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('judge-pin-show'));
    await fireEvent.press(await screen.findByTestId('pin-done'));
    await fireEvent.press(await screen.findByTestId('judge-j9'));
    expect(await screen.findByText('Edytuj sędziego')).toBeOnTheScreen();
    expect(screen.queryByText('4821')).toBeNull();
    expect(screen.queryByTestId('pin-step')).toBeNull();
    await r.unmount();
  });

  it('TC-E2E-ORG-029: reset PIN-u, dezaktywacja (If-Match), usunięcie z ocenami i bez', async () => {
    mockLists(
      [
        judge('j1', { fullName: 'Ewa Lis', pinLocked: true, sheetCount: 4, version: 3 }),
        judge('j2', { fullName: 'Jan Kowal' }),
      ],
      [],
    );
    const calls: string[] = [];
    server.use(
      http.post(`${API}/v1/judges/j1/pin/reset`, () => {
        calls.push('reset');
        return HttpResponse.json({
          id: 'j1',
          fullName: 'Ewa Lis',
          initials: 'EL',
          isActive: true,
          pin: '1357',
          pinShownOnce: true,
        });
      }),
      http.patch(`${API}/v1/judges/j1`, async ({ request }) => {
        calls.push(`patch ${request.headers.get('If-Match')} ${JSON.stringify(await request.json())}`);
        return HttpResponse.json(judge('j1'));
      }),
      http.delete(`${API}/v1/judges/j2`, () => {
        calls.push('delete');
        return noContent();
      }),
    );
    const r = await startOrg(routes, '/judges/t2', state);
    await fireEvent.press(await screen.findByTestId('judge-j1'));
    expect(screen.queryByTestId('judge-delete')).toBeNull();
    await fireEvent.press(screen.getByTestId('judge-reset'));
    expect(await screen.findByText('Sędzia zostanie wylogowany ze wszystkich tabletów.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('judge-reset-confirm'));
    expect(await screen.findByText('PIN – Ewa Lis')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('pin-done'));

    await fireEvent.press(await screen.findByTestId('judge-j1'));
    await fireEvent.press(await screen.findByTestId('judge-toggle'));
    // UX-16: dezaktywacja z potwierdzeniem skutków i własnym toastem.
    expect(await screen.findByText('Dezaktywować sędziego: Ewa Lis?')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('judge-deactivate-confirm'));
    expect(await screen.findByText('Dezaktywowano sędziego')).toBeOnTheScreen();

    await fireEvent.press(await screen.findByTestId('judge-j2'));
    await fireEvent.press(await screen.findByTestId('judge-delete'));
    await fireEvent.press(await screen.findByTestId('judge-delete-confirm'));
    expect(await screen.findByText('Usunięto sędziego')).toBeOnTheScreen();
    expect(calls).toEqual(['reset', 'patch W/"3" {"isActive":false}', 'delete']);
    await r.unmount();
  });
});

describe('SCR-ORG-16 parowanie i akcje urządzenia (IMP-275, IMP-276)', () => {
  it('formatowanie kodu i odliczania', () => {
    expect(formatPairingCode('K7QM4ZTX')).toBe('K7QM-4ZTX');
    expect(mmss(125)).toBe('02:05');
  });

  it('TC-E2E-ORG-030: QR + kod + odliczanie; nowy tablet w „Sparowane teraz”; zmiana nazwy; odłączenie', async () => {
    const box = mockLists([], [device('d1', { name: 'Tablet stół 1' })]);
    const calls: string[] = [];
    server.use(
      http.post(`${API}/v1/tournaments/t2/pairing-codes`, () =>
        HttpResponse.json(
          {
            code: 'K7QM4ZTX',
            qrPayload: 'polechamp://pair?c=K7QM4ZTX&t=t2',
            expiresAt: new Date(Date.now() + 120_000).toISOString(),
          },
          { status: 201 },
        ),
      ),
      http.patch(`${API}/v1/devices/d1`, async ({ request }) => {
        calls.push(`rename ${JSON.stringify(await request.json())}`);
        return HttpResponse.json(device('d1'));
      }),
      http.delete(`${API}/v1/devices/d2`, () => {
        calls.push('revoke');
        return noContent();
      }),
    );
    const r = await startOrg(routes, '/judges/t2?tab=devices', state);
    await fireEvent.press(await screen.findByTestId('pair-tablet'));
    expect(await screen.findByText('K7QM-4ZTX')).toBeOnTheScreen();
    expect(screen.getByText(/^Kod ważny jeszcze 0[12]:\d\d$/)).toBeOnTheScreen();
    expect(screen.getByTestId('pair-new-code')).toBeDisabled();

    // `device.paired` → odświeżenie listy urządzeń (tu: ręczne unieważnienie jak w orgBindings).
    box.devices = [...box.devices, device('d2', { name: 'Tablet stół 2', pendingMutations: 2 })];
    await act(async () => state.queryClient.invalidateQueries({ queryKey: ['devices', 't2'] }));
    expect(
      await within(await screen.findByTestId('paired-now')).findByText('Tablet stół 2'),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('pair-done'));

    await fireEvent.press(await screen.findByTestId('device-d1'));
    await fireEvent.press(await screen.findByTestId('device-rename'));
    await fireEvent.changeText(screen.getByTestId('device-name'), 'Stół sędziowski A');
    await fireEvent.press(screen.getByTestId('device-name-save'));
    expect(await screen.findByText('Zapisano zmiany')).toBeOnTheScreen();

    await fireEvent.press(await screen.findByTestId('device-d2'));
    await fireEvent.press(await screen.findByTestId('device-revoke'));
    expect(await screen.findByText('Niewysłane oceny (2) nie dotrą do systemu.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('device-revoke-confirm'));
    expect(await screen.findByText('Odłączono tablet')).toBeOnTheScreen();
    await waitFor(() => expect(calls).toEqual(['rename {"name":"Stół sędziowski A"}', 'revoke']));
    await r.unmount();
  });
});

import { http, HttpResponse } from 'msw';
import OrgLayout from '../../../../app/(org)/_layout';
import AccountRoute from '../../../../app/(org)/account';
import CategoryRoute from '../../../../app/(org)/c/[categoryId]';
import TournamentsRoute from '../../../../app/(org)/index';
import LoginRoute from '../../../../app/(org)/login';
import TournamentRoute from '../../../../app/(org)/t/[tournamentId]';
import { tokenStore } from '../../../data/api/tokens';
import { network } from '../../../data/network/online';
import { categoryDetails, tournamentDetails } from '../../../test-utils/fixtures';
import { API, noContent, problem, setupOrgServer, startOrg } from '../../../test-utils/org';
import { matchesWord } from '../AccountScreen';
import { readStoredMode } from '../../../mode/mode';
import { act, fireEvent, screen, waitFor } from '../../../test-utils/render';

jest.mock('../../../data/realtime/useOrgRealtime', () => ({ useOrgRealtime: () => undefined }));
jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn(async () => ({ type: 'opened' })) }));

const { server, state } = setupOrgServer();
const routes = {
  '(org)/_layout': OrgLayout,
  '(org)/index': TournamentsRoute,
  '(org)/login': LoginRoute,
  '(org)/account': AccountRoute,
  '(org)/t/[tournamentId]': TournamentRoute,
  '(org)/c/[categoryId]': CategoryRoute,
};

const config = {
  minAppVersion: '1.0.0',
  minSyncAppVersion: '1.0.0',
  termsVersion: '2026-09',
  legal: {
    termsUrl: 'https://polechamp.app/regulamin/v1',
    privacyUrl: 'https://polechamp.app/prywatnosc/v1',
    dpaUrl: 'https://polechamp.app/umowa-powierzenia/v1',
    accountDeletionUrl: 'https://polechamp.app/usuniecie-konta',
    supportUrl: 'https://polechamp.app/pomoc',
  },
};

function mockAccount(emailVerified = true) {
  server.use(
    http.get(`${API}/v1/me`, () =>
      HttpResponse.json({
        id: 'u1',
        email: 'anna@example.com',
        displayName: 'Anna',
        emailVerified,
        locale: 'pl',
      }),
    ),
    http.get(`${API}/v1/app-config`, () => HttpResponse.json(config)),
    http.get(`${API}/v1/tournaments`, () => HttpResponse.json({ items: [] })),
  );
}

describe('SCR-ORG-21 konto (IMP-277)', () => {
  it('TC-E2E-ORG-004: wylogowanie → SCR-ORG-13 i pusty cache', async () => {
    mockAccount();
    let loggedOut = false;
    server.use(
      http.post(`${API}/v1/auth/logout`, () => {
        loggedOut = true;
        return noContent();
      }),
    );
    const r = await startOrg(routes, '/account', state);
    expect(await screen.findByText('anna@example.com')).toBeOnTheScreen();
    expect(screen.getByText('Zweryfikowany')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('account-logout'));
    await waitFor(() => expect(r.getPathname()).toBe('/login'));
    expect(loggedOut).toBe(true);
    expect(tokenStore.getState().org).toBeNull();
    expect(state.queryClient.getQueryData(['me'])).toBeUndefined();
    await r.unmount();
  });

  it('TC-E2E-ORG-033: dokumenty z app-config; „USUŃ” – turniej Trwa blokuje, bez – wylogowanie', async () => {
    mockAccount(false);
    let attempts = 0;
    server.use(
      http.delete(`${API}/v1/me`, () =>
        ++attempts === 1 ? problem(409, 'ACTIVE_TOURNAMENT_EXISTS') : noContent(202),
      ),
    );
    const { openBrowserAsync } = jest.requireMock('expo-web-browser') as { openBrowserAsync: jest.Mock };
    const r = await startOrg(routes, '/account', state);
    expect(await screen.findByText('Zweryfikuj e-mail')).toBeOnTheScreen();
    await waitFor(() => expect(screen.getByTestId('doc-termsUrl')).toBeEnabled());
    await fireEvent.press(screen.getByText('Regulamin'));
    expect(openBrowserAsync).toHaveBeenCalledWith('https://polechamp.app/regulamin/v1');
    await fireEvent.press(screen.getByText('Umowa powierzenia danych'));
    expect(openBrowserAsync).toHaveBeenCalledWith('https://polechamp.app/umowa-powierzenia/v1');

    await fireEvent.press(screen.getByTestId('account-delete'));
    expect(await screen.findByTestId('delete-confirm')).toBeDisabled();
    await fireEvent.changeText(screen.getByTestId('delete-word'), 'usuń');
    await waitFor(() => expect(screen.getByTestId('delete-confirm')).toBeEnabled());
    await fireEvent.press(screen.getByTestId('delete-confirm'));
    expect(await screen.findByText('Najpierw zakończ trwający turniej.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('delete-confirm'));
    await waitFor(() => expect(r.getPathname()).toBe('/login'));
    expect(tokenStore.getState().org).toBeNull();
    await r.unmount();
  });
});

describe('UX-05: zmiana trybu urządzenia', () => {
  it('UX-05: logowanie organizatora – „Zmień tryb urządzenia” z potwierdzeniem czyści tryb', async () => {
    const r = await startOrg(routes, '/login', state, { loggedIn: false });
    await fireEvent.press(await screen.findByTestId('change-mode'));
    expect(await screen.findByText('Zmienić tryb urządzenia?')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('change-mode-confirm'));
    // Trasa `/mode` spoza zestawu testu – sprawdzamy wyczyszczony tryb.
    await waitFor(() => expect(readStoredMode()).toBeNull());
    await r.unmount();
  });
});

describe('UX-17: usunięcie konta', () => {
  it('UX-17: turniej Trwa – blokada z komunikatem bez arkusza; „USUN” bez polskiej litery akceptowane', async () => {
    mockAccount(false);
    let active = true;
    server.use(
      http.get(`${API}/v1/tournaments`, () =>
        HttpResponse.json({
          items: active ? [{ ...tournamentDetails(), status: 'IN_PROGRESS' }] : [],
        }),
      ),
    );
    const r = await startOrg(routes, '/account', state);
    await fireEvent.press(await screen.findByTestId('account-delete'));
    await waitFor(() => expect(screen.getByText('Najpierw zakończ trwający turniej.')).toBeOnTheScreen());
    expect(screen.queryByTestId('delete-word')).toBeNull();
    await r.unmount();
    expect(matchesWord('usun', 'USUŃ')).toBe(true);
    expect(matchesWord(' USUŃ ', 'USUŃ')).toBe(true);
    expect(matchesWord('USUNĄĆ', 'USUŃ')).toBe(false);
    active = false;
  });
});

describe('Tryb offline organizatora (IMP-278)', () => {
  it('TC-E2E-ORG-032: bez sieci baner i nieaktywne zapisy; po powrocie sieci – aktywne', async () => {
    mockAccount();
    server.use(
      http.get(`${API}/v1/tournaments/t1`, () => HttpResponse.json(tournamentDetails({ status: 'DRAFT' }))),
      http.get(`${API}/v1/categories/c3`, () => HttpResponse.json(categoryDetails())),
    );
    const r = await startOrg(routes, '/t/t1', state);
    expect(await screen.findByTestId('tournament-start')).toBeEnabled();
    await act(async () => network.reportHttpFailure());
    expect(
      await screen.findByText('Brak połączenia — dane mogą być nieaktualne. Zmiany są niedostępne.'),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('tournament-start')).toBeDisabled();
    expect(screen.getByTestId('tournament-edit')).toBeDisabled();
    expect(screen.queryByText('Dodaj')).toBeNull();
    await r.unmount();

    const cat = await startOrg(routes, '/c/c3', state);
    await screen.findByTestId('criteria-list');
    await act(async () => network.reportHttpFailure());
    await waitFor(() => expect(screen.getByTestId('category-action-start')).toBeDisabled());
    expect(screen.queryByText('Dodaj')).toBeNull();
    await act(async () => network.reportHttpSuccess());
    await waitFor(() => expect(screen.getByTestId('category-action-start')).toBeEnabled());
    expect(screen.getAllByText('Dodaj')).toHaveLength(2);
    await cat.unmount();
  });
});

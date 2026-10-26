import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { renderRouter } from 'expo-router/testing-library';
import OrgLayout from '../../../../app/(org)/_layout';
import ForgotPasswordRoute from '../../../../app/(org)/forgot-password';
import TournamentsRoute from '../../../../app/(org)/index';
import LoginRoute from '../../../../app/(org)/login';
import RegisterRoute from '../../../../app/(org)/register';
import ResetRoute from '../../../../app/(org)/reset';
import VerifyEmailRoute from '../../../../app/(org)/verify-email';
import { env } from '../../../config/env';
import { tokenStore } from '../../../data/api/tokens';
import { network } from '../../../data/network/online';
import { queryKeys } from '../../../data/query/keys';
import {
  act,
  createTestQueryClient,
  fireEvent,
  Providers,
  screen,
  waitFor,
} from '../../../test-utils/render';

const API = env.apiUrl;
const server = setupServer();
const user = { id: 'u1', email: 'anna@example.com', displayName: 'Anna', emailVerified: false };
const problem = (status: number, code: string, extra: object = {}) =>
  HttpResponse.json(
    { status, code, title: code, ...extra },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  );
const tokens = () => HttpResponse.json({ accessToken: 'a1', refreshToken: 'r1', expiresIn: 900, user });

const routes = {
  '(org)/_layout': OrgLayout,
  '(org)/index': TournamentsRoute,
  '(org)/login': LoginRoute,
  '(org)/register': RegisterRoute,
  '(org)/verify-email': VerifyEmailRoute,
  '(org)/forgot-password': ForgotPasswordRoute,
  '(org)/reset': ResetRoute,
};

let queryClient = createTestQueryClient();

async function start(url: string) {
  await act(async () => tokenStore.load());
  queryClient = createTestQueryClient();
  const result = await renderRouter(routes, {
    initialUrl: url,
    wrapper: ({ children }) => (
      <Providers mode="org" queryClient={queryClient}>
        {children}
      </Providers>
    ),
  });
  await act(async () => undefined);
  return result;
}

async function fillLogin(password: string) {
  await fireEvent.changeText(screen.getByTestId('login-email'), 'anna@example.com');
  await fireEvent.changeText(screen.getByTestId('login-password'), password);
  await fireEvent.press(screen.getByTestId('login-submit'));
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(async () => {
  server.resetHandlers();
  await act(async () => tokenStore.setOrg(null));
  tokenStore.reset();
  network.reset();
  queryClient.clear();
});
afterAll(() => server.close());

describe('SCR-ORG-13 logowanie (IMP-250)', () => {
  it('TC-E2E-ORG-004: logowanie → lista turniejów, sesja przetrwa restart', async () => {
    server.use(http.post(`${API}/v1/auth/login`, tokens));
    const r = await start('/');
    expect(r.getPathname()).toBe('/login');
    await fillLogin('dobre-haslo-123');
    await waitFor(() => expect(r.getPathname()).toBe('/'));
    expect(queryClient.getQueryData(queryKeys.me())).toEqual(user);
    await r.unmount();

    // Restart: magazyn wczytany od nowa z SecureStore – bez ekranu logowania.
    tokenStore.reset();
    const again = await start('/');
    expect(again.getPathname()).toBe('/');
    expect(tokenStore.getState().org).toEqual({ accessToken: 'a1', refreshToken: 'r1' });
    await again.unmount();
  });

  it('TC-E2E-ORG-005: złe hasło → komunikat; blokada → „Za dużo prób…” z odliczaniem', async () => {
    let attempts = 0;
    server.use(
      http.post(`${API}/v1/auth/login`, () =>
        ++attempts <= 5
          ? problem(401, 'INVALID_CREDENTIALS')
          : problem(423, 'ACCOUNT_LOCKED', { retryAfterSeconds: 30 }),
      ),
    );
    const r = await start('/login');
    for (let i = 0; i < 5; i++) {
      await fillLogin('zle');
      expect(await screen.findByText('Nieprawidłowy e-mail lub hasło.')).toBeOnTheScreen();
    }
    await fillLogin('zle');
    expect(await screen.findByText('Za dużo prób. Spróbuj za chwilę.')).toBeOnTheScreen();
    expect(screen.getByText('Spróbuj ponownie za 30 s.')).toBeOnTheScreen();
    expect(screen.getByTestId('login-submit')).toBeDisabled();
    await r.unmount();
  });

  it('brak sieci → „Brak połączenia z internetem.”', async () => {
    server.use(http.post(`${API}/v1/auth/login`, () => HttpResponse.error()));
    const r = await start('/login');
    await fillLogin('haslo');
    expect(await screen.findByText('Brak połączenia z internetem.')).toBeOnTheScreen();
    await r.unmount();
  });
});

describe('SCR-ORG-13 rejestracja i weryfikacja (IMP-251, IMP-252)', () => {
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

  async function fillRegister() {
    await fireEvent.changeText(screen.getByTestId('register-name'), 'Anna');
    await fireEvent.changeText(screen.getByTestId('register-email'), 'anna@example.com');
    await fireEvent.changeText(screen.getByTestId('register-password'), 'bardzo-dlugie-haslo');
  }

  it('TC-E2E-ORG-002: bez zgody nieaktywny; rejestracja → kod → lista turniejów', async () => {
    let registered: unknown;
    let verified: unknown;
    server.use(
      http.get(`${API}/v1/app-config`, () => HttpResponse.json(config)),
      http.post(`${API}/v1/auth/register`, async ({ request }) => {
        registered = await request.json();
        return new HttpResponse(null, { status: 202 });
      }),
      http.post(`${API}/v1/auth/login`, tokens),
      http.get(`${API}/v1/me`, () => HttpResponse.json({ ...user, locale: 'pl' })),
      http.post(`${API}/v1/auth/verify-email`, async ({ request }) => {
        verified = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const r = await start('/register');
    await fillRegister();
    expect(screen.getByTestId('register-submit')).toBeDisabled();
    await fireEvent.press(screen.getByTestId('register-accept'));
    await waitFor(() => expect(screen.getByTestId('register-submit')).toBeEnabled());
    await fireEvent.press(screen.getByTestId('register-submit'));
    await waitFor(() => expect(r.getPathname()).toBe('/verify-email'));
    expect(registered).toEqual({
      displayName: 'Anna',
      email: 'anna@example.com',
      password: 'bardzo-dlugie-haslo',
      acceptTerms: true,
      termsVersion: '2026-09',
    });
    expect(await screen.findByText('Wysłaliśmy 6-cyfrowy kod na adres anna@example.com.')).toBeOnTheScreen();
    expect(screen.getByTestId('verify-resend')).toBeDisabled();
    await fireEvent.changeText(screen.getByTestId('verify-code'), '123456');
    await waitFor(() => expect(r.getPathname()).toBe('/'));
    expect(verified).toEqual({ email: 'anna@example.com', code: '123456' });
    await r.unmount();
  });

  it('TC-E2E-ORG-002: hasło z wycieku → błąd pod polem hasła', async () => {
    server.use(
      http.get(`${API}/v1/app-config`, () => HttpResponse.json(config)),
      http.post(`${API}/v1/auth/register`, () =>
        problem(422, 'VALIDATION_FAILED', { errors: [{ field: 'password', code: 'PASSWORD_BREACHED' }] }),
      ),
    );
    const r = await start('/register');
    await fillRegister();
    await fireEvent.press(screen.getByTestId('register-accept'));
    await waitFor(() => expect(screen.getByTestId('register-submit')).toBeEnabled());
    await fireEvent.press(screen.getByTestId('register-submit'));
    expect(await screen.findByText('To hasło wyciekło w innym serwisie. Wybierz inne.')).toBeOnTheScreen();
    expect(r.getPathname()).toBe('/register');
    await r.unmount();
  });

  it('TC-E2E-ORG-003: błędny kod czyści pola; „Pomiń na razie” → lista turniejów', async () => {
    await tokenStore.setOrg({ accessToken: 'a1', refreshToken: 'r1' });
    server.use(
      http.get(`${API}/v1/me`, () => HttpResponse.json({ ...user, locale: 'pl' })),
      http.post(`${API}/v1/auth/verify-email`, () => problem(400, 'CODE_INVALID')),
    );
    const r = await start('/verify-email');
    await screen.findByText('Wysłaliśmy 6-cyfrowy kod na adres anna@example.com.');
    await fireEvent.changeText(screen.getByTestId('verify-code'), '000000');
    expect(await screen.findByText('Kod jest nieprawidłowy lub wygasł.')).toBeOnTheScreen();
    expect(screen.getByTestId('verify-code').props.value).toBe('');
    expect(screen.getByText('Wyślij kod ponownie (60 s)')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('verify-skip'));
    await waitFor(() => expect(r.getPathname()).toBe('/'));
    await r.unmount();
  });
});

describe('SCR-ORG-13 reset hasła (IMP-253)', () => {
  it('TC-E2E-ORG-006: link → neutralny komunikat; nowe hasło z linku → logowanie', async () => {
    let reset: unknown;
    server.use(
      http.post(`${API}/v1/auth/password/forgot`, () => new HttpResponse(null, { status: 202 })),
      http.post(`${API}/v1/auth/password/reset`, async ({ request }) => {
        reset = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const r = await start('/forgot-password');
    await fireEvent.changeText(screen.getByTestId('forgot-email'), 'anna@example.com');
    await fireEvent.press(screen.getByTestId('forgot-submit'));
    expect(
      await screen.findByText('Jeśli konto istnieje, wysłaliśmy link do zmiany hasła.'),
    ).toBeOnTheScreen();
    await r.unmount();

    const link = await start('/reset?token=tok-1');
    await fireEvent.changeText(screen.getByTestId('reset-password'), 'nowe-haslo-12345');
    await fireEvent.press(screen.getByTestId('reset-submit'));
    await waitFor(() => expect(link.getPathname()).toBe('/login'));
    expect(reset).toEqual({ token: 'tok-1', newPassword: 'nowe-haslo-12345' });
    await link.unmount();
  });

  it('wygasły link → „Link wygasł. Poproś o nowy.” i przejście do formularza', async () => {
    server.use(http.post(`${API}/v1/auth/password/reset`, () => problem(400, 'RESET_TOKEN_INVALID')));
    const r = await start('/reset?token=old');
    await fireEvent.changeText(screen.getByTestId('reset-password'), 'nowe-haslo-12345');
    await fireEvent.press(screen.getByTestId('reset-submit'));
    expect(await screen.findByText('Link wygasł. Poproś o nowy.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('reset-new-link'));
    await waitFor(() => expect(r.getPathname()).toBe('/forgot-password'));
    await r.unmount();
  });
});

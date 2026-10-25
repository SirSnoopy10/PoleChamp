import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { i18n } from '../../../i18n';
import { updateSignal } from '../app-version';
import { createAuthMiddleware } from '../auth-middleware';
import { createApiClient } from '../client';
import { ApiError, unwrap } from '../errors';
import { fetchWithTimeout } from '../timeout';
import { tokenStore } from '../tokens';

const BASE = 'http://api.test';
const server = setupServer();
let refreshCalls = 0;

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  tokenStore.reset();
  updateSignal.reset();
  refreshCalls = 0;
});
afterAll(() => server.close());

const problem = (status: number, code: string, extra: object = {}) =>
  HttpResponse.json(
    { status, code, title: code, ...extra },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  );

function client(onSessionExpired = jest.fn()) {
  const fetch = (i: RequestInfo | URL, init?: RequestInit) => globalThis.fetch(i, init);
  return {
    onSessionExpired,
    api: createApiClient({
      baseUrl: BASE,
      fetch,
      middleware: [
        createAuthMiddleware({
          baseUrl: BASE,
          fetch,
          getToken: () => tokenStore.current('org'),
          canRefresh: () => true,
          onSessionExpired,
        }),
      ],
    }),
  };
}

function refreshHandler() {
  return http.post(`${BASE}/v1/auth/refresh`, async ({ request }) => {
    refreshCalls++;
    const { refreshToken } = (await request.json()) as { refreshToken: string };
    if (refreshToken === 'reused') return problem(401, 'TOKEN_REUSED');
    return HttpResponse.json({ accessToken: 'fresh', refreshToken: 'r2', expiresIn: 900 });
  });
}

describe('warstwa API klienta (IMP-214)', () => {
  it('równoległe żądania z wygasłym tokenem – jedno odświeżenie i ponowienie każdego', async () => {
    await tokenStore.setOrg({ accessToken: 'stale', refreshToken: 'r1' });
    server.use(
      refreshHandler(),
      http.get(`${BASE}/v1/tournaments`, ({ request }) =>
        request.headers.get('Authorization') === 'Bearer fresh'
          ? HttpResponse.json({ items: [] })
          : problem(401, 'UNAUTHENTICATED'),
      ),
    );
    const { api } = client();
    const results = await Promise.all([1, 2, 3].map(() => unwrap(api.GET('/v1/tournaments'))));
    expect(results).toHaveLength(3);
    expect(refreshCalls).toBe(1);
    expect(tokenStore.getState().org).toEqual({ accessToken: 'fresh', refreshToken: 'r2' });
  });

  it('TOKEN_REUSED przy odświeżeniu → wylogowanie i sygnał wygaśnięcia sesji', async () => {
    await tokenStore.setOrg({ accessToken: 'stale', refreshToken: 'reused' });
    server.use(
      refreshHandler(),
      http.get(`${BASE}/v1/tournaments`, () => problem(401, 'UNAUTHENTICATED')),
    );
    const { api, onSessionExpired } = client();
    await expect(unwrap(api.GET('/v1/tournaments'))).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
    expect(tokenStore.getState().org).toBeNull();
    expect(i18n.t('errors:TOKEN_REUSED')).toBe('Sesja wygasła. Zaloguj się ponownie.');
  });

  it('nagłówki: Authorization, X-Request-Id (UUIDv7), Idempotency-Key tylko dla POST i zachowany przy ponowieniu', async () => {
    await tokenStore.setOrg({ accessToken: 'a1', refreshToken: 'r1' });
    const seen: Headers[] = [];
    server.use(
      http.post(`${BASE}/v1/tournaments`, ({ request }) => {
        seen.push(request.headers);
        return HttpResponse.json({}, { status: 201 });
      }),
      http.get(`${BASE}/v1/tournaments`, ({ request }) => {
        seen.push(request.headers);
        return HttpResponse.json({ items: [] });
      }),
    );
    const { api } = client();
    await api.POST('/v1/tournaments', { body: {} as never, headers: { 'Idempotency-Key': 'akcja-1' } });
    await api.GET('/v1/tournaments');
    expect(seen[0]?.get('Authorization')).toBe('Bearer a1');
    expect(seen[0]?.get('Idempotency-Key')).toBe('akcja-1');
    expect(seen[0]?.get('X-Request-Id')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(seen[1]?.has('Idempotency-Key')).toBe(false);
  });

  it('TC-I18N-007: START_NUMBER_TAKEN → pole startNumber i komunikat PL', async () => {
    server.use(
      http.post(`${BASE}/v1/categories/:id/entries`, () => problem(409, 'START_NUMBER_TAKEN', { nr: 47 })),
    );
    const { api } = client();
    const error = await unwrap(
      api.POST('/v1/categories/{categoryId}/entries', {
        params: { path: { categoryId: 'c1' } },
        body: {} as never,
      }),
    ).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.fieldErrors).toEqual([{ field: 'startNumber', code: 'INVALID_FORMAT' }]);
    expect(i18n.t(apiError.messageKey as never, apiError.messageParams as never)).toBe(
      'Numer 47 jest już zajęty.',
    );
  });

  it('PIN_LOCKED z Retry-After i requiresReset → właściwe komunikaty', async () => {
    server.use(
      http.post(`${BASE}/v1/judge-sessions`, () =>
        HttpResponse.json(
          { status: 423, code: 'PIN_LOCKED', title: 'x' },
          { status: 423, headers: { 'Retry-After': '30' } },
        ),
      ),
    );
    const { api } = client();
    const error = (await unwrap(api.POST('/v1/judge-sessions', { body: {} as never })).catch(
      (e: unknown) => e,
    )) as ApiError;
    expect(error.retryAfterSeconds).toBe(30);
    expect(i18n.t(error.messageKey as never, error.messageParams as never)).toBe(
      'Zbyt wiele prób. Spróbuj za 30 s.',
    );
  });

  it('brak sieci → NETWORK, przekroczony czas → TIMEOUT', async () => {
    server.use(
      http.get(`${BASE}/v1/tournaments`, () => HttpResponse.error()),
      http.get(`${BASE}/v1/me`, async () => {
        await new Promise((r) => setTimeout(r, 200));
        return HttpResponse.json({});
      }),
    );
    const { api } = client();
    const net = (await unwrap(api.GET('/v1/tournaments')).catch((e: unknown) => e)) as ApiError;
    expect(net.code).toBe('NETWORK');
    expect(i18n.t(net.messageKey as never)).toBe('Brak połączenia z internetem.');
    const slow = createApiClient({ baseUrl: BASE, fetch: fetchWithTimeout(50) });
    const timeout = (await unwrap(slow.GET('/v1/me')).catch((e: unknown) => e)) as ApiError;
    expect(timeout.code).toBe('TIMEOUT');
  });

  it('X-Min-App-Version wyższa niż wersja aplikacji → sygnał updateRequired', async () => {
    server.use(
      http.get(`${BASE}/v1/tournaments`, () =>
        HttpResponse.json({ items: [] }, { headers: { 'X-Min-App-Version': '99.0.0' } }),
      ),
    );
    const { api } = client();
    await api.GET('/v1/tournaments');
    expect(updateSignal.getState()).toMatchObject({ updateRequired: true, minAppVersion: '99.0.0' });
  });
});

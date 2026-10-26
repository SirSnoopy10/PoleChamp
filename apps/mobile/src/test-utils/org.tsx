import type { ComponentType } from 'react';
import { HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { renderRouter } from 'expo-router/testing-library';
import { env } from '../config/env';
import { tokenStore } from '../data/api/tokens';
import { network } from '../data/network/online';
import { act, createTestQueryClient, Providers } from './render';

/** Adres API w testach ekranów (msw przechwytuje `fetch` klienta aplikacji). */
export const API = env.apiUrl;

/** Odpowiedź `application/problem+json` (03-api §1.1). */
export const problem = (status: number, code: string, extra: object = {}) =>
  HttpResponse.json(
    { status, code, title: code, ...extra },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  );

export const noContent = (status = 204) => new HttpResponse(null, { status });

/**
 * Serwer msw ekranów organizatora z porządkami po każdym teście (tokeny, stan sieci, cache) –
 * bez tego timery `network` i `gcTime` trzymają Jest przy życiu.
 */
export function setupOrgServer() {
  const server = setupServer();
  const state = { queryClient: createTestQueryClient() };
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(async () => {
    server.resetHandlers();
    await act(async () => tokenStore.setOrg(null));
    tokenStore.reset();
    network.reset();
    state.queryClient.clear();
  });
  afterAll(() => server.close());
  return { server, state };
}

export type Routes = Record<string, ComponentType>;

/**
 * Trasy Expo Router w trybie organizatora. `loggedIn` zapisuje sesję przed renderem.
 * Zwraca wynik `renderRouter` (`getPathname`, `unmount`).
 */
export async function startOrg(
  routes: Routes,
  url: string,
  state: { queryClient: ReturnType<typeof createTestQueryClient> },
  { loggedIn = true }: { loggedIn?: boolean } = {},
) {
  if (loggedIn) await tokenStore.setOrg({ accessToken: 'a1', refreshToken: 'r1' });
  await act(async () => tokenStore.load());
  state.queryClient = createTestQueryClient();
  const client = state.queryClient;
  const result = await renderRouter(routes, {
    initialUrl: url,
    wrapper: ({ children }) => (
      <Providers mode="org" queryClient={client}>
        {children}
      </Providers>
    ),
  });
  await act(async () => undefined);
  return result;
}

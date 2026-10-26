import type { Middleware } from 'openapi-fetch';
import { network } from '../network/online';
import { updateSignal } from './app-version';
import { tokenStore, type OrgTokens } from './tokens';
import { uuidv7 } from './uuid';

export interface AuthMiddlewareOptions {
  baseUrl: string;
  /** Token dołączany do żądania (zależny od trybu aplikacji). */
  getToken: () => string | null;
  /** Odświeżanie dotyczy tylko sesji organizatora (`org`). */
  canRefresh: () => boolean;
  /** Sesja nie do odzyskania (`TOKEN_REUSED`, nieudane odświeżenie) – wylogowanie i SCR-ORG-13. */
  onSessionExpired: () => void;
  /** `401 DEVICE_REVOKED` z dowolnego żądania tabletu – zatrzymanie synchronizacji i SCR-JDG-10 (IMP-356). */
  onDeviceRevoked?: () => void;
  fetch?: typeof globalThis.fetch;
}

const REFRESH_PATH = '/v1/auth/refresh';
/** Ścieżki bez odświeżania przy 401 (logowanie, rejestracja, rotacja). */
const NO_REFRESH = /\/v1\/auth\/(login|register|refresh|verify-email|password-reset)/;

/**
 * Middleware `openapi-fetch` (IMP-214): `Authorization`, `X-Request-Id`, `Idempotency-Key` dla POST,
 * odczyt `X-Min-App-Version` i jedno odświeżenie tokenu `org` dla wielu równoległych 401.
 */
export function createAuthMiddleware(options: AuthMiddlewareOptions): Middleware {
  const doFetch = options.fetch ?? ((input, init) => globalThis.fetch(input, init));
  const pending = new Map<string, Request>();
  let refreshing: Promise<OrgTokens | null> | null = null;

  /** Single-flight: wszystkie żądania z 401 czekają na jedną rotację. */
  function refresh(): Promise<OrgTokens | null> {
    refreshing ??= (async () => {
      const current = tokenStore.getState().org;
      if (!current) return null;
      try {
        const res = await doFetch(`${options.baseUrl}${REFRESH_PATH}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Request-Id': uuidv7() },
          body: JSON.stringify({ refreshToken: current.refreshToken }),
        });
        if (!res.ok) return null;
        const tokens = (await res.json()) as OrgTokens;
        await tokenStore.setOrg({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
        return tokens;
      } catch {
        return null;
      }
    })().finally(() => {
      refreshing = null;
    });
    return refreshing;
  }

  async function expire() {
    await tokenStore.setOrg(null);
    options.onSessionExpired();
  }

  return {
    onError({ id }) {
      pending.delete(id);
      network.reportHttpFailure();
    },
    onRequest({ request, id }) {
      const token = options.getToken();
      if (token && !request.headers.has('Authorization'))
        request.headers.set('Authorization', `Bearer ${token}`);
      if (!request.headers.has('X-Request-Id')) request.headers.set('X-Request-Id', uuidv7());
      // Klucz z akcji użytkownika (przekazany w `headers`) zostaje przy ponowieniu; inaczej nowy.
      if (request.method === 'POST' && !request.headers.has('Idempotency-Key')) {
        request.headers.set('Idempotency-Key', uuidv7());
      }
      pending.set(id, request.clone());
      return request;
    },
    async onResponse({ request, response, id }) {
      const original = pending.get(id);
      pending.delete(id);
      // Dowolna odpowiedź serwera = API osiągalne (definicja „online”, TL-45).
      network.reportHttpSuccess();
      const minApp = response.headers.get('X-Min-App-Version');
      if (minApp) updateSignal.report({ minAppVersion: minApp });
      if (response.status !== 401) return response;
      const problem = (await response
        .clone()
        .json()
        .catch(() => null)) as { code?: string } | null;
      if (problem?.code === 'DEVICE_REVOKED') {
        options.onDeviceRevoked?.();
        return response;
      }
      if (!original || NO_REFRESH.test(new URL(request.url).pathname)) return response;
      if (problem?.code === 'TOKEN_REUSED' || !options.canRefresh()) {
        if (options.canRefresh()) await expire();
        return response;
      }
      const tokens = await refresh();
      if (!tokens) {
        await expire();
        return response;
      }
      const retry = original.clone();
      retry.headers.set('Authorization', `Bearer ${tokens.accessToken}`);
      return doFetch(retry);
    },
  };
}

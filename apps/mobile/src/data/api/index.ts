import { env } from '../../config/env';
import { readStoredMode } from '../../mode/mode';
import { createAuthMiddleware } from './auth-middleware';
import { createApiClient, type ApiClient } from './client';
import { fetchWithTimeout } from './timeout';
import { tokenStore } from './tokens';

export { ApiError, unwrap } from './errors';
export { tokenStore } from './tokens';
export { updateSignal } from './app-version';
export { uuidv7 } from './uuid';
export type { ApiClient } from './client';

type Listener = () => void;
const expiredListeners = new Set<Listener>();

/** Subskrypcja wygaśnięcia sesji organizatora (toast „Sesja wygasła…” i przejście do SCR-ORG-13). */
export function onSessionExpired(listener: Listener): () => void {
  expiredListeners.add(listener);
  return () => expiredListeners.delete(listener);
}

/** Klient API aplikacji: limit czasu 15 s i middleware uwierzytelniania (IMP-214). */
export function createAppApiClient(
  fetch: typeof globalThis.fetch = (i, init) => globalThis.fetch(i, init),
): ApiClient {
  const timed = fetchWithTimeout(env.requestTimeoutMs, fetch);
  return createApiClient({
    baseUrl: env.apiUrl,
    fetch: timed,
    middleware: [
      createAuthMiddleware({
        baseUrl: env.apiUrl,
        fetch: timed,
        getToken: () => tokenStore.current(readStoredMode()),
        canRefresh: () => readStoredMode() === 'org',
        onSessionExpired: () => expiredListeners.forEach((l) => l()),
      }),
    ],
  });
}

export const api = createAppApiClient();

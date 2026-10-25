import createClient, { type Client, type Middleware } from 'openapi-fetch';
import { env } from '../../config/env';
import type { paths } from './types';

export type ApiClient = Client<paths>;

export interface ApiClientOptions {
  baseUrl?: string;
  /** Middleware `openapi-fetch` (IMP-214: tokeny, identyfikatory, wersja aplikacji). */
  middleware?: readonly Middleware[];
  fetch?: typeof globalThis.fetch;
}

/** Typowany klient API (IMP-067): `client.GET('/v1/tournaments')`. */
export function createApiClient({
  baseUrl = env.apiUrl,
  middleware = [],
  fetch,
}: ApiClientOptions = {}): ApiClient {
  const client = createClient<paths>({ baseUrl, ...(fetch ? { fetch } : {}) });
  client.use(...middleware);
  return client;
}

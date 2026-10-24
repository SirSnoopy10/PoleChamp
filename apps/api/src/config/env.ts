import { z } from 'zod';

const bool = z
  .enum(['true', 'false', '1', '0'])
  .transform((v) => v === 'true' || v === '1')
  .default(false);

/** Zmienne środowiskowe API (IMP-100). Start przerywany z listą błędów, gdy konfiguracja jest niepoprawna. */
export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DATABASE_URL: z.url(),
  DATABASE_SSL: bool,
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(20),
  VALKEY_URL: z.url(),
  /** JSON `{ active: { kid, privateJwk }, previous?: { kid, publicJwk } }` (Secrets Manager `jwt-signing`, IMP-014). */
  JWT_KEYS: z.string().min(1),
  JWT_ISSUER: z.string().default('https://api.polechamp.app'),
  /** Klucz HMAC `pin_fingerprint` (base64, ≥ 32 B) – TL-06. */
  PIN_FINGERPRINT_KEY: z.base64(),
  APP_MIN_VERSION: z.string().default('1.0.0'),
  APP_MIN_SYNC_VERSION: z.string().default('1.0.0'),
  TERMS_VERSION: z.string().default('2026-11'),
  LEGAL_BASE_URL: z.url().default('https://polechamp.app'),
  /** Adres linków uniwersalnych w e-mailach (reset hasła). */
  PUBLIC_WEB_URL: z.url().default('https://polechamp.app'),
  HIBP_ENABLED: bool,
  /** Lista top-100k haseł (fallback HIBP, Q-12); brak pliku = tylko wbudowana krótka lista. */
  PASSWORD_LIST_FILE: z.string().optional(),
  /** Opóźnienie zamknięcia po SIGTERM (deregistracja ALB) – IMP-100 krok 5. */
  SHUTDOWN_DELAY_MS: z.coerce.number().int().min(0).default(10_000),
  /** Publikator outboxu zdarzeń realtime w tym procesie (lider wybierany blokadą advisory – IMP-155). */
  EVENT_PUBLISHER_ENABLED: z
    .enum(['true', 'false', '1', '0'])
    .transform((v) => v === 'true' || v === '1')
    .default(true),
});

export type Env = z.infer<typeof EnvSchema>;

export class InvalidEnvError extends Error {
  constructor(readonly problems: string[]) {
    super(`Niepoprawna konfiguracja środowiska:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  }
}

export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  const result = EnvSchema.safeParse(source);
  if (!result.success) {
    throw new InvalidEnvError(result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`));
  }
  return result.data;
}

export const ENV = Symbol('ENV');

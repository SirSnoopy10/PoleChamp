/**
 * Usuwanie danych osobowych i sekretów z telemetrii (NFR-504, TC-SEC-017) – wspólne dla Sentry
 * w aplikacji i logów API. Klucze z PII zastępowane `[Filtered]`, w tekstach maskowane e-maile,
 * tokeny Bearer/JWT i parametry URL z sekretami.
 */
export const FILTERED = '[Filtered]';

/** Klucze, których wartości zawsze są PII lub sekretami. */
const PII_KEY =
  /^(full_?name|first_?name|last_?name|display_?name|name|club|e-?mail|comment|notes?|pin|pin_?hash|password|token|access_?token|refresh_?token|authorization|cookie|secret|code|pairing_?code|ip(_?address)?)$/i;

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const BEARER = /\bBearer\s+[A-Za-z0-9._~+/=-]+/g;
const JWT = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;
/** Parametry URL z sekretami: token resetu, kod parowania (`c`), kod e-mail. */
const URL_SECRET = /([?&](?:token|c|code|t|refreshToken)=)[^&#\s]+/gi;

export function scrubText(text: string): string {
  return text
    .replace(BEARER, `Bearer ${FILTERED}`)
    .replace(JWT, FILTERED)
    .replace(EMAIL, FILTERED)
    .replace(URL_SECRET, `$1${FILTERED}`);
}

/** Kopia wartości bez PII (obiekty i tablice rekurencyjnie, cykle przerwane). */
export function scrubPii<T>(value: T, seen = new WeakSet<object>()): T {
  if (typeof value === 'string') return scrubText(value) as T;
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return FILTERED as T;
  seen.add(value);
  if (Array.isArray(value)) return value.map((v) => scrubPii(v, seen)) as T;
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value)) {
    out[key] = PII_KEY.test(key) && v !== null && v !== undefined ? FILTERED : scrubPii(v, seen);
  }
  return out as T;
}

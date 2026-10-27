import { scrubText } from '@polechamp/contracts';

export interface SafeError {
  name: string;
  code?: string;
  message: string;
  stack?: string;
  cause?: SafeError;
}

/** Znacznik parametrów zapytania w komunikacie Drizzle (`Failed query: …\nparams: Kowalska,…`) – wartości z PII. */
const QUERY_PARAMS = '\nparams: ';
const SQLSTATE = /^[0-9A-Z]{5}$/;
/** Nazwy obiektów bazy w cudzysłowie, które zostają (ograniczenie, relacja, kolumna, tabela, indeks). */
const DB_OBJECT = /(?:constraint|relation|column|table|index) $/;

/** Wartości w cudzysłowie zastąpione `[Filtered]` (bez regexów z cofaniem – komunikaty mogą być długie). */
function maskQuoted(message: string): string {
  const tail = message.indexOf(': "');
  const head = tail >= 0 && message.endsWith('"') ? `${message.slice(0, tail)}: "[Filtered]"` : message;
  const parts = head.split('"');
  return parts
    .map((part, i) => (i % 2 === 1 && !DB_OBJECT.test(parts[i - 1]?.slice(-12) ?? '') ? '[Filtered]' : part))
    .join('"');
}

/**
 * Błąd do logu bez danych osobowych (NFR-504, TC-SEC-017, IMP-403): bez parametrów zapytań, bez `detail`
 * PostgreSQL (`Key (full_name)=(…)`), stos tylko z ramek (bez powtórzonego komunikatu), przyczyny rekurencyjnie.
 */
export function safeError(error: unknown, depth = 0): SafeError {
  if (!(error instanceof Error)) return { name: typeof error, message: '[Filtered]' };
  const code = (error as { code?: unknown }).code;
  const params = error.message.indexOf(QUERY_PARAMS);
  let message = params >= 0 ? `${error.message.slice(0, params)}${QUERY_PARAMS}[Filtered]` : error.message;
  // Komunikaty PostgreSQL cytują wartości wejścia (`invalid input syntax for type integer: "…"`).
  if (typeof code === 'string' && SQLSTATE.test(code)) {
    message = maskQuoted(message);
  }
  return {
    name: error.name,
    ...(typeof code === 'string' ? { code } : {}),
    message: scrubText(message),
    ...(error.stack
      ? {
          stack: error.stack
            .split('\n')
            .filter((line) => line.trimStart().startsWith('at '))
            .join('\n'),
        }
      : {}),
    ...(error.cause !== undefined && depth < 3 ? { cause: safeError(error.cause, depth + 1) } : {}),
  };
}

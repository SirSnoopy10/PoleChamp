import type { ErrorCode, FieldErrorCode, FieldIssue } from '@polechamp/contracts';

/** Błędy bez kodu API: brak sieci i przekroczony czas (IMP-214 krok 5). */
export type ClientErrorCode = 'NETWORK' | 'TIMEOUT';
export type AnyErrorCode = ErrorCode | ClientErrorCode;

/** Treść `application/problem+json` (03-api §1.1). */
export interface Problem {
  type?: string;
  title?: string;
  status: number;
  code: ErrorCode;
  detail?: string;
  instance?: string;
  requestId?: string;
  errors?: { field: string; code: FieldErrorCode }[];
  requiresReset?: boolean;
  [extra: string]: unknown;
}

/** Błąd domenowy API zamieniany na tekst PL kluczem `messageKey` (`errors:<CODE>`). */
export class ApiError extends Error {
  readonly code: AnyErrorCode;
  readonly status: number;
  readonly fieldErrors: readonly FieldIssue[];
  readonly retryAfterSeconds: number | null;
  readonly requestId: string | null;
  readonly problem: Problem | null;

  constructor(init: {
    code: AnyErrorCode;
    status: number;
    fieldErrors?: readonly FieldIssue[];
    retryAfterSeconds?: number | null;
    requestId?: string | null;
    problem?: Problem | null;
  }) {
    super(init.code);
    this.name = 'ApiError';
    this.code = init.code;
    this.status = init.status;
    this.fieldErrors = init.fieldErrors ?? [];
    this.retryAfterSeconds = init.retryAfterSeconds ?? null;
    this.requestId = init.requestId ?? null;
    this.problem = init.problem ?? null;
  }

  /** Klucz i18n komunikatu (TC-I18N-007). */
  get messageKey(): string {
    if (this.code === 'NETWORK' || this.code === 'TIMEOUT') return `errors:client.${this.code}`;
    if (this.code === 'PIN_LOCKED' && this.problem?.requiresReset) return 'errors:PIN_LOCKED_requiresReset';
    return `errors:${this.code}`;
  }

  /** Parametry komunikatu (np. `{s}` dla PIN_LOCKED, `{nr}` dla START_NUMBER_TAKEN). */
  get messageParams(): Record<string, string | number> {
    const params: Record<string, string | number> = {};
    if (this.retryAfterSeconds !== null) params.s = this.retryAfterSeconds;
    for (const [k, v] of Object.entries(this.problem ?? {})) {
      if (typeof v === 'string' || typeof v === 'number') params[k] = v;
    }
    return params;
  }
}

/** Pole formularza dla błędów domenowych bez `errors[]` (np. zajęty numer startowy). */
const CODE_FIELD: Partial<Record<ErrorCode, { field: string; code: FieldErrorCode }>> = {
  START_NUMBER_TAKEN: { field: 'startNumber', code: 'INVALID_FORMAT' },
  JUDGE_NAME_TAKEN: { field: 'fullName', code: 'INVALID_FORMAT' },
};

function retryAfter(response: Response, problem: Problem | null): number | null {
  const header = response.headers.get('Retry-After');
  if (header && /^\d+$/.test(header)) return Number(header);
  const fromBody = problem?.retryAfterSeconds;
  return typeof fromBody === 'number' ? fromBody : null;
}

/** Odpowiedź błędu HTTP → `ApiError` (problem+json albo sam status). */
export function toApiError(response: Response, body: unknown): ApiError {
  const problem = body && typeof body === 'object' && 'code' in body ? (body as Problem) : null;
  const code: ErrorCode = problem?.code ?? (response.status === 401 ? 'UNAUTHENTICATED' : 'INTERNAL');
  const mapped = CODE_FIELD[code];
  const fieldErrors = problem?.errors?.length ? problem.errors : mapped ? [mapped] : [];
  return new ApiError({
    code,
    status: response.status,
    fieldErrors,
    retryAfterSeconds: retryAfter(response, problem),
    requestId: problem?.requestId ?? response.headers.get('X-Request-Id'),
    problem,
  });
}

/** Błąd `fetch` (brak sieci) lub przerwanie po limicie czasu → `NETWORK` / `TIMEOUT`. */
export function toClientError(error: unknown): ApiError {
  const aborted = error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError');
  return new ApiError({ code: aborted ? 'TIMEOUT' : 'NETWORK', status: 0 });
}

/** Wynik `openapi-fetch` → dane albo wyjątek `ApiError` (dla `queryFn` / `mutationFn`). */
export async function unwrap<T>(
  call: Promise<{ data?: T; error?: unknown; response: Response }>,
): Promise<T> {
  let result: { data?: T; error?: unknown; response: Response };
  try {
    result = await call;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw toClientError(error);
  }
  if (result.error !== undefined || !result.response.ok) throw toApiError(result.response, result.error);
  return result.data as T;
}

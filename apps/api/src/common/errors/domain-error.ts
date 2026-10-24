import { errorHttpStatus, type ErrorCode, type FieldIssue } from '@polechamp/contracts';

export interface DomainErrorExtras {
  errors?: FieldIssue[];
  retryAfterSeconds?: number;
  remainingAttempts?: number;
  requiresReset?: boolean;
  /** Dodatkowe pola treści problemu (np. `missingSheets` dla LOCK_WARNINGS). */
  body?: Record<string, unknown>;
}

/** Błąd domenowy z kodem z katalogu 03-api §1.2 – filtr zamienia go na `application/problem+json`. */
export class DomainError extends Error {
  readonly status: number;

  constructor(
    readonly code: ErrorCode,
    readonly detail?: string,
    readonly extras: DomainErrorExtras = {},
    status?: number,
  ) {
    super(detail ?? code);
    this.status = status ?? errorHttpStatus[code] ?? 500;
  }
}

export const notFound = (detail?: string) => new DomainError('NOT_FOUND', detail);
export const conflict = (code: ErrorCode, detail?: string, extras?: DomainErrorExtras) =>
  new DomainError(code, detail, extras);
export const validationFailed = (errors: FieldIssue[]) =>
  new DomainError('VALIDATION_FAILED', undefined, { errors });

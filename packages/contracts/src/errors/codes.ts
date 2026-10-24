/**
 * Katalog kodów błędów API (03-api §1.2) z kodem HTTP. Test `codes.doc.test.ts` pilnuje zgodności
 * z dokumentacją – zmiana katalogu wymaga zmiany obu miejsc.
 */
export const errorHttpStatus = {
  VALIDATION_FAILED: 422,
  INVALID_CREDENTIALS: 401,
  ACCOUNT_LOCKED: 423,
  CODE_INVALID: 400,
  RESET_TOKEN_INVALID: 400,
  ACTIVE_TOURNAMENT_EXISTS: 409,
  UNAUTHENTICATED: 401,
  TOKEN_REUSED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT_VERSION: 409,
  INVALID_STATE_TRANSITION: 409,
  TOURNAMENT_FINISHED: 409,
  CATEGORY_NOT_STARTED: 409,
  CATEGORY_LOCKED: 409,
  CRITERIA_LOCKED: 409,
  START_REQUIREMENTS_NOT_MET: 409,
  START_NUMBER_TAKEN: 409,
  HAS_SCORES: 409,
  MIN_CRITERIA: 409,
  LIMIT_EXCEEDED: 409,
  JUDGE_NAME_TAKEN: 409,
  JUDGE_NOT_IN_PANEL: 403,
  PIN_INVALID: 401,
  PIN_LOCKED: 423,
  DEVICE_REVOKED: 401,
  PAIRING_CODE_INVALID: 400,
  IDEMPOTENCY_KEY_REUSED: 422,
  EMAIL_NOT_VERIFIED: 403,
  RATE_LIMITED: 429,
  LOCK_WARNINGS: 409,
  STALE_REVISION: 409,
  SCHEMA_MISMATCH: 422,
  PIN_VERSION_OUTDATED: 409,
  JUDGE_SESSION_INVALID: 409,
  JUDGE_INACTIVE: 409,
  ENTRY_WITHDRAWN: 409,
  CURSOR_EXPIRED: 410,
  /** Tylko wewnętrznie – API odpowiada 202 bez ujawniania istnienia konta (03-api §3.1). */
  EMAIL_TAKEN: null,
  INTERNAL: 500,
} as const satisfies Record<string, number | null>;

export type ErrorCode = keyof typeof errorHttpStatus;
export const ERROR_CODES = Object.keys(errorHttpStatus) as ErrorCode[];

/** Kody błędów pól `errors[].code` (03-api §1.3). */
export const FIELD_ERROR_CODES = [
  'REQUIRED',
  'TOO_SHORT',
  'TOO_LONG',
  'OUT_OF_RANGE',
  'INVALID_STEP',
  'INVALID_FORMAT',
  'PASSWORD_BREACHED',
  'DATE_RANGE',
  'UNKNOWN_FIELD',
] as const;

export type FieldErrorCode = (typeof FIELD_ERROR_CODES)[number];

/** Kody odrzucenia mutacji w `sync/push` (03-api §5.1). */
export const SYNC_REJECTION_CODES = [
  'CATEGORY_LOCKED',
  'CATEGORY_NOT_STARTED',
  'TOURNAMENT_FINISHED',
  'JUDGE_NOT_IN_PANEL',
  'JUDGE_INACTIVE',
  'ENTRY_WITHDRAWN',
  'PIN_VERSION_OUTDATED',
  'JUDGE_SESSION_INVALID',
  'STALE_REVISION',
  'SCHEMA_MISMATCH',
  'IDEMPOTENCY_KEY_REUSED',
] as const satisfies readonly ErrorCode[];

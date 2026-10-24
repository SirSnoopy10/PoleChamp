import type { z } from 'zod';
import { FIELD_ERROR_CODES, type FieldErrorCode } from './errors/codes.js';

export interface FieldIssue {
  field: string;
  code: FieldErrorCode;
}

const FIELD_CODES = new Set<string>(FIELD_ERROR_CODES);

/** Ścieżka zod → notacja pola z 03-api §1.1, np. `criteria[0].value`. */
function fieldPath(path: readonly PropertyKey[]): string {
  return path.reduce<string>(
    (acc, key) => (typeof key === 'number' ? `${acc}[${key}]` : acc ? `${acc}.${String(key)}` : String(key)),
    '',
  );
}

/**
 * Mapuje błędy zod na `errors[]` odpowiedzi `VALIDATION_FAILED` (kody z 03-api §1.3).
 * Komunikat zod jest kodem pola; pozostałe przypadki mapujemy z typu błędu.
 */
export function toFieldIssues(error: z.ZodError): FieldIssue[] {
  return error.issues.flatMap((issue): FieldIssue[] => {
    if (issue.code === 'unrecognized_keys') {
      return issue.keys.map((key) => ({ field: fieldPath([...issue.path, key]), code: 'UNKNOWN_FIELD' }));
    }
    const field = fieldPath(issue.path);
    if (issue.code === 'invalid_type' && issue.input === undefined) return [{ field, code: 'REQUIRED' }];
    if (FIELD_CODES.has(issue.message)) return [{ field, code: issue.message as FieldErrorCode }];
    if (issue.code === 'too_small')
      return [{ field, code: issue.origin === 'number' ? 'OUT_OF_RANGE' : 'TOO_SHORT' }];
    if (issue.code === 'too_big')
      return [{ field, code: issue.origin === 'number' ? 'OUT_OF_RANGE' : 'TOO_LONG' }];
    return [{ field, code: 'INVALID_FORMAT' }];
  });
}

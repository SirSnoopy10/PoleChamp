import { z } from 'zod';
import { ERROR_CODES, FIELD_ERROR_CODES } from '../errors/codes.js';

/**
 * Typy podstawowe wspólne dla API i aplikacji (IMP-059). Komunikaty błędów zod to kody pól z 03-api §1.3,
 * a teksty PL generuje aplikacja z kluczy `errors.field.<CODE>`.
 */
export const Uuid = z.uuid({ error: 'INVALID_FORMAT' });

/** UUIDv7 – identyfikatory nadawane przez klienta (mutationId, scoreSheetId). */
export const UuidV7 = z.uuid({ version: 'v7', error: 'INVALID_FORMAT' });

/** Identyfikator zasobu. W dokumentacji przykłady używają skrótów („t1”, „c3_k1”), w produkcji UUID. */
export const Id = z.string().min(1, { error: 'REQUIRED' }).max(64, { error: 'TOO_LONG' });

/** Nagłówek `Idempotency-Key` – dowolny UUID (03-api §1). */
export const IdempotencyKey = Uuid;

export const IsoDate = z.iso.date({ error: 'INVALID_FORMAT' });
export const IsoDateTime = z.iso.datetime({ error: 'INVALID_FORMAT' });

/**
 * Tekst przycinany na końcach (wielokrotne spacje w środku zachowane – decyzja IMP-059) z limitem długości.
 * Pusty po przycięciu → REQUIRED, za krótki → TOO_SHORT, za długi → TOO_LONG.
 */
export function TrimmedString(min: number, max: number) {
  return z
    .string({ error: 'REQUIRED' })
    .trim()
    .superRefine((value, ctx) => {
      if (value.length === 0 && min > 0) ctx.addIssue({ code: 'custom', message: 'REQUIRED' });
      else if (value.length < min) ctx.addIssue({ code: 'custom', message: 'TOO_SHORT' });
      else if (value.length > max) ctx.addIssue({ code: 'custom', message: 'TOO_LONG' });
    });
}

/** Tekst opcjonalny: pusty po przycięciu → null. */
export function OptionalTrimmedString(max: number) {
  return z
    .string()
    .trim()
    .max(max, { error: 'TOO_LONG' })
    .transform((v) => (v.length === 0 ? null : v))
    .nullable()
    .optional();
}

/**
 * Liczba dziesiętna z krokiem 0,5 i zakresem (noty, wagi, punkty karne). W JSON przesyłana jako liczba
 * (`8.5`), nie tekst (03-api §1, TC-SCORING-039).
 */
export function DecimalStep05(min: number, max: number) {
  return z.number({ error: 'INVALID_FORMAT' }).superRefine((value, ctx) => {
    const tenths = value * 10;
    if (Math.abs(tenths - Math.round(tenths)) > 1e-9 || Math.round(tenths) % 5 !== 0) {
      ctx.addIssue({ code: 'custom', message: 'INVALID_STEP' });
    } else if (value < min || value > max) {
      ctx.addIssue({ code: 'custom', message: 'OUT_OF_RANGE' });
    }
  });
}

/** Liczba całkowita z zakresem; poza zakresem → OUT_OF_RANGE, ułamek → INVALID_STEP. */
export function IntInRange(min: number, max: number) {
  return z.number({ error: 'INVALID_FORMAT' }).superRefine((value, ctx) => {
    if (!Number.isInteger(value)) ctx.addIssue({ code: 'custom', message: 'INVALID_STEP' });
    else if (value < min || value > max) ctx.addIssue({ code: 'custom', message: 'OUT_OF_RANGE' });
  });
}

/** Odpowiedź z paginacją kursorową (03-api §1). */
export function CursorPage<T extends z.ZodType>(item: T) {
  return z.object({ items: z.array(item), nextCursor: z.string().nullable() });
}

export const Progress = z.object({
  done: z.number().int().min(0),
  expected: z.number().int().min(0),
  percent: z.number().int().min(0).max(100),
});

export const FieldError = z.object({
  field: z.string(),
  code: z.enum(FIELD_ERROR_CODES),
});

/** Błąd RFC 9457 `application/problem+json` (03-api §1.1). */
export const Problem = z
  .object({
    type: z.string(),
    title: z.string(),
    status: z.number().int(),
    code: z.enum(ERROR_CODES as [string, ...string[]]),
    detail: z.string().optional(),
    instance: z.string().optional(),
    requestId: z.string().optional(),
    errors: z.array(FieldError).optional(),
    retryAfterSeconds: z.number().int().min(0).optional(),
    remainingAttempts: z.number().int().min(0).optional(),
    requiresReset: z.boolean().optional(),
  })
  .loose();

export type Problem = z.infer<typeof Problem>;

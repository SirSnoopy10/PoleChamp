import { zodResolver } from '@hookform/resolvers/zod';
import {
  get,
  useForm,
  type FieldError,
  type FieldValues,
  type Path,
  type UseFormProps,
  type UseFormReturn,
} from 'react-hook-form';
import type { z } from 'zod';
import { FIELD_ERROR_CODES, type FieldErrorCode, type FieldIssue } from '@polechamp/contracts';
import { fieldErrorMessage } from '@polechamp/i18n';

type Params = Record<string, string | number>;
const FIELD_CODES = new Set<string>(FIELD_ERROR_CODES);

/** Kod pola z komunikatu zod (schematy contracts używają kodów jako `message`). */
const toCode = (message: string | undefined): FieldErrorCode =>
  message && FIELD_CODES.has(message) ? (message as FieldErrorCode) : 'INVALID_FORMAT';

export interface ZodFormOptions<T extends FieldValues> extends Omit<UseFormProps<T>, 'resolver'> {
  /** Parametry tekstów błędów per pole, np. `{ name: { min: 3, max: 120 } }`. */
  errorParams?: Partial<Record<Path<T>, Params>>;
}

export interface ZodForm<T extends FieldValues> extends UseFormReturn<T> {
  /** Tekst PL błędu pola (`errors.field.<CODE>`) albo `undefined`. */
  fieldError: (name: Path<T>) => string | undefined;
  /** Błędy `errors[]` z odpowiedzi API (`VALIDATION_FAILED`, np. `START_NUMBER_TAKEN`) → pola formularza. */
  applyApiErrors: (issues: readonly FieldIssue[]) => void;
}

/** react-hook-form + resolver zod ze schematów `@polechamp/contracts` (IMP-207 krok 5). */
export function useZodForm<S extends z.ZodType<FieldValues, FieldValues>>(
  schema: S,
  { errorParams, ...options }: ZodFormOptions<z.input<S>> = {},
): ZodForm<z.input<S>> {
  type T = z.input<S>;
  const form = useForm<T>({ mode: 'onBlur', ...options, resolver: zodResolver(schema as never) as never });
  // Odczyt w trakcie renderu subskrybuje błędy (formState to proxy react-hook-form).
  const errors = form.formState.errors;
  const fieldError = (name: Path<T>) => {
    const error = get(errors, name) as FieldError | undefined;
    if (!error) return undefined;
    if (error.type === 'api' && error.message) return error.message;
    const code = toCode(error.message);
    // Puste pole: „To pole jest wymagane.” przed „Nieprawidłowy format.” (np. e-mail – UX-22).
    const value: unknown = form.getValues(name);
    const empty = value === undefined || value === null || (typeof value === 'string' && !value.trim());
    return fieldErrorMessage(
      code === 'INVALID_FORMAT' && empty ? 'REQUIRED' : code,
      errorParams?.[name] ?? {},
    );
  };
  const applyApiErrors = (issues: readonly FieldIssue[]) => {
    for (const issue of issues) {
      form.setError(issue.field as Path<T>, {
        type: 'api',
        message: fieldErrorMessage(issue.code, errorParams?.[issue.field as Path<T>] ?? {}),
      });
    }
  };
  return Object.assign(form, { fieldError, applyApiErrors });
}

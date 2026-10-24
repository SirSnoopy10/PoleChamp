import type { ErrorCode, FieldErrorCode } from '@polechamp/contracts';
import { errors } from './locales/pl/errors.js';

type Params = Readonly<Record<string, string | number>>;

function interpolate(template: string, params: Params): string {
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in params ? String(params[name]) : whole,
  );
}

/**
 * Tekst PL dla kodu błędu API (TC-I18N-007). `PIN_LOCKED` z `requiresReset` ma osobny komunikat.
 * Bez aplikacji i18next – używane też przez API (e-maile) i testy.
 */
export function errorMessage(
  code: ErrorCode,
  params: Params = {},
  options: { requiresReset?: boolean } = {},
): string {
  const template =
    code === 'PIN_LOCKED' && options.requiresReset ? errors.PIN_LOCKED_requiresReset : errors[code];
  return interpolate(template, params);
}

/** Komunikat pod polem formularza dla `errors[].code` (03-api §1.3). */
export function fieldErrorMessage(code: FieldErrorCode, params: Params = {}): string {
  return interpolate(errors.field[code], params);
}

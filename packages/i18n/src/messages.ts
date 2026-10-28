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

/** „znak / znaki / znaków” wg polskich reguł liczby mnogiej (UX-20). */
export function charsWord(n: number): string {
  if (n === 1) return 'znak';
  const d = n % 10;
  const dd = n % 100;
  return d >= 2 && d <= 4 && (dd < 12 || dd > 14) ? 'znaki' : 'znaków';
}

/**
 * Komunikat pod polem formularza dla `errors[].code` (03-api §1.3). Odmiana „znaków” z `min`/`max`;
 * `kind: 'password'` – „Hasło musi mieć min. …”; krok domyślnie 0,5.
 */
export function fieldErrorMessage(code: FieldErrorCode, params: Params = {}): string {
  const template =
    code === 'TOO_SHORT' && params.kind === 'password' ? errors.field.PASSWORD_TOO_SHORT : errors.field[code];
  return interpolate(template, {
    step: '0,5',
    ...params,
    ...(typeof params.min === 'number' ? { chars: charsWord(params.min) } : {}),
    ...(typeof params.max === 'number' ? { maxChars: charsWord(params.max) } : {}),
  });
}

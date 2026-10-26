import { createInstance, type i18n as I18n } from 'i18next';
import { common, email, pdf } from './locales/pl/common.js';
import { errors } from './locales/pl/errors.js';
import { judge } from './locales/pl/judge.js';
import { org } from './locales/pl/org.js';
import { toasts } from './locales/pl/toasts.js';
import { ui } from './locales/pl/ui.js';
import { pseudoDictionary } from './pseudo.js';

/** @polechamp/i18n – teksty PL dla aplikacji, PDF i e-maili (IMP-069, IMP-070). */
export const PACKAGE_NAME = '@polechamp/i18n';

export const NAMESPACES = ['common', 'org', 'judge', 'errors', 'toasts', 'pdf', 'email', 'ui'] as const;
export type Namespace = (typeof NAMESPACES)[number];

export const pl = { common, org, judge, errors, toasts, pdf, email, ui } as const;

export interface CreateI18nOptions {
  /** Pseudolokalizacja do testów układu (NFR-604). */
  pseudo?: boolean;
}

/** Instancja i18next: język `pl`, placeholdery `{nazwa}` jak w specyfikacji ekranów. */
export function createI18n(options: CreateI18nOptions = {}): I18n {
  const instance = createInstance();
  const resources = options.pseudo ? pseudoDictionary(pl as never) : pl;
  void instance.init({
    lng: 'pl',
    fallbackLng: 'pl',
    ns: [...NAMESPACES],
    defaultNS: 'common',
    resources: { pl: resources as Record<string, Record<string, unknown>> },
    interpolation: { escapeValue: false, prefix: '{', suffix: '}' },
    initAsync: false,
    returnNull: false,
  });
  return instance;
}

export * from './plural.js';
export * from './format.js';
export * from './tie-break.js';
export * from './pseudo.js';
export * from './keys.js';
export * from './messages.js';

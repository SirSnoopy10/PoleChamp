import { useMemo, type ReactNode } from 'react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import {
  createI18n,
  formatTournamentDate,
  plural,
  type Namespace,
  type PluralForms,
  type pl,
} from '@polechamp/i18n';
import { Text, type TextProps } from '../ui/Text';

/** Typowane klucze `t('ns:klucz')` ze słowników `@polechamp/i18n` (IMP-219). */
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: typeof pl;
    interpolationPrefix: '{';
    interpolationSuffix: '}';
  }
}

/** Instancja aplikacji: język `pl`, bez wykrywania języka urządzenia w MVP. */
export const i18n = createI18n();

export function I18nProvider({ children, pseudo = false }: { children: ReactNode; pseudo?: boolean }) {
  const instance = useMemo(() => (pseudo ? createI18n({ pseudo: true }) : i18n), [pseudo]);
  return <I18nextProvider i18n={instance}>{children}</I18nextProvider>;
}

/** Hook tłumaczeń przestrzeni (domyślnie `ui`); klucze z innych przestrzeni przez `ns:klucz`. */
export function useT(namespace: Namespace = 'ui') {
  return useTranslation(namespace).t;
}

/** Liczebnik z odmianą (1 ocena, 2 oceny, 5 ocen) – formy z `plural()` (NFR-603). */
export function Plural({ n, forms, ...text }: { n: number; forms: PluralForms } & TextProps) {
  return (
    <Text tabular {...text}>
      {plural(n, forms)}
    </Text>
  );
}

/** Data turnieju („12–13 września 2026” / „Data do ustalenia”). */
export function TournamentDate({
  start,
  end = null,
  ...text
}: { start: string | null; end?: string | null } & TextProps) {
  return <Text {...text}>{formatTournamentDate(start, end)}</Text>;
}

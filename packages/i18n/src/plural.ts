/** Kategorie liczby mnogiej CLDR dla polskiego (liczby całkowite). */
export type PluralCategory = 'one' | 'few' | 'many';

export function pluralCategory(n: number): PluralCategory {
  const abs = Math.abs(n);
  if (abs === 1) return 'one';
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return 'few';
  return 'many';
}

export interface PluralForms {
  one: string;
  few: string;
  many: string;
}

/** „1 kategoria”, „2 kategorie”, „5 kategorii” (TC-I18N-001). */
export function plural(n: number, forms: PluralForms): string {
  return `${n} ${forms[pluralCategory(n)]}`;
}

/** Słowa używane w interfejsie (lista turniejów, rankingi, panel sędziego). */
export const words = {
  category: { one: 'kategoria', few: 'kategorie', many: 'kategorii' },
  athlete: { one: 'zawodniczka', few: 'zawodniczki', many: 'zawodniczek' },
  score: { one: 'ocena', few: 'oceny', many: 'ocen' },
  judge: { one: 'sędzia', few: 'sędziów', many: 'sędziów' },
} as const satisfies Record<string, PluralForms>;

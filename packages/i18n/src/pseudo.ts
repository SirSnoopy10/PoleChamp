/** Pseudolokalizacja (NFR-604, TC-I18N-009): diakrytyki, wydłużenie ≥ 30 % i nawiasy, placeholdery bez zmian. */
const ACCENTS: Readonly<Record<string, string>> = {
  a: 'ą',
  c: 'ć',
  e: 'ę',
  l: 'ł',
  n: 'ń',
  o: 'ó',
  s: 'ś',
  z: 'ż',
  A: 'Ą',
  C: 'Ć',
  E: 'Ę',
  L: 'Ł',
  N: 'Ń',
  O: 'Ó',
  S: 'Ś',
  Z: 'Ż',
};

export function pseudoText(text: string, expansion = 0.4): string {
  const parts = text.split(/(\{[^}]+\})/);
  const accented = parts
    .map((p) => (p.startsWith('{') ? p : [...p].map((ch) => ACCENTS[ch] ?? ch).join('')))
    .join('');
  const padding = '~'.repeat(Math.ceil(text.length * expansion));
  return `[${accented}${padding}]`;
}

type Dict = { [key: string]: string | Dict };

/** Słownik z każdym tekstem przetworzonym przez `pseudoText`. */
export function pseudoDictionary<T extends Dict>(dict: T, expansion = 0.4): T {
  return Object.fromEntries(
    Object.entries(dict).map(([k, v]) => [
      k,
      typeof v === 'string' ? pseudoText(v, expansion) : pseudoDictionary(v, expansion),
    ]),
  ) as T;
}

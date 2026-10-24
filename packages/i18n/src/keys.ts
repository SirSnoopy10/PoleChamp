type Dict = { [key: string]: string | Dict };

const PLURAL_SUFFIX = /_(one|few|many|other|zero)$/;

/** Wszystkie klucze słownika w notacji `ns:a.b` (formy liczby mnogiej zwinięte do klucza bazowego). */
export function dictionaryKeys(namespaces: Readonly<Record<string, Dict>>): Set<string> {
  const keys = new Set<string>();
  const walk = (ns: string, dict: Dict, prefix: string) => {
    for (const [k, v] of Object.entries(dict)) {
      const path = prefix ? `${prefix}.${k}` : k;
      if (typeof v === 'string') keys.add(`${ns}:${path.replace(PLURAL_SUFFIX, '')}`);
      else walk(ns, v, path);
    }
  };
  for (const [ns, dict] of Object.entries(namespaces)) walk(ns, dict, '');
  return keys;
}

/** Klucze użyte w kodzie: `t('ns:key')` / `t("ns:key", …)` / `i18nKey="ns:key"`. */
export function usedKeys(source: string): Set<string> {
  const re = /(?:\bt\(\s*|i18nKey=)['"]([a-z][\w-]*:[\w.]+)['"]/g;
  return new Set([...source.matchAll(re)].map((m) => m[1] as string));
}

/** Kompletność słownika (TC-I18N-004): brakujące i nieużywane klucze. */
export function diffKeys(used: ReadonlySet<string>, available: ReadonlySet<string>) {
  return {
    missing: [...used].filter((k) => !available.has(k)).sort(),
    unused: [...available].filter((k) => !used.has(k)).sort(),
  };
}

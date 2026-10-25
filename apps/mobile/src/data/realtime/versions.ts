/**
 * Ostatnie znane wersje per klucz (IMP-216 krok 5): zdarzenia dostarczane „co najmniej raz”,
 * bez kolejności – starsze lub powtórzone wersje są ignorowane.
 */
export function createVersionGate() {
  const seen = new Map<string, number>();
  return {
    /** `true`, gdy wersja jest nowsza od znanej (i zapamiętuje ją). */
    accept(key: string, version: number): boolean {
      const known = seen.get(key);
      if (known !== undefined && version <= known) return false;
      seen.set(key, version);
      return true;
    },
    /** Wersja znana lokalnie z REST/migawki (np. po pobraniu wyników). */
    note(key: string, version: number) {
      const known = seen.get(key);
      if (known === undefined || version > known) seen.set(key, version);
    },
  };
}

export type VersionGate = ReturnType<typeof createVersionGate>;

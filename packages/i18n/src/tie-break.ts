/** Biernik nazw kryteriów z szablonów (07-reguly §8) – „Remis rozstrzyga wyższa ocena za Technikę.” */
const ACCUSATIVE: Readonly<Record<string, string>> = {
  Technika: 'Technikę',
  'Artyzm / interpretacja muzyki': 'Artyzm / interpretację muzyki',
  Choreografia: 'Choreografię',
  'Płynność i przejścia': 'Płynność i przejścia',
  'Wrażenie ogólne': 'Wrażenie ogólne',
  'Praca na podłodze': 'Pracę na podłodze',
};

/**
 * Zdanie objaśnienia rankingu (SCR-ORG-08, TC-I18N-010). Dla nazwy bez znanej odmiany wariant bezpieczny:
 * „…wyższa ocena w kryterium „Flow”.”
 */
export function tieBreakSentence(criterionName: string): string {
  const accusative = ACCUSATIVE[criterionName.trim()];
  return accusative
    ? `Remis rozstrzyga wyższa ocena za ${accusative}.`
    : `Remis rozstrzyga wyższa ocena w kryterium „${criterionName.trim()}”.`;
}

import { ERROR_CODES, FIELD_ERROR_CODES } from '@polechamp/contracts';
import { describe, expect, it } from 'vitest';
import {
  createI18n,
  ensurePluralRules,
  diffKeys,
  dictionaryKeys,
  errorMessage,
  fieldErrorMessage,
  formatDecimal,
  formatRange,
  formatTournamentDate,
  pl,
  plural,
  pluralCategory,
  pseudoText,
  quote,
  tieBreakSentence,
  usedKeys,
  words,
} from '../src/index.js';

describe('@polechamp/i18n (IMP-069)', () => {
  it('TC-I18N-001: liczba mnoga CLDR pl', () => {
    const ns = [0, 1, 2, 4, 5, 12, 14, 21, 22, 25, 112, 122];
    expect(ns.map((n) => plural(n, words.category))).toEqual([
      '0 kategorii',
      '1 kategoria',
      '2 kategorie',
      '4 kategorie',
      '5 kategorii',
      '12 kategorii',
      '14 kategorii',
      '21 kategorii',
      '22 kategorie',
      '25 kategorii',
      '112 kategorii',
      '122 kategorie',
    ]);
    expect([1, 3, 5].map((n) => plural(n, words.athlete))).toEqual([
      '1 zawodniczka',
      '3 zawodniczki',
      '5 zawodniczek',
    ]);
    expect([1, 22, 11].map((n) => plural(n, words.score))).toEqual(['1 ocena', '22 oceny', '11 ocen']);
    // Zgodność z Intl.PluralRules, którego używa i18next.
    const intl = new Intl.PluralRules('pl');
    for (let n = 0; n <= 200; n++) expect(pluralCategory(n), String(n)).toBe(intl.select(n));
  });

  it('TC-I18N-002: daty i zakresy dat', () => {
    expect([
      formatTournamentDate('2027-04-18'),
      formatTournamentDate('2026-10-03', '2026-10-04'),
      formatTournamentDate('2026-09-30', '2026-10-01'),
      formatTournamentDate('2026-12-31', '2027-01-01'),
      formatTournamentDate(null),
      formatTournamentDate('2027-04-18', '2027-04-18'),
    ]).toEqual([
      '18 kwietnia 2027',
      '3–4 października 2026',
      '30 września – 1 października 2026',
      '31 grudnia 2026 – 1 stycznia 2027',
      'Data do ustalenia',
      '18 kwietnia 2027',
    ]);
    expect(() => formatTournamentDate('18.04.2027')).toThrow();
  });

  it('TC-I18N-003: liczby, minus, półpauza i cudzysłowy', () => {
    expect(formatDecimal(54.25, 2)).toBe('54,25');
    expect(formatDecimal(-1.5, 1)).toBe('−1,5');
    expect(formatRange(1, 20)).toBe('1–20');
    expect(quote('Zakończyć turniej?')).toBe('„Zakończyć turniej?”');
  });

  it('TC-I18N-004: kompletność słownika – klucze użyte w kodzie vs słownik', () => {
    const available = dictionaryKeys({ toasts: pl.toasts, judge: pl.judge });
    expect(available.has('judge:rejectedBanner')).toBe(true);
    const source = `
      toast.show(t('toasts:tournamentCreated'));
      <Trans i18nKey="judge:submitButton" />
      t("judge:rejectedBanner", { count: 3 });
      t('toasts:doesNotExist');
    `;
    const { missing, unused } = diffKeys(usedKeys(source), available);
    expect(missing).toEqual(['toasts:doesNotExist']);
    expect(unused).toContain('toasts:pinCopied');
    expect(unused).not.toContain('judge:rejectedBanner');
  });

  it('TC-I18N-008: teksty z liczbą mnogą w panelu sędziego', () => {
    const i18n = createI18n();
    expect([1, 3, 5].map((count) => i18n.t('judge:rejectedBanner', { count }))).toEqual([
      '1 ocena nie została przyjęta – kategoria zakończona',
      '3 oceny nie zostały przyjęte – kategoria zakończona',
      '5 ocen nie zostało przyjętych – kategoria zakończona',
    ]);
    expect([1, 2, 5].map((count) => i18n.t('judge:logoutUnsent', { count }).split('.')[0])).toEqual([
      'Masz 1 niewysłaną ocenę',
      'Masz 2 niewysłane oceny',
      'Masz 5 niewysłanych ocen',
    ]);
    expect(i18n.t('judge:offlineQueue', { count: 3 })).toBe('Brak sieci · 3 w kolejce');
  });

  it('TC-I18N-007: komunikat dla każdego kodu błędu API i pola', () => {
    for (const code of ERROR_CODES) expect(errorMessage(code), code).toMatch(/\S/);
    expect(errorMessage('START_NUMBER_TAKEN', { nr: 47 })).toBe('Numer 47 jest już zajęty.');
    expect(errorMessage('LIMIT_EXCEEDED', { max: 12 })).toBe('Osiągnięto limit (12).');
    expect(errorMessage('PIN_LOCKED', { s: 30 })).toBe('Zbyt wiele prób. Spróbuj za 30 s.');
    expect(errorMessage('PIN_LOCKED', {}, { requiresReset: true })).toBe(
      'PIN zablokowany. Poproś organizatora o reset.',
    );
    expect(errorMessage('START_NUMBER_TAKEN')).toBe('Numer {nr} jest już zajęty.');
    for (const code of FIELD_ERROR_CODES) expect(fieldErrorMessage(code), code).toMatch(/\S/);
    expect(fieldErrorMessage('OUT_OF_RANGE', { min: 1, max: 20 })).toBe('Wartość spoza zakresu 1–20.');
  });

  it('TC-I18N-009: pseudolokalizacja +30 %', () => {
    const text = 'Zapisano ocenę: {name}';
    const pseudo = pseudoText(text);
    expect(pseudo.length).toBeGreaterThanOrEqual(Math.ceil(text.length * 1.3));
    expect(pseudo).toContain('{name}');
    expect(pseudo).toMatch(/^\[Żąpiśąńó óćęńę: \{name\}~+\]$/);
    const i18n = createI18n({ pseudo: true });
    expect(i18n.t('toasts:tournamentCreated')).toMatch(/^\[Utwórżóńó turńięj~+\]$/);
    expect(dictionaryKeys(pl as never).size).toBeGreaterThan(80);
  });

  it('TC-I18N-010: odmiana nazwy kryterium rozstrzygającego', () => {
    expect(tieBreakSentence('Technika')).toBe('Remis rozstrzyga wyższa ocena za Technikę.');
    expect(tieBreakSentence('Flow')).toBe('Remis rozstrzyga wyższa ocena w kryterium „Flow”.');
    const i18n = createI18n();
    expect(i18n.t('org:rankingFormula', { tieBreak: tieBreakSentence('Technika') })).toBe(
      'Wynik = średnia sędziów z (kryterium × waga − kary). Remis rozstrzyga wyższa ocena za Technikę.',
    );
  });
});

describe('liczebniki bez Intl.PluralRules (Hermes)', () => {
  it('ensurePluralRules: zamiennik z regułą PL, gdy silnik nie ma PluralRules', () => {
    const original = Intl.PluralRules;
    try {
      // Symulacja Hermesa.
      delete (Intl as { PluralRules?: unknown }).PluralRules;
      ensurePluralRules();
      const t = createI18n().getFixedT('pl', 'ui');
      expect(t('card.categories', { count: 1, pct: 0 })).toBe('1 kategoria · 0%');
      expect(t('card.categories', { count: 3, pct: 50 })).toBe('3 kategorie · 50%');
      expect(t('card.categories', { count: 9, pct: 80 })).toBe('9 kategorii · 80%');
      expect(t('card.athletes', { count: 22, style: 'Pole Art', level: 'Pro' })).toBe(
        'Pole Art · Pro · 22 zawodniczki',
      );
    } finally {
      (Intl as { PluralRules?: unknown }).PluralRules = original;
    }
  });

  it('ensurePluralRules nie podmienia natywnego PluralRules', () => {
    const native = Intl.PluralRules;
    ensurePluralRules();
    expect(Intl.PluralRules).toBe(native);
  });
});

describe('UX-20 / UX-45: odmiana w komunikatach pól', () => {
  it('„znak / znaki / znaków” i komunikat hasła', () => {
    expect(fieldErrorMessage('TOO_SHORT', { min: 1 })).toBe('Za krótki tekst (min. 1 znak).');
    expect(fieldErrorMessage('TOO_SHORT', { min: 3 })).toBe('Za krótki tekst (min. 3 znaki).');
    expect(fieldErrorMessage('TOO_SHORT', { min: 12 })).toBe('Za krótki tekst (min. 12 znaków).');
    expect(fieldErrorMessage('TOO_SHORT', { min: 10, kind: 'password' })).toBe(
      'Hasło musi mieć min. 10 znaków.',
    );
    expect(fieldErrorMessage('TOO_LONG', { max: 22 })).toBe('Za długi tekst (maks. 22 znaki).');
    expect(fieldErrorMessage('INVALID_STEP')).toBe('Wartość musi być wielokrotnością 0,5.');
  });
});

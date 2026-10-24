/** Teksty wspólne: statusy (02-model-danych §1), przyciski, stany pustych list. */
export const common = {
  tournamentStatus: { DRAFT: 'W przygotowaniu', IN_PROGRESS: 'Trwa', FINISHED: 'Zakończona' },
  categoryStatus: { DRAFT: 'W przygotowaniu', IN_PROGRESS: 'Trwa', LOCKED: 'Zakończona' },
  entryStatus: { ACTIVE: '—', WITHDRAWN: 'Wycofana' },
  noScores: 'brak ocen',
  provisional: 'wstępny',
  judgesCount: '{n}/{total} sędziów',
  cancel: 'Anuluj',
  save: 'Zapisz',
  delete: 'Usuń',
  dateTbd: 'Data do ustalenia',
} as const;

/** Panel organizatora (05-ekrany-organizatora) – teksty potrzebne pakietom współdzielonym. */
export const org = {
  rankingFormula: 'Wynik = średnia sędziów z (kryterium × waga − kary). {tieBreak}',
  noStartedCategories: 'Brak rozpoczętych kategorii',
  progressSummary: '{done} z {expected} ocen w rozpoczętych kategoriach',
  maxJudgeScore: 'Maksymalny wynik sędziego: {max} pkt',
} as const;

/** PDF z wynikami (ADR-009). */
export const pdf = {
  footer: 'Wersja wyników {version} · suma kontrolna {hash}',
  provisional: 'wstępny',
} as const;

/** E-maile transakcyjne (IMP-119 uzupełni treści). */
export const email = {
  verifySubject: 'Kod weryfikacyjny PoleChamp: {code}',
  resetSubject: 'Ustaw nowe hasło w PoleChamp',
} as const;

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
  version: 'Wersja wyników {version}',
  provisional: 'wstępny',
  title: 'Wyniki',
  categoryTitle: '{name} · {status}',
  columns: {
    rank: '#',
    number: 'Nr',
    athlete: 'Zawodniczka',
    club: 'Klub',
    score: 'Wynik',
    judges: 'Sędziowie',
  },
  withdrawn: 'Wycofana',
  noScores: 'brak ocen',
  unplayed: 'Nie rozegrano: {names}',
  noCategories: 'Brak kategorii',
  pseudonym: 'Zawodniczka nr {number}',
  generatedAt: 'Wygenerowano {date}',
  page: 'Strona {page} z {pages}',
  personalData:
    'Dokument zawiera dane osobowe uczestniczek – udostępniaj wyłącznie w celu ogłoszenia wyników zawodów.',
  fileName: 'wyniki-{slug}.pdf',
} as const;

/** E-maile transakcyjne (IMP-119). */
export const email = {
  greeting: 'Dzień dobry, {name}!',
  signature: 'Zespół PoleChamp',
  verifySubject: 'Kod weryfikacyjny PoleChamp: {code}',
  verifyBody:
    'Twój kod weryfikacyjny to {code}. Wpisz go w aplikacji PoleChamp. Kod jest ważny przez 24 godziny.',
  accountExistsSubject: 'Konto PoleChamp już istnieje',
  accountExistsBody:
    'Ktoś (być może Ty) próbował założyć konto PoleChamp na ten adres e-mail. Konto już istnieje – zaloguj się w aplikacji albo zresetuj hasło. Jeśli to nie Ty, zignoruj tę wiadomość.',
  resetSubject: 'Ustaw nowe hasło w PoleChamp',
  resetBody:
    'Aby ustawić nowe hasło, otwórz link: {link}. Link jest ważny przez 1 godzinę. Jeśli to nie Ty prosiłaś/prosiłeś o zmianę hasła, zignoruj tę wiadomość.',
  deletionSubject: 'Twoje konto PoleChamp zostanie usunięte',
  deletionBody:
    'Przyjęliśmy wniosek o usunięcie konta. Konto jest już nieaktywne, a dane zostaną trwale usunięte {date}.',
} as const;

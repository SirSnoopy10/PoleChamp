/**
 * Komunikaty kodów błędów API (03-api §1.2) i kodów pól (§1.3). Placeholdery w notacji `{nazwa}`.
 * Kody techniczne bez tekstu w dokumentacji („–”) dostają komunikat ogólny.
 */
const GENERIC = 'Coś poszło nie tak. Spróbuj ponownie.';
const SESSION_EXPIRED = 'Sesja wygasła. Zaloguj się ponownie.';

export const errors = {
  VALIDATION_FAILED: 'Sprawdź zaznaczone pola.',
  INVALID_CREDENTIALS: 'Nieprawidłowy e-mail lub hasło.',
  ACCOUNT_LOCKED: 'Za dużo prób. Spróbuj za chwilę.',
  CODE_INVALID: 'Kod jest nieprawidłowy lub wygasł.',
  RESET_TOKEN_INVALID: 'Link wygasł. Poproś o nowy.',
  ACTIVE_TOURNAMENT_EXISTS: 'Najpierw zakończ trwający turniej.',
  UNAUTHENTICATED: SESSION_EXPIRED,
  TOKEN_REUSED: SESSION_EXPIRED,
  FORBIDDEN: 'Nie masz dostępu do tego turnieju.',
  NOT_FOUND: 'Nie znaleziono.',
  CONFLICT_VERSION: 'Ktoś zmienił te dane. Odśwież i spróbuj ponownie.',
  INVALID_STATE_TRANSITION: 'Tej operacji nie można wykonać w obecnym statusie.',
  TOURNAMENT_FINISHED: 'Turniej jest zakończony.',
  CATEGORY_NOT_STARTED: 'Ta kategoria jeszcze się nie rozpoczęła',
  CATEGORY_LOCKED: 'Kategoria zakończona — tylko podgląd',
  CRITERIA_LOCKED: 'Kryteria są zablokowane po rozpoczęciu kategorii.',
  START_REQUIREMENTS_NOT_MET: 'Dodaj co najmniej jedną zawodniczkę.',
  START_NUMBER_TAKEN: 'Numer {nr} jest już zajęty.',
  HAS_SCORES: 'Nie można usunąć – są już oceny.',
  MIN_CRITERIA: 'Kategoria musi mieć co najmniej jedno kryterium.',
  LIMIT_EXCEEDED: 'Osiągnięto limit ({max}).',
  JUDGE_NAME_TAKEN: 'Sędzia o tym imieniu i nazwisku już istnieje.',
  JUDGE_NOT_IN_PANEL: 'Nie jesteś w panelu tej kategorii.',
  PIN_INVALID: 'Nieprawidłowy PIN — spróbuj ponownie',
  PIN_LOCKED: 'Zbyt wiele prób. Spróbuj za {s} s.',
  PIN_LOCKED_requiresReset: 'PIN zablokowany. Poproś organizatora o reset.',
  DEVICE_REVOKED: 'To urządzenie zostało odłączone od turnieju.',
  PAIRING_CODE_INVALID: 'Kod jest nieprawidłowy lub wygasł.',
  IDEMPOTENCY_KEY_REUSED: GENERIC,
  EMAIL_NOT_VERIFIED: 'Potwierdź adres e-mail, aby rozpocząć turniej.',
  RATE_LIMITED: 'Za dużo prób. Spróbuj za chwilę.',
  LOCK_WARNINGS: 'Są brakujące oceny',
  STALE_REVISION: 'Ocena zmieniona na innym urządzeniu.',
  SCHEMA_MISMATCH: 'Formularz jest nieaktualny. Synchronizuję…',
  PIN_VERSION_OUTDATED: 'PIN został zmieniony. Zaloguj się ponownie.',
  JUDGE_SESSION_INVALID: 'Sesja sędziego jest nieważna. Zaloguj się ponownie.',
  JUDGE_INACTIVE: 'Twój profil został wyłączony przez organizatora.',
  ENTRY_WITHDRAWN: 'Zawodniczka wycofana',
  CURSOR_EXPIRED: GENERIC,
  EMAIL_TAKEN: GENERIC,
  INTERNAL: GENERIC,
  /** Błędy po stronie klienta (aplikacja, IMP-214) – bez kodu API. */
  client: {
    NETWORK: 'Brak połączenia z internetem.',
    TIMEOUT: 'Serwer nie odpowiada. Spróbuj ponownie.',
  },
  field: {
    REQUIRED: 'To pole jest wymagane.',
    TOO_SHORT: 'Za krótki tekst (min. {min} {chars}).',
    /** Pole hasła (`errorParams: { kind: 'password' }`) – UX-45. */
    PASSWORD_TOO_SHORT: 'Hasło musi mieć min. {min} {chars}.',
    TOO_LONG: 'Za długi tekst (maks. {max} {maxChars}).',
    OUT_OF_RANGE: 'Wartość spoza zakresu {min}–{max}.',
    INVALID_STEP: 'Wartość musi być wielokrotnością {step}.',
    INVALID_FORMAT: 'Nieprawidłowy format.',
    PASSWORD_BREACHED: 'To hasło wyciekło w innym serwisie. Wybierz inne.',
    PASSWORD_INCORRECT: 'Nieprawidłowe hasło.',
    DATE_RANGE: 'Data zakończenia nie może być wcześniejsza niż data rozpoczęcia.',
    UNKNOWN_FIELD: 'Nieznane pole.',
  },
} as const;

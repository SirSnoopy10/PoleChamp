# Bezpieczeństwo i ochrona danych

> Dokument: `01-architecture/05-bezpieczenstwo.md` · Wersja 1.0 · 23.10.2026
> Powiązane: [ADR-005](adr/ADR-005-uwierzytelnianie-sedziego-pin.md), [ADR-008](adr/ADR-008-uwierzytelnianie-organizatora.md), [03-api.md](03-api.md), [NFR-4xx/5xx](../02-specification/08-wymagania-niefunkcjonalne.md)
> Poziom docelowy (zaktualizowany przez Tech Leada – TL-26): **OWASP ASVS 5.0 L2** dla API (wersja 5.0.0 z maja 2025 zastępuje 4.0.3), **OWASP MASVS 2.x** dla aplikacji mobilnej z profilem testów **MAS-L1** oraz wybranymi testami profilu MAS-L2 dla MASVS-AUTH, MASVS-CRYPTO i przechowywania kluczy (Keychain/Keystore). Wyjątek świadomy: MASVS-STORAGE-1 w profilu L2 wymaga szyfrowania danych lokalnych – w MVP baza SQLite tabletu nie jest szyfrowana (ryzyko R-06).

## 1. Model zagrożeń (skrót STRIDE)

| Zagrożenie | Przykład w PoleChamp | Środki zaradcze |
|---|---|---|
| **S**poofing | Osoba postronna podaje się za sędziego na tablecie; obcy telefon próbuje PIN-ów przez API | Parowanie urządzenia (sekret 256 bit) jako pierwszy czynnik, PIN jako drugi; PIN-ów nie da się sprawdzić bez tokenu urządzenia; limity prób |
| **T**ampering | Zmiana noty po fakcie; manipulacja wynikiem po stronie klienta | Serwer liczy wynik oficjalny; arkusz ma jednego autora; rewizje tylko do dopisywania; blokada kategorii; suma SHA-256 wyników ostatecznych w PDF |
| **R**epudiation | Sędzia twierdzi, że nie wystawił oceny | `score_sheet_revision` z sesją, urządzeniem, trybem uwierzytelnienia (online/offline), czasem klienta i serwera; `audit_log` |
| **I**nformation disclosure | Wyciek danych zawodniczek (niepełnoletnich); sędzia podgląda noty innych | Minimalizacja danych; TLS; szyfrowanie w spoczynku; RBAC; sędzia widzi tylko swoje arkusze (`change_log.audience`); brak PII w logach i w Sentry |
| **D**enial of service | Zalew żądań parowania / PIN; brak sieci w hali | Rate limiting (Redis); offline-first; auto-skalowanie ECS; WAF na ALB |
| **E**levation of privilege | Token urządzenia użyty do akcji organizatora; organizator innego turnieju | Typ tokenu w JWT (`typ`), guardy NestJS per endpoint, sprawdzanie `owner_id`/`tournament_id` w każdym zapytaniu (polityka „scoped repository”) |

## 2. Uwierzytelnianie organizatora

- E-mail + hasło: min. 10 znaków, sprawdzanie na liście haseł wyciekłych. **Decyzja Tech Leada (Q-12, TL-41):** k-anonimowe zapytanie do API zakresów HIBP Pwned Passwords (`GET https://api.pwnedpasswords.com/range/{5 znaków SHA-1}`, nagłówek `Add-Padding: true`, bez klucza API i bez limitu – wg dokumentacji HIBP), timeout 1,5 s; przy błędzie lub przekroczeniu czasu – lokalna lista 100 000 najczęstszych haseł dołączona do obrazu API (fail-safe, bez blokowania rejestracji). Do HIBP trafia tylko 5-znakowy prefiks skrótu, który nie jest daną osobową. Hash **Argon2id** (m = 19 MiB, t = 2, p = 1); obliczenia w puli wątków libuv (`UV_THREADPOOL_SIZE=8`), a limity prób są sprawdzane **przed** liczeniem hasha (ochrona CPU przed zalewem logowań).
- Weryfikacja e-maila 6-cyfrowym kodem (ważny 24 h, maks. 5 prób na kod, ponowne wysłanie co najmniej co 60 s i maks. 5 / h – nowy kod unieważnia poprzedni). Bez weryfikacji można konfigurować turniej, ale nie można go rozpocząć – ani bezpośrednio, ani przez start pierwszej kategorii (`EMAIL_NOT_VERIFIED`).
- Tokeny: **access JWT ES256, 15 min** (claims: `sub`, `typ=org`, `iat`, `exp`, `jti`); **refresh token** nieprzezroczysty, 256 bit, 30 dni, rotowany przy każdym użyciu. Ponowne użycie unieważnia całą rodzinę (`TOKEN_REUSED`) i wylogowuje wszystkie sesje.
- Przechowywanie na urządzeniu: `expo-secure-store` (iOS Keychain `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`, Android Keystore).
- Blokada konta: 5 nieudanych logowań w 15 min daje blokadę na 15 min. Każde kolejne 5 nieudanych prób podwaja czas blokady (maks. 24 h). Do tego limit per IP.
- Reset hasła: link z tokenem jednorazowym (1 h). Po resecie unieważnienie wszystkich refresh tokenów.
- Opcjonalnie (v1.1): Sign in with Apple / Google, 2FA TOTP.
- Uzasadnienie wyboru własnego modułu zamiast IdP: [ADR-008](adr/ADR-008-uwierzytelnianie-organizatora.md).

## 3. Model PIN sędziego

### 3.1 Zasady
| Element | Decyzja |
|---|---|
| Format | 4 cyfry (zgodnie z designem: „Wpisz 4-cyfrowy PIN”) |
| Generowanie | Losowo przez serwer (CSPRNG) przy dodaniu sędziego lub resecie; zakazane wzorce: wszystkie cyfry równe (0000…9999), ciągi rosnące/malejące (0123…, 9876…), rok 19xx/20xx, PIN-y demo z prototypu (1234, 2345, 3456, 4567, 5678); unikalny w obrębie turnieju |
| Wyświetlenie | Jednorazowo organizatorowi (SCR-ORG-15) z możliwością skopiowania; potem tylko reset |
| Przechowywanie na serwerze | `pin_hash` = Argon2id; `pin_version` |
| Pierwszy czynnik | Sparowane urządzenie: token `device` jest wymagany do `POST /v1/judge-sessions`; bez niego PIN-u nie da się sprawdzić |
| Sesja | Token `judge` (JWT ES256, 12 h, claims: `sub=judgeId`, `dev=deviceId`, `trn=tournamentId`, `sid=sessionId`, `typ=judge`). Jedna aktywna sesja sędziego naraz – nowe logowanie zamyka poprzednią (`session.revoked: REPLACED`) |
| Ponowne uwierzytelnienie | Po 15 min w tle lub 2 h bezczynności tablet wraca do SCR-JDG-02 dla tego samego sędziego (bez wyboru profilu). Szkic formularza zostaje zachowany |
| Wylogowanie | Ikona „sign-out” w nagłówku. Przy niewysłanych ocenach dialog SCR-JDG-09. Outbox należy do urządzenia, więc wysyłka trwa po wylogowaniu |

### 3.2 Limity prób
| Poziom | Reguła |
|---|---|
| Lokalny (tablet, także offline) | 5 błędnych prób dla danego profilu daje blokadę 30 s. Każda kolejna seria 5 błędów podwaja czas (60 s, 120 s … maks. 15 min). Licznik zapisany w SQLite (odporny na restart aplikacji) |
| Globalny (serwer) | 10 błędnych prób dla sędziego (suma ze wszystkich urządzeń, także z raportów offline `PIN_ATTEMPTS_REPORT`) daje `pin_locked_at` i odpowiedź 423 `requiresReset: true`. Odblokowanie: organizator resetuje PIN (SCR-ORG-14) |
| Per urządzenie | 30 błędnych prób w 10 min (wszystkie profile) daje blokadę urządzenia na 10 min i zdarzenie `device.status` z flagą podejrzanej aktywności |

### 3.3 Weryfikacja offline
- **Schemat zmieniony przez Tech Leada (TL-04, [ADR-005](adr/ADR-005-uwierzytelnianie-sedziego-pin.md)):** pierwotny wzór `PBKDF2(PIN, salt ‖ pepper_urządzenia)` liczony przy wydaniu migawki był niewykonalny, bo serwer nie zna PIN-u po jego wygenerowaniu. Obowiązuje:
  1. Przy wygenerowaniu PIN-u (dodanie sędziego, reset) serwer liczy **raz** `pin_offline_verifier = PBKDF2-HMAC-SHA256(PIN, pin_offline_salt, 600 000)` i zapisuje go obok `pin_hash` (Argon2id).
  2. Przy parowaniu urządzenie dostaje losowy `pinPepper` (32 B), przechowywany w SecureStore/Keystore (nie w SQLite).
  3. W migawce i w `sync/changes` urządzenie dostaje `wrapped = AES-256-GCM(K_dev, pin_offline_verifier, aad = judgeId ‖ pinVersion)`, gdzie `K_dev = HKDF-SHA256(pinPepper, info = "pc-pin-v1")`. Koszt po stronie serwera: jedno szyfrowanie AES na sędziego i urządzenie (mikrosekundy).
  4. Logowanie offline: tablet odszyfrowuje weryfikator kluczem z Keystore, liczy `PBKDF2(wpisany PIN, salt, 600 000)` natywnie (`react-native-quick-crypto`) i porównuje stałoczasowo.
  Właściwość bezpieczeństwa jest taka sama jak w projekcie pierwotnym: atak offline wymaga jednocześnie bazy SQLite i peppera z Keystore. Wyciek bazy serwera ujawnia weryfikator PIN-u, ale 4-cyfrowy PIN jest i tak odtwarzalny z `pin_hash` – ochroną PIN-u na serwerze pozostają limity prób i brak dostępu do bazy.
- Logowanie offline jest dozwolone, jeśli: `tournament.allow_offline_pin_login = true`, ostatnia pełna synchronizacja < 24 h, urządzenie nie jest unieważnione (wg ostatniej wiedzy), sędzia nie ma `pin_locked` i `pin_version` jest zgodny.
- **Zegar a okno 24 h (TL-21):** tablet zapisuje przy synchronizacji czas serwera i licznik monotoniczny urządzenia (czas od uruchomienia systemu). Bez restartu systemu upływ czasu liczony jest z licznika monotonicznego (odporny na przestawienie zegara). Po restarcie używany jest zegar ścienny, a cofnięcie zegara poniżej czasu ostatniej synchronizacji jest traktowane jak przekroczenie okna (logowanie wymaga sieci).
- **Ryzyko zaakceptowane:** 4-cyfrowy PIN ma 10 000 kombinacji, więc przy przejęciu urządzenia z rootem i wydobyciu weryfikatora oraz peppera atak słownikowy jest wykonalny w minutach. Mitygacje: (1) pepper w Keychain/Keystore, a nie w bazie, (2) koszt 600k iteracji na każdą próbę, (3) weryfikator ważny tylko na jednym urządzeniu i dla jednej wersji PIN-u, (4) organizator może unieważnić urządzenie i zresetować PIN-y, (5) każda ocena offline jest oznaczona `OFFLINE_PIN` w audycie i widoczna organizatorowi, (6) zasięg szkody ogranicza się do ocen w jednym turnieju.
- Wyłączenie logowania offline (`allow_offline_pin_login = false`) jest dostępne dla organizatorów o podwyższonych wymaganiach (v1.1 w UI, MVP przez wsparcie).

### 3.4 Urządzenia
- Parowanie: kod 8 znaków (alfabet 31 znaków bez 0/O/1/I/L), ważny 10 min, maks. 10 użyć, hash w bazie. QR zawiera `polechamp://pair?c=…&t=…`.
- Wyjątek operacyjny (TL-40): na potrzeby przeglądu App Store / Google Play operator może narzędziem CLI utworzyć **turniej do przeglądu** (bez danych osobowych, zawodniczki fikcyjne) z kodem parowania ważnym do 30 dni. Kod jest wpisany w notatki dla recenzenta i unieważniany po decyzji sklepu. Kody turniejów organizatorów zawsze mają 10 min.
- Sekret urządzenia 256 bit, w bazie tylko SHA-256. Token `device` (JWT, 1 h) odświeżany sekretem.
- Unieważnienie przez organizatora powoduje 401 `DEVICE_REVOKED` przy każdym żądaniu, zdarzenie `session.revoked` i czyszczenie danych lokalnych. Wcześniej tablet próbuje wysłać outbox (odrzucenia trafiają do organizatora).
- Tryb sędziego blokuje zrzuty ekranu? **Nie** w MVP (zrzuty mogą być przydatne do zgłaszania błędów). Q-09 dla PO.

## 4. Autoryzacja – macierz uprawnień

Legenda: ✔ – dozwolone, ✘ – zabronione, ◐ – warunkowo (opis w kolumnie), „v1.1” – rola przyszła.

| Operacja | Organizator (właściciel) | Urządzenie (bez sędziego) | Sędzia (sesja) | Sędzia główny (v1.1) | Publiczny (v2) |
|---|---|---|---|---|---|
| Tworzenie / edycja / usuwanie turnieju | ✔ (usuwanie tylko DRAFT) | ✘ | ✘ | ✘ | ✘ |
| Start / zakończenie turnieju | ✔ | ✘ | ✘ | ✘ | ✘ |
| Kategorie: tworzenie, edycja, usuwanie | ✔ (wg statusu) | ✘ | ✘ | ✘ | ✘ |
| Kryteria i kary: edycja | ◐ tylko kategoria DRAFT | ✘ | ✘ | ✘ | ✘ |
| Start / blokada / odblokowanie kategorii | ✔ | ✘ | ✘ | v1.1: zatwierdza blokadę | ✘ |
| Zawodniczki: dodawanie, edycja, wycofanie | ✔ (nie w LOCKED / FINISHED) | ✘ | ✘ | ✘ | ✘ |
| Odczyt listy startowej | ✔ | ✔ (imię, nazwisko, klub, nr) | ✔ | ✔ | ◐ tylko opublikowane |
| Sędziowie: dodawanie, reset PIN | ✔ | ✘ | ✘ | ✘ | ✘ |
| Parowanie i unieważnianie urządzeń | ✔ | ◐ tylko własne parowanie kodem | ✘ | ✘ | ✘ |
| Logowanie sędziego PIN-em | ✘ | ✔ | – | ✔ | ✘ |
| Wystawienie / aktualizacja własnej oceny | ✘ | ✘ | ◐ kategoria IN_PROGRESS, sędzia w panelu | ◐ jak sędzia | ✘ |
| Odczyt własnych ocen | – | ✘ | ✔ | ✔ | ✘ |
| Odczyt ocen innych sędziów | ✔ (SCR-ORG-19) | ✘ | ✘ | v1.1: ✔ w swojej kategorii | ✘ |
| Edycja ocen sędziów | ✘ (tylko przyjęcie odrzuconego zgłoszenia) | ✘ | ✘ | ✘ | ✘ |
| Ranking na żywo | ✔ | ✘ | ✘ | v1.1: ✔ | v2: ◐ po publikacji |
| Eksport PDF | ✔ | ✘ | ✘ | ✘ | ✘ |
| Audyt | ✔ (odczyt) | ✘ | ✘ | ✘ | ✘ |
| Odrzucone zgłoszenia: przyjmij / odrzuć | ✔ | ✘ | ✘ | ✘ | ✘ |

**Wyjątek RODO (TL-17):** sprostowanie danych osobowych zawodniczki i „Usuń dane osobowe” (FR-904) są dozwolone dla organizatora także w kategorii `LOCKED` i turnieju `FINISHED` (prawa osób z art. 16–17 RODO). Operacje nie zmieniają wyników.

### 4.1 Macierz endpointów × typ tokenu (uzupełnienie TL-07/TL-08, podstawa testów TC-AUTHZ)

Reguły odpowiedzi dla odmowy (jednolite dla wszystkich endpointów):
- brak tokenu lub token nieważny/wygasły → `401 UNAUTHENTICATED`; urządzenie unieważnione → `401 DEVICE_REVOKED`;
- token niewłaściwego typu (np. `device` na endpoincie organizatora, `org` na `/sync/*`) → `403 FORBIDDEN`;
- token właściwego typu, ale zasób innego właściciela / innego turnieju → `404 NOT_FOUND` (nie ujawniamy istnienia zasobu);
- warunki stanu (status kategorii, panel itd.) są sprawdzane **po** autoryzacji i dają kody 409/403 z §1.2 w [03-api.md](03-api.md#12-katalog-kodów-błędów).

| Grupa endpointów ([03-api.md](03-api.md)) | Bez tokenu | `org` właściciel | `org` inny | `device` tego turnieju | `device` innego turnieju | `judge` (sesja) |
|---|---|---|---|---|---|---|
| `POST /auth/register`, `/auth/verify-email`, `/auth/login`, `/auth/refresh`, `/auth/password/*`, `GET /app-config` | ✔ (limity) | ✔ | ✔ | ✔ | ✔ | ✔ |
| `POST /auth/logout`, `/auth/verify-email/resend`, `GET/PATCH/DELETE /me` | 401 | ✔ (własne konto) | ✔ (własne konto) | 403 | 403 | 403 |
| `GET /tournaments`, `POST /tournaments` | 401 | ✔ (tylko własne) | ✔ (tylko własne) | 403 | 403 | 403 |
| `GET/PATCH/DELETE /tournaments/{id}`, `POST …/start`, `POST …/finish` | 401 | ✔ | 404 | 403 | 403 | 403 |
| Kategorie, kryteria, kary (`/tournaments/{id}/categories`, `/categories/*`, `/criteria/*`, `/penalty-types/*`) | 401 | ✔ (wg statusu) | 404 | 403 | 403 | 403 |
| Zawodniczki (`/categories/{id}/entries`, `/entries/*` w tym `withdraw`, `restore`, `anonymize`) | 401 | ✔ (wg statusu) | 404 | 403 | 403 | 403 |
| Sędziowie (`/tournaments/{id}/judges`, `/judges/*`, `…/pin/reset`) | 401 | ✔ | 404 | 403 | 403 | 403 |
| `POST /tournaments/{id}/pairing-codes`, `GET /tournaments/{id}/devices`, `PATCH/DELETE /devices/{id}` | 401 | ✔ | 404 | 403 | 403 | 403 |
| `POST /devices/pair` | ✔ (kod parowania, limit) | ✔ | ✔ | ✔ | ✔ | ✔ |
| `POST /devices/token` | ✔ (sekret urządzenia) | – | – | – | – | – |
| `POST /devices/me/heartbeat` | 401 | 403 | 403 | ✔ | – (token dotyczy własnego urządzenia) | ✔ (token zawiera `deviceId`) |
| Wyniki, oceny, rewizje, odrzucone, eksporty, audyt (`/categories/{id}/results`, `/tournaments/{id}/results`, `/entries/{id}/score-sheets`, `/score-sheets/{id}/revisions`, `/rejected-submissions/*`, `/exports/*`, `/tournaments/{id}/audit-log`) | 401 | ✔ | 404 | 403 | 403 | 403 |
| `GET /sync/snapshot` | 401 | 403 | 403 | ✔ | 404 | ✔ |
| `GET /sync/changes` | 401 | 403 | 403 | ✔ (bez arkuszy) | 404 | ✔ (arkusze tylko własne) |
| `POST /judge-sessions` | 401 | 403 | 403 | ✔ | 404 (sędzia innego turnieju) | ✔ |
| `DELETE /judge-sessions/current`, `GET /judge/me/score-sheets` | 401 | 403 | 403 | 403 | 403 | ✔ (tylko własne) |
| `POST /sync/push` | 401 | 403 | 403 | ✔ | 404 (mutacje dla zasobów innego turnieju → `REJECTED`) | ✔ |
| WebSocket `/rt` – `subscribe { tournamentId }` | odmowa handshake | pokoje `tournament:{id}` i `org:{id}` | odmowa (`FORBIDDEN`) | pokoje `tournament:{id}` i `device:{id}` | odmowa | pokoje `tournament:{id}` i `device:{id}` |

Organizator nie ma żadnego endpointu zmiany noty ani arkusza (jedyny wyjątek: `POST /rejected-submissions/{id}/accept`, którego treść pochodzi od sędziego).

Implementacja: guardy NestJS (`@Roles('org')`, `@TournamentOwner()`, `@DeviceOfTournament()`, `@JudgeInPanel()`). Każde repozytorium przyjmuje kontekst (`ownerId` / `tournamentId`) i filtruje po nim (brak zapytań „globalnych” w ścieżkach użytkownika). Testy autoryzacji są obowiązkowe dla każdego endpointu (macierz powyżej to podstawa testów kontraktowych).

## 5. Ochrona danych osobowych (RODO)

### 5.1 Role prawne
- **Organizator zawodów** jest **administratorem** danych zawodniczek i sędziów (to on zbiera zgłoszenia i ustala cel: przeprowadzenie zawodów i ogłoszenie wyników).
- **Operator PoleChamp** jest **podmiotem przetwarzającym** (art. 28 RODO) – umowa powierzenia jest częścią regulaminu, a jej akceptacja jest wymagana przy rejestracji (`terms_version`).
- Dla danych kont organizatorów PoleChamp jest administratorem.
- **Do weryfikacji przez prawnika (Q-10):** treść umowy powierzenia, podstawy prawne po stronie organizatora (zwykle art. 6 ust. 1 lit. b – umowa udziału w zawodach, oraz lit. f – publikacja wyników), sposób odbierania zgód opiekunów.

### 5.2 Zakres danych (minimalizacja)
| Osoba | Dane w systemie | Nie zbieramy |
|---|---|---|
| Zawodniczka | imię i nazwisko (lub pseudonim sceniczny), klub/szkoła, numer startowy, opcjonalnie rok urodzenia, flaga „niepełnoletnia”, potwierdzenie zgody opiekuna, oceny i komentarze sędziów | PESEL, adres, telefon, e-mail, pełna data urodzenia, zdjęcia, wideo, dane o zdrowiu |
| Sędzia | imię i nazwisko, inicjały, hash PIN-u, dzienniki sesji | kontakt (organizator ma go poza systemem) |
| Organizator | e-mail, nazwa wyświetlana, hasło (hash), adres IP w audycie (90 dni) | – |

### 5.3 Niepełnoletnie
- Zawodniczki w wieku 7–17 lat są typowe (np. kategorie dziecięce i juniorskie [S9][S2] – [02-reguly-oceniania-w-pole-sport.md](../00-research/02-reguly-oceniania-w-pole-sport.md)).
- Niepełnoletnie **nie korzystają z aplikacji** w MVP, więc art. 8 RODO (zgoda dziecka na usługi społeczeństwa informacyjnego, w Polsce próg 16 lat [S34]) nie ma bezpośredniego zastosowania. Organizator potwierdza jednak, że ma zgodę opiekuna na przetwarzanie danych (checkbox przy `is_minor = true`, FR-406).
- Publiczne wyniki (v2): dla niepełnoletnich domyślnie **inicjał nazwiska** („Julia K.”), pełne nazwisko tylko po zaznaczeniu zgody na publikację.
- PDF z wynikami jest dokumentem wewnętrznym organizatora. Na pierwszej stronie stopka: „Dokument zawiera dane osobowe. Udostępniaj zgodnie z regulaminem zawodów.”

### 5.4 Prawa osób i retencja
| Proces | Realizacja |
|---|---|
| Dostęp / eksport | Organizator eksportuje dane zawodniczki (JSON/PDF) – v1.1; w MVP przez wsparcie (SLA 14 dni) |
| Sprostowanie | Edycja zawodniczki (SCR-ORG-17), z audytem |
| Usunięcie | W DRAFT – usunięcie startu bez ocen. Po ocenach – **pseudonimizacja** (wyniki zostają z etykietą „Zawodniczka nr 47”) |
| Retencja | Dane osobowe zawodniczek i sędziów pseudonimizowane automatycznie **24 miesiące** po zakończeniu turnieju (wartość domyślna, do potwierdzenia – Q-10). Wyniki zagregowane bez nazwisk są zachowane. Konto organizatora: usunięcie 30 dni po wniosku. Audyt: 36 miesięcy. Logi aplikacyjne: 30 dni. Kopie zapasowe: 35 dni. **Uzupełnienie TL-16:** zadanie retencji (rola bazy `pc_retention`) usuwa też dane osobowe z `audit_log.before/after` i `score_sheet_revision.snapshot` w tym samym terminie co pseudonimizację oraz zeruje `audit_log.ip` po 90 dniach; partycje `audit_log` starsze niż 36 mies. są odłączane i usuwane. Kopie zapasowe wygasają same po 35 dniach – po tym czasie dane pseudonimizowane nie występują w żadnej kopii |
| Lokalizacja danych | AWS eu-central-1 (Frankfurt). Sentry – region danych UE. E-maile – SES eu-central-1. Brak transferów poza EOG |
| Rejestr czynności | Prowadzony przez operatora (podmiot przetwarzający – art. 30 ust. 2) |
| Naruszenia | Procedura: wykrycie → ocena w 24 h → powiadomienie administratora (organizatora) bez zbędnej zwłoki, aby mógł zgłosić naruszenie do PUODO w 72 h |

### 5.5 Dane na urządzeniach
- Tablet: SQLite przechowuje imiona i nazwiska, kluby i numery (bez roku urodzenia). Baza chroniona szyfrowaniem urządzenia (iOS Data Protection, Android FBE). Szyfrowanie SQLCipher **nie** w MVP (koszt wydajności i integracji) – ryzyko opisane w [99-przekazanie-dla-tech-leada.md](99-przekazanie-dla-tech-leada.md).
- Po zakończeniu turnieju i pełnej synchronizacji tablet usuwa dane turnieju po 7 dniach (lub od razu przez „Odłącz urządzenie”).
- Telefon organizatora: cache zapytań (MMKV) czyszczony przy wylogowaniu.
- Żadnych danych osobowych w logach, analityce ani w zdarzeniach Sentry (scrubbing pól `fullName`, `club`, `email`, `comment`).

## 6. Audyt zmian i integralność wyników

| Mechanizm | Opis |
|---|---|
| `audit_log` | Każda operacja zmieniająca stan: kto (typ, ID), kiedy, z jakiego urządzenia, przed/po (bez sekretów). Tylko dopisywanie |
| `score_sheet_revision` | Pełna historia każdej oceny z trybem uwierzytelnienia, sesją i czasem klienta. Organizator widzi ją w SCR-ORG-19 („Historia zmian”, Should) |
| Wynik oficjalny | Liczony tylko na serwerze; `client_total` z tabletu porównywany i logowany przy rozbieżności |
| Blokada | Po blokadzie arkusze są niezmienne. Zmiana wymaga odblokowania (audyt `CATEGORY_UNLOCKED` z opcjonalnym powodem) |
| Suma kontrolna | `final_results_hash` = SHA-256 kanonicznego JSON (posortowane klucze, liczby całkowite w setnych) wyników kategorii przy blokadzie. **Zawartość (doprecyzowanie TL-16):** `categoryId`, `resultsVersion`, `aggregationMethod`, `judgeCount` oraz dla każdego startu `entryId`, `startNumber`, `entryStatus`, `rank`, `officialHundredths`, `sheetCount`, `isComplete` – **bez** imion, nazwisk i klubów, dzięki czemu pseudonimizacja nie zmienia sumy. Drukowana w stopce PDF wraz z `results_version` – umożliwia późniejszą weryfikację wydruku |
| Zegar | Czas serwera jest autorytatywny. Czas klienta zapisywany informacyjnie, a różnica > 5 min oznaczana w audycie |
| Brak edycji not przez organizatora | Organizator nie ma endpointu zmiany noty. Jedyny wyjątek to przyjęcie odrzuconego zgłoszenia (treść pochodzi od sędziego) |

## 7. Bezpieczeństwo techniczne

| Obszar | Wymaganie |
|---|---|
| Transport | TLS 1.2+ (preferowany 1.3), HSTS na domenie API, certyfikaty ACM. Certificate pinning – nie w MVP (ryzyko zablokowania przy rotacji), rozważyć w v2 |
| Nagłówki | `Strict-Transport-Security`, `X-Content-Type-Options`, brak CORS dla domen spoza listy (web v2) |
| Walidacja | Każde wejście walidowane schematem zod (długości, zakresy, enumy). Odrzucanie nieznanych pól (`strict`) |
| SQL | Wyłącznie zapytania parametryzowane (Drizzle). Rola aplikacyjna bez uprawnień DDL |
| Sekrety | AWS Secrets Manager. Klucze JWT (ES256) rotowane co 90 dni z `kid` w nagłówku. Brak sekretów w repozytorium (skan gitleaks w CI) |
| Zależności | Dependabot / Renovate, `pnpm audit` w CI (blokada na high/critical), SBOM (CycloneDX) w każdym wydaniu |
| Infrastruktura | Prywatne podsieci dla RDS/Redis, Security Groups minimalne, AWS WAF (reguły zarządzane + limit), GuardDuty, CloudTrail |
| Kopie | RDS PITR 35 dni, codzienny snapshot kopiowany do drugiego regionu UE (eu-west-1), test odtworzenia raz na kwartał |
| Aplikacja mobilna | Brak sekretów w bundlu, `expo-secure-store` dla tokenów, wyłączone logi debug w produkcji, ochrona przed nakładkami (Android `filterTouchesWhenObscured` dla klawiatury PIN) |
| Testy | SAST (Semgrep) w CI, DAST (OWASP ZAP baseline) na staging przed wydaniem, test penetracyjny zewnętrzny przed pierwszym turniejem produkcyjnym |

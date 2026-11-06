# API – kontrakt REST i kanały realtime

> Dokument: `01-architecture/03-api.md` · Wersja 1.0 · 23.10.2026
> Decyzja o stylu: [ADR-003](adr/ADR-003-styl-api-rest-i-websocket.md). Model danych: [02-model-danych.md](02-model-danych.md). Bezpieczeństwo i macierz uprawnień: [05-bezpieczenstwo.md](05-bezpieczenstwo.md). Synchronizacja: [06-offline-i-synchronizacja.md](06-offline-i-synchronizacja.md).

## 1. Styl i konwencje

- **REST/JSON nad HTTPS**, prefiks wersji `/v1`, kontrakt w **OpenAPI 3.1** generowany ze schematów zod 4 (`@polechamp/contracts`, generator `@asteasolutions/zod-to-openapi`); NestJS 12 waliduje wejście tymi samymi schematami przez Standard Schema ([ADR-012](adr/ADR-012-kontrakty-walidacja-i-openapi.md)). Klient mobilny korzysta z typów wygenerowanych z OpenAPI (`openapi-typescript` + `openapi-fetch`).
- Dlaczego REST, a nie GraphQL/RPC: zasoby i ekrany są proste (lista → szczegóły → arkusz), komendy offline mapują się na idempotentne `PUT` z kluczem nadanym przez klienta, a cache HTTP, monitoring i limitowanie per ścieżka są trywialne. Publiczny kontrakt przyda się też przyszłemu widokowi webowemu i partnerom (import list startowych). Uzasadnienie i alternatywy: [ADR-003](adr/ADR-003-styl-api-rest-i-websocket.md).
- **Nazewnictwo:** ścieżki w liczbie mnogiej, kebab-case; pola JSON w camelCase; identyfikatory UUID; daty ISO 8601 (`2026-10-03`), znaczniki czasu UTC (`2026-10-03T09:41:00Z`).
- **Liczby punktowe** w API przesyłane jako **liczby dziesiętne w JSON z co najwyżej 2 miejscami** (`8.5`, `54.25`). Serwer przechowuje je w liczbach całkowitych (dziesiąte/setne). Formatowanie z przecinkiem jest wyłącznie po stronie UI.
- **Uwierzytelnianie:** `Authorization: Bearer <JWT>`. Typy tokenów: `org` (organizator), `device` (sparowany tablet), `judge` (sesja sędziego na urządzeniu – zawiera też `deviceId`).
- **Współbieżność:** zasoby edytowalne zwracają `ETag: W/"<version>"`. `PATCH`/`DELETE` wymagają `If-Match`, a konflikt kończy się kodem `409 CONFLICT_VERSION`.
- **Idempotencja:** `POST` tworzące zasoby przyjmują nagłówek `Idempotency-Key` (UUID, retencja 24 h). Komendy oceniania używają `mutationId` (UUIDv7) w treści ([§5](#5-synchronizacja-i-ocenianie)).
- **Paginacja:** kursorowa (`?cursor=…&limit=50`, odpowiedź `{ items, nextCursor }`) dla audytu i list > 200 elementów. Listy domenowe (kategorie, zawodniczki w kategorii) zwracane w całości (limit techniczny 1 000).
- **Lokalizacja błędów:** API zwraca kody, a teksty PL generuje aplikacja (klucze i18n `errors.<CODE>`).
- **Limity zapytań:** domyślnie 120 żądań / min / token; logowanie 5 / 15 min / konto + 20 / 15 min / IP; parowanie 10 / 10 min / IP; ponowne wysłanie kodu e-mail 1 / 60 s i 5 / h / konto; weryfikacja kodu 5 prób / kod; PIN – patrz [05-bezpieczenstwo.md §3](05-bezpieczenstwo.md#3-model-pin-sędziego).
- **Wersja aplikacji (NFR-706):** każda odpowiedź API zawiera nagłówek `X-Min-App-Version`; pełna konfiguracja w `GET /v1/app-config` (§3.1). Starsza aplikacja pokazuje ekran aktualizacji, ale **nie blokuje** wysyłki outboxu (`/sync/*` działa dla wersji ≥ `minSyncAppVersion`).

### 1.1 Format błędu (RFC 9457 `application/problem+json`)

```json
{
  "type": "https://api.polechamp.app/problems/category-locked",
  "title": "Kategoria jest zablokowana",
  "status": 409,
  "code": "CATEGORY_LOCKED",
  "detail": "Kategoria c3 została zablokowana 2026-10-03T14:02:11Z.",
  "instance": "/v1/sync/push",
  "requestId": "0192f1d4-7a1e-7c3b-9a55-3c1f0e2b8d10",
  "errors": [{ "field": "criteria[0].value", "code": "OUT_OF_RANGE" }]
}
```

### 1.2 Katalog kodów błędów

| Kod | HTTP | Znaczenie | Klucz komunikatu PL (przykład) |
|---|---|---|---|
| `VALIDATION_FAILED` | 422 | Błędne pola (szczegóły w `errors[]`, kody pól w §1.3) | „Sprawdź zaznaczone pola.” |
| `INVALID_CREDENTIALS` | 401 | Zły e-mail lub hasło (bez ujawniania, które) – uzupełnienie TL-08 | „Nieprawidłowy e-mail lub hasło.” |
| `ACCOUNT_LOCKED` | 423 | Blokada konta po 5 nieudanych logowaniach (`retryAfterSeconds`) – FR-107, TL-08 | „Za dużo prób. Spróbuj za chwilę.” |
| `CODE_INVALID` | 400 | Kod weryfikacyjny błędny, wygasły lub wyczerpany limit 5 prób – TL-08 | „Kod jest nieprawidłowy lub wygasł.” |
| `RESET_TOKEN_INVALID` | 400 | Link resetu hasła wygasł lub użyty – TL-08 | „Link wygasł. Poproś o nowy.” |
| `ACTIVE_TOURNAMENT_EXISTS` | 409 | Usunięcie konta przy turnieju w statusie Trwa (FR-106) – TL-08 | „Najpierw zakończ trwający turniej.” |
| `UNAUTHENTICATED` | 401 | Brak/nieważny token | „Sesja wygasła. Zaloguj się ponownie.” |
| `TOKEN_REUSED` | 401 | Ponowne użycie refresh tokenu (unieważnienie rodziny) | j.w. |
| `FORBIDDEN` | 403 | Brak uprawnień do zasobu | „Nie masz dostępu do tego turnieju.” |
| `NOT_FOUND` | 404 | Zasób nie istnieje lub nie należy do użytkownika | „Nie znaleziono.” |
| `CONFLICT_VERSION` | 409 | Nieaktualna wersja (`If-Match`) | „Ktoś zmienił te dane. Odśwież i spróbuj ponownie.” |
| `INVALID_STATE_TRANSITION` | 409 | Niedozwolone przejście statusu | „Tej operacji nie można wykonać w obecnym statusie.” |
| `TOURNAMENT_FINISHED` | 409 | Turniej zakończony – tylko odczyt | „Turniej jest zakończony.” |
| `CATEGORY_NOT_STARTED` | 409 | Ocena w kategorii W przygotowaniu | „Ta kategoria jeszcze się nie rozpoczęła” |
| `CATEGORY_LOCKED` | 409 | Ocena / edycja w zablokowanej kategorii | „Kategoria zakończona – tylko podgląd” |
| `CRITERIA_LOCKED` | 409 | Zmiana kryteriów/kar po starcie | „Kryteria są zablokowane po rozpoczęciu kategorii.” |
| `START_REQUIREMENTS_NOT_MET` | 409 | Brak kryteriów / zawodniczek / sędziów przy starcie (`detail` wskazuje brak) | „Dodaj co najmniej jedną zawodniczkę.” |
| `START_NUMBER_TAKEN` | 409 | Numer startowy zajęty w turnieju | „Numer 47 jest już zajęty.” |
| `HAS_SCORES` | 409 | Usunięcie zasobu z ocenami | „Nie można usunąć – są już oceny.” |
| `MIN_CRITERIA` | 409 | Usunięcie ostatniego kryterium kategorii (FR-306, US-023) – TL-09 | „Kategoria musi mieć co najmniej jedno kryterium.” |
| `LIMIT_EXCEEDED` | 409 | Przekroczony limit NFR-801 / FR-306 (`detail.limit`, `detail.max`), np. 13. kryterium, 21. urządzenie – TL-08 | „Osiągnięto limit ({max}).” |
| `JUDGE_NAME_TAKEN` | 409 | Sędzia o tym imieniu i nazwisku istnieje w turnieju (FR-502) – TL-08 | „Sędzia o tym imieniu i nazwisku już istnieje.” |
| `JUDGE_NOT_IN_PANEL` | 403 | Sędzia spoza panelu kategorii | „Nie jesteś w panelu tej kategorii.” |
| `PIN_INVALID` | 401 | Zły PIN (`remainingAttempts` w treści) | „Nieprawidłowy PIN — spróbuj ponownie” |
| `PIN_LOCKED` | 423 | Blokada prób PIN (`retryAfterSeconds` lub `requiresReset`) | `retryAfterSeconds`: „Zbyt wiele prób. Spróbuj za {s} s.”; `requiresReset`: „PIN zablokowany. Poproś organizatora o reset.” |
| `DEVICE_REVOKED` | 401 | Urządzenie unieważnione przez organizatora | „To urządzenie zostało odłączone od turnieju.” |
| `PAIRING_CODE_INVALID` | 400 | Kod nieprawidłowy lub wygasły | „Kod jest nieprawidłowy lub wygasł.” |
| `IDEMPOTENCY_KEY_REUSED` | 422 | Ten sam klucz z inną treścią | – (błąd programistyczny) |
| `EMAIL_NOT_VERIFIED` | 403 | Akcja wymaga zweryfikowanego e-maila | „Potwierdź adres e-mail, aby rozpocząć turniej.” |
| `RATE_LIMITED` | 429 | Przekroczony limit (`Retry-After`) | „Za dużo prób. Spróbuj za chwilę.” |
| `LOCK_WARNINGS` | 409 | Blokada kategorii bez `force` przy brakujących ocenach / zaległych urządzeniach (treść: `missingSheets`, `devicesWithPending`, `offlineDevices`) | arkusz SCR-ORG-18 |
| `STALE_REVISION` | 409 | `baseRevision` arkusza starsze niż na serwerze (ten sam sędzia na 2 urządzeniach) | „Ocena zmieniona na innym urządzeniu.” (tekst z SCR-JDG-05 – TL-11) |
| `SCHEMA_MISMATCH` | 422 | Arkusz nie pasuje do kryteriów/kar kategorii | „Formularz jest nieaktualny. Synchronizuję…” |
| `PIN_VERSION_OUTDATED` | 409 | Sesja offline zalogowana nieaktualnym PIN-em (PIN zresetowano) | „PIN został zmieniony. Zaloguj się ponownie.” |
| `JUDGE_SESSION_INVALID` | 409 | Mutacja wskazuje sesję sędziego nieznaną serwerowi, zamkniętą albo należącą do innego urządzenia – TL-12 | „Sesja sędziego jest nieważna. Zaloguj się ponownie.” |
| `JUDGE_INACTIVE` / `ENTRY_WITHDRAWN` | 409 | Sędzia zdezaktywowany / start wycofany | „Twój profil został wyłączony przez organizatora.” / „Zawodniczka wycofana” (TL-11) |
| `CURSOR_EXPIRED` | 410 | Kursor synchronizacji starszy niż retencja `change_log` | – (klient pobiera migawkę) |
| `EMAIL_TAKEN` | – | Tylko wewnętrznie (odpowiedź 202, patrz §3.1) | – |
| `INTERNAL` | 500 | Błąd serwera | „Coś poszło nie tak. Spróbuj ponownie.” |

### 1.3 Kody błędów pól (`errors[].code`) – uzupełnienie TL-08

| Kod | Znaczenie | Przykład |
|---|---|---|
| `REQUIRED` | brak wymaganej wartości | pusta nazwa turnieju, brak zgody opiekuna przy `isMinor` |
| `TOO_SHORT` / `TOO_LONG` | długość poza zakresem | nazwa turnieju < 3 znaków, komentarz > 500 |
| `OUT_OF_RANGE` | liczba poza zakresem | skala 21, waga 5,5, rok urodzenia 1900, numer 10000 |
| `INVALID_STEP` | wartość nie jest wielokrotnością kroku | waga 0,3, nota 8,3 |
| `INVALID_FORMAT` | zły format | e-mail, data, UUID |
| `PASSWORD_BREACHED` | hasło na liście wycieków (HIBP lub lista lokalna) | US-001 |
| `PASSWORD_INCORRECT` | błędne bieżące hasło (`currentPassword` przy zmianie e-maila) | UX-45 |
| `DATE_RANGE` | data końcowa < początkowa | SCR-ORG-02 |
| `UNKNOWN_FIELD` | pole spoza schematu (walidacja `strict`) | – |

Aplikacja mapuje `errors[].field` + `code` na komunikaty pod polami z [05-ekrany-organizatora.md](../02-specification/05-ekrany-organizatora.md) (klucze `errors.field.<CODE>` z parametrami).

## 2. Uprawnienia – oznaczenia w tabelach

| Oznaczenie | Kto | Warunek |
|---|---|---|
| `PUBLIC` | bez tokenu | limitowane |
| `ORG` | token `org` | użytkownik zalogowany |
| `ORG:owner` | token `org` | właściciel turnieju, którego dotyczy zasób |
| `DEV` | token `device` | urządzenie sparowane z turniejem zasobu, nieunieważnione |
| `JDG` | token `judge` | sesja sędziego na urządzeniu, sędzia aktywny w turnieju zasobu |
| `JDG:self` | token `judge` | dodatkowo zasób należy do tego sędziego |

## 3. Endpointy – organizator

### 3.1 Konto i sesja (`auth`)

| Metoda | Ścieżka | Uprawnienia | Opis | Błędy |
|---|---|---|---|---|
| POST | `/v1/auth/register` | PUBLIC | Rejestracja (`email`, `password`, `displayName`, `acceptTerms: true`, `termsVersion`) → 201 + wysłanie e-maila z kodem | 422, 409 `EMAIL_TAKEN`*, 429 |
| POST | `/v1/auth/verify-email` | PUBLIC | `{ email, code }` (6 cyfr, 24 h, maks. 5 prób) → 204 | 400 `CODE_INVALID`, 429 |
| POST | `/v1/auth/verify-email/resend` | ORG | Nowy kod (poprzedni unieważniony), 1 / 60 s, 5 / h → 202 (uzupełnienie TL-07; „Wyślij kod ponownie” w SCR-ORG-13 i banerze SCR-ORG-03) | 429 |
| POST | `/v1/auth/login` | PUBLIC | → `{ accessToken, refreshToken, expiresIn, user }` | 401 `INVALID_CREDENTIALS`, 423 `ACCOUNT_LOCKED`, 429 |
| POST | `/v1/auth/refresh` | PUBLIC (refresh) | Rotacja → nowa para tokenów | 401 `TOKEN_REUSED` |
| POST | `/v1/auth/logout` | ORG | Unieważnia rodzinę refresh tokenu → 204 | – |
| POST | `/v1/auth/password/forgot` | PUBLIC | Zawsze 202 (bez ujawniania istnienia konta) | 429 |
| POST | `/v1/auth/password/reset` | PUBLIC | `{ token, newPassword }` → 204; unieważnia wszystkie refresh tokeny | 400 `RESET_TOKEN_INVALID`, 422 |
| GET | `/v1/me` | ORG | Profil | – |
| PATCH | `/v1/me` | ORG | `displayName`, `locale` | 422 |
| PUT | `/v1/me/email` | ORG | `email`, `currentPassword` → 204; nowy adres niezweryfikowany, kod na nowy adres; adres zajęty – bez zmiany (anty-enumeracja, e-mail „konto istnieje”) – EP-16, UX-45 | 422 (`currentPassword`: `PASSWORD_INCORRECT`) |
| DELETE | `/v1/me` | ORG | Wniosek o usunięcie konta → 202; konto natychmiast nieaktywne, twarde usunięcie po 30 dniach | 409 `ACTIVE_TOURNAMENT_EXISTS` |
| GET | `/v1/app-config` | PUBLIC | `{ minAppVersion, minSyncAppVersion, termsVersion, legal: { termsUrl, privacyUrl, dpaUrl, accountDeletionUrl, supportUrl } }` (uzupełnienie TL-07, NFR-706, FR-903) | – |

\* `EMAIL_TAKEN` zwracany jako 202 z wysłaniem maila „konto już istnieje”, aby nie ujawniać istnienia konta (anty-enumeracja). Kod pozostaje w katalogu na potrzeby testów.

**Przykład – logowanie**
```http
POST /v1/auth/login
Content-Type: application/json

{ "email": "marta@studio-vertical.pl", "password": "••••••••••••" }
```
```json
200 OK
{
  "accessToken": "eyJhbGciOiJFUzI1NiIs…",
  "expiresIn": 900,
  "refreshToken": "rt_4f9c…",
  "user": { "id": "0192f0aa-…", "email": "marta@studio-vertical.pl", "displayName": "Marta", "emailVerified": true }
}
```

### 3.2 Turnieje

| Metoda | Ścieżka | Uprawnienia | Opis | Błędy |
|---|---|---|---|---|
| GET | `/v1/tournaments?status=active\|finished` | ORG | Lista (SCR-ORG-01): `active` = DRAFT + IN_PROGRESS | – |
| POST | `/v1/tournaments` | ORG | Utworzenie (SCR-ORG-02) | 422 |
| GET | `/v1/tournaments/{tournamentId}` | ORG:owner | Szczegóły + statystyki + postęp (SCR-ORG-03). `stats.athletes` = liczba różnych zawodniczek z co najmniej jednym startem `ACTIVE`; `stats.judges` = liczba sędziów aktywnych (TL-34) | 404 |
| PATCH | `/v1/tournaments/{tournamentId}` | ORG:owner | Edycja nazwy/dat/miejsca (SCR-ORG-20) | 409 `TOURNAMENT_FINISHED`, `CONFLICT_VERSION`, 422 |
| DELETE | `/v1/tournaments/{tournamentId}` | ORG:owner | Tylko DRAFT bez ocen | 409 `INVALID_STATE_TRANSITION`, `HAS_SCORES` |
| POST | `/v1/tournaments/{tournamentId}/start` | ORG:owner | DRAFT → IN_PROGRESS | 403 `EMAIL_NOT_VERIFIED`, 409 |
| POST | `/v1/tournaments/{tournamentId}/finish` | ORG:owner | IN_PROGRESS → FINISHED (blokuje kategorie Trwa z sumą kontrolną, zamyka sesje sędziów – `session.revoked: TOURNAMENT_FINISHED`) | 409 `INVALID_STATE_TRANSITION`, `CONFLICT_VERSION` |

**Przykład – lista**
```json
GET /v1/tournaments?status=active → 200
{
  "items": [
    {
      "id": "t1", "name": "Mistrzostwa Polski Pole Sport 2026",
      "status": "IN_PROGRESS", "startDate": "2026-10-03", "endDate": "2026-10-04",
      "venue": "Warszawa, Hala Torwar",
      "categoryCount": 8,
      "progress": { "done": 173, "expected": 215, "percent": 80 }
    },
    {
      "id": "t2", "name": "Puchar Wiosny PoleChamp", "status": "DRAFT",
      "startDate": "2027-04-18", "endDate": null, "venue": "Poznań, Arena",
      "categoryCount": 3, "progress": { "done": 0, "expected": 0, "percent": 0 }
    }
  ]
}
```

**Przykład – utworzenie**
```json
POST /v1/tournaments   (Idempotency-Key: 0192f1…)
{ "name": "Puchar Wiosny PoleChamp", "startDate": "2027-04-18", "endDate": null, "venue": "Poznań, Arena" }

201 Created   ETag: W/"1"
{ "id": "0192f1e2-…", "status": "DRAFT", "name": "Puchar Wiosny PoleChamp", "startDate": "2027-04-18", "endDate": null, "venue": "Poznań, Arena", "version": 1 }
```

**Przykład – szczegóły (dashboard)**
```json
GET /v1/tournaments/t1 → 200
{
  "id": "t1", "name": "Mistrzostwa Polski Pole Sport 2026", "status": "IN_PROGRESS",
  "startDate": "2026-10-03", "endDate": "2026-10-04", "venue": "Warszawa, Hala Torwar", "version": 7,
  "stats": { "categories": 8, "athletes": 61, "judges": 5 },
  "progress": { "done": 173, "expected": 215, "percent": 80, "startedCategories": 5 },
  "pendingRejectedSubmissions": 0,
  "categories": [
    { "id": "c3", "name": "Pole Sport Advanced", "style": "POLE_SPORT", "level": "ADVANCED", "ageGroup": "Senior 18+",
      "status": "IN_PROGRESS", "entryCount": 9, "progress": { "done": 30, "expected": 45, "percent": 67 } }
  ]
}
```

**Przykład – zakończenie**
```json
POST /v1/tournaments/t1/finish   (If-Match: W/"7")
→ 200 { "id": "t1", "status": "FINISHED", "finishedAt": "2026-10-04T19:12:03Z",
        "autoLockedCategoryIds": ["c3","c4","c5"], "unplayedCategoryIds": ["c6","c7","c8"], "version": 8 }
```

### 3.3 Kategorie, kryteria, kary

| Metoda | Ścieżka | Uprawnienia | Opis | Błędy |
|---|---|---|---|---|
| GET | `/v1/tournaments/{tournamentId}/categories` | ORG:owner | Lista z postępem | – |
| POST | `/v1/tournaments/{tournamentId}/categories` | ORG:owner | `{ name, style, level, ageGroup }` → kategoria z kryteriami i karami z szablonu stylu | 409 `TOURNAMENT_FINISHED`, 422 |
| GET | `/v1/categories/{categoryId}` | ORG:owner | Szczegóły: kryteria, kary, `maxJudgeScore`, liczniki, `pendingRejectedSubmissions` (baner „Odrzucone oceny ({n})” w kategorii – TL-35) | 404 |
| PATCH | `/v1/categories/{categoryId}` | ORG:owner | Nazwa, styl, poziom, grupa (styl/poziom – tylko DRAFT) | 409, 422 |
| DELETE | `/v1/categories/{categoryId}` | ORG:owner | Tylko DRAFT | 409 |
| POST | `/v1/categories/{categoryId}/start` | ORG:owner | DRAFT → IN_PROGRESS (+ turniej DRAFT → IN_PROGRESS) | 403 `EMAIL_NOT_VERIFIED` (gdy start kategorii rozpoczyna turniej – TL-10), 409 `START_REQUIREMENTS_NOT_MET`, `TOURNAMENT_FINISHED`, `INVALID_STATE_TRANSITION` |
| POST | `/v1/categories/{categoryId}/lock` | ORG:owner | IN_PROGRESS → LOCKED; `{ force: false }` – bez `force` zwraca 409 `LOCK_WARNINGS` z listą ostrzeżeń, jeśli są braki | 409 |
| POST | `/v1/categories/{categoryId}/unlock` | ORG:owner | LOCKED → IN_PROGRESS; `{ reason?: string }` | 409 `TOURNAMENT_FINISHED` |
| POST | `/v1/categories/{categoryId}/criteria` | ORG:owner | `{ name, scaleMax, weight, description }` | 409 `CRITERIA_LOCKED`, `LIMIT_EXCEEDED` (12), 422 |
| PATCH | `/v1/criteria/{criterionId}` | ORG:owner | j.w. | 409, 422 |
| DELETE | `/v1/criteria/{criterionId}` | ORG:owner | Usunięcie; ostatniego kryterium kategorii nie można usunąć (TL-09 – zgodnie z US-023 i SCR-ORG-09) | 409 `CRITERIA_LOCKED`, `MIN_CRITERIA` |
| POST | `/v1/categories/{categoryId}/penalty-types` | ORG:owner | `{ name, points, maxOccurrences }` | 409 `CRITERIA_LOCKED`, `LIMIT_EXCEEDED` (10), 422 |
| PATCH | `/v1/penalty-types/{penaltyTypeId}` | ORG:owner | j.w. | 409, 422 |
| DELETE | `/v1/penalty-types/{penaltyTypeId}` | ORG:owner | – | 409 |

`LOCK_WARNINGS` (409) zwraca treść `{ missingSheets: 15, devicesWithPending: [{ deviceId, name, pendingMutations, lastSeenAt }], offlineDevices: [...] }`. Aplikacja pokazuje ją w arkuszu SCR-ORG-18. Zbiór urządzeń: nieunieważnione urządzenia turnieju, które od startu kategorii (`last_seen_at ≥ category.started_at`) miały kontakt z serwerem i mają `pending_mutations > 0` (`devicesWithPending`) albo nie odezwały się dłużej niż 2 min (`offlineDevices`) – doprecyzowanie TL-19.

**Przykład – szczegóły kategorii**
```json
GET /v1/categories/c3 → 200   ETag: W/"4"
{
  "id": "c3", "tournamentId": "t1", "name": "Pole Sport Advanced",
  "style": "POLE_SPORT", "level": "ADVANCED", "ageGroup": "Senior 18+",
  "status": "IN_PROGRESS", "aggregationMethod": "MEAN", "tieBreakCriterionId": "c3_k1",
  "maxJudgeScore": 65, "entryCount": 9, "judgeCount": 5,
  "progress": { "done": 30, "expected": 45, "percent": 67 },
  "criteria": [
    { "id": "c3_k1", "name": "Technika", "description": "Siła, elementy na rurze", "scaleMax": 10, "step": 0.5, "weight": 2, "position": 1 },
    { "id": "c3_k2", "name": "Artyzm / interpretacja muzyki", "description": "Muzykalność i wyraz", "scaleMax": 10, "step": 0.5, "weight": 1.5, "position": 2 }
  ],
  "penaltyTypes": [
    { "id": "c3_p1", "name": "Upadek", "points": 2, "maxOccurrences": 3, "position": 1 },
    { "id": "c3_p2", "name": "Przekroczenie czasu", "points": 1, "maxOccurrences": 2, "position": 2 }
  ],
  "version": 4
}
```

**Przykład – blokada z ostrzeżeniami**
```json
POST /v1/categories/c3/lock  { "force": false }
→ 409 { "code": "LOCK_WARNINGS", "status": 409, "title": "Są brakujące oceny",
        "missingSheets": 15,
        "devicesWithPending": [{ "deviceId": "d2", "name": "Tablet stół 2", "pendingMutations": 3, "lastSeenAt": "2026-10-03T13:58:40Z" }] }

POST /v1/categories/c3/lock  { "force": true }
→ 200 { "id": "c3", "status": "LOCKED", "lockedAt": "2026-10-03T14:02:11Z", "resultsVersion": 31,
        "finalResultsHash": "9b1f…e2" }
```

### 3.4 Zawodniczki (lista startowa)

| Metoda | Ścieżka | Uprawnienia | Opis | Błędy |
|---|---|---|---|---|
| GET | `/v1/categories/{categoryId}/entries?q=` | ORG:owner | Lista startowa z liczbą ocen `n/J` | – |
| POST | `/v1/categories/{categoryId}/entries` | ORG:owner | `{ startNumber, fullName, club?, birthYear?, isMinor?, guardianConsentConfirmed? }` – tworzy `athlete` + `entry` na końcu kolejki | 409 `START_NUMBER_TAKEN`, `CATEGORY_LOCKED`, 422 |
| PATCH | `/v1/entries/{entryId}` | ORG:owner | Edycja danych / numeru. W kategorii `LOCKED` i turnieju `FINISHED` dozwolona wyłącznie zmiana danych osobowych (`fullName`, `club`, `birthYear`) – sprostowanie RODO (TL-17) | 409 `START_NUMBER_TAKEN`, `CATEGORY_LOCKED`, `TOURNAMENT_FINISHED`, `CONFLICT_VERSION`, 422 |
| POST | `/v1/entries/{entryId}/withdraw` | ORG:owner | Wycofanie (zachowuje oceny, wyklucza z rankingu) | 409 |
| POST | `/v1/entries/{entryId}/restore` | ORG:owner | Cofnięcie wycofania | 409 |
| DELETE | `/v1/entries/{entryId}` | ORG:owner | Tylko bez ocen | 409 `HAS_SCORES` |
| POST | `/v1/entries/{entryId}/anonymize` | ORG:owner | „Usuń dane osobowe” (FR-904): pseudonimizacja zawodniczki, wynik zostaje; dozwolone także w turnieju `FINISHED` i kategorii `LOCKED` (wyjątek RODO, INT-05 – TL-17) → 200 | 409 `INVALID_STATE_TRANSITION` (już zanonimizowana) |
| PUT | `/v1/categories/{categoryId}/entries/order` | ORG:owner | (v1.1) nowa kolejność `{ entryIds: [] }` | 409 |
| POST | `/v1/categories/{categoryId}/entries/import` | ORG:owner | (v1.1) CSV `multipart/form-data` | 422 |

```json
POST /v1/categories/c3/entries
{ "startNumber": 50, "fullName": "Julia Kamińska", "club": "Aerial Dreams Warszawa", "birthYear": 2009, "isMinor": true, "guardianConsentConfirmed": true }
→ 201 { "id": "e50", "startNumber": 50, "startOrder": 10, "status": "ACTIVE",
        "athlete": { "id": "a50", "fullName": "Julia Kamińska", "club": "Aerial Dreams Warszawa", "isMinor": true },
        "judged": { "done": 0, "expected": 5 } }
```

### 3.5 Sędziowie i urządzenia

| Metoda | Ścieżka | Uprawnienia | Opis | Błędy |
|---|---|---|---|---|
| GET | `/v1/tournaments/{tournamentId}/judges` | ORG:owner | Lista sędziów (bez PIN-ów): `isActive`, `pinLocked`, `sheetCount` (SCR-ORG-14 „Aktywny · {n} ocen”) | – |
| POST | `/v1/tournaments/{tournamentId}/judges` | ORG:owner | `{ fullName }` → 201 z **jednorazowo** zwracanym `pin`; serwer wylicza `pin_hash`, `pin_fingerprint` i `pin_offline_verifier` (TL-04, TL-06) | 409 `TOURNAMENT_FINISHED`, `JUDGE_NAME_TAKEN`, `LIMIT_EXCEEDED` (30), 422 |
| PATCH | `/v1/judges/{judgeId}` | ORG:owner | `fullName`, `initials`, `isActive` (dezaktywacja zamyka aktywną sesję – `session.revoked: JUDGE_DEACTIVATED`) | 409 `JUDGE_NAME_TAKEN`, `TOURNAMENT_FINISHED`, `CONFLICT_VERSION`, 422 |
| POST | `/v1/judges/{judgeId}/pin/reset` | ORG:owner | Nowy losowy PIN (jednorazowo w odpowiedzi), `pinVersion+1`, zdjęcie blokady, zamknięcie sesji | – |
| DELETE | `/v1/judges/{judgeId}` | ORG:owner | Tylko bez ocen (inaczej dezaktywacja) | 409 `HAS_SCORES` |
| POST | `/v1/tournaments/{tournamentId}/pairing-codes` | ORG:owner | → `{ code: "K7QM-4ZTX", qrPayload: "polechamp://pair?c=K7QM4ZTX&t=t1", expiresAt }` | 409 `TOURNAMENT_FINISHED` |
| POST | `/v1/devices/pair` | PUBLIC (limit) | `{ code, deviceName, platform, model, osVersion, appVersion }` → `{ deviceId, deviceSecret, pinPepper, tournament: { id, name } }`. `pinPepper` (32 B, base64) trafia do SecureStore i służy do odszyfrowania weryfikatorów PIN (uzupełnienie TL-05) | 400 `PAIRING_CODE_INVALID`, 409 `LIMIT_EXCEEDED` (20 urządzeń), 429 |
| POST | `/v1/devices/token` | PUBLIC (sekret) | `{ deviceId, deviceSecret }` → `{ deviceToken, expiresIn: 3600 }` | 401 `DEVICE_REVOKED` |
| GET | `/v1/tournaments/{tournamentId}/devices` | ORG:owner | Urządzenia: `online` (połączony WS albo `last_seen_at` < 75 s temu – 2,5 × okres heartbeat; doprecyzowanie TL-35), `lastSeenAt`, `lastSyncAt`, `pendingMutations`, `batteryLevel`, `activeJudge { id, fullName }` | – |
| PATCH | `/v1/devices/{deviceId}` | ORG:owner | Zmiana nazwy | – |
| DELETE | `/v1/devices/{deviceId}` | ORG:owner | Unieważnienie (rozłączenie WS, `session.revoked`) | – |
| POST | `/v1/devices/me/heartbeat` | DEV | `{ pendingMutations, lastSyncCursor, batteryLevel, activeJudgeId }` → 204 (co 30 s gdy online; także przez WS) | 401 |

```json
POST /v1/tournaments/t1/judges  { "fullName": "Katarzyna Nowak" }
→ 201 { "id": "jA", "fullName": "Katarzyna Nowak", "initials": "KN", "isActive": true, "pin": "8306", "pinShownOnce": true }
```

### 3.6 Wyniki, oceny (podgląd organizatora), odrzucenia, eksport, audyt

| Metoda | Ścieżka | Uprawnienia | Opis | Błędy |
|---|---|---|---|---|
| GET | `/v1/categories/{categoryId}/results` | ORG:owner | Ranking (SCR-ORG-08); wiersze aktywne + wycofane na końcu (`entryStatus`), `isProvisional` (D-SC-11) | – |
| GET | `/v1/tournaments/{tournamentId}/results` | ORG:owner | Rankingi wszystkich kategorii (podgląd PDF turnieju) | – |
| GET | `/v1/entries/{entryId}/score-sheets` | ORG:owner | Oceny wszystkich sędziów dla startu (SCR-ORG-19) | – |
| GET | `/v1/score-sheets/{scoreSheetId}/revisions` | ORG:owner | Historia zmian oceny | – |
| GET | `/v1/tournaments/{tournamentId}/rejected-submissions?resolution=PENDING` | ORG:owner | Odrzucone zgłoszenia (SCR-ORG-22) | – |
| POST | `/v1/rejected-submissions/{id}/accept` | ORG:owner | Przyjęcie (wymaga kategorii IN_PROGRESS i startu ACTIVE) – tworzy/aktualizuje arkusz, audyt `actor=ORGANIZER`. Kody `PIN_VERSION_OUTDATED`, `JUDGE_SESSION_INVALID`, `JUDGE_INACTIVE`, `JUDGE_NOT_IN_PANEL` można przyjąć świadomą decyzją organizatora (TL-13) | 409 `CATEGORY_LOCKED`, `CATEGORY_NOT_STARTED`, `ENTRY_WITHDRAWN`, `TOURNAMENT_FINISHED`, `INVALID_STATE_TRANSITION` (już rozstrzygnięte) |
| POST | `/v1/rejected-submissions/{id}/discard` | ORG:owner | Odrzucenie ostateczne | 409 `INVALID_STATE_TRANSITION` |
| POST | `/v1/exports` | ORG:owner | `{ scope: "TOURNAMENT" \| "CATEGORY", tournamentId, categoryId? }` → 202 `{ exportId }` | 422 |
| GET | `/v1/exports/{exportId}` | ORG:owner | `{ status, downloadUrl?, expiresAt?, resultsHash }` (URL podpisany 15 min) | 404 |
| GET | `/v1/tournaments/{tournamentId}/audit-log?cursor=&entityType=` | ORG:owner | Dziennik audytu (v1.1 w UI) | – |

**Przykład – ranking**
```json
GET /v1/categories/c3/results → 200
{
  "categoryId": "c3", "status": "IN_PROGRESS", "resultsVersion": 30, "maxJudgeScore": 65, "judgeCount": 5,
  "formula": "MEAN", "tieBreak": { "criterionId": "c3_k1", "criterionName": "Technika" },
  "rows": [
    { "entryId": "e47", "rank": 1, "startNumber": 47, "fullName": "Natalia Sikora", "club": "Studio Vertical Wrocław", "entryStatus": "ACTIVE",
      "official": 55.5, "display": "55,5", "sheetCount": 3, "isComplete": false, "isProvisional": false, "tieBreak": 8.67 },
    { "entryId": "e42", "rank": 5, "startNumber": 42, "fullName": "Agnieszka Mazur", "club": "PoleFit Kraków",
      "official": 52.7, "display": "52,70", "sheetCount": 5, "isComplete": true },
    { "entryId": "e41", "rank": 6, "startNumber": 41, "fullName": "Zuzanna Król", "club": "Aerial Dreams Warszawa",
      "official": 52.65, "display": "52,65", "sheetCount": 5, "isComplete": true },
    { "entryId": "e48", "rank": null, "startNumber": 48, "fullName": "Lena Mazur", "club": "Aerial Dreams Warszawa",
      "official": null, "display": "—", "sheetCount": 0, "isComplete": false }
  ]
}
```
(Pole `display` jest liczone przez serwer według [07-reguly-punktacji.md §4](../02-specification/07-reguly-punktacji.md#4-zaokrąglenia-i-prezentacja), żeby UI i PDF były identyczne. Wartość `tieBreak` 8.67 jest przykładowa.)

## 4. Endpointy – urządzenie i sędzia

| Metoda | Ścieżka | Uprawnienia | Opis | Błędy |
|---|---|---|---|---|
| GET | `/v1/sync/snapshot` | DEV | Pełna migawka turnieju dla urządzenia (kategorie, kryteria, kary, starty, sędziowie z weryfikatorami PIN), `cursor` | 401 `DEVICE_REVOKED` |
| GET | `/v1/sync/changes?since={cursor}&limit=500` | DEV lub JDG | Zmiany od kursora (`{ changes: [...], cursor, hasMore }`); arkusze: zalogowanego sędziego (token JDG) oraz pochodzące z tego urządzenia (`audience DEVICE:{id}` – TL-49) | 410 `CURSOR_EXPIRED` → pobierz migawkę |
| POST | `/v1/judge-sessions` | DEV | `{ judgeId, pin }` → `{ judgeToken, sessionId, expiresIn: 43200 }` | 401 `PIN_INVALID`, 423 `PIN_LOCKED` |
| DELETE | `/v1/judge-sessions/current` | JDG | Wylogowanie → 204 | – |
| GET | `/v1/judge/me/score-sheets` | JDG | Własne arkusze sędziego w turnieju (po zalogowaniu, uzupełnienie bazy lokalnej) | – |
| POST | `/v1/sync/push` | DEV (+ opcjonalnie JDG) | Paczka mutacji (≤ 100) – patrz §5 | 401, 413, 422 |
| PUT | `/v1/score-sheets/{scoreSheetId}` | JDG:self | **Poza MVP (TL-43):** tablet zawsze wysyła oceny przez outbox i `sync/push` (jedna ścieżka zapisu = mniej błędów). Endpoint może zostać dodany w v1.1 dla klientów online | – |

**Przykład – migawka**
```json
GET /v1/sync/snapshot → 200
{
  "cursor": 48211,
  "serverTime": "2026-10-03T09:41:00Z",
  "tournament": { "id": "t1", "name": "Mistrzostwa Polski Pole Sport 2026", "status": "IN_PROGRESS", "allowOfflinePinLogin": true },
  "judges": [
    { "id": "jA", "fullName": "Katarzyna Nowak", "initials": "KN", "isActive": true, "pinLocked": false, "position": 1,
      "pinVersion": 3,
      "pinVerifier": { "alg": "PBKDF2-SHA256", "iterations": 600000, "salt": "base64…",
                      "wrapped": "base64(AES-256-GCM(klucz = HKDF-SHA256(pinPepper, 'pc-pin-v1'), weryfikator, aad = judgeId ‖ pinVersion))" } }
  ],
  "categories": [
    { "id": "c3", "name": "Pole Sport Advanced", "style": "POLE_SPORT", "level": "ADVANCED", "ageGroup": "Senior 18+", "position": 3,
      "status": "IN_PROGRESS", "tieBreakCriterionId": "c3_k1",
      "panelJudgeIds": ["jA","jB","jC","jD","jE"],
      "criteria": [ { "id": "c3_k1", "name": "Technika", "description": "Siła, elementy na rurze", "scaleMax": 10, "step": 0.5, "weight": 2, "position": 1 } ],
      "penaltyTypes": [ { "id": "c3_p1", "name": "Upadek", "points": 2, "maxOccurrences": 3, "position": 1 } ],
      "entries": [ { "id": "e41", "startNumber": 41, "startOrder": 1, "fullName": "Zuzanna Król", "club": "Aerial Dreams Warszawa", "status": "ACTIVE" } ] }
  ]
}
```

## 5. Synchronizacja i ocenianie

### 5.1 `POST /v1/sync/push`

Żądanie (urządzenie wysyła mutacje w kolejności FIFO):
```json
{
  "deviceTime": "2026-10-03T13:59:58Z",
  "mutations": [
    { "mutationId": "0192f29e-…", "type": "JUDGE_SESSION_STARTED", "judgeId": "jA", "authMode": "OFFLINE_PIN",
      "createdAt": "2026-10-03T13:50:02Z", "payload": { "judgeSessionId": "0192f29e-…", "pinVersion": 3 } },
    {
      "mutationId": "0192f2a1-5b7c-7e01-8c3a-1d2e3f4a5b6c",
      "type": "SUBMIT_SCORE_SHEET",
      "judgeId": "jA",
      "judgeSessionId": "0192f29e-…",
      "authMode": "OFFLINE_PIN",
      "createdAt": "2026-10-03T13:57:41Z",
      "payload": {
        "scoreSheetId": "0192f2a1-5b7c-7e01-8c3a-aaaaaaaaaaaa",
        "categoryId": "c3", "entryId": "e45",
        "baseRevision": 0,
        "criteria": [
          { "criterionId": "c3_k1", "value": 8.5 }, { "criterionId": "c3_k2", "value": 8.5 },
          { "criterionId": "c3_k3", "value": 8 },   { "criterionId": "c3_k4", "value": 8 },
          { "criterionId": "c3_k5", "value": 8.5 }
        ],
        "penalties": [ { "penaltyTypeId": "c3_p1", "count": 0 }, { "penaltyTypeId": "c3_p2", "count": 0 } ],
        "comment": "Ładna interpretacja muzyki.",
        "clientTotal": 54.25
      }
    }
  ]
}
```

Odpowiedź – wynik **per mutacja** (żądanie jako całość daje 200, nawet gdy część mutacji odrzucono):
```json
200 OK
{
  "results": [
    { "mutationId": "0192f29e-…", "status": "APPLIED" },
    { "mutationId": "0192f2a1-…5b6c", "status": "APPLIED", "scoreSheetId": "0192f2a1-…aaaa", "revision": 1, "serverTotal": 54.25 }
  ],
  "cursor": 48230
}
```
Mutacje są przetwarzane w kolejności tablicy (FIFO urządzenia – tablet wysyła je w kolejności `outbox.seq`). Możliwe statusy: `APPLIED`, `DUPLICATE` (już przetworzona – zwracany zapisany wynik), `REJECTED` (+ `code`: `CATEGORY_LOCKED`, `CATEGORY_NOT_STARTED`, `TOURNAMENT_FINISHED`, `JUDGE_NOT_IN_PANEL`, `JUDGE_INACTIVE`, `ENTRY_WITHDRAWN`, `PIN_VERSION_OUTDATED`, `JUDGE_SESSION_INVALID`, `STALE_REVISION`, `SCHEMA_MISMATCH`, `IDEMPOTENCY_KEY_REUSED`), `RETRY` (błąd przejściowy – klient ponawia później).

**Zapis do `rejected_submission` (zmiana TL-13, [ADR-010](adr/ADR-010-blokada-kategorii-a-oceny-offline.md)):** wszystkie odrzucenia `SUBMIT_SCORE_SHEET` z wyjątkiem `STALE_REVISION` i `SCHEMA_MISMATCH` (sędzia rozwiązuje je na tablecie) oraz `IDEMPOTENCY_KEY_REUSED` (błąd programistyczny – alert). Zasada: żadna ocena wystawiona na tablecie nie znika bez śladu i bez decyzji organizatora.

**Walidacja sesji (uzupełnienie TL-12):** `SUBMIT_SCORE_SHEET` musi wskazywać `judgeSessionId`, który (a) jest sesją `ONLINE_PIN` tego sędziego utworzoną na tym urządzeniu przez `POST /v1/judge-sessions`, albo (b) został zgłoszony wcześniej (w tej lub poprzedniej paczce) mutacją `JUDGE_SESSION_STARTED` z tego samego urządzenia z aktualnym `pinVersion`. Inaczej `REJECTED JUDGE_SESSION_INVALID` (lub `PIN_VERSION_OUTDATED`, gdy wersja PIN-u jest nieaktualna). Zakończenie sesji (`JUDGE_SESSION_ENDED`) nie unieważnia ocen zatwierdzonych przed nim.

Typy mutacji (MVP): `SUBMIT_SCORE_SHEET`, `JUDGE_SESSION_STARTED`, `JUDGE_SESSION_ENDED`, `PIN_ATTEMPTS_REPORT` (`{ judgeId, failedCount, lockedUntil }` – raport nieudanych prób offline).

### 5.2 `GET /v1/sync/changes`

```json
GET /v1/sync/changes?since=48211&limit=500 → 200
{
  "changes": [
    { "seq": 48212, "entityType": "category", "op": "U", "entity": { "id": "c3", "status": "LOCKED", "lockedAt": "2026-10-03T14:02:11Z" } },
    { "seq": 48215, "entityType": "entry", "op": "U", "entity": { "id": "e50", "startNumber": 50, "startOrder": 10, "fullName": "Julia Kamińska", "club": "Aerial Dreams Warszawa", "status": "ACTIVE", "categoryId": "c3" } },
    { "seq": 48220, "entityType": "judge", "op": "U", "entity": { "id": "jB", "pinVersion": 4, "pinVerifier": { "…": "…" } } }
  ],
  "cursor": 48220,
  "hasMore": false
}
```

## 6. Kanał realtime (Socket.IO)

- **Adres:** `wss://api.polechamp.app/rt` (namespace `/rt`, transport tylko `websocket`).
- **Uwierzytelnianie:** `auth: { token }` w handshake (token `org`, `device` lub `judge`). Po wygaśnięciu tokenu serwer emituje `auth.expired`, klient odświeża token i łączy się ponownie.
- **Pokoje:** `tournament:{id}` (organizator-właściciel i urządzenia turnieju), `org:{tournamentId}` (tylko organizator – zdarzenia z wynikami), `device:{id}` (zdarzenia dla konkretnego urządzenia).
- **Zasada:** zdarzenia są **sygnałami unieważnienia** z minimalnym ładunkiem (identyfikatory, wersje, liczniki). Klient po zdarzeniu pobiera dane przez REST (organizator) albo `sync/changes` (tablet). Gwarancja dostarczenia: co najmniej raz, bez kolejności globalnej – klient porównuje `version`/`cursor`.

| Zdarzenie (serwer → klient) | Pokój | Ładunek | Reakcja klienta |
|---|---|---|---|
| `tournament.updated` | tournament | `{ tournamentId, status, version }` | odśwież SCR-ORG-03 / migawkę |
| `category.updated` | tournament | `{ categoryId, status, version }` | odśwież / `sync/changes` |
| `category.locked` | tournament | `{ categoryId, lockedAt }` | tablet: natychmiast tryb tylko-do-odczytu, wstrzymanie wysyłki do tej kategorii do czasu odpowiedzi serwera |
| `category.unlocked` | tournament | `{ categoryId }` | tablet: tryb edycji |
| `config.changed` | tournament | `{ categoryId, scope: "criteria"\|"penalties"\|"entries" }` | `sync/changes` |
| `judges.changed` | tournament | `{ judgeIds }` | `sync/changes` (nowe weryfikatory, dezaktywacje) |
| `scoresheet.accepted` | org | `{ categoryId, entryId, judgeId, revision }` | organizator: odśwież licznik `n/J` |
| `results.updated` | org | `{ categoryId, resultsVersion }` | organizator: pobierz `/results`, jeśli widok otwarty |
| `progress.updated` | org | `{ tournamentId, done, expected, categoryId, categoryDone, categoryExpected }` | aktualizacja pasków postępu bez zapytania |
| `device.status` | org | `{ deviceId, online, pendingMutations, lastSeenAt, activeJudgeId }` | SCR-ORG-14, ostrzeżenia blokady |
| `rejected.created` | org | `{ rejectedId, categoryId, judgeId }` | baner „Odrzucone oceny (n)” |
| `device.paired` | org | `{ deviceId, name, platform }` (uzupełnienie TL-07) | SCR-ORG-16 lista „Sparowane teraz”, SCR-ORG-14 |
| `session.revoked` | device | `{ judgeId?, reason: "DEVICE_REVOKED"\|"PIN_RESET"\|"REPLACED"\|"JUDGE_DEACTIVATED"\|"TOURNAMENT_FINISHED" }` (rozszerzone TL-14) | tablet: wylogowanie sędziego `judgeId` (powrót do SCR-JDG-01 z komunikatem) / ekran SCR-JDG-10 dla `DEVICE_REVOKED` |
| `sync.hint` | tournament | `{ cursor }` | tablet: `sync/changes`, jeśli `cursor` > lokalny |

| Zdarzenie (klient → serwer) | Ładunek | Opis |
|---|---|---|
| `subscribe` | `{ tournamentId }` | Dołączenie do pokoi (autoryzacja względem tokenu) |
| `heartbeat` | `{ pendingMutations, lastSyncCursor, batteryLevel, activeJudgeId }` | Co 30 s (tablet), alternatywa dla REST heartbeat |

Brak WebSocket (np. sieć hali blokuje WSS): organizator przechodzi na odpytywanie `GET /v1/tournaments/{id}` co 15 s, a tablet na `sync/changes` co 30 s ([NFR-303](../02-specification/08-wymagania-niefunkcjonalne.md)).

## 7. Mapowanie ekranów na API

| Ekran | Wywołania |
|---|---|
| SCR-ORG-01 | `GET /tournaments?status=active`, `GET /tournaments?status=finished` |
| SCR-ORG-02 | `POST /tournaments` |
| SCR-ORG-03 | `GET /tournaments/{id}`, `POST …/start`, WS `progress.updated` |
| SCR-ORG-04 | `POST /tournaments/{id}/finish` |
| SCR-ORG-05 | `POST /tournaments/{id}/categories`, `PATCH /categories/{id}` |
| SCR-ORG-06 | `GET /categories/{id}`, `POST …/start`, `POST …/lock`, `POST …/unlock` |
| SCR-ORG-07 | `GET /categories/{id}/entries` |
| SCR-ORG-08 | `GET /categories/{id}/results`, WS `results.updated` |
| SCR-ORG-09 / 10 | `POST/PATCH/DELETE` kryteriów / kar |
| SCR-ORG-11 / 17 | `POST /categories/{id}/entries`, `PATCH /entries/{id}`, `POST …/withdraw` |
| SCR-ORG-12 | `GET …/results` (podgląd), `POST /exports`, `GET /exports/{id}` |
| SCR-ORG-14…16 | judges, pairing-codes, devices |
| SCR-ORG-18 | `POST /categories/{id}/lock` (`force`) |
| SCR-ORG-19 | `GET /entries/{id}/score-sheets`, `GET /score-sheets/{id}/revisions` |
| SCR-ORG-22 | rejected-submissions |
| SCR-JDG-06 | `POST /devices/pair`, `POST /devices/token`, `GET /sync/snapshot` |
| SCR-JDG-00 | `POST /devices/token`, `GET /sync/changes` (lub snapshot) |
| SCR-JDG-02 | `POST /judge-sessions` (online) / weryfikator lokalny (offline) |
| SCR-JDG-03…05 | wyłącznie baza lokalna. W tle: `POST /sync/push`, `GET /sync/changes`, WS |

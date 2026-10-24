# EP-11 – QA i automatyzacja testów

> Dokument: `04-implementation-plans/11-qa-i-automatyzacja-testow.md` · Tech Lead (Agent 2) · 23.10.2026 · Konwencje i DoD: [00-konwencje-i-definition-of-done.md](00-konwencje-i-definition-of-done.md) · Indeks: [91-indeks-zadan.md](91-indeks-zadan.md)

Infrastruktura testów i automatyzacja przypadków z [planu testów](../03-test-plans/00-strategia-testowania.md): fikstury z seedu prototypu, harness integracyjny, testy kontraktowe i macierzy uprawnień, Maestro (organizator, sędzia, pełny turniej, offline), regresja wizualna, dostępność, k6, chaos, urządzenia referencyjne, UAT i próba generalna. Testy jednostkowe i integracyjne poszczególnych funkcji są częścią zadań funkcjonalnych (DoD), nie tego epiku.

## Podsumowanie

| Zadań | Suma | Rola (h) |
|---|---|---|
| 20 | 194 h | FULL 16 · DEVOPS 6 · QA 172 |


## Zadania

### IMP-450 – Dane testowe: port seedu prototypu i fabryki
- **Epik / obszar:** EP-11 QA i automatyzacja testów | **Rola:** QA
- **Cel:** Testy API, aplikacji i E2E korzystają z tych samych deterministycznych danych co prototyp (te same turnieje, kategorie, oceny i ranking), więc wyniki można porównać z designem.
- **Zakres:** `packages/test-fixtures`: port `buildSeed` (ziarno 20260914, t1–t4, c1–c18, oceny), fikstury FX-* ze strategii testów (FX-SEED, FX-T1C3, FX-MAX, FX-FINISHED, FX-ORG-OTHER…), PIN-y testowe nietrywialne, fabryki encji dla API i mobile; **Poza zakresem:** Dane staging (IMP-028)
- **Zależności:** [IMP-055](02-pakiety-wspoldzielone.md#imp-055--scoring-formatowanie-wyników-i-postęp), [IMP-105](03-backend-konto-i-konfiguracja-turnieju.md#imp-105--migracja-2-turnieje-kategorie-kryteria-kary-zawodniczki-sędziowie)
- **Odwołania:** 03-analiza-designu §8, NFR-903, [TC-SCORING-038](../03-test-plans/01-testy-jednostkowe.md#tc-scoring-038), [TC-API-090](../03-test-plans/02-testy-integracyjne-api.md#tc-api-090)
- **Kroki:**
  1. Przenieś `buildSeed` z `design/` do `packages/test-fixtures/src/seed.ts` (ziarno 20260914, turnieje t1–t4, kategorie c1–c18, sędziowie, starty i oceny) bez zmian algorytmu losowania.
  2. Zastąp PIN-y demo z prototypu nietrywialnymi PIN-ami testowymi zgodnymi z regułami z 05-bezpieczenstwo §3.1 i zapisz je w `src/fixtures/pins.ts`.
  3. Zdefiniuj fikstury ze strategii testów w `src/fixtures.ts`: `FX-SEED`, `FX-T1C3`, `FX-MAX` (z `max.ts`), `FX-FINISHED`, `FX-ORG-OTHER` i pozostałe użyte w TC.
  4. Napisz fabryki encji `src/factories.ts` (`makeTournament`, `makeCategory`, `makeEntry`, `makeJudge`, `makeScoreSheet`) z nadpisywalnymi polami, używane w API (Drizzle insert) i mobile (SQLite).
  5. Dodaj eksport do formatu `Snapshot` (`toSnapshot(fixture, deviceId)`) dla testów tabletu.
  6. Napisz test zgodności rankingu c3 z tabelą 03-analiza-designu §8.6 (miejsca i wyniki).
  7. Dopisz lub uruchom przypadki TC-SCORING-038, TC-API-090 w katalogach testów wskazanych w zakresie; nazwa testu zawiera ID przypadku.
  8. Otwórz PR `IMP-450: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] Seed daje 173/215 ocen w t1 i ranking c3 z 03-analiza-designu §8.6
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 8 h (M) | **Ryzyko:** niskie

### IMP-451 – Harness testów integracyjnych API
- **Epik / obszar:** EP-11 QA i automatyzacja testów | **Rola:** QA
- **Cel:** Testy integracyjne API uruchamiają się na prawdziwej bazie, cache i S3 w kontenerach, są od siebie izolowane i mają gotowe tokeny dla wszystkich ról.
- **Zakres:** Vitest globalSetup z Testcontainers (PostgreSQL 18, Valkey, MinIO), migracje raz na przebieg, izolacja przez transakcję/`TRUNCATE` per plik, fabryki tokenów dla 6 kontekstów (TC-AUTHZ), klient testowy Socket.IO, zegar sterowany; **Poza zakresem:** –
- **Zależności:** [IMP-103](03-backend-konto-i-konfiguracja-turnieju.md#imp-103--baza-drizzle-migracje-transakcje-z-kontekstem), [IMP-113](03-backend-konto-i-konfiguracja-turnieju.md#imp-113--jwt-es256-i-guardy-ról), [IMP-004](01-fundamenty-i-devops.md#imp-004--ci-testy-integracyjne-z-testcontainers), [IMP-450](#imp-450--dane-testowe-port-seedu-prototypu-i-fabryki)
- **Odwołania:** NFR-903
- **Kroki:**
  1. Napisz `apps/api/test/setup/global-setup.ts`: start Testcontainers (`postgres:18`, `valkey/valkey:8`, `minio/minio`), migracje i `roles.sql` raz na przebieg, zmienne środowiskowe dla aplikacji.
  2. Napisz `test/setup/app.ts` z `createTestApp()` (Nest + Fastify `inject`) i izolacją `TRUNCATE … RESTART IDENTITY CASCADE` per plik testowy (lub schemat per worker).
  3. Napisz fabryki tokenów `test/setup/tokens.ts` dla 6 kontekstów TC-AUTHZ: organizator-właściciel, inny organizator, urządzenie turnieju, urządzenie unieważnione, sędzia w panelu, sędzia spoza panelu.
  4. Dodaj klienta testowego Socket.IO `test/setup/rt-client.ts` (połączenie, subskrypcja, `waitForEvent(name, predicate, timeout)`).
  5. Dodaj sterowany zegar (`vi.useFakeTimers` dla logiki + `SET LOCAL` czasu w bazie przez funkcję `app_now()`) do testów wygasania i retencji.
  6. Opisz uruchamianie lokalne i w CI w `apps/api/test/README.md`.
  7. Otwórz PR `IMP-451: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] Przykładowe testy uruchamiane lokalnie i w CI < 10 min
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

### IMP-452 – Testy kontraktowe odpowiedzi i zgodności wstecznej
- **Epik / obszar:** EP-11 QA i automatyzacja testów | **Rola:** QA
- **Cel:** Każda odpowiedź API w testach integracyjnych jest walidowana kontraktem, a starsze wersje aplikacji (N−1, N−2) nadal działają z bieżącym API.
- **Zakres:** Walidacja każdej odpowiedzi w testach integracyjnych schematem z `@polechamp/contracts`; testy klienta N−1 i N−2 (zapisane kontrakty) vs bieżące API; **Poza zakresem:** –
- **Zależności:** [IMP-451](#imp-451--harness-testów-integracyjnych-api), [IMP-066](02-pakiety-wspoldzielone.md#imp-066--contracts-generowanie-openapi-31-i-kontrola-zmian-łamiących)
- **Odwołania:** NFR-903, NFR-907, ADR-012, [TC-CI-002](../03-test-plans/00-strategia-testowania.md#tc-ci-002)
- **Kroki:**
  1. Dodaj hook `afterResponse` w kliencie testowym (`test/setup/app.ts`): wyszukaj schemat odpowiedzi w rejestrze OpenAPI po metodzie, ścieżce i statusie i waliduj treść (`Problem` dla błędów).
  2. Kończ test błędem przy odpowiedzi niezgodnej ze schematem lub statusie nieopisanym w kontrakcie.
  3. Zapisuj przy każdym wydaniu `openapi.json` w `packages/contracts/history/vX.Y.Z.json` (krok workflow wydania).
  4. Napisz `test/contract/backward-compat.test.ts`: dla N−1 i N−2 odtwórz żądania z przykładów kontraktu (w tym `sync/push` i `sync/changes`) i sprawdź, że bieżące API je przyjmuje i zwraca odpowiedzi zgodne ze starym schematem.
  5. Dopisz lub uruchom przypadki TC-CI-002 w katalogach testów wskazanych w zakresie; nazwa testu zawiera ID przypadku.
  6. Otwórz PR `IMP-452: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-CI-002 przechodzi
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

### IMP-453 – Generator testów macierzy uprawnień
- **Epik / obszar:** EP-11 QA i automatyzacja testów | **Rola:** QA
- **Cel:** Dla każdego endpointu i każdego typu tokenu istnieje test uprawnień, a nowy endpoint bez wiersza w macierzy zatrzymuje CI.
- **Zakres:** Test tabelaryczny z listy TC-AUTHZ (05-bezpieczenstwo §4.1), automatyczne wykrycie endpointu bez wiersza w macierzy (porównanie z OpenAPI `x-permissions`); **Poza zakresem:** –
- **Zależności:** [IMP-451](#imp-451--harness-testów-integracyjnych-api), [IMP-066](02-pakiety-wspoldzielone.md#imp-066--contracts-generowanie-openapi-31-i-kontrola-zmian-łamiących)
- **Odwołania:** NFR-411, 05-bez §4.1, [TC-AUTHZ-001](../03-test-plans/02-testy-integracyjne-api.md#tc-authz-001)…062, [TC-SEC-011](../03-test-plans/05-testy-niefunkcjonalne.md#tc-sec-011)
- **Kroki:**
  1. Zapisz macierz z 05-bezpieczenstwo §4.1 jako dane `apps/api/test/authz/matrix.ts` (metoda, ścieżka, kontekst tokenu → oczekiwany status 2xx/401/403/404).
  2. Napisz `test/authz/matrix.test.ts` generujący przypadek `it.each` dla każdego wiersza z fabrykami tokenów (IMP-451) i minimalnymi danymi z fabryk.
  3. Dodaj test kompletności: zbiór (metoda, ścieżka) z `dist/openapi.json` musi być równy zbiorowi z macierzy, a `x-permissions` zgodne z oczekiwaniami.
  4. Oznacz każdy przypadek identyfikatorem TC-AUTHZ w nazwie testu i publikuj raport JUnit.
  5. Dopisz lub uruchom przypadki TC-AUTHZ-001…062, TC-SEC-011 w katalogach testów wskazanych w zakresie; nazwa testu zawiera ID przypadku.
  6. Otwórz PR `IMP-453: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-AUTHZ-001…062 przechodzą; nowy endpoint bez wiersza przerywa CI
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 8 h (M) | **Ryzyko:** niskie

### IMP-454 – Maestro: struktura, identyfikatory, uruchamianie w CI
- **Epik / obszar:** EP-11 QA i automatyzacja testów | **Rola:** QA
- **Cel:** Zespół ma działającą infrastrukturę Maestro: konwencje identyfikatorów, helpery przygotowania danych przez API i przebiegi w CI na Androidzie i iOS z nagraniami.
- **Zakres:** Maestro CLI 2.11, `apps/mobile/e2e/maestro/{org,judge,full,sync}`, konwencja `testID`, helpery API do przygotowania stanu (endpointy tylko w środowisku `e2e` za flagą), uruchamianie na emulatorach w CI (Android) i Maestro Cloud lub Mac runner (iOS), artefakty (wideo, zrzuty); **Poza zakresem:** Scenariusze (IMP-455…458, IMP-467…469)
- **Zależności:** [IMP-023](01-fundamenty-i-devops.md#imp-023--ci-mobile-buildy-eas-i-publikacja-aktualizacji), [IMP-450](#imp-450--dane-testowe-port-seedu-prototypu-i-fabryki)
- **Odwołania:** NFR-903, ADR-001, [TC-COMPAT-001](../03-test-plans/05-testy-niefunkcjonalne.md#tc-compat-001)
- **Kroki:**
  1. Utwórz `apps/mobile/e2e/maestro/{org,judge,full,sync}/` i `config.yaml` (Maestro CLI 2.11, `appId: app.polechamp`, tagi `p1`, `nightly`).
  2. Spisz konwencję `testID` w `apps/mobile/e2e/README.md` (`<ekran>-<element>`, np. `tournament-list-add`, `score-submit`) i dodaj brakujące `testID` w komponentach bazowych.
  3. Dodaj w API moduł `E2eModule` aktywny tylko przy fladze `E2E_HELPERS=1` (dev i staging; w produkcji odmowa startu z tą flagą): `POST /__e2e/reset`, `POST /__e2e/seed/{fixture}`, `POST /__e2e/clock` i odczyt kodów z Mailpit API.
  4. Napisz przepływy pomocnicze `e2e/maestro/_shared/*.yaml` (`login-org`, `pair-tablet`, `judge-login`) i przepływ dymny (uruchomienie, wybór trybu, logowanie).
  5. Dodaj job `e2e-android` w `mobile.yml` (emulator API 34 tablet + telefon, `reactivecircus/android-emulator-runner`) i `e2e-ios` (Mac runner lub Maestro Cloud) na nocnym buildzie `preview`.
  6. Zbieraj artefakty: wideo, zrzuty, logi `adb logcat`/`simctl` przy porażce.
  7. Dopisz lub uruchom przypadki TC-COMPAT-001 w katalogach testów wskazanych w zakresie; nazwa testu zawiera ID przypadku.
  8. Otwórz PR `IMP-454: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] Nocny przebieg dymny na Android i iOS
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 10 h (L) | **Ryzyko:** średnie

### IMP-455 – E2E organizatora – konto, turnieje, kategorie i kryteria
- **Epik / obszar:** EP-11 QA i automatyzacja testów | **Rola:** QA
- **Cel:** Kluczowe ścieżki organizatora od pierwszego uruchomienia po konfigurację kategorii (konto, turnieje, kategorie, kryteria, kary) są automatycznie sprawdzane każdej nocy na Androidzie i iOS.
- **Zakres:** Przepływy Maestro dla TC-E2E-ORG-001…017: wybór trybu, rejestracja i weryfikacja (kod z Mailpit API), logowanie, reset hasła, lista i szczegóły turnieju, kategorie, kryteria i kary. Wydzielone z pierwotnego IMP-455 (16 h, 34 przepływy), które po rozpisaniu kroków przekraczało 16 h; **Poza zakresem:** TC-E2E-ORG-018…034 (IMP-467)
- **Zależności:** [IMP-454](#imp-454--maestro-struktura-identyfikatory-uruchamianie-w-ci), [IMP-278](07-mobile-ekrany-organizatora.md#imp-278--tryb-offline-organizatora-na-wszystkich-ekranach), [IMP-277](07-mobile-ekrany-organizatora.md#imp-277--scr-org-21--konto)
- **Odwołania:** NFR-903, [TC-E2E-ORG-001](../03-test-plans/03-testy-e2e.md#tc-e2e-org-001)…017
- **Kroki:**
  1. Napisz przepływy `e2e/maestro/org/01-mode.yaml` … `07-splash.yaml` dla TC-E2E-ORG-001…007 (wybór trybu, rejestracja z kodem z Mailpit przez `runScript`, „Pomiń na razie”, logowanie i restart, blokada, reset przez deep link, splash).
  2. Napisz przepływy `08-list.yaml` … `12-edit-tournament.yaml` dla TC-E2E-ORG-008…012 (sekcje listy, utworzenie, szczegóły, start i zakończenie, edycja i usunięcie) z danymi z `POST /__e2e/seed/FX-SEED`.
  3. Napisz przepływy `13-category-add.yaml` … `17-penalties.yaml` dla TC-E2E-ORG-013…017 (kategoria z szablonu, edycja i usunięcie, zakładka Kryteria, CRUD kryteriów i kar z walidacjami).
  4. Sprawdzaj teksty wiążące toastów i błędów (`assertVisible` z dokładnym tekstem z `binding-texts.json`).
  5. Ustabilizuj przepływy (`waitForAnimationToEnd`, `extendedWaitUntil` na stanach sieci) i uruchom 3 kolejne zielone przebiegi nocne.
  6. Dopisz lub uruchom przypadki TC-E2E-ORG-001…017 w katalogach testów wskazanych w zakresie; nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-455: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-E2E-ORG-001…017 zielone w nocnym CI
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 10 h (L) | **Ryzyko:** średnie

### IMP-467 – E2E organizatora – zawodniczki, wyniki, sędziowie, urządzenia i offline
- **Epik / obszar:** EP-11 QA i automatyzacja testów | **Rola:** QA
- **Cel:** Ścieżki organizatora w trakcie zawodów (lista startowa, wyniki, PDF, blokada, odrzucenia, sędziowie, urządzenia, offline, konto) są automatycznie sprawdzane każdej nocy.
- **Zakres:** Przepływy Maestro dla TC-E2E-ORG-018…034: start kategorii, lista startowa, wyniki na żywo, oceny zawodniczki, PDF, blokada, odrzucone oceny, sędziowie i PIN, parowanie i stan urządzeń, tryb offline, konto i usunięcie danych osobowych. Wydzielone z pierwotnego IMP-455; **Poza zakresem:** TC-E2E-ORG-001…017 (IMP-455)
- **Zależności:** [IMP-454](#imp-454--maestro-struktura-identyfikatory-uruchamianie-w-ci), [IMP-278](07-mobile-ekrany-organizatora.md#imp-278--tryb-offline-organizatora-na-wszystkich-ekranach), [IMP-277](07-mobile-ekrany-organizatora.md#imp-277--scr-org-21--konto)
- **Odwołania:** NFR-903, [TC-E2E-ORG-018](../03-test-plans/03-testy-e2e.md#tc-e2e-org-018)…034
- **Kroki:**
  1. Napisz przepływy `e2e/maestro/org/18-category-start.yaml` … `22-search.yaml` dla TC-E2E-ORG-018…022 (warunki startu, dodanie zawodniczki, niepełnoletnia ze zgodą, edycja/wycofanie/usunięcie, wyszukiwanie bez diakrytyków).
  2. Napisz przepływy `23-results.yaml` … `27-rejected.yaml` dla TC-E2E-ORG-023…027 z ocenami wstrzykiwanymi przez API (`POST /v1/sync/push` urządzenia syntetycznego w `runScript`): ranking na żywo, oceny zawodniczki, PDF (sprawdzenie arkusza udostępniania), blokada z ostrzeżeniem, przyjęcie/odrzucenie.
  3. Napisz przepływy `28-judges.yaml` … `31-devices.yaml` dla TC-E2E-ORG-028…031 (PIN jednorazowo, reset i dezaktywacja, parowanie z kodem odczytanym z API, stan urządzeń z heartbeat).
  4. Napisz `32-offline.yaml` (tryb samolotowy przez `adb shell cmd connectivity airplane-mode enable` / `simctl`), `33-account.yaml` i `34-anonymize.yaml` dla TC-E2E-ORG-032…034.
  5. Ustabilizuj przepływy i uruchom 3 kolejne zielone przebiegi nocne.
  6. Dopisz lub uruchom przypadki TC-E2E-ORG-018…034 w katalogach testów wskazanych w zakresie; nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-467: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-E2E-ORG-018…034 zielone w nocnym CI
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 10 h (L) | **Ryzyko:** średnie

### IMP-456 – E2E sędziego – parowanie, logowanie PIN-em, kolejka i formularz
- **Epik / obszar:** EP-11 QA i automatyzacja testów | **Rola:** QA
- **Cel:** Ścieżki sędziego od parowania tabletu po zatwierdzenie oceny są automatycznie sprawdzane każdej nocy na emulatorze tabletu Android i symulatorze iPada.
- **Zakres:** Przepływy Maestro na emulatorze tabletu i symulatorze iPada dla TC-E2E-JDG-001…015 (parowanie QR i ręczne, splash, wybór profilu, PIN z limitami i logowaniem offline, lista kategorii, kolejka, formularz i zatwierdzanie) z helperami czasu. Wydzielone z pierwotnego IMP-456 (16 h, 30 przepływów), które po rozpisaniu kroków przekraczało 16 h; **Poza zakresem:** TC-E2E-JDG-016…030 (IMP-468)
- **Zależności:** [IMP-454](#imp-454--maestro-struktura-identyfikatory-uruchamianie-w-ci), [IMP-319](08-mobile-ekrany-sedziego.md#imp-319--cykl-życia-danych-tabletu), [IMP-318](08-mobile-ekrany-sedziego.md#imp-318--scr-jdg-10--urządzenie-odłączone-i-eksport-niewysłanych)
- **Odwołania:** NFR-903, [TC-E2E-JDG-001](../03-test-plans/03-testy-e2e.md#tc-e2e-jdg-001)…015
- **Kroki:**
  1. Napisz przepływy `e2e/maestro/judge/01-pair-qr.yaml` … `03-splash.yaml` dla TC-E2E-JDG-001…003 (QR przez deep link `polechamp://pair`, kod ręczny i błędy, splash online i offline).
  2. Napisz `04-profiles.yaml` … `08-offline-login.yaml` dla TC-E2E-JDG-004…008 (wybór profilu, PIN, blokada czasowa z restartem, blokada do resetu, logowanie offline) z helperem zegara `POST /__e2e/clock` i przestawieniem czasu urządzenia.
  3. Napisz `09-categories.yaml` … `15-update-score.yaml` dla TC-E2E-JDG-009…015 (lista kategorii, kolejka i ikony, wartości domyślne i wynik, suwak/−/+/kary/komentarz, zatwierdzenie i auto-przejście, ostatnia nieoceniona, poprawa oceny).
  4. Sprawdzaj obliczony „Twój wynik” wobec wartości z przykładów 07-reguly (P1, P2) i teksty toastów.
  5. Ustabilizuj gesty suwaka (`swipe` z współrzędnymi względnymi) i uruchom 3 kolejne zielone przebiegi nocne.
  6. Dopisz lub uruchom przypadki TC-E2E-JDG-001…015 w katalogach testów wskazanych w zakresie; nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-456: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-E2E-JDG-001…015 zielone w nocnym CI (ręczne oznaczone)
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 10 h (L) | **Ryzyko:** średnie

### IMP-468 – E2E sędziego – blokada, sesje, synchronizacja, odłączenie i orientacja
- **Epik / obszar:** EP-11 QA i automatyzacja testów | **Rola:** QA
- **Cel:** Zachowanie tabletu w sytuacjach specjalnych (blokada, sesje, synchronizacja, odłączenie, orientacja) jest automatycznie sprawdzane każdej nocy.
- **Zakres:** Przepływy Maestro dla TC-E2E-JDG-016…030 (kategoria zablokowana, niezależność sędziów, szkic, wylogowanie i ponowny PIN, sesja zastąpiona, pigułka synchronizacji, propagacja zmian, odrzucenia, urządzenie odłączone, ponowne użycie tabletu, orientacja, keep-awake). Wydzielone z pierwotnego IMP-456; **Poza zakresem:** TC-E2E-JDG-001…015 (IMP-456)
- **Zależności:** [IMP-454](#imp-454--maestro-struktura-identyfikatory-uruchamianie-w-ci), [IMP-319](08-mobile-ekrany-sedziego.md#imp-319--cykl-życia-danych-tabletu), [IMP-318](08-mobile-ekrany-sedziego.md#imp-318--scr-jdg-10--urządzenie-odłączone-i-eksport-niewysłanych)
- **Odwołania:** NFR-903, [TC-E2E-JDG-016](../03-test-plans/03-testy-e2e.md#tc-e2e-jdg-016)…030
- **Kroki:**
  1. Napisz przepływy `e2e/maestro/judge/16-locked.yaml` … `18-draft-kill.yaml` dla TC-E2E-JDG-016…018 (blokada przez API w trakcie oceniania, niezależność sędziów na dwóch profilach, szkic po `killApp`).
  2. Napisz `19-logout-queue.yaml` … `22-sync-pill.yaml` dla TC-E2E-JDG-019…022 (dialog wylogowania z kolejką, ponowny PIN po tle – `pressKey: HOME` + zegar, sesja zastąpiona logowaniem przez API z innego urządzenia, pigułka i popover).
  3. Napisz `23-new-athlete.yaml` … `27-reuse.yaml` dla TC-E2E-JDG-023…027 (propagacja zawodniczki i startu kategorii z API, odrzucenia, odłączenie urządzenia, ponowne użycie po zakończeniu turnieju).
  4. Napisz `28-orientation.yaml` … `30-keep-awake.yaml` dla TC-E2E-JDG-028…030 (obrót i zmiana okna – `setOrientation`, telefon bez trybu sędziego, ekran nie gaśnie – procedura ręczna oznaczona tagiem `manual`).
  5. Ustabilizuj przepływy i uruchom 3 kolejne zielone przebiegi nocne.
  6. Dopisz lub uruchom przypadki TC-E2E-JDG-016…030 w katalogach testów wskazanych w zakresie; nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-468: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-E2E-JDG-016…030 zielone w nocnym CI (ręczne oznaczone)
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 10 h (L) | **Ryzyko:** średnie

### IMP-457 – E2E pełnego turnieju (dwa urządzenia)
- **Epik / obszar:** EP-11 QA i automatyzacja testów | **Rola:** QA
- **Cel:** Pełny turniej na dwóch urządzeniach (telefon organizatora i tablet sędziego) przechodzi automatycznie, a zmierzone opóźnienia realtime mieszczą się w celach: ocena → ranking ≤ 2 s, status kategorii → tablet ≤ 3 s (p95).
- **Zakres:** Orkiestracja dwóch sesji Maestro (telefon + tablet) i skryptów API; pomiar opóźnień realtime z logów; scenariusze FULL-001…006; **Poza zakresem:** –
- **Zależności:** [IMP-455](#imp-455--e2e-organizatora--konto-turnieje-kategorie-i-kryteria), [IMP-467](#imp-467--e2e-organizatora--zawodniczki-wyniki-sędziowie-urządzenia-i-offline), [IMP-456](#imp-456--e2e-sędziego--parowanie-logowanie-pin-em-kolejka-i-formularz), [IMP-468](#imp-468--e2e-sędziego--blokada-sesje-synchronizacja-odłączenie-i-orientacja)
- **Odwołania:** NFR-105, NFR-903, [TC-E2E-FULL-001](../03-test-plans/03-testy-e2e.md#tc-e2e-full-001)…006, [TC-PERF-005](../03-test-plans/05-testy-niefunkcjonalne.md#tc-perf-005)
- **Kroki:**
  1. Napisz `tools/e2e/orchestrator.ts`: równoległe uruchomienie dwóch sesji Maestro (`--device <id>`) z synchronizacją kroków przez pliki znaczników lub API `__e2e` (bariera „tablet sparowany”, „kategoria rozpoczęta”, „ocena zatwierdzona”).
  2. Napisz przepływy `e2e/maestro/full/org-*.yaml` i `full/judge-*.yaml` dla TC-E2E-FULL-001…006 (konfiguracja → parowanie → ocenianie → ranking → blokada → PDF → zakończenie).
  3. Mierz opóźnienie od zatwierdzenia na tablecie do zmiany licznika u organizatora z logów aplikacji (znaczniki czasu w trybie e2e) i z metryk serwera; raport p50/p95 dla TC-PERF-005.
  4. Sprawdzaj wpisy audytu po scenariuszu przez `GET /v1/tournaments/{id}/audit-log`.
  5. Dodaj job `e2e-full` (Android: telefon + tablet w jednym runnerze) uruchamiany przed wydaniem i raz w tygodniu.
  6. Dopisz lub uruchom przypadki TC-E2E-FULL-001…006, TC-PERF-005 w katalogach testów wskazanych w zakresie; nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-457: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-E2E-FULL-001…006, TC-PERF-005 przechodzą przed wydaniem
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 12 h (L) | **Ryzyko:** wysokie

### IMP-458 – E2E offline – narzędzia sieci i scenariusze TC-SYNC-001…020
- **Epik / obszar:** EP-11 QA i automatyzacja testów | **Rola:** QA
- **Cel:** Odporność tabletu na utratę sieci, zabicie aplikacji, zmiany w turnieju podczas pracy offline i awarie po stronie serwera jest sprawdzona na prawdziwych urządzeniach i emulatorach.
- **Zakres:** Sterowanie siecią (`adb shell svc`, `cmd connectivity`, Network Link Conditioner, toxiproxy), pętla kill -9 (100×), zmiana zegara, scenariusze TC-SYNC-001…020 (automatyczne + procedura ręczna TC-SYNC-006). Wydzielone z pierwotnego IMP-458 (12 h, 40 scenariuszy), które po rozpisaniu kroków przekraczało 16 h; **Poza zakresem:** TC-SYNC-021…040 (IMP-469)
- **Zależności:** [IMP-456](#imp-456--e2e-sędziego--parowanie-logowanie-pin-em-kolejka-i-formularz), [IMP-357](09-mobile-offline-i-synchronizacja.md#imp-357--obsługa-odrzuceń-na-tablecie), [IMP-355](09-mobile-offline-i-synchronizacja.md#imp-355--syncengine--wyzwalacze-harmonogram-heartbeat)
- **Odwołania:** NFR-301, NFR-302, NFR-306, NFR-309, [TC-SYNC-001](../03-test-plans/04-testy-offline-i-synchronizacji.md#tc-sync-001)…020
- **Kroki:**
  1. Napisz `tools/network/net.ts` z poleceniami `offline`, `online`, `lossy(pct)`, `blockWs` dla Androida (`adb shell svc wifi/data`, `cmd connectivity`), iOS Simulator (Network Link Conditioner) i proxy `toxiproxy` przed API staging-e2e.
  2. Napisz pętlę `tools/e2e/kill-loop.ts` (zatwierdzenie oceny → `adb shell am force-stop` / `simctl terminate` → restart → weryfikacja arkusza i outboxu) dla 100 iteracji (TC-SYNC-004, 005).
  3. Napisz przepływy `e2e/maestro/sync/001…005` (utrata sieci w trakcie, 2 h offline z 40 ocenami i przyspieszonym zegarem, przerwana paczka, kill -9) i procedurę ręczną TC-SYNC-006 (twarde wyłączenie) w `docs-dev/qa/sync/manual.md`.
  4. Napisz przepływy `sync/007…013` (blokada, przyjęcie odrzuconych, wycofanie, dezaktywacja, reset PIN-u przy tablecie offline, STALE_REVISION na dwóch tabletach, wielu sędziów naraz) ze zmianami wprowadzanymi przez API.
  5. Napisz przepływy `sync/014…020` (zegar ±24 h i cofnięcie, wygasły kursor, SCHEMA_MISMATCH, zablokowany WSS, awaria Valkey – zatrzymanie kontenera e2e, sieć z 30% utratą pakietów).
  6. Weryfikuj wynik każdego scenariusza zapytaniem do API (liczba arkuszy, brak duplikatów, wpisy `rejected_submission`) i zapisz raport przed wydaniem.
  7. Dopisz lub uruchom przypadki TC-SYNC-001…020 w katalogach testów wskazanych w zakresie; nazwa testu zawiera ID przypadku.
  8. Otwórz PR `IMP-458: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-SYNC-001…020 wykonane; raport przed wydaniem
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 10 h (L) | **Ryzyko:** wysokie

### IMP-469 – E2E offline – scenariusze TC-SYNC-021…040 (pojemność, zdarzenia, cykl życia)
- **Epik / obszar:** EP-11 QA i automatyzacja testów | **Rola:** QA
- **Cel:** Zachowanie tabletu przy dużej kolejce, długiej pracy offline, nietypowej kolejności zdarzeń, aktualizacjach aplikacji i końcu turnieju jest sprawdzone na prawdziwych urządzeniach i emulatorach.
- **Zakres:** Scenariusze TC-SYNC-021…040 (przełączanie sieci w trakcie paczki, 300 ocen, 12 h offline – procedura ręczna TC-SYNC-023, heartbeat, ostrzeżenia blokady, kolejność i duplikaty zdarzeń, zmiany listy i odblokowanie offline, odłączenie z kolejką, OTA i wymuszona aktualizacja, raport prób PIN, migawka maksymalna, cykl życia danych, izolacja sędziów) na narzędziach z IMP-458. Wydzielone z pierwotnego IMP-458; **Poza zakresem:** TC-SYNC-001…020 (IMP-458)
- **Zależności:** [IMP-458](#imp-458--e2e-offline--narzędzia-sieci-i-scenariusze-tc-sync-001020)
- **Odwołania:** NFR-301, NFR-302, NFR-306, NFR-309, [TC-SYNC-021](../03-test-plans/04-testy-offline-i-synchronizacji.md#tc-sync-021)…040
- **Kroki:**
  1. Napisz przepływy `e2e/maestro/sync/021…023` (przełączanie online/offline w trakcie paczki, 300 ocen po powrocie sieci z pomiarem ≤ 30 s, procedura ręczna 12 h offline z pomiarem baterii) na narzędziach z IMP-458.
  2. Napisz przepływy `sync/024…027` (heartbeat i stan urządzeń u organizatora, ostrzeżenie przed blokadą przy tablecie offline, blokada przed odpowiedzią push, duplikaty i stare zdarzenia WS przez wstrzyknięcie zdarzeń z API `__e2e`).
  3. Napisz przepływy `sync/028…032` (zmiana listy w trakcie edycji, odblokowanie w trakcie offline, odłączenie z kolejką, mutacja do kategorii nierozpoczętej, sędzia spoza panelu).
  4. Napisz przepływy `sync/033…035` (aktualizacja OTA z niepustym outboxem przez `eas update` na kanał e2e, wymuszona aktualizacja a wysyłka, raport prób PIN offline → blokada globalna).
  5. Napisz przepływy `sync/036…040` (migawka FX-MAX z pomiarem czasu, usunięcie danych po 7 dniach z przesuniętym zegarem, sędzia dodany w trakcie, uzupełnienie arkuszy po logowaniu online, brak danych innych sędziów – zapytanie do bazy SQLite przez `adb shell run-as`).
  6. Dołącz wyniki do raportu przed wydaniem razem z IMP-458.
  7. Dopisz lub uruchom przypadki TC-SYNC-021…040 w katalogach testów wskazanych w zakresie; nazwa testu zawiera ID przypadku.
  8. Otwórz PR `IMP-469: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-SYNC-021…040 wykonane; raport przed wydaniem
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 10 h (L) | **Ryzyko:** wysokie

### IMP-459 – Regresja wizualna (zrzuty + odiff)
- **Epik / obszar:** EP-11 QA i automatyzacja testów | **Rola:** QA
- **Cel:** Każda zmiana interfejsu jest porównywana z zaakceptowanymi wzorcami zrzutów ekranu, a różnice są widoczne w PR do decyzji projektanta.
- **Zakres:** Wg spike IMP-608: zrzuty Maestro z DevCatalog i ekranów SCR (stałe dane, zamrożony czas, wyłączone animacje), porównanie `odiff` z wzorcami w repozytorium (Git LFS), raport różnic w PR, procedura akceptacji nowych wzorców przez projektanta; **Poza zakresem:** –
- **Zależności:** [IMP-212](06-mobile-fundamenty-i-design-system.md#imp-212--devcatalog--katalog-komponentów-tylko-development), [IMP-454](#imp-454--maestro-struktura-identyfikatory-uruchamianie-w-ci), [IMP-608](14-spike.md#imp-608--spike-regresja-wizualna-w-ci-limit-6-h)
- **Odwołania:** NFR-208, NFR-210, [TC-DESIGN-001](../03-test-plans/06-testy-zgodnosci-z-designem.md#tc-design-001)…020, [TC-DESIGN-022](../03-test-plans/06-testy-zgodnosci-z-designem.md#tc-design-022), [TC-DESIGN-023](../03-test-plans/06-testy-zgodnosci-z-designem.md#tc-design-023)
- **Kroki:**
  1. Zaimplementuj pipeline wg decyzji spike IMP-608 w `tools/visual/`: przepływ Maestro przechodzący po przypadkach DevCatalog (`polechamp://dev/catalog/<sekcja>?case=<id>`) i ekranach SCR z danymi `FX-SEED`, z zamrożonym czasem i wyłączonymi animacjami (flaga `E2E_DISABLE_ANIMATIONS`).
  2. Zapisuj zrzuty w stałej rozdzielczości (telefon 390×844, tablet 1180×820) i nazwach `<sekcja>__<przypadek>__<urządzenie>.png`.
  3. Porównuj z wzorcami w `tools/visual/baselines/` (Git LFS) przez `odiff` (próg 0,1%, maska paska statusu) i generuj raport HTML z różnicami.
  4. Publikuj raport jako artefakt i komentarz w PR z listą zmienionych ekranów; blokuj scalenie bez etykiety `visual-approved`.
  5. Opisz procedurę akceptacji nowych wzorców przez projektanta (IMP-653) w `tools/visual/README.md`.
  6. Dopisz lub uruchom przypadki TC-DESIGN-001…020, TC-DESIGN-022, TC-DESIGN-023 w katalogach testów wskazanych w zakresie; nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-459: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-DESIGN-001…020, 022, 023 zautomatyzowane
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 10 h (L) | **Ryzyko:** średnie

### IMP-460 – Testy dostępności
- **Epik / obszar:** EP-11 QA i automatyzacja testów | **Rola:** QA
- **Cel:** Najważniejsze ścieżki organizatora i sędziego działają z VoiceOver i TalkBack, przy powiększonej czcionce i z ograniczonym ruchem, a defekty dostępności są zgłoszone przed wydaniem.
- **Zakres:** Scenariusze VoiceOver/TalkBack dla US Must, skany Accessibility Inspector i Accessibility Scanner, skalowanie czcionki 120/130%, „Ogranicz ruch”, raport defektów; **Poza zakresem:** –
- **Zależności:** [IMP-455](#imp-455--e2e-organizatora--konto-turnieje-kategorie-i-kryteria), [IMP-467](#imp-467--e2e-organizatora--zawodniczki-wyniki-sędziowie-urządzenia-i-offline), [IMP-456](#imp-456--e2e-sędziego--parowanie-logowanie-pin-em-kolejka-i-formularz), [IMP-468](#imp-468--e2e-sędziego--blokada-sesje-synchronizacja-odłączenie-i-orientacja)
- **Odwołania:** NFR-201, NFR-204, NFR-206, NFR-207, [TC-A11Y-002](../03-test-plans/05-testy-niefunkcjonalne.md#tc-a11y-002)…014, [TC-DESIGN-005](../03-test-plans/06-testy-zgodnosci-z-designem.md#tc-design-005), [TC-DESIGN-011](../03-test-plans/06-testy-zgodnosci-z-designem.md#tc-design-011)
- **Kroki:**
  1. Napisz scenariusze ręczne w `docs-dev/qa/a11y/` dla US z priorytetem Must (utworzenie turnieju, konfiguracja kategorii, logowanie sędziego PIN-em, ocena z suwakiem i karami, blokada kategorii).
  2. Wykonaj scenariusze z VoiceOver (iPhone 12, iPad 9) i TalkBack (Pixel 6a, Galaxy Tab A8), sprawdzając etykiety, kolejność fokusu, role `adjustable` i ogłaszanie toastów.
  3. Uruchom skany Accessibility Inspector (Xcode) i Accessibility Scanner (Android) na ekranach SCR i zapisz wyniki.
  4. Sprawdź skalowanie czcionki 120% (sędzia) i 130% (organizator) oraz „Ogranicz ruch” (splash, szkielety, animacje rankingu).
  5. Zgłoś defekty z ważnością, zweryfikuj poprawki i dołącz raport do listy kontrolnej wydania.
  6. Dopisz lub uruchom przypadki TC-A11Y-002…014, TC-DESIGN-005, TC-DESIGN-011 w katalogach testów wskazanych w zakresie; nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-460: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-A11Y-002…014 wykonane; 0 błędów krytycznych
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 12 h (L) | **Ryzyko:** średnie

### IMP-461 – Testy obciążeniowe k6
- **Epik / obszar:** EP-11 QA i automatyzacja testów | **Rola:** QA
- **Cel:** Pomiar potwierdza, że API wytrzymuje obciążenie docelowe (100 trwających turniejów, 3 000 połączeń WS, 50 ocen/s) i jego dwukrotność z czasami odpowiedzi p95 ≤ 300 ms dla odczytów i ≤ 500 ms dla zapisów.
- **Zakres:** k6 2.3: scenariusze organizatora (odczyty), tabletów (push, changes, heartbeat), WS (`k6/experimental/websockets`), profile 1× i 2×, uruchamianie z kontenera w AWS, raport do wydania; **Poza zakresem:** –
- **Zależności:** [IMP-028](01-fundamenty-i-devops.md#imp-028--dane-staging-seed-syntetyczny-i-turniej-maksymalny), [IMP-156](04-backend-urzadzenia-ocenianie-synchronizacja.md#imp-156--mapowanie-komend-na-zdarzenia-realtime)
- **Odwołania:** NFR-102, NFR-802, NFR-803, NFR-804, [TC-PERF-002](../03-test-plans/05-testy-niefunkcjonalne.md#tc-perf-002), [TC-PERF-011](../03-test-plans/05-testy-niefunkcjonalne.md#tc-perf-011)…013, [TC-SYNC-013](../03-test-plans/04-testy-offline-i-synchronizacji.md#tc-sync-013)
- **Kroki:**
  1. Napisz scenariusze k6 2.3 w `tools/k6/`: `organizer.js` (lista, szczegóły, wyniki, eksport), `tablets.js` (20 urządzeń: `sync/push` co ocenę, `sync/changes`, heartbeat co 30 s), `ws.js` (`k6/experimental/websockets`, do 3 000 połączeń z subskrypcją i heartbeat).
  2. Przygotuj dane (100 turniejów syntetycznych z `seed:staging` rozszerzonym o parametr liczby i FX-MAX z `seed:max` – IMP-028) oraz tokeny urządzeń syntetycznych przed testem (`setup()`).
  3. Zdefiniuj profile 1× (100 trwających turniejów, 3 000 połączeń WS, 50 ocen/s szczytowo) i 2× (dwukrotność przed wydaniem 1.0) z progami `http_req_duration{p(95)}` (odczyt ≤ 300 ms, zapis ≤ 500 ms) i `checks`.
  4. Uruchamiaj test z kontenera w AWS (zadanie ECS w tym samym regionie) przez `tools/k6/run.sh staging`, z metrykami eksportowanymi do CloudWatch.
  5. Zapisz raport (p50/p95/p99, błędy, CPU i połączenia bazy) w `docs-dev/perf/k6-<data>.md` i porównaj z poprzednim wydaniem.
  6. Dopisz lub uruchom przypadki TC-PERF-002, TC-PERF-011…013, TC-SYNC-013 w katalogach testów wskazanych w zakresie; nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-461: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-PERF-002, 011…013, TC-SYNC-013 przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 12 h (L) | **Ryzyko:** średnie

### IMP-462 – Testy chaosu i odporności na staging
- **Epik / obszar:** EP-11 QA i automatyzacja testów | **Rola:** DEVOPS
- **Cel:** System potwierdza na staging, że awaria cache, zabicie zadania, failover bazy i wdrożenie w trakcie zawodów nie powodują utraty ocen.
- **Zakres:** Wyłączenie Valkey, zabicie zadania ECS w trakcie push, failover RDS, wdrożenie w trakcie połączeń WS (AWS FIS lub skrypty); **Poza zakresem:** –
- **Zależności:** [IMP-461](#imp-461--testy-obciążeniowe-k6)
- **Odwołania:** NFR-307, NFR-304, NFR-305, [TC-SYNC-019](../03-test-plans/04-testy-offline-i-synchronizacji.md#tc-sync-019), [TC-REL-003](../03-test-plans/05-testy-niefunkcjonalne.md#tc-rel-003)…005
- **Kroki:**
  1. Przygotuj eksperymenty AWS FIS (lub skrypty w `tools/chaos/`): zatrzymanie węzła Valkey, `ecs:StopTask` zadania `api` w trakcie `sync/push`, wymuszony failover RDS Multi-AZ, wdrożenie usługi w trakcie 50 połączeń WS.
  2. Uruchamiaj podczas każdego eksperymentu obciążenie k6 `tablets.js` i licz arkusze przed i po.
  3. Sprawdź oczekiwane zachowania: tryb awaryjny limitów, `RETRY` i ponowienia bez duplikatów, ponowne połączenie WS i odpytywanie, czas niedostępności przy failoverze.
  4. Zapisz wyniki i czasy odtworzenia w `docs-dev/reliability/chaos-<data>.md` oraz zgłoś defekty.
  5. Dopisz lub uruchom przypadki TC-SYNC-019, TC-REL-003…005 w pipeline CI / środowisku `dev` lub `staging`; nazwa testu zawiera ID przypadku.
  6. Otwórz PR `IMP-462: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-SYNC-019, TC-REL-003…005 przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** średnie

### IMP-463 – Przebiegi na urządzeniach referencyjnych
- **Epik / obszar:** EP-11 QA i automatyzacja testów | **Rola:** QA
- **Cel:** Aplikacja jest sprawdzona na wszystkich urządzeniach referencyjnych i skrajnych wersjach systemów, z pomiarem pamięci i baterii.
- **Zakres:** Pełny regres E2E P1 na iPhone 12, Pixel 6a, iPad 9, Galaxy Tab A8 oraz emulatorach API 29 i 36; pomiary pamięci i baterii; zakup/wypożyczenie urządzeń (PM); **Poza zakresem:** –
- **Zależności:** [IMP-455](#imp-455--e2e-organizatora--konto-turnieje-kategorie-i-kryteria), [IMP-467](#imp-467--e2e-organizatora--zawodniczki-wyniki-sędziowie-urządzenia-i-offline), [IMP-456](#imp-456--e2e-sędziego--parowanie-logowanie-pin-em-kolejka-i-formularz), [IMP-468](#imp-468--e2e-sędziego--blokada-sesje-synchronizacja-odłączenie-i-orientacja)
- **Odwołania:** NFR-701, NFR-702, NFR-703, NFR-704, NFR-705, [TC-COMPAT-001](../03-test-plans/05-testy-niefunkcjonalne.md#tc-compat-001)…010, [TC-PERF-014](../03-test-plans/05-testy-niefunkcjonalne.md#tc-perf-014), [TC-PERF-015](../03-test-plans/05-testy-niefunkcjonalne.md#tc-perf-015)
- **Kroki:**
  1. Uruchom przepływy E2E z tagiem `p1` na iPhone 12, Pixel 6a, iPad 9, Galaxy Tab A8 oraz emulatorach Android API 29 i 36 (Maestro z `--device`).
  2. Zmierz zużycie pamięci (Xcode Instruments, `adb shell dumpsys meminfo`) podczas 30 min oceniania i baterii w 1 h pracy (TC-PERF-014, 015).
  3. Sprawdź specyficzne zachowania: zmiana okna na Androidzie 16 i iPadOS 26, uprawnienie kamery, keep-awake, zegar monotoniczny po restarcie.
  4. Uzupełnij tabelę zgodności w `docs-dev/qa/compat-matrix.md` i listę kontrolną wydania; zgłoś PM zakup lub wypożyczenie brakujących urządzeń.
  5. Dopisz lub uruchom przypadki TC-COMPAT-001…010, TC-PERF-014, TC-PERF-015 w katalogach testów wskazanych w zakresie; nazwa testu zawiera ID przypadku.
  6. Otwórz PR `IMP-463: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-COMPAT-001…010, TC-PERF-014, TC-PERF-015 wykonane
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 8 h (M) | **Ryzyko:** niskie

### IMP-464 – Przygotowanie UAT i próby generalnej
- **Epik / obszar:** EP-11 QA i automatyzacja testów | **Rola:** QA
- **Cel:** Próbny turniej ma gotowy scenariusz, dane, instrukcje, sprzęt i sposób zbierania defektów, tak że w dniu próby zespół tylko go przeprowadza.
- **Zakres:** Scenariusz z 07-uat, dane, instrukcje dla organizatora i sędziów, formularze ankiet, karty kontrolne papierowe, harmonogram dnia, sprzęt (router sterowany, tablety), triage defektów; **Poza zakresem:** Rekrutacja uczestników (PM)
- **Zależności:** [IMP-457](#imp-457--e2e-pełnego-turnieju-dwa-urządzenia)
- **Odwołania:** NFR-301, US-080, [TC-UAT-001](../03-test-plans/07-uat-proba-generalna.md#tc-uat-001)…004
- **Kroki:**
  1. Przygotuj w `docs-dev/qa/uat/` scenariusz z 07-uat-proba-generalna (harmonogram dnia, role, kroki TC-UAT) i dane turnieju (seed `uat` z fikcyjnymi zawodniczkami).
  2. Napisz instrukcje jednostronicowe dla organizatora i sędziów (parowanie, logowanie PIN-em, ocenianie, co robić bez sieci) i papierowe karty kontrolne ocen do porównania wyników.
  3. Przygotuj sprzęt: router sterowany (wyłączanie Wi-Fi według scenariusza), 5 tabletów z zainstalowanym buildem `preview`, telefon organizatora, ładowarki.
  4. Przygotuj formularze ankiet po próbie i tablicę triage defektów (S1–S4, właściciel, termin) w narzędziu zespołu.
  5. Uzgodnij pakiet z PM i organizatorem pilotażowym.
  6. Dopisz lub uruchom przypadki TC-UAT-001…004 w katalogach testów wskazanych w zakresie; nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-464: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] Pakiet zaakceptowany przez PM i organizatora pilotażowego
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 8 h (M) | **Ryzyko:** niskie

### IMP-465 – Próba generalna – wsparcie i poprawki
- **Epik / obszar:** EP-11 QA i automatyzacja testów | **Rola:** FULL
- **Cel:** Próba generalna zostaje przeprowadzona z udziałem zespołu, a defekty blokujące (S1/S2) są usunięte i zweryfikowane przed pilotażem.
- **Zakres:** Obecność zespołu na próbie, zbieranie defektów, poprawki S1/S2, ponowna weryfikacja; **Poza zakresem:** Defekty S3/S4 (backlog)
- **Zależności:** [IMP-464](#imp-464--przygotowanie-uat-i-próby-generalnej)
- **Odwołania:** US-070, US-080, US-083, [TC-UAT-001](../03-test-plans/07-uat-proba-generalna.md#tc-uat-001)…016
- **Kroki:**
  1. Przeprowadź próbę wg planu dnia z 07-uat §3 z dyżurem BE (dashboard, logi) i MOB (tablety) na miejscu.
  2. Zbieraj defekty na bieżąco w tablicy triage z nagraniem ekranu lub dziennikiem synchronizacji tabletu (IMP-359).
  3. Porównaj wyniki z papierowymi kartami kontrolnymi i PDF (zgodność rankingu i sum kontrolnych).
  4. Napraw defekty S1/S2 w ciągu kolejnych dni (PR z odwołaniem do TC-UAT) i wykonaj ponowną weryfikację na tych samych danych.
  5. Zapisz raport z próby (kryteria wyjścia UAT, ankiety, lista S3/S4 do backlogu) dla PM.
  6. Dopisz lub uruchom przypadki TC-UAT-001…016 w API (Vitest) i aplikacji (Jest/Maestro); nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-465: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-UAT-001…016 wykonane; kryteria wyjścia UAT spełnione
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 16 h (XL) | **Ryzyko:** wysokie

### IMP-466 – Regres ręczny przed wydaniem i triage defektów
- **Epik / obszar:** EP-11 QA i automatyzacja testów | **Rola:** QA
- **Cel:** Przed każdym wydaniem wykonane są przypadki ręczne P1 i triage defektów, a raport wydania potwierdza spełnienie kryteriów wyjścia ze strategii testów.
- **Zakres:** Wykonanie przypadków ręcznych P1 (TC-A11Y, TC-SYNC-006/023, TC-EDGE ręczne, TC-UAT przygotowawcze), raport wydania, triage i weryfikacja poprawek defektów S1/S2; **Poza zakresem:** –
- **Zależności:** [IMP-463](#imp-463--przebiegi-na-urządzeniach-referencyjnych), [IMP-458](#imp-458--e2e-offline--narzędzia-sieci-i-scenariusze-tc-sync-001020), [IMP-469](#imp-469--e2e-offline--scenariusze-tc-sync-021040-pojemność-zdarzenia-cykl-życia)
- **Odwołania:** NFR-903, NFR-308, [TC-SYNC-006](../03-test-plans/04-testy-offline-i-synchronizacji.md#tc-sync-006), [TC-SYNC-023](../03-test-plans/04-testy-offline-i-synchronizacji.md#tc-sync-023), [TC-EDGE-013](../03-test-plans/08-przypadki-brzegowe.md#tc-edge-013), [TC-EDGE-048](../03-test-plans/08-przypadki-brzegowe.md#tc-edge-048)
- **Kroki:**
  1. Utwórz `docs-dev/qa/release-checklist.md` z kryteriami wyjścia z 00-strategia §8 (zielone CI, E2E P1, zero otwartych S1/S2, wyniki k6 i PDF, mapowania bezpieczeństwa).
  2. Wykonaj przypadki ręczne P1: TC-SYNC-006 i 023, TC-EDGE oznaczone jako ręczne (np. 013, 048), scenariusze TC-A11Y, TC-UAT przygotowawcze.
  3. Prowadź triage defektów (ważność, przypisanie, termin) i weryfikuj poprawki S1/S2 na buildzie kandydującym.
  4. Przygotuj raport wydania (wersja, wyniki, otwarte ryzyka, decyzja go/no-go) i przekaż PM.
  5. Dopisz lub uruchom przypadki TC-SYNC-006, TC-SYNC-023, TC-EDGE-013, TC-EDGE-048 w katalogach testów wskazanych w zakresie; nazwa testu zawiera ID przypadku.
  6. Otwórz PR `IMP-466: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] Raport wydania bez otwartych S1/S2
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 12 h (L) | **Ryzyko:** średnie


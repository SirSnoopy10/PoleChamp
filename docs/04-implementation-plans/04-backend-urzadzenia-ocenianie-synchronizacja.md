# EP-04 – Backend: urządzenia, ocenianie, synchronizacja, realtime

> Dokument: `04-implementation-plans/04-backend-urzadzenia-ocenianie-synchronizacja.md` · Tech Lead (Agent 2) · 23.10.2026 · Konwencje i DoD: [00-konwencje-i-definition-of-done.md](00-konwencje-i-definition-of-done.md) · Indeks: [91-indeks-zadan.md](91-indeks-zadan.md)

Najbardziej krytyczny epik dla integralności danych: parowanie tabletów, sesje PIN (online i offline), migawka i dziennik zmian, `sync/push` z idempotencją, przyjmowanie arkuszy z walidacją sesji (TL-12), odrzucone zgłoszenia w rozszerzonym zakresie (TL-13, [ADR-010](../01-architecture/adr/ADR-010-blokada-kategorii-a-oceny-offline.md)), przeliczanie wyników i kanał realtime (Socket.IO przez ALB – [ADR-003](../01-architecture/adr/ADR-003-styl-api-rest-i-websocket.md)). Zadania IMP-146, IMP-147 i IMP-127 (blokada, EP-03) mają ryzyko wysokie i wymagają przeglądu TL oraz testów współbieżności.

## Podsumowanie

| Zadań | Suma | Rola (h) |
|---|---|---|
| 17 | 110 h | BE 110 |


## Zadania

### IMP-140 – Kody parowania
- **Epik / obszar:** EP-04 Backend – urządzenia, ocenianie, synchronizacja, realtime | **Rola:** BE
- **Cel:** Organizator generuje kod parowania (tekst i QR) ważny 10 minut dla maksymalnie 10 tabletów, a w bazie zostaje tylko jego hash.
- **Zakres:** `POST /tournaments/{id}/pairing-codes`: 8 znaków z alfabetu 31 znaków, hash SHA-256, 10 min, `max_uses` 10, `qrPayload`; **Poza zakresem:** Parowanie (IMP-141)
- **Zależności:** [IMP-105](03-backend-konto-i-konfiguracja-turnieju.md#imp-105--migracja-2-turnieje-kategorie-kryteria-kary-zawodniczki-sędziowie), [IMP-062](02-pakiety-wspoldzielone.md#imp-062--contracts-zawodniczki-sędziowie-urządzenia-parowanie)
- **Odwołania:** FR-504, US-043, [TC-API-061](../03-test-plans/02-testy-integracyjne-api.md#tc-api-061)
- **Kroki:**
  1. Napisz `POST /v1/tournaments/{tournamentId}/pairing-codes` w `src/modules/devices/pairing-code.controller.ts` (`ORG:owner`, `TournamentWritableGuard` → `409 TOURNAMENT_FINISHED`).
  2. Generuj 8 znaków z alfabetu 31 znaków bez `0/O/1/I/L` (`crypto.randomInt`), format wyświetlania `XXXX-XXXX`.
  3. Zapisz `pairing_code` (`code_hash` = SHA-256 kodu bez myślnika, `expires_at` = teraz + 10 min, `max_uses = 10`, `use_count = 0`, `created_by`).
  4. Zwróć `{ code, qrPayload: "polechamp://pair?c=<kod>&t=<tournamentId>", expiresAt }` i zapisz audyt `PAIRING_CODE_CREATED` (bez kodu).
  5. Napisz testy: brak znaków mylących w 10 000 kodach, kod w bazie wyłącznie jako hash.
  6. Dopisz lub uruchom przypadki TC-API-061 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  7. Zaktualizuj schematy i rejestr OpenAPI w `@polechamp/contracts` (z `x-permissions`), dodaj wiersze macierzy TC-AUTHZ i uruchom test zgodności tras.
  8. Otwórz PR `IMP-140: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-API-061 przechodzi
  - [ ] Endpointy zarejestrowane w OpenAPI z `x-permissions`; wiersze TC-AUTHZ dla tych endpointów przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 4 h (S) | **Ryzyko:** niskie

### IMP-141 – Urządzenia: parowanie, token, lista, nazwa, unieważnienie
- **Epik / obszar:** EP-04 Backend – urządzenia, ocenianie, synchronizacja, realtime | **Rola:** BE
- **Cel:** Tablet paruje się kodem z turniejem i dostaje sekret oraz pepper PIN-ów, odświeża token urządzenia, a organizator widzi listę tabletów, zmienia ich nazwy i odłącza je ze skutkiem natychmiastowym.
- **Zakres:** `POST /devices/pair` (limit IP, atomowy `use_count`, sekret 256 bit, `pinPepper` 32 B – TL-05, limit 20 urządzeń, `device.paired`), `POST /devices/token` (1 h, `DEVICE_REVOKED`), `GET /tournaments/{id}/devices` (online wg TL-35), `PATCH`, `DELETE` (unieważnienie, `session.revoked`, rozłączenie WS); unieważnienie urządzeń usuniętego turnieju; **Poza zakresem:** Heartbeat (IMP-142)
- **Zależności:** [IMP-140](#imp-140--kody-parowania), [IMP-113](03-backend-konto-i-konfiguracja-turnieju.md#imp-113--jwt-es256-i-guardy-ról), [IMP-112](03-backend-konto-i-konfiguracja-turnieju.md#imp-112--limity-zapytań-valkey)
- **Odwołania:** FR-504, FR-505, US-043, US-044, TL-05, TL-35, [TC-API-062](../03-test-plans/02-testy-integracyjne-api.md#tc-api-062)…068, [TC-EDGE-037](../03-test-plans/08-przypadki-brzegowe.md#tc-edge-037), [TC-EDGE-038](../03-test-plans/08-przypadki-brzegowe.md#tc-edge-038), [TC-SEC-015](../03-test-plans/05-testy-niefunkcjonalne.md#tc-sec-015)
- **Kroki:**
  1. Napisz `POST /v1/devices/pair` (`PUBLIC`, `@RateLimit('pair:ip')`): wyszukaj `pairing_code` po hashu, sprawdź `expires_at` i atomowo `UPDATE … SET use_count = use_count + 1 WHERE use_count < max_uses` (inaczej `400 PAIRING_CODE_INVALID`).
  2. Utwórz `device` z sekretem 256 bit (w bazie `secret_hash` SHA-256) i `pepper` 32 B; zwróć `PairResponse` (`deviceId`, `deviceSecret`, `pinPepper` base64, `tournament { id, name }`); limit 20 urządzeń (`LIMIT_EXCEEDED`).
  3. Wyemituj `device.paired` (`deviceId`, `name`, `platform`) do pokoju `org:{tournamentId}` i zapisz audyt `DEVICE_PAIRED`.
  4. Napisz `POST /v1/devices/token` (sekret porównywany stałoczasowo): JWT `device` na 1 h; urządzenie z `revoked_at` → `401 DEVICE_REVOKED`.
  5. Napisz `GET /v1/tournaments/{tournamentId}/devices` z `online` (połączony WS albo `last_seen_at` < 75 s – TL-35), `lastSeenAt`, `lastSyncAt`, `pendingMutations`, `batteryLevel`, `activeJudge`, oraz `PATCH /v1/devices/{deviceId}` (nazwa ≤ 60).
  6. Napisz `DELETE /v1/devices/{deviceId}`: `revoked_at`, zamknięcie sesji sędziów urządzenia, `session.revoked { reason: DEVICE_REVOKED }`, `disconnectSockets` pokoju `device:{id}`, audyt `DEVICE_REVOKED`; unieważniaj też urządzenia przy usunięciu turnieju.
  7. Napisz testy: 11. użycie kodu, kod wygasły, token unieważnionego urządzenia na `sync/push`.
  8. Dopisz lub uruchom przypadki TC-API-062…068, TC-EDGE-037, TC-EDGE-038, TC-SEC-015 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  9. Zaktualizuj schematy i rejestr OpenAPI w `@polechamp/contracts` (z `x-permissions`), dodaj wiersze macierzy TC-AUTHZ i uruchom test zgodności tras.
  10. Otwórz PR `IMP-141: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-API-062…068, TC-EDGE-037, TC-EDGE-038, TC-SEC-015 przechodzą
  - [ ] Endpointy zarejestrowane w OpenAPI z `x-permissions`; wiersze TC-AUTHZ dla tych endpointów przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 8 h (M) | **Ryzyko:** średnie

### IMP-142 – Heartbeat urządzeń i stan online
- **Epik / obszar:** EP-04 Backend – urządzenia, ocenianie, synchronizacja, realtime | **Rola:** BE
- **Cel:** Organizator widzi, które tablety są online, ile mają niewysłanych ocen i kto jest na nich zalogowany, a te same dane zasilają ostrzeżenia przed blokadą kategorii.
- **Zakres:** `POST /devices/me/heartbeat` i zdarzenie WS `heartbeat`, aktualizacja `last_seen_at`, `pending_mutations`, `battery_level`, `active_judge_id`; `last_sync_at` przy push/pull; zdarzenie `device.status` (z ograniczeniem częstotliwości 1/5 s); **Poza zakresem:** –
- **Zależności:** [IMP-141](#imp-141--urządzenia-parowanie-token-lista-nazwa-unieważnienie)
- **Odwołania:** FR-806, FR-505, US-044, [TC-API-069](../03-test-plans/02-testy-integracyjne-api.md#tc-api-069), [TC-SYNC-024](../03-test-plans/04-testy-offline-i-synchronizacji.md#tc-sync-024)
- **Kroki:**
  1. Napisz `POST /v1/devices/me/heartbeat` (`DEV`, schemat `Heartbeat`: `pendingMutations`, `lastSyncCursor`, `batteryLevel`, `activeJudgeId`) → `204`.
  2. Obsłuż to samo w gateway jako zdarzenie WS `heartbeat` (wspólny `HeartbeatService.record(deviceId, payload)`).
  3. Aktualizuj `device.last_seen_at` przy każdym żądaniu urządzenia (hook Fastify `onResponse` dla tokenów `device`/`judge`) i `last_sync_at` przy udanym `sync/push` i `sync/changes`.
  4. Emituj `device.status` (`deviceId`, `online`, `pendingMutations`, `lastSeenAt`, `activeJudgeId`) do `org:{tournamentId}` tylko przy zmianie wartości i nie częściej niż 1/5 s per urządzenie (klucz w Valkey).
  5. Dodaj zadanie co 30 s oznaczające przejście w offline (brak kontaktu > 75 s) i emitujące `device.status { online: false }`.
  6. Dopisz lub uruchom przypadki TC-API-069, TC-SYNC-024 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  7. Zaktualizuj schematy i rejestr OpenAPI w `@polechamp/contracts` (z `x-permissions`), dodaj wiersze macierzy TC-AUTHZ i uruchom test zgodności tras.
  8. Otwórz PR `IMP-142: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-API-069, TC-SYNC-024 (API) przechodzą
  - [ ] Endpointy zarejestrowane w OpenAPI z `x-permissions`; wiersze TC-AUTHZ dla tych endpointów przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 5 h (M) | **Ryzyko:** niskie

### IMP-143 – Sesje sędziów online i limity prób PIN
- **Epik / obszar:** EP-04 Backend – urządzenia, ocenianie, synchronizacja, realtime | **Rola:** BE
- **Cel:** Sędzia loguje się PIN-em na sparowanym tablecie online, po błędach widzi liczbę pozostałych prób, po 10 błędach PIN jest blokowany do resetu, a nowe logowanie zamyka poprzednią sesję.
- **Zakres:** `POST /judge-sessions` (Argon2id, licznik globalny 10 → `pin_locked_at`, limit urządzenia 30/10 min, `PIN_INVALID` z `remainingAttempts`, `PIN_LOCKED`), jedna aktywna sesja (`REPLACED`), token judge 12 h; `DELETE /judge-sessions/current`; **Poza zakresem:** Mutacje sesji offline (IMP-148)
- **Zależności:** [IMP-141](#imp-141--urządzenia-parowanie-token-lista-nazwa-unieważnienie), [IMP-130](03-backend-konto-i-konfiguracja-turnieju.md#imp-130--sędziowie-lista-dodanie-z-pin-em-i-weryfikatorami-edycja-dezaktywacja-usunięcie)
- **Odwołania:** FR-508, FR-509, FR-511, FR-512, US-051, US-052, US-054, ADR-005, [TC-API-070](../03-test-plans/02-testy-integracyjne-api.md#tc-api-070)…075, [TC-SEC-014](../03-test-plans/05-testy-niefunkcjonalne.md#tc-sec-014)
- **Kroki:**
  1. Napisz `POST /v1/judge-sessions` (`DEV`, `JudgeSessionCreate`) w `src/modules/judge-sessions/judge-sessions.controller.ts`; sędzia musi należeć do turnieju urządzenia i być aktywny (`JUDGE_INACTIVE`).
  2. Weryfikuj PIN Argon2id; błąd zwiększa `judge.failed_pin_count` i zwraca `401 PIN_INVALID` z `remainingAttempts`; przy 10 ustaw `pin_locked_at` i zwracaj `423 PIN_LOCKED` z `requiresReset: true`.
  3. Dodaj limit urządzenia 30 błędnych prób / 10 min (Valkey) → `423 PIN_LOCKED` z `retryAfterSeconds` i `device.status` z flagą `suspicious`.
  4. Przy sukcesie zamknij poprzednią aktywną sesję sędziego (`ended_reason = REPLACED`, `session.revoked { reason: REPLACED }` do starego urządzenia), utwórz `judge_session` (`ONLINE_PIN`) i zwróć JWT `judge` (12 h, `sid`).
  5. Napisz `DELETE /v1/judge-sessions/current` (`JDG`, `ended_reason = LOGOUT`, `204`).
  6. Zapisz audyty `JUDGE_LOGIN_SUCCEEDED`, `JUDGE_LOGIN_FAILED`, `JUDGE_PIN_LOCKED` (bez wpisanego PIN-u) i napisz testy blokady globalnej sumowanej z dwóch urządzeń.
  7. Dopisz lub uruchom przypadki TC-API-070…075, TC-SEC-014 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  8. Zaktualizuj schematy i rejestr OpenAPI w `@polechamp/contracts` (z `x-permissions`), dodaj wiersze macierzy TC-AUTHZ i uruchom test zgodności tras.
  9. Otwórz PR `IMP-143: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-API-070…075, TC-SEC-014 przechodzą
  - [ ] Endpointy zarejestrowane w OpenAPI z `x-permissions`; wiersze TC-AUTHZ dla tych endpointów przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 8 h (M) | **Ryzyko:** średnie

### IMP-144 – Migawka urządzenia
- **Epik / obszar:** EP-04 Backend – urządzenia, ocenianie, synchronizacja, realtime | **Rola:** BE
- **Cel:** Świeżo sparowany tablet pobiera w jednej odpowiedzi wszystko, czego potrzebuje do pracy offline (kategorie, kryteria, starty, sędziowie z zaszyfrowanymi weryfikatorami PIN), bez roku urodzenia zawodniczek.
- **Zakres:** `GET /sync/snapshot`: transakcja REPEATABLE READ, kursor = maks. `seq`, dane bez roku urodzenia, sędziowie z `pinLocked` i `wrapped` (AES-256-GCM, klucz HKDF z peppera – TL-04), kategorie z panelem, `serverTime`; gzip; test rozmiaru dla FX-MAX; **Poza zakresem:** –
- **Zależności:** [IMP-141](#imp-141--urządzenia-parowanie-token-lista-nazwa-unieważnienie), [IMP-130](03-backend-konto-i-konfiguracja-turnieju.md#imp-130--sędziowie-lista-dodanie-z-pin-em-i-weryfikatorami-edycja-dezaktywacja-usunięcie), [IMP-063](02-pakiety-wspoldzielone.md#imp-063--contracts-synchronizacja-i-sesje-sędziów)
- **Odwołania:** FR-504, FR-506, FR-801, NFR-108, NFR-502, TL-04, [TC-API-076](../03-test-plans/02-testy-integracyjne-api.md#tc-api-076), [TC-SYNC-036](../03-test-plans/04-testy-offline-i-synchronizacji.md#tc-sync-036), [TC-RODO-004](../03-test-plans/02-testy-integracyjne-api.md#tc-rodo-004), [TC-EDGE-050](../03-test-plans/08-przypadki-brzegowe.md#tc-edge-050)
- **Kroki:**
  1. Napisz `GET /v1/sync/snapshot` (`DEV`) w `src/modules/sync/snapshot.controller.ts` w transakcji `REPEATABLE READ READ ONLY`; `cursor` = maks. `change_log.seq` turnieju odczytany w tej samej transakcji.
  2. Zbuduj `Snapshot`: turniej (`allowOfflinePinLogin`), sędziowie (`isActive`, `pinLocked`, `pinVersion`, `position`), kategorie z `panelJudgeIds`, `tieBreakCriterionId`, kryteriami, karami i startami (`fullName`, `club`, `startNumber`, `startOrder`, `status` – bez `birthYear`, `isMinor`).
  3. Napisz `src/crypto/pin-wrap.ts`: `K_dev = HKDF-SHA256(device.pepper, info "pc-pin-v1")`, `wrapped = AES-256-GCM(K_dev, pin_offline_verifier, aad = judgeId ‖ pinVersion)` (losowy IV 12 B, format `iv ‖ ct ‖ tag` w base64).
  4. Wygeneruj wektory testowe `packages/test-fixtures/vectors/pin-wrap.json` używane w testach API i aplikacji (IMP-305).
  5. Włącz kompresję gzip odpowiedzi i ustaw `serverTime`; zwracaj `401 DEVICE_REVOKED` dla unieważnionego urządzenia.
  6. Napisz test rozmiaru i czasu dla FX-MAX (≤ 1,5 MB JSON, ≤ 250 kB gzip) i test braku pól osobowych spoza listy.
  7. Dopisz lub uruchom przypadki TC-API-076, TC-SYNC-036, TC-RODO-004, TC-EDGE-050 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  8. Zaktualizuj schematy i rejestr OpenAPI w `@polechamp/contracts` (z `x-permissions`), dodaj wiersze macierzy TC-AUTHZ i uruchom test zgodności tras.
  9. Otwórz PR `IMP-144: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-API-076, TC-SYNC-036 (API), TC-RODO-004, TC-EDGE-050 przechodzą
  - [ ] Endpointy zarejestrowane w OpenAPI z `x-permissions`; wiersze TC-AUTHZ dla tych endpointów przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 8 h (M) | **Ryzyko:** średnie

### IMP-145 – Dziennik zmian i pobieranie zmian
- **Epik / obszar:** EP-04 Backend – urządzenia, ocenianie, synchronizacja, realtime | **Rola:** BE
- **Cel:** Tablet pobiera tylko zmiany od ostatniego kursora, widzi wyłącznie swoje arkusze i arkusze ze swojego urządzenia, a zbyt stary kursor prowadzi do ponownego pobrania migawki.
- **Zakres:** Wpisy `change_log` we wszystkich komendach (encje z 02-model §2.21, `audience` ALL/JUDGE/DEVICE – TL-49), `GET /sync/changes` (stronicowanie 500, `hasMore`, filtr audience wg tokenu, `CURSOR_EXPIRED`), retencja 30 dni po turnieju; **Poza zakresem:** –
- **Zależności:** [IMP-109](03-backend-konto-i-konfiguracja-turnieju.md#imp-109--audyt-dziennik-zmian-i-outbox-zdarzeń-w-transakcji), [IMP-144](#imp-144--migawka-urządzenia)
- **Odwołania:** FR-804, US-082, TL-49, [TC-API-077](../03-test-plans/02-testy-integracyjne-api.md#tc-api-077)…079
- **Kroki:**
  1. Uzupełnij wywołania `ChangeLogService.append` we wszystkich komendach z encjami z 02-model §2.21 (`tournament`, `category`, `criterion`, `penalty_type`, `entry`, `athlete`, `judge`, `score_sheet`) z właściwym `audience` (`ALL`, `JUDGE:{id}`, `DEVICE:{id}` – TL-49).
  2. Napisz `GET /v1/sync/changes?since=&limit=500` (`DEV` lub `JDG`) w `src/modules/sync/changes.controller.ts`: filtr `audience IN ('ALL', 'DEVICE:'||deviceId, 'JUDGE:'||judgeId z tokenu)`, stronicowanie po `seq`, `hasMore`.
  3. Materializuj encje przy odczycie (aktualny stan rekordu, dla `judge` – `pinVerifier` zaszyfrowany kluczem urządzenia), dla `op = D` tylko `id`.
  4. Zwracaj `410 CURSOR_EXPIRED`, gdy `since` < najstarszy zachowany `seq` turnieju (retencja 30 dni po zakończeniu).
  5. Napisz test kompletności `change-log.coverage.test.ts`: lista komend z modułów `tournaments`, `categories`, `entries`, `judges`, `scoring`, `rejected` – każda zapisuje co najmniej jeden wpis.
  6. Napisz testy izolacji: sędzia A nie dostaje arkuszy sędziego B; urządzenie dostaje przyjęte przez organizatora zgłoszenie ze swojego `deviceId`.
  7. Dopisz lub uruchom przypadki TC-API-077…079 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  8. Zaktualizuj schematy i rejestr OpenAPI w `@polechamp/contracts` (z `x-permissions`), dodaj wiersze macierzy TC-AUTHZ i uruchom test zgodności tras.
  9. Otwórz PR `IMP-145: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-API-077…079 przechodzą
  - [ ] Endpointy zarejestrowane w OpenAPI z `x-permissions`; wiersze TC-AUTHZ dla tych endpointów przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 8 h (M) | **Ryzyko:** średnie

### IMP-146 – Sync push: paczki, idempotencja, transakcje per mutacja
- **Epik / obszar:** EP-04 Backend – urządzenia, ocenianie, synchronizacja, realtime | **Rola:** BE
- **Cel:** Tablet wysyła kolejkę do 100 ocen jednym żądaniem, a serwer przetwarza każdą mutację niezależnie i dokładnie raz, zwracając wynik dla każdej z nich.
- **Zakres:** `POST /sync/push` (≤ 100, 413), przetwarzanie FIFO, każda mutacja w osobnej transakcji, `processed_mutation` z hashem (`DUPLICATE`, `IDEMPOTENCY_KEY_REUSED`), `RETRY` dla błędów przejściowych (deadlock, timeout), odpowiedź per mutacja + `cursor`; **Poza zakresem:** Handlery mutacji (IMP-147, IMP-148)
- **Zależności:** [IMP-145](#imp-145--dziennik-zmian-i-pobieranie-zmian), [IMP-063](02-pakiety-wspoldzielone.md#imp-063--contracts-synchronizacja-i-sesje-sędziów)
- **Odwołania:** FR-802, NFR-306, US-080, ADR-004, [TC-API-080](../03-test-plans/02-testy-integracyjne-api.md#tc-api-080), [TC-API-082](../03-test-plans/02-testy-integracyjne-api.md#tc-api-082), [TC-API-083](../03-test-plans/02-testy-integracyjne-api.md#tc-api-083), [TC-SYNC-003](../03-test-plans/04-testy-offline-i-synchronizacji.md#tc-sync-003)
- **Kroki:**
  1. Napisz `POST /v1/sync/push` (`DEV`, opcjonalnie `JDG`) w `src/modules/sync/push.controller.ts` ze schematem `PushRequest`; > 100 mutacji lub > 1 MB → `413`.
  2. Napisz `PushService.process(ctx, mutations)` przetwarzający w kolejności tablicy, każdą mutację w osobnej transakcji `withTx`, przez rejestr handlerów `MutationHandlerRegistry` (typ → handler).
  3. Sprawdzaj `processed_mutation`: ten sam `mutationId` i `request_hash` → `DUPLICATE` z zapisanym `result`; inny hash → `REJECTED IDEMPOTENCY_KEY_REUSED` + alert Sentry.
  4. Mapuj błędy przejściowe (`40P01` deadlock, `57014` timeout, utrata połączenia) na `RETRY` bez zapisu w `processed_mutation`; pozostałe wyniki zapisuj w tej samej transakcji co efekt.
  5. Zwróć `PushResponse` (`results[]`, `cursor` = aktualny maks. `seq`), zaktualizuj `device.last_sync_at` i metrykę `sync_rejected{code}`.
  6. Napisz testy: paczka z duplikatem, paczka z deadlockiem w środku (wcześniejsze `APPLIED` zostają), 101 mutacji.
  7. Dopisz lub uruchom przypadki TC-API-080, TC-API-082, TC-API-083, TC-SYNC-003 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  8. Zaktualizuj schematy i rejestr OpenAPI w `@polechamp/contracts` (z `x-permissions`), dodaj wiersze macierzy TC-AUTHZ i uruchom test zgodności tras.
  9. Otwórz PR `IMP-146: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-API-080, TC-API-082, TC-API-083, TC-SYNC-003 przechodzą
  - [ ] Endpointy zarejestrowane w OpenAPI z `x-permissions`; wiersze TC-AUTHZ dla tych endpointów przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 8 h (M) | **Ryzyko:** wysokie

### IMP-147 – Mutacja SUBMIT_SCORE_SHEET
- **Epik / obszar:** EP-04 Backend – urządzenia, ocenianie, synchronizacja, realtime | **Rola:** BE
- **Cel:** Ocena wystawiona na tablecie jest przyjmowana przez serwer tylko wtedy, gdy kategoria trwa, sędzia jest w panelu z ważną sesją, a arkusz pasuje do kryteriów; serwer sam liczy wynik i zapisuje rewizję.
- **Zakres:** INT-01…03 (`FOR SHARE` na kategorii), walidacja sesji (`JUDGE_SESSION_INVALID`, `PIN_VERSION_OUTDATED` – TL-12), `baseRevision` → `STALE_REVISION`, `validateSheet` → `SCHEMA_MISMATCH`, upsert arkusza/not/kar, rewizja (snapshot), `auth_mode`, `total` z `@polechamp/scoring`, ostrzeżenie `SCORE_TOTAL_MISMATCH`, przeliczenie (IMP-150), `CLOCK_SKEW` w audycie, zdarzenia; **Poza zakresem:** Zapis odrzuceń (IMP-149)
- **Zależności:** [IMP-146](#imp-146--sync-push-paczki-idempotencja-transakcje-per-mutacja), [IMP-150](#imp-150--serwis-przeliczania-wyników-kategorii), [IMP-143](#imp-143--sesje-sędziów-online-i-limity-prób-pin)
- **Odwołania:** FR-603, FR-607, FR-608, FR-612, US-064, INT-01, INT-02, INT-09, TL-12, [TC-API-081](../03-test-plans/02-testy-integracyjne-api.md#tc-api-081), [TC-API-084](../03-test-plans/02-testy-integracyjne-api.md#tc-api-084)…087, [TC-INT-001](../03-test-plans/02-testy-integracyjne-api.md#tc-int-001), [TC-INT-002](../03-test-plans/02-testy-integracyjne-api.md#tc-int-002), [TC-INT-009](../03-test-plans/02-testy-integracyjne-api.md#tc-int-009), [TC-AUDIT-003](../03-test-plans/02-testy-integracyjne-api.md#tc-audit-003)
- **Kroki:**
  1. Napisz `handlers/submit-score-sheet.ts`: `SELECT … FOR SHARE` na kategorii; odrzuć `CATEGORY_NOT_STARTED`, `CATEGORY_LOCKED`, `TOURNAMENT_FINISHED`, `ENTRY_WITHDRAWN`, `JUDGE_INACTIVE`, `JUDGE_NOT_IN_PANEL`.
  2. Waliduj sesję (TL-12): `judgeSessionId` to sesja `ONLINE_PIN` tego sędziego z tego urządzenia albo wcześniej zgłoszona `JUDGE_SESSION_STARTED` z aktualnym `pinVersion`; inaczej `JUDGE_SESSION_INVALID` lub `PIN_VERSION_OUTDATED`.
  3. Porównaj `baseRevision` z `score_sheet.revision` (inna wartość → `STALE_REVISION`) i uruchom `validateSheet` z `@polechamp/scoring` (`SCHEMA_MISMATCH`).
  4. Wykonaj upsert `score_sheet` (`id` = `scoreSheetId` z tabletu, `revision + 1`), zastąp `score_value` i `score_penalty`, policz `criteria_total_hundredths`, `penalty_total_hundredths`, `total_hundredths` przez `sheetTotal`, zapisz `client_total_hundredths`, `auth_mode`, `last_mutation_id`.
  5. Zapisz `score_sheet_revision` (`snapshot` z notami, karami, komentarzem, sumami i wersjami kryteriów, `actor_type = JUDGE`) i audyt `SCORE_SHEET_SUBMITTED`; różnica `clientTotal ≠ serverTotal` → audyt `SCORE_TOTAL_MISMATCH` + Sentry, różnica `createdAt` od czasu serwera > 10 min → `CLOCK_SKEW`.
  6. Wywołaj `ResultsService.recompute` (IMP-150), zapisz `change_log` (`score_sheet`, `JUDGE:{id}`) i zdarzenia `scoresheet.accepted`, `results.updated`, `progress.updated`.
  7. Zwróć `APPLIED` z `scoreSheetId`, `revision`, `serverTotal`; napisz testy każdego kodu odrzucenia i aktualizacji istniejącego arkusza.
  8. Dopisz lub uruchom przypadki TC-API-081, TC-API-084…087, TC-INT-001, TC-INT-002, TC-INT-009, TC-AUDIT-003 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  9. Otwórz PR `IMP-147: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-API-081, TC-API-084…087, TC-INT-001, TC-INT-002, TC-INT-009, TC-AUDIT-003 przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 10 h (L) | **Ryzyko:** wysokie

### IMP-148 – Mutacje sesji offline i raportu prób PIN
- **Epik / obszar:** EP-04 Backend – urządzenia, ocenianie, synchronizacja, realtime | **Rola:** BE
- **Cel:** Logowania offline, wylogowania i nieudane próby PIN-u z tabletu bez sieci docierają na serwer, więc sesje offline są uznawane, a zgadywanie PIN-u offline liczy się do blokady globalnej.
- **Zakres:** `JUDGE_SESSION_STARTED` (rejestr sesji OFFLINE_PIN, `pinVersion`), `JUDGE_SESSION_ENDED`, `PIN_ATTEMPTS_REPORT` (licznik globalny, blokada, `judges.changed`); **Poza zakresem:** –
- **Zależności:** [IMP-146](#imp-146--sync-push-paczki-idempotencja-transakcje-per-mutacja), [IMP-143](#imp-143--sesje-sędziów-online-i-limity-prób-pin)
- **Odwołania:** FR-509, FR-510, US-053, [TC-API-072](../03-test-plans/02-testy-integracyjne-api.md#tc-api-072), [TC-API-088](../03-test-plans/02-testy-integracyjne-api.md#tc-api-088)
- **Kroki:**
  1. Napisz `handlers/judge-session-started.ts`: utwórz `judge_session` z `id` z tabletu (`OFFLINE_PIN`, `started_at` = `createdAt`, `device_id`), sprawdź `pinVersion` (nieaktualny → `REJECTED PIN_VERSION_OUTDATED`).
  2. Napisz `handlers/judge-session-ended.ts`: ustaw `ended_at` i `ended_reason` (`LOGOUT`/`TIMEOUT`); oceny zatwierdzone wcześniej pozostają ważne.
  3. Napisz `handlers/pin-attempts-report.ts`: dodaj `failedCount` do `judge.failed_pin_count`; przy ≥ 10 ustaw `pin_locked_at`, zapisz `change_log` (`judge`) i wyemituj `judges.changed`.
  4. Zapisz audyty `JUDGE_SESSION_STARTED_OFFLINE`, `JUDGE_SESSION_ENDED`, `PIN_ATTEMPTS_REPORTED` (z `deviceId`).
  5. Napisz testy: sesja offline zgłoszona w tej samej paczce przed oceną, raport 6 + 5 prób z dwóch tabletów → blokada.
  6. Dopisz lub uruchom przypadki TC-API-072, TC-API-088 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-148: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-API-072, TC-API-088 przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 5 h (M) | **Ryzyko:** średnie

### IMP-149 – Odrzucone zgłoszenia: zapis, lista, przyjęcie, odrzucenie
- **Epik / obszar:** EP-04 Backend – urządzenia, ocenianie, synchronizacja, realtime | **Rola:** BE
- **Cel:** Ocena, której serwer nie mógł przyjąć (np. po blokadzie kategorii), nie znika: organizator widzi ją na liście i świadomie przyjmuje albo odrzuca, a tablet sędziego dowiaduje się o decyzji.
- **Zakres:** Zapis `rejected_submission` dla kodów z TL-13, `rejected.created`; `GET …/rejected-submissions`; `accept` (warunki, rewizja `actor_type = ORGANIZER`, `audience DEVICE`, przeliczenie, ostrzeżenie o nowszej ocenie sędziego – TC-EDGE-033); `discard`; **Poza zakresem:** –
- **Zależności:** [IMP-147](#imp-147--mutacja-submit_score_sheet)
- **Odwołania:** FR-805, US-083, ADR-010, TL-13, TL-49, [TC-API-096](../03-test-plans/02-testy-integracyjne-api.md#tc-api-096)…099, [TC-SYNC-031](../03-test-plans/04-testy-offline-i-synchronizacji.md#tc-sync-031), [TC-SYNC-032](../03-test-plans/04-testy-offline-i-synchronizacji.md#tc-sync-032), [TC-EDGE-033](../03-test-plans/08-przypadki-brzegowe.md#tc-edge-033)
- **Kroki:**
  1. W `PushService` zapisuj `rejected_submission` (`mutation_id`, identyfikatory, pełny `payload`, `reason`) dla odrzuceń `SUBMIT_SCORE_SHEET` poza `STALE_REVISION`, `SCHEMA_MISMATCH` i `IDEMPOTENCY_KEY_REUSED` (TL-13) i emituj `rejected.created`.
  2. Napisz `GET /v1/tournaments/{tournamentId}/rejected-submissions?resolution=PENDING` w `src/modules/rejected/` z danymi do wiersza SCR-ORG-22 (sędzia, numer i nazwisko, kategoria, powód, `receivedAt`, wynik z treści liczony `sheetTotal`).
  3. Napisz `POST /v1/rejected-submissions/{id}/accept`: wymagaj kategorii `IN_PROGRESS` i startu `ACTIVE` (`CATEGORY_LOCKED`, `CATEGORY_NOT_STARTED`, `ENTRY_WITHDRAWN`, `TOURNAMENT_FINISHED`), dopuść kody sesji i panelu (TL-13), utwórz lub zaktualizuj arkusz z rewizją `actor_type = ORGANIZER`.
  4. Przy przyjęciu zapisz `change_log` (`score_sheet`, `DEVICE:{deviceId}` – TL-49), przelicz wyniki, ustaw `resolution = ACCEPTED`, `resolved_by/at`; gdy sędzia ma nowszą rewizję, zwróć ostrzeżenie `newerSheetExists` w odpowiedzi.
  5. Napisz `POST /v1/rejected-submissions/{id}/discard` (`resolution = DISCARDED`); ponowne rozstrzygnięcie → `409 INVALID_STATE_TRANSITION`.
  6. Zapisz audyty `REJECTED_SUBMISSION_ACCEPTED`/`DISCARDED` i zaktualizuj `pendingRejectedSubmissions` w szczegółach turnieju i kategorii.
  7. Dopisz lub uruchom przypadki TC-API-096…099, TC-SYNC-031, TC-SYNC-032, TC-EDGE-033 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  8. Zaktualizuj schematy i rejestr OpenAPI w `@polechamp/contracts` (z `x-permissions`), dodaj wiersze macierzy TC-AUTHZ i uruchom test zgodności tras.
  9. Otwórz PR `IMP-149: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-API-096…099, TC-SYNC-007…011 (API), TC-SYNC-031, TC-SYNC-032, TC-EDGE-033 przechodzą
  - [ ] Endpointy zarejestrowane w OpenAPI z `x-permissions`; wiersze TC-AUTHZ dla tych endpointów przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 8 h (M) | **Ryzyko:** średnie

### IMP-150 – Serwis przeliczania wyników kategorii
- **Epik / obszar:** EP-04 Backend – urządzenia, ocenianie, synchronizacja, realtime | **Rola:** BE
- **Cel:** Po każdej zmianie ocen, panelu lub statusu startu serwer przelicza ranking kategorii w tej samej transakcji, a organizator dostaje sygnał o nowej wersji wyników.
- **Zakres:** `ResultsCalculator.recalculate(tx, categoryId)`: wczytanie startów, panelu (J), arkuszy; `@polechamp/scoring`; upsert `category_result`, `results_version + 1`, zdarzenia `results.updated`/`progress.updated`; wyzwalacze z 04 §10 (w tym zmiany panelu – TL-18); test wydajności 300 × 30 < 20 ms; **Poza zakresem:** –
- **Zależności:** [IMP-106](03-backend-konto-i-konfiguracja-turnieju.md#imp-106--migracja-3-urządzenia-sesje-oceny-wyniki), [IMP-055](02-pakiety-wspoldzielone.md#imp-055--scoring-formatowanie-wyników-i-postęp)
- **Odwołania:** FR-612, FR-702, FR-704, FR-209, TL-18, [TC-API-110](../03-test-plans/02-testy-integracyjne-api.md#tc-api-110), [TC-PERF-016](../03-test-plans/05-testy-niefunkcjonalne.md#tc-perf-016)
- **Kroki:**
  1. Napisz `ResultsService.recompute(tx, categoryId)` w `src/modules/results/calculator.ts`: wczytaj aktywne i wycofane starty, panel (`category_judge` z regułą J), arkusze z notą kryterium rozstrzygającego i sumą kar.
  2. Policz agregaty i ranking funkcjami `aggregate`, `tieBreakMean`, `penaltyMean`, `rankEntries` z `@polechamp/scoring`.
  3. Wykonaj upsert `category_result` (wszystkie wiersze kategorii jednym `INSERT … ON CONFLICT`), zwiększ `category.results_version`, ustaw `computed_at`.
  4. Wyemituj `results.updated` (`categoryId`, `resultsVersion`) i `progress.updated` (postęp kategorii i turnieju) przez `DomainEventService`.
  5. Wywołuj przeliczenie z komend: przyjęcie oceny, przyjęcie odrzuconego zgłoszenia, wycofanie/przywrócenie startu, zmiana panelu (dodanie lub aktywacja sędziego – TL-18), blokada kategorii.
  6. Napisz benchmark Vitest (`bench`) dla 300 startów × 30 sędziów (< 20 ms na przeliczenie bez I/O) i test zgodności z przykładami P4–P10.
  7. Dopisz lub uruchom przypadki TC-API-110, TC-PERF-016 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  8. Otwórz PR `IMP-150: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-API-110, TC-PERF-016 przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 8 h (M) | **Ryzyko:** średnie

### IMP-151 – Wyniki: endpointy rankingu kategorii i turnieju
- **Epik / obszar:** EP-04 Backend – urządzenia, ocenianie, synchronizacja, realtime | **Rola:** BE
- **Cel:** Organizator dostaje ranking kategorii i całego turnieju w gotowym formacie wyświetlania, identycznym z PDF.
- **Zakres:** `GET /categories/{id}/results` (wiersze z `display` z `formatRanking`, `entryStatus`, `isProvisional`, `tieBreak.criterionName`), `GET /tournaments/{id}/results` (wszystkie kategorie + nierozegrane); **Poza zakresem:** –
- **Zależności:** [IMP-150](#imp-150--serwis-przeliczania-wyników-kategorii), [IMP-064](02-pakiety-wspoldzielone.md#imp-064--contracts-wyniki-oceny-odrzucenia-eksporty-audyt)
- **Odwołania:** FR-701, FR-702, FR-703, FR-704, US-070, US-071, [TC-API-090](../03-test-plans/02-testy-integracyjne-api.md#tc-api-090)…093
- **Kroki:**
  1. Napisz `GET /v1/categories/{categoryId}/results` w `src/modules/results/results.controller.ts` (`ResultsResponse`): wiersze z `category_result` + dane startu, `display` z `formatRanking`, `entryStatus`, `isProvisional`.
  2. Dodaj nagłówek odpowiedzi: `resultsVersion`, `maxJudgeScore`, `judgeCount`, `formula: MEAN`, `tieBreak { criterionId, criterionName }`.
  3. Napisz `GET /v1/tournaments/{tournamentId}/results`: rankingi wszystkich kategorii w kolejności `position`, kategorie `DRAFT` w turnieju zakończonym oznaczone `unplayed: true`.
  4. Ustaw `ETag` = `resultsVersion` (warunkowe `If-None-Match` → `304`) dla odświeżeń po `results.updated`.
  5. Napisz testy na danych prototypu (wiersze z przykładu 03-api §3.6: 55,5; 52,70; 52,65; „—”).
  6. Dopisz lub uruchom przypadki TC-API-090…093 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  7. Zaktualizuj schematy i rejestr OpenAPI w `@polechamp/contracts` (z `x-permissions`), dodaj wiersze macierzy TC-AUTHZ i uruchom test zgodności tras.
  8. Otwórz PR `IMP-151: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-API-090…093 przechodzą
  - [ ] Endpointy zarejestrowane w OpenAPI z `x-permissions`; wiersze TC-AUTHZ dla tych endpointów przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 5 h (M) | **Ryzyko:** niskie

### IMP-152 – Oceny zawodniczki i historia rewizji dla organizatora
- **Epik / obszar:** EP-04 Backend – urządzenia, ocenianie, synchronizacja, realtime | **Rola:** BE
- **Cel:** Organizator widzi wszystkie oceny sędziów dla zawodniczki (noty, kary, komentarz, tag offline) i historię zmian każdej oceny.
- **Zakres:** `GET /entries/{id}/score-sheets` (noty, kary, komentarz, czas, `authMode`, liczba rewizji), `GET /score-sheets/{id}/revisions`; **Poza zakresem:** –
- **Zależności:** [IMP-147](#imp-147--mutacja-submit_score_sheet)
- **Odwołania:** FR-707, FR-902, US-074, [TC-API-094](../03-test-plans/02-testy-integracyjne-api.md#tc-api-094), [TC-API-095](../03-test-plans/02-testy-integracyjne-api.md#tc-api-095)
- **Kroki:**
  1. Napisz `GET /v1/entries/{entryId}/score-sheets` w `src/modules/scoring/organizer-read.controller.ts`: lista sędziów panelu z arkuszem lub `null` („brak oceny”), noty z wagami, kary z punktami, komentarz, `total`, `authMode`, `submittedAt`, `revisionCount`.
  2. Dodaj podsumowanie startu: `official`, `display`, `rank`, `sheetCount`, `expectedCount` (dane do nagłówka SCR-ORG-19).
  3. Napisz `GET /v1/score-sheets/{scoreSheetId}/revisions`: rewizje rosnąco z `revision`, `createdAt`, `total`, `actorType` (z `snapshot`).
  4. Sprawdź zakres właściciela przez `entry → category → tournament` (inaczej `404`) i dodaj test izolacji między organizatorami.
  5. Dopisz lub uruchom przypadki TC-API-094, TC-API-095 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  6. Zaktualizuj schematy i rejestr OpenAPI w `@polechamp/contracts` (z `x-permissions`), dodaj wiersze macierzy TC-AUTHZ i uruchom test zgodności tras.
  7. Otwórz PR `IMP-152: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-API-094, TC-API-095 przechodzą
  - [ ] Endpointy zarejestrowane w OpenAPI z `x-permissions`; wiersze TC-AUTHZ dla tych endpointów przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 4 h (S) | **Ryzyko:** niskie

### IMP-153 – Własne arkusze sędziego
- **Epik / obszar:** EP-04 Backend – urządzenia, ocenianie, synchronizacja, realtime | **Rola:** BE
- **Cel:** Po zalogowaniu online sędzia odzyskuje na tablecie swoje wcześniejsze oceny w tym turnieju (np. po zmianie tabletu).
- **Zakres:** `GET /judge/me/score-sheets` (tylko właściciel tokenu); **Poza zakresem:** –
- **Zależności:** [IMP-147](#imp-147--mutacja-submit_score_sheet)
- **Odwołania:** FR-610, FR-801, [TC-API-089](../03-test-plans/02-testy-integracyjne-api.md#tc-api-089)
- **Kroki:**
  1. Napisz `GET /v1/judge/me/score-sheets` (`JDG`) zwracający arkusze sędziego z tokenu (`sub`) w turnieju z tokenu (`trn`) z notami, karami, komentarzem, `revision` i `total`.
  2. Użyj schematu `ScoreSheet` z `@polechamp/contracts/sync` (ten sam format co `change_log` `score_sheet`).
  3. Napisz test izolacji: token sędziego A nie zwraca arkuszy sędziego B ani arkuszy z innego turnieju.
  4. Dodaj indeks `score_sheet(judge_id, category_id)` w migracji, jeśli plan zapytania tego wymaga (EXPLAIN w teście).
  5. Dopisz lub uruchom przypadki TC-API-089 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  6. Zaktualizuj schematy i rejestr OpenAPI w `@polechamp/contracts` (z `x-permissions`), dodaj wiersze macierzy TC-AUTHZ i uruchom test zgodności tras.
  7. Otwórz PR `IMP-153: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-API-089 przechodzi
  - [ ] Endpointy zarejestrowane w OpenAPI z `x-permissions`; wiersze TC-AUTHZ dla tych endpointów przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 2 h (XS) | **Ryzyko:** niskie

### IMP-154 – Gateway realtime (Socket.IO)
- **Epik / obszar:** EP-04 Backend – urządzenia, ocenianie, synchronizacja, realtime | **Rola:** BE
- **Cel:** Organizator i tablety utrzymują połączenie WebSocket z API, dołączają tylko do pokoi własnego turnieju i dostają sygnały o zmianach z każdego zadania ECS.
- **Zakres:** `@nestjs/platform-socket.io` 12, namespace `/rt`, transport tylko `websocket`, autoryzacja handshake (JWT, `auth.expired`), `subscribe` z autoryzacją pokoi (05 §4.1), adapter Redis na Valkey, `pingInterval` 25 s, obsługa `heartbeat` od tabletów; **Poza zakresem:** Publikator (IMP-155)
- **Zależności:** [IMP-113](03-backend-konto-i-konfiguracja-turnieju.md#imp-113--jwt-es256-i-guardy-ról), [IMP-010](01-fundamenty-i-devops.md#imp-010--terraform-elasticache-valkey)
- **Odwołania:** ADR-003, FR-703, FR-804, [TC-RT-001](../03-test-plans/02-testy-integracyjne-api.md#tc-rt-001), [TC-RT-002](../03-test-plans/02-testy-integracyjne-api.md#tc-rt-002), [TC-RT-010](../03-test-plans/02-testy-integracyjne-api.md#tc-rt-010), [TC-RT-011](../03-test-plans/02-testy-integracyjne-api.md#tc-rt-011)
- **Kroki:**
  1. Napisz `RealtimeGateway` w `src/modules/realtime/gateway.ts` (`@WebSocketGateway({ namespace: '/rt', transports: ['websocket'], pingInterval: 25_000 })`).
  2. Autoryzuj handshake (`auth.token` → `JwtService.verify`), zapisz `socket.data.principal`; wygasły token → emisja `auth.expired` i rozłączenie.
  3. Obsłuż `subscribe { tournamentId }`: organizator-właściciel → `tournament:{id}` i `org:{id}`; urządzenie i sędzia → `tournament:{id}` i `device:{deviceId}`; odmowa zgodnie z 05-bezpieczenstwo §4.1.
  4. Skonfiguruj `@socket.io/redis-adapter` na Valkey (pub/sub), aby emisja z dowolnego zadania docierała do wszystkich połączeń.
  5. Obsłuż zdarzenie `heartbeat` od tabletów (`HeartbeatService`) i metrykę `ws_connections`.
  6. Napisz testy z `socket.io-client`: subskrypcja cudzego turnieju (odmowa), dwa zadania API z adapterem (emisja dociera), wygaśnięcie tokenu.
  7. Dopisz lub uruchom przypadki TC-RT-001, TC-RT-002, TC-RT-010, TC-RT-011 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  8. Otwórz PR `IMP-154: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-RT-001, TC-RT-002, TC-RT-010, TC-RT-011 przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 8 h (M) | **Ryzyko:** średnie

### IMP-155 – Publikator zdarzeń z outboxu
- **Epik / obszar:** EP-04 Backend – urządzenia, ocenianie, synchronizacja, realtime | **Rola:** BE
- **Cel:** Zdarzenia realtime są wysyłane dopiero po zatwierdzeniu transakcji i co najmniej raz, także po restarcie zadania API.
- **Zakres:** Proces w `api` (lider wybierany blokadą advisory) odpytujący `domain_event` (`published_at IS NULL`, `FOR UPDATE SKIP LOCKED`, paczki 100, co 200 ms) i emitujący do pokoi; LISTEN/NOTIFY jako przyspieszenie; metryka opóźnienia; degradacja przy braku Valkey; **Poza zakresem:** –
- **Zależności:** [IMP-154](#imp-154--gateway-realtime-socketio), [IMP-109](03-backend-konto-i-konfiguracja-turnieju.md#imp-109--audyt-dziennik-zmian-i-outbox-zdarzeń-w-transakcji)
- **Odwołania:** FR-703, FR-804, NFR-307, ADR-003, [TC-RT-009](../03-test-plans/02-testy-integracyjne-api.md#tc-rt-009), [TC-RT-012](../03-test-plans/02-testy-integracyjne-api.md#tc-rt-012), [TC-SYNC-019](../03-test-plans/04-testy-offline-i-synchronizacji.md#tc-sync-019)
- **Kroki:**
  1. Napisz `EventPublisher` w `src/modules/realtime/publisher.ts`: lider wybierany `pg_try_advisory_lock(<stała>)` (jeden publikator na klaster, przejęcie po utracie połączenia).
  2. Odpytuj co 200 ms `SELECT … FROM domain_event WHERE published_at IS NULL ORDER BY id LIMIT 100 FOR UPDATE SKIP LOCKED`, emituj do pokoi wg `EVENT_ROOM` i ustaw `published_at`.
  3. Dodaj `LISTEN domain_event` (wyzwalacz `pg_notify` po INSERT) jako przyspieszenie – publikacja bez czekania na interwał.
  4. Raportuj metrykę `event_publisher_lag_s` (wiek najstarszego nieopublikowanego zdarzenia).
  5. Przy niedostępnym Valkey wstrzymaj publikację (zdarzenia czekają w tabeli), a klienci przechodzą na odpytywanie; po powrocie wyślij zaległe.
  6. Dodaj czyszczenie opublikowanych zdarzeń starszych niż 7 dni w zadaniu retencji i testy: restart lidera, wycofana transakcja nie emituje.
  7. Dopisz lub uruchom przypadki TC-RT-009, TC-RT-012, TC-SYNC-019 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  8. Otwórz PR `IMP-155: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-RT-009, TC-RT-012, TC-SYNC-019 (API) przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** średnie

### IMP-156 – Mapowanie komend na zdarzenia realtime
- **Epik / obszar:** EP-04 Backend – urządzenia, ocenianie, synchronizacja, realtime | **Rola:** BE
- **Cel:** Każda zmiana wprowadzona przez organizatora lub tablet trafia do właściwych odbiorców w ciągu 2–3 s jako konkretne, typowane zdarzenie realtime.
- **Zakres:** Emisja zdarzeń z 03-api §6 dla wszystkich komend (statusy, konfiguracja, sędziowie, oceny, wyniki, postęp, urządzenia, odrzucenia, sesje) + `sync.hint`; test tabelaryczny komenda → zdarzenia; **Poza zakresem:** –
- **Zależności:** [IMP-155](#imp-155--publikator-zdarzeń-z-outboxu), [IMP-149](#imp-149--odrzucone-zgłoszenia-zapis-lista-przyjęcie-odrzucenie), [IMP-142](#imp-142--heartbeat-urządzeń-i-stan-online)
- **Odwołania:** FR-703, FR-804, US-072, US-082, TL-14, [TC-RT-003](../03-test-plans/02-testy-integracyjne-api.md#tc-rt-003)…008
- **Kroki:**
  1. Utwórz `src/modules/realtime/events.map.ts`: tabela komenda → zdarzenia (np. `LockCategoryCommand` → `category.locked`, `results.updated`, `sync.hint`; `ResetPinCommand` → `judges.changed`, `session.revoked`).
  2. Dodaj brakujące emisje w komendach turniejów, kategorii, kryteriów, kar, startów, sędziów, urządzeń, odrzuceń i ocen zgodnie z tabelą.
  3. Emituj `sync.hint { cursor }` do pokoju `tournament` po każdym wpisie `change_log` widocznym dla tabletów (zbiorczo, raz na transakcję).
  4. Emituj `session.revoked` z właściwym `reason` (`DEVICE_REVOKED`, `PIN_RESET`, `REPLACED`, `JUDGE_DEACTIVATED`, `TOURNAMENT_FINISHED` – TL-14) do pokoju `device:{id}`.
  5. Napisz test tabelaryczny `events.map.test.ts`: dla każdej komendy wykonanej na seedzie sprawdź zbiór wpisów `domain_event`.
  6. Dopisz lub uruchom przypadki TC-RT-003…008 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-156: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-RT-003…008 przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 5 h (M) | **Ryzyko:** niskie


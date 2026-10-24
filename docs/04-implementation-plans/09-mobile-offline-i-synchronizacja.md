# EP-09 – Mobile: offline i synchronizacja

> Dokument: `04-implementation-plans/09-mobile-offline-i-synchronizacja.md` · Tech Lead (Agent 2) · 23.10.2026 · Konwencje i DoD: [00-konwencje-i-definition-of-done.md](00-konwencje-i-definition-of-done.md) · Indeks: [91-indeks-zadan.md](91-indeks-zadan.md)

Lokalna baza (`expo-sqlite` + Drizzle, WAL i `synchronous=FULL` – TL-20), migawka, pull, outbox i SyncEngine wg [06-offline-i-synchronizacja.md](../01-architecture/06-offline-i-synchronizacja.md) i [ADR-004](../01-architecture/adr/ADR-004-offline-first-tablet.md). Epik ma najwyższą koncentrację ryzyka (R-02): każde zadanie ma testy jednostkowe na tej samej bazie (better-sqlite3 z migracjami aplikacji) i scenariusze z [04-testy-offline-i-synchronizacji.md](../03-test-plans/04-testy-offline-i-synchronizacji.md).

## Podsumowanie

| Zadań | Suma | Rola (h) |
|---|---|---|
| 10 | 61 h | MOB 61 |


## Zadania

### IMP-350 – Lokalna baza SQLite: schemat, migracje, PRAGMA
- **Epik / obszar:** EP-09 Mobile – offline i synchronizacja | **Rola:** MOB
- **Cel:** Tablet ma trwałą lokalną bazę SQLite z pełnym schematem danych offline, migracjami i ustawieniami chroniącymi zatwierdzone oceny przed zabiciem aplikacji i utratą zasilania.
- **Zakres:** `expo-sqlite` 58 + Drizzle (driver expo-sqlite), tabele z 06-offline §2 (z kolumnami TL-04/TL-21), migracje wersjonowane w aplikacji, PRAGMA wg TL-20 (WAL, `synchronous=FULL`, `fullfsync` iOS, `foreign_keys`), serwis `LocalDb` z transakcjami, zapytania filtrowane po `judge_id`; **Poza zakresem:** Migawka (IMP-351)
- **Zależności:** [IMP-201](06-mobile-fundamenty-i-design-system.md#imp-201--metro-pnpm-workspace-i-środowisko-testów-mobile), [IMP-603](14-spike.md#imp-603--spike-trwałość-expo-sqlite-przy-kill--9-i-utracie-zasilania-limit-8-h), [IMP-609](14-spike.md#imp-609--spike-drizzle-na-expo-sqlite-i-zapis-migawki-limit-6-h)
- **Odwołania:** ADR-004, NFR-302, TL-20, FR-610, [TC-STATE-008](../03-test-plans/01-testy-jednostkowe.md#tc-state-008), [TC-SYNC-040](../03-test-plans/04-testy-offline-i-synchronizacji.md#tc-sync-040)
- **Kroki:**
  1. Zdefiniuj schemat Drizzle w `src/data/local/schema.ts`: `sync_meta`, `local_tournament`, `local_category`, `local_criterion`, `local_penalty_type`, `local_entry`, `local_judge` (z `wrapped_verifier`, `pin_offline_salt`, `pin_iterations`, `failed_attempts`, `lock_level`, `locked_until`), `local_judge_session`, `local_score_sheet`, `local_score_value`, `local_score_penalty`, `local_draft`, `outbox`.
  2. Dodaj indeksy: `local_entry(category_id, start_order)`, `local_score_sheet(judge_id, category_id)`, UNIQUE `local_score_sheet(entry_id, judge_id)`, `outbox(state, seq)`.
  3. Wygeneruj migracje `drizzle-kit` (driver `expo`) do `src/data/local/migrations/` i uruchamiaj je `useMigrations` przed pierwszym ekranem trybu sędziego.
  4. Napisz `src/data/local/LocalDb.ts`: `openDatabaseSync('polechamp.db')` z PRAGMA `journal_mode = WAL`, `synchronous = FULL`, `foreign_keys = ON`, na iOS `fullfsync = ON` i `checkpoint_fullfsync = ON` (TL-20); metoda `tx(fn)` (`withTransactionAsync`, `BEGIN IMMEDIATE`).
  5. Wymuś filtr `judge_id` w zapytaniach o arkusze przez repozytorium `ScoreSheetRepo.forJudge(judgeId)` (FR-610 – brak ocen innych sędziów).
  6. Napisz testy na mocku `better-sqlite3`: migracja od zera, unikalność arkusza, odczyt PRAGMA.
  7. Dopisz lub uruchom przypadki TC-STATE-008, TC-SYNC-040 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  8. Otwórz PR `IMP-350: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-STATE-008, TC-SYNC-040 (izolacja) przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 8 h (M) | **Ryzyko:** wysokie

### IMP-351 – Pobieranie i zapis migawki
- **Epik / obszar:** EP-09 Mobile – offline i synchronizacja | **Rola:** MOB
- **Cel:** Tablet pobiera pełną migawkę turnieju i zapisuje ją w jednej transakcji tak, że zatwierdzone oceny i kolejka wysyłki nigdy nie są usuwane.
- **Zakres:** `GET /sync/snapshot`, podmiana danych referencyjnych w jednej transakcji (bez usuwania arkuszy i outboxu), `sync_meta` (kursor, czasy, zegar monotoniczny), wydajność ≤ 2 s dla FX-MAX; **Poza zakresem:** –
- **Zależności:** [IMP-350](#imp-350--lokalna-baza-sqlite-schemat-migracje-pragma), [IMP-214](06-mobile-fundamenty-i-design-system.md#imp-214--warstwa-api-klienta-tokeny-odświeżanie-błędy), [IMP-144](04-backend-urzadzenia-ocenianie-synchronizacja.md#imp-144--migawka-urządzenia)
- **Odwołania:** FR-504, FR-801, NFR-108, [TC-SYNC-036](../03-test-plans/04-testy-offline-i-synchronizacji.md#tc-sync-036), [TC-PERF-008](../03-test-plans/05-testy-niefunkcjonalne.md#tc-perf-008)
- **Kroki:**
  1. Napisz `src/data/sync/snapshot.ts`: `GET /v1/sync/snapshot` (token urządzenia, timeout 30 s, gzip) i walidacja schematem `Snapshot` z `@polechamp/contracts`.
  2. W jednej transakcji `LocalDb.tx` usuń i wstaw dane referencyjne (`local_tournament`, `local_category` z `panel_judge_ids`, `local_criterion`, `local_penalty_type`, `local_entry`, `local_judge` z `wrapped_verifier` i solą) bez dotykania `local_score_*`, `local_draft` i `outbox`.
  3. Zachowaj lokalne liczniki prób PIN (`failed_attempts`, `lock_level`, `locked_until`) przy podmianie `local_judge`.
  4. Zapisz `sync_meta`: `cursor`, `last_full_snapshot_at`, `last_sync_server_time` = `serverTime`, `last_sync_monotonic_ms` (licznik monotoniczny), `server_time_offset_ms`, `schema_version`.
  5. Wstawiaj wiersze paczkami (`INSERT … VALUES` po 500) i zmierz czas zapisu FX-MAX (cel ≤ 2 s na tablecie referencyjnym).
  6. Dopisz lub uruchom przypadki TC-SYNC-036, TC-PERF-008 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-351: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-SYNC-036 (tablet), TC-PERF-008 przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** średnie

### IMP-352 – Pobieranie zmian (pull)
- **Epik / obszar:** EP-09 Mobile – offline i synchronizacja | **Rola:** MOB
- **Cel:** Tablet dociąga zmiany od ostatniego kursora (nowe zawodniczki, blokady, resety PIN-u, przyjęte oceny), stosuje je atomowo i odświeża ekrany bez przeładowania.
- **Zakres:** Stronicowanie `sync/changes`, zastosowanie strony w transakcji, kursor na końcu, `CURSOR_EXPIRED` → migawka, zmiany `pin_version`/`pin_locked` (TC-STATE-010), arkusze `audience DEVICE` (TL-49), zdarzenia UI (toast listy, odświeżenie kolejki); **Poza zakresem:** –
- **Zależności:** [IMP-351](#imp-351--pobieranie-i-zapis-migawki), [IMP-145](04-backend-urzadzenia-ocenianie-synchronizacja.md#imp-145--dziennik-zmian-i-pobieranie-zmian)
- **Odwołania:** FR-804, US-082, TL-49, [TC-STATE-010](../03-test-plans/01-testy-jednostkowe.md#tc-state-010), [TC-SYNC-016](../03-test-plans/04-testy-offline-i-synchronizacji.md#tc-sync-016), [TC-SYNC-029](../03-test-plans/04-testy-offline-i-synchronizacji.md#tc-sync-029), [TC-SYNC-038](../03-test-plans/04-testy-offline-i-synchronizacji.md#tc-sync-038), [TC-EDGE-061](../03-test-plans/08-przypadki-brzegowe.md#tc-edge-061)
- **Kroki:**
  1. Napisz `src/data/sync/pull.ts`: pętla `GET /v1/sync/changes?since={cursor}&limit=500` do `hasMore = false` (token sędziego, jeśli zalogowany, inaczej urządzenia).
  2. Stosuj każdą stronę w jednej transakcji: upsert/usuwanie wg `entityType` i `op`, kursor `sync_meta.cursor` zapisany na końcu transakcji.
  3. Obsłuż `410 CURSOR_EXPIRED` i niezgodny `schema_version` → pełna migawka (IMP-351).
  4. Przy zmianie `pin_version` sędziego zamknij jego lokalną sesję `OFFLINE_PIN` i wymuś ponowny PIN; przy `pin_locked` zablokuj profil (SCR-JDG-08).
  5. Zastosuj arkusze `score_sheet` (audience `JUDGE` i `DEVICE` – TL-49): `server_revision`, `server_total_hundredths`, `sync_state = SYNCED`.
  6. Emituj zdarzenia aplikacji `startListChanged(categoryId)`, `categoryStatusChanged`, `judgesChanged` dla ekranów (toast „Lista startowa została zaktualizowana”, odświeżenie kolejki).
  7. Aktualizuj `last_pull_at` i `last_sync_monotonic_ms`; napisz testy na sekwencjach zmian z danymi prototypu.
  8. Dopisz lub uruchom przypadki TC-STATE-010, TC-SYNC-016, TC-SYNC-029, TC-SYNC-038, TC-EDGE-061 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  9. Otwórz PR `IMP-352: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-STATE-010, TC-SYNC-016, TC-SYNC-029, TC-SYNC-038, TC-EDGE-061 przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 8 h (M) | **Ryzyko:** średnie

### IMP-353 – Outbox – rdzeń
- **Epik / obszar:** EP-09 Mobile – offline i synchronizacja | **Rola:** MOB
- **Cel:** Każda zatwierdzona ocena i zdarzenie sesji trafia do trwałej kolejki FIFO, która przetrwa restart i nie wyśle tej samej mutacji z inną treścią.
- **Zakres:** API `outbox.enqueue(tx, mutation)` (UUIDv7), stany QUEUED/IN_FLIGHT/DONE/FAILED_PERMANENT, FIFO, `nextBatch(100)`, odtworzenie po starcie (TL-20), retencja DONE 24 h, zasada dla ponownego zatwierdzenia przed wysyłką (zastąpienie mutacji w kolejce – udokumentować); **Poza zakresem:** Wysyłka (IMP-354)
- **Zależności:** [IMP-350](#imp-350--lokalna-baza-sqlite-schemat-migracje-pragma), [IMP-063](02-pakiety-wspoldzielone.md#imp-063--contracts-synchronizacja-i-sesje-sędziów)
- **Odwołania:** FR-802, NFR-302, NFR-301, TL-20, [TC-OUTBOX-001](../03-test-plans/01-testy-jednostkowe.md#tc-outbox-001), [TC-OUTBOX-002](../03-test-plans/01-testy-jednostkowe.md#tc-outbox-002), [TC-OUTBOX-008](../03-test-plans/01-testy-jednostkowe.md#tc-outbox-008), [TC-OUTBOX-009](../03-test-plans/01-testy-jednostkowe.md#tc-outbox-009), [TC-OUTBOX-013](../03-test-plans/01-testy-jednostkowe.md#tc-outbox-013), [TC-OUTBOX-014](../03-test-plans/01-testy-jednostkowe.md#tc-outbox-014), [TC-OUTBOX-015](../03-test-plans/01-testy-jednostkowe.md#tc-outbox-015)
- **Kroki:**
  1. Napisz `src/data/outbox/outbox.ts` z `enqueue(tx, { type, payload })`: `mutation_id` UUIDv7 (`uuidv7()`), `state = QUEUED`, `created_at`, `attempts = 0`, `next_attempt_at = teraz` – zawsze w transakcji wywołującego.
  2. Dodaj `nextBatch(limit = 100)`: `SELECT … WHERE state = 'QUEUED' AND next_attempt_at <= ? ORDER BY seq LIMIT ?` i oznaczenie `IN_FLIGHT` w tej samej transakcji.
  3. Dodaj `markDone`, `markRetry(attempts, nextAt, error)`, `markFailedPermanent(code)` i `recoverInFlight()` (wszystkie `IN_FLIGHT` → `QUEUED` przy starcie – TL-20).
  4. Ustal i udokumentuj w `outbox.ts` zasadę ponownego zatwierdzenia przed wysyłką: niewysłana (`QUEUED`) mutacja `SUBMIT_SCORE_SHEET` tego samego arkusza jest zastępowana nową treścią z nowym `mutation_id`; `IN_FLIGHT` nie jest ruszana, a nowa mutacja ma `baseRevision` po odpowiedzi.
  5. Dodaj retencję: usuwanie `DONE` starszych niż 24 h, zachowanie `FAILED_PERMANENT` do zakończenia turnieju.
  6. Dodaj liczniki `countPending()` i `countFailed()` dla `useSyncStore` i napisz testy jednostkowe stanów i kolejności.
  7. Dopisz lub uruchom przypadki TC-OUTBOX-001, TC-OUTBOX-002, TC-OUTBOX-008, TC-OUTBOX-009, TC-OUTBOX-013, TC-OUTBOX-014, TC-OUTBOX-015 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  8. Otwórz PR `IMP-353: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-OUTBOX-001, 002, 008, 009, 013, 014, 015 przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** średnie

### IMP-354 – SyncEngine – wysyłka (push)
- **Epik / obszar:** EP-09 Mobile – offline i synchronizacja | **Rola:** MOB
- **Cel:** Kolejka ocen jest wysyłana na serwer paczkami z ponowieniami i backoffem, a każdy wynik (przyjęta, duplikat, odrzucona, do ponowienia) aktualizuje stan arkusza na tablecie.
- **Zakres:** `POST /sync/push` z timeoutem 15 s, obsługa wyników (APPLIED/DUPLICATE/REJECTED/RETRY/brak), backoff z rozrzutem, ostrzeżenie po 20 próbach, procedura `DEVICE_REVOKED`, aktualizacja stanu arkuszy i `last_sync`; **Poza zakresem:** –
- **Zależności:** [IMP-353](#imp-353--outbox--rdzeń), [IMP-146](04-backend-urzadzenia-ocenianie-synchronizacja.md#imp-146--sync-push-paczki-idempotencja-transakcje-per-mutacja)
- **Odwołania:** FR-802, US-080, NFR-106, NFR-306, [TC-OUTBOX-003](../03-test-plans/01-testy-jednostkowe.md#tc-outbox-003)…007, [TC-OUTBOX-010](../03-test-plans/01-testy-jednostkowe.md#tc-outbox-010), [TC-OUTBOX-012](../03-test-plans/01-testy-jednostkowe.md#tc-outbox-012), [TC-SYNC-001](../03-test-plans/04-testy-offline-i-synchronizacji.md#tc-sync-001)…005, [TC-SYNC-020](../03-test-plans/04-testy-offline-i-synchronizacji.md#tc-sync-020)…022
- **Kroki:**
  1. Napisz `src/data/sync/push.ts` (`SyncEngine.push`): blokada single-flight, `outbox.nextBatch(100)`, `POST /v1/sync/push` z `deviceTime` i mutacjami w kolejności `seq`, timeout 15 s (`AbortController`).
  2. Dla `APPLIED`/`DUPLICATE`: `outbox.markDone`, `local_score_sheet.sync_state = SYNCED`, `server_revision`, `server_total_hundredths`.
  3. Dla `REJECTED`: `markFailedPermanent(code)`, `sync_state = REJECTED`, `reject_code` i przekazanie do `RejectionHandler` (IMP-357).
  4. Dla `RETRY`, braku wyniku, błędu sieci, 5xx i timeoutu: powrót do `QUEUED`, `attempts + 1`, `next_attempt_at = teraz + min(60 s, 1 s × 2^attempts) ± 20%`.
  5. Po 20 nieudanych próbach mutacji ustaw flagę ostrzeżenia w `useSyncStore` („Wymaga uwagi” w SCR-JDG-07), nie przerywając wysyłki.
  6. Obsłuż `401 DEVICE_REVOKED` → procedura unieważnienia (SCR-JDG-10), `401 UNAUTHENTICATED` → odświeżenie tokenu urządzenia i ponowienie, `413` → zmniejszenie paczki o połowę.
  7. Aktualizuj `sync_meta.last_push_at`, `cursor` z odpowiedzi i `server_time_offset_ms`; napisz testy z `msw` dla wszystkich wyników i backoffu.
  8. Dopisz lub uruchom przypadki TC-OUTBOX-003…007, TC-OUTBOX-010, TC-OUTBOX-012, TC-SYNC-001…005, TC-SYNC-020…022 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  9. Otwórz PR `IMP-354: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-OUTBOX-003…007, 010, 012, TC-SYNC-001…005, 020…022 przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 10 h (L) | **Ryzyko:** wysokie

### IMP-355 – SyncEngine – wyzwalacze, harmonogram, heartbeat
- **Epik / obszar:** EP-09 Mobile – offline i synchronizacja | **Rola:** MOB
- **Cel:** Tablet synchronizuje się sam: po zatwierdzeniu oceny, powrocie sieci, powrocie aplikacji na pierwszy plan, sygnale z serwera i co 30 s, a organizator dostaje regularny heartbeat.
- **Zakres:** Wyzwalacze z 06-offline §3.1 (zatwierdzenie, NetInfo, pierwszy plan, zdarzenia WS, timer 30 s, logowanie), pojedynczy przebieg (single-flight), heartbeat co 30 s (REST/WS) z kolejką, kursorem, baterią (`expo-battery`), sędzią; **Poza zakresem:** –
- **Zależności:** [IMP-354](#imp-354--syncengine--wysyłka-push), [IMP-352](#imp-352--pobieranie-zmian-pull), [IMP-216](06-mobile-fundamenty-i-design-system.md#imp-216--klient-realtime-z-fallbackiem-na-odpytywanie), [IMP-142](04-backend-urzadzenia-ocenianie-synchronizacja.md#imp-142--heartbeat-urządzeń-i-stan-online)
- **Odwołania:** FR-806, FR-802, FR-804, US-044, [TC-OUTBOX-011](../03-test-plans/01-testy-jednostkowe.md#tc-outbox-011), [TC-SYNC-024](../03-test-plans/04-testy-offline-i-synchronizacji.md#tc-sync-024)
- **Kroki:**
  1. Napisz `src/data/sync/SyncEngine.ts` z metodami `push()`, `pull()`, `syncNow()` (token → push → pull) i kolejką wywołań single-flight (kolejne żądanie podczas przebiegu ustawia flagę „jeszcze raz”).
  2. Podłącz wyzwalacze z 06-offline §3.1: zatwierdzenie oceny → `push`; NetInfo `isInternetReachable` true → `syncNow`; `AppState` active → `pull`, potem `push`; zdarzenia WS (`sync.hint`, `category.*`, `config.changed`, `judges.changed`) → `pull`; logowanie online → `GET /v1/judge/me/score-sheets`.
  3. Dodaj timer 30 s (aktywny, gdy outbox niepusty lub brak WS) wywołujący `push`/`pull`.
  4. Napisz `heartbeat.ts`: co 30 s przez WS (`heartbeat`) lub REST (`POST /v1/devices/me/heartbeat`) z `pendingMutations`, `lastSyncCursor`, `batteryLevel` (`expo-battery`), `activeJudgeId`.
  5. Zatrzymuj timery w tle (poza bieżącym przebiegiem) i wznawiaj na pierwszym planie.
  6. Napisz testy z fałszywym zegarem i mockiem NetInfo/AppState (kolejność wyzwalaczy, brak równoległych przebiegów).
  7. Dopisz lub uruchom przypadki TC-OUTBOX-011, TC-SYNC-024 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  8. Otwórz PR `IMP-355: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-OUTBOX-011, TC-SYNC-024 przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** średnie

### IMP-356 – Uwierzytelnianie urządzenia na tablecie
- **Epik / obszar:** EP-09 Mobile – offline i synchronizacja | **Rola:** MOB
- **Cel:** Tablet uwierzytelnia się sekretem z bezpiecznego magazynu, sam odświeża token urządzenia i token sędziego, a przy odłączeniu przez organizatora natychmiast przerywa pracę.
- **Zakres:** SecureStore (`deviceId`, sekret, `pinPepper`), odświeżanie tokenu urządzenia (1 h), token sędziego dla zalogowanej sesji online, przesunięcie zegara serwera, obsługa 401 `DEVICE_REVOKED`; **Poza zakresem:** –
- **Zależności:** [IMP-214](06-mobile-fundamenty-i-design-system.md#imp-214--warstwa-api-klienta-tokeny-odświeżanie-błędy), [IMP-141](04-backend-urzadzenia-ocenianie-synchronizacja.md#imp-141--urządzenia-parowanie-token-lista-nazwa-unieważnienie)
- **Odwołania:** ADR-005, FR-504, NFR-404, [TC-SEC-016](../03-test-plans/05-testy-niefunkcjonalne.md#tc-sec-016)
- **Kroki:**
  1. Napisz `src/data/auth/deviceAuth.ts`: odczyt `deviceId`, `deviceSecret` z SecureStore, `POST /v1/devices/token` → token w pamięci z czasem wygaśnięcia; odświeżanie 5 min przed `exp` i przy `401 UNAUTHENTICATED` (single-flight).
  2. Przechowuj `judgeToken` sesji online w pamięci (i SecureStore na czas sesji) i dołączaj go do `sync/push` oraz `sync/changes`, gdy sędzia jest zalogowany.
  3. Licz przesunięcie zegara serwera z nagłówka `Date` i `serverTime` (`server_time_offset_ms`) wyłącznie do wyświetlania.
  4. Obsłuż `401 DEVICE_REVOKED` z dowolnego żądania: zatrzymanie `SyncEngine`, zakończenie sesji sędziego, przejście do SCR-JDG-10.
  5. Napisz testy: brak sekretów w SQLite i MMKV, odświeżenie tokenu w trakcie push.
  6. Dopisz lub uruchom przypadki TC-SEC-016 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-356: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-SEC-016 (część tabletu) przechodzi
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 4 h (S) | **Ryzyko:** średnie

### IMP-357 – Obsługa odrzuceń na tablecie
- **Epik / obszar:** EP-09 Mobile – offline i synchronizacja | **Rola:** MOB
- **Cel:** Odrzucona przez serwer ocena jest wyraźnie oznaczona na tablecie, a sesja lub formularz reagują właściwie do powodu (zmieniony PIN, wyłączony sędzia, nieaktualny formularz, konflikt z innym tabletem).
- **Zakres:** Mapowanie kodów odrzucenia na stan arkusza, ikonę i baner; `PIN_VERSION_OUTDATED`/`JUDGE_INACTIVE` → zakończenie sesji; `SCHEMA_MISMATCH` → migawka i mapowanie szkicu po `criterion_id`; `STALE_REVISION` → stan do decyzji sędziego; **Poza zakresem:** –
- **Zależności:** [IMP-354](#imp-354--syncengine--wysyłka-push), [IMP-352](#imp-352--pobieranie-zmian-pull)
- **Odwołania:** FR-805, US-083, TL-13, [TC-SYNC-007](../03-test-plans/04-testy-offline-i-synchronizacji.md#tc-sync-007)…012, [TC-SYNC-017](../03-test-plans/04-testy-offline-i-synchronizacji.md#tc-sync-017), [TC-E2E-JDG-025](../03-test-plans/03-testy-e2e.md#tc-e2e-jdg-025)
- **Kroki:**
  1. Napisz `src/data/sync/RejectionHandler.ts` mapujący `reject_code` na stan arkusza (`REJECTED`), ikonę `warning-circle` w kolejce i baner z tekstem `rejection.reason.<code>`.
  2. `PIN_VERSION_OUTDATED` i `JUDGE_SESSION_INVALID` → zakończenie lokalnej sesji sędziego i komunikat „PIN został zmieniony. Zaloguj się ponownie.” / „Sesja sędziego jest nieważna. Zaloguj się ponownie.”.
  3. `JUDGE_INACTIVE` → zakończenie sesji i komunikat „Twój profil został wyłączony przez organizatora.”; `ENTRY_WITHDRAWN` → „Zawodniczka wycofana”.
  4. `SCHEMA_MISMATCH` → pełna migawka i mapowanie szkicu po `criterion_id`, arkusz wraca do edycji z komunikatem „Formularz jest nieaktualny. Synchronizuję…”.
  5. `STALE_REVISION` → stan do decyzji sędziego (baner „Ocena zmieniona na innym urządzeniu.” z „Pokaż aktualną” – IMP-316); `CATEGORY_LOCKED`/`TOURNAMENT_FINISHED` → baner odrzuceń w SCR-JDG-04.
  6. Napisz testy tabelaryczne kod → stan, baner i akcja sesji.
  7. Dopisz lub uruchom przypadki TC-SYNC-007…012, TC-SYNC-017, TC-E2E-JDG-025 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  8. Otwórz PR `IMP-357: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-SYNC-007…012, TC-SYNC-017 (tablet), TC-E2E-JDG-025 przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** średnie

### IMP-358 – Magazyn stanu synchronizacji (Zustand)
- **Epik / obszar:** EP-09 Mobile – offline i synchronizacja | **Rola:** MOB
- **Cel:** Pigułka synchronizacji, ikony kolejki i popover korzystają z jednego magazynu stanu, więc zawsze pokazują to samo.
- **Zakres:** Store: online (WS lub HTTP < 60 s – TL-45), liczba w kolejce, w locie, odrzucone, próby, ostatnia synchronizacja; selektory dla `SyncPill` i ikon kolejki; **Poza zakresem:** –
- **Zależności:** [IMP-353](#imp-353--outbox--rdzeń)
- **Odwołania:** FR-803, TL-45, [TC-STATE-003](../03-test-plans/01-testy-jednostkowe.md#tc-state-003)
- **Kroki:**
  1. Napisz `src/data/sync/syncStore.ts` (Zustand 5): `online` (WS połączony lub udane żądanie HTTP < 60 s – TL-45), `pending`, `inFlight`, `rejected`, `maxAttempts`, `lastSyncAt`, `isSyncing`.
  2. Aktualizuj magazyn z `SyncEngine` (start/koniec przebiegu, wyniki), z klienta HTTP (znacznik ostatniego udanego żądania) i z gniazda WS (`connect`/`disconnect`).
  3. Dodaj selektory `selectSyncPillState`, `selectPendingCount`, `selectEntrySyncState(entryId)` używane przez `SyncPill`, `QueuePanel` i `LogoutDialog`.
  4. Napisz testy przejść stanów (online → offline z kolejką → wysyłanie → zsynchronizowano).
  5. Dopisz lub uruchom przypadki TC-STATE-003 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  6. Otwórz PR `IMP-358: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-STATE-003 przechodzi
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 4 h (S) | **Ryzyko:** niskie

### IMP-359 – Dziennik diagnostyczny synchronizacji
- **Epik / obszar:** EP-09 Mobile – offline i synchronizacja | **Rola:** MOB
- **Cel:** Dyżurny może w dniu zawodów odczytać z tabletu historię synchronizacji bez danych osobowych, co skraca diagnozę problemów z siecią.
- **Zakres:** Bufor cykliczny 1 000 zdarzeń synchronizacji (bez nazwisk i komentarzy), eksport w popoverze SCR-JDG-07 (gest ukryty dla wsparcia), dołączanie do zdarzeń Sentry; **Poza zakresem:** –
- **Zależności:** [IMP-354](#imp-354--syncengine--wysyłka-push), [IMP-218](06-mobile-fundamenty-i-design-system.md#imp-218--integracja-sentry-w-aplikacji)
- **Odwołania:** NFR-504, NFR-902, [TC-SEC-017](../03-test-plans/05-testy-niefunkcjonalne.md#tc-sec-017)
- **Kroki:**
  1. Napisz `src/data/sync/diagLog.ts`: bufor cykliczny 1 000 wpisów w MMKV (czas, zdarzenie, `mutationId`, kod HTTP, status, liczba w kolejce) bez nazwisk, komentarzy, PIN-ów i tokenów.
  2. Loguj zdarzenia `push`/`pull`/`snapshot`/`heartbeat`/zmiany online z `SyncEngine` i klienta HTTP.
  3. Dodaj ukryty gest wsparcia w SCR-JDG-07 (5 tapnięć w tytuł „Synchronizacja”) otwierający eksport dziennika jako plik tekstowy (`expo-sharing`).
  4. Dołączaj ostatnie 100 wpisów jako załącznik do zdarzeń Sentry z tabletu (przez `scrubPii`).
  5. Dopisz lub uruchom przypadki TC-SEC-017 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  6. Dodaj stany do DevCatalog lub zrzuty ekranu (telefon/tablet, iOS/Android) do PR; sprawdź etykiety a11y i skalowanie tekstu.
  7. Otwórz PR `IMP-359: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] Przegląd próbki dziennika – brak PII
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 3 h (S) | **Ryzyko:** niskie


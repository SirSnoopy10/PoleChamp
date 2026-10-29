# Tryb offline i synchronizacja

> Dokument: `01-architecture/06-offline-i-synchronizacja.md` · Wersja 1.0 · 23.10.2026
> Decyzje: [ADR-004](adr/ADR-004-offline-first-tablet.md), [ADR-010](adr/ADR-010-blokada-kategorii-a-oceny-offline.md). API: [03-api.md §4–5](03-api.md#4-endpointy--urządzenie-i-sędzia). Przepływy: [04-przeplywy-danych.md §6–7](04-przeplywy-danych.md#6-ocena-offline-i-synchronizacja).

## 1. Zakres i zasady

| Tryb | Strategia | Uzasadnienie |
|---|---|---|
| **Sędzia (tablet)** | **Offline-first**: UI czyta i pisze wyłącznie do lokalnej SQLite. Synchronizacja w tle | Hale sportowe mają zawodne Wi-Fi. Ocena nie może czekać na sieć ([NFR-301](../02-specification/08-wymagania-niefunkcjonalne.md)) |
| **Organizator (telefon)** | **Online-first z cache do odczytu**: ostatnie dane widoczne offline, zapisy wymagają sieci | Organizator ma zwykle LTE. Konfiguracja wymaga spójności (unikalne numery, statusy) i nie opłaca się kosztu konfliktów |

Zasady projektowe:
1. **Serwer jest źródłem prawdy** dla statusów, konfiguracji i wyników oficjalnych. Tablet jest źródłem prawdy dla **treści ocen swojego sędziego** do czasu ich przyjęcia.
2. **Jeden autor arkusza** – arkusz (`entry_id`, `judge_id`) edytuje tylko ten sędzia, więc nie ma współbieżnych edytorów. Konflikty ograniczają się do: (a) tego samego sędziego na dwóch urządzeniach, (b) zmiany statusu kategorii w czasie bycia offline.
3. **Komendy, nie stany** – tablet wysyła mutacje (`SUBMIT_SCORE_SHEET` z pełną treścią arkusza), a serwer decyduje o przyjęciu.
4. **Idempotencja na każdym poziomie** – `mutationId` (UUIDv7), `scoreSheetId` (UUIDv7 nadany na tablecie), `baseRevision`.
5. **Kolejność FIFO per urządzenie** – mutacje wysyłane w kolejności utworzenia. Odrzucenie jednej nie blokuje kolejnych (każda jest niezależna).

## 2. Lokalna baza tabletu

SQLite (`expo-sqlite`) + Drizzle ORM, migracje wersjonowane w aplikacji. Tryb WAL, zapisy w transakcjach.

**Trwałość (doprecyzowanie TL-20, weryfikacja w spike'u IMP-603):** `PRAGMA journal_mode = WAL`, `PRAGMA synchronous = FULL` (w trybie WAL ustawienie `NORMAL` chroni przed zabiciem procesu, ale nie przed utratą zasilania – a NFR-302 obejmuje rozładowanie baterii), na iOS dodatkowo `PRAGMA fullfsync = ON` / `checkpoint_fullfsync = ON`, `PRAGMA foreign_keys = ON`. Toast „Zapisano ocenę…” pojawia się dopiero po zakończonym `COMMIT` (await na transakcji). Budżet NFR-103 (≤ 100 ms) obejmuje fsync – pomiar w IMP-603.

| Tabela | Kluczowe kolumny | Źródło |
|---|---|---|
| `sync_meta` | `tournament_id`, `cursor`, `last_full_snapshot_at`, `last_push_at`, `last_pull_at`, `last_sync_server_time`, `last_sync_monotonic_ms`, `server_time_offset_ms`, `schema_version`, `tournament_finished_at` | lokalne (`last_sync_monotonic_ms` – okno 24 h logowania offline, TL-21) |
| `local_tournament` | `id`, `name`, `status`, `allow_offline_pin_login` | snapshot/changes |
| `local_category` | `id`, `name`, `style`, `level`, `age_group`, `status`, `position`, `panel_judge_ids` (JSON), `tie_break_criterion_id`, `updated_seq` | snapshot/changes |
| `local_criterion` | `id`, `category_id`, `name`, `description`, `scale_max`, `step`, `weight_tenths`, `position` | snapshot/changes |
| `local_penalty_type` | `id`, `category_id`, `name`, `points_tenths`, `max_occurrences`, `position` | snapshot/changes |
| `local_entry` | `id`, `category_id`, `start_number`, `start_order`, `full_name`, `club`, `status` | snapshot/changes |
| `local_judge` | `id`, `full_name`, `initials`, `position`, `is_active`, `pin_locked`, `pin_version`, `wrapped_verifier`, `pin_offline_salt`, `pin_iterations`, `failed_attempts`, `lock_level`, `locked_until` | snapshot/changes + lokalne liczniki (TL-04) |
| `local_judge_session` | `id`, `judge_id`, `auth_mode`, `started_at`, `last_activity_at`, `ended_at`, `server_token_present` | lokalne |
| `local_score_sheet` | `id`, `category_id`, `entry_id`, `judge_id`, `revision` (lokalna), `server_revision`, `sync_state` (`PENDING` / `SYNCED` / `REJECTED`), `reject_code`, `total_hundredths` (podgląd), `server_total_hundredths`, `comment`, `submitted_at_local` | lokalne + `GET /judge/me/score-sheets` |
| `local_score_value` | `score_sheet_id`, `criterion_id`, `value_tenths` | lokalne |
| `local_score_penalty` | `score_sheet_id`, `penalty_type_id`, `count` | lokalne |
| `local_draft` | `judge_id`, `entry_id`, `payload` (JSON), `updated_at` | autozapis formularza co zmianę (debounce 300 ms) |
| `outbox` | `seq` (autoinc), `mutation_id`, `type`, `payload` (JSON), `created_at`, `attempts`, `next_attempt_at`, `last_error`, `state` (`QUEUED` / `IN_FLIGHT` / `DONE` / `FAILED_PERMANENT`) | lokalne |

Pepper urządzenia, sekret urządzenia i tokeny są w **SecureStore/Keystore**, a nie w SQLite.

Indeksy lokalne: `local_entry(category_id, start_order)`, `local_score_sheet(judge_id, category_id)`, UNIQUE `local_score_sheet(entry_id, judge_id)`, `outbox(state, seq)`.

## 3. Silnik synchronizacji (`SyncEngine`)

### 3.1 Wyzwalacze
| Wyzwalacz | Akcja |
|---|---|
| Zatwierdzenie oceny | natychmiastowy `push` (jeśli online) |
| Powrót sieci (NetInfo `isInternetReachable`) | `token → push → pull` |
| Powrót aplikacji na pierwszy plan | `pull`, potem `push` |
| Zdarzenie WS `sync.hint` / `category.*` / `config.changed` / `judges.changed` | `pull` |
| Zegar | co 30 s, gdy outbox niepusty lub brak WS (`push`/`pull`); heartbeat co 30 s |
| Logowanie sędziego (online) | `GET /judge/me/score-sheets` |

### 3.2 Push
0. **Odtworzenie po starcie aplikacji (TL-20):** wszystkie wpisy `IN_FLIGHT` wracają do `QUEUED` (proces mógł zostać zabity w trakcie wysyłki – ponowne wysłanie da `DUPLICATE`, więc jest bezpieczne). Tylko jeden przebieg push naraz (blokada w pamięci).
1. Pobierz do 100 wpisów `outbox` w stanie `QUEUED` z `next_attempt_at ≤ teraz` (FIFO) i oznacz `IN_FLIGHT`.
2. `POST /v1/sync/push` (timeout 15 s).
3. Dla każdego wyniku:
   - `APPLIED` / `DUPLICATE` → `outbox.state = DONE`; arkusz `sync_state = SYNCED`, `server_revision`, `server_total_hundredths`.
   - `REJECTED` → `outbox.state = FAILED_PERMANENT`; arkusz `sync_state = REJECTED`, `reject_code` (UI: ikona warning, baner).
   - `RETRY` lub brak wyniku → `QUEUED`, `attempts+1`, `next_attempt_at` = teraz + backoff.
4. Błąd sieci / 5xx / timeout: wszystkie `IN_FLIGHT` wracają do `QUEUED` z backoffem. `401 DEVICE_REVOKED` → procedura unieważnienia (§7).
5. Backoff: `min(60 s, 1 s × 2^attempts) ± 20%`. Po 20 nieudanych próbach dla danej mutacji pojawia się ostrzeżenie w SCR-JDG-07, ale wysyłanie trwa dalej.
6. Wpisy `DONE` usuwane po 24 h. `FAILED_PERMANENT` zostają do zakończenia turnieju (diagnostyka).

### 3.3 Pull
1. `GET /v1/sync/changes?since=cursor` (stronicowanie `hasMore`).
2. Zmiany stosowane w jednej transakcji SQLite per strona. Kursor zapisywany na końcu transakcji.
3. `410 CURSOR_EXPIRED` lub `schema_version` niezgodny → pobranie pełnej migawki i podmiana danych referencyjnych w transakcji. Arkusze i outbox **nie są** usuwane.
4. Zmiana `pin_version` sędziego → unieważnienie lokalnej sesji tego sędziego (jeśli `OFFLINE_PIN`) i wymuszenie ponownego PIN-u. Zmiana `pin_locked` → blokada logowania tego profilu (SCR-JDG-08).
5. Zmiana konfiguracji kategorii (np. wycofana zawodniczka) w trakcie otwartego formularza → baner w formularzu „Lista startowa została zaktualizowana” i odświeżenie kolejki. Szkic zostaje zachowany.

### 3.4 Zegar
`server_time_offset_ms` = różnica `serverTime` z migawki i odpowiedzi push względem czasu urządzenia. Służy wyłącznie do wyświetlania („ostatnia synchronizacja 2 min temu”) i do pola `createdAt` mutacji (informacyjnie). Serwer nie podejmuje decyzji na podstawie czasu klienta.

## 4. Idempotencja

| Poziom | Mechanizm | Efekt |
|---|---|---|
| Mutacja | `mutationId` (UUIDv7) + `processed_mutation` z hashem treści | Ponowne wysłanie zwraca `DUPLICATE` z zapisanym wynikiem. Ten sam `mutationId` z inną treścią daje `IDEMPOTENCY_KEY_REUSED` (błąd programistyczny, alert) |
| Arkusz | `scoreSheetId` nadany przy pierwszym zatwierdzeniu, stały dla pary (start, sędzia) | Pierwsze przyjęcie tworzy arkusz, kolejne aktualizują go (nowa rewizja) |
| Rewizja | `baseRevision` = ostatnia znana rewizja serwera | Wykrycie edycji z innego urządzenia (§5) |
| REST organizatora | `Idempotency-Key` dla `POST` | Brak duplikatów przy ponowieniu (np. „Utwórz turniej” przy słabym LTE) |

## 5. Rozwiązywanie konfliktów

| Sytuacja | Reguła | Skutek dla użytkownika |
|---|---|---|
| Ten sam sędzia zatwierdza ocenę tego samego startu na dwóch tabletach (np. zmiana tabletu po rozładowaniu) | Serwer przyjmuje mutację, jeśli `baseRevision == server_revision`. Inaczej `REJECTED STALE_REVISION` (bez zapisu do `rejected_submission` – decyzję podejmuje sam sędzia) | Tablet: baner „Ocena zmieniona na innym urządzeniu.”, przycisk „Pokaż aktualną” (pobranie wersji serwera). Sędzia może ponownie zatwierdzić świadomie (nowa mutacja z aktualnym `baseRevision`) |
| Dwie sesje tego samego sędziego online | Nowe logowanie zamyka poprzednią sesję (`session.revoked: REPLACED`) | Stary tablet wraca do wyboru profilu |
| Kategoria zablokowana, gdy tablet był offline | Serwer odrzuca (`CATEGORY_LOCKED`), treść trafia do `rejected_submission` ([ADR-010](adr/ADR-010-blokada-kategorii-a-oceny-offline.md)) | Tablet: baner z SCR-JDG-04 „{n} {ocena\|oceny\|ocen} nie {została\|zostały\|zostało} {przyjęta\|przyjęte\|przyjętych} – kategoria zablokowana” (TL-11); popover SCR-JDG-07 dodaje „Organizator zdecyduje o ich uwzględnieniu.” Organizator: baner i SCR-ORG-22 |
| Kategoria odblokowana, gdy tablet był offline (lokalnie nadal LOCKED) | Po `pull` lokalny status → `IN_PROGRESS` | Formularz znów edytowalny |
| Zmieniona lista startowa (nowa zawodniczka) | Zastosowanie zmiany w `pull` | Nowa pozycja w kolejce. Toast „Lista startowa została zaktualizowana” |
| Wycofana zawodniczka z oceną w kolejce | Serwer `REJECTED ENTRY_WITHDRAWN` → `rejected_submission` | Ikona warning w wierszu, organizator decyduje |
| Sędzia zdezaktywowany | `REJECTED JUDGE_INACTIVE` → `rejected_submission` (zmiana TL-13 – oceny wystawione offline przed dezaktywacją nie mogą zginąć bez decyzji organizatora), sesja zamknięta (`session.revoked: JUDGE_DEACTIVATED`) | Komunikat „Twój profil został wyłączony przez organizatora.” |
| PIN zresetowany, gdy sędzia oceniał offline starym PIN-em | `REJECTED PIN_VERSION_OUTDATED` → `rejected_submission` (TL-13); sesja offline zamknięta | Tablet: ikona ostrzeżenia, komunikat „PIN został zmieniony. Zaloguj się ponownie.”; organizator decyduje w SCR-ORG-22 |
| Mutacja z nieznaną / obcą sesją sędziego | `REJECTED JUDGE_SESSION_INVALID` → `rejected_submission` (TL-12) | Jak wyżej; zdarzenie w audycie (możliwa manipulacja lub błąd) |
| Konfiguracja kryteriów zmieniona (teoretycznie niemożliwe po starcie – INT-04) | `REJECTED SCHEMA_MISMATCH` → pełna migawka | Formularz odświeżony, szkic zmapowany po `criterion_id` |
| Turniej zakończony w trakcie offline | `REJECTED TOURNAMENT_FINISHED` → `rejected_submission` | Jak przy blokadzie, ale organizator **nie może** przyjąć zgłoszenia (turniej zakończony jest tylko do odczytu). Wpis zostaje do wyjaśnień i audytu. Q-04: czy potrzebne „wznowienie turnieju” |

## 6. Blokada kategorii a sędzia offline

1. **Zapobieganie:** przed blokadą serwer zwraca `LOCK_WARNINGS`, jeśli brakuje ocen albo istnieją nieunieważnione urządzenia turnieju, które od startu kategorii miały kontakt z serwerem (`last_seen_at ≥ category.started_at`) i mają `pending_mutations > 0` lub nie odezwały się dłużej niż 2 min (doprecyzowanie TL-19 – zgodne z FR-309; warunek „aktywnej sesji” usunięto, bo serwer nie zna sesji offline). Organizator widzi listę tabletów i liczbę zaległych ocen (SCR-ORG-18) i może poczekać.
2. **Szybka propagacja:** zdarzenie `category.locked` przez WS. Tablet online natychmiast przechodzi w tryb tylko-do-odczytu (baner „Kategoria zakończona — tylko podgląd”, formularz przygaszony). Ocena, którą sędzia właśnie zatwierdzał, jeśli była już w outboxie, i tak zostanie wysłana i ewentualnie odrzucona.
3. **Po fakcie:** oceny, które dotarły po blokadzie, nie zmieniają wyników ostatecznych. Trafiają do `rejected_submission` (PENDING). Organizator może:
   - **Odblokować** kategorię i **przyjąć** zgłoszenie (arkusz powstaje z treści od sędziego, rewizja z `actor_type = ORGANIZER`, audyt), a potem zablokować ponownie – powstają nowe wyniki ostateczne i nowa suma kontrolna;
   - albo **odrzucić** zgłoszenie (zostaje w audycie).
4. **Gwarancja:** wynik ostateczny (`final_results_hash`) zawsze odpowiada stanowi w chwili blokady. Zmiana jest możliwa wyłącznie jawną decyzją organizatora.

## 7. Unieważnienie urządzenia i czyszczenie

1. `401 DEVICE_REVOKED` lub `session.revoked: DEVICE_REVOKED` → tablet przerywa sesję sędziego.
2. Outboxu nie da się już wysłać (token odrzucony). Tablet pokazuje ekran „To urządzenie zostało odłączone od turnieju” z liczbą niewysłanych ocen i opcją **„Eksportuj niewysłane oceny”** (plik JSON przez arkusz udostępniania, do ręcznego przekazania organizatorowi – Should, v1.1) lub „Wyczyść dane”.
3. Po zakończeniu turnieju i pustym outboxie dane turnieju są usuwane automatycznie po 7 dniach ([05-bezpieczenstwo.md §5.5](05-bezpieczenstwo.md#55-dane-na-urządzeniach)).

## 8. Wskaźniki stanu w UI

### 8.1 Tablet – pigułka w nagłówku (poza designem, propozycja w stylu Nocturne)
Pigułka umieszczona w nagłówku SCR-JDG-03…05, po lewej od chipu sędziego (styl jak pigułka statusu: 11,5 px, radius 999, kropka 6 px).

| Stan | Ikona Phosphor | Tekst | Kolorystyka |
|---|---|---|---|
| Zsynchronizowano (outbox pusty i tablet „online”) | `cloud-check` | „Zsynchronizowano” | tekst neutral-300, kropka accent, tło przezroczyste, ring divider |
| Wysyłanie | `arrows-clockwise` (obrót) | „Wysyłanie… (n)” | jak wyżej, kropka accent pulsująca |
| Offline z kolejką | `cloud-slash` | „Offline · n w kolejce” | tło accent-900, tekst accent-200, ring accent-800 |
| Offline bez kolejki | `cloud-slash` | „Offline” | tło neutral-900, tekst neutral-300 |
| Problem (≥ 20 nieudanych prób lub odrzucenia) | `warning-circle` | „Wymaga uwagi” | tło accent-900, tekst accent-300, ring accent |

Tapnięcie otwiera SCR-JDG-07: ostatnia synchronizacja („2 min temu”), liczba ocen w kolejce, lista odrzuconych z powodem, przycisk „Synchronizuj teraz” (btn-secondary).

**Definicja „online” (TL-45):** połączony WebSocket **lub** udane żądanie HTTP do API w ciągu ostatnich 60 s (tryb odpytywania przy zablokowanym WSS nie może pokazywać „Offline”). NetInfo służy tylko jako wyzwalacz, nie jako źródło prawdy.

### 8.2 Tablet – wiersze kolejki (SCR-JDG-04)
| Stan arkusza | Ikona po prawej (design + rozszerzenie) |
|---|---|
| Nieoceniona | `circle` (neutral-600) – design |
| Oceniona i zsynchronizowana | `check-circle` fill (accent) – design |
| Oceniona, czeka na wysyłkę | `clock` (accent-300) – **rozszerzenie** |
| Odrzucona | `warning-circle` (accent-300) – **rozszerzenie** |

### 8.3 Organizator
- Baner offline nad treścią (pod nagłówkiem): ikona `cloud-slash`, „Brak połączenia — dane mogą być nieaktualne. Zmiany są niedostępne.”; przyciski akcji nieaktywne (opacity 0,45).
- SCR-ORG-14 – lista urządzeń: „Online” / „Offline od 5 min”, „3 oceny w kolejce”, bateria, zalogowany sędzia.
- Baner „Odrzucone oceny (n)” w szczegółach turnieju i kategorii (accent-900, ikona `warning-circle`), który otwiera SCR-ORG-22.

## 9. Pojemność i wydajność offline

| Parametr | Wartość docelowa |
|---|---|
| Czas pracy offline bez utraty danych | ≥ 12 h (cały dzień zawodów) |
| Pojemność outboxu | ≥ 5 000 mutacji (≈ 2 MB) |
| Zapis oceny lokalnie (od tapnięcia do toastu) | ≤ 100 ms p95 |
| Synchronizacja kolejki 300 ocen po powrocie sieci | ≤ 30 s (3 paczki po 100) |
| Migawka turnieju 60 kategorii / 1 500 startów | ≤ 1,5 MB JSON (gzip ≈ 200 kB), zapis do SQLite ≤ 2 s |
| Utrata zasilania / zabicie aplikacji | brak utraty zatwierdzonych ocen (transakcja SQLite przed toastem). Szkic formularza odtwarzany z `local_draft` |

## 10. Testy wymagane (wskazówki dla planu testów)
- Symulacja sieci: offline, sieć niestabilna (utrata 30% pakietów), przejścia online/offline w trakcie paczki.
- Zabicie aplikacji w trakcie `IN_FLIGHT` → ponowne wysłanie → `DUPLICATE`.
- Blokada kategorii z tabletem offline (scenariusz 7 z [04-przeplywy-danych.md](04-przeplywy-danych.md#7-zablokowanie-kategorii-z-urządzeniem-offline)).
- Ten sam sędzia na dwóch tabletach (`STALE_REVISION`).
- Reset PIN-u w trakcie sesji offline (`PIN_VERSION_OUTDATED`).
- Wygaśnięcie kursora (`CURSOR_EXPIRED`) → migawka bez utraty outboxu.

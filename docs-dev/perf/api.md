# API pod obciążeniem (IMP-502)

TC: [TC-PERF-002](../../docs/03-test-plans/05-testy-niefunkcjonalne.md#tc-perf-002) · NFR-102, NFR-802. Budżet: odczyty p95 ≤ 300 ms, zapisy z przeliczeniem rankingu p95 ≤ 500 ms, 5xx < 0,1% przy profilu 1x (k6 `tools/k6/load.js`).

## Część lokalna (Testcontainers – `apps/api/test/integration/perf.test.ts`)

Dane: kategoria w trakcie ze 150 startami (połowa największej kategorii FX-MAX), 5 sędziów, 600 arkuszy, druga kategoria robocza. Każda trasa 30 × kolejno; zapis = `sync/push` jednej oceny z przeliczeniem rankingu (30 ocen). Maszyna deweloperska (Windows, 28 wątków, postgres:18 w Docker Desktop) – wartości tylko orientacyjne, rozstrzyga k6 na staging.

| Trasa | p95 (ms) | Próg |
|---|---|---|
| `GET /tournaments` | 4,5 | 300 |
| `GET /tournaments/{id}` | 7,0 | 300 |
| `GET /tournaments/{id}/categories` | 4,6 | 300 |
| `GET /categories/{id}/entries` | 6,5 | 300 |
| `GET /categories/{id}/results` | 7,0 | 300 |
| `GET /tournaments/{id}/results` | 5,7 | 300 |
| `GET /tournaments/{id}/judges` | 8,3 | 300 |
| `GET /entries/{id}/score-sheets` | 9,7 | 300 |
| `GET /sync/changes?since=0` | 13,7 | 300 |
| `POST /sync/push` (z przeliczeniem) | 86,0 | 500 |

**Indeksy:** test przechwytuje wszystkie zapytania aplikacji (86 różnych) i wykonuje dla odczytów `EXPLAIN (GENERIC_PLAN)` z `enable_seqscan = off` – skan sekwencyjny dużej tabeli mimo zakazu oznacza brak użytecznego indeksu. Wynik: **0** zapytań bez indeksu (kontrola detektora: `athlete.club` bez indeksu jest wykrywany). Nowa migracja nie była potrzebna (indeksy z 0002–0008, w tym `0008_score_sheet_judge_idx`).

## Decyzje

- **Cache `GET /v1/tournaments/{id}` w Valkey (krok 3 planu) – niewdrożony.** p95 lokalnie 7 ms przy dwóch zapytaniach z indeksami; cache z unieważnianiem przez `domain_event` dodaje ryzyko nieświeżych danych (wersja `ETag`/`If-Match`) i własności (klucz musi uwzględniać właściciela). Wraca, jeśli k6 na staging pokaże p95 odczytu szczegółów > 150 ms albo CPU bazy > 60% (TTL 2 s, klucz `t:{id}:v{version}`, unieważnianie w `EventPublisher`).
- **Argon2id:** `PasswordService` hashuje i weryfikuje przez ogranicznik `HASH_CONCURRENCY` (domyślnie 2, `src/common/concurrency/limiter.ts`). Hashowanie zajmuje wątek puli libuv (4) i 19 MiB – fala logowań (start turnieju: 20 tabletów × PIN online + organizatorzy) nie blokuje puli dla DNS/`pbkdf2` i nie podnosi pamięci zadania ponad ~40 MiB na hashowanie. Koszt lokalnie: 6 weryfikacji / 2 równolegle = 67 ms (~22 ms na hashowanie). Na Fargate 0,5 vCPU spodziewane 5–10× więcej – pomiar: `k6` scenariusz logowań (`tools/k6/organizer.js`) i metryka czasu `POST /auth/login`, `POST /judge-sessions`.
- **Pula `pg`:** `DATABASE_POOL_MAX` = 20 na zadanie. Warunek: `zadania API × 20 + worker × 5 + rezerwa 10 ≤ 0,8 × max_connections`. Przy 4 zadaniach (skalowanie TC-PERF-013) = 95 połączeń – mieści się w `max_connections` RDS `db.t4g.medium` (~410). Dla większej liczby zadań – RDS Proxy albo zmniejszenie puli do 10.

## Pomiar docelowy (do wykonania – brak staging i AWS)

1. `tools/k6/run.sh staging 1x` (30 min, profil NFR-802) – raport wg [k6-template.md](k6-template.md), przed i po wdrożeniu IMP-502.
2. W trakcie: `pg_stat_statements` (top 20 wg `total_exec_time`), Performance Insights (oczekiwania), CPU zadań API (CloudWatch), `db.connections`.
3. Dla zapytań z top 5: `EXPLAIN (ANALYZE, BUFFERS)` na kopii danych staging; brakujące indeksy – nowa migracja `NNNN_*.sql` + wpis w `test/integration/migrations.test.ts`.

| Metryka | Przed | Po | Próg |
|---|---|---|---|
| `http_req_duration{kind:read}` p95 | {…} | {…} | ≤ 300 ms |
| `http_req_duration{kind:write}` p95 | {…} | {…} | ≤ 500 ms |
| `http_req_failed` | {…} | {…} | < 0,1% |
| CPU zadań API p95 | {…} | {…} | < 70% |
| Połączenia bazy (maks.) | {…} | {…} | ≤ 0,8 × max |
| `POST /auth/login` p95 (fala 50 logowań) | {…} | {…} | ≤ 1 s |

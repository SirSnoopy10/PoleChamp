# EP-03 – Backend: rdzeń, konto i konfiguracja turnieju

> Dokument: `04-implementation-plans/03-backend-konto-i-konfiguracja-turnieju.md` · Tech Lead (Agent 2) · 23.10.2026 · Konwencje i DoD: [00-konwencje-i-definition-of-done.md](00-konwencje-i-definition-of-done.md) · Indeks: [91-indeks-zadan.md](91-indeks-zadan.md)

Szkielet NestJS 12 (Fastify 5, Node 26 LTS), baza PostgreSQL 18 z Drizzle, mechanizmy przekrojowe (błędy RFC 9457, walidacja Standard Schema, idempotencja, ETag, limity, JWT i guardy, audyt i outbox zdarzeń) oraz moduły organizatora: konto, turnieje, kategorie, kryteria, kary, zawodniczki, sędziowie. Uwzględnia poprawki TL: nowe kody błędów (TL-08), `MIN_CRITERIA` (TL-09), `EMAIL_NOT_VERIFIED` przy starcie kategorii (TL-10), `pin_fingerprint` i weryfikator offline liczony przy generowaniu PIN-u (TL-04, TL-06), wyjątek RODO (TL-17), wyzwalacze przeliczenia (TL-18), `LOCK_WARNINGS` (TL-19), usunięcie konta jako Must (TL-22).

## Podsumowanie

| Zadań | Suma | Rola (h) |
|---|---|---|
| 33 | 202 h | BE 202 |


## Zadania

### IMP-100 – Szkielet API NestJS 12 (Fastify)
- **Epik / obszar:** EP-03 Backend – rdzeń, konto i konfiguracja turnieju | **Rola:** BE
- **Cel:** API startuje jako aplikacja NestJS 12 na Fastify 5 z prefiksem `/v1`, zweryfikowaną konfiguracją środowiska i health checkami używanymi przez ALB, a przy wdrożeniu zamyka połączenia bez utraty żądań.
- **Zakres:** `apps/api/src/main.ts` (Fastify 5, prefiks `/v1`, kompresja, limity ciała 1 MB, CORS wyłączony), `worker.ts`, `cli.ts`; moduł konfiguracji z walidacją zod środowiska; `/health/live`, `/health/ready` (DB, Valkey); graceful shutdown (SIGTERM, zamknięcie WS); **Poza zakresem:** Moduły domenowe
- **Zależności:** [IMP-001](01-fundamenty-i-devops.md#imp-001--monorepo-pnpm-workspaces--turborepo--bazowa-konfiguracja-ts)
- **Odwołania:** ADR-002
- **Kroki:**
  1. Utwórz `apps/api/src/main.ts`: `NestFactory.create(AppModule, new FastifyAdapter({ bodyLimit: 1_048_576, trustProxy: true }))`, `setGlobalPrefix('v1', { exclude: ['health/(.*)'] })`, `@fastify/compress`, CORS wyłączony.
  2. Dodaj osobne punkty wejścia `src/worker.ts` (moduł `WorkerModule` bez HTTP) i `src/cli.ts` (`nest-commander`: `migrate`, `seed:*`, polecenia operatora).
  3. Napisz `src/config/env.schema.ts` (zod: `DATABASE_URL`, `VALKEY_URL`, `JWT_KEYS_SECRET_ARN`, `S3_BUCKET`, `APP_MIN_VERSION`…) i `ConfigModule` przerywający start z czytelną listą błędów.
  4. Dodaj `HealthController`: `GET /health/live` (proces) i `GET /health/ready` (`SELECT 1` w PostgreSQL + `PING` Valkey, timeout 1 s, 503 przy porażce).
  5. Włącz `enableShutdownHooks()`: na SIGTERM przestań zgłaszać `ready`, odczekaj 10 s (deregistracja ALB 30 s), zamknij gateway WS (`disconnectSockets`), pulę `pg` i połączenia Valkey.
  6. Napisz test e2e szkieletu (`app.inject`) dla `/health/live`, `/health/ready` przy działającej i zatrzymanej bazie.
  7. Otwórz PR `IMP-100: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] `/health/ready` zwraca 200 lokalnie i w kontenerze
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

### IMP-101 – Błędy RFC 9457 i middleware identyfikatora żądania
- **Epik / obszar:** EP-03 Backend – rdzeń, konto i konfiguracja turnieju | **Rola:** BE
- **Cel:** Każdy błąd API, w tym walidacji i nieprzewidziany 500, wraca jako `application/problem+json` z kodem z katalogu i `requestId`, bez szczegółów wewnętrznych.
- **Zakres:** `DomainError(code, status, detail)`, globalny filtr wyjątków → `application/problem+json`, mapowanie błędów walidacji na `errors[]`, `requestId` w odpowiedzi, maskowanie 500; **Poza zakresem:** –
- **Zależności:** [IMP-100](#imp-100--szkielet-api-nestjs-12-fastify), [IMP-059](02-pakiety-wspoldzielone.md#imp-059--contracts-schematy-wspólne-i-katalog-błędów)
- **Odwołania:** NFR-401, NFR-901, 03-api §1.1, [TC-API-108](../03-test-plans/02-testy-integracyjne-api.md#tc-api-108)
- **Kroki:**
  1. Zdefiniuj `src/common/errors/domain-error.ts`: `DomainError(code: ErrorCode, detail?, extras?)` ze statusem z `errorHttpStatus` (`@polechamp/contracts`) i podklasy pomocnicze (`notFound()`, `conflict(code)`).
  2. Napisz globalny `ProblemDetailsFilter` (`@Catch()`): `DomainError` → problem z `type` `https://api.polechamp.app/problems/<kod-kebab>`, `title` z katalogu, `instance` = ścieżka, `requestId` z kontekstu żądania.
  3. Mapuj błędy walidacji schematów na `422 VALIDATION_FAILED` z `errors[]` (`field` jako ścieżka JSON, `code` z `FieldErrorCode`).
  4. Maskuj wyjątki nieznane jako `500 INTERNAL` („Coś poszło nie tak. Spróbuj ponownie.”), logując stos z `requestId` w pino i Sentry.
  5. Przekazuj nagłówki specjalne: `Retry-After` dla `RATE_LIMITED`/`ACCOUNT_LOCKED`/`PIN_LOCKED`, `WWW-Authenticate` dla 401.
  6. Napisz testy formatów dla `NOT_FOUND`, `VALIDATION_FAILED` (2 pola), `LOCK_WARNINGS` (treść rozszerzona) i wyjątku `TypeError`.
  7. Dopisz lub uruchom przypadki TC-API-108 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  8. Otwórz PR `IMP-101: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-API-108 przechodzi
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 4 h (S) | **Ryzyko:** niskie

### IMP-102 – Walidacja Standard Schema i test zgodności tras z OpenAPI
- **Epik / obszar:** EP-03 Backend – rdzeń, konto i konfiguracja turnieju | **Rola:** BE
- **Cel:** Każda trasa API waliduje wejście schematem z `@polechamp/contracts` w trybie `strict`, a test w CI wykrywa trasę bez kontraktu i kontrakt bez trasy.
- **Zakres:** Globalna rejestracja walidacji Standard Schema NestJS 12 ze schematami z `@polechamp/contracts`, `strict` (UNKNOWN_FIELD); test porównujący trasy Nest z rejestrem OpenAPI; **Poza zakresem:** –
- **Zależności:** [IMP-101](#imp-101--błędy-rfc-9457-i-middleware-identyfikatora-żądania), [IMP-058](02-pakiety-wspoldzielone.md#imp-058--polechampcontracts--szkielet)
- **Odwołania:** ADR-012, NFR-906, [TC-CONTRACT-009](../03-test-plans/01-testy-jednostkowe.md#tc-contract-009), [TC-CI-002](../03-test-plans/00-strategia-testowania.md#tc-ci-002)
- **Kroki:**
  1. Napisz dekorator `@Contract(operationId)` w `src/common/contract/contract.decorator.ts` wiążący handler z wpisem rejestru OpenAPI (schematy `params`, `query`, `body`, `response`).
  2. Skonfiguruj walidację Standard Schema NestJS 12 (`StandardSchemaValidationPipe`) globalnie, z zod w trybie `strict` (pole spoza schematu → `UNKNOWN_FIELD`).
  3. Dodaj serializację odpowiedzi przez schemat `response` (usuwanie pól nieobjętych kontraktem, np. `pin_hash`) w interceptorze `ResponseContractInterceptor`.
  4. Napisz `test/contract/routes-vs-openapi.test.ts`: zbierz trasy z `DiscoveryService` (metoda + ścieżka), porównaj z `paths` w `dist/openapi.json` i wypisz różnice w obie strony.
  5. Dodaj sprawdzenie, że każda trasa ma `x-permissions` zgodne z guardami (`@Roles`) w metadanych handlera.
  6. Dopisz lub uruchom przypadki TC-CONTRACT-009, TC-CI-002 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-102: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-CONTRACT-009 (API), TC-CI-002 (część tras) przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** średnie

### IMP-103 – Baza: Drizzle, migracje, transakcje z kontekstem
- **Epik / obszar:** EP-03 Backend – rdzeń, konto i konfiguracja turnieju | **Rola:** BE
- **Cel:** Kod API korzysta z bazy przez Drizzle w jawnych transakcjach z kontekstem aktora, a migracje SQL są przeglądane w PR i uruchamiane rolą `pc_migrator`.
- **Zakres:** Drizzle ORM 0.45 + `pg`, pula połączeń, helper `withTx(ctx, fn)` (poziom izolacji, `SET LOCAL app.actor`), drizzle-kit (migracje SQL przeglądane w PR), polecenie CLI `migrate` (rola `pc_migrator`), enumy z 02-model §1; **Poza zakresem:** Tabele (IMP-104…107)
- **Zależności:** [IMP-100](#imp-100--szkielet-api-nestjs-12-fastify)
- **Odwołania:** ADR-002, NFR-904, [TC-INT-012](../03-test-plans/02-testy-integracyjne-api.md#tc-int-012)
- **Kroki:**
  1. Utwórz `src/db/client.ts`: pula `pg` (maks. 20 połączeń na zadanie, `statement_timeout` 5 s, `idle_in_transaction_session_timeout` 10 s, TLS wymagane poza dev) i instancja `drizzle(pool, { schema })`.
  2. Napisz `src/db/tx.ts` `withTx(ctx, fn, { isolation = 'read committed' })`: transakcja z `SET LOCAL app.actor_type`, `app.actor_id`, `app.request_id` używanymi przez wyzwalacze i audyt.
  3. Zdefiniuj enumy z 02-model §1 w `src/db/schema/enums.ts` (`tournament_status`, `category_status`, `entry_status`, `rejection_reason`, `actor_type`, `auth_mode`, `export_status`…).
  4. Skonfiguruj `drizzle.config.ts` (migracje SQL w `apps/api/drizzle/NNNN_<opis>.sql`) i polecenie CLI `migrate` uruchamiające `roles.sql`, a potem migracje w roli `pc_migrator`.
  5. Dodaj krok CI `drizzle-kit check` + `drizzle-kit generate --dry-run` kończący się błędem, gdy schemat TS różni się od migracji.
  6. Napisz test integracyjny `withTx`: wycofanie transakcji przy wyjątku i widoczność `app.actor_id` w `current_setting`.
  7. Dopisz lub uruchom przypadki TC-INT-012 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  8. Otwórz PR `IMP-103: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] Migracja testowa w CI (Testcontainers)
  - [ ] Dokument „expand/contract” w `apps/api/docs/migrations.md`
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 8 h (M) | **Ryzyko:** średnie

### IMP-104 – Migracja 1: konto i tokeny
- **Epik / obszar:** EP-03 Backend – rdzeń, konto i konfiguracja turnieju | **Rola:** BE
- **Cel:** Baza przechowuje konta organizatorów, rodziny refresh tokenów, kody e-mail i klucze idempotencji z indeksami potrzebnymi do logowania i retencji.
- **Zakres:** `app_user` (z `lockout_level`), `auth_refresh_token`, `auth_email_token`, `idempotency_key` (02-model §2.1–2.2, §2.22a, §2.23a); **Poza zakresem:** –
- **Zależności:** [IMP-103](#imp-103--baza-drizzle-migracje-transakcje-z-kontekstem)
- **Odwołania:** FR-101, FR-103, TL-15
- **Kroki:**
  1. Zdefiniuj w `src/db/schema/auth.ts` tabelę `app_user` (`email` citext UNIQUE, `password_hash`, `display_name`, `email_verified_at`, `locale`, `terms_accepted_at`, `terms_version`, `failed_login_count`, `locked_until`, `lockout_level`, `deleted_at`).
  2. Zdefiniuj `auth_refresh_token` (`family_id`, `token_hash` bytea UNIQUE, `expires_at`, `revoked_at`, `replaced_by_id`) z indeksem (`user_id`, `family_id`).
  3. Zdefiniuj `auth_email_token` (`purpose` `VERIFY_EMAIL`/`RESET_PASSWORD`, `token_hash`, `expires_at`, `used_at`, `attempts`) z indeksem częściowym na aktywne tokeny (`used_at IS NULL`).
  4. Zdefiniuj `idempotency_key` (PK (`key`, `user_id`), `method`, `path`, `request_hash`, `response_status`, `response_body` jsonb, `created_at`) z indeksem na `created_at` dla retencji 24 h.
  5. Wygeneruj migrację `0001_auth.sql` (rozszerzenie `citext`, klucze główne `uuid DEFAULT uuidv7()`) i test integracyjny unikalności e-maila bez rozróżniania wielkości liter.
  6. Otwórz PR `IMP-104: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] Migracja w górę i testowa w dół na kopii
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 4 h (S) | **Ryzyko:** niskie

### IMP-105 – Migracja 2: turnieje, kategorie, kryteria, kary, zawodniczki, sędziowie
- **Epik / obszar:** EP-03 Backend – rdzeń, konto i konfiguracja turnieju | **Rola:** BE
- **Cel:** Baza wymusza integralność konfiguracji turnieju (unikalne numery startowe, nazwy sędziów i PIN-y, zakresy skal i wag) już na poziomie ograniczeń.
- **Zakres:** `tournament`, `category`, `criterion`, `penalty_type`, `athlete`, `entry`, `judge` (z `pin_fingerprint`, `pin_offline_*`), `category_judge`; ograniczenia CHECK i UNIQUE (DEFERRABLE dla pozycji), indeksy z 02-model §4; **Poza zakresem:** –
- **Zależności:** [IMP-103](#imp-103--baza-drizzle-migracje-transakcje-z-kontekstem)
- **Odwołania:** 02-model §2.3–2.10, INT-03, INT-10, TL-04, TL-06, [TC-INT-010](../03-test-plans/02-testy-integracyjne-api.md#tc-int-010)
- **Kroki:**
  1. Zdefiniuj `tournament` (`owner_id`, `status`, `start_date`, `end_date` z CHECK `end_date >= start_date`, `timezone` domyślnie `Europe/Warsaw`, `allow_offline_pin_login`, `change_seq`, `version`) i `category` (`position`, `status`, `aggregation_method`, `tie_break_criterion_id`, `started_at`, `locked_at`, `locked_by`, `results_version`, `final_results_hash`, `version`).
  2. Zdefiniuj `criterion` (CHECK `scale_max BETWEEN 1 AND 20`, `weight_tenths BETWEEN 5 AND 50 AND weight_tenths % 5 = 0`) i `penalty_type` (CHECK `points_tenths BETWEEN 5 AND 500`, `max_occurrences BETWEEN 1 AND 10`) z UNIQUE (`category_id`, `position`) DEFERRABLE.
  3. Zdefiniuj `athlete` (`full_name`, `club`, `birth_year`, `is_minor`, `guardian_consent_confirmed`, `pseudonymized_at`) i `entry` (UNIQUE (`tournament_id`, `start_number`), UNIQUE (`category_id`, `athlete_id`), UNIQUE (`category_id`, `start_order`) DEFERRABLE, CHECK `start_number BETWEEN 1 AND 9999`).
  4. Zdefiniuj `judge` (`pin_hash`, `pin_fingerprint` z UNIQUE (`tournament_id`, `pin_fingerprint`), `pin_offline_salt`, `pin_offline_verifier`, `pin_version`, `failed_pin_count`, `pin_locked_at`, `is_active`, `position`; UNIQUE (`tournament_id`, `full_name`)) oraz `category_judge` (PK złożony).
  5. Dodaj indeksy z 02-model §4 (np. `tournament(owner_id, status)`, `entry(category_id, start_order)`) i wygeneruj migrację `0002_tournament_config.sql`.
  6. Napisz testy ograniczeń: duplikat numeru w turnieju, waga 5,5, zamiana pozycji dwóch kryteriów w jednej transakcji (DEFERRABLE).
  7. Dopisz lub uruchom przypadki TC-INT-010 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  8. Otwórz PR `IMP-105: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-INT-010 przechodzi
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

### IMP-106 – Migracja 3: urządzenia, sesje, oceny, wyniki
- **Epik / obszar:** EP-03 Backend – rdzeń, konto i konfiguracja turnieju | **Rola:** BE
- **Cel:** Baza przechowuje urządzenia, sesje i arkusze ocen tak, że jeden sędzia ma jeden arkusz na start, a wyzwalacz nie przepuści noty powyżej skali ani kary powyżej limitu.
- **Zakres:** `device` (z `last_sync_at`, `active_judge_id`), `pairing_code`, `judge_session`, `score_sheet` (z `auth_mode`), `score_value`, `score_penalty`, `score_sheet_revision`, `rejected_submission`, `category_result`; wyzwalacz walidujący `value_tenths ≤ scale_max × 10` i `count ≤ max_occurrences`; **Poza zakresem:** –
- **Zależności:** [IMP-105](#imp-105--migracja-2-turnieje-kategorie-kryteria-kary-zawodniczki-sędziowie)
- **Odwołania:** 02-model §2.11–2.19, INT-03, INT-06, [TC-INT-003](../03-test-plans/02-testy-integracyjne-api.md#tc-int-003), [TC-INT-006](../03-test-plans/02-testy-integracyjne-api.md#tc-int-006)
- **Kroki:**
  1. Zdefiniuj `device` (`secret_hash`, `pepper`, `paired_at`, `revoked_at`, `last_seen_at`, `last_sync_at`, `last_sync_cursor`, `pending_mutations`, `active_judge_id`, `battery_level`), `pairing_code` (`code_hash`, `expires_at`, `max_uses`, `use_count`) i `judge_session` (`auth_mode`, `ended_reason`).
  2. Zdefiniuj `score_sheet` (UNIQUE (`entry_id`, `judge_id`), CHECK `total_hundredths >= 0`, `client_total_hundredths`, `auth_mode`, `last_mutation_id`), `score_value` (CHECK `value_tenths % 5 = 0`) i `score_penalty` (CHECK `count BETWEEN 0 AND 10`).
  3. Zdefiniuj `score_sheet_revision` (UNIQUE (`score_sheet_id`, `revision`), `snapshot` jsonb, `actor_type`, `mutation_id`) i `rejected_submission` (`mutation_id` UNIQUE, `payload` jsonb, `reason`, `resolution` domyślnie `PENDING`).
  4. Zdefiniuj `category_result` (PK (`category_id`, `entry_id`), kolumny agregatów, `rank`, `is_complete`, `results_version`, `computed_at`).
  5. Napisz wyzwalacze PL/pgSQL `trg_score_value_range` (`value_tenths <= criterion.scale_max * 10`) i `trg_score_penalty_max` (`count <= penalty_type.max_occurrences`) z błędem `check_violation`.
  6. Wygeneruj migrację `0003_scoring.sql` i testy: drugi arkusz tego samego sędziego, nota 10,5 przy skali 10, kara 4× przy limicie 3.
  7. Dopisz lub uruchom przypadki TC-INT-003, TC-INT-006 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  8. Otwórz PR `IMP-106: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-INT-003, TC-INT-006 przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

### IMP-107 – Migracja 4: audyt, dziennik zmian, idempotencja, zdarzenia, eksporty
- **Epik / obszar:** EP-03 Backend – rdzeń, konto i konfiguracja turnieju | **Rola:** BE
- **Cel:** Audyt, dziennik zmian, idempotencja mutacji, outbox zdarzeń i zlecenia eksportu mają tabele z uprawnieniami, które nie pozwalają aplikacji zmienić historii.
- **Zakres:** `audit_log` (partycjonowana miesięcznie, pg_partman lub własne zadanie tworzenia partycji), `change_log` (`audience` varchar(50)), `processed_mutation`, `domain_event`, `export_job`; uprawnienia ról (`pc_app` bez UPDATE/DELETE na audycie i rewizjach, `pc_retention` tylko wybrane kolumny); **Poza zakresem:** –
- **Zależności:** [IMP-106](#imp-106--migracja-3-urządzenia-sesje-oceny-wyniki), [IMP-009](01-fundamenty-i-devops.md#imp-009--terraform-rds-postgresql-18-i-role-bazy)
- **Odwołania:** INT-08, NFR-409, TL-16, TL-49, [TC-INT-008](../03-test-plans/02-testy-integracyjne-api.md#tc-int-008), [TC-SEC-019](../03-test-plans/05-testy-niefunkcjonalne.md#tc-sec-019)
- **Kroki:**
  1. Zdefiniuj `audit_log` partycjonowaną miesięcznie (`PARTITION BY RANGE (occurred_at)`) z funkcją `ensure_audit_partitions(months_ahead int)` wywoływaną przez worker raz dziennie.
  2. Zdefiniuj `change_log` (`seq` bigserial, `tournament_id`, `entity_type`, `entity_id`, `op` char(1), `audience` varchar(50)) z indeksem (`tournament_id`, `seq`) i `processed_mutation` (`mutation_id` PK, `request_hash`, `result` jsonb).
  3. Zdefiniuj `domain_event` (indeks częściowy `WHERE published_at IS NULL`) i `export_job` (`results_versions` jsonb, `results_hash`, `s3_key`, `expires_at`).
  4. Dodaj do migracji `0004_technical.sql` uprawnienia: `pc_app` – `INSERT, SELECT` na `audit_log` i `score_sheet_revision`; `pc_retention` – `DELETE` na `change_log`, `processed_mutation`, `idempotency_key`, `UPDATE` wybranych kolumn `athlete`.
  5. Napisz test integracyjny uprawnień: `UPDATE audit_log` i `DELETE FROM score_sheet_revision` w roli `pc_app` kończą się `insufficient_privilege`.
  6. Dopisz lub uruchom przypadki TC-INT-008, TC-SEC-019 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-107: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-INT-008, TC-SEC-019 przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 8 h (M) | **Ryzyko:** średnie

### IMP-108 – Repozytoria z kontekstem właściciela („scoped repository”)
- **Epik / obszar:** EP-03 Backend – rdzeń, konto i konfiguracja turnieju | **Rola:** BE
- **Cel:** Zapytania na ścieżkach organizatora zawsze filtrują po właścicielu lub turnieju, więc organizator nie odczyta ani nie zmieni cudzego turnieju nawet przy błędzie w kontrolerze.
- **Zakres:** Bazowa klasa repozytorium wymagająca `ctx.ownerId` / `ctx.tournamentId`, test architektury (ts-morph) wykrywający bezpośrednie użycie `db.select` w modułach poza repozytoriami; **Poza zakresem:** –
- **Zależności:** [IMP-103](#imp-103--baza-drizzle-migracje-transakcje-z-kontekstem)
- **Odwołania:** 05-bez §4, NFR-411, [TC-SEC-011](../03-test-plans/05-testy-niefunkcjonalne.md#tc-sec-011)
- **Kroki:**
  1. Napisz `src/db/repositories/base.repository.ts`: klasa `ScopedRepository<T>` wymagająca `ctx.ownerId` (organizator) albo `ctx.tournamentId` + `ctx.deviceId` (urządzenie) i dokładająca warunek do każdego `select`/`update`/`delete`.
  2. Zwracaj `NOT_FOUND` (nie `FORBIDDEN`) dla zasobów spoza zakresu, zgodnie z 05-bezpieczenstwo §4.1.
  3. Przenieś zapytania modułów `tournaments`, `categories`, `entries`, `judges`, `devices` do repozytoriów dziedziczących po `ScopedRepository`.
  4. Napisz test architektury `test/arch/no-raw-db.test.ts` (ts-morph): użycie `db.select`/`db.update`/`db.delete` poza `src/db/repositories/**` i `src/modules/sync/**` (ścieżka urządzenia z własnym zakresem) oznacza porażkę.
  5. Dopisz lub uruchom przypadki TC-SEC-011 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  6. Otwórz PR `IMP-108: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] Test architektury w CI
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 4 h (S) | **Ryzyko:** niskie

### IMP-109 – Audyt, dziennik zmian i outbox zdarzeń w transakcji
- **Epik / obszar:** EP-03 Backend – rdzeń, konto i konfiguracja turnieju | **Rola:** BE
- **Cel:** Każda komenda zmieniająca dane zapisuje w tej samej transakcji wpis audytu, wpis `change_log` dla tabletów i zdarzenie realtime, więc nie ma zmian bez śladu ani zdarzeń o zmianach wycofanych.
- **Zakres:** `AuditService.record(tx, …)` (różnice before/after, bez sekretów), `ChangeLogService.append(tx, entity, op, audience)`, `DomainEventService.emit(tx, type, payload)`; dekorator komendy wymuszający użycie; **Poza zakresem:** Publikator zdarzeń (IMP-155)
- **Zależności:** [IMP-107](#imp-107--migracja-4-audyt-dziennik-zmian-idempotencja-zdarzenia-eksporty)
- **Odwołania:** FR-901, ADR-002, 01-przeglad §4.2, [TC-INT-011](../03-test-plans/02-testy-integracyjne-api.md#tc-int-011), [TC-AUDIT-002](../03-test-plans/02-testy-integracyjne-api.md#tc-audit-002)
- **Kroki:**
  1. Napisz `AuditService.record(tx, { action, entityType, entityId, before, after })` w `src/modules/audit/audit.service.ts`: różnica pól, usunięcie `pin*`, `password*`, `secret*`, aktor i `request_id` z kontekstu.
  2. Napisz `ChangeLogService.append(tx, { entityType, entityId, op, audience })` w `src/modules/sync/change-log.service.ts` (audience `ALL`, `JUDGE:{id}`, `DEVICE:{id}`) i zwiększanie `tournament.change_seq`.
  3. Napisz `DomainEventService.emit(tx, type, payload)` w `src/modules/realtime/domain-event.service.ts` walidujący ładunek schematem z `@polechamp/contracts/events`.
  4. Dodaj dekorator `@Command({ audit: 'CATEGORY_LOCKED' })` i bazową klasę `CommandHandler`, która otwiera `withTx`, wykonuje logikę i sprawdza, że wpis audytu powstał (inaczej wyjątek w testach).
  5. Napisz test transakcyjności: wyjątek po `emit` wycofuje audyt, `change_log` i `domain_event`; sukces zapisuje wszystkie trzy.
  6. Dopisz lub uruchom przypadki TC-INT-011, TC-AUDIT-002 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-109: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-INT-011, TC-AUDIT-002 przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 8 h (M) | **Ryzyko:** średnie

### IMP-110 – Idempotency-Key dla POST organizatora
- **Epik / obszar:** EP-03 Backend – rdzeń, konto i konfiguracja turnieju | **Rola:** BE
- **Cel:** Ponowione „Utwórz turniej” (lub inny POST organizatora) przy słabym LTE zwraca tę samą odpowiedź zamiast tworzyć duplikat.
- **Zakres:** Interceptor: klucz + użytkownik, hash treści, zapis odpowiedzi, `IDEMPOTENCY_KEY_REUSED`, równoległe żądania z tym samym kluczem (blokada advisory); **Poza zakresem:** –
- **Zależności:** [IMP-104](#imp-104--migracja-1-konto-i-tokeny), [IMP-101](#imp-101--błędy-rfc-9457-i-middleware-identyfikatora-żądania)
- **Odwołania:** US-011, NFR-306, [TC-API-022](../03-test-plans/02-testy-integracyjne-api.md#tc-api-022)
- **Kroki:**
  1. Napisz `IdempotencyInterceptor` w `src/common/idempotency/idempotency.interceptor.ts` aktywny dla `POST` z nagłówkiem `Idempotency-Key` (walidacja UUID).
  2. Licz `request_hash` = SHA-256 kanonicznej treści + metody + ścieżki; wyszukaj (`key`, `user_id`) w `idempotency_key`.
  3. Przy trafieniu z tym samym hashem zwróć zapisane `response_status` i `response_body` (nagłówek `Idempotent-Replayed: true`); przy innym hashu – `422 IDEMPOTENCY_KEY_REUSED`.
  4. Serializuj równoległe żądania z tym samym kluczem `pg_advisory_xact_lock(hashtext(key))`; drugie żądanie czeka na wynik pierwszego.
  5. Zapisuj odpowiedź w tej samej transakcji co komendę; błędy 5xx nie są zapisywane (klient może ponowić).
  6. Dopisz lub uruchom przypadki TC-API-022 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-110: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-API-022 przechodzi
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 5 h (M) | **Ryzyko:** niskie

### IMP-111 – Optymistyczna współbieżność (ETag / If-Match)
- **Epik / obszar:** EP-03 Backend – rdzeń, konto i konfiguracja turnieju | **Rola:** BE
- **Cel:** Równoległa edycja tych samych danych przez dwa urządzenia organizatora kończy się czytelnym konfliktem zamiast cichego nadpisania.
- **Zakres:** Dekorator `@Versioned()` – nagłówek `ETag W/"n"`, wymagany `If-Match` dla PATCH/DELETE, `CONFLICT_VERSION`; **Poza zakresem:** –
- **Zależności:** [IMP-101](#imp-101--błędy-rfc-9457-i-middleware-identyfikatora-żądania)
- **Odwołania:** 03-api §1, [TC-API-025](../03-test-plans/02-testy-integracyjne-api.md#tc-api-025)
- **Kroki:**
  1. Napisz dekorator `@Versioned(entity)` i interceptor ustawiający `ETag: W/"<version>"` w odpowiedziach `GET`, `POST`, `PATCH`.
  2. Wymagaj `If-Match` w `PATCH` i `DELETE` zasobów wersjonowanych (brak nagłówka → `428`, mapowany w kliencie jak `CONFLICT_VERSION`).
  3. Wykonuj aktualizację warunkową `UPDATE … SET version = version + 1 WHERE id = $1 AND version = $2`; 0 wierszy → `409 CONFLICT_VERSION`.
  4. Napisz testy: dwa `PATCH` z tym samym `If-Match` (drugi 409), `DELETE` bez nagłówka.
  5. Dopisz lub uruchom przypadki TC-API-025 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  6. Otwórz PR `IMP-111: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-API-025 przechodzi
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 3 h (S) | **Ryzyko:** niskie

### IMP-112 – Limity zapytań (Valkey)
- **Epik / obszar:** EP-03 Backend – rdzeń, konto i konfiguracja turnieju | **Rola:** BE
- **Cel:** Masowe próby logowania, parowania i wysyłki kodów są blokowane z nagłówkiem `Retry-After`, a awaria Valkey nie wyłącza API.
- **Zakres:** Sliding window w Valkey: per token (120/min), per IP i konto dla logowania, parowanie per IP, resend kodu; nagłówek `Retry-After`; tryb awaryjny w pamięci przy niedostępności Valkey (NFR-307); **Poza zakresem:** Limity PIN (IMP-143)
- **Zależności:** [IMP-100](#imp-100--szkielet-api-nestjs-12-fastify), [IMP-010](01-fundamenty-i-devops.md#imp-010--terraform-elasticache-valkey)
- **Odwołania:** NFR-405, NFR-307, [TC-API-104](../03-test-plans/02-testy-integracyjne-api.md#tc-api-104), [TC-API-105](../03-test-plans/02-testy-integracyjne-api.md#tc-api-105)
- **Kroki:**
  1. Napisz `RateLimitService` w `src/common/rate-limit/rate-limit.service.ts`: przesuwne okno w Valkey (skrypt Lua `ZADD`/`ZREMRANGEBYSCORE`/`ZCARD`, TTL klucza = okno).
  2. Zdefiniuj polityki: `token` 120/min, `login:account` 5/15 min, `login:ip` 20/15 min, `pair:ip` 10/10 min, `resend:account` 1/60 s i 5/h, `verify:code` 5 prób/kod.
  3. Napisz dekorator `@RateLimit('login:ip', key: req => req.ip)` i guard zwracający `429 RATE_LIMITED` z `Retry-After`.
  4. Dodaj tryb awaryjny: przy błędzie Valkey licznik w pamięci procesu (LRU, te same limity per zadanie) i metryka `rate_limit_fallback`.
  5. Napisz testy z Testcontainers Valkey (przekroczenie limitu, reset po oknie) i z zatrzymanym kontenerem (tryb awaryjny).
  6. Dopisz lub uruchom przypadki TC-API-104, TC-API-105 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-112: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-API-104, TC-API-105 przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

### IMP-113 – JWT ES256 i guardy ról
- **Epik / obszar:** EP-03 Backend – rdzeń, konto i konfiguracja turnieju | **Rola:** BE
- **Cel:** Organizator, urządzenie i sędzia dostają podpisane tokeny ES256, a guardy wpuszczają ich tylko do zasobów własnego turnieju, panelu lub urządzenia.
- **Zakres:** `jose` 6: podpis/weryfikacja z `kid` (aktywny + poprzedni klucz), claims wg 05-bezpieczenstwo; guardy `@Roles`, `@TournamentOwner`, `@DeviceOfTournament`, `@JudgeInPanel`; reguły odmowy 401/403/404 (05 §4.1); **Poza zakresem:** –
- **Zależności:** [IMP-101](#imp-101--błędy-rfc-9457-i-middleware-identyfikatora-żądania), [IMP-014](01-fundamenty-i-devops.md#imp-014--terraform-secrets-manager-kms-iam-ról-zadań)
- **Odwołania:** ADR-008, NFR-404, NFR-411, [TC-SEC-009](../03-test-plans/05-testy-niefunkcjonalne.md#tc-sec-009), [TC-SEC-010](../03-test-plans/05-testy-niefunkcjonalne.md#tc-sec-010), [TC-SEC-024](../03-test-plans/05-testy-niefunkcjonalne.md#tc-sec-024)
- **Kroki:**
  1. Napisz `JwtService` w `src/modules/auth/jwt.service.ts` (`jose` 6): podpis ES256 aktywnym kluczem z nagłówkiem `kid`, weryfikacja kluczem aktywnym lub poprzednim, `iss`, `aud`, `exp` (org 15 min, device 1 h, judge 12 h).
  2. Zdefiniuj claims typów: `org` (`sub`, `typ`), `device` (`sub=deviceId`, `trn`), `judge` (`sub=judgeId`, `dev`, `trn`, `sid`) i odrzucaj `alg: none`, HS256 i nieznane `kid`.
  3. Napisz guardy w `src/common/guards/`: `@Roles('org'|'device'|'judge')`, `TournamentOwnerGuard`, `DeviceOfTournamentGuard` (urządzenie nieunieważnione – inaczej `401 DEVICE_REVOKED`), `JudgeInPanelGuard` (`403 JUDGE_NOT_IN_PANEL`).
  4. Ustal reguły odpowiedzi 401/403/404 z 05-bezpieczenstwo §4.1 (cudzy zasób → 404, zły typ tokenu → 403) w jednym miejscu `authz-policy.ts`.
  5. Pobieraj klucze z Secrets Manager przy starcie i odświeżaj co 10 min (rotacja bez restartu).
  6. Napisz testy ataków: zmieniony podpis, `alg: none`, token urządzenia na endpoint organizatora, token sędziego innego turnieju, wygasły `exp`.
  7. Dopisz lub uruchom przypadki TC-SEC-009, TC-SEC-010, TC-SEC-024 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  8. Otwórz PR `IMP-113: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-SEC-009, TC-SEC-010 przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 8 h (M) | **Ryzyko:** średnie

### IMP-114 – Rejestracja konta (Argon2id, HIBP, regulamin)
- **Epik / obszar:** EP-03 Backend – rdzeń, konto i konfiguracja turnieju | **Rola:** BE
- **Cel:** Organizator zakłada konto z bezpiecznym hasłem i akceptacją regulaminu, a odpowiedź nie zdradza, czy e-mail był już zarejestrowany.
- **Zakres:** `POST /auth/register`: Argon2id (m=19 MiB, t=2, p=1), polityka hasła (≥ 10), HIBP range z `Add-Padding` + fallback lista top-100k (Q-12), zapis `terms_version`, odpowiedź identyczna dla istniejącego e-maila + e-mail „konto istnieje”, kod weryfikacyjny; **Poza zakresem:** Szablony e-mail (IMP-119)
- **Zależności:** [IMP-104](#imp-104--migracja-1-konto-i-tokeny), [IMP-060](02-pakiety-wspoldzielone.md#imp-060--contracts-konto-i-uwierzytelnianie), [IMP-112](#imp-112--limity-zapytań-valkey)
- **Odwołania:** FR-101, FR-102, FR-903, US-001, TL-41, [TC-API-001](../03-test-plans/02-testy-integracyjne-api.md#tc-api-001)…004, [TC-SEC-012](../03-test-plans/05-testy-niefunkcjonalne.md#tc-sec-012), [TC-SEC-025](../03-test-plans/05-testy-niefunkcjonalne.md#tc-sec-025)
- **Kroki:**
  1. Napisz `RegisterController` (`POST /v1/auth/register`, `PUBLIC`, limit `login:ip`) i komendę `RegisterCommand` w `src/modules/auth/register/`.
  2. Hashuj hasło Argon2id (`argon2`, m = 19 MiB, t = 2, p = 1) w puli wątków; odrzucaj hasła < 10 znaków (`TOO_SHORT`).
  3. Napisz `PasswordBreachService`: HIBP k-anonymity (`/range/{prefix}` z nagłówkiem `Add-Padding: true`, timeout 1,5 s), fallback do listy `top-100k.txt` (Q-12); trafienie → `422` z polem `password` i kodem `PASSWORD_BREACHED`.
  4. Zapisz `app_user` z `terms_version` i `terms_accepted_at`, utwórz `auth_email_token` (`VERIFY_EMAIL`, 6 cyfr, 24 h) i zleć e-mail z kodem (IMP-119).
  5. Dla istniejącego e-maila zwróć tę samą odpowiedź `202` i zleć e-mail „konto już istnieje” (anty-enumeracja); wyrównaj czas odpowiedzi (stały koszt hashowania).
  6. Zapisz audyt `ACCOUNT_REGISTERED` (bez e-maila w `after`) i dodaj testy z mockiem HIBP (trafienie, timeout, błąd 5xx).
  7. Dopisz lub uruchom przypadki TC-API-001…004, TC-SEC-012, TC-SEC-025 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  8. Zaktualizuj schematy i rejestr OpenAPI w `@polechamp/contracts` (z `x-permissions`), dodaj wiersze macierzy TC-AUTHZ i uruchom test zgodności tras.
  9. Otwórz PR `IMP-114: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-API-001…004, TC-SEC-012 (rejestracja), TC-SEC-025 przechodzą
  - [ ] Endpointy zarejestrowane w OpenAPI z `x-permissions`; wiersze TC-AUTHZ dla tych endpointów przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 8 h (M) | **Ryzyko:** średnie

### IMP-115 – Weryfikacja e-maila i ponowne wysłanie kodu
- **Epik / obszar:** EP-03 Backend – rdzeń, konto i konfiguracja turnieju | **Rola:** BE
- **Cel:** Organizator potwierdza e-mail 6-cyfrowym kodem, może poprosić o nowy kod nie częściej niż co 60 s, a po 5 błędnych próbach kod przestaje działać.
- **Zakres:** `POST /auth/verify-email` (5 prób, 24 h), `POST /auth/verify-email/resend` (60 s, 5/h), unieważnianie poprzednich kodów; **Poza zakresem:** –
- **Zależności:** [IMP-114](#imp-114--rejestracja-konta-argon2id-hibp-regulamin)
- **Odwołania:** FR-102, US-001, TL-07, [TC-API-005](../03-test-plans/02-testy-integracyjne-api.md#tc-api-005)…007
- **Kroki:**
  1. Napisz `POST /v1/auth/verify-email` (`PUBLIC`): wyszukaj aktywny `auth_email_token` (`VERIFY_EMAIL`) użytkownika, porównaj SHA-256 kodu stałoczasowo.
  2. Przy błędzie zwiększ `attempts`; przy 5 próbach lub po 24 h ustaw `used_at` i zwracaj `400 CODE_INVALID`.
  3. Przy sukcesie ustaw `app_user.email_verified_at`, `used_at` tokenu, zapisz audyt `EMAIL_VERIFIED`; odpowiedź `204`.
  4. Napisz `POST /v1/auth/verify-email/resend` (`ORG`, limit `resend:account` 1/60 s i 5/h): unieważnij poprzednie kody, utwórz nowy i zleć e-mail; odpowiedź `202`.
  5. Dopisz lub uruchom przypadki TC-API-005…007 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  6. Zaktualizuj schematy i rejestr OpenAPI w `@polechamp/contracts` (z `x-permissions`), dodaj wiersze macierzy TC-AUTHZ i uruchom test zgodności tras.
  7. Otwórz PR `IMP-115: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-API-005…007 przechodzą
  - [ ] Endpointy zarejestrowane w OpenAPI z `x-permissions`; wiersze TC-AUTHZ dla tych endpointów przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 4 h (S) | **Ryzyko:** niskie

### IMP-116 – Logowanie, blokada konta, refresh z rotacją, wylogowanie
- **Epik / obszar:** EP-03 Backend – rdzeń, konto i konfiguracja turnieju | **Rola:** BE
- **Cel:** Organizator loguje się i pozostaje zalogowany dzięki rotowanym refresh tokenom, a kradzież tokenu lub zgadywanie hasła kończy się unieważnieniem sesji lub blokadą konta.
- **Zakres:** `login` (limity przed hashem, `INVALID_CREDENTIALS`, `ACCOUNT_LOCKED` z eskalacją `lockout_level`), `refresh` (rotacja, wykrycie ponownego użycia → unieważnienie rodziny), `logout`; **Poza zakresem:** –
- **Zależności:** [IMP-114](#imp-114--rejestracja-konta-argon2id-hibp-regulamin), [IMP-113](#imp-113--jwt-es256-i-guardy-ról)
- **Odwołania:** FR-103, FR-105, FR-107, US-002, US-003, NFR-404, [TC-API-008](../03-test-plans/02-testy-integracyjne-api.md#tc-api-008)…013, [TC-SEC-013](../03-test-plans/05-testy-niefunkcjonalne.md#tc-sec-013)
- **Kroki:**
  1. Napisz `POST /v1/auth/login`: najpierw limity `login:ip` i `login:account`, potem weryfikacja Argon2id (dla nieistniejącego konta – hash atrapy, ten sam czas), błąd `401 INVALID_CREDENTIALS`.
  2. Po 5 nieudanych próbach ustaw `locked_until` (15 min × 2^`lockout_level`, maks. 24 h), zwiększ `lockout_level` i zwracaj `423 ACCOUNT_LOCKED` z `retryAfterSeconds`; sukces zeruje `failed_login_count`.
  3. Wydawaj parę tokenów: `accessToken` (JWT `org`, 15 min) i `refreshToken` (256 bit, w bazie SHA-256, 30 dni, nowa `family_id`).
  4. Napisz `POST /v1/auth/refresh`: rotacja (stary token `revoked_at`, `replaced_by_id`); ponowne użycie zrotowanego tokenu → unieważnienie całej rodziny i `401 TOKEN_REUSED`, audyt `REFRESH_TOKEN_REUSED`.
  5. Napisz `POST /v1/auth/logout` (`ORG`) unieważniający rodzinę bieżącego tokenu (`204`).
  6. Zapisz audyty `LOGIN_SUCCEEDED`, `LOGIN_FAILED`, `ACCOUNT_LOCKED` (z `ip`, bez hasła).
  7. Dopisz lub uruchom przypadki TC-API-008…013, TC-SEC-013 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  8. Otwórz PR `IMP-116: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-API-008…013, TC-SEC-013 (logowanie) przechodzą
  - [ ] Endpointy zarejestrowane w OpenAPI z `x-permissions`; wiersze TC-AUTHZ dla tych endpointów przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 8 h (M) | **Ryzyko:** średnie

### IMP-117 – Reset hasła (link uniwersalny)
- **Epik / obszar:** EP-03 Backend – rdzeń, konto i konfiguracja turnieju | **Rola:** BE
- **Cel:** Organizator, który zapomniał hasła, dostaje link otwierający aplikację, ustawia nowe hasło i zostaje wylogowany ze wszystkich urządzeń.
- **Zakres:** `password/forgot` (zawsze 202), token 256 bit 1 h, link `https://polechamp.app/reset?token=…`, `password/reset` (polityka hasła, unieważnienie wszystkich refresh tokenów); **Poza zakresem:** Ekran resetu (IMP-253)
- **Zależności:** [IMP-116](#imp-116--logowanie-blokada-konta-refresh-z-rotacją-wylogowanie), [IMP-119](#imp-119--moduł-e-mail-ses-przez-worker-i-szablony-pl)
- **Odwołania:** FR-104, US-002, [TC-API-014](../03-test-plans/02-testy-integracyjne-api.md#tc-api-014)…016
- **Kroki:**
  1. Napisz `POST /v1/auth/password/forgot` (`PUBLIC`, limit per IP i e-mail): zawsze `202`; dla istniejącego konta utwórz `auth_email_token` (`RESET_PASSWORD`, 256 bit, 1 h) i unieważnij poprzednie.
  2. Zleć e-mail z linkiem uniwersalnym `https://polechamp.app/reset?token=…` (otwierany przez aplikację, w przeglądarce strona z instrukcją – IMP-179).
  3. Napisz `POST /v1/auth/password/reset`: weryfikacja tokenu (`400 RESET_TOKEN_INVALID` dla wygasłego lub użytego), polityka hasła i HIBP jak przy rejestracji.
  4. Po zmianie hasła ustaw `used_at`, unieważnij wszystkie rodziny refresh tokenów użytkownika, wyzeruj blokadę konta i zapisz audyt `PASSWORD_RESET`.
  5. Dopisz lub uruchom przypadki TC-API-014…016 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  6. Otwórz PR `IMP-117: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-API-014…016 przechodzą
  - [ ] Endpointy zarejestrowane w OpenAPI z `x-permissions`; wiersze TC-AUTHZ dla tych endpointów przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 5 h (M) | **Ryzyko:** niskie

### IMP-118 – Profil i usunięcie konta
- **Epik / obszar:** EP-03 Backend – rdzeń, konto i konfiguracja turnieju | **Rola:** BE
- **Cel:** Organizator widzi i edytuje swój profil oraz może usunąć konto, które natychmiast przestaje działać i jest trwale usuwane po 30 dniach.
- **Zakres:** `GET/PATCH /me`, `DELETE /me` (`ACTIVE_TOURNAMENT_EXISTS`, natychmiastowa dezaktywacja i unieważnienie sesji, e-mail potwierdzający, twarde usunięcie przez retencję po 30 dniach); **Poza zakresem:** Zadanie retencji (IMP-176)
- **Zależności:** [IMP-116](#imp-116--logowanie-blokada-konta-refresh-z-rotacją-wylogowanie)
- **Odwołania:** FR-106, US-003, TL-22, [TC-API-017](../03-test-plans/02-testy-integracyjne-api.md#tc-api-017)…019
- **Kroki:**
  1. Napisz `GET /v1/me` i `PATCH /v1/me` (`displayName`, `locale`) w `src/modules/account/account.controller.ts`.
  2. Napisz `DELETE /v1/me`: przy turnieju w statusie `IN_PROGRESS` zwróć `409 ACTIVE_TOURNAMENT_EXISTS` („Najpierw zakończ trwający turniej.”).
  3. W przeciwnym razie ustaw `deleted_at`, unieważnij wszystkie refresh tokeny, unieważnij urządzenia turniejów użytkownika (`session.revoked: DEVICE_REVOKED`) i zwróć `202`.
  4. Zleć e-mail potwierdzający usunięcie z datą twardego usunięcia (+30 dni) i zapisz audyt `ACCOUNT_DELETION_REQUESTED`.
  5. Blokuj logowanie kont z `deleted_at` (odpowiedź jak `INVALID_CREDENTIALS`); twarde usunięcie wykonuje zadanie retencji (IMP-176).
  6. Dopisz lub uruchom przypadki TC-API-017…019 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  7. Zaktualizuj schematy i rejestr OpenAPI w `@polechamp/contracts` (z `x-permissions`), dodaj wiersze macierzy TC-AUTHZ i uruchom test zgodności tras.
  8. Otwórz PR `IMP-118: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-API-017…019 (bez części retencji) przechodzą
  - [ ] Endpointy zarejestrowane w OpenAPI z `x-permissions`; wiersze TC-AUTHZ dla tych endpointów przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

### IMP-119 – Moduł e-mail (SES przez worker) i szablony PL
- **Epik / obszar:** EP-03 Backend – rdzeń, konto i konfiguracja turnieju | **Rola:** BE
- **Cel:** E-maile transakcyjne (kod, reset, „konto istnieje”, potwierdzenie usunięcia) wychodzą po polsku przez SES z ponowieniami, a chwilowa awaria SES nie przerywa rejestracji.
- **Zakres:** Kolejka BullMQ `email`, ponowienia z backoffem, szablony (kod weryfikacyjny, reset hasła, konto już istnieje, potwierdzenie usunięcia konta) z `@polechamp/i18n` (HTML + tekst), Mailpit lokalnie; **Poza zakresem:** –
- **Zależności:** [IMP-170](05-backend-eksport-audyt-rodo.md#imp-170--worker-kolejki-bullmq), [IMP-013](01-fundamenty-i-devops.md#imp-013--terraform-ses-domena-dkim-dmarc-i-wyjście-z-sandboxa), [IMP-069](02-pakiety-wspoldzielone.md#imp-069--polechampi18n--infrastruktura-liczba-mnoga-formatery)
- **Odwołania:** FR-102, FR-104, FR-106, NFR-601, [TC-REL-008](../03-test-plans/05-testy-niefunkcjonalne.md#tc-rel-008)
- **Kroki:**
  1. Utwórz kolejkę BullMQ `email` i `EmailProducer.enqueue(template, to, params)` w `src/modules/email/email.producer.ts` (API tylko zleca).
  2. Napisz `EmailProcessor` w workerze: `@aws-sdk/client-sesv2` `SendEmail` z configuration set `transactional`, ponowienia 5× z backoffem wykładniczym (30 s…15 min), lokalnie SMTP do Mailpit.
  3. Utwórz szablony `verify-code`, `password-reset`, `account-exists`, `account-deletion` w `src/modules/email/templates/` (HTML + tekst) z treściami z przestrzeni `email` w `@polechamp/i18n`.
  4. Obsłuż zdarzenia odbić i skarg z SQS (IMP-013): oznacz adres jako niedostarczalny i pomijaj kolejne wysyłki poza `password-reset`.
  5. Napisz testy snapshot szablonów (HTML i tekst) i test procesora z mockiem SES zwracającym `Throttling`.
  6. Dopisz lub uruchom przypadki TC-REL-008 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-119: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-REL-008 przechodzi
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

### IMP-120 – Konfiguracja aplikacji i minimalna wersja
- **Epik / obszar:** EP-03 Backend – rdzeń, konto i konfiguracja turnieju | **Rola:** BE
- **Cel:** Aplikacja pobiera minimalne wersje i adresy dokumentów prawnych z API, a każda odpowiedź mówi, czy wersja aplikacji jest jeszcze obsługiwana.
- **Zakres:** `GET /v1/app-config`, nagłówek `X-Min-App-Version` w każdej odpowiedzi, wartości z konfiguracji środowiska; **Poza zakresem:** Ekran aktualizacji (IMP-217)
- **Zależności:** [IMP-100](#imp-100--szkielet-api-nestjs-12-fastify), [IMP-060](02-pakiety-wspoldzielone.md#imp-060--contracts-konto-i-uwierzytelnianie)
- **Odwołania:** NFR-706, FR-903, TL-07, [TC-API-020](../03-test-plans/02-testy-integracyjne-api.md#tc-api-020)
- **Kroki:**
  1. Napisz `GET /v1/app-config` (`PUBLIC`, `Cache-Control: max-age=300`) w `src/modules/app-config/app-config.controller.ts` zwracające `minAppVersion`, `minSyncAppVersion`, `termsVersion` i `legal` (`termsUrl`, `privacyUrl`, `dpaUrl`, `accountDeletionUrl`, `supportUrl`).
  2. Czytaj wartości z konfiguracji środowiska (`APP_MIN_VERSION`, `APP_MIN_SYNC_VERSION`, `TERMS_VERSION`, `LEGAL_BASE_URL`) walidowanej przy starcie.
  3. Dodaj globalny hook Fastify `onSend` ustawiający nagłówek `X-Min-App-Version` w każdej odpowiedzi.
  4. Napisz testy: obecność nagłówka na odpowiedzi błędu 404 i zgodność treści ze schematem `AppConfig`.
  5. Dopisz lub uruchom przypadki TC-API-020 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  6. Zaktualizuj schematy i rejestr OpenAPI w `@polechamp/contracts` (z `x-permissions`), dodaj wiersze macierzy TC-AUTHZ i uruchom test zgodności tras.
  7. Otwórz PR `IMP-120: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-API-020 przechodzi
  - [ ] Endpointy zarejestrowane w OpenAPI z `x-permissions`; wiersze TC-AUTHZ dla tych endpointów przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 3 h (S) | **Ryzyko:** niskie

### IMP-121 – Turnieje: lista, utworzenie, szczegóły
- **Epik / obszar:** EP-03 Backend – rdzeń, konto i konfiguracja turnieju | **Rola:** BE
- **Cel:** Organizator widzi listę swoich turniejów z postępem, tworzy nowy turniej odporny na ponowienia i otwiera dashboard ze statystykami, postępem i kategoriami.
- **Zakres:** `GET /tournaments?status=`, `POST /tournaments` (Idempotency-Key), `GET /tournaments/{id}` (statystyki TL-34, postęp z `@polechamp/scoring`, `pendingRejectedSubmissions`, kategorie z postępem); zapytania agregujące w jednym SQL na listę; **Poza zakresem:** –
- **Zależności:** [IMP-105](#imp-105--migracja-2-turnieje-kategorie-kryteria-kary-zawodniczki-sędziowie), [IMP-108](#imp-108--repozytoria-z-kontekstem-właściciela-scoped-repository), [IMP-109](#imp-109--audyt-dziennik-zmian-i-outbox-zdarzeń-w-transakcji), [IMP-110](#imp-110--idempotency-key-dla-post-organizatora), [IMP-061](02-pakiety-wspoldzielone.md#imp-061--contracts-turnieje-kategorie-kryteria-kary), [IMP-055](02-pakiety-wspoldzielone.md#imp-055--scoring-formatowanie-wyników-i-postęp)
- **Odwołania:** FR-201, FR-202, FR-205, FR-209, US-010, US-011, US-013, [TC-API-021](../03-test-plans/02-testy-integracyjne-api.md#tc-api-021)…024
- **Kroki:**
  1. Napisz `TournamentsController` w `src/modules/tournaments/tournaments.controller.ts`: `GET /v1/tournaments?status=active|finished` (`active` = DRAFT + IN_PROGRESS), `POST /v1/tournaments`, `GET /v1/tournaments/{tournamentId}` ze schematami `TournamentListQuery`, `TournamentCreate`, `TournamentListItem`, `TournamentDetails` z `@polechamp/contracts`.
  2. Zbuduj listę jednym zapytaniem SQL w `TournamentsRepository.listForOwner`: `categoryCount` i `progress { done, expected, percent }` z agregatu `score_sheet` × aktywne starty × panel (tylko kategorie IN_PROGRESS/LOCKED), sortowanie Trwa → W przygotowaniu → data rosnąco (NULL na końcu), zakończone malejąco.
  3. Zaimplementuj `CreateTournamentCommand`: `status = DRAFT`, `version = 1`, `Idempotency-Key` (IMP-110), odpowiedź `201` z `ETag: W/"1"`, audyt `TOURNAMENT_CREATED`.
  4. Zbuduj szczegóły w `TournamentDetailsQuery`: `stats.categories`, `stats.athletes` (różne zawodniczki z ≥ 1 startem `ACTIVE` – TL-34), `stats.judges` (aktywni), `progress` z `tournamentProgress` (`@polechamp/scoring`), `pendingRejectedSubmissions` (`resolution = PENDING`), `categories[]` z postępem i `entryCount`.
  5. Zwracaj `404 NOT_FOUND` dla turnieju innego właściciela (repozytorium z zakresem, IMP-108) i dodaj `ETag` w szczegółach.
  6. Napisz testy integracyjne na seedzie prototypu: liczby z przykładu 03-api §3.2 (173/215, 80%), sortowanie listy, ponowiony POST z tym samym kluczem.
  7. Dopisz lub uruchom przypadki TC-API-021…024 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  8. Zaktualizuj schematy i rejestr OpenAPI w `@polechamp/contracts` (z `x-permissions`), dodaj wiersze macierzy TC-AUTHZ i uruchom test zgodności tras.
  9. Otwórz PR `IMP-121: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-API-021…024 przechodzą
  - [ ] Endpointy zarejestrowane w OpenAPI z `x-permissions`; wiersze TC-AUTHZ dla tych endpointów przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 8 h (M) | **Ryzyko:** niskie

### IMP-122 – Turnieje: edycja, usunięcie, start, ochrona turnieju zakończonego
- **Epik / obszar:** EP-03 Backend – rdzeń, konto i konfiguracja turnieju | **Rola:** BE
- **Cel:** Organizator edytuje nazwę, daty i miejsce turnieju, usuwa pusty turniej w przygotowaniu i rozpoczyna turniej po weryfikacji e-maila, a turniej zakończony jest dla API tylko do odczytu.
- **Zakres:** `PATCH` (If-Match), `DELETE` (tylko DRAFT), `POST …/start` (`EMAIL_NOT_VERIFIED`), globalny guard `TournamentWritable` (409 `TOURNAMENT_FINISHED`, wyjątek RODO – TL-17); **Poza zakresem:** –
- **Zależności:** [IMP-121](#imp-121--turnieje-lista-utworzenie-szczegóły), [IMP-111](#imp-111--optymistyczna-współbieżność-etag--if-match)
- **Odwołania:** FR-203, FR-204, FR-206, FR-208, INT-05, US-012, US-014, [TC-API-025](../03-test-plans/02-testy-integracyjne-api.md#tc-api-025)…028, [TC-API-030](../03-test-plans/02-testy-integracyjne-api.md#tc-api-030), [TC-INT-005](../03-test-plans/02-testy-integracyjne-api.md#tc-int-005), [TC-INT-007](../03-test-plans/02-testy-integracyjne-api.md#tc-int-007)
- **Kroki:**
  1. Napisz `PATCH /v1/tournaments/{tournamentId}` (`TournamentPatch`, `If-Match`, `CONFLICT_VERSION`) z audytem `TOURNAMENT_UPDATED`, `change_log` (`tournament`, `ALL`) i zdarzeniem `tournament.updated`.
  2. Napisz `DELETE /v1/tournaments/{tournamentId}`: tylko `DRAFT` bez arkuszy (`409 INVALID_STATE_TRANSITION` / `HAS_SCORES`), miękkie usunięcie `deleted_at`, audyt `TOURNAMENT_DELETED`.
  3. Napisz `POST /v1/tournaments/{tournamentId}/start`: `DRAFT → IN_PROGRESS`, `403 EMAIL_NOT_VERIFIED` bez `email_verified_at`, audyt `TOURNAMENT_STARTED`, zdarzenie `tournament.updated`.
  4. Napisz `TournamentWritableGuard` w `src/common/guards/tournament-writable.guard.ts`: dla turnieju `FINISHED` każda komenda zmieniająca zwraca `409 TOURNAMENT_FINISHED`, poza dekorowanymi `@AllowWhenFinished('GDPR')` (`PATCH /entries` dla danych osobowych, `POST /entries/{id}/anonymize` – TL-17).
  5. Zastosuj guard w modułach `tournaments`, `categories`, `entries`, `judges`, `devices` i dodaj test przechodzący wszystkie trasy zmieniające dla turnieju zakończonego.
  6. Dopisz lub uruchom przypadki TC-API-025…028, TC-API-030, TC-INT-005, TC-INT-007 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  7. Zaktualizuj schematy i rejestr OpenAPI w `@polechamp/contracts` (z `x-permissions`), dodaj wiersze macierzy TC-AUTHZ i uruchom test zgodności tras.
  8. Otwórz PR `IMP-122: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-API-025…028, TC-API-030, TC-INT-005, TC-INT-007 przechodzą
  - [ ] Endpointy zarejestrowane w OpenAPI z `x-permissions`; wiersze TC-AUTHZ dla tych endpointów przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

### IMP-123 – Turnieje: zakończenie (auto-blokada, nierozegrane, sesje)
- **Epik / obszar:** EP-03 Backend – rdzeń, konto i konfiguracja turnieju | **Rola:** BE
- **Cel:** Zakończenie turnieju jednym poleceniem blokuje trwające kategorie z wynikami ostatecznymi, oznacza niewystartowane jako nierozegrane i wylogowuje sędziów ze wszystkich tabletów.
- **Zakres:** `POST …/finish`: w jednej transakcji blokada kategorii IN_PROGRESS (przeliczenie i suma kontrolna – IMP-127), lista nierozegranych, zamknięcie sesji sędziów (`TOURNAMENT_FINISHED`), audyt, zdarzenia; **Poza zakresem:** –
- **Zależności:** [IMP-122](#imp-122--turnieje-edycja-usunięcie-start-ochrona-turnieju-zakończonego), [IMP-127](#imp-127--blokada-i-odblokowanie-kategorii-z-sumą-kontrolną), [IMP-143](04-backend-urzadzenia-ocenianie-synchronizacja.md#imp-143--sesje-sędziów-online-i-limity-prób-pin)
- **Odwołania:** FR-207, US-015, TL-14, [TC-API-029](../03-test-plans/02-testy-integracyjne-api.md#tc-api-029), [TC-EDGE-017](../03-test-plans/08-przypadki-brzegowe.md#tc-edge-017), [TC-EDGE-070](../03-test-plans/08-przypadki-brzegowe.md#tc-edge-070)
- **Kroki:**
  1. Napisz `FinishTournamentCommand` w `src/modules/tournaments/finish.command.ts`: `POST /v1/tournaments/{tournamentId}/finish` z `If-Match`, tylko `IN_PROGRESS → FINISHED` (inaczej `409 INVALID_STATE_TRANSITION`).
  2. W jednej transakcji z `SELECT … FOR UPDATE` na turnieju i kategoriach zablokuj każdą kategorię `IN_PROGRESS` przez `LockCategoryService.lock(tx, id, { force: true, reason: 'TOURNAMENT_FINISHED' })` (przeliczenie i `final_results_hash` – IMP-127).
  3. Zwróć `autoLockedCategoryIds` i `unplayedCategoryIds` (kategorie `DRAFT` pozostają w tym statusie i są prezentowane jako „Nierozegrana”).
  4. Zamknij aktywne `judge_session` (`ended_reason = REVOKED`) i wyemituj `session.revoked` z `reason: TOURNAMENT_FINISHED` do pokoi urządzeń.
  5. Zapisz audyt `TOURNAMENT_FINISHED` z listami kategorii, `change_log` (`tournament`, `category`) i zdarzenia `tournament.updated`, `category.locked`.
  6. Napisz testy: turniej z 2 kategoriami w toku i 1 w przygotowaniu, ponowne wywołanie (409), mutacja oceny po zakończeniu (`TOURNAMENT_FINISHED`).
  7. Dopisz lub uruchom przypadki TC-API-029, TC-EDGE-017, TC-EDGE-070 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  8. Zaktualizuj schematy i rejestr OpenAPI w `@polechamp/contracts` (z `x-permissions`), dodaj wiersze macierzy TC-AUTHZ i uruchom test zgodności tras.
  9. Otwórz PR `IMP-123: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-API-029, TC-EDGE-017, TC-EDGE-070 przechodzą
  - [ ] Endpointy zarejestrowane w OpenAPI z `x-permissions`; wiersze TC-AUTHZ dla tych endpointów przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** średnie

### IMP-124 – Kategorie: tworzenie z szablonu, odczyt, edycja, usunięcie
- **Epik / obszar:** EP-03 Backend – rdzeń, konto i konfiguracja turnieju | **Rola:** BE
- **Cel:** Organizator dodaje kategorię, która od razu ma kryteria i kary z szablonu stylu, edytuje jej dane i usuwa ją przed startem.
- **Zakres:** `POST /tournaments/{id}/categories` (szablon stylu z `@polechamp/scoring`), `GET /tournaments/{id}/categories`, `GET /categories/{id}` (`maxJudgeScore`, liczniki, `pendingRejectedSubmissions`), `PATCH` (styl/poziom tylko DRAFT), `DELETE` (DRAFT), limit 60; **Poza zakresem:** –
- **Zależności:** [IMP-121](#imp-121--turnieje-lista-utworzenie-szczegóły), [IMP-052](02-pakiety-wspoldzielone.md#imp-052--scoring-wynik-sędziego-maksimum-wartości-domyślne-walidacja-arkusza), [IMP-061](02-pakiety-wspoldzielone.md#imp-061--contracts-turnieje-kategorie-kryteria-kary)
- **Odwołania:** FR-301, FR-302, FR-303, FR-304, FR-312, US-020, US-021, US-022, [TC-API-031](../03-test-plans/02-testy-integracyjne-api.md#tc-api-031)…033
- **Kroki:**
  1. Napisz `CategoriesController` w `src/modules/categories/`: `POST /v1/tournaments/{tournamentId}/categories` (`CategoryCreate`), `GET /v1/tournaments/{tournamentId}/categories`, `GET /v1/categories/{categoryId}`, `PATCH`, `DELETE`.
  2. W `CreateCategoryCommand` skopiuj kryteria i kary z `templateForStyle(style)` (`@polechamp/scoring`), ustaw `position` na końcu, `tie_break_criterion_id` = pierwsze kryterium, `ageGroup` puste → „Open”; limit 60 kategorii (`LimitsService`).
  3. Zbuduj `CategoryDetails`: kryteria i kary posortowane po `position`, `maxJudgeScore` z `maxJudgeScore()`, `entryCount`, `judgeCount`, `progress`, `pendingRejectedSubmissions` (baner „Odrzucone oceny ({n})” – TL-35), `ETag`.
  4. W `PATCH` zezwól na zmianę `style` i `level` tylko w `DRAFT` (inaczej `409 INVALID_STATE_TRANSITION`); `DELETE` tylko w `DRAFT` (kaskada kryteriów, kar i startów).
  5. Zapisz audyty `CATEGORY_CREATED`/`UPDATED`/`DELETED`, `change_log` (`category`, `criterion`, `penalty_type`, `ALL`) i zdarzenie `category.updated`.
  6. Napisz testy: szablon Exotic (6 kryteriów, MAX 75), zmiana stylu w IN_PROGRESS (409), 61. kategoria (`LIMIT_EXCEEDED`).
  7. Dopisz lub uruchom przypadki TC-API-031…033 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  8. Zaktualizuj schematy i rejestr OpenAPI w `@polechamp/contracts` (z `x-permissions`), dodaj wiersze macierzy TC-AUTHZ i uruchom test zgodności tras.
  9. Otwórz PR `IMP-124: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-API-031…033 przechodzą
  - [ ] Endpointy zarejestrowane w OpenAPI z `x-permissions`; wiersze TC-AUTHZ dla tych endpointów przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 8 h (M) | **Ryzyko:** niskie

### IMP-125 – Kryteria i kary – CRUD z blokadą po starcie
- **Epik / obszar:** EP-03 Backend – rdzeń, konto i konfiguracja turnieju | **Rola:** BE
- **Cel:** Organizator dodaje, edytuje i usuwa kryteria oraz kary tylko przed startem kategorii, a kategoria zawsze ma co najmniej jedno kryterium i poprawne kryterium rozstrzygające.
- **Zakres:** CRUD kryteriów i kar, pozycje, `CRITERIA_LOCKED`, `MIN_CRITERIA`, `LIMIT_EXCEEDED` (12/10), kryterium rozstrzygające = pierwsze (po usunięciu pierwszego – nowe pierwsze); **Poza zakresem:** –
- **Zależności:** [IMP-124](#imp-124--kategorie-tworzenie-z-szablonu-odczyt-edycja-usunięcie)
- **Odwołania:** FR-305, FR-306, FR-307, FR-311, INT-04, US-023, US-024, TL-09, [TC-API-042](../03-test-plans/02-testy-integracyjne-api.md#tc-api-042)…046, [TC-INT-004](../03-test-plans/02-testy-integracyjne-api.md#tc-int-004), [TC-EDGE-064](../03-test-plans/08-przypadki-brzegowe.md#tc-edge-064)
- **Kroki:**
  1. Napisz `POST /v1/categories/{categoryId}/criteria`, `PATCH /v1/criteria/{criterionId}`, `DELETE /v1/criteria/{criterionId}` (`CriterionInput`; waga w API dziesiętna, w bazie `weight_tenths`).
  2. Napisz `POST /v1/categories/{categoryId}/penalty-types`, `PATCH /v1/penalty-types/{penaltyTypeId}`, `DELETE /v1/penalty-types/{penaltyTypeId}` (`PenaltyTypeInput`, `points_tenths`).
  3. Blokuj zmiany w kategorii innej niż `DRAFT` (`409 CRITERIA_LOCKED`) z `SELECT … FOR UPDATE` na kategorii; limity 12 kryteriów i 10 kar (`LIMIT_EXCEEDED` z `detail.max`).
  4. Odrzucaj usunięcie ostatniego kryterium (`409 MIN_CRITERIA`); po usunięciu kryterium rozstrzygającego ustaw `tie_break_criterion_id` na nowe pierwsze i zagęść `position` (ograniczenie DEFERRABLE).
  5. Zapisz audyty `CRITERION_*`/`PENALTY_TYPE_*`, `change_log` i zdarzenie `config.changed` (`scope: criteria|penalties`).
  6. Napisz testy: 13. kryterium, waga 0,3 (`INVALID_STEP`), usunięcie pierwszego kryterium (nowe rozstrzygające), edycja po starcie.
  7. Dopisz lub uruchom przypadki TC-API-042…046, TC-INT-004, TC-EDGE-064 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  8. Otwórz PR `IMP-125: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-API-042…046, TC-INT-004, TC-EDGE-064 przechodzą
  - [ ] Endpointy zarejestrowane w OpenAPI z `x-permissions`; wiersze TC-AUTHZ dla tych endpointów przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 8 h (M) | **Ryzyko:** niskie

### IMP-126 – Start kategorii: warunki, panel, auto-start turnieju
- **Epik / obszar:** EP-03 Backend – rdzeń, konto i konfiguracja turnieju | **Rola:** BE
- **Cel:** Organizator rozpoczyna kategorię tylko wtedy, gdy ma kryteria, zawodniczki i sędziów, a start pierwszej kategorii automatycznie rozpoczyna turniej i powiadamia tablety.
- **Zakres:** `POST /categories/{id}/start`: `FOR UPDATE`, warunki (kryteria, aktywne starty, aktywni sędziowie, turniej nie FINISHED, e-mail zweryfikowany przy DRAFT – TL-10), wypełnienie `category_judge`, przejście turnieju, zdarzenia i `sync.hint`; **Poza zakresem:** –
- **Zależności:** [IMP-125](#imp-125--kryteria-i-kary--crud-z-blokadą-po-starcie), [IMP-130](#imp-130--sędziowie-lista-dodanie-z-pin-em-i-weryfikatorami-edycja-dezaktywacja-usunięcie)
- **Odwołania:** FR-308, US-025, D-AR-07, TL-10, [TC-API-034](../03-test-plans/02-testy-integracyjne-api.md#tc-api-034)…036
- **Kroki:**
  1. Napisz `StartCategoryCommand` w `src/modules/categories/start.command.ts` (`POST /v1/categories/{categoryId}/start`) z `SELECT … FOR UPDATE` na kategorii i turnieju.
  2. Sprawdź warunki: ≥ 1 kryterium, ≥ 1 aktywny start, ≥ 1 aktywny sędzia; brak → `409 START_REQUIREMENTS_NOT_MET` z `detail` wskazującym brak (klucz komunikatu „Dodaj co najmniej jedną zawodniczkę.” itd.).
  3. Odrzuć start w turnieju `FINISHED` (`TOURNAMENT_FINISHED`) i ponowny start (`INVALID_STATE_TRANSITION`); gdy turniej jest `DRAFT`, wymagaj `email_verified_at` (`403 EMAIL_NOT_VERIFIED` – TL-10) i przełącz go na `IN_PROGRESS`.
  4. Ustaw `status = IN_PROGRESS`, `started_at`, wypełnij `category_judge` wszystkimi aktywnymi sędziami turnieju.
  5. Zapisz audyt `CATEGORY_STARTED` (i `TOURNAMENT_STARTED` przy auto-starcie), `change_log` (`category` z `panelJudgeIds`) oraz zdarzenia `category.updated`, `tournament.updated`, `sync.hint`.
  6. Napisz testy każdego brakującego warunku i auto-startu turnieju z niezweryfikowanym e-mailem.
  7. Dopisz lub uruchom przypadki TC-API-034…036 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  8. Zaktualizuj schematy i rejestr OpenAPI w `@polechamp/contracts` (z `x-permissions`), dodaj wiersze macierzy TC-AUTHZ i uruchom test zgodności tras.
  9. Otwórz PR `IMP-126: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-API-034…036 przechodzą
  - [ ] Endpointy zarejestrowane w OpenAPI z `x-permissions`; wiersze TC-AUTHZ dla tych endpointów przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

### IMP-127 – Blokada i odblokowanie kategorii z sumą kontrolną
- **Epik / obszar:** EP-03 Backend – rdzeń, konto i konfiguracja turnieju | **Rola:** BE
- **Cel:** Organizator blokuje kategorię z ostrzeżeniem o brakujących ocenach i zaległych tabletach, wyniki stają się ostateczne z sumą kontrolną, a odblokowanie jest jawne i audytowane.
- **Zakres:** `POST …/lock` (`LOCK_WARNINGS` wg TL-19: braki ocen, urządzenia z kolejką / offline > 2 min od startu kategorii; `force`), przeliczenie wyników (IMP-150), SHA-256 z `canonicalResults`, `locked_at/by`; `POST …/unlock` (powód, `final_results_hash = NULL`); `FOR UPDATE` kontra `FOR SHARE` w przyjmowaniu ocen; **Poza zakresem:** –
- **Zależności:** [IMP-126](#imp-126--start-kategorii-warunki-panel-auto-start-turnieju), [IMP-150](04-backend-urzadzenia-ocenianie-synchronizacja.md#imp-150--serwis-przeliczania-wyników-kategorii), [IMP-057](02-pakiety-wspoldzielone.md#imp-057--scoring-kanoniczny-json-wyników), [IMP-142](04-backend-urzadzenia-ocenianie-synchronizacja.md#imp-142--heartbeat-urządzeń-i-stan-online)
- **Odwołania:** FR-309, FR-310, US-026, US-027, ADR-010, TL-19, [TC-API-037](../03-test-plans/02-testy-integracyjne-api.md#tc-api-037)…041, [TC-API-106](../03-test-plans/02-testy-integracyjne-api.md#tc-api-106), [TC-EDGE-032](../03-test-plans/08-przypadki-brzegowe.md#tc-edge-032)
- **Kroki:**
  1. Napisz `LockCategoryCommand` (`POST /v1/categories/{categoryId}/lock`, `{ force }`) z `SELECT … FOR UPDATE` na kategorii; przyjmowanie ocen (IMP-147) bierze `FOR SHARE`, więc blokada czeka na trwające zapisy.
  2. Bez `force` policz ostrzeżenia: `missingSheets` (aktywne starty × J − arkusze), `devicesWithPending` (nieunieważnione urządzenia z `last_seen_at ≥ started_at` i `pending_mutations > 0`), `offlineDevices` (brak kontaktu > 2 min – TL-19); niepuste → `409 LOCK_WARNINGS` z tą treścią.
  3. Przy blokadzie przelicz wyniki `ResultsService.recompute(tx, categoryId)` (IMP-150), policz `final_results_hash` = SHA-256 z `canonicalResults` i ustaw `status = LOCKED`, `locked_at`, `locked_by`.
  4. Napisz `UnlockCategoryCommand` (`POST …/unlock`, `{ reason? }`): `LOCKED → IN_PROGRESS`, `final_results_hash = NULL`, `409 TOURNAMENT_FINISHED` w turnieju zakończonym.
  5. Zapisz audyty `CATEGORY_LOCKED` (z hashem, `force`, ostrzeżeniami) i `CATEGORY_UNLOCKED` (z powodem), `change_log` i zdarzenia `category.locked` / `category.unlocked`, `results.updated`.
  6. Napisz test współbieżności: równoległy `sync/push` i `lock` – ocena albo trafia do wyników przed hashem, albo zostaje odrzucona `CATEGORY_LOCKED`.
  7. Dopisz lub uruchom przypadki TC-API-037…041, TC-API-106, TC-EDGE-032 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  8. Zaktualizuj schematy i rejestr OpenAPI w `@polechamp/contracts` (z `x-permissions`), dodaj wiersze macierzy TC-AUTHZ i uruchom test zgodności tras.
  9. Otwórz PR `IMP-127: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-API-037…041, TC-API-106, TC-EDGE-032 przechodzą
  - [ ] Endpointy zarejestrowane w OpenAPI z `x-permissions`; wiersze TC-AUTHZ dla tych endpointów przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 8 h (M) | **Ryzyko:** wysokie

### IMP-128 – Zawodniczki: lista z licznikami, dodawanie, edycja
- **Epik / obszar:** EP-03 Backend – rdzeń, konto i konfiguracja turnieju | **Rola:** BE
- **Cel:** Organizator widzi listę startową z licznikami ocen i wyszukiwaniem bez polskich znaków, dodaje zawodniczki z unikalnym numerem i zgodą opiekuna oraz poprawia ich dane także po zakończeniu (RODO).
- **Zakres:** `GET /categories/{id}/entries?q=` (n/J, wyszukiwanie bez znaków diakrytycznych – `unaccent`), `POST` (athlete + entry na końcu kolejki, numer unikalny – `START_NUMBER_TAKEN`, zgoda opiekuna, limit 300/1 500, walidacja znaków: Latin + interpunkcja, bez emoji), `PATCH` (dane, numer; wyjątek RODO w LOCKED/FINISHED – TL-17); `change_log` dla tabletów; **Poza zakresem:** Wycofanie (IMP-129)
- **Zależności:** [IMP-124](#imp-124--kategorie-tworzenie-z-szablonu-odczyt-edycja-usunięcie), [IMP-062](02-pakiety-wspoldzielone.md#imp-062--contracts-zawodniczki-sędziowie-urządzenia-parowanie)
- **Odwołania:** FR-401, FR-402, FR-403, FR-405, FR-406, US-030, US-031, US-033, TL-17, [TC-API-047](../03-test-plans/02-testy-integracyjne-api.md#tc-api-047)…050, [TC-API-053](../03-test-plans/02-testy-integracyjne-api.md#tc-api-053), [TC-EDGE-012](../03-test-plans/08-przypadki-brzegowe.md#tc-edge-012), [TC-L10N-006](../03-test-plans/05-testy-niefunkcjonalne.md#tc-l10n-006)
- **Kroki:**
  1. Napisz `GET /v1/categories/{categoryId}/entries?q=` w `src/modules/entries/entries.controller.ts`: wiersze `EntryRow` z `judged { done, expected }`, wycofane na końcu, wyszukiwanie po `unaccent(lower(full_name))`, klubie i numerze.
  2. Dodaj migrację z rozszerzeniem `unaccent` i indeksem funkcyjnym `gin (unaccent(lower(full_name)) gin_trgm_ops)`.
  3. Napisz `CreateEntryCommand` (`POST`, `EntryCreate`): nowy `athlete` + `entry` z `start_order = max + 1`, `409 START_NUMBER_TAKEN` (z `detail.number`), `409 CATEGORY_LOCKED`, limity 300 w kategorii i 1 500 w turnieju.
  4. Waliduj znaki nazw (litery łacińskie z diakrytykami, spacja, `-`, `'`, `.`; bez emoji) w schemacie `TrimmedString` i wymagaj zgody opiekuna dla `isMinor`.
  5. Napisz `PatchEntryCommand` (`If-Match`): numer i dane; w kategorii `LOCKED` lub turnieju `FINISHED` tylko `fullName`, `club`, `birthYear` (`@AllowWhenFinished('GDPR')`), inne pola → `409 CATEGORY_LOCKED`/`TOURNAMENT_FINISHED`.
  6. Zapisz audyty `ENTRY_CREATED`/`ENTRY_UPDATED`, `change_log` (`entry`, `athlete`, `ALL`) i zdarzenie `config.changed` (`scope: entries`).
  7. Napisz testy: wyszukiwanie „zuzanna krol” → „Zuzanna Król”, numer zajęty w innej kategorii tego turnieju, emoji w nazwisku.
  8. Dopisz lub uruchom przypadki TC-API-047…050, TC-API-053, TC-EDGE-012, TC-L10N-006 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  9. Zaktualizuj schematy i rejestr OpenAPI w `@polechamp/contracts` (z `x-permissions`), dodaj wiersze macierzy TC-AUTHZ i uruchom test zgodności tras.
  10. Otwórz PR `IMP-128: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-API-047…050, TC-API-053, TC-EDGE-012, TC-L10N-006 przechodzą
  - [ ] Endpointy zarejestrowane w OpenAPI z `x-permissions`; wiersze TC-AUTHZ dla tych endpointów przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 8 h (M) | **Ryzyko:** niskie

### IMP-129 – Zawodniczki: wycofanie, przywrócenie, usunięcie
- **Epik / obszar:** EP-03 Backend – rdzeń, konto i konfiguracja turnieju | **Rola:** BE
- **Cel:** Organizator wycofuje zawodniczkę (znika z kolejki sędziów i rankingu, oceny zostają), przywraca ją albo usuwa pozycję bez ocen.
- **Zakres:** `withdraw`, `restore` (przeliczenie wyników, `change_log`, zdarzenia), `DELETE` (tylko bez ocen – `HAS_SCORES`; usuwa `athlete`, jeśli bez innych startów); **Poza zakresem:** –
- **Zależności:** [IMP-128](#imp-128--zawodniczki-lista-z-licznikami-dodawanie-edycja), [IMP-150](04-backend-urzadzenia-ocenianie-synchronizacja.md#imp-150--serwis-przeliczania-wyników-kategorii)
- **Odwołania:** FR-404, US-032, INT-06, [TC-API-051](../03-test-plans/02-testy-integracyjne-api.md#tc-api-051), [TC-API-052](../03-test-plans/02-testy-integracyjne-api.md#tc-api-052)
- **Kroki:**
  1. Napisz `POST /v1/entries/{entryId}/withdraw`: `status = WITHDRAWN`, `withdrawn_at`, przeliczenie wyników kategorii (IMP-150), `409 INVALID_STATE_TRANSITION` dla już wycofanej.
  2. Napisz `POST /v1/entries/{entryId}/restore`: powrót do `ACTIVE`, przeliczenie wyników, zachowanie `start_order`.
  3. Napisz `DELETE /v1/entries/{entryId}`: tylko bez arkuszy (`409 HAS_SCORES`); usuń `athlete`, jeśli nie ma innych startów, i zagęść `start_order`.
  4. Zapisz audyty `ENTRY_WITHDRAWN`/`ENTRY_RESTORED`/`ENTRY_DELETED`, `change_log` (`entry` z `op: U`/`D`) i zdarzenia `config.changed`, `results.updated`, `progress.updated`.
  5. Napisz testy: oceny wycofanej zawodniczki nie liczą się do postępu ani rankingu, ale są widoczne w `score-sheets`.
  6. Dopisz lub uruchom przypadki TC-API-051, TC-API-052 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-129: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-API-051, TC-API-052 przechodzą
  - [ ] Endpointy zarejestrowane w OpenAPI z `x-permissions`; wiersze TC-AUTHZ dla tych endpointów przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 5 h (M) | **Ryzyko:** niskie

### IMP-130 – Sędziowie: lista, dodanie z PIN-em i weryfikatorami, edycja, dezaktywacja, usunięcie
- **Epik / obszar:** EP-03 Backend – rdzeń, konto i konfiguracja turnieju | **Rola:** BE
- **Cel:** Organizator dodaje sędziego i jednorazowo widzi jego losowy, unikalny PIN, a serwer zapisuje hash i weryfikator offline; może też zmienić dane, dezaktywować lub usunąć sędziego.
- **Zakres:** Generator PIN (CSPRNG, zakazane wzorce z 05 §3.1, unikalność przez `pin_fingerprint` HMAC – TL-06), `pin_hash` Argon2id, `pin_offline_verifier` PBKDF2 600k (raz – TL-04), odpowiedź z PIN-em jednorazowo; `GET` z `sheetCount`/`pinLocked`; `PATCH` (nazwa – `JUDGE_NAME_TAKEN`, inicjały, aktywność → zamknięcie sesji, panele wg TL-18); `DELETE` (`HAS_SCORES`); limit 30; **Poza zakresem:** Reset PIN (IMP-131)
- **Zależności:** [IMP-105](#imp-105--migracja-2-turnieje-kategorie-kryteria-kary-zawodniczki-sędziowie), [IMP-062](02-pakiety-wspoldzielone.md#imp-062--contracts-zawodniczki-sędziowie-urządzenia-parowanie), [IMP-014](01-fundamenty-i-devops.md#imp-014--terraform-secrets-manager-kms-iam-ról-zadań)
- **Odwołania:** FR-501, FR-502, FR-503, US-040, US-041, TL-04, TL-06, TL-18, [TC-API-055](../03-test-plans/02-testy-integracyjne-api.md#tc-api-055)…057, [TC-API-059](../03-test-plans/02-testy-integracyjne-api.md#tc-api-059), [TC-API-060](../03-test-plans/02-testy-integracyjne-api.md#tc-api-060), [TC-EDGE-028](../03-test-plans/08-przypadki-brzegowe.md#tc-edge-028)
- **Kroki:**
  1. Napisz `PinService` w `src/modules/judges/pin.service.ts`: losowanie 4 cyfr `crypto.randomInt`, odrzucenie wzorców z 05-bezpieczenstwo §3.1 (równe cyfry, ciągi rosnące/malejące, 19xx/20xx, PIN-y demo), unikalność przez `pin_fingerprint` = HMAC-SHA256(klucz z Secrets Manager, `tournament_id ‖ PIN`).
  2. Licz przy generowaniu `pin_hash` (Argon2id) i raz `pin_offline_verifier` = PBKDF2-HMAC-SHA256(PIN, losowa 16 B `pin_offline_salt`, 600 000) w puli wątków (TL-04).
  3. Napisz `POST /v1/tournaments/{tournamentId}/judges` (`JudgeCreate`): inicjały z pierwszych liter słów, `position` na końcu, odpowiedź `JudgeCreated` z `pin` i `pinShownOnce: true`; `409 JUDGE_NAME_TAKEN`, `LIMIT_EXCEEDED` (30).
  4. Napisz `GET /v1/tournaments/{tournamentId}/judges` z `isActive`, `pinLocked`, `sheetCount` (bez pól PIN) i `PATCH /v1/judges/{judgeId}` (`fullName`, `initials`, `isActive`; dezaktywacja zamyka sesję – `session.revoked: JUDGE_DEACTIVATED`; aktywacja dodaje do paneli `DRAFT`/`IN_PROGRESS` – TL-18).
  5. Napisz `DELETE /v1/judges/{judgeId}` (tylko bez arkuszy – `409 HAS_SCORES`).
  6. Zapisz audyty `JUDGE_CREATED`/`UPDATED`/`DEACTIVATED`/`DELETED` (bez PIN-u), `change_log` (`judge`) i zdarzenie `judges.changed`.
  7. Napisz testy: 10 000 losowań bez zakazanych wzorców, brak `pin` w odpowiedziach poza `201`, brak PIN-u w logach i audycie.
  8. Dopisz lub uruchom przypadki TC-API-055…057, TC-API-059, TC-API-060, TC-EDGE-028 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  9. Otwórz PR `IMP-130: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-API-055…057, TC-API-059, TC-API-060, TC-EDGE-028 przechodzą
  - [ ] Endpointy zarejestrowane w OpenAPI z `x-permissions`; wiersze TC-AUTHZ dla tych endpointów przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 10 h (L) | **Ryzyko:** średnie

### IMP-131 – Reset PIN-u sędziego
- **Epik / obszar:** EP-03 Backend – rdzeń, konto i konfiguracja turnieju | **Rola:** BE
- **Cel:** Organizator resetuje PIN zablokowanego lub zapomnianego sędziego, sędzia zostaje wylogowany ze wszystkich tabletów, a stare weryfikatory offline przestają działać.
- **Zakres:** `POST /judges/{id}/pin/reset`: nowy PIN, `pin_version + 1`, nowe weryfikatory, zdjęcie blokad (globalnej i licznika), zamknięcie sesji (`PIN_RESET`), `judges.changed` + `change_log`; **Poza zakresem:** –
- **Zależności:** [IMP-130](#imp-130--sędziowie-lista-dodanie-z-pin-em-i-weryfikatorami-edycja-dezaktywacja-usunięcie), [IMP-143](04-backend-urzadzenia-ocenianie-synchronizacja.md#imp-143--sesje-sędziów-online-i-limity-prób-pin)
- **Odwołania:** FR-503, US-042, FR-509, [TC-API-058](../03-test-plans/02-testy-integracyjne-api.md#tc-api-058)
- **Kroki:**
  1. Napisz `ResetPinCommand` w `src/modules/judges/reset-pin.command.ts` (`POST /v1/judges/{judgeId}/pin/reset`).
  2. Wygeneruj nowy PIN przez `PinService` (nowe `pin_hash`, `pin_fingerprint`, sól i `pin_offline_verifier`), zwiększ `pin_version`, wyzeruj `failed_pin_count` i `pin_locked_at`.
  3. Zamknij aktywną sesję sędziego (`ended_reason = REVOKED`) i wyemituj `session.revoked` z `reason: PIN_RESET` i `judgeId`.
  4. Zapisz `change_log` (`judge` z nowym `pinVersion` i `pinVerifier` per urządzenie przy odczycie), zdarzenie `judges.changed` i audyt `JUDGE_PIN_RESET`; odpowiedź z PIN-em jednorazowo.
  5. Napisz test: mutacja z sesji offline starego PIN-u po resecie → `REJECTED PIN_VERSION_OUTDATED`.
  6. Dopisz lub uruchom przypadki TC-API-058 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  7. Zaktualizuj schematy i rejestr OpenAPI w `@polechamp/contracts` (z `x-permissions`), dodaj wiersze macierzy TC-AUTHZ i uruchom test zgodności tras.
  8. Otwórz PR `IMP-131: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-API-058 przechodzi
  - [ ] Endpointy zarejestrowane w OpenAPI z `x-permissions`; wiersze TC-AUTHZ dla tych endpointów przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 4 h (S) | **Ryzyko:** niskie

### IMP-132 – Limity turnieju (NFR-801)
- **Epik / obszar:** EP-03 Backend – rdzeń, konto i konfiguracja turnieju | **Rola:** BE
- **Cel:** Wszystkie limity turnieju (60 kategorii, 1 500 startów, 300 w kategorii, 30 sędziów, 20 urządzeń, 12 kryteriów, 10 kar) są egzekwowane w jednym miejscu z tym samym kodem błędu.
- **Zakres:** Serwis `LimitsService` (60 kategorii, 1 500 startów, 300 w kategorii, 30 sędziów, 20 urządzeń, 12 kryteriów, 10 kar) z kodem `LIMIT_EXCEEDED`; konfiguracja w jednym miejscu; **Poza zakresem:** –
- **Zależności:** [IMP-124](#imp-124--kategorie-tworzenie-z-szablonu-odczyt-edycja-usunięcie)
- **Odwołania:** NFR-801, FR-306, [TC-API-111](../03-test-plans/02-testy-integracyjne-api.md#tc-api-111)
- **Kroki:**
  1. Napisz `LimitsService` w `src/modules/limits/limits.service.ts` z konfiguracją `TOURNAMENT_LIMITS` (jedna stała, nadpisywalna w testach).
  2. Dodaj metodę `assertCanAdd(tx, kind, scopeId)` liczącą istniejące rekordy w transakcji (z `FOR UPDATE` na rodzicu, by uniknąć wyścigu).
  3. Zwracaj `409 LIMIT_EXCEEDED` z `detail.limit` (np. `criteria`) i `detail.max` (mapowane w aplikacji na „Osiągnięto limit ({max}).”).
  4. Wywołaj serwis w komendach tworzących kategorie, starty, sędziów, kryteria, kary i w parowaniu urządzeń.
  5. Dopisz lub uruchom przypadki TC-API-111 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  6. Otwórz PR `IMP-132: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-API-111 przechodzi
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 3 h (S) | **Ryzyko:** niskie


# EP-05 – Backend: eksport PDF, audyt, RODO, worker

> Dokument: `04-implementation-plans/05-backend-eksport-audyt-rodo.md` · Tech Lead (Agent 2) · 23.10.2026 · Konwencje i DoD: [00-konwencje-i-definition-of-done.md](00-konwencje-i-definition-of-done.md) · Indeks: [91-indeks-zadan.md](91-indeks-zadan.md)

Worker BullMQ, eksport PDF (pdfmake, Inter, jasny wydruk z kontrastem ≥ 4,5:1 – TL-27, [ADR-009](../01-architecture/adr/ADR-009-eksport-pdf-po-stronie-serwera.md)), opcjonalny CSV (FR-708, Could), odczyt audytu, zadanie retencji z czyszczeniem danych osobowych także w audycie (TL-16), „Usuń dane osobowe” (FR-904), narzędzia operatora w CLI (TL-38, TL-40) i strona statyczna z dokumentami prawnymi i linkami uniwersalnymi (TL-39).

## Podsumowanie

| Zadań | Suma | Rola (h) |
|---|---|---|
| 10 | 61 h | BE 46 · FULL 9 · QA 6 |


## Zadania

### IMP-170 – Worker: kolejki BullMQ
- **Epik / obszar:** EP-05 Backend – eksport PDF, audyt, RODO, worker | **Rola:** BE
- **Cel:** Generowanie PDF, wysyłka e-maili i retencja działają w osobnym procesie `worker` z ponowieniami i kolejką błędów, nie obciążając API.
- **Zakres:** `worker.ts`, kolejki `pdf`, `email`, `retention` (cron), ponowienia 3× z backoffem, DLQ, metryki długości kolejek, graceful shutdown; **Poza zakresem:** –
- **Zależności:** [IMP-100](03-backend-konto-i-konfiguracja-turnieju.md#imp-100--szkielet-api-nestjs-12-fastify), [IMP-010](01-fundamenty-i-devops.md#imp-010--terraform-elasticache-valkey)
- **Odwołania:** ADR-002, ADR-009, [TC-REL-007](../03-test-plans/05-testy-niefunkcjonalne.md#tc-rel-007)
- **Kroki:**
  1. Utwórz `src/worker.ts` i `WorkerModule` rejestrujący kolejki BullMQ 6 `pdf`, `email`, `retention` na Valkey (`maxRetriesPerRequest: null`).
  2. Ustaw domyślne opcje zadań: `attempts: 3`, `backoff: { type: 'exponential', delay: 10_000 }`, `removeOnComplete: 1000`; nieudane po próbach przenoś do kolejki `dead-letter` z alertem.
  3. Zarejestruj zadanie cykliczne `retention:daily` (`repeat: { pattern: '0 3 * * *', tz: 'Europe/Warsaw' }`) i `audit:partitions` (codziennie).
  4. Raportuj metryki EMF `queue_depth{queue}` i `job_duration_ms{queue}` co 30 s.
  5. Obsłuż SIGTERM: `worker.close()` z oczekiwaniem na bieżące zadania (maks. 25 s) przed zakończeniem procesu.
  6. Dopisz lub uruchom przypadki TC-REL-007 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-170: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-REL-007 przechodzi
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 4 h (S) | **Ryzyko:** niskie

### IMP-171 – Eksporty: API zleceń i linki S3
- **Epik / obszar:** EP-05 Backend – eksport PDF, audyt, RODO, worker | **Rola:** BE
- **Cel:** Organizator zleca eksport PDF kategorii lub turnieju i po wygenerowaniu dostaje link do pobrania ważny 15 minut, a plik jest powiązany z wersją wyników.
- **Zakres:** `POST /exports` (zapis `results_versions`, `results_hash`), `GET /exports/{id}` (link podpisany 15 min), klucze S3 `exports/{tournamentId}/{exportId}.pdf`, `expires_at` +7 dni; **Poza zakresem:** Renderer (IMP-172)
- **Zależności:** [IMP-170](#imp-170--worker-kolejki-bullmq), [IMP-151](04-backend-urzadzenia-ocenianie-synchronizacja.md#imp-151--wyniki-endpointy-rankingu-kategorii-i-turnieju), [IMP-012](01-fundamenty-i-devops.md#imp-012--terraform-s3-eksporty-strona-statyczna-i-cloudfront)
- **Odwołania:** FR-705, FR-706, US-073, [TC-API-100](../03-test-plans/02-testy-integracyjne-api.md#tc-api-100), [TC-API-101](../03-test-plans/02-testy-integracyjne-api.md#tc-api-101)
- **Kroki:**
  1. Napisz `POST /v1/exports` (`ExportCreate`: `scope` `TOURNAMENT`/`CATEGORY`, `tournamentId`, `categoryId?`) w `src/modules/exports/exports.controller.ts` → `202 { exportId }`.
  2. Zapisz `export_job` (`status = QUEUED`, `results_versions` = mapa `categoryId → results_version`, `results_hash` z kanonicznych wyników, `created_by`) i zleć zadanie `pdf` z `exportId`.
  3. Ponownie użyj gotowego pliku, gdy istnieje `export_job` `DONE` z tymi samymi `results_versions` i niewygasłym `expires_at`.
  4. Napisz `GET /v1/exports/{exportId}`: `status`, `resultsHash`, a dla `DONE` `downloadUrl` (S3 `getSignedUrl`, 15 min, `ResponseContentDisposition` z nazwą pliku) i `expiresAt` (+7 dni).
  5. Ustal klucz S3 `exports/{tournamentId}/{exportId}.pdf` i zapisz audyt `EXPORT_REQUESTED`.
  6. Dopisz lub uruchom przypadki TC-API-100, TC-API-101 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  7. Zaktualizuj schematy i rejestr OpenAPI w `@polechamp/contracts` (z `x-permissions`), dodaj wiersze macierzy TC-AUTHZ i uruchom test zgodności tras.
  8. Otwórz PR `IMP-171: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-API-100, TC-API-101 przechodzą
  - [ ] Endpointy zarejestrowane w OpenAPI z `x-permissions`; wiersze TC-AUTHZ dla tych endpointów przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 5 h (M) | **Ryzyko:** niskie

### IMP-172 – Renderer PDF (pdfmake, Inter, polskie znaki)
- **Epik / obszar:** EP-05 Backend – eksport PDF, audyt, RODO, worker | **Rola:** BE
- **Cel:** Organizator dostaje czytelny, jasny PDF z wynikami po polsku (z polskimi znakami), w którym stopka z sumą kontrolną pozwala sprawdzić, że wydruk odpowiada wynikom w systemie.
- **Zakres:** pdfmake 0.3 z Inter 4.1 Regular/Medium (statyczne TTF), układ turniej/kategoria wg ADR-009 (jasny, accent-700 dla wyników – TL-27), nagłówek, tabele, „wstępny”, „Nie rozegrano: …”, stopka (data Europe/Warsaw, status, wersja, 12 znaków SHA-256, pełny skrót w metadanych, adnotacja o danych osobowych), etykiety pseudonimizacji, teksty z `@polechamp/i18n`; **Poza zakresem:** –
- **Zależności:** [IMP-171](#imp-171--eksporty-api-zleceń-i-linki-s3), [IMP-069](02-pakiety-wspoldzielone.md#imp-069--polechampi18n--infrastruktura-liczba-mnoga-formatery), [IMP-605](14-spike.md#imp-605--spike-pdfmake-z-inter-i-polskimi-znakami-wydajność-limit-6-h)
- **Odwołania:** FR-705, FR-706, FR-704, ADR-009, TL-27, [TC-PDF-001](../03-test-plans/02-testy-integracyjne-api.md#tc-pdf-001)…008
- **Kroki:**
  1. Napisz `PdfRenderer` w `src/modules/exports/pdf/renderer.ts` na pdfmake 0.3 z fontami Inter 4.1 Regular i Medium (statyczne TTF z obrazu) w `vfs`.
  2. Napisz szablony `tournamentDoc(data)` i `categoryDoc(data)` w `src/modules/exports/pdf/templates/`: nagłówek (nazwa, data z `formatTournamentDate`, miejsce), tabela „Miejsce / Nr / Zawodniczka / Klub / Wynik / Sędziowie” z wynikami w kolorze accent-700 (TL-27).
  3. Dodaj oznaczenia: „wstępny” przy wynikach niekompletnych w kategorii zablokowanej, sekcję „Nie rozegrano: …” dla kategorii nierozegranych, „Wycofana” poza rankingiem, „Zawodniczka nr {nr}” dla danych pseudonimizowanych.
  4. Dodaj stopkę każdej strony: data wygenerowania (Europe/Warsaw), status kategorii, `resultsVersion`, 12 pierwszych znaków SHA-256 i adnotację o danych osobowych; pełny skrót w metadanych PDF (`keywords`).
  5. Pobieraj wszystkie teksty z przestrzeni `pdf` w `@polechamp/i18n` i wyniki z `formatRanking` (`@polechamp/scoring`).
  6. Napisz `PdfProcessor` (kolejka `pdf`): render, upload do S3 (`PutObject` SSE-KMS), `export_job.status = DONE`/`FAILED`, metryka `pdf_render_ms`.
  7. Napisz testy tekstu PDF (`pdf-parse`): obecność „Kamińska”, „Łódź”, „ż”, poprawnej stopki i oznaczeń.
  8. Dopisz lub uruchom przypadki TC-PDF-001…008 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  9. Otwórz PR `IMP-172: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-PDF-001…008 przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 12 h (L) | **Ryzyko:** średnie

### IMP-173 – PDF: regresja wizualna i wydajność
- **Epik / obszar:** EP-05 Backend – eksport PDF, audyt, RODO, worker | **Rola:** QA
- **Cel:** Każda zmiana renderera PDF jest sprawdzana porównaniem obrazu z zaakceptowanym wzorcem, a PDF kategorii powstaje w ≤ 3 s, a największego turnieju w ≤ 10 s.
- **Zakres:** Render PNG pierwszej strony (pdf-to-img) i porównanie odiff z wzorcem; benchmark FX-MAX (kategoria ≤ 3 s, turniej ≤ 10 s); **Poza zakresem:** –
- **Zależności:** [IMP-172](#imp-172--renderer-pdf-pdfmake-inter-polskie-znaki), [IMP-028](01-fundamenty-i-devops.md#imp-028--dane-staging-seed-syntetyczny-i-turniej-maksymalny)
- **Odwołania:** NFR-107, FR-706, [TC-PDF-009](../03-test-plans/02-testy-integracyjne-api.md#tc-pdf-009), [TC-PDF-010](../03-test-plans/02-testy-integracyjne-api.md#tc-pdf-010), [TC-PERF-007](../03-test-plans/05-testy-niefunkcjonalne.md#tc-perf-007)
- **Kroki:**
  1. Napisz `test/pdf/visual.test.ts`: render PDF kategorii i turnieju z danych prototypu, konwersja pierwszej strony do PNG (`pdf-to-img`, 150 dpi).
  2. Porównaj PNG z wzorcami w `test/pdf/__baselines__/` przez `odiff` (próg 0,1%), zapisz różnicę jako artefakt CI przy porażce.
  3. Dodaj skrypt `pnpm pdf:update-baselines` i wymóg akceptacji zmian wzorców w PR (etykieta `visual-approved`).
  4. Napisz `test/pdf/perf.test.ts` na FX-MAX: kategoria ≤ 3 s, cały turniej ≤ 10 s (p95 z 5 przebiegów) na runnerze o parametrach zadania Fargate.
  5. Dopisz lub uruchom przypadki TC-PDF-009, TC-PDF-010, TC-PERF-007 w katalogach testów wskazanych w zakresie; nazwa testu zawiera ID przypadku.
  6. Otwórz PR `IMP-173: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-PDF-009, TC-PDF-010, TC-PERF-007 przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

### IMP-174 – Eksport CSV wyników (Could)
- **Epik / obszar:** EP-05 Backend – eksport PDF, audyt, RODO, worker | **Rola:** FULL
- **Cel:** Organizator może pobrać wyniki jako plik CSV otwierający się poprawnie w polskim Excelu (opcja Could, realizowana, jeśli zostanie czas).
- **Zakres:** Format CSV w `POST /exports` (UTF-8 z BOM, „;”, przecinek dziesiętny) + przycisk ghost „Pobierz CSV” w SCR-ORG-12; **Poza zakresem:** Import CSV (v1.1)
- **Zależności:** [IMP-171](#imp-171--eksporty-api-zleceń-i-linki-s3), [IMP-270](07-mobile-ekrany-organizatora.md#imp-270--scr-org-12--podgląd-i-pobranie-pdf)
- **Odwołania:** FR-708, [TC-API-109](../03-test-plans/02-testy-integracyjne-api.md#tc-api-109)
- **Kroki:**
  1. Dodaj `format: 'PDF' | 'CSV'` do `ExportCreate` i generator `src/modules/exports/csv/results-csv.ts` (UTF-8 z BOM, separator `;`, przecinek dziesiętny, nagłówki PL z `@polechamp/i18n`).
  2. Kolumny: kategoria, miejsce, numer, zawodniczka, klub, wynik, liczba ocen, status; dane pseudonimizowane jako „Zawodniczka nr {nr}”.
  3. Dodaj w SCR-ORG-12 przycisk ghost „Pobierz CSV” (`file-csv`) korzystający z tego samego przepływu zlecenia i udostępniania pliku (`expo-sharing`).
  4. Napisz test zgodności pliku (BOM, separator, liczba wierszy, wartości „52,70”).
  5. Dopisz lub uruchom przypadki TC-API-109 w API (Vitest) i aplikacji (Jest/Maestro); nazwa testu zawiera ID przypadku.
  6. Zaktualizuj schematy i rejestr OpenAPI w `@polechamp/contracts` (z `x-permissions`), dodaj wiersze macierzy TC-AUTHZ i uruchom test zgodności tras.
  7. Otwórz PR `IMP-174: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-API-109 przechodzi
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 4 h (S) | **Ryzyko:** niskie

### IMP-175 – Odczyt dziennika audytu
- **Epik / obszar:** EP-05 Backend – eksport PDF, audyt, RODO, worker | **Rola:** BE
- **Cel:** Organizator (a w MVP – wsparcie przez API) może przeglądać dziennik audytu turnieju stronami i filtrować go po typie encji.
- **Zakres:** `GET /tournaments/{id}/audit-log?cursor=&entityType=`; brak tras modyfikacji; **Poza zakresem:** UI listy (v1.1)
- **Zależności:** [IMP-109](03-backend-konto-i-konfiguracja-turnieju.md#imp-109--audyt-dziennik-zmian-i-outbox-zdarzeń-w-transakcji)
- **Odwołania:** FR-901, US-090, [TC-API-102](../03-test-plans/02-testy-integracyjne-api.md#tc-api-102), [TC-API-103](../03-test-plans/02-testy-integracyjne-api.md#tc-api-103), [TC-AUDIT-001](../03-test-plans/02-testy-integracyjne-api.md#tc-audit-001), [TC-AUDIT-006](../03-test-plans/02-testy-integracyjne-api.md#tc-audit-006)
- **Kroki:**
  1. Napisz `GET /v1/tournaments/{tournamentId}/audit-log?cursor=&entityType=&limit=50` w `src/modules/audit/audit.controller.ts` (`ORG:owner`).
  2. Stronicuj kursorem po (`occurred_at`, `id`) malejąco; odpowiedź `CursorPage<AuditEntry>` (bez `ip` innych użytkowników i bez pól usuniętych przez retencję).
  3. Nie dodawaj tras zmieniających audyt; dodaj test, że `PUT`/`PATCH`/`DELETE` na ścieżce zwracają `404`.
  4. Napisz testy stronicowania (3 strony, stabilny kursor przy dopisywaniu nowych wpisów) i filtra `entityType=score_sheet`.
  5. Dopisz lub uruchom przypadki TC-API-102, TC-API-103, TC-AUDIT-001, TC-AUDIT-006 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  6. Zaktualizuj schematy i rejestr OpenAPI w `@polechamp/contracts` (z `x-permissions`), dodaj wiersze macierzy TC-AUTHZ i uruchom test zgodności tras.
  7. Otwórz PR `IMP-175: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-API-102, TC-API-103, TC-AUDIT-001, TC-AUDIT-006 przechodzą
  - [ ] Endpointy zarejestrowane w OpenAPI z `x-permissions`; wiersze TC-AUTHZ dla tych endpointów przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 3 h (S) | **Ryzyko:** niskie

### IMP-176 – Zadanie retencji i pseudonimizacji
- **Epik / obszar:** EP-05 Backend – eksport PDF, audyt, RODO, worker | **Rola:** BE
- **Cel:** Dane osobowe są automatycznie pseudonimizowane i usuwane w terminach z polityki retencji, a tablety dostają informację o zmianie nazwisk.
- **Zakres:** Codzienny cron (rola `pc_retention`): pseudonimizacja zawodniczek i sędziów 24 mies. po zakończeniu (konfigurowalne), czyszczenie PII w `audit_log.before/after` i `score_sheet_revision.snapshot`, zerowanie IP > 90 dni, usuwanie partycji audytu > 36 mies., `change_log`/`processed_mutation`/`idempotency_key`/`auth_email_token`, `export_job`, twarde usunięcie kont po 30 dniach; zdarzenia `change_log` dla tabletów; raport w logach; **Poza zakresem:** –
- **Zależności:** [IMP-170](#imp-170--worker-kolejki-bullmq), [IMP-107](03-backend-konto-i-konfiguracja-turnieju.md#imp-107--migracja-4-audyt-dziennik-zmian-idempotencja-zdarzenia-eksporty), [IMP-118](03-backend-konto-i-konfiguracja-turnieju.md#imp-118--profil-i-usunięcie-konta)
- **Odwołania:** FR-905, NFR-503, US-091, TL-16, [TC-RODO-001](../03-test-plans/02-testy-integracyjne-api.md#tc-rodo-001), [TC-RODO-002](../03-test-plans/02-testy-integracyjne-api.md#tc-rodo-002), [TC-RODO-005](../03-test-plans/02-testy-integracyjne-api.md#tc-rodo-005), [TC-AUDIT-004](../03-test-plans/02-testy-integracyjne-api.md#tc-audit-004), [TC-API-019](../03-test-plans/02-testy-integracyjne-api.md#tc-api-019)
- **Kroki:**
  1. Napisz `RetentionJob` w `src/worker/retention/retention.job.ts` uruchamiany codziennie w roli `pc_retention`, z każdą regułą w osobnej transakcji i raportem liczby rekordów w logach.
  2. Pseudonimizuj zawodniczki i sędziów turniejów zakończonych ponad 24 miesiące temu (`RETENTION_PSEUDONYMIZE_MONTHS`): `full_name` = „Zawodniczka nr {nr}” / „Sędzia {n}”, `club`, `birth_year` = NULL, `pseudonymized_at`.
  3. Usuwaj PII z `audit_log.before/after` i `score_sheet_revision.snapshot` (pola `fullName`, `club`, `comment`) tych turniejów oraz zeruj `audit_log.ip` starsze niż 90 dni.
  4. Usuwaj partycje audytu starsze niż 36 miesięcy, wpisy `change_log` i `processed_mutation` (30 dni po turnieju), `idempotency_key` (24 h), zużyte `auth_email_token`, wygasłe `export_job` i obiekty S3.
  5. Wykonuj twarde usunięcie kont z `deleted_at` starszym niż 30 dni (z turniejami bez zawodów w toku) z audytem `ACCOUNT_PURGED` (`actor_type = SYSTEM`).
  6. Zapisuj `change_log` (`athlete`, `judge`) dla pseudonimizowanych osób, aby tablety zaktualizowały dane.
  7. Napisz testy z przesuniętym zegarem (`vi.setSystemTime`) dla każdej reguły i test idempotencji (drugie uruchomienie nic nie zmienia).
  8. Dopisz lub uruchom przypadki TC-RODO-001, TC-RODO-002, TC-RODO-005, TC-AUDIT-004, TC-API-019 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  9. Otwórz PR `IMP-176: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-RODO-001, 002, 005, TC-AUDIT-004, TC-API-019 (retencja) przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 10 h (L) | **Ryzyko:** średnie

### IMP-177 – „Usuń dane osobowe” zawodniczki
- **Epik / obszar:** EP-05 Backend – eksport PDF, audyt, RODO, worker | **Rola:** BE
- **Cel:** Organizator na prośbę zawodniczki usuwa jej dane osobowe także po zakończeniu turnieju, a w wynikach i PDF zostaje „Zawodniczka nr {nr}”.
- **Zakres:** `POST /entries/{id}/anonymize` (wyjątek RODO w FINISHED/LOCKED – TL-17), usunięcie PII także z audytu i rewizji tej osoby, `change_log` dla tabletów, audyt operacji; **Poza zakresem:** –
- **Zależności:** [IMP-128](03-backend-konto-i-konfiguracja-turnieju.md#imp-128--zawodniczki-lista-z-licznikami-dodawanie-edycja), [IMP-176](#imp-176--zadanie-retencji-i-pseudonimizacji)
- **Odwołania:** FR-904, US-091, TL-17, [TC-API-054](../03-test-plans/02-testy-integracyjne-api.md#tc-api-054), [TC-PDF-007](../03-test-plans/02-testy-integracyjne-api.md#tc-pdf-007), [TC-EDGE-054](../03-test-plans/08-przypadki-brzegowe.md#tc-edge-054)
- **Kroki:**
  1. Napisz `AnonymizeEntryCommand` w `src/modules/entries/anonymize.command.ts` (`POST /v1/entries/{entryId}/anonymize`, `@AllowWhenFinished('GDPR')` – TL-17).
  2. Pseudonimizuj `athlete` (`full_name` = „Zawodniczka nr {nr}”, `club`, `birth_year` = NULL, `pseudonymized_at`); ponowne wywołanie → `409 INVALID_STATE_TRANSITION`.
  3. Usuń PII tej osoby z `audit_log.before/after` i `score_sheet_revision.snapshot` (UPDATE w roli z uprawnieniem wąsko do tych kolumn – procedura `SECURITY DEFINER`).
  4. Zapisz `change_log` (`athlete`, `ALL`), zdarzenie `config.changed` i audyt `ATHLETE_ANONYMIZED` (bez danych osobowych w treści).
  5. Napisz testy: wynik i miejsce bez zmian, PDF zawiera „Zawodniczka nr 50”, `final_results_hash` niezmieniony (hash nie zawiera PII).
  6. Dopisz lub uruchom przypadki TC-API-054, TC-PDF-007, TC-EDGE-054 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  7. Zaktualizuj schematy i rejestr OpenAPI w `@polechamp/contracts` (z `x-permissions`), dodaj wiersze macierzy TC-AUTHZ i uruchom test zgodności tras.
  8. Otwórz PR `IMP-177: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-API-054, TC-PDF-007, TC-EDGE-054 przechodzą
  - [ ] Endpointy zarejestrowane w OpenAPI z `x-permissions`; wiersze TC-AUTHZ dla tych endpointów przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 4 h (S) | **Ryzyko:** niskie

### IMP-178 – Narzędzia operatora (CLI)
- **Epik / obszar:** EP-05 Backend – eksport PDF, audyt, RODO, worker | **Rola:** BE
- **Cel:** Operator wykonuje rzadkie operacje (turniej do przeglądu w sklepie, eksport danych osoby, odblokowanie konta, retencja) poleceniami CLI z audytem, bez panelu administracyjnego.
- **Zakres:** Polecenia `cli.ts`: `review-tournament:create` (fikcyjne dane, kod parowania do 30 dni), `tournament:offline-login --disable`, `person:export` (JSON danych osoby), `account:unlock`, `retention:run`, `seed:*`; audyt `actor_type = SYSTEM`; uruchamianie jako zadanie ECS; **Poza zakresem:** Panel operatora (v2)
- **Zależności:** [IMP-141](04-backend-urzadzenia-ocenianie-synchronizacja.md#imp-141--urządzenia-parowanie-token-lista-nazwa-unieważnienie), [IMP-176](#imp-176--zadanie-retencji-i-pseudonimizacji)
- **Odwołania:** TL-38, TL-40, NFR-507, 05-bez §3.3, [TC-AUDIT-005](../03-test-plans/02-testy-integracyjne-api.md#tc-audit-005), [TC-RODO-006](../03-test-plans/02-testy-integracyjne-api.md#tc-rodo-006)
- **Kroki:**
  1. Dodaj polecenia `nest-commander` w `src/cli/`: `review-tournament:create` (fikcyjne dane, kod parowania ważny do 30 dni – TL-40), `tournament:offline-login --disable <id>`, `person:export --email|--athlete-id`, `account:unlock <email>`, `retention:run [--dry-run]`.
  2. Zapisuj audyt każdej operacji z `actor_type = SYSTEM` i `actor_id` = identyfikator operatora z parametru `--operator`.
  3. Generuj eksport osoby jako JSON (konto, turnieje, zawodniczka – dane i starty) zapisany do S3 z linkiem podpisanym 24 h.
  4. Uruchamiaj polecenia jako jednorazowe zadania ECS przez `tools/scripts/run-cli.sh <env> <polecenie>` (rola z zatwierdzeniem środowiska).
  5. Napisz `ops/runbooks/operator-cli.md` z przykładami i wymaganiami (kto może, jakie potwierdzenia, gdzie zapisany wynik).
  6. Dopisz lub uruchom przypadki TC-AUDIT-005, TC-RODO-006 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-178: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-AUDIT-005, TC-RODO-006 przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 8 h (M) | **Ryzyko:** niskie

### IMP-179 – Strona statyczna: dokumenty prawne, usunięcie konta, linki uniwersalne
- **Epik / obszar:** EP-05 Backend – eksport PDF, audyt, RODO, worker | **Rola:** FULL
- **Cel:** Regulamin, polityka prywatności, umowa powierzenia i instrukcja usunięcia konta są dostępne pod stałymi adresami, a link z e-maila resetu otwiera aplikację (lub stronę zapasową).
- **Zakres:** Strony HTML w stylu Nocturne: regulamin, polityka prywatności, umowa powierzenia (wersjonowane, treść od prawnika – Q-10), formularz/instrukcja wniosku o usunięcie konta, `apple-app-site-association`, `assetlinks.json`, strona zapasowa „Otwórz w aplikacji”; publikacja do S3/CloudFront w CI; **Poza zakresem:** Treść prawna (prawnik)
- **Zależności:** [IMP-012](01-fundamenty-i-devops.md#imp-012--terraform-s3-eksporty-strona-statyczna-i-cloudfront)
- **Odwołania:** FR-903, FR-106, FR-104, TL-39, TL-22, [TC-E2E-ORG-006](../03-test-plans/03-testy-e2e.md#tc-e2e-org-006), [TC-E2E-ORG-033](../03-test-plans/03-testy-e2e.md#tc-e2e-org-033)
- **Kroki:**
  1. Utwórz `apps/site/` ze stronami HTML w stylu Nocturne (tokeny z `@polechamp/tokens` wyeksportowane do CSS): `/regulamin/v1`, `/prywatnosc/v1`, `/umowa-powierzenia/v1`, `/usun-konto` (instrukcja i formularz kontaktu dla wymogu Google Play).
  2. Wstaw treści prawne jako Markdown od prawnika (Q-10) renderowany skryptem `apps/site/build.ts` z numerem wersji i datą.
  3. Dodaj `/.well-known/apple-app-site-association` (ścieżki `/reset*`, `/pair*`) i `/.well-known/assetlinks.json` (SHA-256 certyfikatu z EAS).
  4. Dodaj stronę zapasową `/reset` z przyciskiem „Otwórz w aplikacji” (`polechamp://reset?token=…`) i linkami do sklepów.
  5. Dodaj workflow `site.yml`: build, `aws s3 sync` do bucketu `site`, unieważnienie CloudFront; adresy stron podaj w `GET /v1/app-config`.
  6. Dopisz lub uruchom przypadki TC-E2E-ORG-006, TC-E2E-ORG-033 w API (Vitest) i aplikacji (Jest/Maestro); nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-179: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] Linki z `GET /app-config` działają; link resetu otwiera aplikację na iOS i Androidzie
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 5 h (M) | **Ryzyko:** niskie


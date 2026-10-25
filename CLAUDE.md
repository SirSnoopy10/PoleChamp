# PoleChamp – instrukcje dla Claude

Aplikacja do turniejów pole dance: organizator (telefon) + sędzia (tablet, offline-first). Monorepo pnpm + Turborepo.
Dokumentacja: `docs/` (start: `docs/README.md`). Plany zadań: `docs/04-implementation-plans/` (IMP-NNN).

## Sposób pracy
- Realizuj plany po kolei; po zakończeniu planu (epiku): lint + typecheck + testy → commit → następny plan.
- Czytaj z planów i dokumentów tylko potrzebne sekcje (Grep / Read z offset), nie całe pliki.
- Nie uruchamiaj `pnpm format` w trakcie pracy – formatuje lint-staged przy commicie.
- Edytuj przez Edit/Write; nie pisz skryptów w heredoc (problemy z ucieczkami znaków).
- Kod, komentarze, komunikaty i commity po polsku. Commity: Conventional Commits, `feat: IMP-140…143 …`, linie ≤ 100 znaków.

## Polecenia
- `pnpm build | typecheck | test | lint` – całe repo (turbo).
- `pnpm --filter @polechamp/api test:int` – testy integracyjne API (Testcontainers: postgres:18, valkey:8, s3mock; wymaga Dockera – Docker Desktop: `%LOCALAPPDATA%ProgramsDockerDesktop`).
- `pnpm --filter @polechamp/api test:pdf` – regresja wizualna i wydajność PDF.
- Lokalnie: `docker compose up -d`, potem kroki w `apps/api/README.md`.

## Struktura
- `packages/scoring` – silnik punktacji (liczby całkowite: dziesiąte/setne), 100% pokrycia.
- `packages/contracts` – schematy zod, katalog błędów, zdarzenia WS, tabela tras `src/openapi/routes.ts` (OpenAPI).
- `packages/tokens`, `packages/i18n` – design system Nocturne, teksty PL (przestrzeń `pdf` – PDF i CSV).
- `apps/site` – strona statyczna (dokumenty prawne, `/reset`, `/pair`, `.well-known`); `pnpm --filter @polechamp/site build` → `public/`.
- `apps/api` – NestJS 12 + Fastify, Drizzle. Migracje SQL ręcznie w `apps/api/migrations/NNNN_*.sql` (dopisz wersję w `test/integration/migrations.test.ts`); schemat zapytań `src/db/schema.ts` musi zgadzać się z bazą (test schema-parity).
- Moduły: `modules/auth`, `modules/organizer` (turnieje, kategorie, starty, sędziowie), `modules/devices` (parowanie, sesje sędziów), `modules/sync` (migawka, `sync/changes`, `sync/push` + handlery mutacji, `SheetWriter`), `modules/rejected`, `modules/results` (kalkulator, przeliczanie, rankingi), `modules/scoring` (oceny dla organizatora, arkusze sędziego), `modules/realtime` (Socket.IO `/rt`, publikator outboxu, `COMMAND_EVENTS`), `modules/audit` (zapis + `GET audit-log`), `modules/exports` (PDF/CSV, S3). Worker: `src/worker/` (kolejki, retencja); CLI operatora: `src/cli/operator.ts`.
- Zapytania w transakcji kolejno (`inSequence` z `src/db/sequence.ts`), nie `Promise.all` na jednym kliencie `pg`.

## Konwencje API
- Każda trasa: `@Public()` albo `@Auth('org'|'device'|'judge')` (domyślnie odmowa); walidacja `@Body(zod(Schema))`.
- Zasoby organizatora przez `OwnershipRepository` (cudzy → 404); mutacje w `withTx`, z `AuditService.record`, `ChangeLogService.append`, `DomainEventService.emit`.
- Błędy: `throw new DomainError('KOD')` (katalog w contracts). `one(rows)` zamiast `rows[0]!`.
- Nowa trasa: dodaj do `routes.ts` w contracts i usuń z `PENDING_EPICS` w `test/integration/routes-contract.test.ts`.
- Testy integracyjne: helpery w `apps/api/test/support/` (`startApp`, `client`, `organizer`, `pairTablet`, `insertSheet`, `runningCategory`/`mutation`/`push` w `push.ts`, `listen`/`connect` w `realtime.ts`); nazwa testu zawiera ID przypadku TC-…
- `sync.hint` emituje `ChangeLogService.append` (raz na transakcję) – nie emituj go ręcznie; nowe zdarzenie komendy dopisz do `COMMAND_EVENTS`.

## Stan
- Zrobione: EP-01 (IMP-001…006), EP-02 (bez IMP-067 i parytetu mobile), EP-03, EP-04 (IMP-140…156), EP-05 (IMP-170…179, backend; `PENDING_EPICS` puste).
- Następne: EP-06 – mobile: fundamenty i design system (`docs/04-implementation-plans/06-mobile-fundamenty-i-design-system.md`, IMP-200…220), od IMP-200; razem z IMP-067 (klient API z OpenAPI).
- Odstępstwa EP-05 od planu:
  - Worker: `WorkerRuntime` (`src/worker/runtime.ts`) + kontekst Nest `WorkerModule` (`src/worker/bootstrap.ts`, `startWorker`); kolejka `email` zachowuje własne opcje producenta (5 prób). DLQ = kolejka `dead-letter` + log `alert: worker_dead_letter`. Metryki EMF jako logi JSON (brak CloudWatch); `pdf_render_ms` tylko w `PdfProcessor.renderMs`.
  - S3 lokalnie: obrazy MinIO zniknęły z Docker Hub → `adobe/s3mock:4.10.0` (compose: port 9090; Testcontainers). Wygaśnięcie 7 dni = tag `expires=7d` + reguła cyklu życia bucketu (Terraform, IMP-012 – niezrobione); SSE-KMS tylko przy `S3_KMS_KEY_ID`.
  - `ExportStatus` API: `PENDING/READY/FAILED` (kontrakt), w bazie `QUEUED/RUNNING/DONE/FAILED`; wygasły `DONE` → `FAILED`. Ponowne użycie pliku wymaga tych samych `results_versions` **i** `results_hash` (hash obejmuje nazwiska – anonimizacja wymusza nowy plik). `jobId` BullMQ = `exportId`.
  - PDF: Inter ze statycznych TTF `@expo-google-fonts/inter` (WOFF2 z `inter-ui` nie działa w fontkit); brak logo (tekst „POLECHAMP”). Stopka turnieju: status turnieju i najwyższa `resultsVersion`; wersja każdej kategorii pod jej tytułem. Pseudonim „Zawodniczka nr {nr}” liczony w `ResultsReadService` z `athlete.pseudonymized_at` (UI = PDF = CSV).
  - Regresja wizualna: `pnpm --filter @polechamp/api test:pdf` (pdf-to-img + odiff, wzorce w `test/pdf/__baselines__`, aktualizacja `pdf:update-baselines`), poza `pnpm test`; wzorce wygenerowane na Windows – na runnerze Linux trzeba je odświeżyć. FX-MAX syntetyczny (`test/pdf/fixtures.ts`).
  - CSV (IMP-174): `format` w `ExportCreate` + kolumna `export_job.format` (migracja 0010); część mobilna (przycisk w SCR-ORG-12) – w EP-07.
  - Audyt: `AuditEntry` z `before/after/deviceId`, `id` = bigserial jako tekst, `limit` w zapytaniu; `entityType` eksportu = `export_job`. Filtr sekretów audytu (`/pin/i`) wycina np. `allowOfflinePinLogin` – w audycie używaj innych nazw kluczy (`offlineLogin`).
  - Retencja (`src/worker/retention/retention.job.ts`): rola `pc_retention` (`RETENTION_DATABASE_URL`, hasło `PC_RETENTION_PASSWORD` w `migrate`), `RETENTION_PSEUDONYMIZE_MONTHS` (TC-RODO-002 mówi `RETENTION_MONTHS`). `now` jako parametr zamiast `vi.setSystemTime`. Pseudonimizacja + czyszczenie PII + `change_log` w jednej transakcji na turniej; czyszczenie `change_log` biegnie przed pseudonimizacją. `processed_mutation` bez `tournament_id` – wiek 30 dni i turniej urządzenia. Outbox `domain_event` opublikowany > 7 dni też usuwany. Twarde usunięcie konta kasuje jego turnieje (`purge_account`, SECURITY DEFINER), audyt `ACCOUNT_PURGED`. Migracja 0011: `drop_old_audit_partitions`, `purge_account`, `scrub_athlete_pii`.
  - Anonimizacja: `EntriesService.anonymize` w `modules/organizer` (nie `modules/entries`); brak dekoratora `@AllowWhenFinished` – wyjątek RODO przez pominięcie `assertTournamentWritable`.
  - CLI: `node:util parseArgs` zamiast `nest-commander`; `actor_id` operatora = deterministyczny UUID z `--operator` (`operatorId`), nazwa w `after.operator`. `person:export --athlete-id` dopasowuje inne turnieje organizatora po imieniu i nazwisku. `run-cli.sh` z nazwami zasobów do uzupełnienia po Terraformie.
  - Strona (`apps/site`): ścieżki jak w `GET /v1/app-config` (`/usuniecie-konta`, nie `/usun-konto`; `/pomoc`), dokumenty `/{slug}/v1`. Treści prawne to szkielety ze znacznikiem „PROJEKT” (Q-10); `APPLE_APP_ID`, `ANDROID_PACKAGE`, `ANDROID_CERT_SHA256`, linki sklepów – wartości zastępcze do czasu kont Apple/Google/EAS. `site.yml` publikuje dopiero po ustawieniu zmiennych AWS (`SITE_BUCKET` itd.). Część E2E TC-E2E-ORG-006/033 (aplikacja) – w EP-07.
  - Nowe zależności API: `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `pdfmake` 0.3.12, `@expo-google-fonts/inter` 0.4.2, `@polechamp/tokens`; dev: `@types/pdfmake`, `pdf-parse`, `pdf-to-img`, `odiff-bin`.
- Odstępstwa EP-04 od planu:
  - `GET /sync/snapshot` także tokenem sędziego (`DEV|JDG`, TC-AUTHZ-056); `pinVerifier = null`, gdy logowanie offline wyłączone, sędzia nieaktywny lub PIN zablokowany.
  - TL-04: HKDF z pustą solą, `aad = UTF-8(judgeId) ‖ uint32 BE(pinVersion)` – opis w `packages/test-fixtures/vectors/pin-wrap.json`.
  - `change_log`: blokada wiersza turnieju przed przydziałem `seq` (kursor bez luk); kursor = `tournament.change_seq`. `CURSOR_EXPIRED`: kursor > `change_seq` albo turniej zakończony > 30 dni. Pull tokenem sędziego obejmuje też `DEVICE:{id}` (jeden kursor tabletu); zmiany tej samej encji na stronie scalone; encja usunięta → `op = D`.
  - `sync/push`: blokada turnieju na mutację (kolejność turniej → kategoria), `lock_timeout` 2 s, po pierwszym `RETRY` reszta paczki też `RETRY` (FIFO); zapisany `REJECTED` wraca jako `REJECTED`. Błędy not (krok, zakres) i obce kategoria/start → `SCHEMA_MISMATCH`; nieznany sędzia → `JUDGE_SESSION_INVALID`. Sesja offline ze starym PIN-em zapisywana jako zamknięta (`REVOKED`). `CLOCK_SKEW` od 5 min (TC-AUDIT-003, nie 10).
  - Kontrakty rozszerzone: `RejectedSubmission.newerSheetExists`, `ResultsResponse.unplayed`, `OrgScoreSheet.revisionCount`, `EntryScoreSheets`, treść w `ScoreSheetRevision`. `GET /tournaments/{id}/results` zrobione w EP-04.
  - Start kategorii i odblokowanie przeliczają wyniki (wersja 1 przy starcie); usunięcie startu loguje przesunięte starty.
  - Brak infrastruktury metryk: `sync_rejected` jako log, `ws_connections` → `RealtimeGateway.connections`, `event_publisher_lag_s` → `EventPublisher.lagSeconds()`.
  - Nowe zależności API: `@nestjs/websockets`, `@nestjs/platform-socket.io` 12.2.0, `socket.io` 4.8, `@socket.io/redis-adapter` 8.3, `socket.io-client` (dev). Zmienna `EVENT_PUBLISHER_ENABLED` (domyślnie `true`).
  - Pełna macierz TC-AUTHZ (6 kontekstów × endpoint) nie jest testem tabelarycznym – wiersze EP-04 sprawdzane w testach endpointów.
- Środowisko: Windows, Node 24 lokalnie (CI: 26), pnpm 12, Docker Desktop. Sporadycznie worker Vitest pada natywnie (0xC0000409) – ponowny przebieg przechodzi.

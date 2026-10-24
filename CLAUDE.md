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
- `pnpm --filter @polechamp/api test:int` – testy integracyjne API (Testcontainers: postgres:18, valkey:8; wymaga Dockera).
- Lokalnie: `docker compose up -d`, potem kroki w `apps/api/README.md`.

## Struktura
- `packages/scoring` – silnik punktacji (liczby całkowite: dziesiąte/setne), 100% pokrycia.
- `packages/contracts` – schematy zod, katalog błędów, zdarzenia WS, tabela tras `src/openapi/routes.ts` (OpenAPI).
- `packages/tokens`, `packages/i18n` – design system Nocturne, teksty PL.
- `apps/api` – NestJS 12 + Fastify, Drizzle. Migracje SQL ręcznie w `apps/api/migrations/NNNN_*.sql` (dopisz wersję w `test/integration/migrations.test.ts`); schemat zapytań `src/db/schema.ts` musi zgadzać się z bazą (test schema-parity).
- Moduły: `modules/auth`, `modules/organizer` (turnieje, kategorie, starty, sędziowie), `modules/devices` (parowanie, sesje sędziów), `modules/sync` (migawka, `sync/changes`, `sync/push` + handlery mutacji, `SheetWriter`), `modules/rejected`, `modules/results` (kalkulator, przeliczanie, rankingi), `modules/scoring` (oceny dla organizatora, arkusze sędziego), `modules/realtime` (Socket.IO `/rt`, publikator outboxu, `COMMAND_EVENTS`), `modules/audit`.
- Zapytania w transakcji kolejno (`inSequence` z `src/db/sequence.ts`), nie `Promise.all` na jednym kliencie `pg`.

## Konwencje API
- Każda trasa: `@Public()` albo `@Auth('org'|'device'|'judge')` (domyślnie odmowa); walidacja `@Body(zod(Schema))`.
- Zasoby organizatora przez `OwnershipRepository` (cudzy → 404); mutacje w `withTx`, z `AuditService.record`, `ChangeLogService.append`, `DomainEventService.emit`.
- Błędy: `throw new DomainError('KOD')` (katalog w contracts). `one(rows)` zamiast `rows[0]!`.
- Nowa trasa: dodaj do `routes.ts` w contracts i usuń z `PENDING_EPICS` w `test/integration/routes-contract.test.ts`.
- Testy integracyjne: helpery w `apps/api/test/support/` (`startApp`, `client`, `organizer`, `pairTablet`, `insertSheet`, `runningCategory`/`mutation`/`push` w `push.ts`, `listen`/`connect` w `realtime.ts`); nazwa testu zawiera ID przypadku TC-…
- `sync.hint` emituje `ChangeLogService.append` (raz na transakcję) – nie emituj go ręcznie; nowe zdarzenie komendy dopisz do `COMMAND_EVENTS`.

## Stan
- Zrobione: EP-01 (IMP-001…006), EP-02 (bez IMP-067 i parytetu mobile), EP-03, EP-04 (IMP-140…156).
- Następne: EP-05 (eksport PDF, dziennik audytu, anonimizacja RODO, zadanie retencji – w tym `change_log`, `processed_mutation`, `EventPublisher.purgePublished`); trasy z `PENDING_EPICS`.
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

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
- Moduły: `modules/auth`, `modules/organizer` (turnieje, kategorie, starty, sędziowie), `modules/devices` (parowanie, sesje sędziów), `modules/results`, `modules/audit`.

## Konwencje API
- Każda trasa: `@Public()` albo `@Auth('org'|'device'|'judge')` (domyślnie odmowa); walidacja `@Body(zod(Schema))`.
- Zasoby organizatora przez `OwnershipRepository` (cudzy → 404); mutacje w `withTx`, z `AuditService.record`, `ChangeLogService.append`, `DomainEventService.emit`.
- Błędy: `throw new DomainError('KOD')` (katalog w contracts). `one(rows)` zamiast `rows[0]!`.
- Nowa trasa: dodaj do `routes.ts` w contracts i usuń z `PENDING_EPICS` w `test/integration/routes-contract.test.ts`.
- Testy integracyjne: helpery w `apps/api/test/support/` (`startApp`, `client`, `organizer`, `pairTablet`, `insertSheet`); nazwa testu zawiera ID przypadku TC-…

## Stan
- Zrobione: EP-01 (IMP-001…006), EP-02 (bez IMP-067 i parytetu mobile), EP-03, EP-04 IMP-140…143.
- Następne: EP-04 od IMP-144 (migawka, sync/changes, sync/push, odrzucenia, wyniki, realtime).
- Środowisko: Windows, Node 24 lokalnie (CI: 26), pnpm 12, Docker Desktop.

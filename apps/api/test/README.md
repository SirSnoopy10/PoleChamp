# Testy API

| Polecenie | Zakres |
|---|---|
| `pnpm --filter @polechamp/api test` | jednostkowe (`test/unit`) |
| `pnpm --filter @polechamp/api test:int` | integracyjne (`test/integration`, `test/authz`, `test/contract`) – wymaga Dockera |
| `pnpm --filter @polechamp/api test:pdf` | regresja wizualna i wydajność PDF |

## Harness integracyjny (IMP-451)

- `test/setup/containers.ts` – global setup: PostgreSQL 18, Valkey 8, S3Mock (Testcontainers), migracje i role (`pc_app`, `pc_retention`) **raz na przebieg**; adresy przez `inject(...)`.
- `test/support/app.ts` – `startApp()` (Nest + Fastify, żądania przez `inject`), `testEnv()`.
- `test/setup/isolation.ts` – `truncateAll()` (`TRUNCATE … RESTART IDENTITY CASCADE` dla plików liczących wiersze globalnie), `freezeAppClock()` (podmienia tylko `Date`), `backdate()` (cofanie kolumn czasu w bazie – baza używa `now()`, bez funkcji `app_now()`).
- `test/setup/tokens.ts` – `authWorld(call)`: tokeny kontekstów TC-AUTHZ (brak, organizator-właściciel, inny organizator, urządzenie turnieju, urządzenie innego turnieju, urządzenie unieważnione, sędzia, sędzia innego turnieju).
- `test/setup/rt-client.ts` – klient Socket.IO `/rt` z `waitForEvent(name, predicate, timeout)`.
- Dane: `@polechamp/test-fixtures` (seed prototypu, FX-*, fabryki), helpery scenariuszy w `test/support/` (`organizer`, `pairTablet`, `judgeLogin`, `push`, `insertSheet`).

Izolacja domyślna: każdy plik tworzy własne konto i turnieje (pliki biegną kolejno, `fileParallelism: false`); Valkey czyści `flushValkey()`. Nazwa testu zawiera ID przypadku (`TC-…`), raport JUnit: `reports/int.xml`.

## Lokalnie i w CI

1. Uruchom Docker Desktop (Windows: `%LOCALAPPDATA%\Programs\DockerDesktop`).
2. `pnpm --filter @polechamp/api test:int` (pierwszy przebieg pobiera obrazy).
3. CI: job `integration` w `.github/workflows/pr.yml` (runner z Dockerem); budżet przebiegu < 10 min.

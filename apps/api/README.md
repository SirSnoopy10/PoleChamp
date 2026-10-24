# @polechamp/api

Backend PoleChamp: NestJS 12 na Fastify 5, PostgreSQL 18 (Drizzle), Valkey 8, BullMQ ([ADR-002](../../docs/01-architecture/adr/ADR-002-backend-nestjs-postgresql.md)).

## Wymagania

- Node.js ≥ 24 (docelowo 26 LTS, `.nvmrc`), pnpm 12, Docker (Compose i Testcontainers).

## Uruchomienie lokalne (IMP-006)

```bash
docker compose up -d                      # PostgreSQL, Valkey, MinIO, Mailpit
cp apps/api/.env.example apps/api/.env
pnpm --filter @polechamp/api build
pnpm --filter @polechamp/api dev-keys     # wklej wypisane JWT_KEYS i PIN_FINGERPRINT_KEY do .env
pnpm --filter @polechamp/api migrate      # role, migracje SQL, uprawnienia
pnpm --filter @polechamp/api dev          # API: http://localhost:3000, health: /health/ready
pnpm --filter @polechamp/api start:worker # kolejka e-maili → Mailpit (http://localhost:8025)
```

| Usługa     | Port        | Uwagi                                                                            |
| ---------- | ----------- | -------------------------------------------------------------------------------- |
| API        | 3000        | prefiks `/v1`, `/health/live`, `/health/ready`                                   |
| PostgreSQL | 5432        | aplikacja: rola `pc_app`; migracje: `postgres` lokalnie, `pc_migrator` w chmurze |
| Valkey     | 6379        | limity zapytań, kolejki BullMQ                                                   |
| MinIO      | 9000 / 9001 | bucket `exports` (PDF – EP-05)                                                   |
| Mailpit    | 1025 / 8025 | e-maile z kodami i resetem hasła                                                 |

## Testy

```bash
pnpm --filter @polechamp/api test        # jednostkowe (bez Dockera)
pnpm --filter @polechamp/api test:int    # integracyjne: Testcontainers (postgres:18, valkey/valkey:8)
```

## Zmienne środowiskowe

Pełna lista z walidacją: [src/config/env.ts](src/config/env.ts); przykłady: [.env.example](.env.example). Start z niepoprawną konfiguracją kończy się listą błędów.

## Migracje

SQL w [migrations/](migrations/) (przeglądane w PR, `NNNN_opis.sql`); schemat zapytań Drizzle w [src/db/schema.ts](src/db/schema.ts) – zgodność z bazą sprawdza `test/integration/schema-parity.test.ts`. Zasada expand/contract: migracja musi działać z poprzednią wersją API (wdrożenie bez przestoju); usunięcie kolumny dopiero w kolejnym wydaniu po wycofaniu jej użycia.

## Obraz Docker (IMP-005)

```bash
docker build -f apps/api/Dockerfile -t polechamp-api .
```

Jeden obraz: API (`node dist/main.js`), worker (`node dist/worker.js`), CLI (`node dist/cli.js migrate`). Użytkownik nie-root (UID 10001), `HEALTHCHECK` na `/health/live`.

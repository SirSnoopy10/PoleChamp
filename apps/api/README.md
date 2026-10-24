# @polechamp/api

Backend PoleChamp: NestJS 12 + Fastify, PostgreSQL 18, Valkey ([ADR-002](../../docs/01-architecture/adr/ADR-002-backend-nestjs-postgresql.md)).

> Stan: szkielet monorepo (IMP-001). Serwer HTTP powstaje w IMP-100, środowisko lokalne (Docker Compose, seed) w IMP-006.

## Wymagania

- Node.js ≥ 24 (docelowo 26 LTS, patrz `.nvmrc`), pnpm 12.

## Uruchomienie

```bash
pnpm install
pnpm --filter @polechamp/api build
pnpm --filter @polechamp/api test
```

## Zmienne środowiskowe

Zostaną opisane w `.env.example` w IMP-006 (`DATABASE_URL`, `VALKEY_URL`, `S3_ENDPOINT`, `SMTP_URL`, klucze JWT).

# ADR-002: Backend w Node.js (NestJS) z PostgreSQL

- **Status:** Zaakceptowana ze zmianami przez Tech Leada 23.10.2026 (sekcja „Status: zmieniony” na końcu)
- **Data:** 2026-10-23
- **Powiązane:** [01-przeglad-architektury.md §4.2](../01-przeglad-architektury.md#42-backend-monorepo-appsapi), [02-model-danych.md](../02-model-danych.md), [ADR-003](ADR-003-styl-api-rest-i-websocket.md), [ADR-011](ADR-011-monorepo-i-wspoldzielony-silnik-punktacji.md)

## Kontekst
- Domena jest relacyjna i wymaga twardych ograniczeń: jedna ocena na sędziego i start, unikalne numery startowe w turnieju, przejścia statusów w transakcjach, blokady wierszy przy blokadzie kategorii.
- Wynik oficjalny musi być liczony na serwerze (integralność), tą samą biblioteką co podgląd na tablecie.
- Potrzebne są: niestandardowe uwierzytelnianie (organizator + urządzenie + PIN), WebSocket, zadania w tle (PDF, retencja), idempotencja.

## Decyzja
- **Node.js 26 LTS + NestJS 12** (adapter **Fastify 5**), TypeScript 6 strict (zmiana TL-01 – patrz niżej).
- **PostgreSQL 18** (Amazon RDS), ORM **Drizzle** (schemat w TS, migracje `drizzle-kit` przeglądane w PR), walidacja **zod 4** przez Standard Schema w NestJS 12 (wspólne schematy w `@polechamp/contracts`, [ADR-012](ADR-012-kontrakty-walidacja-i-openapi.md)).
- Kolejki **BullMQ** na Valkey/Redis, realtime **Socket.IO** (szczegóły: [ADR-003](ADR-003-styl-api-rest-i-websocket.md)).
- Architektura modułowa (moduły = obszary domeny), warstwy: kontroler → serwis aplikacyjny (komendy, transakcje) → repozytoria (zawsze z kontekstem turnieju) → baza. Transakcyjny outbox zdarzeń (`domain_event`) i dziennik zmian (`change_log`).
- Jeden obraz Docker, dwa procesy: `api` (HTTP + WS) i `worker` (BullMQ).

## Rozważane alternatywy
| Opcja | Za | Przeciw | Werdykt |
|---|---|---|---|
| **Supabase (Postgres + Auth + Realtime + Edge Functions) + PowerSync** | Szybki start, gotowy realtime i synchronizacja SQLite | Logika domenowa w RLS/SQL i Edge Functions (trudniejsze testy i przeglądy), PIN + parowanie urządzeń wymaga własnych JWT poza standardowym Auth, dwóch dostawców (Supabase + PowerSync) z kosztem zależnym od liczby połączeń, mniejsza kontrola nad regułą „serwer liczy wynik” | Odrzucona – do ponownego rozważenia, gdyby zespół był bardzo mały |
| **Firebase (Firestore + Functions)** | Offline w SDK „z pudełka” | NoSQL: brak ograniczeń relacyjnych i transakcji dla rankingów, reguły bezpieczeństwa dla PIN-ów są trudne, model danych denormalizowany | Odrzucona |
| **Go / Kotlin (Spring Boot)** | Wydajność, typowanie | Brak współdzielenia kodu z aplikacją (silnik punktacji, kontrakty) | Odrzucona |
| **Express / Fastify bez frameworka** | Lżejsze | Brak struktury modułów, guardów i DI – więcej własnego kodu infrastrukturalnego | Odrzucona |
| **Prisma** zamiast Drizzle | Popularny, wygodny | Cięższy runtime, słabsza kontrola SQL (blokady `FOR UPDATE`, typy `NUMERIC`), osobny język schematu | Odrzucona (do akceptacji przez Tech Leada) |

## Konsekwencje
- ➕ Wspólny język z aplikacją, współdzielone kontrakty i silnik punktacji.
- ➕ Pełna kontrola nad regułami domenowymi, testami (Testcontainers) i migracjami.
- ➖ Więcej kodu niż w BaaS (auth, realtime, sync) – oszacowane w planie implementacji Tech Leada.
- ⚠ Ryzyko: wydajność Node przy masowym `sync/push` – mitygacja: paczki ≤ 100 mutacji, każda w krótkiej transakcji, poziome skalowanie ECS, test obciążeniowy k6 (NFR-102).

## Status: zmieniony – weryfikacja Tech Leada (23.10.2026)

Szczegóły i źródła: [98-weryfikacja-tech-leada.md §3](../98-weryfikacja-tech-leada.md#3-potwierdzone-wersje-technologii).

| Element | Było | Jest | Uzasadnienie |
|---|---|---|---|
| Node.js | 24 LTS | **26 LTS** | Node 24 przeszedł 20.10.2026 w fazę Maintenance (koniec 30.04.2028); Node 26 staje się Active LTS 28.10.2026 i ma wsparcie do 30.04.2029, czyli przez cały okres MVP i v1.1. Fallback: Node 24, jeśli moduł natywny (`argon2`) nie ma działającego buildu (N-API – ryzyko niskie) |
| NestJS | 11 | **12.x** (12.2.0 z 23.10.2026) | v12 jest stabilny od września 2026; wprowadza natywną walidację Standard Schema (zod 4 bez adaptera). `nestjs-zod` 5.5 deklaruje zgodność tylko z NestJS 10/11 |
| PostgreSQL | 17 | **18** (RDS 18.x, GA od 14.11.2025) | dłuższe wsparcie, natywne `uuidv7()`, asynchroniczne I/O. Drizzle i `pg` bez zmian protokołu |
| ORM | Drizzle | **Drizzle 0.45.x (potwierdzone)** | pełna kontrola SQL (`FOR UPDATE`/`FOR SHARE`, CTE, partycje), schemat w TS współdzielony z `expo-sqlite`. Drizzle 1.0 jest w fazie RC – migracja jako osobne zadanie po wydaniu stabilnym (warstwa repozytoriów izoluje zmianę). Prisma 7 usunęła silnik w Ruście, ale nadal ma własny język schematu i słabszą kontrolę blokad wierszy; Prisma 8 jest w RC – odrzucona |
| TypeScript | – | **6.0.x** | zgodnie z szablonem Expo SDK 58 i `nest upgrade` v12. TypeScript 7.0 (natywny kompilator, wydany w X 2026) – ocena po potwierdzeniu wsparcia dekoratorów NestJS (`experimentalDecorators`, `emitDecoratorMetadata`) |

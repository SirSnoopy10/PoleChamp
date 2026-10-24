# ADR-011: Monorepo TypeScript ze współdzielonym silnikiem punktacji i kontraktami

- **Status:** Zaakceptowana – potwierdzona przez Tech Leada 23.10.2026 (uzupełnienia na końcu)
- **Data:** 2026-10-23
- **Powiązane:** [01-przeglad-architektury.md §4.3](../01-przeglad-architektury.md#43-biblioteki-współdzielone-monorepo-packages), [ADR-006](ADR-006-model-punktacji-i-agregacji.md), [07-reguly-punktacji.md](../../02-specification/07-reguly-punktacji.md)

## Kontekst
- Ten sam wzór musi dawać identyczne wyniki na tablecie (podgląd „Twój wynik”) i na serwerze (wynik oficjalny).
- Schematy żądań, kody błędów i typy zdarzeń muszą być zgodne między klientem a serwerem. Rozjazd przy trybie offline jest szczególnie kosztowny (odrzucone mutacje).

## Decyzja
- **Monorepo** `pnpm` workspaces + **Turborepo**:
  ```
  apps/mobile        – aplikacja Expo (Organizator + Sędzia)
  apps/api           – NestJS (api + worker)
  packages/scoring   – silnik punktacji (czyste funkcje, zero zależności runtime)
  packages/contracts – schematy zod, OpenAPI 3.1, kody błędów, zdarzenia WS
  packages/tokens    – tokeny Nocturne (TS)
  packages/i18n      – słowniki PL (EN v1.1), reguły liczby mnogiej
  infra/terraform    – infrastruktura
  ```
- `@polechamp/scoring` operuje na liczbach całkowitych (dziesiąte i setne punktu), eksportuje `sheetTotal`, `aggregate`, `rankEntries`, `formatScore`, `maxJudgeScore`. Ma **testy referencyjne** (tabela przypadków z [07-reguly-punktacji.md §6](../../02-specification/07-reguly-punktacji.md#6-przykłady-liczbowe)) oraz testy właściwości (property-based, `fast-check`).
- Wersjonowanie pakietów wewnętrzne (workspace). Zmiana w `scoring` lub `contracts` uruchamia testy obu aplikacji.

## Rozważane alternatywy
| Opcja | Werdykt | Powód |
|---|---|---|
| Osobne repozytoria + publikowane pakiety npm | Odrzucona | Narzut wersjonowania i publikacji przy jednym zespole |
| Liczenie wyłącznie na serwerze (tablet bez podglądu) | Odrzucona | Design wymaga „Twój wynik” na żywo, także offline |
| Nx zamiast Turborepo | Równoważna | Turborepo prostsze. Decyzja Tech Leada |

## Konsekwencje
- ➕ Jedno źródło prawdy dla wzoru i kontraktów. Brak rozjazdu klient/serwer.
- ➖ Konfiguracja Metro (Expo) dla pakietów workspace (symlinki) – znany, rozwiązany problem, ale wymaga uwagi.
- ⚠ Pakiet `scoring` nie może importować niczego zależnego od platformy (Node/RN) – reguła lint `no-restricted-imports`.

## Weryfikacja Tech Leada (23.10.2026)

- **Turborepo** (2.11) zamiast Nx – potwierdzone; pnpm 12 workspaces. Dla `apps/mobile` konfiguracja Metro z `watchFolders` na `packages/*`; jeśli izolowane `node_modules` pnpm sprawią problemy z modułami natywnymi Expo, dopuszczamy `node-linker=hoisted` (decyzja w IMP-201).
- Pakiety budowane do ESM + deklaracji typów (`tsup`), testy Vitest 5; `@polechamp/scoring` bez zależności runtime, reguła `no-restricted-imports` blokuje importy platformowe.
- Kontrakty i walidacja: [ADR-012](ADR-012-kontrakty-walidacja-i-openapi.md). Suma SHA-256 nie jest liczona w `scoring` (zależność platformowa) – pakiet eksportuje funkcję kanonicznej serializacji wyników, a skrót liczy API (`node:crypto`).

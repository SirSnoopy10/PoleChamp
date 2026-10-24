# ADR-012: Kontrakty API – zod 4 jako jedno źródło, walidacja Standard Schema w NestJS 12, OpenAPI 3.1 z `zod-to-openapi`

- **Status:** Zaakceptowana (Tech Lead, 23.10.2026)
- **Data:** 2026-10-23
- **Powiązane:** [ADR-002](ADR-002-backend-nestjs-postgresql.md), [ADR-003](ADR-003-styl-api-rest-i-websocket.md), [ADR-011](ADR-011-monorepo-i-wspoldzielony-silnik-punktacji.md), [03-api.md](../03-api.md), NFR-906, NFR-907, [98-weryfikacja-tech-leada.md](../98-weryfikacja-tech-leada.md) (TL-02)

## Kontekst
- Architekt założył schematy zod w `@polechamp/contracts` i generowanie OpenAPI 3.1, z narzędziem do wyboru przez Tech Leada (`@asteasolutions/zod-to-openapi` albo `nestjs-zod`).
- Backend przechodzi na NestJS 12 (ADR-002, zmiana TL-01). `nestjs-zod` 5.5 (VII 2026) deklaruje w zależnościach równorzędnych tylko `@nestjs/common` 10/11. NestJS 12 ma natomiast wbudowaną walidację **Standard Schema** (opcja `schema` w `@Body()`, `@Query()`, `@Param()`), którą zod 4 implementuje natywnie.
- Te same schematy muszą działać w aplikacji mobilnej (walidacja formularzy, typy odpowiedzi, typy mutacji outboxu) i w workerze (PDF, e-mail).

## Decyzja
1. **Jedno źródło prawdy:** schematy zod 4 w `packages/contracts/src/schemas/**` (żądania, odpowiedzi, mutacje `sync/push`, zdarzenia WS, kody błędów). Pakiet nie zależy od NestJS ani React Native.
2. **Walidacja w API:** natywny mechanizm Standard Schema NestJS 12 (globalnie zarejestrowany pipe + `schema` w dekoratorach). Wszystkie schematy obiektów są `strict()` – nieznane pola dają `VALIDATION_FAILED` / `UNKNOWN_FIELD`. Odpowiedzi w testach integracyjnych są walidowane tymi samymi schematami.
3. **OpenAPI 3.1:** generowany skryptem `pnpm --filter @polechamp/contracts openapi` z rejestru `@asteasolutions/zod-to-openapi` 9.x (zgodny z zod ^4). Każda trasa ma wpis w rejestrze (`registerPath`) z metodą, ścieżką, uprawnieniami (rozszerzenie `x-permissions`), schematami i kodami błędów. Dokument jest artefaktem CI i publikacją dokumentacji (NFR-906).
4. **Zgodność trasy ↔ kontrakt:** test kontraktowy (IMP-102/IMP-452) porównuje listę tras zarejestrowanych w NestJS z rejestrem OpenAPI – brak trasy w którąkolwiek stronę przerywa CI. Zmiany łamiące wykrywa `oasdiff` względem ostatniego wydania (NFR-907).
5. **Klient mobilny:** `openapi-typescript` 7.x generuje typy z dokumentu, `openapi-fetch` 0.17 jest klientem HTTP; formularze używają bezpośrednio schematów zod z `@polechamp/contracts` (te same komunikaty pól – klucze i18n).

## Rozważane alternatywy
| Opcja | Werdykt | Powód |
|---|---|---|
| `nestjs-zod` | Odrzucona | Brak deklarowanej zgodności z NestJS 12; dubluje mechanizm, który NestJS 12 ma natywnie |
| `class-validator` + `@nestjs/swagger` | Odrzucona | Drugi język opisu schematów (klasy z dekoratorami), brak współdzielenia z aplikacją mobilną |
| Natywne `z.toJSONSchema()` zod 4 + ręczny szkielet OpenAPI | Odrzucona | Więcej własnego kodu (ścieżki, parametry, odpowiedzi); `zod-to-openapi` buduje na tym samym mechanizmie |
| tRPC / ts-rest | Odrzucona | Patrz ADR-003 (publiczny kontrakt REST) |

## Konsekwencje
- ➕ Jedno miejsce opisu kontraktu dla API, aplikacji, testów i dokumentacji.
- ➕ Brak zależności od pakietów, które nie nadążają za wersją NestJS.
- ➖ Rejestr ścieżek OpenAPI trzeba utrzymywać ręcznie obok kontrolerów – łagodzi to test zgodności tras (punkt 4).
- ⚠ Ryzyko: zmiany zachowania walidacji Standard Schema w NestJS 12.x – testy kontraktowe w CI przy każdej aktualizacji (Renovate grupuje pakiety `@nestjs/*`).

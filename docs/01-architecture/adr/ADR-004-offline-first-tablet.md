# ADR-004: Offline-first na tablecie sędziego – SQLite + outbox + idempotentne komendy

- **Status:** Zaakceptowana – potwierdzona przez Tech Leada 23.10.2026 (doprecyzowania na końcu)
- **Data:** 2026-10-23
- **Powiązane:** [06-offline-i-synchronizacja.md](../06-offline-i-synchronizacja.md), [ADR-010](ADR-010-blokada-kategorii-a-oceny-offline.md), [NFR-3xx](../../02-specification/08-wymagania-niefunkcjonalne.md)

## Kontekst
- Zawody odbywają się w halach sportowych (np. „Hala Torwar”, „Spodek” w danych prototypu), gdzie Wi-Fi bywa przeciążone, a zasięg LTE słaby. Analiza konkurencji pokazuje, że narzędzia z trybem offline (scoring.dance, ALL10) traktują to jako kluczową cechę ([01-analiza-konkurencji.md](../../00-research/01-analiza-konkurencji.md)).
- Sędzia ocenia 60+ występów dziennie. Każde opóźnienie lub utrata oceny jest krytyczna.
- Arkusz oceny ma jednego autora (sędzia), więc konflikty edycji są rzadkie i dobrze zdefiniowane.

## Decyzja
1. Tryb sędziego jest **offline-first**: UI czyta wyłącznie z lokalnej **SQLite** (`expo-sqlite` + Drizzle). Zatwierdzenie oceny to transakcja lokalna (arkusz + wpis w `outbox`), a dopiero potem toast.
2. **Własny, prosty protokół synchronizacji** (migawka, delta po kursorze, push paczek mutacji) zamiast ogólnego silnika replikacji.
3. **Idempotencja:** `mutationId` (UUIDv7), `scoreSheetId` nadawany na tablecie, `baseRevision` do wykrywania edycji z innego urządzenia.
4. **Serwer rozstrzyga:** przyjmuje lub odrzuca mutacje na podstawie aktualnego stanu (status kategorii, panel, start). Odrzucenia są jawne (kody) i trafiają do organizatora, gdy dotyczą blokady ([ADR-010](ADR-010-blokada-kategorii-a-oceny-offline.md)).
5. Organizator działa **online-first** z cache do odczytu (TanStack Query persist) – bez kolejki zapisów w MVP.

## Rozważane alternatywy
| Opcja | Za | Przeciw | Werdykt |
|---|---|---|---|
| **PowerSync / ElectricSQL** (replikacja Postgres ↔ SQLite) | Gotowa synchronizacja dwukierunkowa | Dodatkowy dostawca/serwis, reguły synchronizacji w osobnym DSL, zapisy i tak trzeba walidować po stronie serwera, koszt | Odrzucona (rozważyć w v2 przy rozbudowie offline organizatora) |
| **WatermelonDB** (sync protocol) | Dojrzałe w RN | Model „pull/push changes” wymusza własny backend i tak; narzut na prostym modelu | Odrzucona |
| **CRDT (Automerge/Yjs)** | Bezkonfliktowe scalanie | Niepotrzebne przy jednym autorze; trudna walidacja reguł domenowych | Odrzucona |
| **Online-only z ponawianiem** | Najprostsze | Nie spełnia wymagania pracy bez sieci | Odrzucona |
| **Lokalny serwer w sali (laptop/RPi)** | Działa bez internetu dla wszystkich urządzeń | Sprzęt i logistyka po stronie organizatora, utrudnione wsparcie | Odrzucona dla MVP (pomysł na v2 dla dużych federacji) |

## Konsekwencje
- ➕ Sędzia nigdy nie czeka na sieć. Odporność na restart aplikacji i utratę zasilania.
- ➕ Prosty, testowalny protokół dopasowany do domeny.
- ➖ Dwa modele danych (serwer i lokalny) do utrzymania oraz migracje SQLite w aplikacji.
- ➖ Organizator offline nie może edytować (świadome ograniczenie MVP).
- ⚠ Ryzyko: rozjazd logiki walidacji klient/serwer – mitygacja: wspólne schematy zod i silnik punktacji, testy kontraktowe.

## Weryfikacja Tech Leada (23.10.2026)

- Trwałość zapisu: WAL + `synchronous = FULL` (+ `fullfsync` na iOS) – w trybie WAL ustawienie `NORMAL` nie chroni przed utratą zasilania, a NFR-302 jej dotyczy. Budżet 100 ms (NFR-103) z fsync do potwierdzenia w spike'u IMP-603 na Galaxy Tab A8 i iPad 9 (kryterium: p95 zatwierdzenia ≤ 100 ms i 0 utraconych ocen w 100 iteracjach `kill -9` oraz 10 twardych wyłączeniach).
- Po starcie aplikacji wpisy outboxu `IN_FLIGHT` wracają do `QUEUED` (TL-20).
- Zakres odrzuceń trafiających do organizatora rozszerzony ([ADR-010](ADR-010-blokada-kategorii-a-oceny-offline.md), TL-13).

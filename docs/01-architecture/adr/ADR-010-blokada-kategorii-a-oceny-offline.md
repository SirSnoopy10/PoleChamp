# ADR-010: Blokada kategorii jest autorytatywna na serwerze – spóźnione oceny offline trafiają do „odrzuconych zgłoszeń”

- **Status:** Zaakceptowana z rozszerzeniem zakresu przez Tech Leada 23.10.2026 (sekcja „Status: zmieniony”); do potwierdzenia przez PO
- **Data:** 2026-10-23
- **Powiązane:** [06-offline-i-synchronizacja.md §6](../06-offline-i-synchronizacja.md#6-blokada-kategorii-a-sędzia-offline), [04-przeplywy-danych.md §7](../04-przeplywy-danych.md#7-zablokowanie-kategorii-z-urządzeniem-offline), FR-309, FR-805, SCR-ORG-18, SCR-ORG-22

## Kontekst
- Organizator klika „Zakończ i zablokuj” (design), a wyniki mają się stać ostateczne.
- Tablet offline może mieć w kolejce oceny wystawione **przed** blokadą, ale dostarczone **po** niej.
- Zasady federacji: po zakończeniu sędziowania wyniki się nie zmieniają ([S3] w [02-reguly-oceniania-w-pole-sport.md §7](../../00-research/02-reguly-oceniania-w-pole-sport.md#7-inne-praktyki-istotne-dla-systemu)).
- Czas na tablecie jest niewiarygodny (może być przestawiony), więc nie można rozstrzygać „czy ocenę wystawiono przed blokadą” na podstawie czasu klienta.

## Decyzja
1. **Zapobieganie:** blokada bez `force` zwraca ostrzeżenia (`LOCK_WARNINGS`): liczba brakujących ocen i tablety z niewysłanymi danymi lub bez kontaktu > 2 min. Organizator decyduje: poczekać lub „Zablokuj mimo to” (SCR-ORG-18).
2. **Autorytet serwera:** po blokadzie każda ocena dla tej kategorii jest odrzucana (`CATEGORY_LOCKED`) **niezależnie od czasu klienta**.
3. **Brak utraty danych:** treść odrzuconej oceny jest zapisywana w `rejected_submission` (status `PENDING`). Organizator dostaje baner i listę (SCR-ORG-22).
4. **Jawna decyzja:** organizator może odblokować kategorię i **przyjąć** zgłoszenie (rewizja oznaczona `actor_type = ORGANIZER`, treść pochodzi od sędziego) albo je **odrzucić**. Ponowna blokada daje nowe wyniki ostateczne i nową sumę kontrolną.
5. Analogicznie dla `TOURNAMENT_FINISHED` (bez możliwości przyjęcia w MVP) i `ENTRY_WITHDRAWN`.

## Rozważane alternatywy
| Opcja | Werdykt | Powód |
|---|---|---|
| Przyjmować oceny z czasem klienta < czas blokady | Odrzucona | Czas klienta niewiarygodny, otwiera furtkę do manipulacji |
| Blokada „miękka” (okno łaski np. 10 min) | Odrzucona | Wyniki „ostateczne” mogłyby się zmienić bez wiedzy organizatora |
| Blokada wymaga zgody wszystkich tabletów | Odrzucona | Rozładowany tablet zablokowałby zakończenie kategorii |
| Ciche odrzucenie (bez zapisu) | Odrzucona | Utrata ocen sędziego, brak przejrzystości |

## Konsekwencje
- ➕ Wyniki ostateczne są stabilne i weryfikowalne (hash). Żadna ocena nie ginie.
- ➖ Dodatkowe ekrany poza designem (SCR-ORG-18, SCR-ORG-22) i stany na tablecie.
- ⚠ Proces operacyjny: organizator powinien przed blokadą sprawdzić listę urządzeń – opisane w onboardingu (zadanie dla PM/README).

## Status: zmieniony – weryfikacja Tech Leada (23.10.2026)

**Rozszerzenie (TL-13):** zasada „żadna ocena nie ginie bez decyzji organizatora” obejmuje wszystkie odrzucenia `SUBMIT_SCORE_SHEET`, których sędzia nie może sam naprawić na tablecie. Do `rejected_submission` trafiają kody: `CATEGORY_LOCKED`, `TOURNAMENT_FINISHED`, `ENTRY_WITHDRAWN` (jak dotąd) oraz `CATEGORY_NOT_STARTED`, `JUDGE_INACTIVE`, `JUDGE_NOT_IN_PANEL`, `PIN_VERSION_OUTDATED`, `JUDGE_SESSION_INVALID` (nowe). Poza `rejected_submission` zostają: `STALE_REVISION` i `SCHEMA_MISMATCH` (rozwiązuje sędzia) oraz `IDEMPOTENCY_KEY_REUSED` (błąd programistyczny, alert).

**Uzasadnienie:** w pierwotnej wersji ocena wystawiona offline przed dezaktywacją sędziego albo przed resetem PIN-u znikała bez śladu w panelu organizatora (była tylko w audycie), co przeczy celowi MVP „zero utraconych ocen”.

**Warunki „Przyjmij”:** kategoria `IN_PROGRESS`, start `ACTIVE`, turniej nie `FINISHED`. Dla `PIN_VERSION_OUTDATED`, `JUDGE_SESSION_INVALID`, `JUDGE_INACTIVE` i `JUDGE_NOT_IN_PANEL` przyjęcie jest świadomą decyzją organizatora (audyt `REJECTED_SUBMISSION_ACCEPTED` z kodem przyczyny). Sędzia nieaktywny z przyjętą oceną wlicza się do `J` tej kategorii (zgodnie z 07-reguly §3.1).

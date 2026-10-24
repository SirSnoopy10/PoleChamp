# Zespół, role i RACI

> Dokument: `05-project-management/07-zespol-role-raci.md` · Project Manager (Agent 3) · Wersja 1.0 · 24.10.2026
> Podstawa: [99-przekazanie-dla-pm §2](../04-implementation-plans/99-przekazanie-dla-pm.md#2-założenia-o-składzie-zespołu-i-czas-trwania), [00-konwencje-i-definition-of-done.md](../04-implementation-plans/00-konwencje-i-definition-of-done.md), [00-strategia-testowania §11](../03-test-plans/00-strategia-testowania.md#11-zarządzanie-defektami), założenia ZAL-05…ZAL-07 ([00-zalozenia](00-zalozenia-planistyczne.md#2-założenia)).

## 1. Skład zespołu (wariant bazowy)

| Rola | Liczba / etat | Okres | Główne odpowiedzialności | Zastępstwo |
|---|---|---|---|---|
| **Właściciel produktu (PO)** | 1 (po stronie zamawiającego, ok. 0,3 etatu) | cały projekt | wizja, priorytety backlogu, decyzje Q-xx, akceptacja demo i kamieni milowych, relacja z organizatorem pilotażowym, decyzja go/no-go | sponsor |
| **Project Manager (PM)** | 1 × 0,5 | 26.10.2026–30.04.2027 (+ v1.1) | plan sprintów, harmonogram, budżet, ryzyka, zależności zewnętrzne, ceremonie, raportowanie, logistyka UAT i pilota | PO (decyzje), TL (plan techniczny) |
| **Tech Lead (TL)** | 1 × 0,5 (poza pojemnością planu) | cały projekt | architektura i ADR, przegląd obszarów krytycznych (`scoring`, `sync`, `auth`, `judge-sessions`), decyzje spike'ów, jakość kodu, wsparcie triage | starszy BE |
| **Backend (BE)** | 2 × 1,0 | SP-01…SP-13 | API NestJS, baza, worker, PDF, RODO, CLI; zadania FULL (ZAL-10); od SP-08 – defekty, wsparcie QA i pentestu (ZAL-12) | drugi BE; TL |
| **Mobile (MOB)** | 2 × 1,0 | SP-01…SP-13 | aplikacja Expo (tryby Organizator i Sędzia), komponenty Nocturne, offline i synchronizacja na tablecie, sklepy; od SP-10 – przygotowanie v1.1 (BL-01) | drugi MOB (sync zawsze w parze) |
| **QA (automatyzacja)** | 1 × 0,5 (SP-02), 1,0 od SP-03 | SP-02…SP-13 | fikstury, harness, E2E Maestro, regresja wizualna, k6, testy ręczne, UAT, raport wydania, triage defektów | TL (przegląd testów), BE (helpery) |
| **DevOps** | 1 × 1,0 (SP-01…SP-03), 0,5 od SP-04 | SP-01…SP-13 | Terraform AWS, CI/CD, EAS, observability, kopie, bezpieczeństwo infrastruktury, uruchomienie produkcji, dyżur | TL (dostęp awaryjny, runbooki) |
| **Projektant** | 1 × 0,6 (SP-01), 0,2 od SP-02 | SP-01…SP-15 | akceptacje Q-08 (IMP-650), zasoby graficzne (IMP-652), wzorce regresji (IMP-653), wpisy w sklepach (IMP-551), projekt G-30 dla v1.1 | – (RP-05) |
| Prawnik (zewnętrzny) | na zlecenie | X 2026 – III 2027 | dokumenty prawne i opinia RODO (Q-10, Q-16) | – |
| Organizator pilotażowy (zewnętrzny) | 1–2 osoby | XI 2026 – IV 2027 | regulamin zawodów, udział w UAT, pilot, informacja zwrotna | organizator zapasowy |
| Sędzia ekspert (zewnętrzny) | 1 | UAT, pilot | ocena reguł punktacji i remisów (Q-01…Q-03) | – |
| Firma pentestowa (zewnętrzna) | – | 15–31.03.2027 | pentest API i aplikacji, retest | – |

## 2. Macierz RACI

**R** – wykonuje, **A** – odpowiada i zatwierdza (jedna osoba), **C** – konsultowany, **I** – informowany.

| Obszar / decyzja | PO | PM | TL | BE | MOB | QA | DevOps | Projektant | Prawnik | Organizator |
|---|---|---|---|---|---|---|---|---|---|---|
| Zakres MVP, priorytety backlogu, zmiany zakresu (CR) | **A** | R | C | I | I | I | I | C | – | C |
| Decyzje biznesowe Q-01…Q-07, Q-09, Q-11, Q-14…Q-18 | **A** | R (termin, analiza wpływu) | C | I | I | I | – | C | C (Q-16) | C (Q-14, Q-15) |
| Plan sprintów, harmonogram, budżet, rejestr ryzyk | C | **A/R** | C | I | I | I | I | I | – | I |
| Architektura, ADR, decyzje spike'ów (EP-14) | I | I | **A** | R | R | C | R | – | – | – |
| Przegląd kodu obszarów krytycznych (scoring, sync, auth, judge-sessions) | – | I | **A** | R | R | C | – | – | – | – |
| Akceptacja ekranów poza designem (Q-08) i wzorców wizualnych | **A** | I | C | I | C | C | – | R | – | – |
| Silnik punktacji `@polechamp/scoring` | I | I | **A** | R | C | R (testy) | – | – | – | C (sędzia ekspert) |
| Synchronizacja offline (outbox, SyncEngine, API sync) | I | I | **A** | R | R | R | – | – | – | – |
| Bezpieczeństwo aplikacji, pentest (IMP-400…408) | I | R (zamówienie) | **A** | R | R | R | R | – | – | – |
| RODO i dokumenty prawne (Q-10) | **A** | R (koordynacja) | C | R (IMP-406) | I | I | – | – | R | I |
| Infrastruktura AWS, CI/CD, EAS, monitoring | I | I | **A** | C | C | C | R | – | – | – |
| Strategia testów, automatyzacja, raport wydania | I | I | **A** | C | C | R | C | – | – | – |
| Triage i priorytety defektów (S1–S4) | C | **A** (kolejność) | R | C | C | R | C | – | – | – |
| Próba generalna (UAT, IMP-464/465) | C | **A** (organizacja) | R | R | R | R | C | I | – | R |
| Decyzja go/no-go (M6) | **A** | R | R | I | I | R | R | I | C | C |
| Wydanie do sklepów (IMP-550…553) | C | **A** | C | – | R | C | C | R (IMP-551) | – | – |
| Uruchomienie produkcji (IMP-555) | I | C | **A** | C | C | C | R | – | – | – |
| Dyżur w dniu zawodów i pilot (IMP-556) | I | **A** | R | R | R | C | R | – | – | R |
| Komunikacja z organizatorem pilotażowym | **A** | R | C | – | – | C | – | – | – | R |
| Dokumentacja PM i `docs/README.md` ([README §8](../README.md#8-utrzymanie-dokumentacji)) | C | **A/R** | C | I | I | I | I | I | – | – |
| Dokumentacja techniczna: architektura, ADR, specyfikacja techniczna, plany testów i implementacji | C | I | **A** | R | R | R | R | R (design system) | – | – |

## 3. Ceremonie

| Ceremonia | Kiedy | Czas | Uczestnicy | Wynik |
|---|---|---|---|---|
| Planowanie sprintu | pierwszy poniedziałek sprintu, 10:00 | 2 h | zespół, PO, PM, TL | cel sprintu, zadania z [planu sprintów](03-plan-sprintow.md) potwierdzone (DoR), obciążenie ≤ 100% |
| Daily | codziennie 9:30 | 15 min | zespół, PM (TL opcjonalnie) | blokery, aktualizacja tablicy |
| Doprecyzowanie backlogu (refinement) | środa w 1. tygodniu sprintu | 1 h | PO, PM, TL, przedstawiciele ról | DoR zadań na kolejny sprint, decyzje Q-xx do pozyskania |
| Przegląd sprintu (demo) | piątek w 2. tygodniu, 11:00 | 1 h | zespół, PO, interesariusze (organizator – od SP-07) | demo z [planu sprintów](03-plan-sprintow.md), akceptacja, status kamienia milowego |
| Przegląd ryzyk i decyzji | po przeglądzie sprintu (co tydzień od SP-10) | 30 min | PO, PM, TL | aktualizacja [rejestru ryzyk](05-rejestr-ryzyk.md) i [decyzji](06-decyzje-i-zaleznosci-zewnetrzne.md) |
| Retrospektywa | piątek w 2. tygodniu, 13:00 | 1 h | zespół, PM | 1–3 działania usprawniające z właścicielem |
| Triage defektów | wtorek i czwartek (codziennie w SP-10…SP-13) | 30 min | TL, QA, PM | wagi S1–S4, kolejność napraw ([00-strategia §11](../03-test-plans/00-strategia-testowania.md#11-zarządzanie-defektami)) |
| Przegląd architektury | czwartek co tydzień | 45 min | TL, BE, MOB, DevOps | decyzje techniczne, nowe ADR/TL |
| Komitet sterujący | ostatni czwartek miesiąca | 45 min | sponsor, PO, PM, TL | budżet, kamienie milowe, ryzyka krytyczne, decyzje eskalowane |
| Przegląd kamienia milowego | data M0…M9 ([02-kamienie-milowe](02-kamienie-milowe.md)) | 1 h | PO, PM, TL, QA | formalne potwierdzenie kryteriów wyjścia |

Zasada dni wolnych: ceremonie przypadające na święto przesuwa się na najbliższy dzień roboczy (np. przegląd SP-04 w środę 23.12.2026, przegląd SP-13 w czwartek 29.04.2027).

## 4. Kanały komunikacji

| Kanał | Przeznaczenie | Odpowiedzi |
|---|---|---|
| `#polechamp-zespol` (komunikator zespołowy) | bieżąca praca, daily asynchronicznie | w godzinach pracy |
| `#polechamp-decyzje` | pytania do PO, rozstrzygnięcia Q-xx (link do [06-decyzje](06-decyzje-i-zaleznosci-zewnetrzne.md#21-rozstrzygnięcia)) | PO – do 2 dni roboczych |
| `#polechamp-ryzyka` | zgłaszanie ryzyk i problemów | PM – do 1 dnia |
| `#polechamp-alerty` | alarmy CloudWatch, Sentry, kanarek, CI na `main` | dyżurny |
| `#polechamp-wydania` | wydania, okna zamrożenia, przegląd w sklepach | DevOps, MOB |
| GitHub Issues / Projects | zadania IMP, defekty (szablon z [00-strategia §11](../03-test-plans/00-strategia-testowania.md#11-zarządzanie-defektami)), PR | wg wagi defektu |
| Repozytorium `docs/` | dokumentacja (źródło prawdy) | wg [README §8](../README.md#8-utrzymanie-dokumentacji) |
| E-mail / spotkanie | prawnik, firma pentestowa, organizator pilotażowy, sklepy | PM koordynuje |
| Telefon dyżurny | dzień zawodów (UAT, pilot) – grafik w `ops/on-call.yaml` (IMP-554) | natychmiast |

Raport statusu: PM publikuje w piątek po przeglądzie sprintu (cel, wykonanie vs plan per rola, kamienie milowe, top 5 ryzyk, decyzje potrzebne w kolejnym sprincie, budżet narastająco).

## 5. Ścieżka eskalacji

1. Problem w zadaniu → osoba wykonująca → TL (techniczny) lub PM (organizacyjny) – w ciągu dnia.
2. Ryzyko kamienia milowego lub decyzja zakresowa → PM → PO (do 2 dni roboczych).
3. Budżet, skład zespołu, termin pilota → PO → komitet sterujący (posiedzenie nadzwyczajne w ciągu tygodnia).
4. Dzień zawodów: sędzia/organizator → dyżurny na miejscu → dyżurny zdalny (decyzja o hotfixie, NFR-905) → TL.

## 6. Definition of Ready i Definition of Done

- **Definition of Ready (zadanie):** [00-konwencje §4](../04-implementation-plans/00-konwencje-i-definition-of-done.md#4-definition-of-ready). Uzupełnienia PM: zadanie ma przypisany sprint i osobę na planowaniu; zależności „†” z [03-plan-sprintow §1](03-plan-sprintow.md#1-zasady-i-metoda) spełnione; zależności zewnętrzne ZZ-xx dostępne.
- **Definition of Done (zadanie):** [00-konwencje §3](../04-implementation-plans/00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done) + punkty DoD z karty zadania.
- **Definition of Done (sprint):** wszystkie zadania sprintu spełniają DoD albo są jawnie przeniesione (z decyzją PM i aktualizacją planu); demo przeprowadzone; brak nowych defektów S1; rejestr ryzyk i decyzji zaktualizowany; obciążenie kolejnego sprintu przeliczone.
- **Definition of Done (wydanie):** kryteria z [00-strategia §8](../03-test-plans/00-strategia-testowania.md#8-kryteria-wejścia-i-wyjścia) („Wydanie 1.0 / pilot”) i lista go/no-go z [09-plan-wydania §2](09-plan-wydania-i-pilotazu.md#2-lista-kontrolna-gono-go).

## 7. Rejestr zmian

| Data | Wersja | Zmiana | Autor |
|---|---|---|---|
| 24.10.2026 | 1.0 | Pierwsza wersja | PM |

# Kamienie milowe

> Dokument: `05-project-management/02-kamienie-milowe.md` · Project Manager (Agent 3) · Wersja 1.0 · 24.10.2026
> Podstawa: [plan sprintów](03-plan-sprintow.md), [harmonogram](04-harmonogram.md), [strategia testowania §8](../03-test-plans/00-strategia-testowania.md#8-kryteria-wejścia-i-wyjścia), [07-uat §4](../03-test-plans/07-uat-proba-generalna.md#4-kryteria-wejścia-i-wyjścia-uat), [02-zakres-mvp §1](../02-specification/02-zakres-mvp.md#1-cel-mvp).
> Kamień milowy jest **osiągnięty**, gdy wszystkie kryteria wyjścia są spełnione i potwierdzone przez właściciela na przeglądzie sprintu. Niespełnione kryterium = decyzja PO: przesunięcie albo świadome przyjęcie z planem naprawy (zapis w rejestrze decyzji).

## 1. Przegląd

| ID | Nazwa | Data docelowa | Sprint | Zadań ukończonych narastająco | h narastająco (bez buforów) | Właściciel |
|---|---|---|---|---|---|---|
| M0 | Start projektu | 2.11.2026 | SP-01 (pierwszy dzień) | 0 | 0 | PM |
| M1 | Fundamenty i decyzje techniczne | 27.11.2026 | koniec SP-02 | 64 / 250 | 424 h | Tech Lead |
| M2 | Rdzeń API i design system | 23.12.2026 | koniec SP-04 | 118 / 250 | 788 h | Tech Lead |
| M3 | Ocenianie end-to-end | 22.01.2027 | koniec SP-06 | 161 / 250 | 1069 h | Tech Lead |
| M4 | Organizator i synchronizacja kompletne | 19.02.2027 | koniec SP-08 | 216 / 250 | 1416 h | PM |
| M5 | Release Candidate 1 | 19.03.2027 | koniec SP-10 | 244 / 250 | 1609 h | QA (lider testów) |
| M6 | Go/no-go po próbie generalnej | 26.03.2027 | SP-11 | 247 / 250 | – | PO |
| M7 | Gotowość pilotażowa | 2.04.2027 | koniec SP-11 | 249 / 250 | 1667 h | DevOps + PM |
| M8 | Pilot przeprowadzony | 30.04.2027 | koniec SP-13 | 250 / 250 | 1679 h | PO |
| M9 | Wersja 1.1 w sklepach | 28.05.2027 | koniec SP-15 | backlog v1.1 | – | PO + Tech Lead |

Numeracja `M0…M9` jest wspólna dla wszystkich dokumentów PM. Daty dla wariantów zespołu B–D – [04-harmonogram §6](04-harmonogram.md#6-warianty-zespołu-i-wpływ-na-daty).

## 2. Kamienie milowe

### M0 – Start projektu

- **Data:** poniedziałek 2.11.2026 (kick-off 10:00) · **Właściciel:** PM
- **Zakres:** przygotowanie organizacyjne w tygodniu 0 (26–30.10.2026); brak zadań IMP.
- **Kryteria wyjścia:**
  - [ ] Zespół wg ZAL-05 podpisany i dostępny od 2.11 (lub plan uzupełnienia z datą – RP-01).
  - [ ] Złożone wnioski: Apple Developer Program (organizacja, D-U-N-S), Google Play Console (organizacja), AWS Organizations, domena `polechamp.app` (ZZ-01…ZZ-04).
  - [ ] Urządzenia referencyjne na miejscu: Galaxy Tab A8, iPad 9, iPhone 12, Pixel 6a (ZZ-07) – potrzebne w spike'ach SP-01.
  - [ ] Umowy z projektantem (0,6 etatu w SP-01) i prawnikiem (ZZ-08, ZZ-09).
  - [ ] Właściciele i terminy pytań Q-01…Q-19 potwierdzone ([06-decyzje](06-decyzje-i-zaleznosci-zewnetrzne.md)).
  - [ ] Repozytorium, kanały komunikacji, tablica zadań z 250 kartami IMP, DoR SP-01 spełniona ([07-zespol §6](07-zespol-role-raci.md#6-definition-of-ready-i-definition-of-done)).

### M1 – Fundamenty i decyzje techniczne

- **Data:** 27.11.2026 (przegląd SP-02) · **Właściciel:** Tech Lead
- **Zakres:** SP-01…SP-02 – 64 zadania (424 h): monorepo, lint, CI na PR (IMP-001…004), Terraform `dev` (IMP-005, 007…012, 014), silnik punktacji (IMP-050…055, 057), kontrakty – szkielet i schematy (IMP-058, 059, 062, 063, 065), tokeny i i18n (IMP-068…070), szkielet API i migracje (IMP-100, 101, 103, 105…107), JWT i limity (IMP-112, 113), sędziowie z PIN-em (IMP-130), szkielet aplikacji i komponenty bazowe (IMP-200…205, 208…210, 213, 219), SQLite i outbox (IMP-350, IMP-353), spike'i IMP-600…603, 605…607, 609, akceptacja projektanta (IMP-650, IMP-652), fikstury i testy właściwości (IMP-450, IMP-056).
- **Kryteria wyjścia:**
  - [ ] Decyzje spike'ów zapisane w kartach (IMP-600, 601, 602, 603, 605, 606, 607, 609), w tym wynik PBKDF2 na Tab A8 (TC-PERF-010: p95 ≤ 1 s albo wniosek o obniżenie iteracji) i ustawienia SQLite (TL-20).
  - [ ] TC-SCORING-001…014 (przykłady P1–P14) i TC-SCORING-027…034 (właściwości) zielone; TC-SCORING-031 (parzystość Node/Hermes) zielony; pokrycie `@polechamp/scoring` 100% (TC-CI-001).
  - [ ] CI na PR ≤ 15 min z regułami TC-I18N-005 i TC-TOKENS-003.
  - [ ] Środowisko `dev` (RDS, Valkey, ECS, ALB) utworzone z Terraform.
  - [ ] Lista decyzji projektanta Q-08 (IMP-650; TC-DESIGN-021 – część projektanta) zaakceptowana przez PO.
  - [ ] Demo SP-02 przyjęte przez PO.

### M2 – Rdzeń API i design system

- **Data:** 23.12.2026 (przegląd SP-04, środa) · **Właściciel:** Tech Lead
- **Zakres:** SP-03…SP-04 – 54 zadania (364 h; narastająco 118): kontrakty i OpenAPI (IMP-060, 061, 064, 066), audyt i outbox zdarzeń (IMP-109), urządzenia i migawka (IMP-140, 141, 144), dziennik zmian i sync push (IMP-145, 146), API turniejów, kategorii, kryteriów i startu (IMP-121…126), CD na `dev` (IMP-016), SES (IMP-013), `Sheet`, formularz i `ScoreSlider` (IMP-206, 207, 309, 310), warstwa API, cache i realtime w aplikacji (IMP-214…216), DevCatalog (IMP-212), Maestro w CI (IMP-454), spike'i IMP-604 i IMP-608. **Ukończone epiki:** EP-02, EP-14.
- **Kryteria wyjścia:**
  - [ ] TC-CONTRACT-001…016 zielone; TC-CI-002 (test zgodności tras + `oasdiff`) w CI; `openapi.json` publikowany (TC-CI-004).
  - [ ] Przypadki TC-API i TC-AUTHZ przypisane w kartach IMP-121…126 i IMP-140…146 zielone na `dev`.
  - [ ] TC-UI-001…030 dla zrealizowanych komponentów zielone; DevCatalog z komponentami Nocturne (TC-DESIGN-023).
  - [ ] Decyzje spike'ów IMP-604 (Socket.IO przez ALB) i IMP-608 (regresja wizualna w CI) zapisane.
  - [ ] Pierwszy pomiar płynności `ScoreSlider` na Tab A8 (wstępnie TC-PERF-004) – wynik w karcie IMP-310.
  - [ ] Wniosek o dostęp produkcyjny SES złożony (IMP-013).

### M3 – Ocenianie end-to-end

- **Data:** 22.01.2027 (przegląd SP-06) · **Właściciel:** Tech Lead
- **Zakres:** SP-05…SP-06 – 43 zadania (281 h; narastająco 161): konto organizatora w API (IMP-114…116, IMP-118), sesje sędziów (IMP-143), SUBMIT_SCORE_SHEET i przeliczenie wyników (IMP-147, IMP-150), blokada i zakończenie (IMP-127, IMP-123), realtime (IMP-154, 155), SyncEngine push (IMP-354), logowanie PIN-em i zatwierdzenie oceny (IMP-304, 305, 313), ekrany organizatora: logowanie, rejestracja, lista, nowy turniej, szczegóły, sędziowie, konto, rama kategorii (IMP-250, 251, 255…257, 261, 273, 277), regresja wizualna (IMP-459), testy nadużyć (IMP-404), dane `staging` (IMP-028). **Ukończone epiki:** EP-01, EP-06.
- **Kryteria wyjścia:**
  - [ ] Demo: sędzia na Tab A8 loguje się PIN-em (online i offline) i zatwierdza ocenę; wynik oficjalny przeliczony na serwerze; organizator widzi szczegóły turnieju.
  - [ ] TC-OUTBOX-001…015 i TC-STATE dla zrealizowanych modułów zielone; TC-INT-001…012 zielone.
  - [ ] Przypadki TC-API/TC-ERR/TC-AUTHZ z kart IMP-127, 143, 146, 147, 150 zielone (blokada z sumą SHA-256, idempotencja push).
  - [ ] TC-SEC dla nadużyć (IMP-404) zielone; brak otwartych defektów S1.
  - [ ] Projektant zatwierdził wzorce regresji wizualnej (IMP-653).

### M4 – Organizator i synchronizacja kompletne

- **Data:** 19.02.2027 (przegląd SP-08) · **Właściciel:** PM (z TL)
- **Zakres:** SP-07…SP-08 – 55 zadań (347 h; narastająco 216): wszystkie ekrany organizatora (EP-07), odrzucone zgłoszenia i wyniki (IMP-149, 151, 152, 156), worker, e-maile, eksporty, PDF, retencja, strona statyczna (EP-05), migawka, pull, wyzwalacze i odrzucenia na tablecie (IMP-351, 352, 355…357), E2E organizatora (IMP-455, 467), testy k6 (IMP-461), CLI operatora (IMP-178), materiały RODO dla prawnika (IMP-406). **Ukończone epiki:** EP-03, EP-04, EP-05, EP-07.
- **Kryteria wyjścia:**
  - [ ] TC-E2E-ORG P1 zielone w przebiegu nocnym (IMP-455, IMP-467).
  - [ ] TC-PDF-001…010, TC-RODO-001…008, TC-AUDIT-001…006 zielone.
  - [ ] Raport k6 (TC-PERF-002, TC-PERF-011) z wynikami bazowymi; plan poprawek w IMP-502.
  - [ ] Demo: ocenianie w trybie samolotowym i synchronizacja po powrocie sieci bez utraty ocen (TC-SYNC P1 z kart IMP-352, 355, 357 – wersja ręczna).
  - [ ] Projekty dokumentów prawnych od prawnika (Q-10) otrzymane; organizator pilotażowy przekazał regulamin zawodów (ZZ-10).

### M5 – Release Candidate 1

- **Data:** 19.03.2027 (przegląd SP-10); zamrożenie funkcji (RC1) 12.03.2027 · **Właściciel:** QA (lider testów) z TL
- **Zakres:** SP-09…SP-10 – 28 zadań (193 h; narastająco 244): ekrany sędziego (EP-08), twardnienie NFR (EP-12), poprawki projektanta (IMP-651), MASVS i deklaracje prywatności (IMP-401, 402, 407), E2E sędziego (część 2), offline i pełnego turnieju (IMP-457, 458, 468, 469; część 1 E2E sędziego – IMP-456 w SP-08), dostępność (IMP-460), urządzenia referencyjne (IMP-463), aktualizacja SDK (IMP-507), sklepy i dystrybucja pilotażowa (IMP-550…553), przygotowanie UAT (IMP-464). **Ukończone epiki:** EP-08, EP-09, EP-12, EP-15.
- **Kryteria wyjścia** (= kryteria wejścia UAT z [07-uat §4](../03-test-plans/07-uat-proba-generalna.md#4-kryteria-wejścia-i-wyjścia-uat)):
  - [ ] Wszystkie przypadki P1 z plików 01–06 planu testów zielone na buildzie RC1.
  - [ ] TC-E2E-FULL-001, 002, 003, 005 zielone (dwa urządzenia); TC-E2E-JDG P1 zielone.
  - [ ] TC-SYNC P1 (24 przypadki): 0 utraconych i 0 zduplikowanych ocen, kill -9 100/100 ([00-strategia §8](../03-test-plans/00-strategia-testowania.md#8-kryteria-wejścia-i-wyjścia)).
  - [ ] TC-PERF-001, 003, 004, 010 spełnione na Tab A8 i iPad 9; TC-COMPAT-001, 002, 005, 006 zielone; TC-A11Y P1 zielone.
  - [ ] TC-DESIGN-016…022 zaakceptowane przez projektanta.
  - [ ] Brak otwartych defektów S1/S2.
  - [ ] RC1 dostępny w TestFlight i testach zamkniętych Google Play; uczestnicy UAT mają aplikację (IMP-552).
  - [ ] Scenariusz, dane, ankiety i kartki kontrolne próby generalnej gotowe (IMP-464); potwierdzona lista uczestników (ZZ-10, ZZ-11).

### M6 – Go/no-go po próbie generalnej

- **Data:** 26.03.2027 (próba generalna: sobota 20.03.2027) · **Właściciel:** PO (decyzja), PM (przygotowanie)
- **Zakres:** IMP-465 (próba i poprawki), IMP-466 (regres przed wydaniem), IMP-408 (pentest i poprawki).
- **Kryteria wyjścia:**
  - [ ] TC-UAT-001…016 wykonane; kryteria wyjścia UAT spełnione: 0 utraconych/zduplikowanych ocen, wynik kategorii ≤ 2 min, PDF czytelny, mediana wprowadzenia oceny ≤ 45 s, ≥ 80% sędziów ocenia formularz jako „łatwy” (TC-UAT-015).
  - [ ] Wyniki zgodne z przeliczeniem ręcznym (TC-UAT-016).
  - [ ] Raport pentestu: brak otwartych podatności krytycznych i wysokich (IMP-408).
  - [ ] Raport regresu IMP-466; brak S1/S2, S3 z planem.
  - [ ] Ostateczne dokumenty prawne (regulamin, polityka prywatności, umowa powierzenia) zatwierdzone (Q-10).
  - [ ] Lista kontrolna go/no-go podpisana ([09-plan-wydania §2](09-plan-wydania-i-pilotazu.md#2-lista-kontrolna-gono-go)).

### M7 – Gotowość pilotażowa

- **Data:** 2.04.2027 (przegląd SP-11) · **Właściciel:** DevOps + PM
- **Zakres:** IMP-555 (uruchomienie produkcji), IMP-557 (instrukcja dla organizatorów); IMP-554 (lista kontrolna i runbook – SP-05).
- **Kryteria wyjścia:**
  - [ ] Produkcja uruchomiona: smoke test zielony, kanarek aktywny (TC-REL-001), alarmy przetestowane (TC-REL-009), blokada wdrożeń w oknie turnieju (TC-REL-010), TLS i HSTS (TC-SEC-003).
  - [ ] SES poza sandboxem (e-maile weryfikacyjne dochodzą na produkcji).
  - [ ] Buildy 1.0 zgłoszone do App Store i Google Play (1.04.2027); notatki dla recenzentów i turniej do przeglądu (IMP-553).
  - [ ] Grafik dyżurów (`ops/on-call.yaml`) i runbook dnia zawodów przejrzane z zespołem.
  - [ ] Instrukcja dla organizatorów zaakceptowana przez PO i organizatora pilotażowego (IMP-557).
  - [ ] Zakres 1.0 zamrożony; konto organizatora pilotażowego na produkcji.

### M8 – Pilot przeprowadzony

- **Data:** 30.04.2027 (pilot: sobota 24.04.2027) · **Właściciel:** PO
- **Zakres:** IMP-556 (wsparcie pilota, metryki, raport).
- **Kryteria wyjścia** (kryterium sukcesu MVP – [02-zakres-mvp §1](../02-specification/02-zakres-mvp.md#1-cel-mvp)):
  - [ ] Turniej pilotażowy (6–10 kategorii, 60–120 startów, 3–5 sędziów) przeprowadzony w całości w PoleChamp.
  - [ ] 0 utraconych ocen; wyniki kategorii dostępne ≤ 2 min po ostatniej ocenie; PDF wysłany klubom w dniu zawodów.
  - [ ] Crash-free sessions ≥ 99,5% (sędzia) i ≥ 99,0% (organizator) – TC-REL-006, NFR-308.
  - [ ] Raport po pilocie z metrykami ([09-plan-wydania §6](09-plan-wydania-i-pilotazu.md#6-metryki-sukcesu-pilotażu)) i retrospektywa z organizatorem.
  - [ ] Backlog v1.1 uporządkowany i zatwierdzony przez PO ([10-backlog](10-backlog-po-pilocie.md)).

### M9 – Wersja 1.1 w sklepach

- **Data:** 28.05.2027 (cel Q-18: „przed VI 2027”; twardy limit wewnętrzny 31.07.2027) · **Właściciel:** PO + Tech Lead
- **Zakres:** BL-01 (pionowy układ panelu sędziego – ADR-013, G-30), poprawki S1/S2/S3 z pilota, pozycje v1.1 wybrane przez PO na przeglądzie M8.
- **Kryteria wyjścia:**
  - [ ] Panel sędziego działa w orientacji pionowej i przy zmianie rozmiaru okna (TC-COMPAT-005, TC-COMPAT-006 rozszerzone o układ pionowy); akceptacja projektanta.
  - [ ] Build z target API 37 (gdy dostępne SDK) przechodzi regres E2E P1 – gotowość na wymóg Google Play z ok. 31.08.2027 (RT-07).
  - [ ] v1.1 zatwierdzona w App Store i Google Play.

## 3. Rejestr zmian

| Data | Wersja | Zmiana | Autor |
|---|---|---|---|
| 24.10.2026 | 1.0 | Pierwsza wersja | PM |

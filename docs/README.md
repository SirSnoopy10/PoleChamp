# PoleChamp – dokumentacja projektu

> Dokument: `docs/README.md` · Project Manager (Agent 3) · Wersja 1.0 · 24.10.2026
> Punkt wejścia do całej dokumentacji: opis produktu, spis treści, kolejność czytania, konwencje identyfikatorów, kluczowe liczby i zasady utrzymania.

## 1. Produkt i stan dokumentacji

**PoleChamp** to aplikacja mobilna do zarządzania turniejami pole dance i oceniania występów. **Organizator** na telefonie zakłada turniej, kategorie, kryteria i kary, listy startowe i sędziów, paruje tablety i śledzi ranking na żywo; **sędzia** na tablecie loguje się PIN-em i ocenia występy suwakami – także bez internetu (offline-first z synchronizacją); wyniki są liczone wspólnym silnikiem punktacji, a PDF z wynikami jest generowany na serwerze. Stos: React Native / Expo SDK 58 (jedna aplikacja, dwa tryby), NestJS 12 + PostgreSQL 18 na AWS eu-central-1 ([ADR-001…013](01-architecture/adr/)).

**Stan na 24.10.2026: etap planowania – kodu aplikacji jeszcze nie ma.** Dokumentację przygotowali kolejno: Architekt (research, architektura, specyfikacja), Tech Lead (weryfikacja, plany testów i implementacji) oraz Project Manager (plan realizacji i kontrola spójności). Start realizacji: **poniedziałek 2.11.2026**.

## 2. Kluczowe liczby

| Pozycja | Wartość | Źródło |
|---|---|---|
| Wymagania funkcjonalne w MVP / user stories / NFR | 80 FR (z 82) / 55 US / 68 NFR | [03-wymagania-funkcjonalne](02-specification/03-wymagania-funkcjonalne.md), [04-user-stories](02-specification/04-user-stories.md), [08-wymagania-niefunkcjonalne](02-specification/08-wymagania-niefunkcjonalne.md) |
| Ekrany MVP | 35 (SCR-ORG-00…22, SCR-JDG-00…10, SCR-SYS-01; SCR-PUB-01 w v2) | [03-analiza-designu §2](00-research/03-analiza-designu.md#2-inwentarz-ekranów-i-stanów) |
| Decyzje architektoniczne | 13 ADR, 56 pozycji rejestru TL | [adr/](01-architecture/adr/), [98-weryfikacja §6](01-architecture/98-weryfikacja-tech-leada.md#6-rejestr-niespójności-luk-i-decyzji-tl-nn) |
| Przypadki testowe | **703 TC** (P1 480, P2 163, P3 53, P4 7) | [00-strategia-testowania §2](03-test-plans/00-strategia-testowania.md#2-struktura-planu-testów) |
| Zadania implementacyjne | **250 IMP** w 15 epikach | [91-indeks-zadan](04-implementation-plans/91-indeks-zadan.md) |
| Szacunek | **1679 h** bez buforów; **2308 h** z buforem ryzyka (328 h) i narzutem 15% (301 h) | [99-przekazanie-dla-pm §1](04-implementation-plans/99-przekazanie-dla-pm.md#1-suma-szacunków) |
| Ścieżka krytyczna (nieograniczone zasoby) | 167 h, 21 zadań | [90-graf-zaleznosci §3](04-implementation-plans/90-graf-zaleznosci.md#3-ścieżka-krytyczna) |
| Sprinty MVP | **13 sprintów 2-tygodniowych** SP-01…SP-13 (2.11.2026–30.04.2027) + SP-14…SP-15 (v1.1) | [03-plan-sprintow](05-project-management/03-plan-sprintow.md) |
| Zespół (wariant bazowy) | 2 BE, 2 MOB, 1 QA, DevOps 1,0 → 0,5, projektant 0,6 → 0,2, TL 0,5, PM 0,5, PO | [07-zespol-role-raci](05-project-management/07-zespol-role-raci.md) |
| Budżet MVP (szacunek) | ok. 1,16 mln PLN netto bazowo; **1,28 mln PLN** z rezerwą 10% (stawki – założenia) | [08-budzet](05-project-management/08-budzet.md) |

**Kamienie milowe** ([02-kamienie-milowe](05-project-management/02-kamienie-milowe.md)):

| M0 | M1 | M2 | M3 | M4 | M5 | M6 | M7 | M8 | M9 |
|---|---|---|---|---|---|---|---|---|---|
| Start | Fundamenty | Rdzeń API i design system | Ocenianie end-to-end | Organizator i sync | RC1 | Go/no-go | **Gotowość pilotażowa** | **Pilot przeprowadzony** | v1.1 w sklepach |
| 2.11.2026 | 27.11.2026 | 23.12.2026 | 22.01.2027 | 19.02.2027 | 19.03.2027 | 26.03.2027 | **2.04.2027** | **30.04.2027** | 28.05.2027 |

Próba generalna (UAT): **sobota 20.03.2027**; pilotażowy turniej: **sobota 24.04.2027** (oba terminy – założenia do potwierdzenia z organizatorem pilotażowym; [ZAL-13, ZAL-14](05-project-management/00-zalozenia-planistyczne.md#2-założenia)).

## 3. Kolejność czytania

**Ogólna (nowa osoba w projekcie, ok. 3–4 h):**
1. Ten plik.
2. [02-specification/02-zakres-mvp.md](02-specification/02-zakres-mvp.md) – co budujemy i czego nie.
3. [02-specification/01-role-i-persony.md](02-specification/01-role-i-persony.md) i [10-glosariusz.md](02-specification/10-glosariusz.md) – kto i jakim językiem.
4. Prototyp `design/PoleChamp v2.dc.html` (§5) – jak to wygląda.
5. [01-architecture/01-przeglad-architektury.md](01-architecture/01-przeglad-architektury.md) i [98-weryfikacja-tech-leada.md](01-architecture/98-weryfikacja-tech-leada.md) – jak to działa i co zmienił Tech Lead.
6. [05-project-management/01-roadmapa.md](05-project-management/01-roadmapa.md) i [02-kamienie-milowe.md](05-project-management/02-kamienie-milowe.md) – kiedy.
7. Dokumenty swojej roli (poniżej).

| Rola | Ścieżka czytania |
|---|---|
| **PO / interesariusz** | [02-zakres-mvp](02-specification/02-zakres-mvp.md) → [01-roadmapa](05-project-management/01-roadmapa.md) → [02-kamienie-milowe](05-project-management/02-kamienie-milowe.md) → [06-decyzje](05-project-management/06-decyzje-i-zaleznosci-zewnetrzne.md) (pytania Q-xx z terminami) → [05-rejestr-ryzyk](05-project-management/05-rejestr-ryzyk.md) → [08-budzet](05-project-management/08-budzet.md) → [09-plan-wydania-i-pilotazu](05-project-management/09-plan-wydania-i-pilotazu.md) → [07-reguly-punktacji](02-specification/07-reguly-punktacji.md) |
| **Deweloper BE** | [01-przeglad-architektury](01-architecture/01-przeglad-architektury.md) → [02-model-danych](01-architecture/02-model-danych.md) → [03-api](01-architecture/03-api.md) → [04-przeplywy-danych](01-architecture/04-przeplywy-danych.md) → [05-bezpieczenstwo](01-architecture/05-bezpieczenstwo.md) → [06-offline-i-synchronizacja](01-architecture/06-offline-i-synchronizacja.md) → ADR-002, 003, 005, 006, 008, 009, 010, 011, 012 → [07-reguly-punktacji](02-specification/07-reguly-punktacji.md) → [00-konwencje](04-implementation-plans/00-konwencje-i-definition-of-done.md) → EP-02…EP-05, EP-10 → [02-testy-integracyjne-api](03-test-plans/02-testy-integracyjne-api.md) → [03-plan-sprintow](05-project-management/03-plan-sprintow.md) |
| **Deweloper mobile** | [01-przeglad-architektury](01-architecture/01-przeglad-architektury.md) → ADR-001, 004, 005, 011, 013 → [06-offline-i-synchronizacja](01-architecture/06-offline-i-synchronizacja.md) → [05-ekrany-organizatora](02-specification/05-ekrany-organizatora.md), [06-ekrany-sedziego](02-specification/06-ekrany-sedziego.md) → [09-design-system](02-specification/09-design-system.md) → [03-analiza-designu](00-research/03-analiza-designu.md) + prototyp → [00-konwencje](04-implementation-plans/00-konwencje-i-definition-of-done.md) → EP-06…EP-09, EP-12, EP-14 → [01-testy-jednostkowe](03-test-plans/01-testy-jednostkowe.md), [04-testy-offline](03-test-plans/04-testy-offline-i-synchronizacji.md) → [03-plan-sprintow](05-project-management/03-plan-sprintow.md) |
| **QA** | [00-strategia-testowania](03-test-plans/00-strategia-testowania.md) → pliki 01–08 planu testów → [09-macierz-sledzenia](03-test-plans/09-macierz-sledzenia.md) → [08-wymagania-niefunkcjonalne](02-specification/08-wymagania-niefunkcjonalne.md) → [04-user-stories](02-specification/04-user-stories.md) → [EP-11](04-implementation-plans/11-qa-i-automatyzacja-testow.md) → [07-uat-proba-generalna](03-test-plans/07-uat-proba-generalna.md) → [09-plan-wydania-i-pilotazu](05-project-management/09-plan-wydania-i-pilotazu.md) |
| **Projektant** | [03-analiza-designu](00-research/03-analiza-designu.md) (luki G-xx, uwagi UI-xx) → [09-design-system](02-specification/09-design-system.md) → [05-ekrany-organizatora](02-specification/05-ekrany-organizatora.md), [06-ekrany-sedziego](02-specification/06-ekrany-sedziego.md) (ekrany poza designem – Q-08) → [ADR-013](01-architecture/adr/ADR-013-orientacja-i-rozmiar-okna-tabletu.md) → [EP-15](04-implementation-plans/15-design-i-akceptacje.md) → [06-testy-zgodnosci-z-designem](03-test-plans/06-testy-zgodnosci-z-designem.md) → [06-decyzje](05-project-management/06-decyzje-i-zaleznosci-zewnetrzne.md) (Q-03, Q-06…Q-08) |
| **DevOps** | [01-przeglad-architektury](01-architecture/01-przeglad-architektury.md) → ADR-007, ADR-011 → [05-bezpieczenstwo](01-architecture/05-bezpieczenstwo.md) → [98-weryfikacja §5](01-architecture/98-weryfikacja-tech-leada.md#5-zgrubny-koszt-środowisk-aws) (koszty AWS) → [EP-01](04-implementation-plans/01-fundamenty-i-devops.md), [EP-13](04-implementation-plans/13-wydanie.md) → [05-testy-niefunkcjonalne](03-test-plans/05-testy-niefunkcjonalne.md) (REL, SEC, PERF) → [09-plan-wydania-i-pilotazu](05-project-management/09-plan-wydania-i-pilotazu.md) |
| **PM** | [99-przekazanie-dla-pm](04-implementation-plans/99-przekazanie-dla-pm.md) → [91-indeks-zadan](04-implementation-plans/91-indeks-zadan.md) → [90-graf-zaleznosci](04-implementation-plans/90-graf-zaleznosci.md) → cały katalog [05-project-management](05-project-management/00-zalozenia-planistyczne.md) → [99-raport-spojnosci](05-project-management/99-raport-spojnosci.md) |

## 4. Spis treści

### 4.1 `00-research/` – research

| Plik | Opis |
|---|---|
| [01-analiza-konkurencji.md](00-research/01-analiza-konkurencji.md) | Porównanie systemów do zawodów i sędziowania (z URL-ami źródeł S1…S35), luki rynkowe i rekomendacje. |
| [02-reguly-oceniania-w-pole-sport.md](00-research/02-reguly-oceniania-w-pole-sport.md) | Reguły oceniania w pole sport (IPSF, POSA) i sportach pokrewnych jako tło dla modelu punktacji. |
| [03-analiza-designu.md](00-research/03-analiza-designu.md) | Inwentarz prototypu v2: ekrany SCR, nawigacja, komponenty, tokeny Nocturne, uwagi UI-xx, dane przykładowe i luki G-xx. |

### 4.2 `01-architecture/` – architektura

| Plik | Opis |
|---|---|
| [01-przeglad-architektury.md](01-architecture/01-przeglad-architektury.md) | Cel systemu, diagramy C4 (kontekst, kontenery, komponenty), stos technologiczny, środowiska i decyzje D-AR. |
| [02-model-danych.md](01-architecture/02-model-danych.md) | Encje i atrybuty, diagram ER, indeksy, reguły integralności INT-xx, cykle życia statusów, lokalna baza tabletu. |
| [03-api.md](01-architecture/03-api.md) | Kontrakt REST (OpenAPI 3.1), katalog kodów błędów, uprawnienia, synchronizacja i kanał realtime Socket.IO. |
| [04-przeplywy-danych.md](01-architecture/04-przeplywy-danych.md) | Diagramy sekwencji kluczowych scenariuszy (parowanie, PIN, ocena offline, blokada, wyniki). |
| [05-bezpieczenstwo.md](01-architecture/05-bezpieczenstwo.md) | Model zagrożeń, uwierzytelnianie, macierz uprawnień, RODO (retencja, pseudonimizacja), audyt. |
| [06-offline-i-synchronizacja.md](01-architecture/06-offline-i-synchronizacja.md) | SQLite, outbox, idempotentne mutacje, rozstrzyganie konfliktów, wskaźniki stanu i testy offline. |
| [98-weryfikacja-tech-leada.md](01-architecture/98-weryfikacja-tech-leada.md) | Weryfikacja Tech Leada: potwierdzone wersje, rejestr TL-01…TL-56, nowe pytania Q-15…Q-19, koszty AWS. |
| [99-przekazanie-dla-tech-leada.md](01-architecture/99-przekazanie-dla-tech-leada.md) | Przekazanie Architekta: mapa dokumentów, konwencje ID, kluczowe decyzje, pytania Q-01…Q-14, ryzyka R-01…R-12. |
| [adr/ADR-001-aplikacja-mobilna-react-native-expo.md](01-architecture/adr/ADR-001-aplikacja-mobilna-react-native-expo.md) | Jedna aplikacja React Native (Expo) z trybami Organizator i Sędzia. |
| [adr/ADR-002-backend-nestjs-postgresql.md](01-architecture/adr/ADR-002-backend-nestjs-postgresql.md) | Backend NestJS 12 (Node 26 LTS) z PostgreSQL 18 i Drizzle. |
| [adr/ADR-003-styl-api-rest-i-websocket.md](01-architecture/adr/ADR-003-styl-api-rest-i-websocket.md) | REST/JSON z OpenAPI 3.1 i Socket.IO jako kanał powiadomień. |
| [adr/ADR-004-offline-first-tablet.md](01-architecture/adr/ADR-004-offline-first-tablet.md) | Offline-first na tablecie: SQLite, outbox i idempotentne komendy. |
| [adr/ADR-005-uwierzytelnianie-sedziego-pin.md](01-architecture/adr/ADR-005-uwierzytelnianie-sedziego-pin.md) | Parowanie urządzenia i 4-cyfrowy PIN z weryfikacją offline (schemat TL-04). |
| [adr/ADR-006-model-punktacji-i-agregacji.md](01-architecture/adr/ADR-006-model-punktacji-i-agregacji.md) | Suma ważona per sędzia, średnia, arytmetyka stałoprzecinkowa i reguły remisów. |
| [adr/ADR-007-hosting-aws-eu.md](01-architecture/adr/ADR-007-hosting-aws-eu.md) | Hosting AWS eu-central-1, Terraform, GitHub Actions i EAS. |
| [adr/ADR-008-uwierzytelnianie-organizatora.md](01-architecture/adr/ADR-008-uwierzytelnianie-organizatora.md) | Własne uwierzytelnianie organizatora: Argon2id, JWT ES256 i rotowany refresh token. |
| [adr/ADR-009-eksport-pdf-po-stronie-serwera.md](01-architecture/adr/ADR-009-eksport-pdf-po-stronie-serwera.md) | PDF generowany na serwerze (pdfmake, Inter) z wersją i sumą kontrolną wyników. |
| [adr/ADR-010-blokada-kategorii-a-oceny-offline.md](01-architecture/adr/ADR-010-blokada-kategorii-a-oceny-offline.md) | Blokada kategorii autorytatywna na serwerze; spóźnione oceny trafiają do odrzuconych zgłoszeń. |
| [adr/ADR-011-monorepo-i-wspoldzielony-silnik-punktacji.md](01-architecture/adr/ADR-011-monorepo-i-wspoldzielony-silnik-punktacji.md) | Monorepo pnpm + Turborepo ze wspólnym silnikiem punktacji i kontraktami. |
| [adr/ADR-012-kontrakty-walidacja-i-openapi.md](01-architecture/adr/ADR-012-kontrakty-walidacja-i-openapi.md) | Kontrakty zod 4, walidacja Standard Schema w NestJS 12 i OpenAPI z `zod-to-openapi`. |
| [adr/ADR-013-orientacja-i-rozmiar-okna-tabletu.md](01-architecture/adr/ADR-013-orientacja-i-rozmiar-okna-tabletu.md) | Układ poziomy z nakładką w MVP; układ pionowy obowiązkowo przed VIII 2027 (Google Play). |

### 4.3 `02-specification/` – specyfikacja

| Plik | Opis |
|---|---|
| [01-role-i-persony.md](02-specification/01-role-i-persony.md) | Role (organizator, sędzia, operator) i persony z potrzebami i kontekstem użycia. |
| [02-zakres-mvp.md](02-specification/02-zakres-mvp.md) | Cel i kryterium sukcesu MVP, zakres MoSCoW dla MVP, v1.1 i v2, funkcje świadomie pominięte. |
| [03-wymagania-funkcjonalne.md](02-specification/03-wymagania-funkcjonalne.md) | Wymagania FR-101…FR-905 z priorytetami i powiązaniami z ekranami i US. |
| [04-user-stories.md](02-specification/04-user-stories.md) | Historie użytkownika US-001…US-091 z kryteriami Given/When/Then (epiki E1…E9). |
| [05-ekrany-organizatora.md](02-specification/05-ekrany-organizatora.md) | Specyfikacja ekranów organizatora SCR-ORG-00…22 (teksty wiążące, stany, walidacje). |
| [06-ekrany-sedziego.md](02-specification/06-ekrany-sedziego.md) | Specyfikacja ekranów sędziego SCR-JDG-00…10 i zasad trybu tabletu. |
| [07-reguly-punktacji.md](02-specification/07-reguly-punktacji.md) | Wzory punktacji, agregacja, zaokrąglenia, remisy, przykłady P1–P14 i decyzje D-SC-01…12. |
| [08-wymagania-niefunkcjonalne.md](02-specification/08-wymagania-niefunkcjonalne.md) | Wymagania NFR-101…NFR-907 (wydajność, dostępność, offline, bezpieczeństwo, RODO, platformy, utrzymanie). |
| [09-design-system.md](02-specification/09-design-system.md) | Przeniesienie design systemu Nocturne do React Native: tokeny, komponenty, checklista PR. |
| [10-glosariusz.md](02-specification/10-glosariusz.md) | Słownik pojęć domenowych z odwzorowaniem na encje i statusy. |

### 4.4 `03-test-plans/` – plany testów (generowane przez TL)

| Plik | Opis |
|---|---|
| [00-strategia-testowania.md](03-test-plans/00-strategia-testowania.md) | Strategia: piramida, narzędzia, fikstury FX-*, urządzenia, kryteria wejścia/wyjścia, progi pokrycia, defekty S1–S4, TC-CI. |
| [01-testy-jednostkowe.md](03-test-plans/01-testy-jednostkowe.md) | 135 przypadków jednostkowych i komponentowych (punktacja, kontrakty, i18n, tokeny, outbox, stan, UI). |
| [02-testy-integracyjne-api.md](03-test-plans/02-testy-integracyjne-api.md) | 261 przypadków integracyjnych API (endpointy, kody błędów, macierz uprawnień, INT, realtime, PDF, audyt, RODO). |
| [03-testy-e2e.md](03-test-plans/03-testy-e2e.md) | 70 scenariuszy E2E organizatora, sędziego i pełnego turnieju na dwóch urządzeniach. |
| [04-testy-offline-i-synchronizacji.md](03-test-plans/04-testy-offline-i-synchronizacji.md) | 40 przypadków utraty sieci, kill -9, duplikatów, blokady offline i kolejności zdarzeń. |
| [05-testy-niefunkcjonalne.md](03-test-plans/05-testy-niefunkcjonalne.md) | 81 przypadków wydajności, dostępności, bezpieczeństwa, odporności, kompatybilności i lokalizacji. |
| [06-testy-zgodnosci-z-designem.md](03-test-plans/06-testy-zgodnosci-z-designem.md) | 26 przypadków zgodności z designem (UI-01…15, regresja wizualna, akceptacja projektanta). |
| [07-uat-proba-generalna.md](03-test-plans/07-uat-proba-generalna.md) | Próba generalna z prawdziwymi sędziami: scenariusz dnia, kryteria wejścia/wyjścia, 16 przypadków UAT. |
| [08-przypadki-brzegowe.md](03-test-plans/08-przypadki-brzegowe.md) | 70 przypadków brzegowych. |
| [09-macierz-sledzenia.md](03-test-plans/09-macierz-sledzenia.md) | Macierz śledzenia FR/US/NFR/SCR/UI/INT → TC i IMP z raportem braków pokrycia. |

### 4.5 `04-implementation-plans/` – plan implementacji (generowany przez TL)

| Plik | Opis |
|---|---|
| [00-konwencje-i-definition-of-done.md](04-implementation-plans/00-konwencje-i-definition-of-done.md) | Pliki planu, skala szacowania, globalna DoD i DoR, struktura monorepo, gałęzie, nazewnictwo, środowiska. |
| [01-fundamenty-i-devops.md](04-implementation-plans/01-fundamenty-i-devops.md) | EP-01: monorepo, CI/CD, Terraform AWS, observability, EAS (29 zadań). |
| [02-pakiety-wspoldzielone.md](04-implementation-plans/02-pakiety-wspoldzielone.md) | EP-02: `@polechamp/scoring`, `contracts`, `tokens`, `i18n` (21 zadań). |
| [03-backend-konto-i-konfiguracja-turnieju.md](04-implementation-plans/03-backend-konto-i-konfiguracja-turnieju.md) | EP-03: szkielet API, baza, konto organizatora, turnieje, kategorie, zawodniczki, sędziowie (33 zadania). |
| [04-backend-urzadzenia-ocenianie-synchronizacja.md](04-implementation-plans/04-backend-urzadzenia-ocenianie-synchronizacja.md) | EP-04: parowanie, sesje PIN, migawka, sync push/pull, oceny, odrzucenia, wyniki, realtime (17 zadań). |
| [05-backend-eksport-audyt-rodo.md](04-implementation-plans/05-backend-eksport-audyt-rodo.md) | EP-05: worker, PDF, CSV, audyt, retencja, CLI operatora, strona statyczna (10 zadań). |
| [06-mobile-fundamenty-i-design-system.md](04-implementation-plans/06-mobile-fundamenty-i-design-system.md) | EP-06: szkielet Expo, komponenty Nocturne, klient API, cache, realtime (21 zadań). |
| [07-mobile-ekrany-organizatora.md](04-implementation-plans/07-mobile-ekrany-organizatora.md) | EP-07: ekrany SCR-ORG-00…22 (29 zadań). |
| [08-mobile-ekrany-sedziego.md](04-implementation-plans/08-mobile-ekrany-sedziego.md) | EP-08: ekrany SCR-JDG-00…10 (20 zadań). |
| [09-mobile-offline-i-synchronizacja.md](04-implementation-plans/09-mobile-offline-i-synchronizacja.md) | EP-09: SQLite, outbox, SyncEngine (10 zadań). |
| [10-bezpieczenstwo-i-rodo.md](04-implementation-plans/10-bezpieczenstwo-i-rodo.md) | EP-10: ASVS/MASVS, twardnienie, testy nadużyć, pentest, materiały RODO (10 zadań). |
| [11-qa-i-automatyzacja-testow.md](04-implementation-plans/11-qa-i-automatyzacja-testow.md) | EP-11: fikstury, harness, macierz uprawnień, Maestro, regresja wizualna, k6, UAT (20 zadań). |
| [12-twardnienie-nfr.md](04-implementation-plans/12-twardnienie-nfr.md) | EP-12: wydajność, bateria, skalowanie tekstu, aktualizacja SDK (8 zadań). |
| [13-wydanie.md](04-implementation-plans/13-wydanie.md) | EP-13: sklepy, przegląd, produkcja, pilotaż, instrukcja dla organizatorów (8 zadań). |
| [14-spike.md](04-implementation-plans/14-spike.md) | EP-14: spike'i techniczne z kryterium decyzji i limitem czasu (10 zadań). |
| [15-design-i-akceptacje.md](04-implementation-plans/15-design-i-akceptacje.md) | EP-15: akceptacje projektanta i zasoby graficzne (4 zadania). |
| [90-graf-zaleznosci.md](04-implementation-plans/90-graf-zaleznosci.md) | Graf zależności epików i zadań kluczowych, ścieżka krytyczna 167 h. |
| [91-indeks-zadan.md](04-implementation-plans/91-indeks-zadan.md) | Indeks 250 zadań z szacunkami, ryzykiem, zależnościami i pokryciem FR/SCR. |
| [99-przekazanie-dla-pm.md](04-implementation-plans/99-przekazanie-dla-pm.md) | Przekazanie TL dla PM: sumy godzin, założenia zespołu, fazy, ścieżka krytyczna, Q-xx, ryzyka RT, zależności zewnętrzne. |

### 4.6 `05-project-management/` – zarządzanie projektem

| Plik | Opis |
|---|---|
| [00-zalozenia-planistyczne.md](05-project-management/00-zalozenia-planistyczne.md) | Założenia ZAL-01…ZAL-20, model pojemności i metoda planowania (symulacja z ograniczonymi zasobami). |
| [01-roadmapa.md](05-project-management/01-roadmapa.md) | Wersje produktu (MVP, v1.1, v2), fazy F0…F6 z datami, epiki w czasie, Gantt roadmapy. |
| [02-kamienie-milowe.md](05-project-management/02-kamienie-milowe.md) | Kamienie milowe M0…M9 z datami, zakresem, sprawdzalnymi kryteriami wyjścia i właścicielami. |
| [03-plan-sprintow.md](05-project-management/03-plan-sprintow.md) | 13 sprintów z zadaniami IMP per rola, obciążeniem vs pojemnością, demo, ryzykami i wynikiem kontroli zależności. |
| [04-harmonogram.md](05-project-management/04-harmonogram.md) | Kalendarz ze świętami, okna UAT/pentestu/sklepów/pilota, terminy zewnętrzne, Gantt i warianty zespołu. |
| [05-rejestr-ryzyk.md](05-project-management/05-rejestr-ryzyk.md) | Połączony rejestr ryzyk R-01…R-12, RT-01…RT-10 i RP-01…RP-14 z oceną, planami awaryjnymi i wyzwalaczami. |
| [06-decyzje-i-zaleznosci-zewnetrzne.md](05-project-management/06-decyzje-i-zaleznosci-zewnetrzne.md) | Pytania Q-01…Q-19 z terminami decyzji powiązanymi ze sprintami oraz zależności zewnętrzne ZZ-01…ZZ-16. |
| [07-zespol-role-raci.md](05-project-management/07-zespol-role-raci.md) | Skład zespołu, macierz RACI, ceremonie, kanały komunikacji, eskalacja, DoR/DoD. |
| [08-budzet.md](05-project-management/08-budzet.md) | Szacunek kosztów pracy, infrastruktury, usług, urządzeń, pentestu i prawnika z rezerwą (stawki – założenia). |
| [09-plan-wydania-i-pilotazu.md](05-project-management/09-plan-wydania-i-pilotazu.md) | Przebieg wydania 1.0, lista go/no-go, plan próby generalnej, dyżur i plan awaryjny dnia pilota, metryki sukcesu. |
| [10-backlog-po-pilocie.md](05-project-management/10-backlog-po-pilocie.md) | Backlog v1.1 i v2 (BL-xx) z szacunkami i planem etapu 1 v1.1. |
| [99-raport-spojnosci.md](05-project-management/99-raport-spojnosci.md) | Końcowa kontrola spójności dokumentacji: linki, ID, liczby, Mermaid, terminologia (PM-xx). |

## 5. Design i prototyp

- **Katalog `design/` jest nadrzędnym źródłem wyglądu** (nie edytować w ramach dokumentacji):
  - `design/PoleChamp v2.dc.html` – aktualny prototyp (wersja v2; wiążąca dla ekranów SCR-ORG-00…12 i SCR-JDG-00…05),
  - `design/PoleChamp.dc.html` – wcześniejsza wersja prototypu (różnice: [03-analiza-designu §7](00-research/03-analiza-designu.md#7-różnice-v1--v2-istotne-dla-specyfikacji)),
  - `design/_ds/nocturne-…/` – design system Nocturne (tokeny, komponenty),
  - `design/uploads/*.png` – uwagi projektanta z przeglądu (reguły UI-01…UI-15),
  - `design/support.js`, `design/ios-frame.jsx`, `design/pole-spinner.js` – pliki pomocnicze prototypu (ramka urządzenia, animacja tancerki).
- **Uruchomienie lokalne** (z katalogu głównego repozytorium):

  ```
  python -m http.server 8765 --directory design
  ```

  i otwarcie `http://localhost:8765/PoleChamp%20v2.dc.html` w przeglądarce.
- Ekrany poza designem (SCR-SYS-01, SCR-ORG-13…22, SCR-JDG-06…10) są propozycjami do akceptacji projektanta (Q-08, IMP-650 – warsztat 10.11.2026).

## 6. Konwencje identyfikatorów

| Prefiks / format | Znaczenie | Zakres | Gdzie zdefiniowane |
|---|---|---|---|
| `FR-MNN` | wymaganie funkcjonalne (M = moduł 1–9) | FR-101…FR-905 | [03-wymagania-funkcjonalne](02-specification/03-wymagania-funkcjonalne.md) |
| `NFR-MNN` | wymaganie niefunkcjonalne | NFR-101…NFR-907 | [08-wymagania-niefunkcjonalne](02-specification/08-wymagania-niefunkcjonalne.md) |
| `US-NNN` | user story (numeracja blokowa per epik historii E1…E9, np. US-0xx – E1, US-05x i US-06x – E6) | US-001…US-091 | [04-user-stories](02-specification/04-user-stories.md) |
| `E1…E9` | epik user stories (nie mylić z `EP-NN`) | E1…E9 | [04-user-stories](02-specification/04-user-stories.md) |
| `R-ORG`, `R-DEV`, `R-JDG`, `R-HJ`, `R-SEC`, `R-PUB` | rola systemowa (litery – nie mylić z ryzykami `R-NN`) | 6 ról | [01-role-i-persony §1](02-specification/01-role-i-persony.md#1-role-systemowe) |
| `P1…P6` (persony) | persona (nie mylić z przykładami punktacji P1…P14 i priorytetami TC P1…P4) | P1…P6 | [01-role-i-persony §2](02-specification/01-role-i-persony.md#2-persony) |
| `SCR-ORG/JDG/SYS/PUB-NN` | ekran | ORG-00…22, JDG-00…10, SYS-01, PUB-01 | [03-analiza-designu §2](00-research/03-analiza-designu.md#2-inwentarz-ekranów-i-stanów), [05](02-specification/05-ekrany-organizatora.md)/[06-ekrany](02-specification/06-ekrany-sedziego.md) |
| `ADR-NNN` | decyzja architektoniczna | ADR-001…ADR-013 | [adr/](01-architecture/adr/) |
| `UI-NN` | reguła z przeglądu designu | UI-01…UI-15 | [03-analiza-designu §6](00-research/03-analiza-designu.md#6-uwagi-z-przeglądu-designu-uploads) |
| `G-NN` | luka designu | G-01…G-32 | [03-analiza-designu §9](00-research/03-analiza-designu.md#9-luki-i-niejasności-designu--propozycje) |
| `D-SC-NN` | decyzja punktacji | D-SC-01…D-SC-12 | [07-reguly-punktacji §9](02-specification/07-reguly-punktacji.md#9-decyzje-i-odstępstwa-od-prototypu) |
| `P1…P14` | przykład liczbowy punktacji | P1…P14 | [07-reguly-punktacji §6](02-specification/07-reguly-punktacji.md#6-przykłady-liczbowe) |
| `D-AR-NN` | decyzja architektoniczna (skrót) | D-AR-01…D-AR-07 | [01-przeglad-architektury §7](01-architecture/01-przeglad-architektury.md#7-najważniejsze-decyzje-domenowe-skrót) |
| `INT-NN` | reguła integralności danych | INT-01…INT-10 | [02-model-danych §5](01-architecture/02-model-danych.md#5-reguły-integralności-wymuszane-w-serwisie-i-gdzie-to-możliwe-w-bazie) |
| `S1…S35` | źródło researchu | S1…S35 | [01-analiza-konkurencji §8](00-research/01-analiza-konkurencji.md#8-źródła) |
| `Q-NN` | pytanie otwarte (decyzja biznesowa) | Q-01…Q-19 | Q-01…14: [99-przekazanie-dla-tech-leada §5](01-architecture/99-przekazanie-dla-tech-leada.md#5-pytania-otwarte); Q-15…19: [98-weryfikacja §8](01-architecture/98-weryfikacja-tech-leada.md#8-kwestie-otwarte); terminy: [06-decyzje §2](05-project-management/06-decyzje-i-zaleznosci-zewnetrzne.md#2-pytania-otwarte-q-01q-19) |
| `TL-NN` | pozycja rejestru weryfikacji Tech Leada | TL-01…TL-56 | [98-weryfikacja §6](01-architecture/98-weryfikacja-tech-leada.md#6-rejestr-niespójności-luk-i-decyzji-tl-nn) |
| `TC-<OBSZAR>-NNN` | przypadek testowy | 703 TC (obszary w [00-strategia §2.1](03-test-plans/00-strategia-testowania.md#21-konwencje-przypadków-testowych)) | [03-test-plans/](03-test-plans/00-strategia-testowania.md) |
| `P1…P4` | priorytet przypadku testowego (nie mylić z przykładami punktacji) | P1…P4 | [00-strategia §2.2](03-test-plans/00-strategia-testowania.md#22-priorytety-przypadków) |
| `S1…S4` | waga defektu (nie mylić ze źródłami researchu) | S1…S4 | [00-strategia §11](03-test-plans/00-strategia-testowania.md#11-zarządzanie-defektami) |
| `FX-*` | fikstura danych testowych | FX-SEED, FX-MAX, … | [00-strategia §5](03-test-plans/00-strategia-testowania.md#5-dane-testowe-i-fikstury) |
| `IMP-NNN` | zadanie implementacyjne | 250 zadań (IMP-001…IMP-653, numeracja blokowa per epik) | [91-indeks-zadan](04-implementation-plans/91-indeks-zadan.md) |
| `EP-NN` | epik implementacyjny | EP-01…EP-15 | [00-konwencje §1](04-implementation-plans/00-konwencje-i-definition-of-done.md#1-pliki-planu) |
| `R-NN` | ryzyko techniczne Architekta | R-01…R-12 | [99-przekazanie-dla-tech-leada §6](01-architecture/99-przekazanie-dla-tech-leada.md#6-ryzyka-techniczne); rejestr: [05-rejestr-ryzyk](05-project-management/05-rejestr-ryzyk.md) |
| `RT-NN` | ryzyko techniczne po weryfikacji TL | RT-01…RT-10 | [99-przekazanie-dla-pm §6](04-implementation-plans/99-przekazanie-dla-pm.md#6-ryzyka-techniczne-po-weryfikacji) |
| `RP-NN` | ryzyko projektowe PM | RP-01…RP-14 | [05-rejestr-ryzyk §3.3](05-project-management/05-rejestr-ryzyk.md#33-ryzyka-projektowe-rp) |
| `F0…F6` | faza realizacji | F0…F6 | [99-przekazanie-dla-pm §3](04-implementation-plans/99-przekazanie-dla-pm.md#3-sugerowane-fazy-i-kolejność), [01-roadmapa §3](05-project-management/01-roadmapa.md#3-fazy-realizacji-mvp) |
| `M0…M9` | kamień milowy | M0…M9 | [02-kamienie-milowe](05-project-management/02-kamienie-milowe.md) |
| `SP-NN` | sprint 2-tygodniowy | SP-01…SP-15 | [03-plan-sprintow](05-project-management/03-plan-sprintow.md) |
| `ZAL-NN` | założenie planistyczne do potwierdzenia | ZAL-01…ZAL-20 | [00-zalozenia-planistyczne §2](05-project-management/00-zalozenia-planistyczne.md#2-założenia) |
| `ZZ-NN` | zależność zewnętrzna | ZZ-01…ZZ-16 | [06-decyzje §3](05-project-management/06-decyzje-i-zaleznosci-zewnetrzne.md#3-zależności-zewnętrzne) |
| `BL-NN` | pozycja backlogu po pilocie (v1.1, v2) | BL-01…BL-21, BL-30…BL-39 | [10-backlog-po-pilocie](05-project-management/10-backlog-po-pilocie.md) |
| `PM-NN` | znalezisko kontroli spójności PM | PM-01… | [99-raport-spojnosci](05-project-management/99-raport-spojnosci.md) |
| `UPPER_SNAKE` | kod błędu API | np. `CATEGORY_LOCKED` | [03-api §1](01-architecture/03-api.md#1-styl-i-konwencje) |
| `domena.czasownik` | zdarzenie realtime | np. `category.locked` | [03-api §6](01-architecture/03-api.md#6-kanał-realtime-socketio) |

## 7. Słownictwo i statusy

Pojęcia domenowe i statusy (turniej: W przygotowaniu / Trwa / Zakończona; kategoria: W przygotowaniu / Trwa / Zakończona = zablokowana; „nierozegrana”, „wycofana”, „odrzucone zgłoszenie”) – [10-glosariusz.md](02-specification/10-glosariusz.md). Role w zadaniach: BE, MOB, FULL, DEVOPS, QA, DESIGN – [00-konwencje §9](04-implementation-plans/00-konwencje-i-definition-of-done.md#9-format-karty-zadania). Role w projekcie i RACI – [07-zespol-role-raci](05-project-management/07-zespol-role-raci.md).

## 8. Utrzymanie dokumentacji

| Obszar | Właściciel | Kiedy aktualizować | Jak |
|---|---|---|---|
| `00-research/` | PO (z Architektem/TL) | nowe źródła, zmiany w designie | ręcznie; nowe źródła jako kolejne `S-NN` |
| `01-architecture/` i ADR | Tech Lead | każda decyzja architektoniczna lub odstępstwo (DoD pkt 8) | nowy ADR (kolejny numer po ADR-013) lub sekcja „Status: zmieniony”; wpis `TL-NN` w [98-weryfikacja](01-architecture/98-weryfikacja-tech-leada.md) |
| `02-specification/` | PO (treść), projektant (ekrany, design system), TL (spójność) | decyzje Q-xx, akceptacje Q-08, zmiany zakresu | ręcznie; zmiana tekstu wiążącego = aktualizacja ekranu i klucza i18n w tym samym PR |
| `03-test-plans/` i `04-implementation-plans/` | Tech Lead (QA – przypadki testowe) | nowe/zmienione zadania lub TC | pliki są **generowane** ze źródeł TL (generator, karty zadań i TC); zmiany najpierw w źródłach, potem ponowne wygenerowanie i kontrola linków; ręczne poprawki odnotować w [99-raport-spojnosci](05-project-management/99-raport-spojnosci.md) |
| `05-project-management/` | PM | co sprint: plan sprintów, ryzyka, decyzje; co kamień milowy: harmonogram, budżet, roadmapa | ręcznie; [03-plan-sprintow](05-project-management/03-plan-sprintow.md) wygenerowano jednorazowo – kolejne zmiany ręczne z wpisem w §5 tego pliku |
| `docs/README.md` | PM | nowy plik w `docs/`, zmiana kluczowych liczb lub dat | ręcznie, w tym samym PR co zmiana |

**Wersjonowanie i rejestry zmian:** dokumentacja żyje w repozytorium razem z kodem; każda zmiana przez PR z opisem (tytuł `docs: …` lub `IMP-NNN: …`); dokumenty PM mają sekcję „Rejestr zmian” (data, wersja, zmiana, autor), dokumenty TL – rejestr TL-NN, decyzje – ADR i tabela rozstrzygnięć Q-xx ([06-decyzje §2.1](05-project-management/06-decyzje-i-zaleznosci-zewnetrzne.md#21-rozstrzygnięcia)). Przed każdym kamieniem milowym PM uruchamia kontrolę spójności (linki, ID, liczby, diagramy Mermaid) i aktualizuje [99-raport-spojnosci](05-project-management/99-raport-spojnosci.md). Cała dokumentacja jest prowadzona **po polsku**.

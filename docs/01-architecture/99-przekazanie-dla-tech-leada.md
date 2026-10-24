# Przekazanie dla Tech Leada (Agent 2)

> Dokument: `01-architecture/99-przekazanie-dla-tech-leada.md` · Autor: Architekt systemu (Agent 1) · 23.10.2026
> Cel: najważniejsze decyzje, konwencje i otwarte kwestie w jednym miejscu, jako podstawa planu testów i planu implementacji.
> **Aktualizacja Tech Leada (23.10.2026):** wynik weryfikacji, poprawki i nowe decyzje – [98-weryfikacja-tech-leada.md](98-weryfikacja-tech-leada.md). Plan testów: [../03-test-plans/](../03-test-plans/00-strategia-testowania.md), plan implementacji: [../04-implementation-plans/](../04-implementation-plans/00-konwencje-i-definition-of-done.md).

## 1. Mapa dokumentacji

| Obszar | Dokument |
|---|---|
| Research: konkurencja (z URL-ami) | [../00-research/01-analiza-konkurencji.md](../00-research/01-analiza-konkurencji.md) |
| Research: reguły sędziowania | [../00-research/02-reguly-oceniania-w-pole-sport.md](../00-research/02-reguly-oceniania-w-pole-sport.md) |
| Inwentarz designu, uwagi z `uploads/`, luki G-xx | [../00-research/03-analiza-designu.md](../00-research/03-analiza-designu.md) |
| Architektura (C4, stos) | [01-przeglad-architektury.md](01-przeglad-architektury.md) |
| Model danych, ER, stany | [02-model-danych.md](02-model-danych.md) |
| API REST + realtime | [03-api.md](03-api.md) |
| Przepływy (sekwencje) | [04-przeplywy-danych.md](04-przeplywy-danych.md) |
| Bezpieczeństwo, RODO, macierz uprawnień | [05-bezpieczenstwo.md](05-bezpieczenstwo.md) |
| Offline i synchronizacja | [06-offline-i-synchronizacja.md](06-offline-i-synchronizacja.md) |
| Decyzje (ADR-001…013; ADR-012 i ADR-013 dodane przez Tech Leada) | [adr/](adr/) |
| Weryfikacja Tech Leada (TL-01…) | [98-weryfikacja-tech-leada.md](98-weryfikacja-tech-leada.md) |
| Role i persony | [../02-specification/01-role-i-persony.md](../02-specification/01-role-i-persony.md) |
| Zakres MVP / wersje | [../02-specification/02-zakres-mvp.md](../02-specification/02-zakres-mvp.md) |
| Wymagania FR | [../02-specification/03-wymagania-funkcjonalne.md](../02-specification/03-wymagania-funkcjonalne.md) |
| User stories US (Given/When/Then) | [../02-specification/04-user-stories.md](../02-specification/04-user-stories.md) |
| Ekrany organizatora / sędziego | [../02-specification/05-ekrany-organizatora.md](../02-specification/05-ekrany-organizatora.md), [../02-specification/06-ekrany-sedziego.md](../02-specification/06-ekrany-sedziego.md) |
| Reguły punktacji (wzory, przykłady) | [../02-specification/07-reguly-punktacji.md](../02-specification/07-reguly-punktacji.md) |
| Wymagania NFR | [../02-specification/08-wymagania-niefunkcjonalne.md](../02-specification/08-wymagania-niefunkcjonalne.md) |
| Design system (tokeny → RN) | [../02-specification/09-design-system.md](../02-specification/09-design-system.md) |
| Glosariusz | [../02-specification/10-glosariusz.md](../02-specification/10-glosariusz.md) |

## 2. Konwencje identyfikatorów

| Prefiks | Format | Zakres | Gdzie zdefiniowane |
|---|---|---|---|
| `FR-` | `FR-MNN` (M = moduł 1–9) | FR-101 … FR-905 | 03-wymagania-funkcjonalne |
| `NFR-` | `NFR-MNN` (M = grupa 1–9) | NFR-101 … NFR-907 | 08-wymagania-niefunkcjonalne |
| `US-` | `US-NNN` (numeracja blokowa per epik E1–E9) | US-001 … US-091 | 04-user-stories |
| `SCR-` | `SCR-ORG-NN`, `SCR-JDG-NN`, `SCR-SYS-NN`, `SCR-PUB-NN` | ORG-00…22, JDG-00…10, SYS-01, PUB-01 | 03-analiza-designu §2, 05/06-ekrany |
| `ADR-` | `ADR-NNN-slug` | ADR-001 … ADR-013 | adr/ |
| `UI-` | `UI-NN` – reguły z przeglądu designu | UI-01 … UI-15 | 03-analiza-designu §6 |
| `G-` | `G-NN` – luki designu | G-01 … G-32 | 03-analiza-designu §9 |
| `D-SC-` | decyzje punktacji | D-SC-01 … D-SC-12 | 07-reguly-punktacji §9 |
| `D-AR-` | decyzje architektoniczne (skrót) | D-AR-01 … D-AR-07 | 01-przeglad-architektury §7 |
| `INT-` | reguły integralności danych | INT-01 … INT-10 | 02-model-danych §5 |
| `Q-` | pytania otwarte | Q-01 … Q-14 (Q-15 … Q-19 dodał Tech Lead) | ten dokument §5; Q-15…Q-19 – [98-weryfikacja §8.2](98-weryfikacja-tech-leada.md#82-nowe-pytania-decyzje-biznesowe-z-założeniem-domyślnym) |
| `S` | źródła researchu | S1 … S35 | 01-analiza-konkurencji §8 |
| Kody błędów API | `UPPER_SNAKE` | np. `CATEGORY_LOCKED` | 03-api §1.2 |
| Zdarzenia WS | `domena.czasownik` | np. `category.locked` | 03-api §6 |

Proponowana konwencja dla Agenta 2: przypadki testowe `TC-<obszar>-NNN` (np. `TC-SCORING-001`) z odwołaniem do US/FR/NFR oraz zadania `IMP-NNN` z odwołaniem do FR i SCR.

## 3. Kluczowe decyzje techniczne (skrót)

| # | Decyzja | Uzasadnienie w jednym zdaniu | ADR |
|---|---|---|---|
| 1 | **React Native + Expo (TS), jedna aplikacja z trybami Organizator (telefon) i Sędzia (tablet)** | Jeden kod iOS/Android, przeniesienie logiki prototypu React, współdzielenie TS z backendem | ADR-001 |
| 2 | **NestJS 12 (Node 26 LTS) + PostgreSQL 18 + Drizzle + zod 4** (wersje zaktualizowane przez Tech Leada – TL-01) | Relacyjne ograniczenia i transakcje, wspólny język z aplikacją | ADR-002, ADR-012 |
| 3 | **REST/OpenAPI 3.1 + Socket.IO jako sygnały unieważnienia** | Proste zasoby, idempotentne komendy offline, realtime ≤ 2 s | ADR-003 |
| 4 | **Offline-first tablet: SQLite + outbox + mutacje z `mutationId`, serwer rozstrzyga** | Zawodne Wi-Fi w halach, jeden autor arkusza = proste konflikty | ADR-004 |
| 5 | **Parowanie tabletu (QR) + PIN 4-cyfrowy, weryfikacja online lub offline (PBKDF2 + pepper)** | Zgodne z designem, PIN nieosiągalny bez sparowanego urządzenia | ADR-005 |
| 6 | **Punktacja: T = max(0, Σv·w − Σn·c); R = średnia (half-up 0,01); remis: Technika → kary → ex aequo; arytmetyka całkowitoliczbowa** | Zgodność z designem plus determinizm | ADR-006 |
| 7 | **AWS eu-central-1 (ECS Fargate, RDS, ElastiCache, S3, SES), Terraform, GitHub Actions, EAS** | Dane w UE, usługi zarządzane | ADR-007 |
| 8 | **Własne auth organizatora (Argon2id, JWT ES256 15 min, rotowany refresh 30 dni)** | Jeden model tokenów dla org/device/judge, dane w UE | ADR-008 |
| 9 | **PDF generowany na serwerze (pdfmake, Inter), z wersją i sumą SHA-256 wyników** | Jednolity, weryfikowalny dokument | ADR-009 |
| 10 | **Blokada kategorii autorytatywna na serwerze; spóźnione oceny → „odrzucone zgłoszenia”** | Stabilne wyniki ostateczne bez utraty ocen | ADR-010 |
| 11 | **Monorepo pnpm + Turborepo; `@polechamp/scoring` i `@polechamp/contracts` współdzielone** | Identyczne wyniki klient/serwer, zgodne kontrakty | ADR-011 |

Decyzje domenowe szczególnie istotne dla testów: konfiguracja punktacji zamrożona po starcie kategorii (INT-04), turniej Zakończona tylko do odczytu (INT-05), sędzia widzi tylko własne oceny (FR-610), organizator nie edytuje not (05-bezpieczenstwo §6), start kategorii automatycznie rozpoczyna turniej (FR-308), zakończenie turnieju blokuje kategorie Trwa (FR-207).

## 4. Co jest w designie, a co jest rozszerzeniem

- **Z designu (zachować 1:1):** SCR-ORG-00…12, SCR-JDG-00…05, teksty, toasty, kolory, układy, logika liczenia (średnia, Technika jako remis), auto-przejście, PIN z autozatwierdzeniem.
- **Rozszerzenia logiki (oznaczone jako decyzje):** D-SC-02…07, D-SC-10…12, blokada konfiguracji, ostrzeżenie przed blokadą, odrzucone zgłoszenia, walidacje formularzy, potwierdzenia usuwania, ukrycie „Dodaj” w zakończonym turnieju.
- **Ekrany poza designem (propozycje do akceptacji projektanta – Q-08):** SCR-SYS-01, SCR-ORG-13…22, SCR-JDG-06…10, SCR-PUB-01 (v2).

## 5. Pytania otwarte

| ID | Pytanie | Do kogo | Domyślne założenie w dokumentacji |
|---|---|---|---|
| Q-01 | Czy kolejność remisów „Technika → mniej kar → ex aequo” jest akceptowalna? Czy organizator ma ją konfigurować w MVP? | PO / sędzia ekspert | Tak, bez konfiguracji w MVP |
| Q-02 | Czy wynik sędziego ma być obcinany do 0 (prototyp dopuszcza wartości ujemne)? | PO | Tak (D-SC-03) |
| Q-03 | Czy wartości domyślne formularza (połowa skali) zostają? Czy dodać wskaźnik „nieruszone” lub wymóg dotknięcia każdego kryterium? | PO / projektant | Zostają, bez wskaźnika |
| Q-04 | Czy potrzebne jest „wznowienie” zakończonego turnieju (np. po proteście)? | PO | Nie w MVP |
| Q-05 | Szablon kryteriów dla Doubles – czy dodać „Synchronizację”? | PO | Nie (szablon jak Pole Sport) |
| Q-06 | Terminologia „Zawodniczki” a kategorie męskie – czy zmienić teksty (np. „Zawodnicy”, „Uczestnicy”)? | PO / projektant | Teksty z designu, klucze i18n gotowe na zmianę |
| Q-07 | Etykieta statusu turnieju „Zakończona” (design) czy „Zakończony” (gramatycznie)? | Projektant | Jak w designie |
| Q-08 | Akceptacja ekranów poza designem i odstępstw wizualnych: jasny PDF, jasne tło QR, pomocnicza skala odstępów, obrys pól neutral-600 (a11y) | Projektant | Jak opisano |
| Q-09 | Czy blokować zrzuty ekranu w trybie sędziego? | PO / bezpieczeństwo | Nie |
| Q-10 | Umowa powierzenia, podstawy prawne, retencja 24 mies., zgody opiekunów – weryfikacja prawna | Prawnik / PO | Jak w 05-bezpieczenstwo §5 |
| Q-11 | Model biznesowy (darmowy pilot, abonament, opłata per turniej) – wpływa na limity i ewentualne płatności w aplikacji | PO / PM | Brak płatności w MVP |
| Q-12 | Sprawdzanie haseł w HIBP (zewnętrzne zapytanie k-anonimowe) czy lokalna lista? | Tech Lead / bezpieczeństwo | **Rozstrzygnięte (TL-41):** HIBP z lokalną listą jako zapasem |
| Q-13 | AWS Frankfurt czy GCP Warszawa (europe-central2)? | Tech Lead / PM | **Rozstrzygnięte (TL-42):** AWS eu-central-1 (ADR-007) |
| Q-14 | Priorytet roli „Sędzia główny” i średniej obciętej (v1.1) – czy pilotażowy organizator ich wymaga? | PO | v1.1 |

## 6. Ryzyka techniczne

| ID | Ryzyko | Wpływ | Prawdop. | Mitygacja |
|---|---|---|---|---|
| R-01 | Wydajność suwaków i formularza na słabszych tabletach Android | Wysoki (UX sędziego) | Średnie | Reanimated/worklety, testy na Galaxy Tab A8 (NFR-104), profilowanie wcześnie |
| R-02 | Błędy synchronizacji (duplikaty, utrata ocen) | Krytyczny | Średnie | Idempotencja na 3 poziomach, testy kill/offline, testy właściwości (NFR-302, NFR-306) |
| R-03 | Sieć hali blokuje WSS / przeciążone Wi-Fi | Średni | Wysokie | Offline-first, fallback na odpytywanie (NFR-303), LTE organizatora |
| R-04 | PBKDF2 600k za wolne na tablecie | Średni | Średnie | `react-native-quick-crypto` (natywne), benchmark w sprincie 1 (NFR-110), ewentualnie 210k za zgodą |
| R-05 | Weryfikator PIN na urządzeniu (ryzyko przy przejętym tablecie) | Średni | Niskie | Pepper w Keystore, unieważnianie urządzeń, audyt `OFFLINE_PIN`, opcja wyłączenia offline (ADR-005) |
| R-06 | Brak szyfrowania SQLite (dane osobowe na tablecie) | Średni | Niskie | Szyfrowanie urządzenia, usuwanie danych po 7 dniach. Ocena SQLCipher (`op-sqlite`) w v1.1 |
| R-07 | Przeniesienie animacji splash (canvas, IK) do RN | Niski | Średnie | Skia, fallback sprite (ADR-001) |
| R-08 | Złożoność infrastruktury AWS dla małego zespołu | Średni | Średnie | Moduły Terraform, środowisko `dev` minimalne, Q-13 |
| R-09 | Rozjazd silnika punktacji klient/serwer | Wysoki | Niskie | Jeden pakiet, testy referencyjne z 07-reguly §6 w CI obu aplikacji |
| R-10 | Zmiany w designie po akceptacji ekranów poza designem | Średni | Średnie | Wczesna akceptacja Q-08, komponenty z tokenów |
| R-11 | Aktualizacje Expo SDK / OTA w trakcie sezonu | Średni | Średnie | Polityka zamrożenia (NFR-905), runtimeVersion w EAS Update |
| R-12 | Wymogi App Store (logowanie, polityka prywatności, dane dzieci) | Średni | Niskie | Aplikacja nie jest skierowana do dzieci (użytkownicy: organizatorzy i sędziowie), polityka prywatności, Sign in with Apple przy social login (v1.1) |

## 7. Do zweryfikowania przez Tech Leada (przed planem implementacji)

1. Aktualne wersje: Expo SDK (najnowsza stabilna), React Native, NestJS, Node LTS, PostgreSQL na RDS, wsparcie `@gorhom/bottom-sheet` i Skia dla wybranego SDK.
2. Wybór ORM (Drizzle vs Prisma) i generatora OpenAPI z zod (np. `@asteasolutions/zod-to-openapi` / `nestjs-zod`).
3. Benchmark PBKDF2 600k na tabletach referencyjnych (NFR-110) i Argon2id na Fargate (koszt CPU logowań).
4. Zachowanie `expo-sqlite` (WAL, transakcje) przy zabiciu procesu na Androidzie i iPadOS (NFR-302).
5. Socket.IO przez ALB (idle timeout 300 s, tylko WebSocket) oraz zachowanie klienta RN po uśpieniu aplikacji.
6. `pdfmake` z czcionką Inter i polskimi znakami. Czas generowania turnieju maksymalnego (NFR-107).
7. Koszt środowisk AWS (prod/staging/dev) – oszacowanie dla PM.
8. Podział pracy: proponowana kolejność – `@polechamp/scoring` + `contracts` → API rdzeń (turnieje/kategorie/kryteria/starty) → aplikacja organizatora (SCR-ORG-01…12) → urządzenia/PIN/sync → panel sędziego (SCR-JDG-00…05) → offline + odrzucenia → wyniki/PDF → audyt/RODO → twardnienie (NFR).
9. Plan testów powinien pokryć wprost: przykłady P1–P14 (punktacja), scenariusze sekwencji 1–9, macierz uprawnień (05-bezpieczenstwo §4), reguły UI-01…UI-15, kody błędów API (03-api §1.2), testy offline (06-offline §10).

## 8. Założenia przyjęte bez potwierdzenia
- Organizator zapewnia tablety ≥ 10″ i telefon z LTE.
- Turnieje krajowe/amatorskie (3–5 sędziów, ≤ 1 500 startów).
- Jeden organizator na turniej (bez współdzielenia) w MVP.
- Brak wymogów federacyjnej homologacji systemu (IPSF/POSA nie wskazują certyfikowanego oprogramowania – patrz research).

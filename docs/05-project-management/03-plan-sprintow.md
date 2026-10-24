# Plan sprintów

> Dokument: `05-project-management/03-plan-sprintow.md` · Project Manager (Agent 3) · Wersja 1.0 · 24.10.2026
> Wejście: [91-indeks-zadan.md](../04-implementation-plans/91-indeks-zadan.md) (250 zadań, zależności), [99-przekazanie-dla-pm.md](../04-implementation-plans/99-przekazanie-dla-pm.md), założenia [00-zalozenia-planistyczne.md](00-zalozenia-planistyczne.md). Harmonogram i warianty: [04-harmonogram.md](04-harmonogram.md). Kamienie milowe: [02-kamienie-milowe.md](02-kamienie-milowe.md).
> Plan wygenerowano symulacją z ograniczonymi zasobami (metoda – §1) i sprawdzono skryptem (wynik – §4). Od wersji 1.0 źródłem prawdy jest ten plik: zmiany wprowadza PM ręcznie na planowaniu sprintu i odnotowuje w §5.

## 1. Zasady i metoda

- **Sprinty 2-tygodniowe** od poniedziałku do piątku następnego tygodnia; SP-01 zaczyna się w poniedziałek **2.11.2026**. Identyfikatory `SP-NN` (nie `S1` – ten prefiks oznacza źródła researchu i wagi defektów).
- **Pojemność** = dni robocze × **6 h efektywnych/dzień** (współczynnik fokusu 75%) × etat × dostępność (święta = 0, okres świąteczny 21.12–5.01 = 50%) – [ZAL-02…ZAL-04](00-zalozenia-planistyczne.md#2-założenia).
- **Godziny z buforem** = szacunek × (1 + bufor ryzyka: niskie 10%, średnie 25%, wysokie 50%) × 1,15 (narzut: przeglądy, ceremonie, naprawa defektów) – zgodnie z [00-konwencje §2](../04-implementation-plans/00-konwencje-i-definition-of-done.md#2-skala-szacowania) i [99-przekazanie-dla-pm §1](../04-implementation-plans/99-przekazanie-dla-pm.md#1-suma-szacunków). **Obciążenie % = godziny z buforem / pojemność** (cel ≤ 100%).
- **Symulacja** (list scheduling): każdy członek zespołu bierze najwyżej położone gotowe zadanie swojej roli; priorytet = faza TL (F0→F6) + najdłuższa ścieżka do końca projektu + premia dla spike'ów, silnika punktacji (IMP-050…057) i zadań MOB wysokiego ryzyka (IMP-206, 305, 310, 350, 354, 500 – [90-graf §3](../04-implementation-plans/90-graf-zaleznosci.md#3-ścieżka-krytyczna)); zadanie nie przechodzi przez granicę sprintu (jeśli się nie mieści, czeka na kolejny sprint).
- **Role wykonawcze:** zadania FULL wykonuje BE (BE ma zapas pojemności), z wyjątkiem IMP-465 i IMP-556 (próba generalna, pilot), które dzielimy po połowie BE + MOB ([ZAL-10](00-zalozenia-planistyczne.md#2-założenia)).
- **Kolejność w sprincie** (kolumna „Poz.”) wynika z planowanych dat startu. Zależność od zadania z tego samego sprintu jest oznaczona **pogrubieniem** i numerem pozycji – zawsze wcześniejszym niż pozycja zadania.
- **Zależności PM (miękkie, porządkowe)** – dodane do zależności Tech Leada, oznaczone „†”: (a) ekrany poza designem po akceptacji projektanta IMP-650 (DoR – [00-konwencje §4](../04-implementation-plans/00-konwencje-i-definition-of-done.md#4-definition-of-ready)): IMP-213, IMP-250, IMP-251, IMP-252, IMP-253, IMP-258, IMP-259, IMP-267, IMP-269, IMP-271, IMP-272, IMP-273, IMP-274, IMP-275, IMP-276, IMP-277, IMP-301, IMP-303, IMP-305, IMP-306, IMP-317, IMP-318; (b) porządkowe: IMP-551 po IMP-651; IMP-552 po IMP-457; IMP-104 po IMP-006; IMP-105 po IMP-006; IMP-114 po IMP-102 i IMP-018; IMP-121 po IMP-102 i IMP-018; IMP-250 po IMP-070 i IMP-219; IMP-255 po IMP-070 i IMP-219; IMP-300 po IMP-070 i IMP-219; (c) **bramka RC**: IMP-464, IMP-466 i IMP-408 dopiero po ukończeniu wszystkich zadań funkcjonalnych (236 zadań; poza bramką: IMP-550, IMP-551, IMP-553, IMP-554, IMP-503, IMP-506, IMP-653, IMP-557 oraz zadania po bramce).
- **Kotwice kalendarzowe:** IMP-465 (próba generalna) zaczyna się w sobotę 20.03.2027; IMP-556 (wsparcie pilota) przypisano do SP-13 – dnia turnieju pilotażowego 24.04.2027 (symulacja wskazywała SP-12; przesunięcie na późniejszy sprint nie narusza zależności).

## 2. Przegląd sprintów

| Sprint | Daty | Dni rob. (efekt.) | Cel (skrót) | BE | MOB | QA | DEVOPS | DESIGN | Zadań | Kamień milowy |
|---|---|---|---|---|---|---|---|---|---|---|
| [SP-01](#sp-01) | 02.11–13.11.2026 | 9 (9) | Fundamenty, spike'i, akceptacja Q-08 | 91/108 h (85%) | 82/108 h (75%) | 0/0 h (–) | 51/54 h (94%) | 23/32 h (71%) | 27 | M0 (2.11) |
| [SP-02](#sp-02) | 16.11–27.11.2026 | 10 (10) | Punktacja P1–P14, baza, komponenty, AWS dev | 116/120 h (97%) | 114/120 h (95%) | 23/30 h (76%) | 59/60 h (99%) | 10/12 h (84%) | 37 | M1 (27.11) |
| [SP-03](#sp-03) | 30.11–11.12.2026 | 10 (10) | Kontrakty, CD, urządzenia, Sheet, suwak | 115/120 h (96%) | 112/120 h (94%) | 25/60 h (42%) | 57/60 h (95%) | 0/12 h (0%) | 35 | – |
| [SP-04](#sp-04) | 14.12–25.12.2026 | 8 (6,5) | API konfiguracji turnieju, sync push, DevCatalog | 75/78 h (96%) | 75/78 h (96%) | 22/39 h (56%) | 19/20 h (100%) | 0/8 h (0%) | 19 | M2 (23.12) |
| [SP-05](#sp-05) | 28.12–08.01.2027 | 7 (4,5) | Konto, sesje sędziów, SyncEngine push | 53/54 h (99%) | 49/54 h (91%) | 14/27 h (53%) | 13/14 h (94%) | 0/5 h (0%) | 14 | – |
| [SP-06](#sp-06) | 11.01–22.01.2027 | 10 (10) | Ocenianie i blokada na serwerze, logowanie w aplikacji | 118/120 h (98%) | 116/120 h (97%) | 17/60 h (28%) | 0/30 h (0%) | 8/12 h (63%) | 29 | M3 (22.01) |
| [SP-07](#sp-07) | 25.01–05.02.2027 | 10 (10) | Organizator: ranking, PDF; RODO; E2E org | 117/120 h (98%) | 116/120 h (97%) | 46/60 h (77%) | 0/30 h (0%) | 0/12 h (0%) | 31 | – |
| [SP-08](#sp-08) | 08.02–19.02.2027 | 10 (10) | Domknięcie organizatora, pełna synchronizacja | 39/120 h (32%) | 116/120 h (97%) | 22/60 h (37%) | 9/30 h (29%) | 0/12 h (0%) | 24 | M4 (19.02) |
| [SP-09](#sp-09) | 22.02–05.03.2027 | 10 (10) | Sędzia kompletny, profilowanie, E2E sędziego | 0/120 h (0%) | 118/120 h (98%) | 59/60 h (98%) | 0/30 h (0%) | 0/12 h (0%) | 17 | – |
| [SP-10](#sp-10) | 08.03–19.03.2027 | 10 (10) | RC1, E2E pełnego turnieju, przygotowanie UAT | 0/120 h (0%) | 37/120 h (31%) | 56/60 h (93%) | 0/30 h (0%) | 8/12 h (63%) | 11 | M5 (19.03) |
| [SP-11](#sp-11) | 22.03–02.04.2027 | 9 (9) | Próba generalna, pentest, go/no-go, produkcja | 37/108 h (34%) | 14/108 h (13%) | 25/54 h (46%) | 12/27 h (43%) | 0/11 h (0%) | 5 | M6 (26.03), M7 (2.04) |
| [SP-12](#sp-12) | 05.04–16.04.2027 | 10 (10) | Rezerwa, przegląd w sklepach, przygotowanie pilota | 0/120 h (0%) | 0/120 h (0%) | 0/60 h (0%) | 0/30 h (0%) | 0/12 h (0%) | 0 | – |
| [SP-13](#sp-13) | 19.04–30.04.2027 | 9 (9) | Pilotażowy turniej 24.04.2027 | 10/108 h (10%) | 10/108 h (10%) | 0/54 h (0%) | 0/27 h (0%) | 0/11 h (0%) | 1 | M8 (30.04) |
| **Razem SP-01…SP-13** | 2.11.2026–30.04.2027 | | | | | | | | **250** | |

Komórki ról: godziny z buforem przypisanych zadań / pojemność roli w sprincie (obciążenie). Suma szacunków: **1679 h** bez buforów, **2308 h** z buforem ryzyka i narzutem (zgodnie z 2308 h w [99-przekazanie-dla-pm](../04-implementation-plans/99-przekazanie-dla-pm.md#1-suma-szacunków)). Sprinty po pilocie (SP-14 i dalej, v1.1) – [10-backlog-po-pilocie.md](10-backlog-po-pilocie.md).

**Wąskie gardła:** MOB 91–98% w SP-02…SP-09 (zgodnie z wnioskiem TL), QA 93–98% w SP-09…SP-10. **Wolna pojemność:** BE od SP-08 (rezerwa na defekty z E2E/UAT/pentestu i wsparcie QA – [ZAL-12](00-zalozenia-planistyczne.md#2-założenia)), MOB i projektant od SP-10 (przygotowanie v1.1 – BL-01), DevOps od SP-06 (0,5 etatu „na żądanie”).

## 3. Sprinty

### SP-01

**02.11.2026 – 13.11.2026** · dni robocze: 9 (efektywnie 9) · zadań: 27 · kamień milowy: M0 (2.11)

**Cel sprintu:** Fundamenty i decyzje techniczne: monorepo z lintem, bootstrap Terraform i sieć VPC, silnik punktacji (IMP-050…054), szkielety kontraktów i i18n, spike’i stosu mobilnego i PDF, akceptacja ekranów poza designem (Q-08).

| Rola | h (bez buforów) | h z buforem | Pojemność (h) | Obciążenie |
|---|---|---|---|---|
| BE | 70 | 91,3 | 108 | 85% |
| MOB | 58 | 81,5 | 108 | 75% |
| QA | 0 | 0 | 0 | – |
| DEVOPS | 38 | 50,8 | 54 | 94% |
| DESIGN | 16 | 23 | 32,4 | 71% |

**BE**

| Poz. | Zadanie | Tytuł | h | h z buf. | Ryzyko | Zależności | Plan |
|---|---|---|---|---|---|---|---|
| 5 | [IMP-069](../04-implementation-plans/02-pakiety-wspoldzielone.md#imp-069--polechampi18n--infrastruktura-liczba-mnoga-formatery) | @polechamp/i18n – infrastruktura, liczba mnoga, formatery (FULL → BE) | 10 | 12,6 | niskie | **IMP-001** (poz. 1) | 03.11–05.11 |
| 7 | [IMP-605](../04-implementation-plans/14-spike.md#imp-605--spike-pdfmake-z-inter-i-polskimi-znakami-wydajność-limit-6-h) | SPIKE: pdfmake z Inter i polskimi znakami, wydajność (limit 6 h) | 6 | 7,6 | niskie | **IMP-001** (poz. 1) | 03.11–04.11 |
| 9 | [IMP-050](../04-implementation-plans/02-pakiety-wspoldzielone.md#imp-050--polechampscoring--szkielet-pakietu) | @polechamp/scoring – szkielet pakietu | 3 | 3,8 | niskie | **IMP-001** (poz. 1), **IMP-002** (poz. 3) | 04.11–05.11 |
| 10 | [IMP-051](../04-implementation-plans/02-pakiety-wspoldzielone.md#imp-051--scoring-typy-i-arytmetyka-stałoprzecinkowa) | scoring: typy i arytmetyka stałoprzecinkowa | 6 | 7,6 | niskie | **IMP-050** (poz. 9) | 05.11–06.11 |
| 13 | [IMP-058](../04-implementation-plans/02-pakiety-wspoldzielone.md#imp-058--polechampcontracts--szkielet) | @polechamp/contracts – szkielet | 3 | 3,8 | niskie | **IMP-001** (poz. 1) | 05.11–06.11 |
| 14 | [IMP-059](../04-implementation-plans/02-pakiety-wspoldzielone.md#imp-059--contracts-schematy-wspólne-i-katalog-błędów) | contracts: schematy wspólne i katalog błędów | 6 | 7,6 | niskie | **IMP-058** (poz. 13) | 06.11–09.11 |
| 15 | [IMP-052](../04-implementation-plans/02-pakiety-wspoldzielone.md#imp-052--scoring-wynik-sędziego-maksimum-wartości-domyślne-walidacja-arkusza) | scoring: wynik sędziego, maksimum, wartości domyślne, walidacja arkusza | 6 | 7,6 | niskie | **IMP-051** (poz. 10) | 06.11–09.11 |
| 18 | [IMP-063](../04-implementation-plans/02-pakiety-wspoldzielone.md#imp-063--contracts-synchronizacja-i-sesje-sędziów) | contracts: synchronizacja i sesje sędziów | 8 | 11,5 | średnie | **IMP-059** (poz. 14) | 09.11–12.11 |
| 21 | [IMP-053](../04-implementation-plans/02-pakiety-wspoldzielone.md#imp-053--scoring-agregacja-i-średnie-remisowe) | scoring: agregacja i średnie remisowe | 6 | 7,6 | niskie | **IMP-052** (poz. 15) | 09.11–10.11 |
| 24 | [IMP-054](../04-implementation-plans/02-pakiety-wspoldzielone.md#imp-054--scoring-ranking-remisy-starty-bez-ocen-i-wycofane) | scoring: ranking, remisy, starty bez ocen i wycofane | 8 | 11,5 | średnie | **IMP-053** (poz. 21) | 10.11–13.11 |
| 26 | [IMP-070](../04-implementation-plans/02-pakiety-wspoldzielone.md#imp-070--i18n-katalog-tekstów-wiążących-pl) | i18n: katalog tekstów wiążących PL (FULL → BE) | 8 | 10,1 | niskie | **IMP-069** (poz. 5) | 12.11–13.11 |

**MOB**

| Poz. | Zadanie | Tytuł | h | h z buf. | Ryzyko | Zależności | Plan |
|---|---|---|---|---|---|---|---|
| 4 | [IMP-068](../04-implementation-plans/02-pakiety-wspoldzielone.md#imp-068--polechamptokens--tokeny-nocturne) | @polechamp/tokens – tokeny Nocturne | 6 | 7,6 | niskie | **IMP-001** (poz. 1) | 03.11–04.11 |
| 6 | [IMP-600](../04-implementation-plans/14-spike.md#imp-600--spike-zgodność-stosu-expo-sdk-58-limit-8-h) | SPIKE: zgodność stosu Expo SDK 58 (limit 8 h) | 8 | 11,5 | średnie | **IMP-001** (poz. 1) | 03.11–05.11 |
| 11 | [IMP-603](../04-implementation-plans/14-spike.md#imp-603--spike-trwałość-expo-sqlite-przy-kill--9-i-utracie-zasilania-limit-8-h) | SPIKE: trwałość expo-sqlite przy kill -9 i utracie zasilania (limit 8 h) | 8 | 13,8 | wysokie | **IMP-600** (poz. 6) | 05.11–09.11 |
| 12 | [IMP-609](../04-implementation-plans/14-spike.md#imp-609--spike-drizzle-na-expo-sqlite-i-zapis-migawki-limit-6-h) | SPIKE: Drizzle na expo-sqlite i zapis migawki (limit 6 h) | 6 | 7,6 | niskie | **IMP-600** (poz. 6) | 05.11–06.11 |
| 17 | [IMP-602](../04-implementation-plans/14-spike.md#imp-602--spike-bottom-sheet--gorhombottom-sheet-vs-własny-limit-4-h) | SPIKE: bottom sheet – @gorhom/bottom-sheet vs własny (limit 4 h) | 4 | 5,1 | niskie | **IMP-600** (poz. 6) | 06.11–09.11 |
| 19 | [IMP-601](../04-implementation-plans/14-spike.md#imp-601--spike-pbkdf2-600k-na-tabletach-i-argon2id-na-fargate-limit-6-h) | SPIKE: PBKDF2 600k na tabletach i Argon2id na Fargate (limit 6 h) | 6 | 8,6 | średnie | **IMP-600** (poz. 6) | 09.11–10.11 |
| 20 | [IMP-606](../04-implementation-plans/14-spike.md#imp-606--spike-animacja-splash--skia-vs-sekwencja-klatek-limit-8-h) | SPIKE: animacja splash – Skia vs sekwencja klatek (limit 8 h) | 8 | 10,1 | niskie | **IMP-600** (poz. 6) | 09.11–12.11 |
| 23 | [IMP-607](../04-implementation-plans/14-spike.md#imp-607--spike-orientacja-i-zmiana-okna-android-16-ipados-26-limit-6-h) | SPIKE: orientacja i zmiana okna (Android 16, iPadOS 26) (limit 6 h) | 6 | 8,6 | średnie | **IMP-600** (poz. 6) | 10.11–13.11 |
| 25 | [IMP-200](../04-implementation-plans/06-mobile-fundamenty-i-design-system.md#imp-200--inicjalizacja-aplikacji-expo-sdk-58) | Inicjalizacja aplikacji Expo SDK 58 | 6 | 8,6 | średnie | **IMP-001** (poz. 1), **IMP-600** (poz. 6) | 12.11–13.11 |

**DEVOPS**

| Poz. | Zadanie | Tytuł | h | h z buf. | Ryzyko | Zależności | Plan |
|---|---|---|---|---|---|---|---|
| 1 | [IMP-001](../04-implementation-plans/01-fundamenty-i-devops.md#imp-001--monorepo-pnpm-workspaces--turborepo--bazowa-konfiguracja-ts) | Monorepo: pnpm workspaces + Turborepo + bazowa konfiguracja TS | 6 | 7,6 | niskie | – | 02.11–03.11 |
| 3 | [IMP-002](../04-implementation-plans/01-fundamenty-i-devops.md#imp-002--lint-formatowanie-i-hooki-git) | Lint, formatowanie i hooki git | 6 | 7,6 | niskie | **IMP-001** (poz. 1) | 03.11–04.11 |
| 8 | [IMP-007](../04-implementation-plans/01-fundamenty-i-devops.md#imp-007--terraform-bootstrap-kont-i-stanu) | Terraform: bootstrap kont i stanu | 8 | 11,5 | średnie | **IMP-001** (poz. 1) | 04.11–06.11 |
| 16 | [IMP-008](../04-implementation-plans/01-fundamenty-i-devops.md#imp-008--terraform-sieć-vpc) | Terraform: sieć VPC | 8 | 11,5 | średnie | **IMP-007** (poz. 8) | 06.11–10.11 |
| 22 | [IMP-014](../04-implementation-plans/01-fundamenty-i-devops.md#imp-014--terraform-secrets-manager-kms-iam-ról-zadań) | Terraform: Secrets Manager, KMS, IAM ról zadań | 6 | 7,6 | niskie | **IMP-007** (poz. 8) | 10.11–12.11 |
| 27 | [IMP-010](../04-implementation-plans/01-fundamenty-i-devops.md#imp-010--terraform-elasticache-valkey) | Terraform: ElastiCache Valkey | 4 | 5,1 | niskie | **IMP-008** (poz. 16) | 12.11–13.11 |

**DESIGN**

| Poz. | Zadanie | Tytuł | h | h z buf. | Ryzyko | Zależności | Plan |
|---|---|---|---|---|---|---|---|
| 2 | [IMP-650](../04-implementation-plans/15-design-i-akceptacje.md#imp-650--akceptacja-ekranów-poza-designem-q-08) | Akceptacja ekranów poza designem (Q-08) | 16 | 23 | średnie | – | 02.11–10.11 |

**Demo / rezultat:** Aplikacja testowa Expo SDK 58 uruchomiona na Galaxy Tab A8 i iPad 9; raport spike’ów z decyzjami (IMP-600, 601, 602, 603, 605, 606, 607, 609); ranking z remisami w testach jednostkowych (P9–P10, IMP-054); lista decyzji projektanta z warsztatu Q-08 (IMP-650).

**Ryzyka sprintu:** RT-01 (zgodność modułów natywnych SDK 58 – wynik IMP-600 decyduje o fallbacku SDK 57), RT-04 i R-04 (wyniki IMP-603/601), RP-01 (kompletność zespołu), RP-05 (dostępność projektanta – 0,6 etatu tylko w tym sprincie), ZZ-07 (urządzenia referencyjne muszą być na miejscu 2.11). (rejestr: [05-rejestr-ryzyk.md](05-rejestr-ryzyk.md))

**Uwagi:** 11.11 – święto. QA jeszcze nie w zespole (start SP-02). DevOps w wymiarze 1,0 etatu (ZAL-06), projektant 0,6 etatu (ZAL-07). Silnik punktacji prowadzi jedna osoba BE od pierwszego tygodnia (ścieżka krytyczna).

### SP-02

**16.11.2026 – 27.11.2026** · dni robocze: 10 (efektywnie 10) · zadań: 37 · kamień milowy: M1 (27.11)

**Cel sprintu:** Silnik punktacji kompletny (P1–P14, kanoniczny JSON, parzystość klient–serwer), szkielet API z bazą (migracje 2–4), JWT, limity zapytań i sędziowie z PIN-em; komponenty bazowe Nocturne, SQLite i outbox na tablecie; środowisko `dev` w AWS (RDS, Valkey, ECS, ALB) i CI na PR.

| Rola | h (bez buforów) | h z buforem | Pojemność (h) | Obciążenie |
|---|---|---|---|---|
| BE | 87 | 115,9 | 120 | 97% |
| MOB | 85 | 114,1 | 120 | 95% |
| QA | 18 | 22,8 | 30 | 76% |
| DEVOPS | 44 | 59,5 | 60 | 99% |
| DESIGN | 8 | 10,1 | 12 | 84% |

**BE**

| Poz. | Zadanie | Tytuł | h | h z buf. | Ryzyko | Zależności | Plan |
|---|---|---|---|---|---|---|---|
| 3 | [IMP-055](../04-implementation-plans/02-pakiety-wspoldzielone.md#imp-055--scoring-formatowanie-wyników-i-postęp) | scoring: formatowanie wyników i postęp | 8 | 10,1 | niskie | IMP-054 | 16.11–17.11 |
| 4 | [IMP-057](../04-implementation-plans/02-pakiety-wspoldzielone.md#imp-057--scoring-kanoniczny-json-wyników) | scoring: kanoniczny JSON wyników | 4 | 5,1 | niskie | IMP-054 | 16.11–16.11 |
| 7 | [IMP-100](../04-implementation-plans/03-backend-konto-i-konfiguracja-turnieju.md#imp-100--szkielet-api-nestjs-12-fastify) | Szkielet API NestJS 12 (Fastify) | 6 | 7,6 | niskie | IMP-001 | 16.11–18.11 |
| 11 | [IMP-062](../04-implementation-plans/02-pakiety-wspoldzielone.md#imp-062--contracts-zawodniczki-sędziowie-urządzenia-parowanie) | contracts: zawodniczki, sędziowie, urządzenia, parowanie | 6 | 7,6 | niskie | IMP-059 | 17.11–18.11 |
| 13 | [IMP-103](../04-implementation-plans/03-backend-konto-i-konfiguracja-turnieju.md#imp-103--baza-drizzle-migracje-transakcje-z-kontekstem) | Baza: Drizzle, migracje, transakcje z kontekstem | 8 | 11,5 | średnie | **IMP-100** (poz. 7) | 18.11–20.11 |
| 17 | [IMP-101](../04-implementation-plans/03-backend-konto-i-konfiguracja-turnieju.md#imp-101--błędy-rfc-9457-i-middleware-identyfikatora-żądania) | Błędy RFC 9457 i middleware identyfikatora żądania | 4 | 5,1 | niskie | **IMP-100** (poz. 7), IMP-059 | 18.11–19.11 |
| 19 | [IMP-113](../04-implementation-plans/03-backend-konto-i-konfiguracja-turnieju.md#imp-113--jwt-es256-i-guardy-ról) | JWT ES256 i guardy ról | 8 | 11,5 | średnie | **IMP-101** (poz. 17), IMP-014 | 19.11–23.11 |
| 20 | [IMP-006](../04-implementation-plans/01-fundamenty-i-devops.md#imp-006--środowisko-lokalne-docker-compose-i-seed) | Środowisko lokalne (Docker Compose) i seed | 4 | 5,1 | niskie | IMP-001, **IMP-103** (poz. 13) | 20.11–20.11 |
| 23 | [IMP-105](../04-implementation-plans/03-backend-konto-i-konfiguracja-turnieju.md#imp-105--migracja-2-turnieje-kategorie-kryteria-kary-zawodniczki-sędziowie) | Migracja 2: turnieje, kategorie, kryteria, kary, zawodniczki, sędziowie | 6 | 7,6 | niskie | **IMP-103** (poz. 13), **IMP-006** (poz. 20)† | 20.11–24.11 |
| 26 | [IMP-112](../04-implementation-plans/03-backend-konto-i-konfiguracja-turnieju.md#imp-112--limity-zapytań-valkey) | Limity zapytań (Valkey) | 6 | 7,6 | niskie | **IMP-100** (poz. 7), IMP-010 | 23.11–24.11 |
| 27 | [IMP-106](../04-implementation-plans/03-backend-konto-i-konfiguracja-turnieju.md#imp-106--migracja-3-urządzenia-sesje-oceny-wyniki) | Migracja 3: urządzenia, sesje, oceny, wyniki | 6 | 7,6 | niskie | **IMP-105** (poz. 23) | 24.11–25.11 |
| 30 | [IMP-130](../04-implementation-plans/03-backend-konto-i-konfiguracja-turnieju.md#imp-130--sędziowie-lista-dodanie-z-pin-em-i-weryfikatorami-edycja-dezaktywacja-usunięcie) | Sędziowie: lista, dodanie z PIN-em i weryfikatorami, edycja, dezaktywacja, usunięcie | 10 | 14,4 | średnie | **IMP-105** (poz. 23), **IMP-062** (poz. 11), IMP-014 | 24.11–27.11 |
| 31 | [IMP-107](../04-implementation-plans/03-backend-konto-i-konfiguracja-turnieju.md#imp-107--migracja-4-audyt-dziennik-zmian-idempotencja-zdarzenia-eksporty) | Migracja 4: audyt, dziennik zmian, idempotencja, zdarzenia, eksporty | 8 | 11,5 | średnie | **IMP-106** (poz. 27), **IMP-009** (poz. 1) | 25.11–27.11 |
| 37 | [IMP-065](../04-implementation-plans/02-pakiety-wspoldzielone.md#imp-065--contracts-zdarzenia-realtime) | contracts: zdarzenia realtime | 3 | 3,8 | niskie | IMP-059 | 27.11–27.11 |

**MOB**

| Poz. | Zadanie | Tytuł | h | h z buf. | Ryzyko | Zależności | Plan |
|---|---|---|---|---|---|---|---|
| 2 | [IMP-022](../04-implementation-plans/01-fundamenty-i-devops.md#imp-022--eas-profile-kanały-runtimeversion-poświadczenia) | EAS: profile, kanały, runtimeVersion, poświadczenia | 6 | 7,6 | niskie | IMP-200 | 16.11–17.11 |
| 5 | [IMP-201](../04-implementation-plans/06-mobile-fundamenty-i-design-system.md#imp-201--metro-pnpm-workspace-i-środowisko-testów-mobile) | Metro, pnpm workspace i środowisko testów mobile | 5 | 7,2 | średnie | IMP-200, IMP-050, IMP-058, IMP-068, IMP-069 | 16.11–17.11 |
| 8 | [IMP-202](../04-implementation-plans/06-mobile-fundamenty-i-design-system.md#imp-202--theme-fonty-inter-i-komponenty-tekstu) | Theme, fonty Inter i komponenty tekstu | 6 | 7,6 | niskie | **IMP-201** (poz. 5) | 17.11–18.11 |
| 9 | [IMP-210](../04-implementation-plans/06-mobile-fundamenty-i-design-system.md#imp-210--ikony-phosphor) | Ikony Phosphor | 2 | 2,5 | niskie | **IMP-201** (poz. 5) | 17.11–17.11 |
| 12 | [IMP-219](../04-implementation-plans/06-mobile-fundamenty-i-design-system.md#imp-219--i18n-w-aplikacji) | i18n w aplikacji | 3 | 3,8 | niskie | **IMP-201** (poz. 5), IMP-069 | 17.11–18.11 |
| 14 | [IMP-350](../04-implementation-plans/09-mobile-offline-i-synchronizacja.md#imp-350--lokalna-baza-sqlite-schemat-migracje-pragma) | Lokalna baza SQLite: schemat, migracje, PRAGMA | 8 | 13,8 | wysokie | **IMP-201** (poz. 5), IMP-603, IMP-609 | 18.11–20.11 |
| 16 | [IMP-203](../04-implementation-plans/06-mobile-fundamenty-i-design-system.md#imp-203--komponent-button-primary-secondary-ghost-iconround) | Komponent Button (primary, secondary, ghost, iconRound) | 8 | 10,1 | niskie | **IMP-202** (poz. 8), **IMP-210** (poz. 9) | 18.11–20.11 |
| 21 | [IMP-204](../04-implementation-plans/06-mobile-fundamenty-i-design-system.md#imp-204--statuspill-badge-avatar-progressbar) | StatusPill, Badge, Avatar, ProgressBar | 6 | 7,6 | niskie | **IMP-202** (poz. 8) | 20.11–23.11 |
| 22 | [IMP-209](../04-implementation-plans/06-mobile-fundamenty-i-design-system.md#imp-209--segmentedcontrol-stickyactionbar-screenheaderbacklink-kontenery-ekranów) | SegmentedControl, StickyActionBar, ScreenHeader/BackLink, kontenery ekranów | 8 | 10,1 | niskie | **IMP-203** (poz. 16) | 20.11–24.11 |
| 25 | [IMP-205](../04-implementation-plans/06-mobile-fundamenty-i-design-system.md#imp-205--karty-listy-grupowane-nagłówki-sekcji-stany-puste-szkielety) | Karty, listy grupowane, nagłówki sekcji, stany puste, szkielety | 10 | 12,6 | niskie | **IMP-203** (poz. 16), **IMP-204** (poz. 21) | 23.11–25.11 |
| 29 | [IMP-208](../04-implementation-plans/06-mobile-fundamenty-i-design-system.md#imp-208--toast-banner-dialog) | Toast, Banner, Dialog | 8 | 10,1 | niskie | **IMP-203** (poz. 16) | 24.11–25.11 |
| 32 | [IMP-213](../04-implementation-plans/06-mobile-fundamenty-i-design-system.md#imp-213--scr-sys-01--wybór-trybu-forma-urządzenia-orientacja-per-tryb) | SCR-SYS-01 – wybór trybu, forma urządzenia, orientacja per tryb | 6 | 8,6 | średnie | **IMP-205** (poz. 25), **IMP-209** (poz. 22), IMP-650† | 25.11–26.11 |
| 34 | [IMP-353](../04-implementation-plans/09-mobile-offline-i-synchronizacja.md#imp-353--outbox--rdzeń) | Outbox – rdzeń | 6 | 8,6 | średnie | **IMP-350** (poz. 14), IMP-063 | 25.11–27.11 |
| 36 | [IMP-024](../04-implementation-plans/01-fundamenty-i-devops.md#imp-024--konfiguracja-środowisk-aplikacji-i-kontrola-sekretów-w-bundlu) | Konfiguracja środowisk aplikacji i kontrola sekretów w bundlu | 3 | 3,8 | niskie | IMP-200 | 26.11–27.11 |

**QA**

| Poz. | Zadanie | Tytuł | h | h z buf. | Ryzyko | Zależności | Plan |
|---|---|---|---|---|---|---|---|
| 10 | [IMP-056](../04-implementation-plans/02-pakiety-wspoldzielone.md#imp-056--scoring-testy-właściwości-i-zgodności-klientserwer) | scoring: testy właściwości i zgodności klient–serwer | 10 | 12,6 | niskie | **IMP-055** (poz. 3), **IMP-201** (poz. 5) | 17.11–23.11 |
| 28 | [IMP-450](../04-implementation-plans/11-qa-i-automatyzacja-testow.md#imp-450--dane-testowe-port-seedu-prototypu-i-fabryki) | Dane testowe: port seedu prototypu i fabryki | 8 | 10,1 | niskie | **IMP-055** (poz. 3), **IMP-105** (poz. 23) | 24.11–27.11 |

**DEVOPS**

| Poz. | Zadanie | Tytuł | h | h z buf. | Ryzyko | Zależności | Plan |
|---|---|---|---|---|---|---|---|
| 1 | [IMP-009](../04-implementation-plans/01-fundamenty-i-devops.md#imp-009--terraform-rds-postgresql-18-i-role-bazy) | Terraform: RDS PostgreSQL 18 i role bazy | 10 | 14,4 | średnie | IMP-008 | 16.11–18.11 |
| 15 | [IMP-005](../04-implementation-plans/01-fundamenty-i-devops.md#imp-005--obraz-docker-apiworker) | Obraz Docker API/worker | 4 | 5,1 | niskie | IMP-001, **IMP-100** (poz. 7) | 18.11–19.11 |
| 18 | [IMP-003](../04-implementation-plans/01-fundamenty-i-devops.md#imp-003--ci-na-pr-github-actions) | CI na PR (GitHub Actions) | 8 | 10,1 | niskie | IMP-001, IMP-002 | 19.11–20.11 |
| 24 | [IMP-011](../04-implementation-plans/01-fundamenty-i-devops.md#imp-011--terraform-ecs-fargate-alb-dns-certyfikaty) | Terraform: ECS Fargate, ALB, DNS, certyfikaty | 12 | 17,3 | średnie | IMP-008, **IMP-009** (poz. 1), IMP-010, **IMP-005** (poz. 15) | 20.11–25.11 |
| 33 | [IMP-004](../04-implementation-plans/01-fundamenty-i-devops.md#imp-004--ci-testy-integracyjne-z-testcontainers) | CI: testy integracyjne z Testcontainers | 4 | 5,1 | niskie | **IMP-003** (poz. 18) | 25.11–26.11 |
| 35 | [IMP-012](../04-implementation-plans/01-fundamenty-i-devops.md#imp-012--terraform-s3-eksporty-strona-statyczna-i-cloudfront) | Terraform: S3 (eksporty, strona statyczna) i CloudFront | 6 | 7,6 | niskie | IMP-007 | 26.11–27.11 |

**DESIGN**

| Poz. | Zadanie | Tytuł | h | h z buf. | Ryzyko | Zależności | Plan |
|---|---|---|---|---|---|---|---|
| 6 | [IMP-652](../04-implementation-plans/15-design-i-akceptacje.md#imp-652--ikona-aplikacji-splash-statyczny-materiały-do-sklepów) | Ikona aplikacji, splash statyczny, materiały do sklepów | 8 | 10,1 | niskie | – | 16.11–26.11 |

**Demo / rezultat:** TC-SCORING-001…014 i TC-SCORING-031 (Node/Hermes) zielone w CI; CI na PR < 15 min; `terraform apply` środowiska `dev`; SCR-SYS-01 i komponenty Nocturne w buildzie deweloperskim; zapis arkusza do lokalnej SQLite z wpisem w outboxie (testy jednostkowe).

**Ryzyka sprintu:** RT-02 (NestJS 12 – pierwsze moduły), RT-03 (weryfikatory PIN w IMP-130 – wspólne wektory z mobile), R-02 (IMP-350, IMP-353), R-08 (złożoność AWS), R-09 (IMP-056). (rejestr: [05-rejestr-ryzyk.md](05-rejestr-ryzyk.md))

**Uwagi:** Kamień milowy M1 (27.11.2026). QA dołącza w wymiarze 0,5 etatu: fikstury (IMP-450), testy właściwości (IMP-056), laboratorium urządzeń, przegląd planu testów. Projektant: ikona i materiały (IMP-652).

### SP-03

**30.11.2026 – 11.12.2026** · dni robocze: 10 (efektywnie 10) · zadań: 35

**Cel sprintu:** Kontrakty i OpenAPI 3.1, urządzenia i migawka w API, audyt i outbox zdarzeń w transakcji, CD na `dev`, spike realtime przez ALB; komponent `Sheet`, powłoka trybu sędziego, kolejka i formularz oceny z suwakiem; harness testów integracyjnych, testy kontraktowe i generator macierzy uprawnień.

| Rola | h (bez buforów) | h z buforem | Pojemność (h) | Obciążenie |
|---|---|---|---|---|
| BE | 86 | 115,3 | 120 | 96% |
| MOB | 76 | 112,5 | 120 | 94% |
| QA | 20 | 25,3 | 60 | 42% |
| DEVOPS | 42 | 56,9 | 60 | 95% |
| DESIGN | 0 | 0 | 12 | 0% |

**BE**

| Poz. | Zadanie | Tytuł | h | h z buf. | Ryzyko | Zależności | Plan |
|---|---|---|---|---|---|---|---|
| 2 | [IMP-109](../04-implementation-plans/03-backend-konto-i-konfiguracja-turnieju.md#imp-109--audyt-dziennik-zmian-i-outbox-zdarzeń-w-transakcji) | Audyt, dziennik zmian i outbox zdarzeń w transakcji | 8 | 11,5 | średnie | IMP-107 | 30.11–01.12 |
| 6 | [IMP-604](../04-implementation-plans/14-spike.md#imp-604--spike-socketio-przez-alb-i-klient-rn-w-tle-limit-8-h) | SPIKE: Socket.IO przez ALB i klient RN w tle (limit 8 h) (FULL → BE) | 8 | 11,5 | średnie | IMP-011, IMP-600 | 30.11–01.12 |
| 7 | [IMP-061](../04-implementation-plans/02-pakiety-wspoldzielone.md#imp-061--contracts-turnieje-kategorie-kryteria-kary) | contracts: turnieje, kategorie, kryteria, kary | 6 | 7,6 | niskie | IMP-059 | 01.12–03.12 |
| 8 | [IMP-140](../04-implementation-plans/04-backend-urzadzenia-ocenianie-synchronizacja.md#imp-140--kody-parowania) | Kody parowania | 4 | 5,1 | niskie | IMP-105, IMP-062 | 01.12–02.12 |
| 11 | [IMP-141](../04-implementation-plans/04-backend-urzadzenia-ocenianie-synchronizacja.md#imp-141--urządzenia-parowanie-token-lista-nazwa-unieważnienie) | Urządzenia: parowanie, token, lista, nazwa, unieważnienie | 8 | 11,5 | średnie | **IMP-140** (poz. 8), IMP-113, IMP-112 | 02.12–04.12 |
| 13 | [IMP-060](../04-implementation-plans/02-pakiety-wspoldzielone.md#imp-060--contracts-konto-i-uwierzytelnianie) | contracts: konto i uwierzytelnianie | 4 | 5,1 | niskie | IMP-059 | 03.12–04.12 |
| 15 | [IMP-064](../04-implementation-plans/02-pakiety-wspoldzielone.md#imp-064--contracts-wyniki-oceny-odrzucenia-eksporty-audyt) | contracts: wyniki, oceny, odrzucenia, eksporty, audyt | 4 | 5,1 | niskie | IMP-059 | 04.12–04.12 |
| 18 | [IMP-144](../04-implementation-plans/04-backend-urzadzenia-ocenianie-synchronizacja.md#imp-144--migawka-urządzenia) | Migawka urządzenia | 8 | 11,5 | średnie | **IMP-141** (poz. 11), IMP-130, IMP-063 | 04.12–08.12 |
| 19 | [IMP-066](../04-implementation-plans/02-pakiety-wspoldzielone.md#imp-066--contracts-generowanie-openapi-31-i-kontrola-zmian-łamiących) | contracts: generowanie OpenAPI 3.1 i kontrola zmian łamiących | 8 | 10,1 | niskie | **IMP-060** (poz. 13), **IMP-061** (poz. 7), IMP-062, IMP-063, **IMP-064** (poz. 15) | 04.12–08.12 |
| 23 | [IMP-104](../04-implementation-plans/03-backend-konto-i-konfiguracja-turnieju.md#imp-104--migracja-1-konto-i-tokeny) | Migracja 1: konto i tokeny | 4 | 5,1 | niskie | IMP-103, IMP-006† | 08.12–09.12 |
| 25 | [IMP-102](../04-implementation-plans/03-backend-konto-i-konfiguracja-turnieju.md#imp-102--walidacja-standard-schema-i-test-zgodności-tras-z-openapi) | Walidacja Standard Schema i test zgodności tras z OpenAPI | 6 | 8,6 | średnie | IMP-101, IMP-058 | 08.12–10.12 |
| 27 | [IMP-018](../04-implementation-plans/01-fundamenty-i-devops.md#imp-018--logowanie-strukturalne-i-korelacja-żądań) | Logowanie strukturalne i korelacja żądań | 6 | 7,6 | niskie | IMP-100 | 09.12–10.12 |
| 29 | [IMP-110](../04-implementation-plans/03-backend-konto-i-konfiguracja-turnieju.md#imp-110--idempotency-key-dla-post-organizatora) | Idempotency-Key dla POST organizatora | 5 | 6,3 | niskie | **IMP-104** (poz. 23), IMP-101 | 10.12–11.12 |
| 33 | [IMP-108](../04-implementation-plans/03-backend-konto-i-konfiguracja-turnieju.md#imp-108--repozytoria-z-kontekstem-właściciela-scoped-repository) | Repozytoria z kontekstem właściciela („scoped repository”) | 4 | 5,1 | niskie | IMP-103 | 10.12–11.12 |
| 35 | [IMP-111](../04-implementation-plans/03-backend-konto-i-konfiguracja-turnieju.md#imp-111--optymistyczna-współbieżność-etag--if-match) | Optymistyczna współbieżność (ETag / If-Match) | 3 | 3,8 | niskie | IMP-101 | 11.12–11.12 |

**MOB**

| Poz. | Zadanie | Tytuł | h | h z buf. | Ryzyko | Zależności | Plan |
|---|---|---|---|---|---|---|---|
| 3 | [IMP-206](../04-implementation-plans/06-mobile-fundamenty-i-design-system.md#imp-206--komponent-sheet-bottom-sheet--implementacja-własna) | Komponent Sheet (bottom sheet) – implementacja własna | 16 | 27,6 | wysokie | IMP-203, IMP-602 | 30.11–04.12 |
| 4 | [IMP-300](../04-implementation-plans/08-mobile-ekrany-sedziego.md#imp-300--powłoka-trybu-sędziego-i-judgeheader) | Powłoka trybu sędziego i JudgeHeader | 8 | 11,5 | średnie | IMP-213, IMP-208, IMP-204, IMP-070†, IMP-219† | 30.11–01.12 |
| 9 | [IMP-358](../04-implementation-plans/09-mobile-offline-i-synchronizacja.md#imp-358--magazyn-stanu-synchronizacji-zustand) | Magazyn stanu synchronizacji (Zustand) | 4 | 5,1 | niskie | IMP-353 | 01.12–02.12 |
| 12 | [IMP-308](../04-implementation-plans/08-mobile-ekrany-sedziego.md#imp-308--scr-jdg-04--kolejka-zawodniczek) | SCR-JDG-04 – kolejka zawodniczek | 8 | 10,1 | niskie | **IMP-300** (poz. 4), IMP-350, **IMP-358** (poz. 9) | 02.12–04.12 |
| 16 | [IMP-309](../04-implementation-plans/08-mobile-ekrany-sedziego.md#imp-309--scr-jdg-05--układ-formularza-oceny) | SCR-JDG-05 – układ formularza oceny | 6 | 7,6 | niskie | **IMP-308** (poz. 12) | 04.12–07.12 |
| 17 | [IMP-207](../04-implementation-plans/06-mobile-fundamenty-i-design-system.md#imp-207--pola-formularzy-textfield-numberfield-textarea-choicechip-pole-daty) | Pola formularzy: TextField, NumberField, TextArea, ChoiceChip, pole daty | 12 | 17,3 | średnie | IMP-203, IMP-069 | 04.12–09.12 |
| 21 | [IMP-310](../04-implementation-plans/08-mobile-ekrany-sedziego.md#imp-310--scoreslider-i-przyciski--kryterium) | ScoreSlider i przyciski −/+ kryterium | 12 | 20,7 | wysokie | **IMP-309** (poz. 16) | 07.12–11.12 |
| 28 | [IMP-067](../04-implementation-plans/02-pakiety-wspoldzielone.md#imp-067--klient-api-dla-aplikacji-typy-z-openapi) | Klient API dla aplikacji (typy z OpenAPI) | 4 | 5,1 | niskie | **IMP-066** (poz. 19), IMP-200 | 09.12–10.12 |
| 32 | [IMP-023](../04-implementation-plans/01-fundamenty-i-devops.md#imp-023--ci-mobile-buildy-eas-i-publikacja-aktualizacji) | CI mobile: buildy EAS i publikacja aktualizacji | 6 | 7,6 | niskie | IMP-022, IMP-003 | 10.12–11.12 |

**QA**

| Poz. | Zadanie | Tytuł | h | h z buf. | Ryzyko | Zależności | Plan |
|---|---|---|---|---|---|---|---|
| 5 | [IMP-451](../04-implementation-plans/11-qa-i-automatyzacja-testow.md#imp-451--harness-testów-integracyjnych-api) | Harness testów integracyjnych API | 6 | 7,6 | niskie | IMP-103, IMP-113, IMP-004, IMP-450 | 30.11–01.12 |
| 24 | [IMP-453](../04-implementation-plans/11-qa-i-automatyzacja-testow.md#imp-453--generator-testów-macierzy-uprawnień) | Generator testów macierzy uprawnień | 8 | 10,1 | niskie | **IMP-451** (poz. 5), **IMP-066** (poz. 19) | 08.12–10.12 |
| 31 | [IMP-452](../04-implementation-plans/11-qa-i-automatyzacja-testow.md#imp-452--testy-kontraktowe-odpowiedzi-i-zgodności-wstecznej) | Testy kontraktowe odpowiedzi i zgodności wstecznej | 6 | 7,6 | niskie | **IMP-451** (poz. 5), **IMP-066** (poz. 19) | 10.12–11.12 |

**DEVOPS**

| Poz. | Zadanie | Tytuł | h | h z buf. | Ryzyko | Zależności | Plan |
|---|---|---|---|---|---|---|---|
| 1 | [IMP-016](../04-implementation-plans/01-fundamenty-i-devops.md#imp-016--cd-build--ecr--migracje--wdrożenie) | CD: build → ECR → migracje → wdrożenie | 10 | 14,4 | średnie | IMP-011, IMP-003, IMP-103 | 30.11–02.12 |
| 10 | [IMP-013](../04-implementation-plans/01-fundamenty-i-devops.md#imp-013--terraform-ses-domena-dkim-dmarc-i-wyjście-z-sandboxa) | Terraform: SES (domena, DKIM, DMARC) i wyjście z sandboxa | 6 | 8,6 | średnie | IMP-007 | 02.12–03.12 |
| 14 | [IMP-025](../04-implementation-plans/01-fundamenty-i-devops.md#imp-025--kopie-zapasowe-runbook-i-test-odtworzenia) | Kopie zapasowe: runbook i test odtworzenia | 6 | 8,6 | średnie | IMP-009, **IMP-016** (poz. 1) | 03.12–07.12 |
| 20 | [IMP-015](../04-implementation-plans/01-fundamenty-i-devops.md#imp-015--terraform-waf-guardduty-cloudtrail) | Terraform: WAF, GuardDuty, CloudTrail | 6 | 7,6 | niskie | IMP-011 | 07.12–08.12 |
| 22 | [IMP-026](../04-implementation-plans/01-fundamenty-i-devops.md#imp-026--zarządzanie-zależnościami-i-sbom) | Zarządzanie zależnościami i SBOM | 3 | 3,8 | niskie | IMP-003 | 08.12–09.12 |
| 26 | [IMP-027](../04-implementation-plans/01-fundamenty-i-devops.md#imp-027--sast-semgrep-i-dast-zap-w-ci) | SAST (Semgrep) i DAST (ZAP) w CI | 5 | 6,3 | niskie | IMP-003, **IMP-016** (poz. 1), **IMP-066** (poz. 19) | 09.12–10.12 |
| 30 | [IMP-029](../04-implementation-plans/01-fundamenty-i-devops.md#imp-029--kontrola-kosztów-harmonogram-staging-i-alarmy) | Kontrola kosztów: harmonogram staging i alarmy | 3 | 3,8 | niskie | IMP-011 | 10.12–10.12 |
| 34 | [IMP-405](../04-implementation-plans/10-bezpieczenstwo-i-rodo.md#imp-405--rotacja-kluczy-jwt--procedura) | Rotacja kluczy JWT – procedura | 3 | 3,8 | niskie | IMP-113, IMP-014 | 10.12–11.12 |

**Demo / rezultat:** Automatyczne wdrożenie `main` → `dev` z migracjami; opublikowany `openapi.json` i test zgodności tras; wynik spike’u IMP-604 (Socket.IO przez ALB, klient RN w tle); formularz oceny z `ScoreSlider` na Tab A8 z pomiarem płynności (wstępnie TC-PERF-004); `Sheet` w buildzie deweloperskim.

**Ryzyka sprintu:** RT-05 (własny `Sheet` – IMP-206), R-01 (IMP-310 – ryzyko wysokie), R-03 (wynik IMP-604), RT-08 (wniosek SES production w IMP-013), R-08. (rejestr: [05-rejestr-ryzyk.md](05-rejestr-ryzyk.md))

**Uwagi:** Spike IMP-604 w 5. tygodniu – wcześniej niemożliwy (zależy od IMP-011; [PM-02](99-raport-spojnosci.md#2-znaleziska)). Zamówienie pentestu (ZZ-06) najpóźniej do 18.12.2026.

### SP-04

**14.12.2026 – 25.12.2026** · dni robocze: 8 (efektywnie 6,5) · zadań: 19 · kamień milowy: M2 (23.12)

**Cel sprintu:** API konfiguracji turnieju (turnieje, kategorie z szablonu, kryteria i kary, start kategorii), dziennik zmian i synchronizacja push na serwerze; warstwa API klienta, cache, klient realtime, nawigacja, DevCatalog, splash; Maestro w CI i spike regresji wizualnej.

| Rola | h (bez buforów) | h z buforem | Pojemność (h) | Obciążenie |
|---|---|---|---|---|
| BE | 55 | 74,6 | 78 | 96% |
| MOB | 55 | 75,1 | 78 | 96% |
| QA | 16 | 22 | 39 | 56% |
| DEVOPS | 14 | 19,4 | 19,5 | 100% |
| DESIGN | 0 | 0 | 7,8 | 0% |

**BE**

| Poz. | Zadanie | Tytuł | h | h z buf. | Ryzyko | Zależności | Plan |
|---|---|---|---|---|---|---|---|
| 2 | [IMP-121](../04-implementation-plans/03-backend-konto-i-konfiguracja-turnieju.md#imp-121--turnieje-lista-utworzenie-szczegóły) | Turnieje: lista, utworzenie, szczegóły | 8 | 10,1 | niskie | IMP-105, IMP-108, IMP-109, IMP-110, IMP-061, IMP-055, IMP-102†, IMP-018† | 14.12–15.12 |
| 3 | [IMP-145](../04-implementation-plans/04-backend-urzadzenia-ocenianie-synchronizacja.md#imp-145--dziennik-zmian-i-pobieranie-zmian) | Dziennik zmian i pobieranie zmian | 8 | 11,5 | średnie | IMP-109, IMP-144 | 14.12–15.12 |
| 8 | [IMP-124](../04-implementation-plans/03-backend-konto-i-konfiguracja-turnieju.md#imp-124--kategorie-tworzenie-z-szablonu-odczyt-edycja-usunięcie) | Kategorie: tworzenie z szablonu, odczyt, edycja, usunięcie | 8 | 10,1 | niskie | **IMP-121** (poz. 2), IMP-052, IMP-061 | 15.12–17.12 |
| 9 | [IMP-146](../04-implementation-plans/04-backend-urzadzenia-ocenianie-synchronizacja.md#imp-146--sync-push-paczki-idempotencja-transakcje-per-mutacja) | Sync push: paczki, idempotencja, transakcje per mutacja | 8 | 13,8 | wysokie | **IMP-145** (poz. 3), IMP-063 | 15.12–18.12 |
| 12 | [IMP-125](../04-implementation-plans/03-backend-konto-i-konfiguracja-turnieju.md#imp-125--kryteria-i-kary--crud-z-blokadą-po-starcie) | Kryteria i kary – CRUD z blokadą po starcie | 8 | 10,1 | niskie | **IMP-124** (poz. 8) | 17.12–21.12 |
| 14 | [IMP-122](../04-implementation-plans/03-backend-konto-i-konfiguracja-turnieju.md#imp-122--turnieje-edycja-usunięcie-start-ochrona-turnieju-zakończonego) | Turnieje: edycja, usunięcie, start, ochrona turnieju zakończonego | 6 | 7,6 | niskie | **IMP-121** (poz. 2), IMP-111 | 18.12–21.12 |
| 17 | [IMP-126](../04-implementation-plans/03-backend-konto-i-konfiguracja-turnieju.md#imp-126--start-kategorii-warunki-panel-auto-start-turnieju) | Start kategorii: warunki, panel, auto-start turnieju | 6 | 7,6 | niskie | **IMP-125** (poz. 12), IMP-130 | 21.12–23.12 |
| 18 | [IMP-120](../04-implementation-plans/03-backend-konto-i-konfiguracja-turnieju.md#imp-120--konfiguracja-aplikacji-i-minimalna-wersja) | Konfiguracja aplikacji i minimalna wersja | 3 | 3,8 | niskie | IMP-100, IMP-060 | 21.12–23.12 |

**MOB**

| Poz. | Zadanie | Tytuł | h | h z buf. | Ryzyko | Zależności | Plan |
|---|---|---|---|---|---|---|---|
| 4 | [IMP-214](../04-implementation-plans/06-mobile-fundamenty-i-design-system.md#imp-214--warstwa-api-klienta-tokeny-odświeżanie-błędy) | Warstwa API klienta: tokeny, odświeżanie, błędy | 8 | 11,5 | średnie | IMP-067, IMP-069 | 14.12–15.12 |
| 5 | [IMP-220](../04-implementation-plans/06-mobile-fundamenty-i-design-system.md#imp-220--struktura-tras-expo-router-i-nawigacja) | Struktura tras Expo Router i nawigacja | 5 | 6,3 | niskie | IMP-213 | 14.12–15.12 |
| 7 | [IMP-211](../04-implementation-plans/06-mobile-fundamenty-i-design-system.md#imp-211--splash-z-animacją-tancerki-polespinner) | Splash z animacją tancerki (PoleSpinner) | 16 | 23 | średnie | IMP-202, IMP-606 | 15.12–18.12 |
| 10 | [IMP-215](../04-implementation-plans/06-mobile-fundamenty-i-design-system.md#imp-215--tanstack-query-cache-mmkv-i-tryb-offline-organizatora) | TanStack Query, cache MMKV i tryb offline organizatora | 8 | 10,1 | niskie | **IMP-214** (poz. 4), IMP-208 | 15.12–17.12 |
| 13 | [IMP-216](../04-implementation-plans/06-mobile-fundamenty-i-design-system.md#imp-216--klient-realtime-z-fallbackiem-na-odpytywanie) | Klient realtime z fallbackiem na odpytywanie | 8 | 11,5 | średnie | **IMP-214** (poz. 4), IMP-065, IMP-604 | 17.12–22.12 |
| 16 | [IMP-212](../04-implementation-plans/06-mobile-fundamenty-i-design-system.md#imp-212--devcatalog--katalog-komponentów-tylko-development) | DevCatalog – katalog komponentów (tylko development) | 6 | 7,6 | niskie | IMP-205, IMP-206, IMP-207, IMP-208, IMP-209 | 18.12–23.12 |
| 19 | [IMP-311](../04-implementation-plans/08-mobile-ekrany-sedziego.md#imp-311--penaltycounter) | PenaltyCounter | 4 | 5,1 | niskie | IMP-309 | 22.12–23.12 |

**QA**

| Poz. | Zadanie | Tytuł | h | h z buf. | Ryzyko | Zależności | Plan |
|---|---|---|---|---|---|---|---|
| 6 | [IMP-454](../04-implementation-plans/11-qa-i-automatyzacja-testow.md#imp-454--maestro-struktura-identyfikatory-uruchamianie-w-ci) | Maestro: struktura, identyfikatory, uruchamianie w CI | 10 | 14,4 | średnie | IMP-023, IMP-450 | 14.12–16.12 |
| 11 | [IMP-608](../04-implementation-plans/14-spike.md#imp-608--spike-regresja-wizualna-w-ci-limit-6-h) | SPIKE: regresja wizualna w CI (limit 6 h) | 6 | 7,6 | niskie | **IMP-454** (poz. 6) | 16.12–17.12 |

**DEVOPS**

| Poz. | Zadanie | Tytuł | h | h z buf. | Ryzyko | Zależności | Plan |
|---|---|---|---|---|---|---|---|
| 1 | [IMP-019](../04-implementation-plans/01-fundamenty-i-devops.md#imp-019--metryki-ślady-dashboard-i-alarmy) | Metryki, ślady, dashboard i alarmy | 10 | 14,4 | średnie | IMP-011, IMP-018 | 14.12–18.12 |
| 15 | [IMP-017](../04-implementation-plans/01-fundamenty-i-devops.md#imp-017--okna-zamrożenia-wydań-freeze-guard) | Okna zamrożenia wydań (freeze-guard) | 4 | 5,1 | niskie | IMP-016, IMP-023 | 18.12–23.12 |

**Demo / rezultat:** Na `dev`: utworzenie turnieju, kategorii z szablonu, kryteriów i start kategorii przez API (TC-API); DevCatalog z komponentami Nocturne; pierwszy przebieg Maestro w CI; dashboard i alarmy (IMP-019).

**Ryzyka sprintu:** R-02 (IMP-146 – ryzyko wysokie), R-07 (splash IMP-211), RT-09 (urządzenia do Maestro), RP-02 (okres świąteczny – pojemność ok. 65% zwykłej). (rejestr: [05-rejestr-ryzyk.md](05-rejestr-ryzyk.md))

**Uwagi:** 24–25.12 – święta; 21–23.12 pojemność 50% (ZAL-04). Kamień milowy M2 (23.12.2026 – ostatni dzień roboczy sprintu). Demo sprintu w środę 23.12.

### SP-05

**28.12.2026 – 08.01.2027** · dni robocze: 7 (efektywnie 4,5) · zadań: 14

**Cel sprintu:** Konto organizatora (rejestracja, logowanie) i sesje sędziów w API, dane `staging` (`FX-MAX`); SyncEngine – wysyłka, lista turniejów, klawiatura PIN, stopka formularza; regresja wizualna; kanarek API, lista kontrolna wydania i runbook dnia zawodów.

| Rola | h (bez buforów) | h z buforem | Pojemność (h) | Obciążenie |
|---|---|---|---|---|
| BE | 39 | 53,5 | 54 | 99% |
| MOB | 35 | 48,9 | 54 | 91% |
| QA | 10 | 14,4 | 27 | 53% |
| DEVOPS | 10 | 12,6 | 13,5 | 94% |
| DESIGN | 0 | 0 | 5,4 | 0% |

**BE**

| Poz. | Zadanie | Tytuł | h | h z buf. | Ryzyko | Zależności | Plan |
|---|---|---|---|---|---|---|---|
| 2 | [IMP-114](../04-implementation-plans/03-backend-konto-i-konfiguracja-turnieju.md#imp-114--rejestracja-konta-argon2id-hibp-regulamin) | Rejestracja konta (Argon2id, HIBP, regulamin) | 8 | 11,5 | średnie | IMP-104, IMP-060, IMP-112, IMP-102†, IMP-018† | 28.12–04.01 |
| 3 | [IMP-143](../04-implementation-plans/04-backend-urzadzenia-ocenianie-synchronizacja.md#imp-143--sesje-sędziów-online-i-limity-prób-pin) | Sesje sędziów online i limity prób PIN | 8 | 11,5 | średnie | IMP-141, IMP-130 | 28.12–04.01 |
| 7 | [IMP-028](../04-implementation-plans/01-fundamenty-i-devops.md#imp-028--dane-staging-seed-syntetyczny-i-turniej-maksymalny) | Dane staging: seed syntetyczny i turniej maksymalny | 6 | 7,6 | niskie | IMP-450, IMP-016 | 04.01–07.01 |
| 8 | [IMP-116](../04-implementation-plans/03-backend-konto-i-konfiguracja-turnieju.md#imp-116--logowanie-blokada-konta-refresh-z-rotacją-wylogowanie) | Logowanie, blokada konta, refresh z rotacją, wylogowanie | 8 | 11,5 | średnie | **IMP-114** (poz. 2), IMP-113 | 04.01–08.01 |
| 13 | [IMP-021](../04-implementation-plans/01-fundamenty-i-devops.md#imp-021--sentry-region-ue--api-i-mobile) | Sentry (region UE) – API i mobile (FULL → BE) | 6 | 7,6 | niskie | IMP-100, IMP-200 | 07.01–08.01 |
| 14 | [IMP-132](../04-implementation-plans/03-backend-konto-i-konfiguracja-turnieju.md#imp-132--limity-turnieju-nfr-801) | Limity turnieju (NFR-801) | 3 | 3,8 | niskie | IMP-124 | 08.01–08.01 |

**MOB**

| Poz. | Zadanie | Tytuł | h | h z buf. | Ryzyko | Zależności | Plan |
|---|---|---|---|---|---|---|---|
| 4 | [IMP-255](../04-implementation-plans/07-mobile-ekrany-organizatora.md#imp-255--scr-org-01--lista-turniejów) | SCR-ORG-01 – lista turniejów | 10 | 12,6 | niskie | IMP-205, IMP-215, IMP-121, IMP-070†, IMP-219† | 28.12–05.01 |
| 5 | [IMP-354](../04-implementation-plans/09-mobile-offline-i-synchronizacja.md#imp-354--syncengine--wysyłka-push) | SyncEngine – wysyłka (push) | 10 | 17,3 | wysokie | IMP-353, IMP-146 | 28.12–07.01 |
| 9 | [IMP-217](../04-implementation-plans/06-mobile-fundamenty-i-design-system.md#imp-217--ekran-wymuszonej-aktualizacji) | Ekran wymuszonej aktualizacji | 3 | 3,8 | niskie | IMP-214, IMP-120 | 05.01–07.01 |
| 11 | [IMP-312](../04-implementation-plans/08-mobile-ekrany-sedziego.md#imp-312--komentarz-i-stopka-z-wynikiem-na-żywo) | Komentarz i stopka z wynikiem na żywo | 6 | 7,6 | niskie | IMP-310, IMP-311 | 07.01–08.01 |
| 12 | [IMP-304](../04-implementation-plans/08-mobile-ekrany-sedziego.md#imp-304--scr-jdg-02--klawiatura-pin-i-kropki) | SCR-JDG-02 – klawiatura PIN i kropki | 6 | 7,6 | niskie | IMP-300, IMP-203 | 07.01–08.01 |

**QA**

| Poz. | Zadanie | Tytuł | h | h z buf. | Ryzyko | Zależności | Plan |
|---|---|---|---|---|---|---|---|
| 6 | [IMP-459](../04-implementation-plans/11-qa-i-automatyzacja-testow.md#imp-459--regresja-wizualna-zrzuty--odiff) | Regresja wizualna (zrzuty + odiff) | 10 | 14,4 | średnie | IMP-212, IMP-454, IMP-608 | 28.12–05.01 |

**DEVOPS**

| Poz. | Zadanie | Tytuł | h | h z buf. | Ryzyko | Zależności | Plan |
|---|---|---|---|---|---|---|---|
| 1 | [IMP-020](../04-implementation-plans/01-fundamenty-i-devops.md#imp-020--cloudwatch-synthetics--kanarek-api) | CloudWatch Synthetics – kanarek API | 6 | 7,6 | niskie | IMP-016, IMP-017 | 28.12–07.01 |
| 10 | [IMP-554](../04-implementation-plans/13-wydanie.md#imp-554--lista-kontrolna-wydania-i-runbook-dnia-zawodów) | Lista kontrolna wydania i runbook dnia zawodów | 4 | 5,1 | niskie | IMP-019, IMP-017 | 07.01–08.01 |

**Demo / rezultat:** SyncEngine wysyła kolejkę z tabletu do API `dev` (idempotencja przy ponowieniu); lista turniejów (SCR-ORG-01) z danymi z API; rejestracja i logowanie przez API; `staging` z danymi `FX-MAX`; pierwsze wzorce regresji wizualnej.

**Ryzyka sprintu:** R-02 (IMP-354 – ryzyko wysokie), RT-02, RP-02 (pojemność ok. 45% – urlopy świąteczne). (rejestr: [05-rejestr-ryzyk.md](05-rejestr-ryzyk.md))

**Uwagi:** 31.12 (dzień wolny za 26.12 – ZAL-03), 1.01 i 6.01 – wolne; 28–30.12 i 4–5.01 pojemność 50%. Sprint o najniższej pojemności – wyłącznie zadania bez zależności zewnętrznych.

### SP-06

**11.01.2027 – 22.01.2027** · dni robocze: 10 (efektywnie 10) · zadań: 29 · kamień milowy: M3 (22.01)

**Cel sprintu:** Ocenianie end-to-end po stronie serwera (SUBMIT_SCORE_SHEET, przeliczenie wyników, blokada kategorii z sumą kontrolną, zakończenie turnieju, realtime) i logowanie w aplikacji: organizator (logowanie, rejestracja, nowy turniej, szczegóły, sędziowie, konto, rama kategorii) oraz sędzia (PIN online/offline, zatwierdzenie oceny).

| Rola | h (bez buforów) | h z buforem | Pojemność (h) | Obciążenie |
|---|---|---|---|---|
| BE | 83 | 118,1 | 120 | 98% |
| MOB | 86 | 116,5 | 120 | 97% |
| QA | 12 | 16,6 | 60 | 28% |
| DEVOPS | 0 | 0 | 30 | 0% |
| DESIGN | 6 | 7,6 | 12 | 63% |

**BE**

| Poz. | Zadanie | Tytuł | h | h z buf. | Ryzyko | Zależności | Plan |
|---|---|---|---|---|---|---|---|
| 2 | [IMP-118](../04-implementation-plans/03-backend-konto-i-konfiguracja-turnieju.md#imp-118--profil-i-usunięcie-konta) | Profil i usunięcie konta | 6 | 7,6 | niskie | IMP-116 | 11.01–12.01 |
| 3 | [IMP-128](../04-implementation-plans/03-backend-konto-i-konfiguracja-turnieju.md#imp-128--zawodniczki-lista-z-licznikami-dodawanie-edycja) | Zawodniczki: lista z licznikami, dodawanie, edycja | 8 | 10,1 | niskie | IMP-124, IMP-062 | 11.01–12.01 |
| 8 | [IMP-131](../04-implementation-plans/03-backend-konto-i-konfiguracja-turnieju.md#imp-131--reset-pin-u-sędziego) | Reset PIN-u sędziego | 4 | 5,1 | niskie | IMP-130, IMP-143 | 12.01–13.01 |
| 9 | [IMP-115](../04-implementation-plans/03-backend-konto-i-konfiguracja-turnieju.md#imp-115--weryfikacja-e-maila-i-ponowne-wysłanie-kodu) | Weryfikacja e-maila i ponowne wysłanie kodu | 4 | 5,1 | niskie | IMP-114 | 12.01–13.01 |
| 11 | [IMP-150](../04-implementation-plans/04-backend-urzadzenia-ocenianie-synchronizacja.md#imp-150--serwis-przeliczania-wyników-kategorii) | Serwis przeliczania wyników kategorii | 8 | 11,5 | średnie | IMP-106, IMP-055 | 13.01–15.01 |
| 13 | [IMP-142](../04-implementation-plans/04-backend-urzadzenia-ocenianie-synchronizacja.md#imp-142--heartbeat-urządzeń-i-stan-online) | Heartbeat urządzeń i stan online | 5 | 6,3 | niskie | IMP-141 | 13.01–14.01 |
| 15 | [IMP-154](../04-implementation-plans/04-backend-urzadzenia-ocenianie-synchronizacja.md#imp-154--gateway-realtime-socketio) | Gateway realtime (Socket.IO) | 8 | 11,5 | średnie | IMP-113, IMP-010 | 14.01–18.01 |
| 16 | [IMP-127](../04-implementation-plans/03-backend-konto-i-konfiguracja-turnieju.md#imp-127--blokada-i-odblokowanie-kategorii-z-sumą-kontrolną) | Blokada i odblokowanie kategorii z sumą kontrolną | 8 | 13,8 | wysokie | IMP-126, **IMP-150** (poz. 11), IMP-057, **IMP-142** (poz. 13) | 15.01–19.01 |
| 19 | [IMP-129](../04-implementation-plans/03-backend-konto-i-konfiguracja-turnieju.md#imp-129--zawodniczki-wycofanie-przywrócenie-usunięcie) | Zawodniczki: wycofanie, przywrócenie, usunięcie | 5 | 6,3 | niskie | **IMP-128** (poz. 3), **IMP-150** (poz. 11) | 18.01–19.01 |
| 21 | [IMP-123](../04-implementation-plans/03-backend-konto-i-konfiguracja-turnieju.md#imp-123--turnieje-zakończenie-auto-blokada-nierozegrane-sesje) | Turnieje: zakończenie (auto-blokada, nierozegrane, sesje) | 6 | 8,6 | średnie | IMP-122, **IMP-127** (poz. 16), IMP-143 | 19.01–20.01 |
| 22 | [IMP-147](../04-implementation-plans/04-backend-urzadzenia-ocenianie-synchronizacja.md#imp-147--mutacja-submit_score_sheet) | Mutacja SUBMIT_SCORE_SHEET | 10 | 17,3 | wysokie | IMP-146, **IMP-150** (poz. 11), IMP-143 | 19.01–22.01 |
| 25 | [IMP-155](../04-implementation-plans/04-backend-urzadzenia-ocenianie-synchronizacja.md#imp-155--publikator-zdarzeń-z-outboxu) | Publikator zdarzeń z outboxu | 6 | 8,6 | średnie | **IMP-154** (poz. 15), IMP-109 | 20.01–22.01 |
| 27 | [IMP-175](../04-implementation-plans/05-backend-eksport-audyt-rodo.md#imp-175--odczyt-dziennika-audytu) | Odczyt dziennika audytu | 3 | 3,8 | niskie | IMP-109 | 22.01–22.01 |
| 29 | [IMP-153](../04-implementation-plans/04-backend-urzadzenia-ocenianie-synchronizacja.md#imp-153--własne-arkusze-sędziego) | Własne arkusze sędziego | 2 | 2,5 | niskie | **IMP-147** (poz. 22) | 22.01–22.01 |

**MOB**

| Poz. | Zadanie | Tytuł | h | h z buf. | Ryzyko | Zależności | Plan |
|---|---|---|---|---|---|---|---|
| 4 | [IMP-218](../04-implementation-plans/06-mobile-fundamenty-i-design-system.md#imp-218--integracja-sentry-w-aplikacji) | Integracja Sentry w aplikacji | 3 | 3,8 | niskie | IMP-021, IMP-200 | 11.01–11.01 |
| 5 | [IMP-257](../04-implementation-plans/07-mobile-ekrany-organizatora.md#imp-257--scr-org-03--szczegóły-turnieju) | SCR-ORG-03 – szczegóły turnieju | 12 | 15,2 | niskie | IMP-255, IMP-216, IMP-122 | 11.01–13.01 |
| 7 | [IMP-250](../04-implementation-plans/07-mobile-ekrany-organizatora.md#imp-250--scr-org-13--logowanie-i-sesja-organizatora) | SCR-ORG-13 – logowanie i sesja organizatora | 8 | 10,1 | niskie | IMP-207, IMP-214, IMP-220, IMP-116, IMP-650†, IMP-070†, IMP-219† | 11.01–13.01 |
| 12 | [IMP-273](../04-implementation-plans/07-mobile-ekrany-organizatora.md#imp-273--scr-org-14--sędziowie-i-urządzenia) | SCR-ORG-14 – sędziowie i urządzenia | 10 | 12,6 | niskie | IMP-209, IMP-130, IMP-141, IMP-216, IMP-650† | 13.01–15.01 |
| 14 | [IMP-313](../04-implementation-plans/08-mobile-ekrany-sedziego.md#imp-313--zatwierdzenie-oceny-i-auto-przejście) | Zatwierdzenie oceny i auto-przejście | 8 | 11,5 | średnie | IMP-312, IMP-353 | 13.01–15.01 |
| 17 | [IMP-277](../04-implementation-plans/07-mobile-ekrany-organizatora.md#imp-277--scr-org-21--konto) | SCR-ORG-21 – konto | 6 | 7,6 | niskie | **IMP-250** (poz. 7), **IMP-118** (poz. 2), IMP-120, IMP-650† | 15.01–18.01 |
| 18 | [IMP-305](../04-implementation-plans/08-mobile-ekrany-sedziego.md#imp-305--logowanie-sędziego-onlineoffline-i-limity-prób-scr-jdg-08) | Logowanie sędziego online/offline i limity prób (SCR-JDG-08) | 10 | 17,3 | wysokie | IMP-304, IMP-353, IMP-143, IMP-601, IMP-650† | 15.01–20.01 |
| 20 | [IMP-251](../04-implementation-plans/07-mobile-ekrany-organizatora.md#imp-251--scr-org-13--rejestracja) | SCR-ORG-13 – rejestracja | 6 | 7,6 | niskie | **IMP-250** (poz. 7), IMP-114, IMP-120, IMP-650† | 18.01–19.01 |
| 23 | [IMP-261](../04-implementation-plans/07-mobile-ekrany-organizatora.md#imp-261--scr-org-060708--rama-szczegółów-kategorii) | SCR-ORG-06/07/08 – rama szczegółów kategorii | 10 | 14,4 | średnie | IMP-209, **IMP-257** (poz. 5), IMP-126, **IMP-127** (poz. 16) | 19.01–22.01 |
| 24 | [IMP-256](../04-implementation-plans/07-mobile-ekrany-organizatora.md#imp-256--scr-org-02--nowy-turniej) | SCR-ORG-02 – nowy turniej | 6 | 7,6 | niskie | IMP-206, IMP-207, IMP-255 | 20.01–21.01 |
| 26 | [IMP-254](../04-implementation-plans/07-mobile-ekrany-organizatora.md#imp-254--scr-org-00--splash-organizatora-z-ładowaniem-danych) | SCR-ORG-00 – splash organizatora z ładowaniem danych | 4 | 5,1 | niskie | IMP-211, IMP-215, **IMP-250** (poz. 7) | 21.01–22.01 |
| 28 | [IMP-276](../04-implementation-plans/07-mobile-ekrany-organizatora.md#imp-276--akcje-urządzenia-zmiana-nazwy-i-odłączenie) | Akcje urządzenia: zmiana nazwy i odłączenie | 3 | 3,8 | niskie | **IMP-273** (poz. 12), IMP-650† | 22.01–22.01 |

**QA**

| Poz. | Zadanie | Tytuł | h | h z buf. | Ryzyko | Zależności | Plan |
|---|---|---|---|---|---|---|---|
| 6 | [IMP-404](../04-implementation-plans/10-bezpieczenstwo-i-rodo.md#imp-404--zestaw-testów-nadużyć) | Zestaw testów nadużyć | 8 | 11,5 | średnie | IMP-116, IMP-141, IMP-143, IMP-453 | 11.01–12.01 |
| 10 | [IMP-403](../04-implementation-plans/10-bezpieczenstwo-i-rodo.md#imp-403--testy-usuwania-pii-z-telemetrii) | Testy usuwania PII z telemetrii | 4 | 5,1 | niskie | IMP-018, **IMP-218** (poz. 4) | 12.01–13.01 |

**DESIGN**

| Poz. | Zadanie | Tytuł | h | h z buf. | Ryzyko | Zależności | Plan |
|---|---|---|---|---|---|---|---|
| 1 | [IMP-653](../04-implementation-plans/15-design-i-akceptacje.md#imp-653--akceptacja-wzorców-regresji-wizualnej) | Akceptacja wzorców regresji wizualnej | 6 | 7,6 | niskie | IMP-459 | 05.01–15.01 |

**Demo / rezultat:** Sędzia loguje się PIN-em na tablecie i zatwierdza ocenę → wynik przeliczony na serwerze; organizator loguje się w aplikacji, tworzy turniej, widzi szczegóły i listę sędziów; blokada kategorii z sumą SHA-256 (TC-API kategorii); testy nadużyć (IMP-404).

**Ryzyka sprintu:** R-02 i RT-03 (IMP-147, IMP-305 – ryzyko wysokie, przegląd TL), IMP-127 i IMP-261 na ścieżce krytycznej, RP-03 (MOB 97%). (rejestr: [05-rejestr-ryzyk.md](05-rejestr-ryzyk.md))

**Uwagi:** Kamień milowy M3 (22.01.2027). Projektant zatwierdza wzorce regresji wizualnej (IMP-653).

### SP-07

**25.01.2027 – 05.02.2027** · dni robocze: 10 (efektywnie 10) · zadań: 31

**Cel sprintu:** Organizator: kategorie, kryteria, zawodniczki, ranking na żywo, oceny zawodniczki, podgląd PDF, zakończenie turnieju, tryb offline; backend: odrzucone zgłoszenia, wyniki, e-maile, worker, eksporty, PDF, retencja RODO, strona statyczna; E2E organizatora i testy obciążeniowe.

| Rola | h (bez buforów) | h z buforem | Pojemność (h) | Obciążenie |
|---|---|---|---|---|
| BE | 88 | 117,4 | 120 | 98% |
| MOB | 88 | 115,8 | 120 | 97% |
| QA | 32 | 46 | 60 | 77% |
| DEVOPS | 0 | 0 | 30 | 0% |
| DESIGN | 0 | 0 | 12 | 0% |

**BE**

| Poz. | Zadanie | Tytuł | h | h z buf. | Ryzyko | Zależności | Plan |
|---|---|---|---|---|---|---|---|
| 1 | [IMP-149](../04-implementation-plans/04-backend-urzadzenia-ocenianie-synchronizacja.md#imp-149--odrzucone-zgłoszenia-zapis-lista-przyjęcie-odrzucenie) | Odrzucone zgłoszenia: zapis, lista, przyjęcie, odrzucenie | 8 | 11,5 | średnie | IMP-147 | 25.01–26.01 |
| 2 | [IMP-151](../04-implementation-plans/04-backend-urzadzenia-ocenianie-synchronizacja.md#imp-151--wyniki-endpointy-rankingu-kategorii-i-turnieju) | Wyniki: endpointy rankingu kategorii i turnieju | 5 | 6,3 | niskie | IMP-150, IMP-064 | 25.01–26.01 |
| 7 | [IMP-152](../04-implementation-plans/04-backend-urzadzenia-ocenianie-synchronizacja.md#imp-152--oceny-zawodniczki-i-historia-rewizji-dla-organizatora) | Oceny zawodniczki i historia rewizji dla organizatora | 4 | 5,1 | niskie | IMP-147 | 26.01–26.01 |
| 9 | [IMP-148](../04-implementation-plans/04-backend-urzadzenia-ocenianie-synchronizacja.md#imp-148--mutacje-sesji-offline-i-raportu-prób-pin) | Mutacje sesji offline i raportu prób PIN | 5 | 7,2 | średnie | IMP-146, IMP-143 | 26.01–28.01 |
| 10 | [IMP-156](../04-implementation-plans/04-backend-urzadzenia-ocenianie-synchronizacja.md#imp-156--mapowanie-komend-na-zdarzenia-realtime) | Mapowanie komend na zdarzenia realtime | 5 | 6,3 | niskie | IMP-155, **IMP-149** (poz. 1), IMP-142 | 26.01–27.01 |
| 12 | [IMP-170](../04-implementation-plans/05-backend-eksport-audyt-rodo.md#imp-170--worker-kolejki-bullmq) | Worker: kolejki BullMQ | 4 | 5,1 | niskie | IMP-100, IMP-010 | 27.01–28.01 |
| 13 | [IMP-179](../04-implementation-plans/05-backend-eksport-audyt-rodo.md#imp-179--strona-statyczna-dokumenty-prawne-usunięcie-konta-linki-uniwersalne) | Strona statyczna: dokumenty prawne, usunięcie konta, linki uniwersalne (FULL → BE) | 5 | 6,3 | niskie | IMP-012 | 28.01–29.01 |
| 16 | [IMP-119](../04-implementation-plans/03-backend-konto-i-konfiguracja-turnieju.md#imp-119--moduł-e-mail-ses-przez-worker-i-szablony-pl) | Moduł e-mail (SES przez worker) i szablony PL | 6 | 7,6 | niskie | **IMP-170** (poz. 12), IMP-013, IMP-069 | 28.01–01.02 |
| 18 | [IMP-171](../04-implementation-plans/05-backend-eksport-audyt-rodo.md#imp-171--eksporty-api-zleceń-i-linki-s3) | Eksporty: API zleceń i linki S3 | 5 | 6,3 | niskie | **IMP-170** (poz. 12), **IMP-151** (poz. 2), IMP-012 | 29.01–01.02 |
| 20 | [IMP-117](../04-implementation-plans/03-backend-konto-i-konfiguracja-turnieju.md#imp-117--reset-hasła-link-uniwersalny) | Reset hasła (link uniwersalny) | 5 | 6,3 | niskie | IMP-116, **IMP-119** (poz. 16) | 01.02–02.02 |
| 21 | [IMP-176](../04-implementation-plans/05-backend-eksport-audyt-rodo.md#imp-176--zadanie-retencji-i-pseudonimizacji) | Zadanie retencji i pseudonimizacji | 10 | 14,4 | średnie | **IMP-170** (poz. 12), IMP-107, IMP-118 | 01.02–03.02 |
| 24 | [IMP-172](../04-implementation-plans/05-backend-eksport-audyt-rodo.md#imp-172--renderer-pdf-pdfmake-inter-polskie-znaki) | Renderer PDF (pdfmake, Inter, polskie znaki) | 12 | 17,3 | średnie | **IMP-171** (poz. 18), IMP-069, IMP-605 | 02.02–05.02 |
| 26 | [IMP-177](../04-implementation-plans/05-backend-eksport-audyt-rodo.md#imp-177--usuń-dane-osobowe-zawodniczki) | „Usuń dane osobowe” zawodniczki | 4 | 5,1 | niskie | IMP-128, **IMP-176** (poz. 21) | 03.02–04.02 |
| 29 | [IMP-406](../04-implementation-plans/10-bezpieczenstwo-i-rodo.md#imp-406--materiały-rodo-dla-prawnika) | Materiały RODO dla prawnika | 6 | 7,6 | niskie | **IMP-176** (poz. 21) | 04.02–05.02 |
| 30 | [IMP-174](../04-implementation-plans/05-backend-eksport-audyt-rodo.md#imp-174--eksport-csv-wyników-could) | Eksport CSV wyników (Could) (FULL → BE) | 4 | 5,1 | niskie | **IMP-171** (poz. 18), **IMP-270** (poz. 23) | 05.02–05.02 |

**MOB**

| Poz. | Zadanie | Tytuł | h | h z buf. | Ryzyko | Zależności | Plan |
|---|---|---|---|---|---|---|---|
| 3 | [IMP-265](../04-implementation-plans/07-mobile-ekrany-organizatora.md#imp-265--scr-org-07--zakładka-zawodniczki) | SCR-ORG-07 – zakładka Zawodniczki | 8 | 10,1 | niskie | IMP-261, IMP-128 | 25.01–26.01 |
| 4 | [IMP-278](../04-implementation-plans/07-mobile-ekrany-organizatora.md#imp-278--tryb-offline-organizatora-na-wszystkich-ekranach) | Tryb offline organizatora na wszystkich ekranach | 4 | 5,1 | niskie | IMP-215, IMP-257, IMP-261, IMP-273 | 25.01–25.01 |
| 5 | [IMP-262](../04-implementation-plans/07-mobile-ekrany-organizatora.md#imp-262--scr-org-06--zakładka-kryteria) | SCR-ORG-06 – zakładka Kryteria | 6 | 7,6 | niskie | IMP-261 | 25.01–27.01 |
| 8 | [IMP-268](../04-implementation-plans/07-mobile-ekrany-organizatora.md#imp-268--scr-org-08--zakładka-wyniki-ranking-na-żywo) | SCR-ORG-08 – zakładka Wyniki (ranking na żywo) | 10 | 14,4 | średnie | IMP-261, **IMP-151** (poz. 2), IMP-216 | 26.01–29.01 |
| 11 | [IMP-266](../04-implementation-plans/07-mobile-ekrany-organizatora.md#imp-266--scr-org-11--nowa-zawodniczka) | SCR-ORG-11 – nowa zawodniczka | 6 | 7,6 | niskie | **IMP-265** (poz. 3) | 27.01–28.01 |
| 15 | [IMP-260](../04-implementation-plans/07-mobile-ekrany-organizatora.md#imp-260--scr-org-05--nowa--edycja-kategorii) | SCR-ORG-05 – nowa / edycja kategorii | 8 | 10,1 | niskie | IMP-206, IMP-207, IMP-124 | 28.01–01.02 |
| 17 | [IMP-274](../04-implementation-plans/07-mobile-ekrany-organizatora.md#imp-274--scr-org-15--sędzia-nowy-z-pin-em-edycja-reset-aktywność-usunięcie) | SCR-ORG-15 – sędzia (nowy z PIN-em, edycja, reset, aktywność, usunięcie) | 8 | 10,1 | niskie | IMP-273, IMP-131, IMP-206, IMP-650† | 29.01–01.02 |
| 19 | [IMP-252](../04-implementation-plans/07-mobile-ekrany-organizatora.md#imp-252--scr-org-13--weryfikacja-e-maila-i-baner-w-turnieju) | SCR-ORG-13 – weryfikacja e-maila i baner w turnieju | 6 | 7,6 | niskie | IMP-251, IMP-115, IMP-650† | 01.02–02.02 |
| 23 | [IMP-270](../04-implementation-plans/07-mobile-ekrany-organizatora.md#imp-270--scr-org-12--podgląd-i-pobranie-pdf) | SCR-ORG-12 – podgląd i pobranie PDF | 10 | 14,4 | średnie | IMP-206, **IMP-171** (poz. 18), **IMP-268** (poz. 8) | 01.02–04.02 |
| 25 | [IMP-253](../04-implementation-plans/07-mobile-ekrany-organizatora.md#imp-253--scr-org-13--reset-hasła-i-linki-uniwersalne) | SCR-ORG-13 – reset hasła i linki uniwersalne | 6 | 8,6 | średnie | IMP-250, **IMP-117** (poz. 20), **IMP-179** (poz. 13), IMP-650† | 02.02–03.02 |
| 27 | [IMP-263](../04-implementation-plans/07-mobile-ekrany-organizatora.md#imp-263--scr-org-09--kryterium-noweedycjausunięcie) | SCR-ORG-09 – kryterium (nowe/edycja/usunięcie) | 6 | 7,6 | niskie | **IMP-262** (poz. 5), IMP-125 | 03.02–05.02 |
| 28 | [IMP-269](../04-implementation-plans/07-mobile-ekrany-organizatora.md#imp-269--scr-org-19--oceny-zawodniczki) | SCR-ORG-19 – oceny zawodniczki | 6 | 7,6 | niskie | **IMP-268** (poz. 8), **IMP-152** (poz. 7), IMP-650† | 04.02–05.02 |
| 31 | [IMP-258](../04-implementation-plans/07-mobile-ekrany-organizatora.md#imp-258--scr-org-04--zakończenie-turnieju) | SCR-ORG-04 – zakończenie turnieju | 4 | 5,1 | niskie | IMP-257, IMP-123, IMP-206, IMP-650† | 05.02–05.02 |

**QA**

| Poz. | Zadanie | Tytuł | h | h z buf. | Ryzyko | Zależności | Plan |
|---|---|---|---|---|---|---|---|
| 6 | [IMP-455](../04-implementation-plans/11-qa-i-automatyzacja-testow.md#imp-455--e2e-organizatora--konto-turnieje-kategorie-i-kryteria) | E2E organizatora – konto, turnieje, kategorie i kryteria | 10 | 14,4 | średnie | IMP-454, **IMP-278** (poz. 4), IMP-277 | 25.01–28.01 |
| 14 | [IMP-467](../04-implementation-plans/11-qa-i-automatyzacja-testow.md#imp-467--e2e-organizatora--zawodniczki-wyniki-sędziowie-urządzenia-i-offline) | E2E organizatora – zawodniczki, wyniki, sędziowie, urządzenia i offline | 10 | 14,4 | średnie | IMP-454, **IMP-278** (poz. 4), IMP-277 | 28.01–01.02 |
| 22 | [IMP-461](../04-implementation-plans/11-qa-i-automatyzacja-testow.md#imp-461--testy-obciążeniowe-k6) | Testy obciążeniowe k6 | 12 | 17,3 | średnie | IMP-028, **IMP-156** (poz. 10) | 01.02–04.02 |

**Demo / rezultat:** Organizator konfiguruje turniej i widzi ranking na żywo na danych testowych; PDF kategorii z polskimi znakami i sumą kontrolną; reset hasła e-mailem (SES); nocne E2E organizatora (IMP-455, IMP-467); raport k6 (IMP-461).

**Ryzyka sprintu:** RT-10 i RP-06 (materiały RODO dla prawnika – IMP-406, retencja IMP-176), R-03 (realtime w rankingu), RP-11 (QA zaczyna E2E). (rejestr: [05-rejestr-ryzyk.md](05-rejestr-ryzyk.md))

**Uwagi:** Szkice dokumentów prawnych potrzebne do strony statycznej (IMP-179) – ZZ-08.

### SP-08

**08.02.2027 – 19.02.2027** · dni robocze: 10 (efektywnie 10) · zadań: 24 · kamień milowy: M4 (19.02)

**Cel sprintu:** Domknięcie ekranów organizatora (edycja zawodniczki, odrzucone oceny, edycja turnieju, parowanie, kary, ostrzeżenie przed blokadą) i pełna synchronizacja tabletu (migawka, pull, wyzwalacze, odrzucenia, uwierzytelnienie urządzenia), splash sędziego, wybór profilu, urządzenie odłączone, autozapis; CLI operatora, ASVS, wydajność API, testy chaosu.

| Rola | h (bez buforów) | h z buforem | Pojemność (h) | Obciążenie |
|---|---|---|---|---|
| BE | 29 | 38,8 | 120 | 32% |
| MOB | 88 | 116,5 | 120 | 97% |
| QA | 16 | 22 | 60 | 37% |
| DEVOPS | 6 | 8,6 | 30 | 29% |
| DESIGN | 0 | 0 | 12 | 0% |

**BE**

| Poz. | Zadanie | Tytuł | h | h z buf. | Ryzyko | Zależności | Plan |
|---|---|---|---|---|---|---|---|
| 2 | [IMP-178](../04-implementation-plans/05-backend-eksport-audyt-rodo.md#imp-178--narzędzia-operatora-cli) | Narzędzia operatora (CLI) | 8 | 10,1 | niskie | IMP-141, IMP-176 | 08.02–09.02 |
| 5 | [IMP-400](../04-implementation-plans/10-bezpieczenstwo-i-rodo.md#imp-400--mapowanie-asvs-50-l2-i-model-zagrożeń) | Mapowanie ASVS 5.0 L2 i model zagrożeń | 6 | 7,6 | niskie | IMP-113 | 08.02–09.02 |
| 9 | [IMP-409](../04-implementation-plans/10-bezpieczenstwo-i-rodo.md#imp-409--test-uprawnień-bazy-i-architektury-dostępu) | Test uprawnień bazy i architektury dostępu | 3 | 3,8 | niskie | IMP-107, IMP-108 | 09.02–09.02 |
| 10 | [IMP-502](../04-implementation-plans/12-twardnienie-nfr.md#imp-502--wydajność-api-pod-obciążeniem) | Wydajność API pod obciążeniem | 8 | 11,5 | średnie | IMP-461 | 09.02–11.02 |
| 11 | [IMP-505](../04-implementation-plans/12-twardnienie-nfr.md#imp-505--niezawodność-wdrożeń-i-połączeń-ws) | Niezawodność wdrożeń i połączeń WS | 4 | 5,8 | średnie | IMP-216, IMP-155 | 09.02–10.02 |

**MOB**

| Poz. | Zadanie | Tytuł | h | h z buf. | Ryzyko | Zależności | Plan |
|---|---|---|---|---|---|---|---|
| 3 | [IMP-267](../04-implementation-plans/07-mobile-ekrany-organizatora.md#imp-267--scr-org-17--edycja-wycofanie-usunięcie-usuń-dane-osobowe) | SCR-ORG-17 – edycja, wycofanie, usunięcie, „Usuń dane osobowe” | 6 | 7,6 | niskie | IMP-266, IMP-129, IMP-177, IMP-650† | 08.02–09.02 |
| 4 | [IMP-272](../04-implementation-plans/07-mobile-ekrany-organizatora.md#imp-272--scr-org-22--odrzucone-oceny) | SCR-ORG-22 – odrzucone oceny | 6 | 7,6 | niskie | IMP-261, IMP-149, IMP-650† | 08.02–09.02 |
| 7 | [IMP-259](../04-implementation-plans/07-mobile-ekrany-organizatora.md#imp-259--scr-org-20--edycja-i-usunięcie-turnieju) | SCR-ORG-20 – edycja i usunięcie turnieju | 5 | 6,3 | niskie | IMP-256, IMP-257, IMP-650† | 09.02–10.02 |
| 8 | [IMP-275](../04-implementation-plans/07-mobile-ekrany-organizatora.md#imp-275--scr-org-16--parowanie-tabletu) | SCR-ORG-16 – parowanie tabletu | 6 | 7,6 | niskie | IMP-273, IMP-140, IMP-650† | 09.02–10.02 |
| 12 | [IMP-264](../04-implementation-plans/07-mobile-ekrany-organizatora.md#imp-264--scr-org-10--kara-nowaedycjausunięcie) | SCR-ORG-10 – kara (nowa/edycja/usunięcie) | 5 | 6,3 | niskie | IMP-262, IMP-125 | 10.02–11.02 |
| 13 | [IMP-271](../04-implementation-plans/07-mobile-ekrany-organizatora.md#imp-271--scr-org-18--ostrzeżenie-przed-blokadą) | SCR-ORG-18 – ostrzeżenie przed blokadą | 4 | 5,1 | niskie | IMP-261, IMP-206, IMP-650† | 10.02–11.02 |
| 14 | [IMP-351](../04-implementation-plans/09-mobile-offline-i-synchronizacja.md#imp-351--pobieranie-i-zapis-migawki) | Pobieranie i zapis migawki | 6 | 8,6 | średnie | IMP-350, IMP-214, IMP-144 | 11.02–12.02 |
| 15 | [IMP-303](../04-implementation-plans/08-mobile-ekrany-sedziego.md#imp-303--scr-jdg-01--wybór-profilu-z-ponownym-użyciem-tabletu) | SCR-JDG-01 – wybór profilu (z ponownym użyciem tabletu) | 5 | 6,3 | niskie | IMP-300, IMP-350, IMP-650† | 11.02–12.02 |
| 16 | [IMP-318](../04-implementation-plans/08-mobile-ekrany-sedziego.md#imp-318--scr-jdg-10--urządzenie-odłączone-i-eksport-niewysłanych) | SCR-JDG-10 – urządzenie odłączone i eksport niewysłanych | 6 | 7,6 | niskie | IMP-300, IMP-354, IMP-650† | 12.02–15.02 |
| 17 | [IMP-352](../04-implementation-plans/09-mobile-offline-i-synchronizacja.md#imp-352--pobieranie-zmian-pull) | Pobieranie zmian (pull) | 8 | 11,5 | średnie | **IMP-351** (poz. 14), IMP-145 | 12.02–16.02 |
| 18 | [IMP-319](../04-implementation-plans/08-mobile-ekrany-sedziego.md#imp-319--cykl-życia-danych-tabletu) | Cykl życia danych tabletu | 4 | 5,1 | niskie | IMP-350, **IMP-303** (poz. 15) | 15.02–16.02 |
| 19 | [IMP-356](../04-implementation-plans/09-mobile-offline-i-synchronizacja.md#imp-356--uwierzytelnianie-urządzenia-na-tablecie) | Uwierzytelnianie urządzenia na tablecie | 4 | 5,8 | średnie | IMP-214, IMP-141 | 16.02–17.02 |
| 21 | [IMP-355](../04-implementation-plans/09-mobile-offline-i-synchronizacja.md#imp-355--syncengine--wyzwalacze-harmonogram-heartbeat) | SyncEngine – wyzwalacze, harmonogram, heartbeat | 6 | 8,6 | średnie | IMP-354, **IMP-352** (poz. 17), IMP-216, IMP-142 | 16.02–18.02 |
| 22 | [IMP-357](../04-implementation-plans/09-mobile-offline-i-synchronizacja.md#imp-357--obsługa-odrzuceń-na-tablecie) | Obsługa odrzuceń na tablecie | 6 | 8,6 | średnie | IMP-354, **IMP-352** (poz. 17) | 17.02–18.02 |
| 23 | [IMP-302](../04-implementation-plans/08-mobile-ekrany-sedziego.md#imp-302--scr-jdg-00--splash-sędziego-z-rzeczywistym-rozruchem) | SCR-JDG-00 – splash sędziego z rzeczywistym rozruchem | 6 | 7,6 | niskie | IMP-211, **IMP-352** (poz. 17), **IMP-356** (poz. 19) | 18.02–19.02 |
| 24 | [IMP-315](../04-implementation-plans/08-mobile-ekrany-sedziego.md#imp-315--autozapis-szkicu-formularza) | Autozapis szkicu formularza | 5 | 6,3 | niskie | IMP-313 | 18.02–19.02 |

**QA**

| Poz. | Zadanie | Tytuł | h | h z buf. | Ryzyko | Zależności | Plan |
|---|---|---|---|---|---|---|---|
| 1 | [IMP-173](../04-implementation-plans/05-backend-eksport-audyt-rodo.md#imp-173--pdf-regresja-wizualna-i-wydajność) | PDF: regresja wizualna i wydajność | 6 | 7,6 | niskie | IMP-172, IMP-028 | 08.02–09.02 |
| 20 | [IMP-456](../04-implementation-plans/11-qa-i-automatyzacja-testow.md#imp-456--e2e-sędziego--parowanie-logowanie-pin-em-kolejka-i-formularz) | E2E sędziego – parowanie, logowanie PIN-em, kolejka i formularz | 10 | 14,4 | średnie | IMP-454, **IMP-319** (poz. 18), **IMP-318** (poz. 16) | 16.02–18.02 |

**DEVOPS**

| Poz. | Zadanie | Tytuł | h | h z buf. | Ryzyko | Zależności | Plan |
|---|---|---|---|---|---|---|---|
| 6 | [IMP-462](../04-implementation-plans/11-qa-i-automatyzacja-testow.md#imp-462--testy-chaosu-i-odporności-na-staging) | Testy chaosu i odporności na staging | 6 | 8,6 | średnie | IMP-461 | 08.02–10.02 |

**Demo / rezultat:** Kod parowania z telefonu organizatora (SCR-ORG-16); na tablecie (build deweloperski) migawka, ocenianie w trybie samolotowym i synchronizacja po powrocie sieci; zamknięcie kategorii z ostrzeżeniem i przyjęcie odrzuconej oceny; E2E sędziego (część 1). Ekran parowania na tablecie (SCR-JDG-06) – SP-09.

**Ryzyka sprintu:** R-02 (IMP-352, IMP-355, IMP-357), RP-03, RP-11; wolna pojemność BE (ok. 70%) przeznaczona na defekty i wsparcie QA (ZAL-12). (rejestr: [05-rejestr-ryzyk.md](05-rejestr-ryzyk.md))

**Uwagi:** Kamień milowy M4 (19.02.2027). Potwierdzenie sędziów i wolontariuszek na próbę generalną (ZZ-11).

### SP-09

**22.02.2027 – 05.03.2027** · dni robocze: 10 (efektywnie 10) · zadań: 17

**Cel sprintu:** Tryb sędziego kompletny (parowanie, sesje i wylogowanie, lista kategorii, pigułka synchronizacji, stany formularza, tryb tylko do odczytu, dziennik diagnostyczny), profilowanie formularza i zimny start, poprawki projektanta, skalowanie tekstu, MASVS; E2E sędziego (część 2), E2E offline (część 1), dostępność, przebiegi na urządzeniach referencyjnych.

| Rola | h (bez buforów) | h z buforem | Pojemność (h) | Obciążenie |
|---|---|---|---|---|
| BE | 0 | 0 | 120 | 0% |
| MOB | 84 | 117,6 | 120 | 98% |
| QA | 40 | 59 | 60 | 98% |
| DEVOPS | 0 | 0 | 30 | 0% |
| DESIGN | 0 | 0 | 12 | 0% |

**MOB**

| Poz. | Zadanie | Tytuł | h | h z buf. | Ryzyko | Zależności | Plan |
|---|---|---|---|---|---|---|---|
| 1 | [IMP-301](../04-implementation-plans/08-mobile-ekrany-sedziego.md#imp-301--scr-jdg-06--parowanie-tabletu) | SCR-JDG-06 – parowanie tabletu | 8 | 11,5 | średnie | IMP-300, IMP-356, IMP-351, IMP-141, IMP-650† | 22.02–23.02 |
| 2 | [IMP-306](../04-implementation-plans/08-mobile-ekrany-sedziego.md#imp-306--zarządzanie-sesją-sędziego-i-wylogowanie-scr-jdg-09) | Zarządzanie sesją sędziego i wylogowanie (SCR-JDG-09) | 8 | 11,5 | średnie | IMP-305, IMP-208, IMP-216, IMP-650† | 22.02–23.02 |
| 4 | [IMP-307](../04-implementation-plans/08-mobile-ekrany-sedziego.md#imp-307--scr-jdg-03--lista-kategorii-sędziego) | SCR-JDG-03 – lista kategorii sędziego | 6 | 7,6 | niskie | IMP-300, IMP-350, IMP-055 | 23.02–25.02 |
| 5 | [IMP-317](../04-implementation-plans/08-mobile-ekrany-sedziego.md#imp-317--scr-jdg-07--pigułka-synchronizacji-i-popover) | SCR-JDG-07 – pigułka synchronizacji i popover | 6 | 7,6 | niskie | IMP-300, IMP-358, IMP-650† | 23.02–25.02 |
| 7 | [IMP-314](../04-implementation-plans/08-mobile-ekrany-sedziego.md#imp-314--tryb-tylko-do-odczytu-kategoria-zablokowana) | Tryb tylko do odczytu (kategoria zablokowana) | 4 | 5,1 | niskie | IMP-313 | 25.02–26.02 |
| 8 | [IMP-316](../04-implementation-plans/08-mobile-ekrany-sedziego.md#imp-316--stany-dodatkowe-formularza-odrzucona-lista-zmieniona-stale_revision) | Stany dodatkowe formularza (odrzucona, lista zmieniona, STALE_REVISION) | 5 | 6,3 | niskie | IMP-313, IMP-357 | 25.02–26.02 |
| 9 | [IMP-359](../04-implementation-plans/09-mobile-offline-i-synchronizacja.md#imp-359--dziennik-diagnostyczny-synchronizacji) | Dziennik diagnostyczny synchronizacji | 3 | 3,8 | niskie | IMP-354, IMP-218 | 26.02–26.02 |
| 10 | [IMP-500](../04-implementation-plans/12-twardnienie-nfr.md#imp-500--profilowanie-i-optymalizacja-formularza-sędziego) | Profilowanie i optymalizacja formularza sędziego | 12 | 20,7 | wysokie | IMP-313 | 26.02–03.03 |
| 11 | [IMP-651](../04-implementation-plans/15-design-i-akceptacje.md#imp-651--wdrożenie-poprawek-projektanta-do-ekranów-poza-designem) | Wdrożenie poprawek projektanta do ekranów poza designem | 12 | 17,3 | średnie | IMP-650, IMP-278, IMP-318 | 26.02–03.03 |
| 13 | [IMP-401](../04-implementation-plans/10-bezpieczenstwo-i-rodo.md#imp-401--mapowanie-masvs-2x-mas-l1--wybrane-l2) | Mapowanie MASVS 2.x (MAS-L1 + wybrane L2) | 4 | 5,1 | niskie | IMP-356 | 03.03–04.03 |
| 14 | [IMP-402](../04-implementation-plans/10-bezpieczenstwo-i-rodo.md#imp-402--twardnienie-przechowywania-na-urządzeniach) | Twardnienie przechowywania na urządzeniach | 4 | 5,1 | niskie | IMP-356, IMP-250 | 03.03–04.03 |
| 16 | [IMP-501](../04-implementation-plans/12-twardnienie-nfr.md#imp-501--optymalizacja-zimnego-startu) | Optymalizacja zimnego startu | 6 | 8,6 | średnie | IMP-254, IMP-302 | 04.03–05.03 |
| 17 | [IMP-504](../04-implementation-plans/12-twardnienie-nfr.md#imp-504--pseudolokalizacja-i-skalowanie-tekstu--poprawki) | Pseudolokalizacja i skalowanie tekstu – poprawki | 6 | 7,6 | niskie | IMP-459, **IMP-460** (poz. 12) | 04.03–05.03 |

**QA**

| Poz. | Zadanie | Tytuł | h | h z buf. | Ryzyko | Zależności | Plan |
|---|---|---|---|---|---|---|---|
| 3 | [IMP-468](../04-implementation-plans/11-qa-i-automatyzacja-testow.md#imp-468--e2e-sędziego--blokada-sesje-synchronizacja-odłączenie-i-orientacja) | E2E sędziego – blokada, sesje, synchronizacja, odłączenie i orientacja | 10 | 14,4 | średnie | IMP-454, IMP-319, IMP-318 | 22.02–24.02 |
| 6 | [IMP-458](../04-implementation-plans/11-qa-i-automatyzacja-testow.md#imp-458--e2e-offline--narzędzia-sieci-i-scenariusze-tc-sync-001020) | E2E offline – narzędzia sieci i scenariusze TC-SYNC-001…020 | 10 | 17,3 | wysokie | IMP-456, IMP-357, IMP-355 | 24.02–01.03 |
| 12 | [IMP-460](../04-implementation-plans/11-qa-i-automatyzacja-testow.md#imp-460--testy-dostępności) | Testy dostępności | 12 | 17,3 | średnie | IMP-455, IMP-467, IMP-456, **IMP-468** (poz. 3) | 01.03–04.03 |
| 15 | [IMP-463](../04-implementation-plans/11-qa-i-automatyzacja-testow.md#imp-463--przebiegi-na-urządzeniach-referencyjnych) | Przebiegi na urządzeniach referencyjnych | 8 | 10,1 | niskie | IMP-455, IMP-467, IMP-456, **IMP-468** (poz. 3) | 04.03–05.03 |

**Demo / rezultat:** Pełny scenariusz sędziego na Tab A8 i iPad 9 (parowanie → PIN → ocena → tryb tylko do odczytu po blokadzie); wyniki profilowania (TC-PERF-001, TC-PERF-003, TC-PERF-004); raport przebiegów na urządzeniach referencyjnych (IMP-463).

**Ryzyka sprintu:** R-01 (IMP-500), RP-11 (QA 98%), R-10 (poprawki projektanta IMP-651), RP-12 (niestabilne E2E). (rejestr: [05-rejestr-ryzyk.md](05-rejestr-ryzyk.md))

**Uwagi:** Ostatni sprint rozwoju funkcji MOB. BE bez zadań IMP – defekty, wsparcie E2E (helpery `E2E_HELPERS`), przygotowanie pentestu (ZAL-12).

### SP-10

**08.03.2027 – 19.03.2027** · dni robocze: 10 (efektywnie 10) · zadań: 11 · kamień milowy: M5 (19.03)

**Cel sprintu:** Release Candidate 1: E2E pełnego turnieju na dwóch urządzeniach i E2E offline (część 2), aktualizacja Expo SDK, rekordy aplikacji w sklepach, deklaracje prywatności, przygotowanie przeglądu i dystrybucji pilotażowej, wpisy w sklepach, przygotowanie próby generalnej, pomiar baterii.

| Rola | h (bez buforów) | h z buforem | Pojemność (h) | Obciążenie |
|---|---|---|---|---|
| BE | 0 | 0 | 120 | 0% |
| MOB | 27 | 36,7 | 120 | 31% |
| QA | 36 | 55,7 | 60 | 93% |
| DEVOPS | 0 | 0 | 30 | 0% |
| DESIGN | 6 | 7,6 | 12 | 63% |

**MOB**

| Poz. | Zadanie | Tytuł | h | h z buf. | Ryzyko | Zależności | Plan |
|---|---|---|---|---|---|---|---|
| 2 | [IMP-507](../04-implementation-plans/12-twardnienie-nfr.md#imp-507--aktualizacja-expo-sdk-przed-wydaniem-10-jeśli-dostępna) | Aktualizacja Expo SDK przed wydaniem 1.0 (jeśli dostępna) | 12 | 17,3 | średnie | IMP-463 | 08.03–10.03 |
| 3 | [IMP-550](../04-implementation-plans/13-wydanie.md#imp-550--konta-i-rekordy-aplikacji-w-app-store-connect-i-google-play) | Konta i rekordy aplikacji w App Store Connect i Google Play | 4 | 5,1 | niskie | IMP-022 | 08.03–08.03 |
| 4 | [IMP-407](../04-implementation-plans/10-bezpieczenstwo-i-rodo.md#imp-407--deklaracje-prywatności-w-sklepach) | Deklaracje prywatności w sklepach | 3 | 3,8 | niskie | IMP-406, **IMP-550** (poz. 3) | 08.03–09.03 |
| 6 | [IMP-553](../04-implementation-plans/13-wydanie.md#imp-553--przygotowanie-przeglądu-w-sklepach) | Przygotowanie przeglądu w sklepach | 3 | 4,3 | średnie | IMP-178, IMP-277, IMP-179 | 09.03–10.03 |
| 8 | [IMP-552](../04-implementation-plans/13-wydanie.md#imp-552--dystrybucja-testowa-dla-pilotażu) | Dystrybucja testowa dla pilotażu | 3 | 3,8 | niskie | **IMP-550** (poz. 3), IMP-023, **IMP-457** (poz. 1)† | 11.03–12.03 |
| 9 | [IMP-506](../04-implementation-plans/12-twardnienie-nfr.md#imp-506--kontrola-rozmiaru-aplikacji) | Kontrola rozmiaru aplikacji | 2 | 2,5 | niskie | **IMP-552** (poz. 8) | 12.03–12.03 |

**QA**

| Poz. | Zadanie | Tytuł | h | h z buf. | Ryzyko | Zależności | Plan |
|---|---|---|---|---|---|---|---|
| 1 | [IMP-457](../04-implementation-plans/11-qa-i-automatyzacja-testow.md#imp-457--e2e-pełnego-turnieju-dwa-urządzenia) | E2E pełnego turnieju (dwa urządzenia) | 12 | 20,7 | wysokie | IMP-455, IMP-467, IMP-456, IMP-468 | 08.03–11.03 |
| 7 | [IMP-469](../04-implementation-plans/11-qa-i-automatyzacja-testow.md#imp-469--e2e-offline--scenariusze-tc-sync-021040-pojemność-zdarzenia-cykl-życia) | E2E offline – scenariusze TC-SYNC-021…040 (pojemność, zdarzenia, cykl życia) | 10 | 17,3 | wysokie | IMP-458 | 11.03–16.03 |
| 10 | [IMP-464](../04-implementation-plans/11-qa-i-automatyzacja-testow.md#imp-464--przygotowanie-uat-i-próby-generalnej) | Przygotowanie UAT i próby generalnej | 8 | 10,1 | niskie | **IMP-457** (poz. 1), bramka RC† | 16.03–18.03 |
| 11 | [IMP-503](../04-implementation-plans/12-twardnienie-nfr.md#imp-503--pomiar-baterii-i-pamięci-tabletu) | Pomiar baterii i pamięci tabletu | 6 | 7,6 | niskie | IMP-463 | 18.03–19.03 |

**DESIGN**

| Poz. | Zadanie | Tytuł | h | h z buf. | Ryzyko | Zależności | Plan |
|---|---|---|---|---|---|---|---|
| 5 | [IMP-551](../04-implementation-plans/13-wydanie.md#imp-551--wpisy-w-sklepach-pl) | Wpisy w sklepach (PL) | 6 | 7,6 | niskie | **IMP-550** (poz. 3), IMP-652, IMP-651† | 08.03–17.03 |

**Demo / rezultat:** TC-E2E-FULL-001…003 i TC-SYNC P1 zielone; RC1 w TestFlight (testerzy zewnętrzni) i Google Play (testy zamknięte); scenariusz, dane i ankiety próby generalnej gotowe (IMP-464).

**Ryzyka sprintu:** R-11 i RT-01 (IMP-507 – aktualizacja SDK tuż przed RC), RT-08 (konta sklepów potrzebne w IMP-550), RP-07 (uczestnicy próby 20.03), RP-10 (start okna pentestu 15.03), RP-11. (rejestr: [05-rejestr-ryzyk.md](05-rejestr-ryzyk.md))

**Uwagi:** Kamień milowy M5 (19.03.2027). **Próba generalna (UAT): sobota 20.03.2027** (konfiguracja turnieju przez organizatora D−1 = 19.03). Okno pentestu: 15–24.03.2027 na `staging` z RC1.

### SP-11

**22.03.2027 – 02.04.2027** · dni robocze: 9 (efektywnie 9) · zadań: 5 · kamień milowy: M6 (26.03), M7 (2.04)

**Cel sprintu:** Próba generalna i poprawki S1/S2, poprawki z pentestu, regres przed wydaniem, decyzja go/no-go (26.03), uruchomienie produkcji i zgłoszenie 1.0 do App Store i Google Play, instrukcja dla organizatorów.

| Rola | h (bez buforów) | h z buforem | Pojemność (h) | Obciążenie |
|---|---|---|---|---|
| BE | 24 | 36,8 | 108 | 34% |
| MOB | 8 | 13,8 | 108 | 13% |
| QA | 18 | 24,8 | 54 | 46% |
| DEVOPS | 8 | 11,5 | 27 | 43% |
| DESIGN | 0 | 0 | 10,8 | 0% |

**BE**

| Poz. | Zadanie | Tytuł | h | h z buf. | Ryzyko | Zależności | Plan |
|---|---|---|---|---|---|---|---|
| 1 | [IMP-465](../04-implementation-plans/11-qa-i-automatyzacja-testow.md#imp-465--próba-generalna--wsparcie-i-poprawki) | Próba generalna – wsparcie i poprawki (FULL – ½ BE, ½ MOB) | 16 (½ = 8) | 27,6 (½ = 13,8) | wysokie | IMP-464 | 20.03–24.03 |
| 2 | [IMP-408](../04-implementation-plans/10-bezpieczenstwo-i-rodo.md#imp-408--pentest-zewnętrzny-i-poprawki) | Pentest zewnętrzny i poprawki | 16 | 23 | średnie | IMP-027, IMP-404, IMP-457, bramka RC† | 22.03–25.03 |

**MOB**

| Poz. | Zadanie | Tytuł | h | h z buf. | Ryzyko | Zależności | Plan |
|---|---|---|---|---|---|---|---|
| 1 | [IMP-465](../04-implementation-plans/11-qa-i-automatyzacja-testow.md#imp-465--próba-generalna--wsparcie-i-poprawki) | Próba generalna – wsparcie i poprawki (FULL – ½ BE, ½ MOB) | 16 (½ = 8) | 27,6 (½ = 13,8) | wysokie | IMP-464 | 20.03–24.03 |

**QA**

| Poz. | Zadanie | Tytuł | h | h z buf. | Ryzyko | Zależności | Plan |
|---|---|---|---|---|---|---|---|
| 3 | [IMP-466](../04-implementation-plans/11-qa-i-automatyzacja-testow.md#imp-466--regres-ręczny-przed-wydaniem-i-triage-defektów) | Regres ręczny przed wydaniem i triage defektów | 12 | 17,3 | średnie | IMP-463, IMP-458, IMP-469, bramka RC† | 22.03–24.03 |
| 4 | [IMP-557](../04-implementation-plans/13-wydanie.md#imp-557--instrukcja-dla-organizatorów-onboarding) | Instrukcja dla organizatorów (onboarding) | 6 | 7,6 | niskie | IMP-464 | 24.03–26.03 |

**DEVOPS**

| Poz. | Zadanie | Tytuł | h | h z buf. | Ryzyko | Zależności | Plan |
|---|---|---|---|---|---|---|---|
| 5 | [IMP-555](../04-implementation-plans/13-wydanie.md#imp-555--uruchomienie-produkcji) | Uruchomienie produkcji | 8 | 11,5 | średnie | **IMP-408** (poz. 2), **IMP-465** (poz. 1), **IMP-466** (poz. 3), IMP-554, IMP-553 | 25.03–01.04 |

**Demo / rezultat:** Raport z próby generalnej (TC-UAT-001…016) i decyzja go/no-go; raport pentestu bez otwartych podatności krytycznych/wysokich; smoke test produkcji i aktywny kanarek (TC-REL-001); buildy 1.0 zgłoszone do sklepów (1.04).

**Ryzyka sprintu:** RP-08 (przegląd w sklepach), RP-10 (wyniki pentestu), RT-10 (treść prawna wymagana przez IMP-553/555), RT-08 (SES production). (rejestr: [05-rejestr-ryzyk.md](05-rejestr-ryzyk.md))

**Uwagi:** 29.03 – Poniedziałek Wielkanocny. Kamienie milowe M6 (26.03.2027) i M7 – gotowość pilotażowa (2.04.2027). Od 2.04 zamrożenie zakresu 1.0 (3 tygodnie przed pilotem).

### SP-12

**05.04.2027 – 16.04.2027** · dni robocze: 10 (efektywnie 10) · zadań: 0

**Cel sprintu:** Rezerwa harmonogramu i przygotowanie pilota: obsługa uwag z przeglądu w sklepach, opieka nad produkcją, konfiguracja prawdziwego turnieju przez organizatora na produkcji, próba techniczna z tabletami organizatora (15.04), wpis okna zamrożenia na dzień pilota.

| Rola | h (bez buforów) | h z buforem | Pojemność (h) | Obciążenie |
|---|---|---|---|---|
| BE | 0 | 0 | 120 | 0% |
| MOB | 0 | 0 | 120 | 0% |
| QA | 0 | 0 | 60 | 0% |
| DEVOPS | 0 | 0 | 30 | 0% |
| DESIGN | 0 | 0 | 12 | 0% |

_Brak zadań IMP – sprint rezerwowy (bufor harmonogramu)._

**Demo / rezultat:** Aplikacja 1.0 zatwierdzona w App Store i Google Play (cel: do 16.04); turniej pilotażowy skonfigurowany na produkcji; tablety organizatora sparowane w próbie technicznej.

**Ryzyka sprintu:** RP-08 (odrzucenie w sklepie – plan B: TestFlight/testy zamknięte), RP-07, RP-13 (tablety organizatora). (rejestr: [05-rejestr-ryzyk.md](05-rejestr-ryzyk.md))

**Uwagi:** Brak zaplanowanych zadań IMP – sprint jest **buforem harmonogramu** (ok. 2 tygodnie) na opóźnienia z SP-01…SP-11. Wolna pojemność MOB i projektanta – przygotowanie v1.1 (BL-01, układ pionowy) za flagą funkcji, bez wydania przed pilotem.

### SP-13

**19.04.2027 – 30.04.2027** · dni robocze: 9 (efektywnie 9) · zadań: 1 · kamień milowy: M8 (30.04)

**Cel sprintu:** Pilotażowy turniej (sobota 24.04.2027) z dyżurem zespołu, zebranie metryk sukcesu MVP, raport po pilocie, retrospektywa z organizatorem i przekazanie uwag do backlogu v1.1.

| Rola | h (bez buforów) | h z buforem | Pojemność (h) | Obciążenie |
|---|---|---|---|---|
| BE | 6 | 10,4 | 108 | 10% |
| MOB | 6 | 10,4 | 108 | 10% |
| QA | 0 | 0 | 54 | 0% |
| DEVOPS | 0 | 0 | 27 | 0% |
| DESIGN | 0 | 0 | 10,8 | 0% |

**BE**

| Poz. | Zadanie | Tytuł | h | h z buf. | Ryzyko | Zależności | Plan |
|---|---|---|---|---|---|---|---|
| 1 | [IMP-556](../04-implementation-plans/13-wydanie.md#imp-556--wsparcie-pilotażowego-turnieju) | Wsparcie pilotażowego turnieju (FULL – ½ BE, ½ MOB) | 12 (½ = 6) | 20,7 (½ = 10,4) | wysokie | IMP-555 | 19.04–28.04 |

**MOB**

| Poz. | Zadanie | Tytuł | h | h z buf. | Ryzyko | Zależności | Plan |
|---|---|---|---|---|---|---|---|
| 1 | [IMP-556](../04-implementation-plans/13-wydanie.md#imp-556--wsparcie-pilotażowego-turnieju) | Wsparcie pilotażowego turnieju (FULL – ½ BE, ½ MOB) | 12 (½ = 6) | 20,7 (½ = 10,4) | wysokie | IMP-555 | 19.04–28.04 |

**Demo / rezultat:** Raport pilota z metrykami sukcesu (0 utraconych ocen, wyniki ≤ 2 min, PDF w dniu zawodów) i decyzją o v1.1 (przegląd 29.04).

**Ryzyka sprintu:** R-02, R-03, RP-07 (termin turnieju), RP-13 (tablety i sieć na miejscu). (rejestr: [05-rejestr-ryzyk.md](05-rejestr-ryzyk.md))

**Uwagi:** 30.04 – dzień wolny za 1.05 (ZAL-03). Kamień milowy M8 (30.04.2027). Okno zamrożenia wdrożeń 22–25.04 (`ops/freeze-windows.yaml`, NFR-905).

## 4. Kontrola poprawności planu

Plan sprawdzono skryptem kontrolnym PM (parsuje ten plik i porównuje z kartami zadań – [91-indeks-zadan.md](../04-implementation-plans/91-indeks-zadan.md)). Wynik z 24.10.2026:

| Sprawdzenie | Wynik |
|---|---|
| Każde z 250 zadań w dokładnie jednym sprincie | ✔ 250/250; brakujących: 0; w wielu sprintach: 0; spoza indeksu: 0 |
| Suma szacunków w planie | ✔ 1679 h (indeks: 1679 h) |
| Zależności Tech Leada (91-indeks) | ✔ 493 relacji; naruszeń: 0 |
| Zależności PM (DoR IMP-650, porządkowe) | ✔ 36 relacji; naruszeń: 0 |
| Bramka RC (IMP-464, IMP-466, IMP-408) | ✔ 708 relacji; naruszeń: 0 |
| Zależności w obrębie jednego sprintu | 152 relacji – w każdej zależność ma niższą pozycję („Poz.”) niż zadanie |
| Maksymalne obciążenie roli (h z buforem / pojemność) | ✔ DEVOPS SP-04 100%; sprintów > 100%: 0 |

## 5. Rejestr zmian planu

| Data | Wersja | Zmiana | Autor |
|---|---|---|---|
| 24.10.2026 | 1.0 | Pierwsza wersja planu (wariant bazowy) | PM |

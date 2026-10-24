# Założenia planistyczne i metoda planowania

> Dokument: `05-project-management/00-zalozenia-planistyczne.md` · Project Manager (Agent 3) · Wersja 1.0 · 24.10.2026
> Wejście: [99-przekazanie-dla-pm.md](../04-implementation-plans/99-przekazanie-dla-pm.md), [91-indeks-zadan.md](../04-implementation-plans/91-indeks-zadan.md), [00-konwencje-i-definition-of-done.md](../04-implementation-plans/00-konwencje-i-definition-of-done.md), [98-weryfikacja-tech-leada.md](../01-architecture/98-weryfikacja-tech-leada.md).
> Wszystkie pozycje `ZAL-NN` są **założeniami do potwierdzenia** przez właściciela produktu (PO) i sponsora. Zmiana założenia wymaga przeliczenia [harmonogramu](04-harmonogram.md) i [budżetu](08-budzet.md).

## 1. Dokumenty zarządzania projektem

| Plik | Zawartość |
|---|---|
| [00-zalozenia-planistyczne.md](00-zalozenia-planistyczne.md) | założenia `ZAL-NN`, model pojemności, metoda planowania (ten dokument) |
| [01-roadmapa.md](01-roadmapa.md) | wersje produktu i fazy F0…F6, v1.1, v2; Gantt faz i epików |
| [02-kamienie-milowe.md](02-kamienie-milowe.md) | kamienie milowe M0…M9 z kryteriami wyjścia |
| [03-plan-sprintow.md](03-plan-sprintow.md) | sprinty SP-01…SP-13 z zadaniami IMP per rola, obciążeniem i kontrolą zależności |
| [04-harmonogram.md](04-harmonogram.md) | kalendarz, święta, okna UAT, sklepów i pilota, terminy zewnętrzne, warianty zespołu |
| [05-rejestr-ryzyk.md](05-rejestr-ryzyk.md) | rejestr ryzyk R-01…R-12, RT-01…RT-10, RP-01…RP-14 |
| [06-decyzje-i-zaleznosci-zewnetrzne.md](06-decyzje-i-zaleznosci-zewnetrzne.md) | pytania Q-01…Q-19 z terminami decyzji, zależności zewnętrzne ZZ-01…ZZ-15 |
| [07-zespol-role-raci.md](07-zespol-role-raci.md) | skład, role, RACI, ceremonie, komunikacja, DoR/DoD |
| [08-budzet.md](08-budzet.md) | szacunek kosztów (praca, infrastruktura, licencje, urządzenia, pentest) |
| [09-plan-wydania-i-pilotazu.md](09-plan-wydania-i-pilotazu.md) | go/no-go, próba generalna, dzień pilota, plan awaryjny, metryki, feedback |
| [10-backlog-po-pilocie.md](10-backlog-po-pilocie.md) | backlog v1.1 i v2 (`BL-NN`) |
| [99-raport-spojnosci.md](99-raport-spojnosci.md) | końcowa kontrola spójności całej dokumentacji (`PM-NN`) |

## 2. Założenia

| ID | Obszar | Założenie (do potwierdzenia) | Skąd / uzasadnienie | Kto potwierdza |
|---|---|---|---|---|
| ZAL-01 | Start | Start prac zespołu w poniedziałek **2.11.2026**; tydzień 26–30.10.2026 to „tydzień 0” – zamówienia kont, urządzeń, umowy (bez zadań IMP) | polecenie PO; [06-decyzje §3](06-decyzje-i-zaleznosci-zewnetrzne.md#3-zależności-zewnętrzne) | PO, sponsor |
| ZAL-02 | Pojemność | **6 h efektywnej pracy dziennie** na osobę (30 h/tydz., jak w [99-przekazanie-dla-pm §2](../04-implementation-plans/99-przekazanie-dla-pm.md#2-założenia-o-składzie-zespołu-i-czas-trwania)); pozostałe 2 h – sprawy organizacji, e-mail, wsparcie; rozliczenie 8 h/dzień | TL | PM, TL |
| ZAL-03 | Kalendarz | Dni wolne: 11.11.2026, 24.12.2026, 25.12.2026, 1.01.2027, 6.01.2027, 29.03.2027 (Poniedziałek Wielkanocny; Wielkanoc 28.03.2027), 3.05.2027, 27.05.2027 (Boże Ciało). Święta w sobotę (26.12.2026, 1.05.2027) – dzień wolny w zamian: **31.12.2026** i **30.04.2027** | Kodeks pracy art. 130 §2; dla umów B2B – ustalenie zespołowe | PM |
| ZAL-04 | Kalendarz | Okres świąteczny o obniżonej pojemności (urlopy): 21–23.12.2026, 28–30.12.2026, 4–5.01.2027 – **50%** | doświadczenie; SP-04 ma ok. 65%, SP-05 ok. 45% zwykłej pojemności | PM, zespół |
| ZAL-05 | Zespół | 2 × BE, 2 × MOB (React Native/Expo), 1 × QA (0,5 etatu w SP-02, pełny etat od SP-03; brak w SP-01), DevOps, projektant, Tech Lead 0,5 (przeglądy i architektura – **poza pojemnością planu**), PM 0,5, PO po stronie zamawiającego | [99-przekazanie-dla-pm §2](../04-implementation-plans/99-przekazanie-dla-pm.md#2-założenia-o-składzie-zespołu-i-czas-trwania) + decyzja PM (QA od SP-02 – w SP-01 brak zadań QA) | PO, sponsor |
| ZAL-06 | Zespół | **DevOps 1,0 etatu w SP-01…SP-03** (bootstrap infrastruktury; spike IMP-604 możliwy w 5. tygodniu – 30.11–1.12.2026), od SP-04 0,5 etatu | decyzja PM; bez tego spike IMP-604 przesuwa się do SP-05 (28.12), a gotowość produkcji o ok. 1 tydzień (wariant D – [04-harmonogram §6](04-harmonogram.md#6-warianty-zespołu-i-wpływ-na-daty)) | PO, sponsor |
| ZAL-07 | Zespół | Projektant **0,6 etatu w SP-01** (IMP-650 – akceptacja ekranów poza designem w 1.–2. tygodniu, Q-08), od SP-02 0,2 etatu (ok. 1 dzień w tygodniu) | [15-design-i-akceptacje.md](../04-implementation-plans/15-design-i-akceptacje.md) | PO |
| ZAL-08 | Bufory | Harmonogram liczony na **godzinach z buforem** (ryzyko per zadanie 10/25/50% + narzut 15% = 2308 h); dodatkowo **rezerwa kalendarzowa ok. 2 tygodni** (SP-12) przed pilotem | [00-konwencje §2](../04-implementation-plans/00-konwencje-i-definition-of-done.md#2-skala-szacowania), praktyka PM | PO |
| ZAL-09 | Metoda | Zadanie wykonuje jedna osoba i nie przechodzi przez granicę sprintu; wyjątki: IMP-465 i IMP-556 (BE + MOB) | decyzja PM | TL |
| ZAL-10 | Role | Zadania FULL (IMP-021, 069, 070, 174, 179, 604) wykonuje BE – BE ma zapas pojemności, MOB jest wąskim gardłem (w IMP-604 i IMP-174 osoba MOB konsultuje część kliencką); IMP-465 i IMP-556 – po połowie BE i MOB | [00-konwencje §9](../04-implementation-plans/00-konwencje-i-definition-of-done.md#9-format-karty-zadania) („FULL może wykonać BE lub MOB”) | TL |
| ZAL-11 | Dostępność | Brak innych planowanych urlopów do 30.04.2027; choroby i urlopy indywidualne (w tym ferie zimowe I–II 2027) pokrywa bufor; przekroczenie → [RP-02](05-rejestr-ryzyk.md#rp-02) | – | zespół |
| ZAL-12 | Pojemność | Wolna pojemność BE w SP-08…SP-11 (ok. 390 h) to rezerwa na defekty z E2E, UAT i pentestu, wsparcie QA (helpery E2E, dane) i przygotowanie pentestu; decyzja o ewentualnym zwolnieniu jednej osoby BE po SP-08 – na przeglądzie SP-07 ([08-budzet §6](08-budzet.md#6-opcje-optymalizacji)) | wynik symulacji | PM, TL |
| ZAL-13 | UAT | Próba generalna (UAT) w **sobotę 20.03.2027** (sędziowie dostępni w weekend; zespół odbiera dzień wolny) | [07-uat-proba-generalna.md](../03-test-plans/07-uat-proba-generalna.md), harmonogram | PO, organizator pilotażowy |
| ZAL-14 | Pilot | Pilotażowy turniej w **sobotę 24.04.2027** (termin zapasowy: 15.05.2027) | dopasowanie do harmonogramu; termin zależy od kalendarza organizatora ([ZZ-10](06-decyzje-i-zaleznosci-zewnetrzne.md#3-zależności-zewnętrzne)) | PO, organizator pilotażowy |
| ZAL-15 | Sklepy | Konta **organizacyjne** w Apple Developer Program (D-U-N-S) i Google Play; przegląd 1.0 trwa do 2 tygodni (zgłoszenie 1.04, cel zatwierdzenia 16.04.2027) | [13-wydanie.md](../04-implementation-plans/13-wydanie.md) | PM |
| ZAL-16 | Technologia | Expo SDK 59 – jeśli wydany do ok. 19.02.2027 (6 tygodni przed zamrożeniem 1.0 2.04), IMP-507 aktualizuje SDK w SP-10; w przeciwnym razie tylko łatki SDK 58 | karta IMP-507 | TL |
| ZAL-17 | Platformy | Google Play: target API 36 wymagane od 31.08.2026 (spełnia Expo SDK 58); target API 37 – oczekiwany wymóg od ok. 31.08.2027 (powtarzalny roczny cykl; nieogłoszony oficjalnie na dzień 24.10.2026) → układ pionowy tabletu w v1.1 ([ADR-013](../01-architecture/adr/ADR-013-orientacja-i-rozmiar-okna-tabletu.md)). Apple: minimalna wersja SDK do zgłoszeń zmienia się zwykle w kwietniu – sprawdzić komunikaty App Store Connect w I 2027 | TL (RT-07), strona Google „Target API level requirements” | TL |
| ZAL-18 | Budżet | Stawki godzinowe, kurs USD/PLN i ceny dostawców – parametry w [08-budzet §1](08-budzet.md#1-parametry-i-założenia-kosztowe) | rynek PL 2026 (szacunek) | sponsor |
| ZAL-19 | Pilot | Organizator zapewnia tablety ≥ 10″ i telefon z LTE; zespół ma 2 tablety zapasowe i urządzenia referencyjne | [99-przekazanie-dla-tech-leada §8](../01-architecture/99-przekazanie-dla-tech-leada.md#8-założenia-przyjęte-bez-potwierdzenia) | organizator pilotażowy |
| ZAL-20 | Decyzje | Pytania Q-xx – w planie obowiązują założenia domyślne; decyzja po terminie z [06-decyzje §2](06-decyzje-i-zaleznosci-zewnetrzne.md#2-pytania-otwarte-q-01q-19) = wniosek o zmianę (ocena wpływu przez TL i PM) | [00-konwencje §4](../04-implementation-plans/00-konwencje-i-definition-of-done.md#4-definition-of-ready) | PO |

## 3. Model pojemności

Pojemność roli w sprincie = Σ dni robocze × 6 h × etat × dostępność dnia (święto 0, okres świąteczny 0,5).

| Rola | Etat | SP-01 | SP-02 | SP-03 | SP-04 | SP-05 | SP-06…SP-10 | SP-11 | SP-12 | SP-13 |
|---|---|---|---|---|---|---|---|---|---|---|
| Dni robocze (efektywne) | – | 9 (9) | 10 (10) | 10 (10) | 8 (6,5) | 7 (4,5) | 10 (10) | 9 (9) | 10 (10) | 9 (9) |
| BE | 2 × 1,0 | 108 h | 120 h | 120 h | 78 h | 54 h | 120 h | 108 h | 120 h | 108 h |
| MOB | 2 × 1,0 | 108 h | 120 h | 120 h | 78 h | 54 h | 120 h | 108 h | 120 h | 108 h |
| QA | 0 → 0,5 → 1,0 | 0 h | 30 h | 60 h | 39 h | 27 h | 60 h | 54 h | 60 h | 54 h |
| DEVOPS | 1,0 → 0,5 | 54 h | 60 h | 60 h | 19,5 h | 13,5 h | 30 h | 27 h | 30 h | 27 h |
| DESIGN | 0,6 → 0,2 | 32,4 h | 12 h | 12 h | 7,8 h | 5,4 h | 12 h | 10,8 h | 12 h | 10,8 h |

## 4. Metoda planowania

1. **Dane:** 250 kart zadań (szacunek, ryzyko, rola, zależności) z [91-indeks-zadan.md](../04-implementation-plans/91-indeks-zadan.md); godziny z buforem = szacunek × (1 + bufor ryzyka) × 1,15.
2. **Symulacja z ograniczonymi zasobami** (list scheduling, krok = ułamek dnia): każda osoba (BE1, BE2, MOB1, MOB2, QA, DEVOPS, DESIGN) bierze najwyżej położone gotowe zadanie swojej roli. Priorytet: (a) faza z [99-przekazanie-dla-pm §3](../04-implementation-plans/99-przekazanie-dla-pm.md#3-sugerowane-fazy-i-kolejność), (b) najdłuższa ścieżka do końca projektu, (c) premia dla spike'ów, silnika punktacji (IMP-050…057 – jedna osoba BE od 1. tygodnia) i zadań MOB wysokiego ryzyka (IMP-206, 305, 310, 350, 354, 500), zgodnie z zaleceniami TL ([99-przekazanie-dla-pm §4](../04-implementation-plans/99-przekazanie-dla-pm.md#4-ścieżka-krytyczna), [90-graf §3](../04-implementation-plans/90-graf-zaleznosci.md#3-ścieżka-krytyczna)). Premia przesuwa gotowość produkcji o ok. 1 tydzień, ale ujawnia ryzyka R-01 i R-02 w SP-04…SP-06 zamiast w SP-08…SP-09.
3. **Zależności dodatkowe PM** (nie zmieniają decyzji TL, porządkują pracę): DoR ekranów poza designem po IMP-650; porządkowe (lokalne środowisko, walidacja i logowanie przed pierwszymi endpointami, teksty i i18n przed pierwszymi ekranami, wpisy w sklepach po finalnych ekranach, dystrybucja pilotażowa po E2E pełnego turnieju); **bramka RC** – UAT, regres przed wydaniem i pentest dopiero po zakończeniu wszystkich zadań funkcjonalnych. Pełna lista: [03-plan-sprintow §1](03-plan-sprintow.md#1-zasady-i-metoda).
4. **Przypisanie do sprintów:** zadanie trafia do sprintu, w którym jest wykonywane (nie przechodzi przez granicę sprintu); kotwice kalendarzowe dla próby generalnej (IMP-465, 20.03.2027) i pilota (IMP-556, 24.04.2027).
5. **Kontrola:** skrypt PM sprawdza, że każde z 250 zadań jest w dokładnie jednym sprincie, każda zależność (TL i PM) jest w sprincie wcześniejszym albo wcześniej w tym samym sprincie, suma godzin = 1679 h i żadna rola nie przekracza 100% pojemności – wynik w [03-plan-sprintow §4](03-plan-sprintow.md#4-kontrola-poprawności-planu).
6. **Warianty:** ta sama symulacja dla innego składu zespołu – [04-harmonogram §6](04-harmonogram.md#6-warianty-zespołu-i-wpływ-na-daty).

## 5. Rejestr zmian

| Data | Wersja | Zmiana | Autor |
|---|---|---|---|
| 24.10.2026 | 1.0 | Pierwsza wersja | PM |

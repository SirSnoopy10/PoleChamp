# Testy zgodności z designem

> Dokument: `03-test-plans/06-testy-zgodnosci-z-designem.md` · Tech Lead · 23.10.2026 · Strategia: [00-strategia-testowania.md](00-strategia-testowania.md)
> Źródło wyglądu: `design/PoleChamp v2.dc.html` (nadrzędne), `design/_ds/nocturne-*/`, uwagi `design/uploads/*.png` → reguły UI-01…UI-15 ([03-analiza-designu.md §6](../00-research/03-analiza-designu.md#6-uwagi-z-przeglądu-designu-uploads)).

## 1. Podejście

1. **Wzorce z prototypu:** dla ekranów z designu (SCR-ORG-00…12, SCR-JDG-00…05) projektant akceptuje zrzuty aplikacji porównane z prototypem w tych samych wymiarach (iPhone 402×874 dp, tablet 1100×720 dp) i na tych samych danych (`FX-SEED`). Dopuszczalne odchylenie wymiarów i odstępów: ≤ 2 dp (NFR-210).
2. **Regresja wizualna:** po akceptacji zrzuty stają się wzorcami w repozytorium (Git LFS). Nocny przebieg Maestro wykonuje zrzuty, a `odiff` porównuje je z progiem 0,1% pikseli; różnice trafiają do raportu w PR (akceptacja nowego wzorca wymaga projektanta – [IMP-653](../04-implementation-plans/15-design-i-akceptacje.md)).
3. **Reguły UI:** każda reguła UI-01…UI-15 ma przypadek z konkretnymi ekranami i stanami; dodatkowo checklista PR z 09-design-system §7.
4. **Ekrany poza designem:** najpierw akceptacja projektanta (Q-08, [IMP-650](../04-implementation-plans/15-design-i-akceptacje.md)), potem wzorce.
5. **Warunki zrzutów:** stała data (np. 2026-10-03 10:00 Europe/Warsaw), wyłączone animacje, czcionka systemowa 100% (osobne zestawy 120/130% dla TC-A11Y), tryb ciemny wymuszony.

## 2. Przypadki (26)

| ID | Tytuł | Poziom | Prio | Warunki wstępne | Kroki | Oczekiwany wynik | Odwołania |
|---|---|---|---|---|---|---|---|
| <a id="tc-design-001"></a>TC-DESIGN-001 | UI-01 – zakładka Wyniki w każdym statusie | wizualny | P1 | Kategoria DRAFT, Trwa, Zakończona | Zakładka „Wyniki” w każdym stanie. | Dostępna zawsze; bez ocen wiersze „—”, „brak ocen”, miejsca „–”; objaśnienie wzoru; brak emoji. | UI-01, FR-701, NFR-208 |
| <a id="tc-design-002"></a>TC-DESIGN-002 | UI-02 – status nigdy jako przycisk | wizualny | P1 | Turniej Zakończona | SCR-ORG-03. | Brak przycisku akcji; status tylko pigułką; brak „Dodaj”. | UI-02, FR-208 |
| <a id="tc-design-003"></a>TC-DESIGN-003 | UI-03 – tryb tylko do odczytu | wizualny | P1 | Kategoria zablokowana na tablecie | SCR-JDG-04/05. | Jeden baner; kontrolki przygaszone (0,55) i nieinteraktywne; brak stopki. | UI-03, FR-609 |
| <a id="tc-design-004"></a>TC-DESIGN-004 | UI-04 – brak kontrolek systemowych | wizualny | P1 | DevCatalog i wszystkie ekrany | Przegląd zrzutów (iOS i Android). | Suwaki, pola, przełączniki, checkboxy w stylu Nocturne; brak domyślnych niebieskich kciuków i pierścieni fokusu. | UI-04, NFR-208 |
| <a id="tc-design-005"></a>TC-DESIGN-005 | UI-05 – brak nachodzenia tekstów | wizualny | P1 | Dane z długimi nazwami (EC długie nazwy), czcionka 100/120/130% | Zrzuty SCR-ORG-03, 06–08, SCR-JDG-04/05. | Brak nakładania; wielokropki tam, gdzie przewidziano; „/10” bez zawijania. | UI-05, NFR-204 |
| <a id="tc-design-006"></a>TC-DESIGN-006 | UI-06 – brak akcji destrukcyjnych w wierszach | wizualny | P1 | Listy kryteriów, kar, zawodniczek, sędziów, urządzeń | Przegląd. | Usuwanie wyłącznie w arkuszu edycji z potwierdzeniem. | UI-06, FR-305, FR-307 |
| <a id="tc-design-007"></a>TC-DESIGN-007 | UI-07 – afordancja edycji | wizualny | P2 | Listy konfiguracyjne | Przegląd w stanach DRAFT i Trwa. | Chevron przy edytowalnych; brak przy zablokowanych. | UI-07 |
| <a id="tc-design-008"></a>TC-DESIGN-008 | UI-08 – stan aktywny = tint + obrys | wizualny | P2 | Segmented control, aktywny wiersz kolejki | Zrzuty. | Tło tint (`accent14OnBg`) i obrys accent-700; bez zalania akcentem. | UI-08 |
| <a id="tc-design-009"></a>TC-DESIGN-009 | UI-09 – brak widocznych pasków przewijania | wizualny | P2 | Długie listy | Przewijanie na iOS i Androidzie. | Brak systemowych pasków przewijania w kontenerach treści; treść nie wychodzi poza ramę. | UI-09 |
| <a id="tc-design-010"></a>TC-DESIGN-010 | UI-10 – bezpieczny obszar | wizualny | P1 | iPhone z Dynamic Island (symulator 16/17), Android z paskiem gestów | Wszystkie ekrany organizatora. | „‹ Turniej” nie nachodzi na pasek statusu; paski przyklejone nad wskaźnikiem domowym. | UI-10 |
| <a id="tc-design-011"></a>TC-DESIGN-011 | UI-11 – pigułki, chipy, przyciski bez zawijania | wizualny | P2 | Pseudolokalizacja +30% | Zrzuty. | Jedna linia; skracanie wielokropkiem. | UI-11, NFR-604 |
| <a id="tc-design-012"></a>TC-DESIGN-012 | UI-12 – kara jako licznik | wizualny | P1 | SCR-JDG-05 | Zrzut kart kar w stanach 0, 1, maks. | Nazwa, „−2 pkt za każde · maks. 3×”, licznik, −/+; „+” przygaszony przy maksimum. | UI-12, FR-604 |
| <a id="tc-design-013"></a>TC-DESIGN-013 | UI-13 – stała stopka nie zasłania treści | wizualny | P1 | Formularz z komentarzem na dole | Przewiń do komentarza; otwórz klawiaturę. | Stopka poza obszarem przewijania; komentarz w pełni widoczny nad stopką i klawiaturą. | UI-13, FR-606 |
| <a id="tc-design-014"></a>TC-DESIGN-014 | UI-14 – wzorzec wiersza i typografia liczb | wizualny | P2 | SCR-ORG-06 | Zrzut. | Nazwa, „Skala 0–10”, odznaka „×2”, chevron; półpauza, „×”, „−”, przecinek. | UI-14, FR-304 |
| <a id="tc-design-015"></a>TC-DESIGN-015 | UI-15 – nazwiska w jednej linii | wizualny | P1 | Nazwisko 60 znaków | Lista startowa, kolejka, formularz, ranking. | Jedna linia z wielokropkiem; pełna wartość dla czytnika. | UI-15, FR-401, FR-602 |
| <a id="tc-design-016"></a>TC-DESIGN-016 | Regresja wizualna – SCR-ORG-00…03 | wizualny | P1 | Wzorce zatwierdzone przez projektanta; symulator iPhone 12 (402×874 jak w prototypie), dane FX-SEED, zamrożony czas | Maestro: zrzuty SCR-ORG-00 (klatka), 01, 02, 03 w stanach W przygotowaniu / Trwa / Zakończona; odiff. | Różnica ≤ progu 0,1% pikseli; odchylenia wymiarów ≤ 2 dp względem prototypu (NFR-210). | SCR-ORG-00, SCR-ORG-01, SCR-ORG-02, SCR-ORG-03, NFR-210 |
| <a id="tc-design-017"></a>TC-DESIGN-017 | Regresja wizualna – SCR-ORG-04…08 | wizualny | P1 | Jak wyżej | Zrzuty arkusza zakończenia, nowej/edycji kategorii, zakładek Kryteria, Zawodniczki, Wyniki. | Jak wyżej. | SCR-ORG-04, SCR-ORG-05, SCR-ORG-06, SCR-ORG-07, SCR-ORG-08, NFR-210 |
| <a id="tc-design-018"></a>TC-DESIGN-018 | Regresja wizualna – SCR-ORG-09…12 | wizualny | P1 | Jak wyżej | Zrzuty arkuszy kryterium, kary, zawodniczki, podglądu PDF (oba zakresy). | Jak wyżej. | SCR-ORG-09, SCR-ORG-10, SCR-ORG-11, SCR-ORG-12, NFR-210 |
| <a id="tc-design-019"></a>TC-DESIGN-019 | Regresja wizualna – SCR-JDG-00…02 | wizualny | P1 | Symulator iPada w poziomie (1100×720 dp jak w prototypie) | Zrzuty splash (klatka), wyboru profilu, PIN (pusty, 2 cyfry, błąd). | Jak wyżej. | SCR-JDG-00, SCR-JDG-01, SCR-JDG-02, NFR-210 |
| <a id="tc-design-020"></a>TC-DESIGN-020 | Regresja wizualna – SCR-JDG-03…05 | wizualny | P1 | Jak wyżej | Zrzuty listy kategorii, kolejki, formularza (nowa, „Oceniono”, zablokowana, z karami). | Jak wyżej. | SCR-JDG-03, SCR-JDG-04, SCR-JDG-05, NFR-210 |
| <a id="tc-design-021"></a>TC-DESIGN-021 | Ekrany poza designem – akceptacja projektanta | manual | P1 | Q-08; ekrany SCR-SYS-01, SCR-ORG-13…22, SCR-JDG-06…10, nakładka orientacji, pigułka „Nierozegrana” | Przegląd zrzutów z projektantem; zapis decyzji. | Każdy ekran zaakceptowany albo z listą poprawek (zadania IMP-650/651); po akceptacji zrzuty stają się wzorcami regresji. | SCR-SYS-01, SCR-ORG-13, SCR-ORG-14, SCR-ORG-15, SCR-ORG-16, SCR-ORG-17, SCR-ORG-18, SCR-ORG-19, SCR-ORG-20, SCR-ORG-21, SCR-ORG-22, SCR-JDG-06, SCR-JDG-07, SCR-JDG-08, SCR-JDG-09, SCR-JDG-10, Q-08 |
| <a id="tc-design-022"></a>TC-DESIGN-022 | Regresja wizualna – ekrany poza designem | wizualny | P2 | Wzorce z TC-DESIGN-021 | Zrzuty wszystkich ekranów z TC-DESIGN-021. | Różnica ≤ progu. | SCR-ORG-13, SCR-ORG-14, SCR-ORG-15, SCR-ORG-16, SCR-ORG-17, SCR-ORG-18, SCR-ORG-19, SCR-ORG-20, SCR-ORG-21, SCR-ORG-22, SCR-JDG-06, SCR-JDG-07, SCR-JDG-08, SCR-JDG-09, SCR-JDG-10, SCR-SYS-01 |
| <a id="tc-design-023"></a>TC-DESIGN-023 | Katalog komponentów (DevCatalog) | wizualny | P1 | Build development | Zrzuty każdego komponentu w każdym stanie (09-design-system §4). | Różnica ≤ progu; każdy nowy komponent ma wzorzec. | NFR-208, NFR-210 |
| <a id="tc-design-024"></a>TC-DESIGN-024 | Zasady Nocturne – checklista PR | manual | P2 | Każdy PR z UI | Checklista 09-design-system §7. | Wszystkie punkty spełnione (brak wypełnionych przycisków, #000/#fff, wag > 500…). | NFR-208, NFR-209 |
| <a id="tc-design-025"></a>TC-DESIGN-025 | Wyjątki kolorystyczne: QR i PDF | wizualny | P2 | SCR-ORG-16, PDF | Zrzut karty QR i strony PDF. | QR: jasne tło neutral-100, ciemne moduły; PDF jasny z accent-700 dla wyników. | NFR-209, FR-504, FR-706 |
| <a id="tc-design-026"></a>TC-DESIGN-026 | Ruch i czasy animacji | manual | P3 | Nagranie ekranu 60 fps | Arkusz, toast, splash, zmiana kolejności rankingu. | Czasy zgodne z 09-design-system §2.6 (±20 ms). | NFR-210 |


## 3. Lista kontrolna przeglądu projektanta

- Kolory wyłącznie z `@polechamp/tokens`; brak wypełnionych przycisków akcentem; brak `#000`/`#fff` poza cieniami, QR i PDF.
- Wagi czcionki 400/500; liczby tabelaryczne tam, gdzie w prototypie.
- Pigułki statusu nigdy jako przycisk; akcje destrukcyjne tylko w arkuszach z potwierdzeniem.
- Teksty identyczne z prototypem (klucze i18n) – w razie różnicy decyduje design, a dokumentacja jest aktualizowana.
- Stany dodatkowe (⟡) w stylu Nocturne: szkielety, błędy, offline, odrzucenia, nakładka orientacji.

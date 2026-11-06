# Wymagania funkcjonalne (FR)

> Dokument: `02-specification/03-wymagania-funkcjonalne.md` · Wersja 1.0 · 23.10.2026
> Konwencja ID: `FR-MNN`, gdzie `M` to moduł (1–9), a `NN` numer w module. Priorytet MoSCoW dla MVP. Kolumna „Ekrany” odsyła do [05-ekrany-organizatora.md](05-ekrany-organizatora.md) / [06-ekrany-sedziego.md](06-ekrany-sedziego.md), a „US” do [04-user-stories.md](04-user-stories.md). Oznaczenie **(poza designem)** dotyczy zachowania, którego nie ma w prototypie.

| Moduł | Zakres |
|---|---|
| 1xx | Konto i sesja organizatora |
| 2xx | Turnieje |
| 3xx | Kategorie, kryteria, kary |
| 4xx | Zawodniczki i lista startowa |
| 5xx | Sędziowie, urządzenia, logowanie PIN |
| 6xx | Ocenianie (panel sędziego) |
| 7xx | Wyniki, ranking, eksport |
| 8xx | Offline, synchronizacja, realtime |
| 9xx | Audyt, prywatność, administracja |

## 1xx – Konto i sesja organizatora (poza designem)

| ID | Wymaganie | Prio | Ekrany | US |
|---|---|---|---|---|
| FR-101 | System umożliwia rejestrację konta organizatora: e-mail, hasło (min. 10 znaków, nie z listy wycieków), nazwa wyświetlana, obowiązkowa akceptacja regulaminu i umowy powierzenia (zapis wersji). | M | SCR-ORG-13 | US-001 |
| FR-102 | System wysyła 6-cyfrowy kod weryfikacyjny (ważny 24 h, maks. 5 prób, ponowne wysłanie po 60 s). Bez weryfikacji e-maila organizator może konfigurować turniej, ale nie może go rozpocząć – ani przyciskiem „Rozpocznij turniej”, ani startem pierwszej kategorii (komunikat „Potwierdź adres e-mail, aby rozpocząć turniej.”). (Doprecyzowanie TL-10.) | M | SCR-ORG-13, SCR-ORG-03 | US-001 |
| FR-103 | Organizator loguje się e-mailem i hasłem. Sesja jest podtrzymywana do 30 dni bez aktywności (refresh token). | M | SCR-ORG-13 | US-002 |
| FR-104 | Organizator może zresetować hasło linkiem e-mail (ważny 1 h). System nie ujawnia, czy konto istnieje. | M | SCR-ORG-13 | US-002 |
| FR-105 | Organizator może się wylogować (SCR-ORG-21). Wylogowanie unieważnia sesję i czyści cache danych na telefonie. | M | SCR-ORG-21 | US-003 |
| FR-106 | Organizator może usunąć konto w aplikacji. Konto staje się nieaktywne od razu, a twarde usunięcie następuje po 30 dniach. Usunięcie jest niemożliwe przy turnieju w statusie Trwa, a dane turniejów są usuwane lub pseudonimizowane. Wniosek o usunięcie konta jest też dostępny na stronie WWW (wymóg Google Play). **Priorytet podniesiony do M przez Tech Leada (TL-22):** App Store Review Guideline 5.1.1(v) wymaga usuwania konta w aplikacji, jeśli aplikacja pozwala je założyć. | M | SCR-ORG-21 | US-003 |
| FR-107 | Po 5 nieudanych logowaniach w 15 min konto jest blokowane na 15 min (eskalacja do 24 h). Komunikat bez ujawniania, czy e-mail istnieje. | M | SCR-ORG-13 | US-002 |

## 2xx – Turnieje

| ID | Wymaganie | Prio | Ekrany | US |
|---|---|---|---|---|
| FR-201 | Lista turniejów organizatora w dwóch sekcjach: „Aktywne” (W przygotowaniu, Trwa) jako karty z pigułką statusu, nazwą, datą, miejscem, paskiem postępu i podsumowaniem „{n} kategorie · {pct}%”, oraz „Zakończone” (tylko gdy niepusta) jako lista z ikoną archiwum, nazwą i „{data} · {miejsce}”. Sortowanie: Aktywne – Trwa przed W przygotowaniu, potem data rosnąco; Zakończone – data malejąco. | M | SCR-ORG-01 | US-010 |
| FR-202 | Utworzenie turnieju w bottom sheecie „Nowy turniej”: Nazwa turnieju (wymagana, 3–120 znaków), Data (wybór 1 dnia lub zakresu, opcjonalna – brak daje „Data do ustalenia”), Miejsce (opcjonalne, maks. 120 znaków – brak daje „Miejsce do ustalenia”). Po zapisie status W przygotowaniu, przejście do szczegółów i toast „Utworzono turniej”. | M | SCR-ORG-02 | US-011 |
| FR-203 | Edycja nazwy, daty i miejsca turnieju (W przygotowaniu i Trwa). **(poza designem)** | S | SCR-ORG-20 | US-012 |
| FR-204 | Usunięcie turnieju w statusie W przygotowaniu, gdy nie ma ocen – z potwierdzeniem. **(poza designem)** | S | SCR-ORG-20 | US-012 |
| FR-205 | Szczegóły turnieju: pigułka statusu, nazwa, data i miejsce, kafle statystyk (Kategorie, Zawodniczki, Sędziowie), karta „Postęp oceniania” (procent, pasek, „{done} z {exp} ocen w rozpoczętych kategoriach” lub „Brak rozpoczętych kategorii”), lista kategorii z pigułkami i postępem „{done}/{exp} ocen”, stan pusty „Brak kategorii. Dodaj pierwszą, aby zacząć.” | M | SCR-ORG-03 | US-013 |
| FR-206 | „Rozpocznij turniej” (status W przygotowaniu) zmienia status na Trwa bez potwierdzenia i pokazuje toast „Turniej rozpoczęty”. Wymaga zweryfikowanego e-maila. | M | SCR-ORG-03 | US-014 |
| FR-207 | „Zakończ turniej” (status Trwa) otwiera potwierdzenie „Zakończyć turniej?” z treścią „„{nazwa}” zostanie zamknięty, a wyniki zapisane jako ostateczne.”. Po potwierdzeniu: kategorie Trwa zostają zablokowane (wyniki ostateczne), kategorie W przygotowaniu oznaczone jako nierozegrane, sesje sędziów zamknięte, status Zakończona, toast „Turniej zakończony”. | M | SCR-ORG-03, SCR-ORG-04 | US-015 |
| FR-208 | Turniej Zakończona jest tylko do odczytu: brak przycisku akcji statusu, brak „Dodaj” w sekcji Kategorie, brak edycji kategorii, kryteriów, kar i zawodniczek; dostępne są podgląd i eksport. (Korekta względem v2 – uwaga UI-02.) | M | SCR-ORG-03, 06–08 | US-015 |
| FR-209 | Postęp turnieju = Σ złożonych arkuszy / Σ (aktywne starty × sędziowie panelu) w kategoriach o statusie Trwa lub Zakończona; procent zaokrąglony do liczby całkowitej. | M | SCR-ORG-01, 03 | US-013 |
| FR-210 | Ekran startowy organizatora (splash) z animacją tancerki, logo „PoleChamp”, podtytułem „System oceniania zawodów pole dance”, paskiem postępu i komunikatami „Wczytywanie turniejów…” → „Synchronizacja wyników…” → „Gotowe”. Trwa tyle, ile ładowanie danych (min. 1,2 s, maks. 4,3 s). Pokazywany przy zimnym starcie. | S | SCR-ORG-00 | US-016 |

## 3xx – Kategorie, kryteria, kary

| ID | Wymaganie | Prio | Ekrany | US |
|---|---|---|---|---|
| FR-301 | Dodanie kategorii (bottom sheet „Nowa kategoria”): Nazwa (wymagana, maks. 80), Styl (chipy: Pole Sport, Pole Art, Exotic, Doubles; domyślnie Pole Sport), Poziom (chipy: Beginner, Intermediate, Advanced, Pro, Elite; domyślnie Beginner), Grupa wiekowa (tekst, domyślnie „Open”). Kategoria dostaje kryteria i kary z szablonu stylu ([07-reguly-punktacji.md §8](07-reguly-punktacji.md#8-szablony-kryteriów-i-kar)). Toast „Dodano kategorię”. | M | SCR-ORG-05 | US-020 |
| FR-302 | Edycja kategorii („Edytuj kategorię”, przycisk „Zapisz zmiany”): nazwa i grupa wiekowa zawsze (poza turniejem Zakończona), styl i poziom tylko w W przygotowaniu. Toast „Zapisano zmiany”. | M | SCR-ORG-05, 06 | US-021 |
| FR-303 | Usunięcie kategorii w statusie W przygotowaniu (przycisk „Usuń kategorię” w arkuszu edycji, z potwierdzeniem). **(poza designem)** | S | SCR-ORG-05 | US-021 |
| FR-304 | Zakładka „Kryteria”: sekcja „Kryteria oceny” (wiersze: nazwa, „Skala 0–{max}”, odznaka wagi „×{waga}”, chevron) oraz informacja „Maksymalny wynik sędziego: {max} pkt”; sekcja „Kary punktowe” (wiersze: nazwa, „maks. {n}× na występ”, odznaka „−{pkt} pkt”, chevron). Licznik kryteriów w segmencie. | M | SCR-ORG-06 | US-022 |
| FR-305 | Dodanie / edycja / usunięcie kryterium (Nazwa kryterium – wymagana, maks. 60; Skala 0–max: liczba całkowita 1–20, domyślnie 10; Waga: 0,5–5,0, krok 0,5, domyślnie 1; Opis dla sędziów – opcjonalny, maks. 200). Usunięcie wymaga potwierdzenia **(poza designem)**. Operacje dostępne **tylko w W przygotowaniu** – po starcie wiersze bez chevronu, arkusz tylko do podglądu, informacja „Kryteria są zablokowane po rozpoczęciu kategorii.”. Toasty: „Dodano kryterium”, „Zapisano kryterium”, „Usunięto kryterium”. | M | SCR-ORG-09 | US-023 |
| FR-306 | Kategoria musi mieć co najmniej 1 i najwyżej 12 kryteriów oraz 0–10 kar. | M | SCR-ORG-06, 09, 10 | US-023 |
| FR-307 | Dodanie / edycja / usunięcie kary (Nazwa kary – wymagana, maks. 60; Punkty za 1 raz: ≥ 0,5, krok 0,5, maks. 50, domyślnie 1; Maks. wystąpień: 1–10, domyślnie 3). Te same reguły blokady i potwierdzenia co FR-305. Toasty: „Dodano karę”, „Zapisano karę”, „Usunięto karę”. | M | SCR-ORG-10 | US-024 |
| FR-308 | „Rozpocznij kategorię” (W przygotowaniu → Trwa). Warunki: ≥ 1 kryterium, ≥ 1 aktywna zawodniczka, ≥ 1 aktywny sędzia w turnieju, turniej nie jest Zakończona. Jeśli turniej jest W przygotowaniu, zostaje automatycznie rozpoczęty. Panel = wszyscy aktywni sędziowie turnieju. Toast „Kategoria rozpoczęta”. Przy niespełnionym warunku toast z przyczyną (np. „Dodaj co najmniej jedną zawodniczkę.”). | M | SCR-ORG-06 | US-025 |
| FR-309 | „Zakończ i zablokuj” (Trwa → Zakończona/zablokowana). Gdy brakuje ocen lub tablety panelu mają niewysłane oceny / są offline > 2 min, system pokazuje ostrzeżenie (SCR-ORG-18) z liczbą brakujących ocen i listą urządzeń oraz opcjami „Zablokuj mimo to” / „Anuluj”. Inaczej blokuje od razu. Toast „Kategoria zakończona”. Wyniki stają się ostateczne (suma kontrolna). | M | SCR-ORG-06, 18 | US-026 |
| FR-310 | „Odblokuj” (Zakończona → Trwa), dostępne, gdy turniej nie jest Zakończona. Toast „Kategoria odblokowana”. Zdarzenie zapisane w audycie. | M | SCR-ORG-06 | US-027 |
| FR-311 | Kryterium rozstrzygające remis = pierwsze kryterium na liście (domyślnie „Technika”). Zmiana przez UI – v1.1. | M | SCR-ORG-08 | US-071 |
| FR-312 | Status kategorii prezentowany pigułką („W przygotowaniu”, „Trwa”, „Zakończona”) i linią meta „{styl} · {poziom} · {grupa wiekowa}”, postęp „{done}/{exp} ocen”. | M | SCR-ORG-03, 06 | US-022 |

## 4xx – Zawodniczki i lista startowa

| ID | Wymaganie | Prio | Ekrany | US |
|---|---|---|---|---|
| FR-401 | Zakładka „Zawodniczki” (sekcja „Lista startowa”): wiersze z odznaką numeru startowego, imieniem i nazwiskiem (jedna linia, wielokropek), klubem, licznikiem ocen „{n}/{J}” z ikoną (komplet: `check-circle` fill accent-300; brak kompletu: `circle-dashed` neutral-500). Stan pusty „Lista startowa jest pusta.”. Kolejność wg kolejności startowej. Wyszukiwarka nad listą przy ≥ 15 pozycjach **(poza designem)**. | M (wyszukiwarka S) | SCR-ORG-07 | US-030 |
| FR-402 | Dodanie zawodniczki (bottom sheet „Nowa zawodniczka”): Nr startowy (wymagany, liczba całkowita 1–9999, unikalny w turnieju; podpowiedź = najmniejszy wolny numer > max w kategorii), Imię i nazwisko (wymagane, 2–100 znaków), Klub / szkoła (opcjonalne; puste wyświetlane jako „—”). Dostępne w W przygotowaniu i Trwa. Nowa pozycja trafia na koniec kolejki. Przycisk „Dodaj do listy”, toast „Dodano zawodniczkę”. | M | SCR-ORG-11 | US-031 |
| FR-403 | Edycja zawodniczki (te same pola) po tapnięciu wiersza. **(poza designem)** | S | SCR-ORG-17 | US-032 |
| FR-404 | Wycofanie zawodniczki („Wycofaj zawodniczkę”, z potwierdzeniem): start znika z kolejki sędziów, jest wyłączony z rankingu, oceny są zachowane, a w liście startowej ma etykietę „Wycofana”. Możliwe cofnięcie. Usunięcie („Usuń z listy”) tylko bez ocen. **(poza designem)** | S | SCR-ORG-17 | US-032 |
| FR-405 | Kolejność startowa = kolejność dodania (pozycja). Zmiana kolejności i losowanie – v1.1. | M | SCR-ORG-07 | US-030 |
| FR-406 | Opcjonalny rok urodzenia. Jeśli wskazuje na wiek < 18 lat w roku turnieju (lub zaznaczono „Niepełnoletnia”), wymagane jest potwierdzenie „Mam zgodę rodzica/opiekuna na przetwarzanie danych” – bez niego zapis jest blokowany. **(poza designem)** | S | SCR-ORG-11, 17 | US-033 |
| FR-407 | Import listy startowej z CSV (kolumny: numer, imię i nazwisko, klub, rok urodzenia) z podglądem błędów. | W (v1.1) | – | – |

## 5xx – Sędziowie, urządzenia, logowanie PIN

| ID | Wymaganie | Prio | Ekrany | US |
|---|---|---|---|---|
| FR-501 | Ekran „Sędziowie” (wejście przez kafel „Sędziowie” w szczegółach turnieju): lista sędziów z inicjałami, imieniem i nazwiskiem, stanem (aktywny / zablokowany PIN / nieaktywny) i liczbą ocen. **(poza designem)** | M | SCR-ORG-14 | US-040 |
| FR-502 | Dodanie sędziego (Imię i nazwisko, wymagane, unikalne w turnieju): system generuje losowy 4-cyfrowy PIN (bez wzorców trywialnych, unikalny w turnieju) i pokazuje go **jednorazowo** z przyciskiem „Kopiuj” i ostrzeżeniem „Zapisz PIN – nie będzie można go ponownie wyświetlić.”. **(poza designem)** | M | SCR-ORG-15 | US-040 |
| FR-503 | Reset PIN-u (nowy PIN pokazany jednorazowo, zdjęcie blokady, zamknięcie aktywnej sesji sędziego, unieważnienie weryfikatorów offline), zmiana nazwiska, dezaktywacja sędziego (dezaktywowany nie widnieje na ekranie wyboru profilu i nie wchodzi do paneli nowych kategorii). Usunięcie tylko bez ocen. **(poza designem)** | M | SCR-ORG-15 | US-041, US-042 |
| FR-504 | Parowanie tabletu: organizator generuje kod (QR + 8 znaków, ważny 10 min, do 10 tabletów). Tablet w trybie sędziego bez parowania pokazuje ekran parowania (skan QR / wpisanie kodu), a po sukcesie pobiera migawkę turnieju. **(poza designem)** | M | SCR-ORG-16, SCR-JDG-06 | US-043 |
| FR-505 | Lista urządzeń turnieju: nazwa, status (Online / Offline od {czas}), zalogowany sędzia, liczba niewysłanych ocen, poziom baterii, ostatnia synchronizacja; akcje: „Zmień nazwę”, „Odłącz urządzenie” (z potwierdzeniem). **(poza designem)** | M (bateria S) | SCR-ORG-14 | US-044 |
| FR-506 | Ekran startowy sędziego: animacja, logo, podtytuł „Panel sędziego”, komunikaty „Łączenie z turniejem…” → „Pobieranie list startowych…” → „Gotowe”, w tym czasie odświeżenie tokenu i synchronizacja (offline: przejście dalej po maks. 4,3 s z danymi lokalnymi). | M | SCR-JDG-00 | US-050 |
| FR-507 | Wybór profilu: nagłówek „Panel sędziego”, nazwa turnieju, etykieta „Wybierz swój profil”, siatka kart sędziów (3 kolumny; awatar z inicjałami, imię i nazwisko, „Sędzia”). | M | SCR-JDG-01 | US-050 |
| FR-508 | PIN: awatar, imię i nazwisko, „Wpisz 4-cyfrowy PIN”, 4 kropki, klawiatura 1–9, 0 i backspace; automatyczne sprawdzenie po 4. cyfrze (opóźnienie 160 ms); błąd „Nieprawidłowy PIN — spróbuj ponownie” i wyczyszczenie kropek; „Zmień sędziego” wraca do wyboru profilu. Podpowiedź PIN-ów demo tylko w buildzie demo. | M | SCR-JDG-02 | US-051 |
| FR-509 | Limity prób PIN: lokalnie 5 błędów → 30 s blokady (eskalacja ×2 do 15 min) z komunikatem „Zbyt wiele prób. Spróbuj za {s} s.”; globalnie 10 błędów → blokada do resetu przez organizatora („PIN zablokowany. Poproś organizatora o reset.”). | M | SCR-JDG-02, 08 | US-052 |
| FR-510 | Logowanie offline PIN-em (weryfikator lokalny), gdy ostatnia synchronizacja < 24 h i turniej na to pozwala. Sesja oznaczona jako offline. | M | SCR-JDG-02 | US-053 |
| FR-511 | Wylogowanie ikoną w nagłówku. Ponowny PIN wymagany po 15 min w tle lub 2 h bezczynności (bez wyboru profilu, szkic zachowany). | M | SCR-JDG-03…05 | US-054 |
| FR-512 | Jeden aktywny sędzia na urządzeniu i jedna aktywna sesja sędziego w turnieju. Nowe logowanie online zamyka poprzednią sesję („Zalogowano Cię na innym urządzeniu.”). | M | SCR-JDG-01 | US-054 |

## 6xx – Ocenianie (panel sędziego)

| ID | Wymaganie | Prio | Ekrany | US |
|---|---|---|---|---|
| FR-601 | Lista kategorii: nagłówek „Dzień dobry, {imię}”, podtytuł „Wybierz kategorię, aby rozpocząć ocenianie.”, siatka 3 kolumn kart (pigułka statusu, ikona kłódki dla zablokowanych, nazwa, „{styl} · {poziom}”, pasek i „{x}/{y} ocenione” lub „jeszcze nie rozpoczęto”); kategorie W przygotowaniu przygaszone (opacity 0,55), a tapnięcie pokazuje toast „Ta kategoria jeszcze się nie rozpoczęła”. Stan pusty „Organizator nie dodał jeszcze kategorii do tego turnieju.”. Sędzia widzi tylko kategorie, w których panelu jest (MVP: wszystkie). | M | SCR-JDG-03 | US-055 |
| FR-602 | Widok kategorii – panel boczny (300 px): „‹ Kategorie”, nazwa kategorii, pasek „{x}/{y} ocenione”, baner blokady (gdy zablokowana), kolejka w kolejności startowej (odznaka numeru, imię i nazwisko, klub, ikona stanu: nieoceniona `circle`, oceniona `check-circle`, czeka na wysyłkę `clock`, odrzucona `warning-circle`), wyróżnienie aktywnej pozycji. Panel prawy bez wyboru: „Wybierz zawodniczkę z listy, aby ją ocenić.”. | M | SCR-JDG-04 | US-056 |
| FR-603 | Formularz oceny: nagłówek (odznaka numeru, imię i nazwisko, klub, pigułka „Oceniono”, jeśli istnieje ocena), sekcja „Kryteria” (karta per kryterium: nazwa, odznaka „×{waga}”, opis, wartość „{v} /{skala}”, przyciski −/+ z krokiem 0,5, suwak 0–skala z krokiem 0,5). Wartość początkowa nowej oceny = połowa skali zaokrąglona do 0,5 (5,0 przy skali 10). Przy istniejącej ocenie – zapisane wartości. | M | SCR-JDG-05 | US-057 |
| FR-604 | Sekcja „Kary”: karta per kara („{nazwa}”, „−{pkt} pkt za każde · maks. {n}×”), −, licznik, +; licznik 0…maks.; „+” nieaktywny przy maksimum (opacity 0,35), „−” nieaktywny przy 0; karta wyróżniona, gdy licznik > 0. | M | SCR-JDG-05 | US-058 |
| FR-605 | Pole „Komentarz (opcjonalnie)”, placeholder „Krótka notatka do występu…”, maks. 500 znaków. | M | SCR-JDG-05 | US-057 |
| FR-606 | Stopka: „Twój wynik” – bieżący wynik sędziego (2 miejsca po przecinku – jak arkusz not organizatora, decyzja 6.11.2026) i „/ {max}”; chip „kary −{suma}” widoczny, gdy kary > 0; aktualizacja natychmiast przy każdej zmianie (≤ 50 ms). | M | SCR-JDG-05 | US-057 |
| FR-607 | Zatwierdzenie: zapis lokalny (transakcja) i wpis do kolejki wysyłki, toast „Zapisano ocenę: {imię i nazwisko}”. Przy włączonym auto-przejściu otwiera się następna **nieoceniona** zawodniczka w kolejności listy (szukanie od początku listy, z pominięciem bieżącej). Gdy nie ma nieocenionych, następuje powrót do pustego panelu. Etykieta przycisku: „Zatwierdź i dalej” (są kolejne nieocenione), „Zatwierdź ocenę” (ostatnia), „Zaktualizuj ocenę” (istnieje już ocena). | M | SCR-JDG-05 | US-059 |
| FR-608 | Sędzia może aktualizować własną ocenę, dopóki kategoria ma status Trwa (nowa rewizja). | M | SCR-JDG-05 | US-060 |
| FR-609 | Tryb tylko-do-odczytu (kategoria zablokowana): baner „Kategoria zakończona — tylko podgląd” w panelu bocznym, formularz przygaszony (opacity 0,55) i nieinteraktywny, brak stopki zatwierdzania. Podgląd zapisanych wartości jest możliwy. | M | SCR-JDG-04, 05 | US-061 |
| FR-610 | Sędzia widzi wyłącznie własne oceny i postęp. Nie widzi ocen innych sędziów ani rankingu. | M | SCR-JDG-* | US-062 |
| FR-611 | Autozapis szkicu formularza (debounce 300 ms) i jego odtworzenie po powrocie do zawodniczki lub po restarcie aplikacji; porzucenie szkicu przy zatwierdzeniu. **(poza designem)** | S | SCR-JDG-05 | US-063 |
| FR-612 | Wynik oficjalny arkusza liczy serwer wspólną biblioteką. Rozbieżność z wynikiem tabletu jest logowana (bez wpływu na sędziego). | M | – | US-064 |

## 7xx – Wyniki, ranking, eksport

| ID | Wymaganie | Prio | Ekrany | US |
|---|---|---|---|---|
| FR-701 | Zakładka „Wyniki” – sekcja „Ranking na żywo”: wiersz z miejscem (top 3 w kolorze accent-300 – tylko z ocenami), imieniem i nazwiskiem, wynikiem, „#{nr} · {klub}”, „{n}/{J} sędziów” lub „brak ocen”, pigułką „wstępny” przy wyniku niepełnym; nad listą „Pełne wyniki: {n} z {m}” (decyzja PO 30.10.2026; {m} – aktywne zawodniczki kategorii, także jeszcze bez ocen – decyzja 6.11.2026). Pod listą informacja „Wynik = średnia sędziów z (kryterium × waga − kary). Remis rozstrzyga wyższa ocena za Technikę.” (nazwa kryterium dynamicznie). | M | SCR-ORG-08 | US-070 |
| FR-702 | Wynik, zaokrąglenia, remisy i miejsca liczone wg [07-reguly-punktacji.md](07-reguly-punktacji.md). Starty bez ocen: „—”, bez miejsca („–”), na końcu wg numeru. Wycofane – poza rankingiem. | M | SCR-ORG-08, 12 | US-071 |
| FR-703 | Ranking i liczniki postępu aktualizują się automatycznie (≤ 2 s od przyjęcia oceny przez serwer, przy połączeniu online). | M | SCR-ORG-03, 07, 08 | US-072 |
| FR-704 | Wyniki niekompletne (n < J) mają etykietę „{n}/{J} sędziów”. W kategorii zablokowanej i w PDF dodatkowo pigułkę „wstępny” / adnotację. | M | SCR-ORG-08, 12 | US-071 |
| FR-705 | „Podgląd PDF” (bottom sheet): nagłówek z logo, nazwą turnieju, datą i miejscem; zakres „cały turniej” (ikona PDF w szczegółach turnieju; per kategoria nazwa + tabela miejsce. / nazwisko / wynik) lub „kategoria” („Eksport PDF” w kategorii; tytuł „{kategoria} · {status}”, tabela „#”, „Zawodniczka” (+ klub), „Wynik”). Przycisk „Pobierz PDF” generuje plik i otwiera systemowy arkusz udostępniania, toast „PDF zapisany”. | M | SCR-ORG-12 | US-073 |
| FR-706 | Plik PDF zawiera dodatkowo: datę i godzinę wygenerowania, status kategorii, wersję wyników, skrót sumy kontrolnej, adnotację o danych osobowych. Kategorie nierozegrane pomijane (turniej) z notą „Nie rozegrano: …”. | M | – | US-073 |
| FR-707 | Tapnięcie wiersza rankingu otwiera „Oceny zawodniczki”: wynik sędziego, noty kryteriów, kary, komentarz, czas, tryb (online/offline) dla każdego sędziego; „Historia zmian” dla oceny z rewizjami. **(poza designem)** | S | SCR-ORG-19 | US-074 |
| FR-708 | Eksport CSV wyników (kategoria / turniej, UTF-8 z BOM, separator „;”, przecinek dziesiętny – zgodnie z Excelem w polskich ustawieniach). Jeśli nie zmieści się w MVP – v1.1 (spójnie z [02-zakres-mvp.md](02-zakres-mvp.md)). | C | SCR-ORG-12 | – |
| FR-709 | Publiczne wyniki (link/QR, web). | W (v2) | SCR-PUB-01 | – |

## 8xx – Offline, synchronizacja, realtime

| ID | Wymaganie | Prio | Ekrany | US |
|---|---|---|---|---|
| FR-801 | Po pierwszej synchronizacji tablet działa w pełni offline: splash, logowanie PIN-em (FR-510), lista kategorii, kolejka, ocenianie, aktualizacja ocen. | M | SCR-JDG-* | US-080 |
| FR-802 | Zatwierdzone oceny trafiają do trwałej kolejki wysyłki (przetrwa restart i rozładowanie). Wysyłka automatyczna z ponowieniami (backoff do 60 s) i idempotencją. | M | – | US-080 |
| FR-803 | Wskaźnik synchronizacji w nagłówku panelu sędziego: „Zsynchronizowano”, „Wysyłanie… (n)”, „Offline · n w kolejce”, „Offline”, „Wymaga uwagi”. Tapnięcie pokazuje szczegóły i „Synchronizuj teraz”. **(poza designem)** | M | SCR-JDG-07 | US-081 |
| FR-804 | Zmiany organizatora (start/blokada/odblokowanie kategorii, nowe/wycofane zawodniczki, sędziowie) docierają do tabletów online ≤ 3 s (WS) lub ≤ 30 s (odpytywanie). | M | – | US-082 |
| FR-805 | Oceny odrzucone przez serwer (np. kategoria zablokowana) są oznaczone na tablecie (ikona, baner z liczbą i powodem). Organizator widzi baner „Odrzucone oceny ({n})” i listę z akcjami „Przyjmij” (wymaga kategorii Trwa) i „Odrzuć”. **(poza designem)** | M | SCR-JDG-04, SCR-ORG-22 | US-083 |
| FR-806 | Tablet wysyła heartbeat co 30 s (gdy online): liczba niewysłanych ocen, kursor, bateria, zalogowany sędzia. | M | – | US-044 |
| FR-807 | Organizator offline: ostatnie dane widoczne z banerem „Brak połączenia — dane mogą być nieaktualne. Zmiany są niedostępne.”, akcje zapisu nieaktywne. **(poza designem)** | M | SCR-ORG-* | US-084 |
| FR-808 | Wylogowanie sędziego lub odłączenie urządzenia przy niewysłanych ocenach pokazuje ostrzeżenie z liczbą ocen. Wylogowanie jest dozwolone (wysyłka trwa dalej), odłączenie – z opcją eksportu niewysłanych (S). **(poza designem)** | M | SCR-JDG-09 | US-085 |

## 9xx – Audyt, prywatność, administracja

| ID | Wymaganie | Prio | Ekrany | US |
|---|---|---|---|---|
| FR-901 | Każda zmiana stanu (turniej, kategoria, kryteria, kary, zawodniczki, sędziowie, urządzenia) i każda ocena są zapisywane w dzienniku audytu (kto, kiedy, urządzenie, przed/po). Dziennika nie można edytować. | M | – | US-090 |
| FR-902 | Historia rewizji oceny dostępna dla organizatora w SCR-ORG-19. | S | SCR-ORG-19 | US-074 |
| FR-903 | Regulamin, polityka prywatności i umowa powierzenia dostępne w aplikacji (SCR-ORG-13, SCR-ORG-21). Akceptacja przy rejestracji z wersją. | M | SCR-ORG-13, 21 | US-001 |
| FR-904 | Organizator może poprawić dane zawodniczki i zanonimizować ją („Usuń dane osobowe” – po ocenach zastępuje imię i nazwisko etykietą „Zawodniczka nr {nr}”, usuwa klub i rok urodzenia). Operacje są dostępne także w kategorii zablokowanej i w turnieju Zakończona (wyjątek RODO od trybu tylko do odczytu – TL-17) i nie zmieniają wyników. | S | SCR-ORG-17 | US-091 |
| FR-905 | Automatyczna pseudonimizacja danych zawodniczek i sędziów 24 miesiące po zakończeniu turnieju (konfigurowalne przez operatora). | M | – | US-091 |

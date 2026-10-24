# User stories (US)

> Dokument: `02-specification/04-user-stories.md` · Wersja 1.0 · 23.10.2026
> Format: „Jako {rola} chcę {cel}, aby {korzyść}”. Kryteria akceptacji w Gherkin (**Given / When / Then**, treść po polsku). Priorytet MoSCoW dla MVP. Odwołania do [FR](03-wymagania-funkcjonalne.md) i ekranów ([organizator](05-ekrany-organizatora.md), [sędzia](06-ekrany-sedziego.md)). Teksty w cudzysłowach „…” muszą być identyczne w aplikacji (klucze i18n).
> Dane w przykładach pochodzą z prototypu ([03-analiza-designu.md §8](../00-research/03-analiza-designu.md#8-dane-przykładowe-z-prototypu)).

## Epik E1 – Konto organizatora

### US-001 – Rejestracja konta · **Must**
Jako **organizatorka** chcę założyć konto, aby zarządzać własnymi turniejami.
FR: FR-101, FR-102, FR-903 · Ekrany: SCR-ORG-13
- **Given** nie mam konta **When** podam e-mail, hasło (≥ 10 znaków), nazwę i zaakceptuję regulamin oraz umowę powierzenia **Then** konto zostaje utworzone, dostaję e-mail z 6-cyfrowym kodem i widzę ekran wpisania kodu.
- **Given** podałam hasło z listy wycieków lub krótsze niż 10 znaków **When** wysyłam formularz **Then** pole hasła pokazuje błąd i konto nie powstaje.
- **Given** nie zaakceptowałam regulaminu **When** próbuję się zarejestrować **Then** przycisk „Załóż konto” jest nieaktywny.
- **Given** e-mail nie jest zweryfikowany **When** klikam „Rozpocznij turniej” **Then** widzę komunikat „Potwierdź adres e-mail, aby rozpocząć turniej.” i status się nie zmienia.

### US-002 – Logowanie i reset hasła · **Must**
Jako **organizatorka** chcę się zalogować i odzyskać hasło, aby mieć dostęp do turniejów w dniu zawodów.
FR: FR-103, FR-104, FR-107 · Ekrany: SCR-ORG-13
- **Given** mam konto **When** podam poprawny e-mail i hasło **Then** widzę SCR-ORG-01, a sesja jest zachowana po restarcie aplikacji (do 30 dni bez aktywności).
- **Given** 5 razy w ciągu 15 min podałam złe hasło **When** próbuję szósty raz **Then** widzę „Za dużo prób. Spróbuj za chwilę.”, a logowanie jest zablokowane na 15 min.
- **Given** zapomniałam hasła **When** podam e-mail w „Nie pamiętasz hasła?” **Then** zawsze widzę potwierdzenie wysłania (niezależnie od istnienia konta), a link resetu działa 1 h.

### US-003 – Wylogowanie i usunięcie konta · **Must** (usunięcie podniesione z Should do Must – TL-22, wymóg sklepów)
Jako **organizatorka** chcę się wylogować lub usunąć konto, aby chronić dane.
FR: FR-105, FR-106 · Ekrany: SCR-ORG-21
- **Given** jestem zalogowana **When** wybieram „Wyloguj się” **Then** wracam do SCR-ORG-13, a dane turniejów w cache telefonu są usunięte.
- **Given** mam turniej w statusie Trwa **When** wybieram „Usuń konto” **Then** widzę informację, że najpierw trzeba zakończyć turniej.
- **Given** nie mam turnieju w statusie Trwa **When** wybieram „Usuń konto”, wpisuję „USUŃ” i potwierdzam **Then** zostaję wylogowana, nie mogę się ponownie zalogować, a po 30 dniach konto i dane są usunięte lub pseudonimizowane.

## Epik E2 – Turnieje

### US-010 – Lista turniejów · **Must**
Jako **organizatorka** chcę widzieć aktywne i zakończone turnieje, aby szybko przejść do bieżących zawodów.
FR: FR-201, FR-209 · Ekrany: SCR-ORG-01
- **Given** mam turnieje t1 (Trwa), t2 (W przygotowaniu), t3 i t4 (Zakończona) **When** otwieram aplikację **Then** w sekcji „Aktywne” widzę karty t1 i t2 z pigułkami „Trwa” i „W przygotowaniu”, a w sekcji „Zakończone” wiersze t3 i t4.
- **Given** t1 ma 8 kategorii i 173 z 215 ocen w rozpoczętych kategoriach **When** patrzę na kartę t1 **Then** widzę pasek na 80% i tekst „8 kategorii · 80%”.
- **Given** nie mam zakończonych turniejów **When** otwieram listę **Then** sekcja „Zakończone” nie jest wyświetlana.

### US-011 – Utworzenie turnieju · **Must**
Jako **organizatorka** chcę utworzyć turniej, aby zacząć jego konfigurację.
FR: FR-202 · Ekrany: SCR-ORG-01, SCR-ORG-02
- **Given** jestem na liście **When** tapnę „+” **Then** otwiera się arkusz „Nowy turniej” z polami „Nazwa turnieju”, „Data”, „Miejsce”.
- **Given** pole nazwy jest puste **When** tapnę „Utwórz turniej” **Then** pod polem widzę błąd „Podaj nazwę turnieju (min. 3 znaki).” i arkusz zostaje otwarty.
- **Given** podałam tylko nazwę „Puchar Wiosny PoleChamp” **When** tapnę „Utwórz turniej” **Then** turniej ma status W przygotowaniu, datę „Data do ustalenia” i miejsce „Miejsce do ustalenia”, widzę jego szczegóły i toast „Utworzono turniej”.
- **Given** słaby zasięg spowodował ponowne wysłanie żądania **When** serwer otrzyma je dwukrotnie z tym samym kluczem idempotencji **Then** powstaje tylko jeden turniej.

### US-012 – Edycja i usunięcie turnieju · **Should**
Jako **organizatorka** chcę poprawić dane turnieju lub usunąć szkic, aby lista była aktualna.
FR: FR-203, FR-204 · Ekrany: SCR-ORG-20
- **Given** turniej jest W przygotowaniu lub Trwa **When** zmienię miejsce na „Poznań, Arena” i zapiszę **Then** nowe miejsce jest widoczne na liście i w szczegółach, a w audycie jest wpis.
- **Given** turniej jest W przygotowaniu i nie ma ocen **When** wybiorę „Usuń turniej” i potwierdzę **Then** turniej znika z listy.
- **Given** turniej ma status Trwa **When** otwieram edycję **Then** opcja „Usuń turniej” jest niedostępna.

### US-013 – Szczegóły i postęp turnieju · **Must**
Jako **organizatorka** chcę widzieć statystyki i postęp oceniania, aby wiedzieć, ile pracy zostało.
FR: FR-205, FR-209 · Ekrany: SCR-ORG-03
- **Given** turniej t1 **When** otwieram szczegóły **Then** widzę kafle „8 Kategorie”, „61 Zawodniczki”, „5 Sędziowie”, kartę „Postęp oceniania” z „80%” i tekstem „173 z 215 ocen w rozpoczętych kategoriach”.
- **Given** turniej bez rozpoczętych kategorii **When** otwieram szczegóły **Then** karta postępu pokazuje „0%” i „Brak rozpoczętych kategorii”.
- **Given** turniej bez kategorii **When** otwieram szczegóły **Then** widzę stan pusty „Brak kategorii. Dodaj pierwszą, aby zacząć.”, którego tapnięcie otwiera „Nowa kategoria”.

### US-014 – Rozpoczęcie turnieju · **Must**
Jako **organizatorka** chcę rozpocząć turniej, aby oznaczyć zawody jako trwające.
FR: FR-206 · Ekrany: SCR-ORG-03
- **Given** turniej W przygotowaniu i zweryfikowany e-mail **When** tapnę „Rozpocznij turniej” **Then** status zmienia się na „Trwa”, przycisk zmienia się na „Zakończ turniej” (secondary, ikona flagi) i widzę toast „Turniej rozpoczęty”.

### US-015 – Zakończenie turnieju · **Must**
Jako **organizatorka** chcę zakończyć turniej, aby zapisać wyniki jako ostateczne.
FR: FR-207, FR-208 · Ekrany: SCR-ORG-03, SCR-ORG-04
- **Given** turniej Trwa **When** tapnę „Zakończ turniej” **Then** widzę arkusz „Zakończyć turniej?” z tekstem „„Mistrzostwa Polski Pole Sport 2026” zostanie zamknięty, a wyniki zapisane jako ostateczne.” i przyciskami „Zakończ turniej” oraz „Anuluj”.
- **Given** arkusz potwierdzenia **When** tapnę „Anuluj” lub tło **Then** arkusz się zamyka, a status się nie zmienia.
- **Given** kategorie c3–c5 są Trwa, a c6–c8 W przygotowaniu **When** potwierdzę **Then** c3–c5 mają status „Zakończona”, c6–c8 są oznaczone jako nierozegrane, turniej trafia do sekcji „Zakończone” i widzę toast „Turniej zakończony”.
- **Given** turniej Zakończona **When** otwieram szczegóły **Then** nie widzę przycisku statusu ani „Dodaj” przy kategoriach, a ikona PDF działa.

### US-016 – Ekran startowy organizatora · **Should**
Jako **organizatorka** chcę estetyczny ekran startowy z informacją o ładowaniu, aby wiedzieć, że aplikacja pobiera dane.
FR: FR-210 · Ekrany: SCR-ORG-00
- **Given** zimny start aplikacji **When** dane się ładują **Then** widzę animację, „PoleChamp”, „System oceniania zawodów pole dance” i kolejno komunikaty „Wczytywanie turniejów…”, „Synchronizacja wyników…”, „Gotowe”, po czym ekran zanika (0,5 s).
- **Given** dane załadowały się po 0,8 s **When** splash jest widoczny **Then** znika najwcześniej po 1,2 s, a najpóźniej po 4,3 s.

## Epik E3 – Kategorie, kryteria, kary

### US-020 – Dodanie kategorii · **Must**
Jako **organizatorka** chcę dodać kategorię z gotowymi kryteriami, aby nie konfigurować wszystkiego od zera.
FR: FR-301 · Ekrany: SCR-ORG-05
- **Given** szczegóły turnieju **When** tapnę „Dodaj”, wpiszę „Exotic Pro”, wybiorę styl „Exotic” i poziom „Pro” i tapnę „Utwórz kategorię” **Then** kategoria pojawia się na liście ze statusem „W przygotowaniu”, ma 6 kryteriów (z „Praca na podłodze”) i 2 kary, a ja widzę toast „Dodano kategorię”.
- **Given** pole „Nazwa” jest puste **When** tapnę „Utwórz kategorię” **Then** widzę błąd pola i kategoria nie powstaje.
- **Given** nie zmieniłam grupy wiekowej **When** tworzę kategorię **Then** grupa wiekowa to „Open”.

### US-021 – Edycja i usunięcie kategorii · **Must** (usunięcie: **Should**)
Jako **organizatorka** chcę poprawić dane kategorii, aby odpowiadały regulaminowi.
FR: FR-302, FR-303 · Ekrany: SCR-ORG-05, SCR-ORG-06
- **Given** kategoria W przygotowaniu **When** tapnę ikonę ołówka, zmienię poziom na „Advanced” i tapnę „Zapisz zmiany” **Then** meta kategorii pokazuje „… · Advanced · …” i widzę toast „Zapisano zmiany”.
- **Given** kategoria Trwa **When** otwieram edycję **Then** chipy stylu i poziomu są nieaktywne, a nazwę i grupę wiekową mogę zmienić.
- **Given** kategoria W przygotowaniu **When** wybiorę „Usuń kategorię” i potwierdzę **Then** kategoria znika, a ja wracam do szczegółów turnieju.

### US-022 – Przegląd konfiguracji punktacji · **Must**
Jako **organizatorka** chcę widzieć kryteria z wagami i kary, aby sprawdzić zgodność z regulaminem.
FR: FR-304, FR-312 · Ekrany: SCR-ORG-06
- **Given** kategoria „Pole Sport Advanced” **When** otwieram zakładkę „Kryteria” **Then** widzę 5 wierszy (np. „Technika”, „Skala 0–10”, „×2”), informację „Maksymalny wynik sędziego: 65 pkt” oraz kary „Upadek – maks. 3× na występ – −2 pkt” i „Przekroczenie czasu – maks. 2× na występ – −1 pkt”.
- **Given** segment „Kryteria” **When** patrzę na licznik **Then** pokazuje liczbę kryteriów (5).

### US-023 – Zarządzanie kryteriami · **Must**
Jako **organizatorka** chcę dodawać, edytować i usuwać kryteria przed startem, aby dopasować ocenianie.
FR: FR-305, FR-306 · Ekrany: SCR-ORG-09
- **Given** kategoria W przygotowaniu **When** tapnę „Dodaj”, wpiszę „Flow”, skalę 10, wagę 1,5 i „Zapisz” **Then** kryterium jest na końcu listy, maks. wynik sędziego rośnie o 15 pkt i widzę toast „Dodano kryterium”.
- **Given** wpisuję wagę 0,3 lub 5,5 **When** zapisuję **Then** widzę błąd „Waga od 0,5 do 5 (co 0,5).”.
- **Given** edytuję „Technika” **When** tapnę „Usuń kryterium” **Then** widzę potwierdzenie „Usunąć kryterium „Technika”?” i dopiero „Usuń” je usuwa (toast „Usunięto kryterium”).
- **Given** kategoria Trwa **When** otwieram zakładkę „Kryteria” **Then** nie widzę „Dodaj”, wiersze nie mają chevronu, a nad listą widzę „Kryteria są zablokowane po rozpoczęciu kategorii.”.
- **Given** kategoria ma 1 kryterium **When** próbuję je usunąć **Then** widzę komunikat, że kategoria musi mieć co najmniej jedno kryterium.

### US-024 – Zarządzanie karami · **Must**
Jako **organizatorka** chcę definiować kary z wartością i limitem wystąpień, aby sędziowie liczyli je jednolicie.
FR: FR-307 · Ekrany: SCR-ORG-10
- **Given** kategoria W przygotowaniu **When** dodam karę „Wulgarne elementy”, 5 pkt, maks. 1 **Then** wiersz pokazuje „maks. 1× na występ” i „−5 pkt”, a ja widzę toast „Dodano karę”.
- **Given** maks. wystąpień 0 lub 11 **When** zapisuję **Then** widzę błąd „Od 1 do 10.”.

### US-025 – Rozpoczęcie kategorii · **Must**
Jako **organizatorka** chcę rozpocząć kategorię, aby sędziowie mogli oceniać.
FR: FR-308 · Ekrany: SCR-ORG-06; SCR-JDG-03
- **Given** kategoria W przygotowaniu z kryteriami, zawodniczkami i 5 aktywnymi sędziami **When** tapnę „Rozpocznij kategorię” **Then** status zmienia się na „Trwa”, dolny pasek pokazuje „Zakończ i zablokuj” oraz „Eksport PDF”, a ja widzę toast „Kategoria rozpoczęta”.
- **Given** kategoria bez zawodniczek **When** tapnę „Rozpocznij kategorię” **Then** widzę toast „Dodaj co najmniej jedną zawodniczkę.” i status się nie zmienia.
- **Given** turniej W przygotowaniu **When** rozpoczynam kategorię **Then** turniej również ma status „Trwa”.
- **Given** tablet sędziego online **When** kategoria zostaje rozpoczęta **Then** w ≤ 3 s jej karta na SCR-JDG-03 przestaje być przygaszona.

### US-026 – Zakończenie i zablokowanie kategorii · **Must**
Jako **organizatorka** chcę zablokować kategorię, aby wyniki stały się ostateczne.
FR: FR-309 · Ekrany: SCR-ORG-06, SCR-ORG-18
- **Given** wszystkie oceny są złożone i tablety zsynchronizowane **When** tapnę „Zakończ i zablokuj” **Then** status zmienia się na „Zakończona”, przycisk zmienia się na „Odblokuj”, a ja widzę toast „Kategoria zakończona”.
- **Given** brakuje 15 ocen, a „Tablet stół 2” ma 3 niewysłane oceny **When** tapnę „Zakończ i zablokuj” **Then** widzę arkusz z „Brakuje 15 ocen” i „Tablet stół 2 – 3 niewysłane oceny” oraz przyciskami „Zablokuj mimo to” i „Anuluj”.
- **Given** arkusz ostrzeżenia **When** wybiorę „Zablokuj mimo to” **Then** kategoria zostaje zablokowana, a późniejsze oceny z tabletu trafiają do „Odrzucone oceny”.
- **Given** tablet online **When** kategoria zostaje zablokowana **Then** w ≤ 3 s sędzia widzi baner „Kategoria zablokowana — tylko podgląd” i nieaktywny formularz.

### US-027 – Odblokowanie kategorii · **Must**
Jako **organizatorka** chcę odblokować kategorię, aby sędzia mógł poprawić omyłkę.
FR: FR-310 · Ekrany: SCR-ORG-06
- **Given** kategoria Zakończona w turnieju Trwa **When** tapnę „Odblokuj” **Then** status zmienia się na „Trwa”, widzę toast „Kategoria odblokowana”, a w audycie jest wpis z moim kontem.
- **Given** turniej Zakończona **When** otwieram kategorię **Then** przycisk „Odblokuj” jest niedostępny.

## Epik E4 – Zawodniczki

### US-030 – Lista startowa · **Must**
Jako **organizatorka** chcę widzieć listę startową z postępem ocen, aby kontrolować kompletność.
FR: FR-401, FR-405 · Ekrany: SCR-ORG-07
- **Given** kategoria c3 **When** otwieram zakładkę „Zawodniczki” **Then** widzę 9 wierszy w kolejności startowej z numerem, nazwiskiem, klubem i licznikiem (np. „5/5” z ikoną wypełnionego koła, „3/5” z ikoną przerywanego koła).
- **Given** kategoria bez zawodniczek **When** otwieram zakładkę **Then** widzę „Lista startowa jest pusta.”.
- **Given** lista ma ≥ 15 pozycji **When** wpiszę „Król” w wyszukiwarkę **Then** widzę tylko pasujące wiersze (Should).

### US-031 – Dodanie zawodniczki · **Must**
Jako **organizatorka** chcę dopisać zawodniczkę, także po starcie kategorii, aby obsłużyć zgłoszenia „na ostatnią chwilę”.
FR: FR-402 · Ekrany: SCR-ORG-11
- **Given** kategoria W przygotowaniu lub Trwa **When** tapnę „Dodaj”, wpiszę nr 50, „Julia Kamińska”, „Aerial Dreams Warszawa” i „Dodaj do listy” **Then** zawodniczka jest na końcu listy, a ja widzę toast „Dodano zawodniczkę”.
- **Given** numer 47 jest zajęty w turnieju **When** zapisuję **Then** widzę błąd „Numer 47 jest już zajęty.”.
- **Given** puste pole klubu **When** zapisuję **Then** klub jest wyświetlany jako „—”.
- **Given** kategoria Trwa i tablety online **When** dodam zawodniczkę **Then** w ≤ 3 s pojawia się ona w kolejce sędziów.
- **Given** kategoria Zakończona **When** otwieram zakładkę **Then** „Dodaj” jest niedostępne.

### US-032 – Edycja i wycofanie zawodniczki · **Should**
Jako **organizatorka** chcę poprawić dane lub wycofać zawodniczkę, która nie wystąpiła, aby ranking był poprawny.
FR: FR-403, FR-404 · Ekrany: SCR-ORG-17
- **Given** zawodniczka bez ocen **When** wybiorę „Usuń z listy” i potwierdzę **Then** znika z listy i kolejki sędziów.
- **Given** zawodniczka z ocenami **When** wybiorę „Wycofaj zawodniczkę” i potwierdzę **Then** w liście ma etykietę „Wycofana”, znika z kolejki sędziów i z rankingu, a jej oceny pozostają w audycie.
- **Given** wycofana zawodniczka **When** wybiorę „Przywróć” **Then** wraca do rankingu i kolejki.

### US-033 – Zawodniczka niepełnoletnia · **Should**
Jako **organizatorka** chcę oznaczyć niepełnoletnią i potwierdzić zgodę opiekuna, aby przetwarzać dane zgodnie z RODO.
FR: FR-406 · Ekrany: SCR-ORG-11, SCR-ORG-17
- **Given** rok urodzenia 2010 w turnieju z 2026 r. **When** zapisuję bez zaznaczenia „Mam zgodę rodzica/opiekuna…” **Then** zapis jest zablokowany z komunikatem przy polu zgody.
- **Given** zaznaczona zgoda **When** zapisuję **Then** zawodniczka ma flagę niepełnoletniej (bez wpływu na wygląd listy w MVP).

## Epik E5 – Sędziowie i urządzenia

### US-040 – Dodanie sędziego z PIN-em · **Must**
Jako **organizatorka** chcę dodać sędziego i dostać jego PIN, aby przekazać mu dostęp do tabletu.
FR: FR-501, FR-502 · Ekrany: SCR-ORG-14, SCR-ORG-15
- **Given** szczegóły turnieju **When** tapnę kafel „Sędziowie” **Then** widzę listę sędziów i urządzeń.
- **Given** lista sędziów **When** dodam „Katarzyna Nowak” **Then** widzę jednorazowo 4-cyfrowy PIN (nietrywialny, np. nie „1234”), przycisk „Kopiuj” i ostrzeżenie, że PIN nie będzie ponownie wyświetlony.
- **Given** sędzia o tym samym imieniu i nazwisku istnieje **When** zapisuję **Then** widzę błąd unikalności.

### US-041 – Edycja i dezaktywacja sędziego · **Must**
Jako **organizatorka** chcę wyłączyć sędziego, który nie sędziuje, aby nie liczył się do kompletu ocen.
FR: FR-503 · Ekrany: SCR-ORG-15
- **Given** sędzia aktywny **When** wybiorę „Dezaktywuj” **Then** nie widnieje na SCR-JDG-01, nie wchodzi do paneli kategorii rozpoczynanych później, a jego aktywna sesja zostaje zakończona.
- **Given** sędzia z ocenami **When** próbuję go usunąć **Then** widzę komunikat „Nie można usunąć – są już oceny.” i propozycję dezaktywacji.

### US-042 – Reset PIN-u · **Must**
Jako **organizatorka** chcę zresetować PIN, aby sędzia, który go zapomniał lub zablokował, mógł dalej oceniać.
FR: FR-503, FR-509 · Ekrany: SCR-ORG-15; SCR-JDG-02
- **Given** sędzia zablokowany po 10 błędnych próbach **When** wybiorę „Resetuj PIN” **Then** widzę nowy PIN jednorazowo, a blokada zostaje zdjęta.
- **Given** tablet z sesją offline tego sędziego **When** tablet zsynchronizuje się po resecie **Then** sesja zostaje zamknięta i sędzia musi wpisać nowy PIN.

### US-043 – Parowanie tabletu · **Must**
Jako **organizatorka** chcę przypisać tablety do turnieju kodem QR, aby sędziowie mogli się na nich logować.
FR: FR-504 · Ekrany: SCR-ORG-16, SCR-JDG-06
- **Given** lista urządzeń **When** tapnę „Sparuj tablet” **Then** widzę kod QR, kod tekstowy (np. „K7QM-4ZTX”) i czas ważności 10 min.
- **Given** nowy tablet w trybie sędziego **When** zeskanuje QR **Then** pobiera dane turnieju (splash „Łączenie z turniejem…”, „Pobieranie list startowych…”) i pokazuje „Wybierz swój profil”.
- **Given** kod wygasł **When** tablet go użyje **Then** widzi „Kod jest nieprawidłowy lub wygasł.”.

### US-044 – Stan urządzeń · **Must**
Jako **organizatorka** chcę widzieć, które tablety są online i czy mają niewysłane oceny, aby przed zamknięciem kategorii nic nie zginęło.
FR: FR-505, FR-806 · Ekrany: SCR-ORG-14
- **Given** „Tablet stół 2” jest offline od 5 min z 3 ocenami w kolejce **When** otwieram listę urządzeń **Then** widzę „Offline od 5 min · 3 niewysłane oceny”.
- **Given** urządzenie zgubione **When** wybiorę „Odłącz urządzenie” i potwierdzę **Then** tablet traci dostęp (przy następnym kontakcie widzi „To urządzenie zostało odłączone od turnieju.”).

## Epik E6 – Panel sędziego

### US-050 – Uruchomienie i wybór profilu · **Must**
Jako **sędzia** chcę wybrać swój profil na wspólnym tablecie, aby zacząć ocenianie.
FR: FR-506, FR-507 · Ekrany: SCR-JDG-00, SCR-JDG-01
- **Given** sparowany tablet **When** uruchamiam aplikację **Then** widzę splash z „Panel sędziego” i komunikatami ładowania, a potem „Panel sędziego”, nazwę turnieju i „Wybierz swój profil” z kartami 5 sędziów (inicjały, imię i nazwisko, „Sędzia”).
- **Given** brak sieci **When** uruchamiam aplikację **Then** po maks. 4,3 s widzę wybór profilu z danymi lokalnymi.

### US-051 – Logowanie PIN-em · **Must**
Jako **sędzia** chcę zalogować się 4-cyfrowym PIN-em, aby szybko przejść do oceniania.
FR: FR-508 · Ekrany: SCR-JDG-02
- **Given** wybrałam „Katarzyna Nowak” **When** wpiszę 4 poprawne cyfry **Then** bez dodatkowego przycisku (po ≤ 160 ms) widzę „Dzień dobry, Katarzyna”.
- **Given** wpiszę zły PIN **When** wprowadzę 4. cyfrę **Then** widzę „Nieprawidłowy PIN — spróbuj ponownie”, a kropki się czyszczą.
- **Given** pomyliłam profil **When** tapnę „Zmień sędziego” **Then** wracam do wyboru profilu.
- **Given** wpisałam 2 cyfry **When** tapnę backspace **Then** ostatnia kropka się czyści.

### US-052 – Ochrona przed zgadywaniem PIN-u · **Must**
Jako **organizatorka** chcę, aby PIN-ów nie dało się zgadywać, aby nikt nie oceniał w imieniu sędziego.
FR: FR-509 · Ekrany: SCR-JDG-02, SCR-JDG-08
- **Given** 5 błędnych prób dla profilu **When** próbuję szósty raz **Then** klawiatura jest nieaktywna, a ja widzę „Zbyt wiele prób. Spróbuj za 30 s.” (odliczanie). Kolejna seria 5 błędów daje 60 s.
- **Given** 10 błędnych prób łącznie (wszystkie tablety) **When** serwer to zarejestruje **Then** sędzia widzi „PIN zablokowany. Poproś organizatora o reset.”, a organizator widzi status „PIN zablokowany” na liście sędziów.
- **Given** blokada lokalna **When** zamknę i otworzę aplikację **Then** blokada nadal obowiązuje.

### US-053 – Logowanie bez internetu · **Must**
Jako **sędzia** chcę zalogować się, gdy w hali nie ma internetu, aby nie wstrzymywać zawodów.
FR: FR-510 · Ekrany: SCR-JDG-02
- **Given** tablet zsynchronizowany 3 h temu i brak sieci **When** wpiszę poprawny PIN **Then** jestem zalogowana, a wskaźnik pokazuje „Offline”.
- **Given** ostatnia synchronizacja ponad 24 h temu i brak sieci **When** wpiszę PIN **Then** widzę „Połącz tablet z internetem, aby się zalogować.”.

### US-054 – Wylogowanie i sesja · **Must**
Jako **sędzia** chcę się wylogować i mieć pewność, że nikt nie oceni za mnie, gdy odejdę od tabletu.
FR: FR-511, FR-512 · Ekrany: SCR-JDG-03…05
- **Given** jestem zalogowana **When** tapnę ikonę wylogowania **Then** wracam do „Wybierz swój profil”.
- **Given** aplikacja była w tle 15 min **When** wracam **Then** widzę ekran PIN dla mojego profilu, a po zalogowaniu mój niedokończony formularz.
- **Given** jestem zalogowana na tablecie A **When** zaloguję się online na tablecie B **Then** tablet A wraca do wyboru profilu z komunikatem „Zalogowano Cię na innym urządzeniu.”.

### US-055 – Wybór kategorii · **Must**
Jako **sędzia** chcę widzieć kategorie turnieju z moim postępem, aby wiedzieć, gdzie oceniam.
FR: FR-601 · Ekrany: SCR-JDG-03
- **Given** zalogowana sędzia **When** widzę listę **Then** każda karta ma pigułkę statusu, nazwę, „{styl} · {poziom}” i „{x}/{y} ocenione”; zablokowane mają ikonę kłódki.
- **Given** kategoria W przygotowaniu **When** ją tapnę **Then** widzę toast „Ta kategoria jeszcze się nie rozpoczęła” i zostaję na liście.

### US-056 – Kolejka zawodniczek · **Must**
Jako **sędzia** chcę widzieć kolejkę startową z oznaczeniem ocenionych, aby oceniać po kolei.
FR: FR-602 · Ekrany: SCR-JDG-04
- **Given** otwarta kategoria c3 **When** patrzę na panel boczny **Then** widzę „‹ Kategorie”, „Pole Sport Advanced”, pasek „{x}/9 ocenione” i 9 pozycji w kolejności startowej z ikonami stanu.
- **Given** nie wybrałam zawodniczki **When** patrzę na prawy panel **Then** widzę „Wybierz zawodniczkę z listy, aby ją ocenić.”.
- **Given** ocena zapisana lokalnie, ale niewysłana **When** patrzę na wiersz **Then** widzę ikonę zegara, a po wysłaniu ikonę wypełnionego koła z „ptaszkiem”.

### US-057 – Ocena kryteriów · **Must**
Jako **sędzia** chcę ustawić noty suwakiem lub przyciskami −/+, aby szybko i precyzyjnie ocenić występ.
FR: FR-603, FR-605, FR-606 · Ekrany: SCR-JDG-05
- **Given** nowa ocena **When** otwieram formularz **Then** każde kryterium ma wartość „5,0 /10”, a „Twój wynik” to „32,5 / 65”.
- **Given** kryterium „Technika” = 8,5 **When** tapnę „+” 4 razy **Then** wartość to „10,0” (nie więcej), a kolejne „+” nic nie zmienia.
- **Given** noty 8,5 / 8,5 / 8 / 8 / 8,5 i brak kar **When** patrzę na stopkę **Then** „Twój wynik” to „54,3 / 65”.
- **Given** przeciągam suwak **When** puszczam go między wartościami **Then** wartość przyciąga się do najbliższej wielokrotności 0,5.
- **Given** wpiszę komentarz dłuższy niż 500 znaków **When** piszę dalej **Then** dodatkowe znaki nie są przyjmowane, a pod polem widzę licznik „500/500”.

### US-058 – Kary · **Must**
Jako **sędzia** chcę zliczać kary licznikiem, aby odjąć właściwą liczbę punktów.
FR: FR-604 · Ekrany: SCR-JDG-05
- **Given** kara „Upadek −2 pkt za każde · maks. 3×” **When** tapnę „+” 2 razy **Then** licznik to „2”, karta jest wyróżniona, chip w stopce pokazuje „kary −4,0”, a „Twój wynik” spada o 4.
- **Given** licznik = 3 (maks.) **When** patrzę na „+” **Then** jest nieaktywny (przygaszony).
- **Given** licznik = 0 **When** tapnę „−” **Then** licznik zostaje 0.
- **Given** noty z poprzedniego przykładu i Upadek ×2 **When** patrzę na stopkę **Then** „Twój wynik” to „50,3 / 65”.

### US-059 – Zatwierdzenie i przejście dalej · **Must**
Jako **sędzia** chcę zatwierdzić ocenę i automatycznie przejść do kolejnej zawodniczki, aby nie tracić czasu między występami.
FR: FR-607 · Ekrany: SCR-JDG-05
- **Given** są kolejne nieocenione **When** tapnę „Zatwierdź i dalej” **Then** widzę toast „Zapisano ocenę: Magdalena Kaczmarek” i formularz następnej nieocenionej zawodniczki w kolejności listy, przewinięty na górę.
- **Given** to ostatnia nieoceniona **When** patrzę na przycisk **Then** ma etykietę „Zatwierdź ocenę”, a po zatwierdzeniu widzę pusty panel „Wybierz zawodniczkę z listy, aby ją ocenić.”.
- **Given** brak sieci **When** zatwierdzam **Then** toast pojawia się w ≤ 100 ms, a ocena czeka w kolejce.
- **Given** aplikacja zostanie zamknięta zaraz po toaście **When** uruchomię ją ponownie **Then** ocena jest zapisana i zostanie wysłana.

### US-060 – Poprawa własnej oceny · **Must**
Jako **sędzia** chcę poprawić swoją ocenę przed zamknięciem kategorii, aby naprawić pomyłkę.
FR: FR-608 · Ekrany: SCR-JDG-05
- **Given** oceniona zawodniczka w kategorii Trwa **When** otwieram ją z kolejki **Then** widzę pigułkę „Oceniono”, zapisane wartości i przycisk „Zaktualizuj ocenę”.
- **Given** zmienię notę i tapnę „Zaktualizuj ocenę” **When** serwer przyjmie zmianę **Then** ranking organizatora się aktualizuje, a w historii oceny jest rewizja 2.

### US-061 – Podgląd w zablokowanej kategorii · **Must**
Jako **sędzia** chcę przejrzeć swoje oceny w zablokowanej kategorii bez ryzyka ich zmiany.
FR: FR-609 · Ekrany: SCR-JDG-04, SCR-JDG-05
- **Given** kategoria zablokowana **When** otwieram ocenioną zawodniczkę **Then** widzę baner „Kategoria zablokowana — tylko podgląd”, przygaszony formularz z moimi wartościami i brak stopki z przyciskiem.
- **Given** formularz zablokowany **When** próbuję przesunąć suwak lub tapnąć „+” **Then** nic się nie zmienia.

### US-062 – Niezależność sędziów · **Must**
Jako **organizatorka** chcę, by sędziowie nie widzieli ocen innych sędziów ani rankingu, aby oceny były niezależne.
FR: FR-610 · Ekrany: SCR-JDG-*
- **Given** sędzia B ocenił zawodniczkę **When** sędzia A otwiera jej formularz **Then** widzi wyłącznie swoje wartości (lub domyślne), bez informacji o ocenie B.
- **Given** dowolny ekran panelu sędziego **When** szukam rankingu **Then** nie ma go w aplikacji sędziego.

### US-063 – Szkic formularza · **Should**
Jako **sędzia** chcę, aby niezatwierdzony formularz nie ginął po przypadkowym zamknięciu aplikacji.
FR: FR-611 · Ekrany: SCR-JDG-05
- **Given** ustawiłam 3 kryteria i nie zatwierdziłam **When** aplikacja zostanie zamknięta i otwarta ponownie **Then** po zalogowaniu widzę te same wartości dla tej zawodniczki.

### US-064 – Wynik liczony przez serwer · **Must**
Jako **organizatorka** chcę, aby oficjalny wynik liczył serwer, aby nikt nie mógł zmanipulować sumy na tablecie.
FR: FR-612 · Ekrany: –
- **Given** tablet wysyła ocenę z `clientTotal` = 60 przy notach dających 54,25 **When** serwer ją przyjmie **Then** zapisany wynik sędziego to 54,25, a w logach jest ostrzeżenie `SCORE_TOTAL_MISMATCH`.

## Epik E7 – Wyniki i eksport

### US-070 – Ranking na żywo · **Must**
Jako **organizatorka** chcę widzieć ranking kategorii na żywo, aby szybko ogłosić podium.
FR: FR-701 · Ekrany: SCR-ORG-08
- **Given** kategoria c3 **When** otwieram „Wyniki” **Then** widzę „Ranking na żywo” z pozycjami 1–7 (np. „1 Natalia Sikora 55,5 · #47 · Studio Vertical Wrocław · 3/5 sędziów”), a pod listą wyjaśnienie wzoru.
- **Given** zawodniczki 48 i 49 bez ocen **When** patrzę na ich wiersze **Then** mają wynik „—”, „brak ocen” i „–” zamiast miejsca, na końcu listy.

### US-071 – Remisy i wyniki niekompletne · **Must**
Jako **organizatorka** chcę, aby remisy były rozstrzygane jednoznacznie według regulaminu, aby uniknąć sporów.
FR: FR-311, FR-702, FR-704 · Ekrany: SCR-ORG-08
- **Given** dwie zawodniczki mają wynik oficjalny 54,30 **When** pierwsza ma średnią z Techniki 8,60, a druga 8,40 **Then** pierwsza zajmuje wyższe miejsce.
- **Given** równe wyniki, równa Technika i równa średnia kar **When** liczony jest ranking **Then** obie mają to samo miejsce (np. 2 i 2), a następna ma miejsce 4.
- **Given** wyniki 52,70 i 52,65 **When** wyświetlam ranking **Then** oba wiersze pokazują dwa miejsca po przecinku („52,70”, „52,65”), a pozostałe jedno.
- **Given** kategoria zablokowana z zawodniczką ocenioną przez 3/5 sędziów **When** patrzę na ranking **Then** wiersz ma etykietę „3/5 sędziów” i pigułkę „wstępny”.

### US-072 – Aktualizacja na żywo · **Must**
Jako **organizatorka** chcę, aby postęp i ranking odświeżały się same, aby nie musieć przeładowywać ekranu.
FR: FR-703 · Ekrany: SCR-ORG-03, 07, 08
- **Given** mam otwarte „Wyniki” c3 i jestem online **When** sędzia zatwierdzi ocenę, a serwer ją przyjmie **Then** w ≤ 2 s ranking i licznik „{n}/5 sędziów” się aktualizują.
- **Given** WebSocket jest zablokowany **When** sędzia zatwierdzi ocenę **Then** zmiana pojawi się w ≤ 15 s (odpytywanie).

### US-073 – Eksport PDF · **Must**
Jako **organizatorka** chcę wygenerować PDF z wynikami kategorii lub całego turnieju, aby wywiesić go i wysłać klubom.
FR: FR-705, FR-706 · Ekrany: SCR-ORG-12
- **Given** szczegóły turnieju **When** tapnę ikonę PDF **Then** widzę „Podgląd PDF” z nagłówkiem turnieju i tabelami wszystkich kategorii.
- **Given** kategoria c3 **When** tapnę „Eksport PDF” **Then** podgląd ma tytuł „Pole Sport Advanced · Trwa” i tabelę „#”, „Zawodniczka”, „Wynik”.
- **Given** podgląd **When** tapnę „Pobierz PDF” **Then** w ≤ 10 s otwiera się systemowy arkusz udostępniania z plikiem PDF, a ja widzę toast „PDF zapisany”.
- **Given** wygenerowany PDF **When** go otworzę **Then** stopka zawiera datę wygenerowania, wersję wyników i skrót sumy kontrolnej.

### US-074 – Szczegóły ocen zawodniczki · **Should**
Jako **organizatorka** chcę zobaczyć oceny poszczególnych sędziów i ich komentarze, aby odpowiedzieć na pytania zawodniczki lub trenera.
FR: FR-707, FR-902 · Ekrany: SCR-ORG-19
- **Given** ranking **When** tapnę wiersz „Amelia Król” **Then** widzę 5 ocen sędziów (nazwisko, wynik, noty, kary, komentarz, „online/offline”).
- **Given** ocena była poprawiana **When** tapnę „Historia zmian” **Then** widzę rewizje z czasem i wartościami.

## Epik E8 – Offline i synchronizacja

### US-080 – Ocenianie bez internetu · **Must**
Jako **sędzia** chcę oceniać bez internetu, aby awaria Wi-Fi nie wstrzymała zawodów.
FR: FR-801, FR-802 · Ekrany: SCR-JDG-*
- **Given** brak sieci przez 2 h i 40 zatwierdzonych ocen **When** sieć wraca **Then** wszystkie 40 ocen zostaje przyjętych w ≤ 30 s, bez duplikatów.
- **Given** wysyłka paczki została przerwana w połowie **When** tablet ponowi wysyłkę **Then** już przyjęte oceny zwracają „DUPLICATE”, a pozostałe są przyjmowane.

### US-081 – Wskaźnik synchronizacji · **Must**
Jako **sędzia** chcę wiedzieć, czy moje oceny dotarły, aby mieć spokój.
FR: FR-803 · Ekrany: SCR-JDG-03…05, SCR-JDG-07
- **Given** 3 oceny w kolejce i brak sieci **When** patrzę na nagłówek **Then** widzę „Offline · 3 w kolejce”.
- **Given** wszystko wysłane **When** patrzę na nagłówek **Then** widzę „Zsynchronizowano”.
- **Given** tapnę wskaźnik **When** otwiera się panel **Then** widzę czas ostatniej synchronizacji i „Synchronizuj teraz”.

### US-082 – Propagacja zmian organizatora · **Must**
Jako **sędzia** chcę od razu widzieć zmiany organizatora (nowe zawodniczki, start i blokadę kategorii), aby oceniać aktualną listę.
FR: FR-804 · Ekrany: SCR-JDG-03, 04
- **Given** tablet online **When** organizator doda zawodniczkę do kategorii Trwa **Then** w ≤ 3 s jest ona na końcu kolejki, a ja widzę toast „Lista startowa została zaktualizowana”.

### US-083 – Odrzucone oceny · **Must**
Jako **organizatorka** chcę zdecydować o ocenach, które dotarły po zablokowaniu kategorii, aby żadna ocena nie zginęła bez śladu.
FR: FR-805 · Ekrany: SCR-ORG-22, SCR-JDG-04
- **Given** kategoria zablokowana i tablet, który wraca online z 3 ocenami **When** wyśle oceny **Then** tablet oznacza je ikoną ostrzeżenia z banerem „3 oceny nie zostały przyjęte – kategoria zablokowana”, a ja widzę baner „Odrzucone oceny (3)”.
- **Given** lista odrzuconych **When** tapnę „Przyjmij” przy zablokowanej kategorii **Then** widzę informację, że najpierw trzeba ją odblokować.
- **Given** kategoria odblokowana **When** tapnę „Przyjmij” **Then** ocena trafia do wyników, a w audycie jest oznaczenie przyjęcia przez organizatora.
- **Given** tapnę „Odrzuć” **When** potwierdzę **Then** zgłoszenie znika z listy (zostaje w audycie).

### US-084 – Organizator bez sieci · **Must**
Jako **organizatorka** chcę widzieć ostatnie dane, nawet gdy stracę zasięg, aby nie być „na ślepo”.
FR: FR-807 · Ekrany: SCR-ORG-*
- **Given** brak sieci **When** otwieram szczegóły turnieju **Then** widzę ostatnio pobrane dane i baner „Brak połączenia — dane mogą być nieaktualne. Zmiany są niedostępne.”, a przyciski zmian są nieaktywne.

### US-085 – Wylogowanie z niewysłanymi ocenami · **Must**
Jako **sędzia** chcę zostać ostrzeżona, że mam niewysłane oceny, zanim się wyloguję.
FR: FR-808 · Ekrany: SCR-JDG-09
- **Given** 2 oceny w kolejce **When** tapnę ikonę wylogowania **Then** widzę „Masz 2 niewysłane oceny. Zostaną wysłane automatycznie, gdy tablet połączy się z siecią.” z przyciskami „Wyloguj” i „Anuluj”.

## Epik E9 – Audyt i prywatność

### US-090 – Dziennik audytu · **Must**
Jako **organizatorka** chcę mieć zapis wszystkich zmian, aby rozstrzygać spory i reklamacje.
FR: FR-901 · Ekrany: – (widok listy w v1.1)
- **Given** odblokowanie kategorii c3 **When** sprawdzam audyt (API) **Then** jest wpis `CATEGORY_UNLOCKED` z moim kontem, czasem i stanem przed/po.
- **Given** dowolny wpis audytu **When** próbuję go zmienić przez API **Then** operacja nie istnieje (brak endpointu).

### US-091 – Ochrona danych zawodniczek · **Must** (anonimizacja ręczna: **Should**)
Jako **zawodniczka (przez organizatora)** chcę, aby moje dane były przechowywane tylko tak długo, jak to potrzebne.
FR: FR-904, FR-905 · Ekrany: SCR-ORG-17
- **Given** turniej zakończony 24 miesiące temu **When** działa zadanie retencji **Then** imiona i nazwiska są zastąpione „Zawodniczka nr {nr}”, a kluby i lata urodzenia usunięte, przy czym wyniki pozostają.
- **Given** prośba zawodniczki o usunięcie danych **When** organizator wybierze „Usuń dane osobowe” **Then** w rankingu i PDF jest „Zawodniczka nr 47”.

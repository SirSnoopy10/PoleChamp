# Ekrany – Organizator (telefon)

> Dokument: `02-specification/05-ekrany-organizatora.md` · Wersja 1.0 · 23.10.2026
> Źródło wyglądu: `design/PoleChamp v2.dc.html` (ramka iPhone 402×874, ciemna). Inwentarz i nawigacja: [03-analiza-designu.md §2–3](../00-research/03-analiza-designu.md#2-inwentarz-ekranów-i-stanów). Komponenty i tokeny: [09-design-system.md](09-design-system.md). Reguły UI-xx (z uwag przeglądu): [03-analiza-designu.md §6](../00-research/03-analiza-designu.md#6-uwagi-z-przeglądu-designu-uploads).
> Teksty w „…” są wiążące (klucze i18n). Wartości w px z prototypu traktować jako dp/pt. Ekrany oznaczone **⟡ POZA DESIGNEM – PROPOZYCJA** nie mają odpowiednika w prototypie. Zaprojektowano je w stylu Nocturne i powinny zostać potwierdzone przez projektanta.

## 0. Zasady wspólne dla trybu Organizatora

| Aspekt | Specyfikacja |
|---|---|
| Orientacja | pionowa (blokada na telefonach). **Tablet w trybie Organizatora (TL-24):** ten sam układ telefoniczny, wyśrodkowana kolumna o szerokości maks. 480 dp na tle `bg`; orientacja dowolna (blokady orientacji na tabletach są ignorowane przez Android 16+ i iPadOS 26+ – [ADR-013](../01-architecture/adr/ADR-013-orientacja-i-rozmiar-okna-tabletu.md)) |
| Tło ekranu | `bg` + poświata radialna 500×300 w lewym górnym rogu (accent-900 70% → przezroczysty) |
| Bezpieczny obszar | treść poniżej status bara / Dynamic Island (UI-10): odstęp górny = inset + 10 dp (lista turniejów), wiersz nawigacji 44 dp (pozostałe ekrany); dolny padding 48 dp lub pasek przyklejony nad home indicatorem |
| Marginesy | poziome 16 dp |
| Przewijanie | jeden kontener pionowy na ekran, bez widocznego paska przewijania (UI-09); po zmianie ekranu przewinięcie na górę |
| Nakładki | bottom sheet (patrz [09-design-system.md §4.9](09-design-system.md#49-bottom-sheet)) – zamknięcie: tapnięcie tła, „×”, gest w dół, akcja główna |
| Toast | u dołu ekranu, 2,2 s, ikona `check-circle` (fill, accent). Błędy: ikona `warning-circle` (accent-300) **⟡ rozszerzenie** |
| Offline | baner pod wierszem nawigacji: ikona `cloud-slash`, „Brak połączenia — dane mogą być nieaktualne. Zmiany są niedostępne.”; przyciski zapisu nieaktywne (opacity 0,45) **⟡ rozszerzenie** (FR-807) |
| Ładowanie | szkielety (skeleton) w kształcie docelowych kart, puls opacity 0,5↔0,8, kolor neutral-800 **⟡ rozszerzenie** |
| Błąd ładowania | stan pusty z ikoną `warning-circle` accent, tekst „Nie udało się wczytać danych.” i przycisk secondary „Spróbuj ponownie” **⟡ rozszerzenie** |
| Turniej zakończony | wszystkie ekrany turnieju tylko do odczytu (FR-208); wyjątek: edycja danych osobowych i „Usuń dane osobowe” w SCR-ORG-17 (RODO, TL-17). Kategorie, które nie wystartowały, mają pigułkę „Nierozegrana” (wariant `draft`, propozycja TL-33 do akceptacji projektanta – Q-08) zamiast „W przygotowaniu” |
| Etykiety statusu | pigułka statusu: „W przygotowaniu” / „Trwa” / „Zakończona” (UI-02: status nigdy jako przycisk) |

---

## SCR-ORG-00 – Ekran startowy organizatora
- **Cel:** maskowanie startu aplikacji i wczytania danych; budowanie marki. **Rola:** Organizator. **Urządzenie:** telefon. **FR:** FR-210.
- **Układ (środek ekranu, kolumna, odstęp 18):**
  1. Animacja pixel-art tancerki na rurze (340×300 dp; przeniesienie `pole-spinner.js` na Skia – [ADR-001](../01-architecture/adr/ADR-001-aplikacja-mobilna-react-native-expo.md)), wejście fade 0,9 s.
  2. Logo: kwadrat 36 dp (radius md, obrys 1 px accent, ikona `trophy` accent 20 dp) + „PoleChamp” (30 dp, 500, letter-spacing −0,02 em).
  3. Podtytuł „System oceniania zawodów pole dance” (13,5 dp, neutral-400).
  4. Pasek postępu 160×3 dp (tor neutral-800, wypełnienie accent z poświatą) + komunikat 12 dp neutral-400: „Wczytywanie turniejów…” → „Synchronizacja wyników…” → „Gotowe” (zmiany przy 35% i 75% czasu).
- **Tło:** poświata radialna 420×420 (accent-900 85%) na bg. Elementy 2–4 wjeżdżają (rise 0,6 s, opóźnienia 0,2 / 0,35 s).
- **Zachowanie:** czas wyświetlania = czas ładowania (min. 1,2 s, maks. 4,3 s), wyjście fade 0,5 s. Bez sesji → SCR-ORG-13. Przy braku sieci → SCR-ORG-01 z danymi z cache i banerem offline.
- **Dostępność:** animacja respektuje „Ogranicz ruch” (statyczna klatka); komunikat ogłaszany przez czytnik ekranu.

## SCR-ORG-01 – Turnieje (lista)
- **Cel:** wybór turnieju i tworzenie nowego. **FR:** FR-201, FR-209. **US:** US-010.
- **Układ:**
  1. Nagłówek (odstęp górny 10 dp, dolny 22 dp): po lewej kicker „Panel organizatora” (12,5 dp, neutral-400) i tytuł „Turnieje” (32 dp, 500); po prawej okrągły przycisk 40 dp z obrysem accent i ikoną `plus` (accent, 20 dp) → SCR-ORG-02. **⟡ rozszerzenie:** obok, po lewej od „+”, przycisk 40 dp bez obrysu z ikoną `user-circle` (neutral-300) → SCR-ORG-21.
  2. Etykieta sekcji „AKTYWNE” (kicker 11,5 dp, wersaliki, odstęp liter 0,08 em, neutral-400).
  3. Karty aktywnych turniejów (odstęp 10 dp, margines dolny 26 dp). Karta: padding 16, radius lg, tło gradient 160° (accent 9% nad surface → surface), krawędź shadow-sm, odstęp wewnętrzny 12:
     - wiersz 1: pigułka statusu + ikona `caret-right` (neutral-500, 16 dp),
     - nazwa (18 dp, 500, interlinia 1,25, zawijanie „pretty”),
     - meta (12,5 dp, neutral-400, zawijanie): `calendar-blank` + data, `map-pin` + miejsce,
     - postęp: pasek 4 dp (tor neutral-800, wypełnienie accent) + podsumowanie „{n} {kategoria|kategorie|kategorii} · {pct}%” (12 dp, cyfry tabelaryczne, bez zawijania).
  4. Sekcja „ZAKOŃCZONE” (tylko gdy niepusta): lista grupowana (radius lg, separator 1 dp). Wiersz (padding 14, odstęp 12): kafelek 40 dp (radius 12, neutral-900, ikona `archive` neutral-400 18 dp), nazwa (15 dp, wielokropek), „{data} · {miejsce}” (12 dp neutral-400, wielokropek), `caret-right` neutral-600.
- **Format daty:** jeden dzień „18 kwietnia 2027”; zakres w tym samym miesiącu „3–4 października 2026”; różne miesiące „30 września – 1 października 2026”; brak daty „Data do ustalenia”. Brak miejsca: „Miejsce do ustalenia”.
- **Sortowanie:** Aktywne – najpierw Trwa, potem W przygotowaniu, w grupie data rosnąco (brak daty na końcu). Zakończone – data malejąco.
- **Stany:**
  | Stan | Zachowanie |
  |---|---|
  | Ładowanie | 2 szkielety kart + 2 szkielety wierszy |
  | Brak jakichkolwiek turniejów **⟡** | Pod nagłówkiem stan pusty: ikona `trophy` (accent, 26 dp), „Nie masz jeszcze turniejów.”, przycisk primary „Utwórz turniej” → SCR-ORG-02 |
  | Brak aktywnych, są zakończone **⟡** | Pod „AKTYWNE” tekst „Brak aktywnych turniejów.” (13 dp, neutral-400) |
  | Offline | dane z cache + baner; „+” nieaktywny |
  | Błąd | stan błędu z „Spróbuj ponownie” |
- **Akcje:** tap karty/wiersza → SCR-ORG-03; „+” → SCR-ORG-02; odświeżanie gestem pull-to-refresh **⟡** (wskaźnik accent).
- **Dostępność:** karta jako jeden przycisk z etykietą „{nazwa}, {status}, {data}, {miejsce}, postęp {pct} procent”.

## SCR-ORG-02 – Nowy turniej (bottom sheet)
- **Cel:** utworzenie turnieju. **FR:** FR-202. **US:** US-011.
- **Układ (arkusz, padding 8/18/34, odstęp 14):** uchwyt 36×5 dp (neutral-700); wiersz tytułu „Nowy turniej” (20 dp, 500) + przycisk zamknięcia 30 dp (neutral-800, ikona `x` neutral-300); pole „Nazwa turnieju” (placeholder „np. Wiosenny Puchar PoleChamp”); siatka 2 kolumn: pole „Data” (placeholder „12 kwietnia 2027”) i pole „Miejsce” (placeholder „Poznań, Arena”); przycisk primary „Utwórz turniej” (48 dp, 15 dp).
- **Pola:** wysokość min. 44 dp, tekst 15 dp, tło `bg` (na arkuszu surface), etykieta 12 dp (tekst 70%).
- **Rozszerzenie logiki (decyzja G-15):** „Data” otwiera natywny wybór daty z przełącznikiem „Jeden dzień / Kilka dni” i pokazuje sformatowaną wartość. Pole można wyczyścić (ikona `x-circle`).
- **Walidacje:** nazwa wymagana, 3–120 znaków po przycięciu – błąd pod polem „Podaj nazwę turnieju (min. 3 znaki).” (12 dp, accent-300, ikona `warning-circle`); data końcowa ≥ początkowa; miejsce ≤ 120 znaków.
- **Akcje:** „Utwórz turniej” → zapis (przycisk w stanie ładowania: spinner zamiast ikony, nieaktywny) → SCR-ORG-03 nowego turnieju, toast „Utworzono turniej”. Błąd sieci → toast błędu „Nie udało się zapisać. Spróbuj ponownie.”, arkusz zostaje.
- **Klawiatura:** arkusz podnosi się nad klawiaturę. Akcja „Dalej” przechodzi między polami, „Gotowe” zatwierdza.

## SCR-ORG-03 – Szczegóły turnieju
- **Cel:** przegląd turnieju, sterowanie statusem, lista kategorii. **FR:** FR-205…209, FR-705. **US:** US-013…015.
- **Układ:**
  1. Wiersz nawigacji 44 dp (margines dolny 10): link „‹ Turnieje” (ikona `caret-left` 20 dp + tekst 15 dp accent, padding 6, radius md) → SCR-ORG-01; po prawej przycisk 36 dp (surface, shadow-sm, ikona `file-pdf` 18 dp) → SCR-ORG-12 (zakres: cały turniej). **⟡ rozszerzenie:** po lewej od PDF przycisk 36 dp z ikoną `pencil-simple` → SCR-ORG-20 (ukryty w turnieju Zakończona).
  2. Pigułka statusu turnieju.
  3. Nazwa (26 dp, 500, interlinia 1,2, marginesy 10/8).
  4. Meta: `calendar-blank` + data, `map-pin` + miejsce (12,5 dp, neutral-400).
  5. Kafle statystyk (siatka 3 kolumn, separatory 1 dp, radius lg, shadow-sm, marginesy 20/12): wartość 22 dp/500 tabelarycznie + etykieta 11,5 dp neutral-400: „Kategorie”, „Zawodniczki”, „Sędziowie”. **⟡ rozszerzenie:** kafel „Sędziowie” jest przyciskiem → SCR-ORG-14 (wskazówka: drobna ikona `caret-right` 12 dp neutral-500 obok etykiety).
  6. Karta „Postęp oceniania” (padding 14, radius lg, odstęp 10, margines dolny 28): wiersz „Postęp oceniania” (14 dp) + „{pct}%” (14 dp/500 accent-300); pasek 6 dp; tekst 12 dp neutral-400: „{done} z {exp} ocen w rozpoczętych kategoriach” albo „Brak rozpoczętych kategorii”; przycisk akcji (44 dp, 14 dp, ikona 17 dp):
     - W przygotowaniu: primary „Rozpocznij turniej” (`play`),
     - Trwa: secondary „Zakończ turniej” (`flag-checkered`) → SCR-ORG-04,
     - Zakończona: **brak przycisku** (UI-02).
  7. Nagłówek sekcji: kicker „KATEGORIE” + przycisk ghost „Dodaj” (ikona `plus`, 13 dp) → SCR-ORG-05 (tryb nowy). **Ukryty w turnieju Zakończona** (korekta v2, FR-208).
  8. Karty kategorii (odstęp 10): padding 14, radius lg, surface, shadow-sm; wiersz górny: nazwa (16 dp, 500, wielokropek) i pod nią „{styl} · {poziom} · {n} {zawodniczka|zawodniczki|zawodniczek}” (12 dp neutral-400); po prawej pigułka statusu (nie zawija się); wiersz dolny: pasek 4 dp + „{done}/{exp} ocen”.
  9. Stan pusty listy: ramka (obrys 1 dp divider, radius lg, padding 28/16), ikona `squares-four` (26 dp, accent), „Brak kategorii. Dodaj pierwszą, aby zacząć.” – całość tapowalna → SCR-ORG-05.
- **⟡ Banery (rozszerzenia) nad kartą postępu:** (a) niezweryfikowany e-mail: „Potwierdź adres e-mail, aby rozpocząć turniej.” + link „Wyślij kod ponownie”; (b) odrzucone oceny: ikona `warning-circle`, „Odrzucone oceny ({n})” → SCR-ORG-22. Styl: tło accent-900, tekst accent-200, radius md, padding 8/10, 12 dp.
- **Realtime:** postęp, liczniki i statusy kategorii odświeżają się na żywo (FR-703).
- **Akcje:** „Rozpocznij turniej” → toast „Turniej rozpoczęty”; tap karty kategorii → SCR-ORG-06 (zakładka Kryteria).

## SCR-ORG-04 – Zakończyć turniej? (bottom sheet)
- **Cel:** potwierdzenie nieodwracalnego zamknięcia turnieju. **FR:** FR-207. **US:** US-015.
- **Układ (wyśrodkowany, odstęp 12):** uchwyt; ikona w kole 52 dp (accent-900, ikona `flag-checkered` accent-300 24 dp); tytuł „Zakończyć turniej?” (20 dp, 500); tekst (14 dp, neutral-300, interlinia 1,5): „„{nazwa turnieju}” zostanie zamknięty, a wyniki zapisane jako ostateczne.”; **⟡ rozszerzenie** (tylko gdy dotyczy): „Kategorie w toku ({n}) zostaną zablokowane. Kategorie w przygotowaniu ({m}) zostaną oznaczone jako nierozegrane.” (13 dp, neutral-400); **⟡ uzupełnienie TL-48** (tylko gdy dotyczy, z danych `GET /tournaments/{id}` i `GET …/devices`): „Brakuje {k} ocen w kategoriach w toku.”, „Tablety z niewysłanymi ocenami: {nazwa} ({n}), …” oraz „Nierozstrzygnięte odrzucone oceny ({r}) nie będą mogły zostać przyjęte.” (13 dp, accent-300, ikona `warning-circle`); przyciski w kolumnie (48 dp): primary „Zakończ turniej”, secondary „Anuluj”.
- **Akcje:** „Zakończ turniej” → toast „Turniej zakończony”, przycisk statusu znika. „Anuluj” / tło → zamknięcie bez zmian.

## SCR-ORG-05 – Nowa kategoria / Edytuj kategorię (bottom sheet)
- **Cel:** utworzenie lub edycja metadanych kategorii. **FR:** FR-301…303. **US:** US-020, US-021.
- **Układ:** uchwyt; tytuł „Nowa kategoria” / „Edytuj kategorię” + „×”; pole „Nazwa” (placeholder „np. Pole Sport Beginner”); pole „Styl” – chipy „Pole Sport”, „Pole Art”, „Exotic”, „Doubles”; pole „Poziom” – chipy „Beginner”, „Intermediate”, „Advanced”, „Pro”, „Elite”; pole „Grupa wiekowa” (domyślnie „Open”); przycisk primary „Utwórz kategorię” / „Zapisz zmiany”.
- **Chipy:** padding 8/13, radius 999, 13 dp; wybrany: tło accent-900, tekst accent-200, obrys 1 dp accent; niewybrany: tło bg, tekst neutral-300, obrys divider. Wybór pojedynczy.
- **Domyślne (nowa):** Styl „Pole Sport”, Poziom „Beginner”, Grupa „Open”.
- **Walidacje:** nazwa wymagana (1–80 znaków) – „Podaj nazwę kategorii.”; grupa wiekowa maks. 40 znaków (pusta → „Open”).
- **Edycja w statusie Trwa / Zakończona:** chipy stylu i poziomu nieaktywne (opacity 0,45) z podpisem „Styl i poziom można zmienić tylko przed rozpoczęciem kategorii.” **⟡**.
- **⟡ rozszerzenie (edycja, status W przygotowaniu):** przycisk secondary „Usuń kategorię” (ikona `trash`, tekst neutral-300) → drugi krok w arkuszu: „Usunąć kategorię „{nazwa}”? Zostaną usunięte kryteria, kary i lista startowa.” + „Usuń” (secondary) / „Anuluj” (ghost).
- **Akcje:** zapis nowej → toast „Dodano kategorię”, karta na liście (arkusz zamknięty, użytkownik zostaje na SCR-ORG-03); zapis edycji → toast „Zapisano zmiany”.

## SCR-ORG-06 / 07 / 08 – Szczegóły kategorii (wspólna rama)
- **Cel:** konfiguracja i nadzór nad kategorią. **FR:** FR-302…312, FR-401…404, FR-701…705.
- **Rama (od góry):**
  1. Wiersz nawigacji 44 dp: „‹ Turniej” → SCR-ORG-03 (decyzja PO 28.10.2026, IMP-704: wstecz = poprzedni ekran; po wejściu z ekranu „Zawodniczki” turnieju etykieta „‹ Zawodniczki”); po prawej przycisk 36 dp `pencil-simple` → SCR-ORG-05 (edycja; ukryty w turnieju Zakończona).
  2. Meta „{styl} · {poziom} · {grupa wiekowa}” (12,5 dp, neutral-400) – w jednej linii, wielokropek (UI-11).
  3. Nazwa kategorii (26 dp, 500, marginesy 4/10).
  4. Pigułka statusu kategorii.
  5. Segmented control (siatka 3 kolumn, padding 3, radius 11, surface, shadow-sm, marginesy 18/18): „Kryteria {liczba}”, „Zawodniczki {liczba}”, „Wyniki”. Licznik 11 dp opacity 0,7. Aktywny segment: tło accent 14% nad bg, tekst accent-200, obrys accent-700 (UI-08). Po wejściu aktywna jest zakładka „Kryteria”.
  6. Treść zakładki (flex, padding dolny 16).
  7. **Pasek przyklejony u dołu** (padding 18/16/34, tło gradient od bg 72% do przezroczystego):
     | Stan kategorii | Zawartość paska |
     |---|---|
     | W przygotowaniu | primary pełnej szerokości 48 dp „Rozpocznij kategorię” (ikona `play`), tło accent 10% nad bg |
     | Trwa | dwa przyciski 48 dp obok siebie: secondary „Zakończ i zablokuj” (`lock-simple`, tło bg) i primary „Eksport PDF” (`file-pdf`, tło accent 10% nad bg) |
     | Zakończona (turniej Trwa) | secondary „Odblokuj” (`lock-simple-open`) + primary „Eksport PDF” |
     | Turniej Zakończona **⟡** | tylko primary „Eksport PDF” pełnej szerokości |
- **Akcje paska:** „Rozpocznij kategorię” → walidacja (FR-308) → toast „Kategoria rozpoczęta” lub toast z przyczyną; „Zakończ i zablokuj” → SCR-ORG-18 (gdy ostrzeżenia) lub od razu toast „Kategoria zakończona”; „Odblokuj” → toast „Kategoria odblokowana”; „Eksport PDF” → SCR-ORG-12 (zakres: kategoria).
- **⟡ Baner** „Odrzucone oceny ({n})” pod pigułką statusu, gdy dotyczy tej kategorii.

### SCR-ORG-06 – zakładka „Kryteria”
- **FR:** FR-304…307. **US:** US-022…024.
- **Sekcja 1:** nagłówek „KRYTERIA OCENY” + ghost „Dodaj” (`plus`) → SCR-ORG-09 (nowe). Lista grupowana; wiersz (min. 56 dp, padding 10/14, odstęp 12): nazwa (15 dp, wielokropek), „Skala 0–{max}” (12 dp neutral-400), odznaka wagi „×{waga}” (padding 3/8, radius 6, 12 dp, tło accent-900, tekst accent-300, cyfry tabelaryczne), `caret-right` neutral-600 → SCR-ORG-09 (edycja). Pod listą: ikona `info` + „Maksymalny wynik sędziego: {max} pkt” (12 dp neutral-400).
- **Sekcja 2 (odstęp 24):** nagłówek „KARY PUNKTOWE” + „Dodaj” → SCR-ORG-10. Wiersz: nazwa, „maks. {n}× na występ”, odznaka „−{pkt} pkt” (tło neutral-900, tekst neutral-200), chevron → SCR-ORG-10 (edycja).
- **Stany ⟡:** brak kar – pod nagłówkiem tekst „Brak kar punktowych.” (13 dp neutral-400). Kategoria Trwa/Zakończona – „Dodaj” ukryte, wiersze bez chevronu i nieaktywne, nad pierwszą sekcją informacja z ikoną `lock-simple`: „Kryteria są zablokowane po rozpoczęciu kategorii.” (12 dp neutral-400) (FR-305, decyzja D-AR-04).
- **Formatowanie:** waga i punkty bez zbędnych zer i z przecinkiem („×1,5”, „−0,5 pkt”), znak minus typograficzny „−” (UI-14).

### SCR-ORG-07 – zakładka „Zawodniczki”
- **FR:** FR-401…404. **US:** US-030…032.
- **Układ:** nagłówek „LISTA STARTOWA” + „Dodaj” → SCR-ORG-11 (ukryte w kategorii Zakończona i turnieju Zakończona). **⟡** Pole wyszukiwania (ikona `magnifying-glass`, placeholder „Szukaj po nazwisku, klubie lub numerze”) przy ≥ 15 pozycjach. Lista grupowana; wiersz (min. 60 dp): odznaka numeru 38 dp (radius 11, accent-900 / accent-200, 14 dp/500 tabelarycznie), nazwisko (15 dp, jedna linia, wielokropek – UI-15), klub (12 dp neutral-400, wielokropek), po prawej ikona 16 dp + „{n}/{J}” (12 dp tabelarycznie): komplet – `check-circle` (fill) i kolor accent-300; niekomplet – `circle-dashed` neutral-500.
- **⟡ Rozszerzenia:** wiersz tapowalny → SCR-ORG-17 (chevron po prawej od licznika); wycofana – nazwisko neutral-500 i etykieta „Wycofana” zamiast licznika; wycofane pozycje są zawsze widoczne, na końcu listy.
- **Stany:** pusta lista – „Lista startowa jest pusta.” (13 dp, neutral-400, wyśrodkowane, padding 24/16); w kategorii W przygotowaniu licznik pokazuje „0/{J}”.

### SCR-ORG-08 – zakładka „Wyniki”
- **FR:** FR-701…704, FR-707. **US:** US-070…072, US-074.
- **Układ:** kicker „RANKING NA ŻYWO”; lista grupowana; wiersz (padding 12/14, odstęp 12):
  - miejsce (szerokość 26 dp, 20 dp/500 tabelarycznie): top 3 z ocenami – accent-300, pozostałe – neutral-500; **decyzja G-31:** wiersz bez ocen pokazuje „–” zamiast numeru,
  - kolumna (odstęp 5): wiersz 1 – nazwisko (15 dp, wielokropek) i wynik (17 dp/500 tabelarycznie) albo „—”; wiersz 2 – „#{nr} · {klub}” (12 dp neutral-400, wielokropek) i „{n}/{J} sędziów” albo „brak ocen”; wiersz 3 – pasek 3 dp (szerokość = wynik / maks. wynik sędziego; 1. miejsce accent, pozostałe accent-700).
  - Pod listą: ikona `info` + „Wynik = średnia sędziów z (kryterium × waga − kary). Remis rozstrzyga wyższa ocena za {nazwa kryterium rozstrzygającego}.” (12 dp, interlinia 1,45; w designie „…za Technikę.” – nazwa w bierniku z pola kryterium, a gdy odmiana jest niepewna, wariant „…wyższa ocena w kryterium „{nazwa}”.”).
- **Wyświetlanie wyniku:** 1 miejsce po przecinku. Gdy sąsiednie wiersze z różnym miejscem mają ten sam wynik po zaokrągleniu, oba pokazują 2 miejsca ([07-reguly-punktacji.md §4](07-reguly-punktacji.md#4-zaokrąglenia-i-prezentacja)). Pole `display` pochodzi z API.
- **⟡ Rozszerzenia:** pigułka „wstępny” (neutral, 11 dp) obok wyniku niekompletnego w kategorii Zakończona; tapnięcie wiersza z ocenami → SCR-ORG-19.
- **Stany:** kategoria W przygotowaniu – wszystkie wiersze „—”, „brak ocen”, miejsca „–” (UI-01); aktualizacja na żywo bez przeskoku przewinięcia (animacja zmiany kolejności 200 ms).

## SCR-ORG-09 – Nowe kryterium / Edytuj kryterium (bottom sheet)
- **FR:** FR-305, FR-306. **US:** US-023.
- **Układ:** tytuł „Nowe kryterium” / „Edytuj kryterium” + „×”; pole „Nazwa kryterium” (placeholder „np. Technika”); siatka 2 kolumn: „Skala (0–max)” (liczba całkowita, klawiatura numeryczna, domyślnie 10) i „Waga” (liczba dziesiętna z krokiem 0,5, domyślnie 1); pole „Opis dla sędziów” (placeholder „Opcjonalnie”); primary „Zapisz”; w edycji dodatkowo secondary „Usuń kryterium” (`trash`, tekst neutral-300).
- **⟡ Rozszerzenie:** „Waga” jako pole + przyciski −/+ (krok 0,5), żeby uniknąć wpisywania przecinka. Akceptowany jest też przecinek i kropka.
- **Walidacje:** nazwa 1–60 znaków („Podaj nazwę kryterium.”); skala 1–20 całkowita („Skala od 1 do 20.”); waga 0,5–5 co 0,5 („Waga od 0,5 do 5 (co 0,5).”); opis ≤ 200.
- **Usuwanie ⟡:** drugi krok „Usunąć kryterium „{nazwa}”?” + „Usuń” / „Anuluj”; ostatniego kryterium nie można usunąć („Kategoria musi mieć co najmniej jedno kryterium.”).
- **Toasty:** „Dodano kryterium”, „Zapisano kryterium”, „Usunięto kryterium”.
- **Tryb tylko do odczytu ⟡ (kategoria rozpoczęta):** arkusz nie otwiera się (wiersze nieaktywne).

## SCR-ORG-10 – Nowa kara / Edytuj karę (bottom sheet)
- **FR:** FR-307. **US:** US-024.
- **Układ:** tytuł „Nowa kara” / „Edytuj karę” + „×”; „Nazwa kary” (placeholder „np. Upadek”); siatka: „Punkty za 1 raz” (krok 0,5, min. 0,5, domyślnie 1) i „Maks. wystąpień” (1–10, domyślnie 3); primary „Zapisz”; w edycji „Usuń karę”.
- **Walidacje:** nazwa 1–60; punkty 0,5–50 co 0,5 („Od 0,5 do 50 (co 0,5).”); maks. 1–10 („Od 1 do 10.”).
- **Toasty:** „Dodano karę”, „Zapisano karę”, „Usunięto karę”. Usuwanie z potwierdzeniem ⟡.

## SCR-ORG-11 – Nowa zawodniczka (bottom sheet)
- **FR:** FR-402, FR-406. **US:** US-031, US-033.
- **Układ:** tytuł „Nowa zawodniczka” + „×”; siatka (96 dp + reszta): „Nr startowy” (klawiatura numeryczna, podpowiedź – najmniejszy wolny numer większy od maks. w kategorii **⟡**) i „Imię i nazwisko”; pole „Klub / szkoła”; **⟡** pole „Rok urodzenia (opcjonalnie)” i – gdy wiek < 18 – przełącznik/checkbox „Mam zgodę rodzica/opiekuna na przetwarzanie danych” (obowiązkowy); primary „Dodaj do listy”.
- **Walidacje:** numer 1–9999 i unikalny w turnieju („Numer {nr} jest już zajęty.”); imię i nazwisko 2–100 znaków („Podaj imię i nazwisko.”); klub ≤ 100; rok 1920–bieżący; zgoda wymagana dla niepełnoletnich („Potwierdź zgodę opiekuna.”).
- **Akcje:** zapis → toast „Dodano zawodniczkę”, arkusz zamknięty, pozycja na końcu listy. **⟡** Opcja „Dodaj kolejną” (ghost) zostawia arkusz otwarty z wyczyszczonymi polami i podpowiedzią kolejnego numeru.

## SCR-ORG-12 – Podgląd PDF (bottom sheet)
- **FR:** FR-705, FR-706. **US:** US-073.
- **Układ (maks. 86% wysokości):** uchwyt, tytuł „Podgląd PDF” + „×”; przewijana karta podglądu (margines 14, padding 16, radius lg, tło bg, shadow-sm): nagłówek – kwadrat 32 dp z `trophy` (obrys accent), nazwa turnieju (14 dp/500), „{data} · {miejsce}” (11,5 dp neutral-400);
  - **zakres turniej:** dla każdej kategorii (odstęp 16) nazwa (13 dp/500) i tabela 12 dp: „{miejsce}.” (szer. 22, neutral-400), nazwisko, wynik (do prawej, accent-300, tabelarycznie);
  - **zakres kategoria:** „{kategoria} · {status}” (13 dp/500), tabela z nagłówkiem „#”, „Zawodniczka”, „Wynik”; pod nazwiskiem klub (11 dp neutral-400).
  - Stopka arkusza (padding 14/18/34): primary pełnej szerokości 48 dp „Pobierz PDF” (ikona `download-simple`).
- **Stany ⟡:** generowanie – przycisk „Generowanie…” ze spinnerem, nieaktywny (maks. 30 s); sukces – systemowy arkusz udostępniania, toast „PDF zapisany”; błąd – toast „Nie udało się wygenerować PDF. Spróbuj ponownie.”; offline – przycisk nieaktywny z podpisem „Eksport wymaga połączenia z internetem.”.
- **Zawartość pliku** (różni się od podglądu – jasny wydruk): [ADR-009](../01-architecture/adr/ADR-009-eksport-pdf-po-stronie-serwera.md).

---

## SCR-SYS-01 – Wybór trybu przy pierwszym uruchomieniu ⟡ POZA DESIGNEM – PROPOZYCJA
- **Cel:** przypisanie instalacji do trybu Organizatora albo Sędziego ([ADR-001](../01-architecture/adr/ADR-001-aplikacja-mobilna-react-native-expo.md)). **FR:** FR-103, FR-504.
- **Układ (po splashu, tło jak splash):** logo i „PoleChamp”; tekst „Jak będziesz używać tego urządzenia?” (15 dp); dwie duże karty (surface, radius lg, padding 22, ikona 28 dp accent, tytuł 17 dp/500, opis 13 dp neutral-400): „Jestem organizatorem” (`device-mobile`, „Zarządzaj turniejami i wynikami.”) → SCR-ORG-13; „Tablet sędziowski” (`device-tablet`, „Sparuj tablet z turniejem i oceniaj występy.”) → SCR-JDG-06. Na urządzeniu niespełniającym NFR-702 (najmniejszy wymiar < 600 dp lub szerokość w poziomie < 1024 dp) karta tabletu jest nieaktywna z podpisem „Panel sędziego wymaga tabletu.”.

## SCR-ORG-13 – Logowanie / rejestracja / reset hasła ⟡ POZA DESIGNEM – PROPOZYCJA
- **FR:** FR-101…104, FR-107, FR-903. **US:** US-001, US-002.
- **Układ logowania:** tło jak splash (poświata accent-900); logo (36 dp) + „PoleChamp” (30 dp) + „Panel organizatora” (13,5 dp neutral-400); pola „E-mail” (klawiatura e-mail, autouzupełnianie) i „Hasło” (ikona `eye` / `eye-slash`); primary 48 dp „Zaloguj się”; ghost „Nie pamiętasz hasła?”; na dole tekst „Nie masz konta?” + ghost „Załóż konto”.
- **Rejestracja:** „Nazwa wyświetlana”, „E-mail”, „Hasło” (podpowiedź „Min. 10 znaków.”), checkbox „Akceptuję regulamin i umowę powierzenia przetwarzania danych” (linki otwierają dokumenty w przeglądarce w aplikacji), primary „Załóż konto” (nieaktywny bez zgody).
- **Weryfikacja e-maila:** „Wpisz kod z e-maila” – 6 pól jednocyfrowych (styl kropek PIN-u nie dotyczy; pola 44×52 dp), ghost „Wyślij kod ponownie” (aktywny po 60 s), ghost „Pomiń na razie” (konfiguracja bez startu turnieju).
- **Reset:** pole „E-mail” → primary „Wyślij link”, komunikat „Jeśli konto istnieje, wysłaliśmy link do zmiany hasła.”; ekran nowego hasła z deep linku: „Nowe hasło”, primary „Zapisz hasło”.
- **Błędy:** „Nieprawidłowy e-mail lub hasło.”; „Za dużo prób. Spróbuj za chwilę.”; offline – „Brak połączenia z internetem.”.

## SCR-ORG-14 – Sędziowie i urządzenia ⟡ POZA DESIGNEM – PROPOZYCJA
- **FR:** FR-501, FR-503, FR-505. **US:** US-040…044.
- **Układ:** wiersz nawigacji „‹ Turniej”; tytuł „Sędziowie i urządzenia” (26 dp); segmented control (2): „Sędziowie {n}”, „Urządzenia {n}”.
  - **Sędziowie:** nagłówek „SĘDZIOWIE” + „Dodaj” → SCR-ORG-15 (nowy); lista grupowana; wiersz 60 dp: awatar 38 dp z inicjałami (accent-900 / accent-200; nieaktywny – neutral-900 / neutral-400), imię i nazwisko (15 dp), linia stanu (12 dp neutral-400): „Aktywny · {n} ocen” / „PIN zablokowany” (accent-300, ikona `lock-simple`) / „Nieaktywny”; chevron → SCR-ORG-15 (edycja). Stan pusty: „Dodaj sędziów, aby móc rozpocząć kategorie.”.
  - **Urządzenia:** lista grupowana; wiersz: kafelek 40 dp (`device-tablet`), nazwa (15 dp), linia (12 dp): „Online · {sędzia}” (kropka accent) / „Online · nikt nie jest zalogowany” / „Offline od {czas}” (kropka neutral-600) + „· {n} niewysłane oceny” (accent-300) ; po prawej bateria (`battery-*`, %); tap → arkusz z „Zmień nazwę” i „Odłącz urządzenie” (potwierdzenie: „Odłączyć „{nazwa}”? Niewysłane oceny ({n}) nie dotrą do systemu.”). Stan pusty: „Brak sparowanych tabletów.”.
  - Pasek przyklejony: primary „Sparuj tablet” (ikona `qr-code`) → SCR-ORG-16 (ukryty w turnieju Zakończona).
- **Realtime:** statusy urządzeń aktualizowane zdarzeniem `device.status`.

## SCR-ORG-15 – Nowy / Edytuj sędziego (bottom sheet) ⟡ POZA DESIGNEM – PROPOZYCJA
- **FR:** FR-502, FR-503. **US:** US-040…042.
- **Nowy:** „Nowy sędzia”; pole „Imię i nazwisko”; primary „Dodaj sędziego” → krok 2 w tym samym arkuszu: „PIN dla {imię i nazwisko}”, karta (surface, radius lg) z 4 cyframi (40 dp/500, tabelarycznie, accent-200, odstęp 16), ghost „Kopiuj” (`copy`), ostrzeżenie (12 dp, accent-300, `warning-circle`): „Zapisz PIN – nie będzie można go ponownie wyświetlić.”, primary „Gotowe”.
- **Edycja:** „Edytuj sędziego”; „Imię i nazwisko”, „Inicjały” (maks. 3 znaki); primary „Zapisz zmiany”; secondary „Resetuj PIN” (`key`) → potwierdzenie „Zresetować PIN? Sędzia zostanie wylogowany ze wszystkich tabletów.” → krok PIN jak wyżej; secondary „Dezaktywuj sędziego” / „Aktywuj sędziego”; ghost „Usuń sędziego” (tylko bez ocen).
- **Walidacje:** imię i nazwisko 3–80, unikalne w turnieju („Sędzia o tym imieniu i nazwisku już istnieje.”).

## SCR-ORG-16 – Sparuj tablet (bottom sheet) ⟡ POZA DESIGNEM – PROPOZYCJA
- **FR:** FR-504. **US:** US-043.
- **Układ:** „Sparuj tablet”; instrukcja (13 dp, neutral-300): „1. Otwórz PoleChamp na tablecie i wybierz „Tablet sędziowski”. 2. Zeskanuj kod lub wpisz go ręcznie.”; karta z kodem QR 200×200 dp (**wyjątek kolorystyczny:** jasne tło neutral-100 i ciemne moduły neutral-900 – czytelność skanerów); kod tekstowy „K7QM-4ZTX” (28 dp/500, tabelarycznie, odstęp liter 0,1 em); „Kod ważny jeszcze {mm:ss}” (12 dp neutral-400); lista „Sparowane teraz” (pojawiają się nowe tablety); secondary „Nowy kod”; primary „Gotowe”.
- **Wygaśnięcie:** kod przygaszony, tekst „Kod wygasł.”, aktywny „Nowy kod”.

## SCR-ORG-17 – Edytuj zawodniczkę (bottom sheet) ⟡ POZA DESIGNEM – PROPOZYCJA
- **FR:** FR-403, FR-404, FR-406, FR-904. **US:** US-032, US-033, US-091.
- **Układ:** „Edytuj zawodniczkę”; pola jak SCR-ORG-11 (z rokiem urodzenia i zgodą); primary „Zapisz zmiany” (toast „Zapisano zmiany”); secondary „Wycofaj zawodniczkę” (`user-minus`) / „Przywróć zawodniczkę”; ghost „Usuń z listy” (tylko bez ocen) lub „Usuń dane osobowe” (po ocenach, Should). Każda akcja z drugim krokiem potwierdzenia.
- **Teksty potwierdzeń:** „Wycofać {imię i nazwisko}? Zniknie z kolejki sędziów i z rankingu. Oceny zostaną zachowane.”; „Usunąć dane osobowe? W wynikach pozostanie „Zawodniczka nr {nr}”. Tej operacji nie można cofnąć.”.

## SCR-ORG-18 – Zablokować kategorię? (bottom sheet) ⟡ POZA DESIGNEM – PROPOZYCJA
- **FR:** FR-309. **US:** US-026. **API:** `LOCK_WARNINGS`.
- **Układ (wzorowany na SCR-ORG-04):** ikona w kole 52 dp (`lock-simple`); tytuł „Zablokować kategorię?”; tekst „Brakuje {n} ocen. Wyniki zostaną zapisane jako ostateczne.” (gdy n > 0); lista urządzeń z zaległościami (wiersze jak w SCR-ORG-14: „{nazwa} – {n} niewysłane oceny” / „{nazwa} – offline od {czas}”); podpowiedź (12 dp neutral-400): „Poczekaj, aż tablety się zsynchronizują, albo zablokuj teraz – późniejsze oceny trafią do „Odrzucone oceny”.”; przyciski: primary „Zablokuj mimo to”, secondary „Anuluj”.

## SCR-ORG-19 – Oceny zawodniczki (bottom sheet) ⟡ POZA DESIGNEM – PROPOZYCJA
- **FR:** FR-707, FR-902. **US:** US-074. **Priorytet:** Should.
- **Układ:** nagłówek: odznaka numeru 38 dp, nazwisko (17 dp/500), klub; podsumowanie: „Wynik {x} · miejsce {r} · {n}/{J} sędziów”; dla każdego sędziego karta (surface, radius lg, padding 14): awatar z inicjałami 28 dp, imię i nazwisko, wynik sędziego (17 dp/500) / „brak oceny”, tag „offline” (gdy `OFFLINE_PIN`); lista not „{kryterium} {nota} ×{waga}” (12 dp, dwie kolumny), kary „{kara} ×{n} (−{pkt})”, komentarz (13 dp, neutral-300, kursywa w cudzysłowie); ghost „Historia zmian ({liczba rewizji})” → rozwinięcie z listą „rew. {k} · {czas} · {wynik}”.

## SCR-ORG-20 – Edytuj turniej (bottom sheet) ⟡ POZA DESIGNEM – PROPOZYCJA
- **FR:** FR-203, FR-204. **US:** US-012.
- Jak SCR-ORG-02 z tytułem „Edytuj turniej” i przyciskiem „Zapisz zmiany” (toast „Zapisano zmiany”). W statusie W przygotowaniu bez ocen: secondary „Usuń turniej” → potwierdzenie „Usunąć turniej „{nazwa}”? Zostaną usunięte wszystkie kategorie, listy startowe i sędziowie.”.

## SCR-ORG-21 – Konto ⟡ POZA DESIGNEM – PROPOZYCJA
- **FR:** FR-105, FR-106, FR-903. **US:** US-003.
- **Układ:** „‹ Turnieje”; tytuł „Konto”; karta: nazwa wyświetlana, e-mail, status weryfikacji (pigułka „Zweryfikowany” / link „Zweryfikuj e-mail”); lista grupowana: „Regulamin”, „Polityka prywatności”, „Umowa powierzenia danych”, „Pomoc i kontakt”, „Wersja aplikacji {x.y.z}”; secondary „Wyloguj się” (`sign-out`); ghost neutral-300 „Usuń konto” (potwierdzenie z wpisaniem „USUŃ”). Linki do dokumentów pochodzą z `GET /v1/app-config` (TL-07). Usunięcie konta jest Must (TL-22); przy turnieju w statusie Trwa komunikat „Najpierw zakończ trwający turniej.”.

## SCR-ORG-22 – Odrzucone oceny (bottom sheet) ⟡ POZA DESIGNEM – PROPOZYCJA
- **FR:** FR-805. **US:** US-083.
- **Układ:** tytuł „Odrzucone oceny”; tekst objaśniający (13 dp neutral-300): „Te oceny dotarły po zablokowaniu kategorii. Aby przyjąć ocenę, najpierw odblokuj kategorię.”; lista wierszy: „{sędzia} → #{nr} {zawodniczka}”, „{kategoria} · {powód}” (np. „Kategoria zablokowana”), „wysłano {czas}”, wynik sędziego z treści; akcje w wierszu: ghost „Przyjmij” (accent; nieaktywny przy zablokowanej kategorii) i ghost „Odrzuć” (neutral-300, z potwierdzeniem). Stan pusty: „Brak odrzuconych ocen.”.

<a id="scr-pub-01"></a>
## SCR-PUB-01 – Publiczne wyniki (web, v2) ⟡ POZA DESIGNEM – PROPOZYCJA (poza MVP)
- **FR:** FR-709. Strona mobilna (link/QR) w stylu Nocturne: nagłówek turnieju, lista kategorii (pigułki statusu), ranking kategorii jak SCR-ORG-08 bez pasków i liczników sędziów. Dla niepełnoletnich inicjał nazwiska. Odświeżanie co 15 s. Publikację włącza organizator per kategoria („Opublikuj wyniki”). Wymaga zgód (RODO) – patrz [05-bezpieczenstwo.md §5.3](../01-architecture/05-bezpieczenstwo.md#53-niepełnoletnie).

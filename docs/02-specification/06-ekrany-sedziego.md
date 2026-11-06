# Ekrany – Sędzia (tablet, orientacja pozioma)

> Dokument: `02-specification/06-ekrany-sedziego.md` · Wersja 1.0 · 23.10.2026
> Źródło wyglądu: `design/PoleChamp v2.dc.html` (ramka tabletu 1100×720 w poziomie, ekran z zaokrąglonymi rogami 24 dp). Komponenty: [09-design-system.md](09-design-system.md). Offline i wskaźniki: [06-offline-i-synchronizacja.md §8](../01-architecture/06-offline-i-synchronizacja.md#8-wskaźniki-stanu-w-ui). Reguły punktacji: [07-reguly-punktacji.md](07-reguly-punktacji.md).
> Teksty w „…” są wiążące. **⟡ POZA DESIGNEM – PROPOZYCJA** oznacza elementy bez odpowiednika w prototypie.

## 0. Zasady wspólne dla trybu Sędziego

| Aspekt | Specyfikacja |
|---|---|
| Urządzenie | tablet ≥ 10″ (szerokość ≥ 1024 dp w poziomie); na mniejszych tryb niedostępny (NFR-702) |
| Orientacja | pozioma, blokowana tam, gdzie system na to pozwala (MVP); pionowa – v1.1 (G-30), obowiązkowo przed sierpniem 2027. **Uzupełnienie TL-23 ([ADR-013](../01-architecture/adr/ADR-013-orientacja-i-rozmiar-okna-tabletu.md)):** Android 16+ (target API 36) ignoruje blokadę orientacji na ekranach ≥ 600 dp, a iPadOS 26+ pozwala zmieniać rozmiar okna. Gdy okno ma szerokość < 1024 dp lub jest w pionie, panel sędziego pokazuje pełnoekranową nakładkę (tło `bg`, ikona `device-rotate` accent 28 dp, „Obróć tablet do pozycji poziomej.” 17 dp/500, „Panel sędziego działa tylko w poziomie.” 13 dp neutral-400) – stan formularza i szkic są zachowane, zapis i synchronizacja działają dalej w tle |
| Źródło danych | wyłącznie lokalna SQLite – żaden ekran nie czeka na sieć ([ADR-004](../01-architecture/adr/ADR-004-offline-first-tablet.md)) |
| Nagłówek (po zalogowaniu) | wysokość 60 dp, padding poziomy 20, dolna linia wygaszana na końcach (divider, 48 dp z każdej strony): ikona `gavel` w kwadracie 30 dp (obrys accent); kolumna: „Panel sędziego” (11,5 dp neutral-400) i nazwa turnieju (14 dp/500, wielokropek); **⟡ pigułka synchronizacji** (§ SCR-JDG-07); chip sędziego (tło surface, shadow-sm, radius 999, padding 4/12/4/4): awatar 28 dp z inicjałami (accent-900 / accent-200, 11 dp) + imię i nazwisko (13 dp); przycisk 36 dp `sign-out` (neutral-300) → wylogowanie (SCR-JDG-09, gdy kolejka niepusta) |
| Ekran nie gaśnie | `expo-keep-awake` aktywne w SCR-JDG-04/05 (sędzia patrzy na scenę, nie na tablet) **⟡** |
| Toast | jak u organizatora (u dołu, 2,2 s) |
| Prywatność | brak rankingu i ocen innych sędziów (FR-610) |
| Ponowne uwierzytelnienie | po 15 min w tle lub 2 h bezczynności → SCR-JDG-02 dla bieżącego sędziego (FR-511) |

---

## SCR-JDG-00 – Ekran startowy sędziego
- **FR:** FR-506. **US:** US-050.
- **Układ (środek, kolumna, odstęp 22):** animacja pixel-art 470×410 dp; logo 36 dp + „PoleChamp” (30 dp); podtytuł „Panel sędziego” (13,5 dp neutral-400); pasek 160×3 dp + komunikat (12 dp): „Łączenie z turniejem…” → „Pobieranie list startowych…” → „Gotowe”. Tło: poświata radialna accent-900 85%.
- **Logika:** odświeżenie tokenu urządzenia → `sync/changes` (albo migawka, jeśli kursor wygasł). Komunikaty odpowiadają etapom. Offline: po maks. 4,3 s przejście dalej z danymi lokalnymi (i pigułka „Offline” w nagłówku po zalogowaniu). Urządzenie niesparowane → SCR-JDG-06; unieważnione → SCR-JDG-10.

## SCR-JDG-01 – Panel sędziego: wybór profilu
- **FR:** FR-507. **US:** US-050.
- **Układ:** pełna wysokość, treść wyśrodkowana (maks. 640 dp, odstęp 28), tło z poświatą 700×420 (accent-900) u góry:
  1. Kwadrat 48 dp (radius 14, obrys accent, ikona `gavel` 24 dp accent).
  2. Tytuł „Panel sędziego” (28 dp, 500).
  3. Nazwa turnieju (14 dp neutral-400), np. „Mistrzostwa Polski Pole Sport 2026”.
  4. Kicker „WYBIERZ SWÓJ PROFIL” (wyśrodkowany).
  5. Siatka 3 kolumn (odstęp 12): karta profilu – padding 22/14, radius lg, surface, shadow-sm, kolumna wyśrodkowana (odstęp 10): awatar 64 dp (accent-900 / accent-200, inicjały 20 dp/500), imię i nazwisko (15 dp/500), „Sędzia” (12 dp neutral-400). Stan wciśnięcia: obrys 1 dp accent.
- **Dane:** aktywni sędziowie turnieju w kolejności `position` (demo: Katarzyna Nowak, Michał Woźniak, Aleksandra Kot, Tomasz Zając, Joanna Wrona). Przy > 6 sędziach siatka się przewija.
- **⟡ Stany:** sędzia z zablokowanym PIN-em – awatar z ikoną `lock-simple` i podpis „PIN zablokowany” (accent-300); brak sędziów – „Organizator nie dodał jeszcze sędziów.”.
- **⟡ Turniej zakończony (uzupełnienie TL-47 – ponowne użycie tabletu na kolejnych zawodach):** zamiast siatki profili tekst „Turniej „{nazwa}” został zakończony.” (15 dp) i primary „Sparuj z nowym turniejem” → potwierdzenie „Dane tego turnieju zostaną usunięte z tabletu.” → wyczyszczenie danych lokalnych → SCR-JDG-06. Przy niepustej kolejce wysyłki przycisk jest nieaktywny z podpisem „Najpierw wyślij {n} {ocenę|oceny|ocen} – połącz tablet z internetem.”. Widoczność kategorii: kategorie `W przygotowaniu` widzi każdy aktywny sędzia (przygaszone), a kategorie `Trwa`/`Zakończona` – sędziowie z panelu kategorii.
- **⟡ Zdalne wylogowanie (decyzja 6.11.2026):** po resecie PIN-u, zalogowaniu na innym urządzeniu lub dezaktywacji pod nazwą turnieju baner „{imię i nazwisko}: {powód}” (np. „PIN został zmieniony. Zaloguj się ponownie.”) – do następnego logowania na tym tablecie (toast znika po kilku sekundach).
- **Akcja:** tap karty → SCR-JDG-02 dla tego sędziego.

## SCR-JDG-02 – Panel sędziego: PIN
- **FR:** FR-508…510. **US:** US-051…053.
- **Układ (pod blokiem tytułowym SCR-JDG-01, kolumna wyśrodkowana, odstęp 18):**
  1. Wiersz: awatar 44 dp + kolumna: imię i nazwisko (15 dp/500), „Wpisz 4-cyfrowy PIN” (12,5 dp neutral-400).
  2. Cztery kropki 14 dp (odstęp 16): wpisana – wypełnienie accent; pusta – obrys 1,5 dp neutral-600.
  3. Linia komunikatu (wys. 18 dp, 13 dp, accent-300): przy błędzie ikona `warning-circle` + „Nieprawidłowy PIN — spróbuj ponownie”.
  4. Klawiatura 3×4 (kolumny 76 dp, odstępy 14/22): klawisze 1–9, [pusty – niewidoczny], 0, backspace. Klawisz: koło 76 dp, surface, shadow-sm, cyfra 26 dp/500; backspace bez tła, ikona `backspace`. Wciśnięcie: rozjaśnienie (brightness 1,5) i lekka wibracja **⟡**.
  5. Ghost „‹ Zmień sędziego” (14 dp) → SCR-JDG-01.
  6. Podpowiedź demo (12 dp neutral-500) „Demo · PIN-y: …” – **tylko w buildzie demo** (G-17).
- **Logika:** maks. 4 cyfry; po 4. cyfrze weryfikacja po 160 ms (online: serwer; offline: weryfikator lokalny – [05-bezpieczenstwo.md §3](../01-architecture/05-bezpieczenstwo.md#3-model-pin-sędziego)). Sukces → SCR-JDG-03. Błąd → komunikat, kropki czyszczone, **⟡** animacja potrząśnięcia kropek 300 ms. Wpisanie cyfry lub backspace czyści komunikat błędu.
- **⟡ Stany dodatkowe (SCR-JDG-08):**
  | Stan | Prezentacja |
  |---|---|
  | Blokada czasowa (5 błędów) | klawiatura nieaktywna (opacity 0,45), komunikat „Zbyt wiele prób. Spróbuj za {s} s.” z odliczaniem |
  | Blokada do resetu (10 błędów, serwer) | ikona `lock-simple` w miejscu kropek, „PIN zablokowany. Poproś organizatora o reset.”, klawiatura ukryta, widoczny „‹ Zmień sędziego” |
  | Offline, migawka starsza niż 24 h | „Połącz tablet z internetem, aby się zalogować.” |
  | Weryfikacja online w toku > 500 ms | kropki pulsują, klawiatura nieaktywna |
  | Ponowne uwierzytelnienie (powrót z tła) | bez „Zmień sędziego”, za to ghost „Wyloguj” |

## SCR-JDG-03 – Kategorie („Dzień dobry, …”)
- **FR:** FR-601, FR-803. **US:** US-055.
- **Układ:** nagłówek wspólny; treść przewijana (padding 28/28/40): tytuł „Dzień dobry, {imię}” (28 dp, 500); podtytuł „Wybierz kategorię, aby rozpocząć ocenianie.” (14 dp neutral-400, margines dolny 24); siatka 3 kolumn (odstęp 14) kart kategorii: padding 18, radius lg, surface, shadow-sm, odstęp 14:
  - wiersz: pigułka statusu + po prawej ikona `lock-simple` (16 dp, neutral-400) dla zablokowanych,
  - nazwa (18 dp/500, interlinia 1,25) i „{styl} · {poziom}” (12,5 dp neutral-400),
  - pasek 4 dp (postęp **własny** sędziego) + „{x}/{y} ocenione” albo „jeszcze nie rozpoczęto”.
  - Kategoria W przygotowaniu: cała karta opacity 0,55.
- **Kolejność:** jak u organizatora (`position`). Widoczne tylko kategorie z panelem zawierającym sędziego (MVP: wszystkie).
- **Akcje:** tap kategorii Trwa / Zakończona → SCR-JDG-04; tap kategorii W przygotowaniu → toast „Ta kategoria jeszcze się nie rozpoczęła” (bez nawigacji).
- **Stan pusty:** „Organizator nie dodał jeszcze kategorii do tego turnieju.” (14 dp neutral-400, wyśrodkowany, padding 48).
- **Realtime:** zmiany statusów i list stosowane po synchronizacji bez przeładowania ekranu.

## SCR-JDG-04 – Kategoria: kolejka (panel prawy pusty)
- **FR:** FR-602, FR-609, FR-805. **US:** US-056, US-061, US-083.
- **Układ – panel boczny (300 dp, tło surface 45% nad bg, prawa krawędź 1 dp divider):**
  1. Blok górny (padding 14/16, odstęp 8): link „‹ Kategorie” (`caret-left` 16 dp + 13,5 dp accent) → SCR-JDG-03; nazwa kategorii (18 dp/500); pasek 4 dp + „{x}/{y} ocenione”; baner blokady (tylko gdy zablokowana): tło accent-900, tekst accent-200, ikona `lock-simple` 15 dp, 12 dp, radius md, padding 8/10 – „Kategoria zakończona — tylko podgląd”.
  2. **⟡** Baner odrzuceń (gdy dotyczy): jak wyżej, ikona `warning-circle`, „{n} {ocena|oceny|ocen} nie {została|zostały|zostało} {przyjęta|przyjęte|przyjętych} – kategoria zablokowana” → SCR-JDG-07.
  3. Kolejka (przewijana, padding 0/10/16, odstęp 4): wiersz min. 60 dp, padding 10, radius 12, odstęp 12: odznaka 38 dp (radius 11; oceniona: accent-900 / accent-200; nieoceniona: neutral-900 / neutral-200) z numerem (14 dp/500 tabelarycznie); kolumna: nazwisko (14,5 dp, wielokropek), klub (12 dp neutral-400, wielokropek); ikona stanu 18 dp:
     | Stan | Ikona | Kolor |
     |---|---|---|
     | nieoceniona | `circle` | neutral-600 |
     | oceniona, zsynchronizowana | `check-circle` (fill) | accent |
     | oceniona, w kolejce **⟡** | `clock` | accent-300 |
     | odrzucona **⟡** | `warning-circle` | accent-300 |
     Aktywny wiersz: tło accent 14% nad bg, obrys 1 dp accent-700.
  - Wycofane zawodniczki nie są pokazywane **⟡** (FR-404).
- **Panel prawy (bez wybranej zawodniczki):** wyśrodkowane koło 56 dp (surface, shadow-sm, ikona `hand-pointing` accent 24 dp) i tekst „Wybierz zawodniczkę z listy, aby ją ocenić.” (14 dp neutral-400).
- **Akcje:** tap wiersza → SCR-JDG-05 dla tej zawodniczki (także w kategorii zablokowanej – podgląd).

## SCR-JDG-05 – Formularz oceny
- **FR:** FR-603…611. **US:** US-057…063.
- **Układ panelu prawego:** obszar przewijany (padding 22/26/24) + stopka stała.
  1. **Nagłówek zawodniczki** (odstęp 16, margines dolny 22): odznaka 56 dp (radius 16, accent-900 / accent-200, numer 20 dp/500); kolumna z `min-width: 0`: nazwisko (24 dp, 500, **jedna linia, wielokropek** – UI-05/UI-15), klub (13 dp neutral-400, linia poniżej); po prawej, gdy istnieje ocena tego sędziego: pigułka „Oceniono” (ikona `check-circle` fill, tło accent-900, tekst accent-300, 12 dp).
  2. **Sekcja „KRYTERIA”** (kicker, margines 10): siatka auto-fill kolumn min. 320 dp (odstęp 12 – przy panelu ≈ 800 dp dwie kolumny). Karta kryterium (padding 16, radius lg, surface, shadow-sm, odstęp 16):
     - wiersz górny: kolumna z nazwą (15 dp/500, wielokropek) + odznaka wagi „×{waga}” (padding 1/6, radius 5, 11 dp, accent-900 / accent-300) i opisem (12 dp neutral-400, maks. 2 linie, wielokropek **⟡**); po prawej wartość „{v}” (30 dp/500, accent-200, tabelarycznie, format „8,5”) + „ /{skala}” (13 dp, neutral-500) – **bez zawijania** (UI-05);
     - wiersz dolny (odstęp 12): przycisk „−” 44 dp (koło, tło bg, obrys divider, ikona `minus` 18 dp), suwak (flex; tor 8 dp radius 4: wypełnienie accent do {v/skala}, reszta neutral-800; kciuk 28 dp: tło accent-100, obrys 7 dp accent, cień), przycisk „+” 44 dp.
  3. **Sekcja „KARY”** (odstęp 20): siatka jak wyżej; karta kary (padding 12/12/12/16, radius lg, odstęp 12): nazwa (15 dp/500), „−{pkt} pkt za każde · maks. {n}×” (12 dp neutral-400); przycisk „−” 40 dp (strefa dotyku 44 – G-27); licznik (szer. 26, 22 dp/500, tabelarycznie); przycisk „+” 40 dp (opacity 0,35 i nieaktywny przy maksimum). Gdy licznik > 0: tło accent 10% nad surface i obrys 1 dp accent-700; inaczej surface + shadow-sm. **⟡** „−” nieaktywny przy 0.
  4. **Pole „Komentarz (opcjonalnie)”**: textarea (min. 76 dp, 14 dp), placeholder „Krótka notatka do występu…”, **⟡** licznik „{n}/500” pokazywany od 400 znaków.
  5. **Stopka stała** (ukryta w kategorii zablokowanej; padding 14/26, tło surface 45% nad bg, górna linia wygaszana): kolumna „Twój wynik” (11,5 dp neutral-400) i wartość (30 dp/500, tabelarycznie, 2 miejsca po przecinku – decyzja 6.11.2026) + „/ {max}” (13 dp neutral-500); chip „kary −{suma}” (radius 999, neutral-900 / neutral-200, 12 dp) – tylko gdy kary > 0; odstęp elastyczny; przycisk primary 52 dp (padding 0/26, 16 dp, tło accent 10%): etykieta + ikona `arrow-right`.
- **Etykieta przycisku:** „Zaktualizuj ocenę” – istnieje ocena tego sędziego; „Zatwierdź i dalej” – są inne nieocenione i auto-przejście włączone; „Zatwierdź ocenę” – w pozostałych przypadkach.
- **Wartości początkowe:** istniejąca ocena → zapisane wartości; szkic (`local_draft`) → wartości szkicu **⟡**; nowa ocena → połowa skali zaokrąglona do 0,5 (5,0 przy skali 10), kary 0, komentarz pusty.
- **Interakcje:**
  | Kontrolka | Zachowanie |
  |---|---|
  | „−” / „+” kryterium | ±0,5, przycięcie do [0; skala], zaokrąglenie do 0,5. Przytrzymanie: powtarzanie co 150 ms **⟡** |
  | Suwak | krok 0,5; przeciąganie aktualizuje wartość i „Twój wynik” na żywo (≤ 50 ms, NFR-104) |
  | „−” / „+” kary | ±1, przycięcie do [0; maks.] |
  | Komentarz | maks. 500 znaków |
  | Zatwierdź | transakcja lokalna → toast „Zapisano ocenę: {imię i nazwisko}” → auto-przejście: następna **nieoceniona** zawodniczka w kolejności listy (z wyłączeniem bieżącej); brak → panel pusty (SCR-JDG-04). Formularz przewija się na górę. Wysyłka w tle. **„Nieoceniona” (doprecyzowanie TL-46):** start aktywny bez lokalnego arkusza tego sędziego w jakimkolwiek stanie (`PENDING`, `SYNCED`, `REJECTED` liczą się jako ocenione); szkic (`local_draft`) nie jest oceną. Przeszukiwanie zaczyna się od początku listy |
- **Tryb tylko do odczytu (kategoria zablokowana):** sekcje kryteriów, kar i komentarza z opacity 0,55 i bez interakcji; brak stopki; baner w panelu bocznym. **⟡ Decyzja:** dla zawodniczki **bez** oceny tego sędziego zamiast formularza z wartościami domyślnymi pokazujemy w panelu prawym komunikat „Brak Twojej oceny dla tej zawodniczki.” (ikona `circle-dashed`) – żeby wartości domyślne nie wyglądały na wystawioną notę.
- **⟡ Stany dodatkowe:** ocena odrzucona – pod nagłówkiem baner (accent-900): „Ta ocena nie została przyjęta: {powód}.”; zmiana listy w trakcie edycji – baner „Lista startowa została zaktualizowana”; otwarta zawodniczka wycofana – baner „Zawodniczka wycofana przez organizatora – tej oceny nie można zatwierdzić.”, formularz przygaszony bez stopki, po przywróceniu znowu edycja (decyzja 6.11.2026); `STALE_REVISION` – baner „Ocena zmieniona na innym urządzeniu.” + ghost „Pokaż aktualną”.
- **Dostępność:** suwak z rolą `adjustable` i etykietą „{kryterium}, {v} z {skala}”; akcje zwiększ/zmniejsz o 0,5; licznik kary jako `adjustable` „{kara}, {n} z {maks.}”.

- **Decyzja PO 28.10.2026 (IMP-712, UX-14):** w nowej ocenie (bez szkicu i zapisanej oceny) wartość domyślna kryterium jest przygaszona (neutral-500) z podpisem „nieruszone” zamiast „/ {skala}” do pierwszej zmiany (także „−”/„+” wracające do tej samej wartości). Zatwierdzenie z nieruszonymi kryteriami pokazuje dialog „Zatwierdzić z nieruszonymi kryteriami?” z ich listą („Wróć do oceny” / „Zatwierdź”). Szkic w kolejce SCR-JDG-04 – podpis „szkic” przy nieocenionej zawodniczce. Po ocenieniu całej kolejki panel „Wszystkie zawodniczki ocenione.”; w zakończonym turnieju baner „Turniej zakończony – tylko podgląd”. Teksty do akceptacji IMP-650.
- **EP-17 (30.10.2026):** gdy są nieruszone kryteria, pod „Twój wynik” stoi „zawiera wartości domyślne” (P14 bez zmian); „nieruszone” pod notą, „/{max}” zawsze; szkic pod nazwiskiem w kolejce; wejście do kategorii otwiera pierwszą nieocenioną; Wstecz Androida wraca do kategorii; pasek: „Zsynchronizowano”, „Brak sieci”.

## SCR-JDG-06 – Parowanie tabletu ⟡ POZA DESIGNEM – PROPOZYCJA
- **FR:** FR-504. **US:** US-043.
- **Układ (styl SCR-JDG-01):** kwadrat 48 dp z ikoną `qr-code`; tytuł „Sparuj tablet z turniejem” (28 dp); tekst „Poproś organizatora o kod parowania (Sędziowie i urządzenia → Sparuj tablet).” (14 dp neutral-400); dwie kolumny:
  - lewa: podgląd kamery 320×320 dp (radius lg, narożniki ramki w accent), podpis „Zeskanuj kod QR”;
  - prawa: pole „Kod parowania” (maska „XXXX-XXXX”, wielkie litery, 20 dp tabelarycznie), pole „Nazwa tabletu (opcjonalnie)” (placeholder „np. Tablet stół 1”), primary 48 dp „Połącz”.
- **Stany:** łączenie – „Łączenie z turniejem…” (spinner) → pobieranie migawki („Pobieranie list startowych…”) → SCR-JDG-01; błąd kodu – „Kod jest nieprawidłowy lub wygasł.” (accent-300); brak zgody na kamerę – lewa kolumna z tekstem „Brak dostępu do kamery. Wpisz kod ręcznie.” i ghost „Otwórz ustawienia”; brak sieci – „Parowanie wymaga połączenia z internetem.”.

## SCR-JDG-07 – Stan synchronizacji ⟡ POZA DESIGNEM – PROPOZYCJA
- **FR:** FR-803, FR-805. **US:** US-081, US-083.
- **Pigułka w nagłówku** (po lewej od chipu sędziego): stany i kolory jak w [06-offline-i-synchronizacja.md §8.1](../01-architecture/06-offline-i-synchronizacja.md#81-tablet--pigułka-w-nagłówku-poza-designem-propozycja-w-stylu-nocturne): „Zsynchronizowano”, „Wysyłanie… ({n})”, „Brak sieci · {n} w kolejce”, „Offline”, „Wymaga uwagi”.
- **Popover** (po tapnięciu; karta surface, radius lg, shadow-md, szer. 360 dp, padding 16): tytuł „Synchronizacja” (17 dp/500); wiersze (13 dp): „Ostatnia synchronizacja: {czas względny}”, „Oceny w kolejce: {n}”, „Połączenie: online / offline”; lista odrzuconych ocen („#{nr} {nazwisko} – {powód}”); secondary „Synchronizuj teraz” (`arrows-clockwise`); tekst pomocniczy (12 dp neutral-400): offline „Oceny są bezpieczne na tym tablecie. Wyślemy je automatycznie po odzyskaniu połączenia.”, online z ocenami w kolejce „Oceny są bezpieczne na tym tablecie. Wysyłamy je teraz.”, online bez kolejki – brak (decyzja 6.11.2026).

## SCR-JDG-08 – Blokada PIN ⟡ POZA DESIGNEM – PROPOZYCJA
Stan ekranu SCR-JDG-02 – opisany w tabeli „Stany dodatkowe” powyżej. **FR:** FR-509. **US:** US-052.

## SCR-JDG-09 – Wylogować się? ⟡ POZA DESIGNEM – PROPOZYCJA
- **FR:** FR-808. **US:** US-085.
- Dialog wyśrodkowany (wzorzec `.dialog` Nocturne: szer. ≤ 440 dp, surface, radius lg, shadow-lg; tło neutral-900 50%): tytuł „Wylogować się?” (20 dp/500); treść „Masz {n} {niewysłaną ocenę|niewysłane oceny|niewysłanych ocen}. Zostaną wysłane automatycznie, gdy tablet połączy się z siecią.” (14 dp, tekst 85%); akcje wyrównane do prawej: secondary „Anuluj”, primary „Wyloguj”. Pokazywany tylko przy niepustej kolejce (inaczej wylogowanie natychmiastowe, jak w designie).

## SCR-JDG-10 – Urządzenie odłączone ⟡ POZA DESIGNEM – PROPOZYCJA
- **FR:** FR-808. Pełny ekran w stylu SCR-JDG-01: ikona `link-break`, tytuł „To urządzenie zostało odłączone od turnieju”, tekst z liczbą niewysłanych ocen (jeśli > 0), secondary „Eksportuj niewysłane oceny” (Should), primary „Sparuj ponownie” → SCR-JDG-06, ghost „Wyczyść dane” (z potwierdzeniem).

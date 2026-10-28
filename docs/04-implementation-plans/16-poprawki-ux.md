# EP-16 – Poprawki UX po teście na emulatorach

> Dokument: `04-implementation-plans/16-poprawki-ux.md` · 28.10.2026 · Konwencje i DoD: [00-konwencje-i-definition-of-done.md](00-konwencje-i-definition-of-done.md) · Indeks: [91-indeks-zadan.md](91-indeks-zadan.md) · Źródło: [raport UX 28.10.2026](../../docs-dev/qa/ux-review-2026-10-28.md) (ustalenia #1…#37)

Poprawki ustaleń z testu UX (organizator na telefonie, sędzia na tablecie). Kolejność zadań = priorytet: najpierw integralność ocen (IMP-700…703), potem stan danych u organizatora i ryzykowne akcje, na końcu spójność tekstów i wzorców. Zmiany ekranów „poza designem” i nowe teksty wymagają akceptacji projektanta/PO ([IMP-650](15-design-i-akceptacje.md)) – zadania z decyzją PO mają to w krokach. Testy dopisujemy z ID ustalenia w nazwie (`UX-01`…`UX-37`) obok istniejących TC.

## Podsumowanie

| Zadań | Suma | Rola (h) |
|---|---|---|
| 19 | 133 h | BE 6 · MOB 80 · FULL 41 · QA 6 |

Kolejność realizacji: IMP-700 → IMP-715 → IMP-701 → IMP-702 → IMP-703 → IMP-717 → IMP-716 → pozostałe; IMP-714 (regresja) na końcu.

## Zadania

### IMP-700 – Krok oceny w synchronizacji ocen (sync/push)
- **Epik / obszar:** EP-16 Poprawki UX | **Rola:** BE
- **Cel:** Ocena z notą zgodną z krokiem kryterium (0,1 / 0,5 / 1) jest przyjmowana przez `sync/push` tak samo jak wartości z kroku 0,5.
- **Zakres:** `apps/api/src/modules/sync` (`sheet-writer`, `sheets`, handler `submit-score-sheet`) – przekazanie `stepTenths` z `criterion.step` do konfiguracji kategorii używanej przez `validateSheet`; migawka i `sync/changes` z krokiem (kontrakt już ma `CriterionStep`); **Poza zakresem:** zmiany UI.
- **Zależności:** –
- **Odwołania:** ustalenie #1; FR-305, FR-603; [07-reguly-punktacji](../02-specification/07-reguly-punktacji.md)
- **Kroki:**
  1. Odtwórz w teście integracyjnym (`push.ts`: `runningCategory` z kryterium o kroku 0,1, nota 7,7) – obecnie mutacja nie trafia do `processed_mutation`.
  2. Wspólna funkcja mapująca wiersze kryteriów na `CriterionConfig` (z `stepTenths`) używana w `results.service.ts` i `sheet-writer.ts`.
  3. Nota niezgodna z krokiem → zapisane `REJECTED` / `SCHEMA_MISMATCH` (nie wyjątek przerywający paczkę); test, że wyjątek w jednej mutacji nie zostawia paczki bez odpowiedzi.
  4. Testy: `UX-01` (krok 0,1 przyjęty, krok 0,5 z wartością 7,7 odrzucony z kodem), regresja istniejących TC-SYNC.
- **Definition of Done:**
  - [ ] Ocena 7,7 przy kroku 0,1 trafia do wyników organizatora bez odblokowywania kategorii
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** wysokie

### IMP-701 – Widoczny los każdej oceny na tablecie (outbox i popover synchronizacji)
- **Epik / obszar:** EP-16 Poprawki UX | **Rola:** MOB
- **Cel:** Sędzia zawsze wie, czy ocena została wysłana, czeka czy wymaga działania – „Wysyłanie…” nie trwa w nieskończoność.
- **Zakres:** `SyncEngine`/`push` (mutacja bez rozstrzygnięcia po N próbach lub odpowiedzi 4xx → stan „wymaga uwagi” z powodem), `syncStore`, `SyncPopover` (czas ostatniej **udanej wysyłki** osobno od pobrania, lista problemów „#{nr} {nazwisko} – {powód}”, zamykanie przyciskiem Wstecz), lista w kolejce (licznik „ocenione” bez ocen odrzuconych); **Poza zakresem:** zmiany API.
- **Zależności:** IMP-700
- **Odwołania:** ustalenia #1, #15, #35 (licznik); SCR-JDG-07; FR-803, FR-805
- **Kroki:**
  1. Rozróżnij w `sync_meta` ostatnie pobranie i ostatnią przyjętą wysyłkę; popover pokazuje obie wartości.
  2. Mutacja z błędem 4xx (poza 401/409/413/429) albo bez odpowiedzi po progu prób → `NEEDS_ATTENTION` z kodem; nie blokuje kolejnych mutacji (FIFO per arkusz, nie per kolejka).
  3. Popover: sekcja „Wymaga uwagi” z wierszami i akcją przejścia do formularza; `BackHandler` zamyka popover.
  4. Licznik kategorii „{x}/{y} ocenione” nie wlicza `REJECTED`; ikona wiersza dla odrzuconej różna od wysłanej.
  5. Testy: `UX-01` (zablokowana mutacja nie wstrzymuje kolejki), `UX-15` (teksty popovera, Wstecz) na `fakeSyncServer`.
- **Definition of Done:**
  - [ ] Po wymuszonym błędzie serwera sędzia widzi powód w popoverze w ≤ 1 cyklu synchronizacji
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 8 h (M) | **Ryzyko:** wysokie

### IMP-702 – Ochrona przed podwójnym zatwierdzeniem oceny
- **Epik / obszar:** EP-16 Poprawki UX | **Rola:** MOB
- **Cel:** Szybkie dwa tapnięcia „Zatwierdź” zapisują jedną ocenę i nie tworzą fałszywego odrzucenia.
- **Zakres:** `submitScore.ts`, `ScoreFooter` (blokada przycisku od pierwszego tapnięcia do końca transakcji lokalnej), `outbox` (zastąpienie mutacji o identycznej treści zamiast dopisania); **Poza zakresem:** –
- **Zależności:** –
- **Odwołania:** ustalenie #2; FR-606; TC-EDGE (podwójne kliknięcia)
- **Kroki:**
  1. Flaga `submitting` w `formStore`; przycisk `disabled` i ignorowanie kolejnych `onPress`.
  2. W `outbox`: gdy ostatnia mutacja arkusza ma ten sam skrót treści – brak nowej mutacji.
  3. Testy: `UX-02` (dwa `fireEvent.press` → 1 mutacja, licznik kolejki 1).
- **Definition of Done:**
  - [ ] Na emulatorze podwójne tapnięcie daje „1 w kolejce” i brak „Wymaga uwagi”
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 4 h (S) | **Ryzyko:** średnie

### IMP-703 – Spójny stan danych organizatora po zapisach
- **Epik / obszar:** EP-16 Poprawki UX | **Rola:** MOB
- **Cel:** Po każdej akcji organizatora wszystkie ekrany pokazują stan serwera; przekroczenie czasu nie wygląda jak utrata sieci ani jak nieudana akcja.
- **Zakres:** `data/org/*` (unieważnianie zapytań turnieju, kategorii, list startowych, sędziów i odrzuconych po mutacjach), `data/network/online.ts` (TIMEOUT mutacji nie przełącza w offline bez potwierdzenia sondą), pull-to-refresh szczegółów kategorii, `RejectedSheet` (lista zablokowanych kategorii z aktualnych danych, odświeżenie przy otwarciu); **Poza zakresem:** wydajność API.
- **Zależności:** –
- **Odwołania:** ustalenia #3, #4, #10; SCR-ORG-03, SCR-ORG-06…08, SCR-ORG-22; TL-45; FR-807
- **Kroki:**
  1. Zmierz czasy mutacji na emulatorze z pojedynczym AVD (bez tabletu) i z dwoma; opisz w PR, czy opóźnienie 8–15 s jest środowiskowe (API z hosta: ~10 ms).
  2. Po `TIMEOUT` mutacji: refetch zasobu; gdy stan po stronie serwera = oczekiwany → toast sukcesu, inaczej toast „Nie udało się zapisać…”; baner offline tylko po nieudanej sondzie.
  3. Mapa unieważnień: dodanie/wycofanie zawodniczki → turniej + kategoria; start/blokada/odblokowanie → turniej + kategoria + odrzucone; pull-to-refresh odświeża wszystkie zapytania ekranu.
  4. `RejectedSheet`: „Przyjmij” aktywny wg świeżego statusu kategorii; przy nieaktywnym – podpis z powodem.
  5. Testy: `UX-03` (przyjęcie po odblokowaniu), `UX-04` (timeout + serwer zapisał → brak banera offline), `UX-10` (licznik zawodniczek po dodaniu).
- **Definition of Done:**
  - [ ] Scenariusz z raportu (blokada → odblokowanie → przyjęcie odrzuconej) przechodzi bez wychodzenia z ekranu
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 10 h (L) | **Ryzyko:** wysokie

### IMP-704 – Ekran „Zawodniczki” turnieju i nawigacja wstecz
- **Epik / obszar:** EP-16 Poprawki UX | **Rola:** MOB
- **Cel:** Tapnięcie zawodniczki otwiera jej dane w miejscu; przycisk wstecz zawsze prowadzi tam, gdzie mówi etykieta.
- **Zakres:** `TournamentAthletesScreen` (wiersz → arkusz SCR-ORG-17 z akcjami wycofania/przywrócenia, także dla wycofanych; nagłówek sekcji kategorii jako link do kategorii; „Dodaj” w sekcji, gdy kategoria pozwala; wyszukiwarka po nazwisku, klubie i numerze oraz liczba łączna w nagłówku), wspólny komponent wiersza zawodniczki z zakładką kategorii (odznaka numeru, wycofana wyszarzona), etykieta wstecz w szczegółach kategorii; **Poza zakresem:** –
- **Zależności:** –
- **Odwołania:** ustalenia #11, #28, #37, #43; SCR-ORG-07, SCR-ORG-17
- **Kroki:**
  1. Wyodrębnij `EntryRow` z zakładki „Zawodniczki” i użyj w obu ekranach.
  2. Wiersz otwiera `EntryFormSheet` w trybie edycji; po zapisie lista się odświeża (IMP-703).
  3. Wejście do kategorii: link w nagłówku sekcji; w kategorii etykieta wstecz z poprzedniego ekranu (`router.canGoBack` + nazwa) albo nawigacja zawsze do turnieju (decyzja PO).
  4. Wyszukiwarka filtrująca lokalnie (dane turnieju są już wczytane), sekcje bez wyników ukryte.
  5. Testy: `UX-37` (tap wiersza → arkusz edycji z danymi), `UX-11` (wstecz z kategorii trafia do ekranu z etykiety), `UX-43` (wyszukiwanie po numerze i nazwisku).
- **Definition of Done:**
  - [ ] Edycja zawodniczki z ekranu „Zawodniczki” w 1 tapnięciu; wycofaną można przywrócić; zawodniczkę z 61 da się znaleźć bez przewijania
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 8 h (M) | **Ryzyko:** niskie

### IMP-705 – Ryzykowne akcje: tryb urządzenia, PIN, start turnieju, dezaktywacja, usunięcie konta
- **Epik / obszar:** EP-16 Poprawki UX | **Rola:** FULL
- **Cel:** Żadna nieodwracalna lub kosztowna akcja nie wykona się przypadkiem, a pomyłkę przy wyborze trybu da się cofnąć.
- **Zakres:** (a) „Zmień tryb urządzenia” na ekranie logowania organizatora i parowania tabletu (potwierdzenie; na tablecie z danymi – tylko bez niewysłanych ocen), podpis na SCR-SYS-01; (b) arkusz PIN sędziego zamykany tylko „Gotowe” lub po potwierdzeniu „Zapisałeś PIN?”; (c) „Rozpocznij turniej” – decyzja PO: usunąć (start z pierwszą kategorią, FR-308) albo warunki ≥ 1 kategoria i potwierdzenie z datą; (d) dezaktywacja sędziego z potwierdzeniem i toastem „Dezaktywowano sędziego” / „Aktywowano sędziego”; (e) „Usuń konto” przy turnieju „Trwa” – komunikat „Najpierw zakończ trwający turniej.” (API: kod błędu, jeśli brak), akceptacja „USUN” bez znaków diakrytycznych; **Poza zakresem:** –
- **Zależności:** IMP-650 (teksty), decyzja PO dla (c)
- **Odwołania:** ustalenia #5, #6, #7, #16, #17; SCR-SYS-01, SCR-ORG-03, SCR-ORG-15, SCR-ORG-21; FR-206, FR-308, FR-106
- **Kroki:**
  1. Zapisz decyzję PO dla (c) w PR i w `05-ekrany-organizatora.md`.
  2. Zaimplementuj (a)–(e); nowe teksty w `org`/`ui`/`judge` z oznaczeniem do akceptacji.
  3. Testy: `UX-05`, `UX-06`, `UX-07`, `UX-16`, `UX-17` (RNTL na `renderRouter`; test API dla usunięcia konta przy turnieju „Trwa”).
- **Definition of Done:**
  - [ ] Każda akcja z listy ma potwierdzenie albo blokadę z powodem
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 10 h (L) | **Ryzyko:** średnie

### IMP-706 – Teksty: zmienne, odmiana, liczba mnoga, toasty
- **Epik / obszar:** EP-16 Poprawki UX | **Rola:** MOB
- **Cel:** Żaden tekst nie zawiera surowej zmiennej, błędnej odmiany ani uciętego zdania.
- **Zakres:** `Numer {nr} jest już zajęty.` (podstawienie i błąd pod całym wierszem), konstrukcje bez odmiany imion („Wycofać zawodniczkę: {imię}?”, „PIN – {imię}”, „Ocena sędziego: {imię} → #{nr}”), pluralizacja „Brakuje {n} {oceny|ocen}” (blokada kategorii, zakończenie turnieju), zdania „(0)” ukrywane, toast wieloliniowy, pigułka „Zweryfikowany” na Koncie, „To pole jest wymagane.” przed „Nieprawidłowy format.”, placeholder „np. Poznań, Arena”, „Data” w trybie jednego dnia, etykiety „Od”/„Do”, komunikaty długości per pole („Hasło musi mieć min. 10 znaków.” zamiast „Za krótki tekst (min. 10 znaki).”), jedna etykieta „Zmień sędziego” na ekranie PIN i nakładce ponownego PIN-u; test i18n wykrywający `{…}` w wyrenderowanym tekście; **Poza zakresem:** nowe treści prawne.
- **Zależności:** IMP-650 (akceptacja tekstów)
- **Odwołania:** ustalenia #8, #18, #19, #20, #21, #22, #45 (teksty), #46; NFR-210
- **Kroki:**
  1. Przejrzyj `packages/i18n/src/locales/pl/*` pod kątem `{imię}` po czasownikach i przyimkach; zamień na konstrukcje z dwukropkiem/myślnikiem.
  2. Dodaj klucze liczby mnogiej (`_one/_few/_many`) dla „ocen”.
  3. `Toast` – `numberOfLines` ≥ 3, szerokość ekranu − marginesy.
  4. Test (Jest) renderujący ekrany z błędami i sprawdzający brak `{` w tekstach; `UX-08`, `UX-20`.
  5. `pnpm --filter @polechamp/i18n build`.
- **Definition of Done:**
  - [ ] Zrzuty z raportu (058-dup, 063, 068, 094, 123, 153, t040) wyglądają poprawnie
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 7 h (M) | **Ryzyko:** niskie

### IMP-707 – Formularze organizatora: zgoda, pola liczbowe, klawiatura, wybór daty
- **Epik / obszar:** EP-16 Poprawki UX | **Rola:** MOB
- **Cel:** Formularze turnieju, kategorii, kryterium, kary i zawodniczki zachowują się jednolicie i nie tracą danych przez pomyłkę.
- **Zakres:** arkusz „Edytuj zawodniczkę” wczytuje `birthYear` (dziś puste pole przy roku w bazie – zapis grozi utratą danych); przewijana zawartość arkuszy przy skali tekstu 130% (akcje pod przyciskiem zapisu muszą być osiągalne); `Checkbox` z klikalną etykietą (cały wiersz, 44 dp) i wspólnym stylem błędu; reset „Dodaj kolejną” (rok urodzenia, zgoda) bez rozjazdu widoku; jeden wzorzec pól liczbowych (stepper dla skali, wagi, punktów i maks. wystąpień); krok oceny zawsze w wierszu („Skala 0–10, co 0,5”); notka o domyślnych kryteriach przy nowej kategorii; `returnKeyType="next"`/`submitEditing`; `DateTimePicker` z `locale="pl-PL"` i motywem ciemnym; pytanie przy zamykaniu arkusza ze zmianami (dłuższe arkusze); „Zapisz zmiany” nieaktywny bez zmian; **Poza zakresem:** zmiana walidacji API.
- **Zależności:** –
- **Odwołania:** ustalenia #21, #23, #24, #25, #36, #39, #44; SCR-ORG-02, 05, 09, 10, 11, 17, 20; TC-L10N-002, TC-A11Y-007
- **Kroki:**
  0. `EntrySheet`: wartości domyślne formularza z `entry.birthYear`; test `UX-39` (otwarcie i zapis bez zmian nie zmienia roku ani zgody). `Sheet`: zawartość w `ScrollView` z limitem wysokości; test `UX-44` w `l10n-scaling.test.tsx`.
  1. `src/ui/form/Checkbox` – `Pressable` na wierszu, `accessibilityRole="checkbox"`.
  2. `NumberStepperField` dla wszystkich pól liczbowych z małym zakresem.
  3. `useDirtyGuard` dla arkuszy z formularzem (potwierdzenie „Odrzucić zmiany?”).
  4. Testy: `UX-23` (tap etykiety przełącza zgodę), `UX-21` (placeholder i etykiety dat), `UX-36` (Dalej przechodzi między polami).
- **Definition of Done:**
  - [ ] Zrzuty 014, 019, 039, 042, 051–055, 136–137 z raportu poprawione
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 10 h (L) | **Ryzyko:** niskie

### IMP-708 – Spójność wzorców UI organizatora
- **Epik / obszar:** EP-16 Poprawki UX | **Rola:** MOB
- **Cel:** Te same akcje i informacje wyglądają tak samo na każdym ekranie.
- **Zakres:** jeden wzorzec potwierdzeń (akcja niszcząca secondary, „Anuluj” ghost; ikony we wszystkich akcjach arkusza sędziego); jeden styl ghost „Usuń …”; jeden styl banera „Odrzucone oceny” (wersja informacyjna po zakończeniu turnieju, tekst bez „dotarły po zablokowaniu”); liczniki „aktywne” na kaflach i zakładkach (albo wszystkie) i klikalność wszystkich kafli; maska pod paskiem stanu przy przewijaniu; toast nad paskiem akcji; meta karty kategorii w jednej linii; noty zawsze z 1 miejscem po przecinku (SCR-ORG-19); nazewnictwo „Zakończona”/„Zakończ kategorię”, „Tablety” – wg tabeli nazewnictwa z raportu; **Poza zakresem:** zmiany tokenów.
- **Zależności:** IMP-650 (nazewnictwo), IMP-706
- **Odwołania:** ustalenia #26, #27, #29, #30, #31, #32; tabela „Niespójności w nazewnictwie”; [09-design-system](../02-specification/09-design-system.md)
- **Kroki:**
  1. Ujednolicenie `ConfirmContent` (warianty `destructive`/`neutral`) i przegląd wszystkich użyć.
  2. Słownik pojęć w `packages/i18n` + zamiana kluczy wg decyzji projektanta.
  3. Testy komponentów DevCatalog (zrzuty) i `UX-27` (liczniki kafli = zakładek).
- **Definition of Done:**
  - [ ] Tabela nazewnictwa z raportu zamknięta (każde pojęcie jednym wariantem)
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 8 h (M) | **Ryzyko:** niskie

### IMP-709 – Wycofana zawodniczka w rankingu, PDF i CSV
- **Epik / obszar:** EP-16 Poprawki UX | **Rola:** FULL
- **Cel:** Potwierdzenie wycofania mówi dokładnie to, co stanie się w wynikach.
- **Zakres:** decyzja PO: wycofana ukryta w rankingu i eksportach albo pokazana na końcu z „Wycofana”; dostosowanie `ResultsReadService`, PDF/CSV i tekstu potwierdzenia; w kategorii „W przygotowaniu” bez ocen zamiast „Wycofaj” tylko „Usuń z listy”; **Poza zakresem:** –
- **Zależności:** decyzja PO
- **Odwołania:** ustalenie #12; FR-403, FR-701; SCR-ORG-08, SCR-ORG-17
- **Kroki:**
  1. Zapisz decyzję w `05-ekrany-organizatora.md` (SCR-ORG-08/17).
  2. API: filtr lub flaga w wynikach i eksporcie; test integracyjny `UX-12`; regresja PDF (`test:pdf`).
  3. Mobile: tekst potwierdzenia i widoczność akcji wg stanu ocen.
- **Definition of Done:**
  - [ ] Ranking, PDF i CSV zgodne z tekstem potwierdzenia
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 4 h (S) | **Ryzyko:** średnie

### IMP-710 – Eksport PDF/CSV: podgląd i informacja zwrotna
- **Epik / obszar:** EP-16 Poprawki UX | **Rola:** MOB
- **Cel:** Organizatorka zawsze wie, czy plik powstał i gdzie go znaleźć.
- **Zakres:** szkielet podglądu do czasu wczytania wyników; brak komunikatu offline w trakcie generowania; po `READY` – arkusz udostępniania albo toast z błędem (także przy ponownym użyciu gotowego pliku); kolejne „Pobierz PDF” zawsze daje reakcję; przycisk „Pobierz CSV” w arkuszu turnieju i kategorii (dziś w aplikacji nie ma CSV wcale – API z IMP-174 gotowe); **Poza zakresem:** wygląd pliku PDF.
- **Zależności:** IMP-703
- **Odwołania:** ustalenia #13, #42; SCR-ORG-12; FR-705, FR-706; IMP-174
- **Kroki:**
  1. Odtwórz na emulatorze i urządzeniu (czy `expo-sharing` otwiera arkusz); zaloguj błąd `runExport`.
  2. Popraw ścieżkę ponownego użycia (`DONE` bez nowego zadania).
  3. `runExport` z `format: 'CSV'` i przycisk secondary w stopce arkusza.
  4. Testy: `UX-13` (drugi eksport → arkusz udostępniania/toast), `UX-42` (CSV) na wstrzykiwanych zależnościach `runExport`.
- **Definition of Done:**
  - [ ] Każde „Pobierz PDF/CSV” kończy się arkuszem udostępniania albo komunikatem
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 7 h (M) | **Ryzyko:** średnie

### IMP-711 – PIN sędziego: informacja o weryfikacji, próbach i odblokowaniu
- **Epik / obszar:** EP-16 Poprawki UX | **Rola:** MOB
- **Cel:** Sędzia widzi, że PIN jest sprawdzany, ile prób zostało i kiedy może spróbować ponownie po resecie.
- **Zakres:** `PinScreen` – stan „Sprawdzanie…” (spinner zamiast kropek), blokada klawiatury z informacją, „Pozostało {n} prób” od 5. błędu (`remainingAttempts` z API; offline – licznik lokalny), ekran blokady bez podpisu „Wpisz 4-cyfrowy PIN”, odświeżenie stanu blokady po zmianie `pinVersion` (pull/realtime) i powrót do klawiatury; **Poza zakresem:** zmiana limitów.
- **Zależności:** –
- **Odwołania:** ustalenia #9, #34; SCR-JDG-02, SCR-JDG-08; FR-509
- **Kroki:**
  1. Stan `verifying` w `useJudgeSession`; tapnięcia w tym czasie ignorowane z informacją.
  2. Mapowanie `PIN_INVALID.remainingAttempts` na tekst (nowy klucz do akceptacji).
  3. Subskrypcja zmian sędziego w `syncEvents` → wyjście z blokady.
  4. Testy: `UX-09`, `UX-34` w `auth.test.tsx`.
- **Definition of Done:**
  - [ ] Po resecie PIN-u przez organizatora tablet sam wraca do klawiatury
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** średnie

### IMP-712 – Formularz oceny i kolejka sędziego: nieruszone kryteria, szkice, stany końcowe
- **Epik / obszar:** EP-16 Poprawki UX | **Rola:** MOB
- **Cel:** Sędzia nie zatwierdzi przypadkiem wartości domyślnej i widzi, które zawodniczki mają szkic, a które są skończone.
- **Zakres:** decyzja PO/projektanta: oznaczenie nieruszonych kryteriów (wartość przygaszona do pierwszej zmiany i/lub potwierdzenie przy zatwierdzaniu z nieruszonymi); znacznik „szkic” w kolejce; nazwa kary w 2 liniach; stan „Wszystkie zawodniczki ocenione”; baner „Turniej zakończony”; wyśrodkowana siatka profili i kategorii przy małej liczbie kart; **Poza zakresem:** zmiana reguł punktacji (D-SC-09).
- **Zależności:** IMP-650
- **Odwołania:** ustalenia #14, #35; SCR-JDG-01, 03, 04, 05; FR-603…611
- **Kroki:**
  1. Decyzja w `06-ekrany-sedziego.md` (SCR-JDG-05 – wartości początkowe).
  2. `formStore`: zbiór dotkniętych kryteriów; `CriterionCard` – wariant „nieruszone”.
  3. `QueuePanel` – ikona szkicu z `local_draft`.
  4. Testy: `UX-14`, `UX-35` (RNTL `startJudge`), Reassure bez regresji (IMP-500).
- **Definition of Done:**
  - [ ] Zrzuty t022–t027, t035, t039 z raportu poprawione
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 8 h (M) | **Ryzyko:** średnie

### IMP-713 – Parowanie tabletu: kamera, układ, nazwa urządzenia
- **Epik / obszar:** EP-16 Poprawki UX | **Rola:** MOB
- **Cel:** Pierwsze uruchomienie tabletu jest jasne i bez zbędnych pytań systemowych.
- **Zakres:** wyjaśnienie przed prośbą o kamerę i jedna prośba (bez ponawiania po odmowie); „Połącz” 48 dp, przewinięcie formularza nad klawiaturę; domyślna nazwa „Tablet {n}” (kolejny numer w turnieju – API) lub model urządzenia; **Poza zakresem:** –
- **Zależności:** –
- **Odwołania:** ustalenie #33; SCR-JDG-06, SCR-ORG-14, SCR-ORG-16
- **Kroki:**
  1. `PairingScreen`: `useCameraPermissions` – `request` tylko po akcji użytkownika.
  2. Układ prawej kolumny (`flex` przycisku), `KeyboardAwareScrollView`.
  3. API: nazwa domyślna przy parowaniu bez nazwy; test integracyjny.
  4. Testy: `UX-33` (mock `expo-camera` `__setPermission`).
- **Definition of Done:**
  - [ ] Odmowa kamery → jedna prośba systemowa i formularz ręczny
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 4 h (S) | **Ryzyko:** niskie

### IMP-714 – Regresja UX na emulatorach (telefon + tablet)
- **Epik / obszar:** EP-16 Poprawki UX | **Rola:** QA
- **Cel:** Potwierdzić poprawki IMP-700…713 tym samym scenariuszem, w którym je znaleziono.
- **Zakres:** przejście ścieżek z raportu na AVD `PoleChamp_Pixel` i `PoleChamp_Tablet`; aktualizacja raportu (kolumna „status”); scenariusze Maestro dla #1, #2, #37 (zapisane w `e2e/maestro/ux/`); **Poza zakresem:** urządzenia fizyczne (EP-14).
- **Zależności:** IMP-700…713, IMP-715…718
- **Odwołania:** [raport UX](../../docs-dev/qa/ux-review-2026-10-28.md)
- **Kroki:**
  1. Seed `FX-EMPTY`, scenariusz organizatora i sędziego jak w raporcie; zrzuty przed/po.
  2. Uzupełnij kolumnę statusu w raporcie i zamknij ustalenia.
  3. Zapisz przepływy Maestro i dodaj je do statycznej kontroli `@polechamp/e2e-tools`.
- **Definition of Done:**
  - [ ] Wszystkie ustalenia „krytyczne” i „ważne” zamknięte albo przeniesione decyzją PO
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

### IMP-715 – Podwójne żądania, wolny klient HTTP i błędy po udanych akcjach
- **Epik / obszar:** EP-16 Poprawki UX | **Rola:** FULL
- **Cel:** Każda akcja użytkownika trafia do API dokładnie raz, odpowiedź przychodzi w czasie zbliżonym do czasu API, a udana akcja nigdy nie kończy się komunikatem błędu.
- **Zakres:** diagnoza na buildzie `preview` i w dev kliencie (żądania docierają 2× w odstępie 3–7 s: rejestracja, weryfikacja kodu, reset hasła; logowanie 15–20 s przy API 30 ms); `expo/fetch` vs `fetch` z RN (`NativeResponse: Invalid state`), `fetchWithTimeout`, warstwa HTTP Androida (ciche ponowienie POST), inspektor sieci dev klienta; ciągłe rysowanie klatek na bezczynnych ekranach (splash/animacje poza widokiem); klucz idempotencji (`Idempotency-Key`) dla POST uwierzytelniania i mutacji organizatora; API traktuje powtórzenie zakończonej operacji jako sukces (kod weryfikacyjny już użyty przez ten sam klucz, token resetu itp.); **Poza zakresem:** wydajność API (IMP-502).
- **Zależności:** –
- **Odwołania:** ustalenia #4, #38; TL-45; FR-101…104; NFR-102
- **Kroki:**
  1. Zbuduj `preview` (lub `expo run:android --variant release`) i powtórz scenariusz rejestracja → kod → reset → logowanie; licz żądania w logu API (`requestId`) i czasy w kliencie. Zapisz wynik w `docs-dev/perf/http-client.md`.
  2. Jeśli duplikaty są tylko w dev kliencie – opisz obejście (wyłączenie inspektora) w `apps/mobile/README` i zamknij część kliencką; jeśli też w `preview` – usuń źródło (jedna implementacja `fetch`, brak ponowień POST).
  3. API: middleware idempotencji (Valkey, TTL 10 min) dla tras auth i mutacji organizatora; powtórzenie → zapisana odpowiedź. Test integracyjny `UX-38`.
  4. Mobile: wysyłanie `Idempotency-Key` per akcja użytkownika (stały przy ponowieniu przez klienta).
  5. Zatrzymanie pętli animacji (Skia/Reanimated), gdy splash jest ukryty; pomiar `dumpsys gfxinfo` przed/po.
- **Definition of Done:**
  - [ ] Scenariusz z raportu (#38) bez sprzecznych e-maili i fałszywych błędów; logowanie < 2 s na emulatorze
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 10 h (L) | **Ryzyko:** wysokie

### IMP-716 – Usunięcie danych osobowych każdej zawodniczki zakończonego turnieju
- **Epik / obszar:** EP-16 Poprawki UX | **Rola:** FULL
- **Cel:** Organizator może zrealizować żądanie RODO dla każdej zawodniczki, także tej, która nie ma ocen.
- **Zakres:** `EntrySheet` – „Usuń dane osobowe” widoczne dla zawodniczek bez ocen w turnieju zakończonym (dziś tylko `scored`); API `EntriesService.anonymize` – zgoda na zawodniczkę bez ocen (sprawdzić test TC-RODO); tekst potwierdzenia bez „W wynikach pozostanie…”, gdy zawodniczki nie ma w wynikach; **Poza zakresem:** retencja automatyczna.
- **Zależności:** –
- **Odwołania:** ustalenie #40; FR-904; SCR-ORG-17; TL-17; US-091
- **Kroki:**
  1. Test integracyjny `UX-40` (anonimizacja zawodniczki bez ocen w turnieju `FINISHED`).
  2. Warunek widoczności akcji: turniej zakończony → zawsze; turniej trwa → po ocenach (jak dziś).
  3. Test RNTL `UX-40` w `entries`.
- **Definition of Done:**
  - [ ] Dla każdej zawodniczki zakończonego turnieju jest ścieżka usunięcia danych
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 3 h (S) | **Ryzyko:** średnie

### IMP-717 – Tablet po zakończeniu turnieju
- **Epik / obszar:** EP-16 Poprawki UX | **Rola:** FULL
- **Cel:** Po zakończeniu turnieju tablet jasno to pokazuje i da się go przygotować na kolejne zawody; organizator może go odłączyć.
- **Zakres:** ekran TL-47 na SCR-JDG-01 (z lokalnego statusu turnieju po `pull`; sprawdzić, czy `applyChanges` aktualizuje status turnieju i czy ekran go czyta); `JudgeAuth` – mapowanie kodów błędów logowania (`TOURNAMENT_FINISHED`, `NOT_FOUND` i inne) na właściwe teksty zamiast domyślnego „Połącz tablet z internetem…”; heartbeat po zakończeniu turnieju (dlaczego ustaje – status „Offline od…” u organizatora); SCR-ORG-14 – „Odłącz urządzenie” dostępne także w turnieju zakończonym; **Poza zakresem:** autousuwanie po 7 dniach (bez zmian).
- **Zależności:** IMP-701
- **Odwołania:** ustalenie #41; SCR-JDG-01 (TL-47), SCR-JDG-02, SCR-JDG-10, SCR-ORG-14; FR-808
- **Kroki:**
  1. Odtwórz na `setupJudge` + `fakeSyncServer`: zakończenie turnieju w `pull` → oczekiwany ekran TL-47 (`UX-41`).
  2. Popraw zapis statusu turnieju lokalnie i odczyt w `ProfilePicker`.
  3. `JudgeAuth`: jawna tabela kod → komunikat, test każdego kodu z katalogu błędów logowania.
  4. API/mobile: odłączenie urządzenia w turnieju `FINISHED` (test integracyjny), wiersz urządzenia tapowalny.
- **Definition of Done:**
  - [ ] Scenariusz: zakończ turniej → tablet pokazuje TL-47 → „Sparuj z nowym turniejem” prowadzi do SCR-JDG-06; organizator może odłączyć tablet
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 8 h (M) | **Ryzyko:** wysokie

### IMP-718 – Ścieżki konta organizatora: adres e-mail, reset hasła, e-maile
- **Epik / obszar:** EP-16 Poprawki UX | **Rola:** FULL
- **Cel:** Organizatorka nie utknie przez literówkę w adresie ani przez nieczytelny link w e-mailu.
- **Zakres:** ekran „Wpisz kod z e-maila” – „Zmień adres e-mail” (powrót do formularza z danymi, nowe konto/aktualizacja adresu przed weryfikacją – decyzja TL); Konto – edycja nazwy wyświetlanej (e-mail – decyzja PO); ekran „Ustaw nowe hasło” – „Wróć do logowania”; „Nie pamiętasz hasła?” przejmuje adres z ekranu logowania; szablony e-maili – link w osobnej linii, bez kropki po URL; przed wydaniem (EP-13) sprawdzić, że linki dokumentów z `app-config` działają; **Poza zakresem:** zmiana dostawcy e-mail.
- **Zależności:** IMP-715, decyzja PO (zmiana e-maila)
- **Odwołania:** ustalenie #45; SCR-ORG-13, SCR-ORG-21; FR-101…107
- **Kroki:**
  1. Szablony w module `email` + test snapshotu treści (link w osobnej linii).
  2. Ekrany auth (mobile) z nowymi akcjami; teksty do akceptacji IMP-650.
  3. Testy: `UX-45` (RNTL `auth`), test integracyjny zmiany adresu przed weryfikacją.
- **Definition of Done:**
  - [ ] Literówkę w adresie da się poprawić bez zakładania drugiego konta
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

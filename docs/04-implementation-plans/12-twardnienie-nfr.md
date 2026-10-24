# EP-12 – Twardnienie NFR

> Dokument: `04-implementation-plans/12-twardnienie-nfr.md` · Tech Lead (Agent 2) · 23.10.2026 · Konwencje i DoD: [00-konwencje-i-definition-of-done.md](00-konwencje-i-definition-of-done.md) · Indeks: [91-indeks-zadan.md](91-indeks-zadan.md)

Zadania optymalizacyjne i pomiarowe wykonywane po zbudowaniu funkcji: wydajność formularza sędziego (R-01), zimny start, API pod obciążeniem, bateria i pamięć, skalowanie tekstu i pseudolokalizacja, niezawodność wdrożeń z WebSocket, rozmiar aplikacji oraz jedna zaplanowana aktualizacja Expo SDK przed 1.0 (polityka ADR-001).

## Podsumowanie

| Zadań | Suma | Rola (h) |
|---|---|---|
| 8 | 56 h | BE 12 · MOB 38 · QA 6 |


## Zadania

### IMP-500 – Profilowanie i optymalizacja formularza sędziego
- **Epik / obszar:** EP-12 Twardnienie NFR | **Rola:** MOB
- **Cel:** Na najsłabszym tablecie referencyjnym (Galaxy Tab A8) przeciąganie suwaka i zmiana kar w formularzu oceny działają płynnie (≥ 55 fps), a „Twój wynik” aktualizuje się w ≤ 50 ms.
- **Zakres:** Flashlight (Android), Instruments (iPad), Reassure; optymalizacje (memo kart, worklety, unikanie re-renderu stopki), budżet 55 fps; **Poza zakresem:** –
- **Zależności:** [IMP-313](08-mobile-ekrany-sedziego.md#imp-313--zatwierdzenie-oceny-i-auto-przejście)
- **Odwołania:** NFR-104, R-01, [TC-PERF-004](../03-test-plans/05-testy-niefunkcjonalne.md#tc-perf-004), [TC-EDGE-024](../03-test-plans/08-przypadki-brzegowe.md#tc-edge-024)
- **Kroki:**
  1. Zmierz stan wyjściowy: Flashlight (`flashlight test` z przepływem Maestro przeciągania suwaka) na Tab A8 i Instruments (Time Profiler, Core Animation) na iPad 9; zapisz FPS, czas JS i liczbę renderów.
  2. Dodaj testy Reassure (`measureRenders`) dla `ScoreForm`, `CriterionCard`, `PenaltyCounter` i `ScoreFooter` jako bazę regresji.
  3. Ogranicz re-rendery: `React.memo` dla kart, selektory Zustand per kryterium (`useScoreFormStore(s => s.values[id])`), `ScoreFooter` subskrybujący tylko sumę.
  4. Przenieś obliczenia gestu i formatowanie wartości suwaka do workletów (bez mostu JS na każdą klatkę), ogranicz `scheduleOnRN` do zmian kroku.
  5. Sprawdź koszt `sheetTotal` i formatowania w stopce (memoizacja po zmianie wartości) oraz wpływ cieni na Androidzie (`elevation` vs `shadow*`).
  6. Zapisz raport przed/po w `docs-dev/perf/score-form.md` i dodaj próg Reassure do CI.
  7. Dopisz lub uruchom przypadki TC-PERF-004, TC-EDGE-024 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  8. Otwórz PR `IMP-500: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-PERF-004, TC-EDGE-024 przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 12 h (L) | **Ryzyko:** wysokie

### IMP-501 – Optymalizacja zimnego startu
- **Epik / obszar:** EP-12 Twardnienie NFR | **Rola:** MOB
- **Cel:** Aplikacja uruchamia się na zimno do pierwszego interaktywnego ekranu w ≤ 3,0 s (p90) na urządzeniach referencyjnych.
- **Zakres:** Analiza bundla, leniwe ładowanie tras sędziego/organizatora, Hermes bytecode (diffing domyślnie), opóźnione inicjalizacje (Sentry, i18n namespace), pomiar TTI; **Poza zakresem:** –
- **Zależności:** [IMP-254](07-mobile-ekrany-organizatora.md#imp-254--scr-org-00--splash-organizatora-z-ładowaniem-danych), [IMP-302](08-mobile-ekrany-sedziego.md#imp-302--scr-jdg-00--splash-sędziego-z-rzeczywistym-rozruchem)
- **Odwołania:** NFR-101, [TC-PERF-001](../03-test-plans/05-testy-niefunkcjonalne.md#tc-perf-001)
- **Kroki:**
  1. Zmierz czas TTI (znacznik Sentry z IMP-218 i `adb shell am start -W`, Xcode Instruments App Launch) na iPhone 12, Pixel 6a, iPad 9 i Tab A8.
  2. Przeanalizuj bundel (`expo export --dump-sourcemap` + `source-map-explorer`) i usuń zbędne importy w ścieżce startowej (np. pełny zestaw ikon, `date` locales).
  3. Włącz leniwe ładowanie grup tras `(org)` i `(judge)` (Expo Router `lazy`), aby tryb organizatora nie ładował kodu formularza oceny i odwrotnie.
  4. Odrocz inicjalizacje po pierwszej klatce: Sentry (`Sentry.init` z `enableAutoPerformanceTracing` po starcie), przestrzenie i18n inne niż `common`, połączenie WS.
  5. Potwierdź Hermes bytecode i zapisz raport rozmiaru i czasów przed/po w `docs-dev/perf/cold-start.md`.
  6. Dopisz lub uruchom przypadki TC-PERF-001 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-501: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-PERF-001 przechodzi
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** średnie

### IMP-502 – Wydajność API pod obciążeniem
- **Epik / obszar:** EP-12 Twardnienie NFR | **Rola:** BE
- **Cel:** API odpowiada w p95 ≤ 300 ms (odczyty) i ≤ 500 ms (zapisy z przeliczeniem rankingu) przy obciążeniu docelowym, bez przeciążenia bazy i CPU przy logowaniach.
- **Zakres:** EXPLAIN ANALYZE dla zapytań list i przeliczeń, indeksy, pula połączeń, cache odczytu szczegółów turnieju (krótki TTL, unieważnianie zdarzeniem), profilowanie CPU Argon2id; **Poza zakresem:** –
- **Zależności:** [IMP-461](11-qa-i-automatyzacja-testow.md#imp-461--testy-obciążeniowe-k6)
- **Odwołania:** NFR-102, NFR-802, [TC-PERF-002](../03-test-plans/05-testy-niefunkcjonalne.md#tc-perf-002)
- **Kroki:**
  1. Uruchom k6 (IMP-461) i zbierz najwolniejsze zapytania z `pg_stat_statements` i Performance Insights.
  2. Wykonaj `EXPLAIN (ANALYZE, BUFFERS)` dla listy turniejów z postępem, szczegółów turnieju, listy startowej z licznikami, `sync/changes` i `ResultsService.recompute`; dodaj brakujące indeksy w migracji.
  3. Dodaj cache odczytu `GET /v1/tournaments/{id}` w Valkey (TTL 2 s, klucz z `version`, unieważnianie przez `domain_event`) i sprawdź rozmiar puli `pg` per zadanie.
  4. Zmierz koszt Argon2id (logowanie organizatora i PIN online) na Fargate 0,5 vCPU i ogranicz współbieżność hashowania (`p-limit` = rozmiar puli wątków).
  5. Zapisz raport k6 przed/po w `docs-dev/perf/api.md`.
  6. Dopisz lub uruchom przypadki TC-PERF-002 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-502: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-PERF-002 przechodzi
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 8 h (M) | **Ryzyko:** średnie

### IMP-503 – Pomiar baterii i pamięci tabletu
- **Epik / obszar:** EP-12 Twardnienie NFR | **Rola:** QA
- **Cel:** Tablet wytrzymuje dzień oceniania na baterii, a zużycie pamięci jest stabilne, co potwierdzają pomiary na iPad 9 i Galaxy Tab A8.
- **Zakres:** Pomiar 2 h na iPad 9 i Tab A8, poprawki (keep-awake tylko w formularzu, częstotliwość heartbeat, renderowanie w tle); **Poza zakresem:** –
- **Zależności:** [IMP-463](11-qa-i-automatyzacja-testow.md#imp-463--przebiegi-na-urządzeniach-referencyjnych)
- **Odwołania:** NFR-704, NFR-705, [TC-PERF-014](../03-test-plans/05-testy-niefunkcjonalne.md#tc-perf-014), [TC-PERF-015](../03-test-plans/05-testy-niefunkcjonalne.md#tc-perf-015)
- **Kroki:**
  1. Przeprowadź 2-godzinny pomiar oceniania (przepływ Maestro w pętli + keep-awake) na iPad 9 (Instruments Energy Log) i Tab A8 (`adb shell dumpsys batterystats`, Battery Historian).
  2. Zmierz pamięć (Xcode Memory Graph, `dumpsys meminfo`) co 15 min i sprawdź brak wycieków po 200 zatwierdzeniach.
  3. Sprawdź źródła zużycia: keep-awake tylko w SCR-JDG-04/05, częstotliwość heartbeat i timerów `SyncEngine` w tle, renderowanie animacji poza ekranem.
  4. Zgłoś poprawki z pomiarem przed/po i zapisz raport w `docs-dev/perf/battery-memory.md`.
  5. Dopisz lub uruchom przypadki TC-PERF-014, TC-PERF-015 w katalogach testów wskazanych w zakresie; nazwa testu zawiera ID przypadku.
  6. Otwórz PR `IMP-503: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-PERF-014, TC-PERF-015 przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

### IMP-504 – Pseudolokalizacja i skalowanie tekstu – poprawki
- **Epik / obszar:** EP-12 Twardnienie NFR | **Rola:** MOB
- **Cel:** Ekrany wyglądają poprawnie przy dłuższych tekstach i powiększonej czcionce systemowej: nic nie wychodzi poza ekran, a skracanie i zawijanie są tam, gdzie przewiduje design.
- **Zakres:** Przebieg z pseudolokalizacją +30% i czcionką 120/130%, poprawki układów (wielokropki, min-width 0, zawijanie w przewidzianych miejscach); **Poza zakresem:** –
- **Zależności:** [IMP-459](11-qa-i-automatyzacja-testow.md#imp-459--regresja-wizualna-zrzuty--odiff), [IMP-460](11-qa-i-automatyzacja-testow.md#imp-460--testy-dostępności)
- **Odwołania:** NFR-204, NFR-604, UI-05, UI-11, [TC-L10N-002](../03-test-plans/05-testy-niefunkcjonalne.md#tc-l10n-002), [TC-A11Y-007](../03-test-plans/05-testy-niefunkcjonalne.md#tc-a11y-007), [TC-A11Y-008](../03-test-plans/05-testy-niefunkcjonalne.md#tc-a11y-008)
- **Kroki:**
  1. Włącz pseudolokalizację (+30%, `@polechamp/i18n` `pseudo`) i przejdź wszystkie ekrany SCR oraz DevCatalog na telefonie i tablecie.
  2. Powtórz przebieg z czcionką systemową 120% (sędzia) i 130% (organizator).
  3. Popraw układy: `numberOfLines` i wielokropki (nazwiska, nazwy kategorii, meta – UI-05, UI-11), `minWidth: 0` w kolumnach flex, zawijanie w opisach kryteriów i komunikatach banerów.
  4. Zapisz listę ekranów, problemów i poprawek w `docs-dev/qa/l10n-scaling.md` i dodaj przypadki pseudolokalizacji do regresji wizualnej.
  5. Dopisz lub uruchom przypadki TC-L10N-002, TC-A11Y-007, TC-A11Y-008 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  6. Otwórz PR `IMP-504: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-L10N-002, TC-A11Y-007, TC-A11Y-008 przechodzą
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

### IMP-505 – Niezawodność wdrożeń i połączeń WS
- **Epik / obszar:** EP-12 Twardnienie NFR | **Rola:** BE
- **Cel:** Wdrożenie nowej wersji API w trakcie zawodów nie wywołuje lawiny ponownych połączeń ani utraty zdarzeń u organizatora i na tabletach.
- **Zakres:** Graceful shutdown z zamknięciem WS i informacją dla klientów, losowe opóźnienie ponownego połączenia (0,5–5 s), pull po każdym połączeniu, deregistration delay 30 s, test na staging; **Poza zakresem:** –
- **Zależności:** [IMP-216](06-mobile-fundamenty-i-design-system.md#imp-216--klient-realtime-z-fallbackiem-na-odpytywanie), [IMP-155](04-backend-urzadzenia-ocenianie-synchronizacja.md#imp-155--publikator-zdarzeń-z-outboxu)
- **Odwołania:** NFR-803, ADR-003, [TC-REL-005](../03-test-plans/05-testy-niefunkcjonalne.md#tc-rel-005)
- **Kroki:**
  1. W gateway przy SIGTERM emituj do klientów `server.restarting` i zamykaj połączenia stopniowo (paczki po 50 co 1 s) przed zakończeniem procesu.
  2. W kliencie `socket.ts` ustaw losowe opóźnienie ponownego połączenia 0,5–5 s i po każdym ponownym połączeniu wykonuj `pull` (tablet) lub unieważnienie zapytań (organizator).
  3. Potwierdź `deregistration_delay = 30` s i kolejność: health check `ready` = 503 → oczekiwanie → zamknięcie WS.
  4. Przetestuj na staging wdrożenie przy 50 połączeniach (k6 `ws.js`) i zmierz liczbę połączeń na sekundę oraz brak utraconych zdarzeń (porównanie `domain_event` z odebranymi).
  5. Dopisz lub uruchom przypadki TC-REL-005 w `apps/api/test/**` (Vitest + Testcontainers); nazwa testu zawiera ID przypadku.
  6. Otwórz PR `IMP-505: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-REL-005 przechodzi
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 4 h (S) | **Ryzyko:** średnie

### IMP-506 – Kontrola rozmiaru aplikacji
- **Epik / obszar:** EP-12 Twardnienie NFR | **Rola:** MOB
- **Cel:** Rozmiar pobrania aplikacji nie przekracza 60 MB na iOS i Androidzie i nie rośnie niezauważenie między wydaniami.
- **Zakres:** Raport EAS/sklepów, usunięcie zbędnych zasobów (czcionki – tylko 400/500, obrazy), R8 (domyślnie w SDK 58); **Poza zakresem:** –
- **Zależności:** [IMP-552](13-wydanie.md#imp-552--dystrybucja-testowa-dla-pilotażu)
- **Odwołania:** NFR-109, [TC-PERF-009](../03-test-plans/05-testy-niefunkcjonalne.md#tc-perf-009)
- **Kroki:**
  1. Pobierz raport rozmiaru z EAS Build i konsol sklepów (App Thinning Size Report, Play „App size”).
  2. Usuń zbędne zasoby: tylko fonty Inter 400 i 500, kompresja obrazów splasha i ikon, brak nieużywanych ikon Phosphor.
  3. Potwierdź R8/minifikację Androida i podział ABI w buildzie produkcyjnym.
  4. Dodaj krok CI porównujący rozmiar z poprzednim wydaniem (próg +10%) i zapisz raport.
  5. Dopisz lub uruchom przypadki TC-PERF-009 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  6. Otwórz PR `IMP-506: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-PERF-009 przechodzi
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 2 h (XS) | **Ryzyko:** niskie

### IMP-507 – Aktualizacja Expo SDK przed wydaniem 1.0 (jeśli dostępna)
- **Epik / obszar:** EP-12 Twardnienie NFR | **Rola:** MOB
- **Cel:** Wydanie 1.0 trafia do sklepów na najnowszym stabilnym Expo SDK dostępnym co najmniej 6 tygodni przed zamrożeniem, a później SDK jest aktualizowany tylko między sezonami.
- **Zakres:** Jeśli SDK 59 jest wydany ≥ 6 tygodni przed zamrożeniem 1.0: aktualizacja (`npx expo install --fix`), migracje, regres E2E; w przeciwnym razie aktualizacja patchy SDK 58; **Poza zakresem:** –
- **Zależności:** [IMP-463](11-qa-i-automatyzacja-testow.md#imp-463--przebiegi-na-urządzeniach-referencyjnych)
- **Odwołania:** ADR-001, R-11, NFR-905, [TC-COMPAT-001](../03-test-plans/05-testy-niefunkcjonalne.md#tc-compat-001), [TC-COMPAT-009](../03-test-plans/05-testy-niefunkcjonalne.md#tc-compat-009)
- **Kroki:**
  1. Sprawdź datę wydania SDK 59 względem zamrożenia 1.0; przy < 6 tygodniach wykonaj tylko aktualizację patchy SDK 58 (`npx expo install --fix`) i zakończ zadanie raportem.
  2. Utwórz gałąź `chore/expo-sdk-59`: `npx expo install expo@^59 --fix`, aktualizacja `react-native`, Reanimated, Gesture Handler, Skia, quick-crypto i MMKV do wersji zgodnych z SDK.
  3. Wykonaj migracje z changelogu SDK (konfiguracja `app.config.ts`, zmiany API modułów `expo-*`, `expo-router`) i napraw błędy kompilacji.
  4. Zbuduj dev client i buildy `preview`, uruchom pełny regres E2E (Maestro), testy wydajności formularza i trwałości SQLite.
  5. Zaktualizuj `runtimeVersion` (nowy odcisk – brak OTA ze starych binarek) i zapisz decyzję w ADR-001 (sekcja zmian).
  6. Dopisz lub uruchom przypadki TC-COMPAT-001, TC-COMPAT-009 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-507: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] Regres TC-E2E P1 zielony po aktualizacji
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 12 h (L) | **Ryzyko:** średnie


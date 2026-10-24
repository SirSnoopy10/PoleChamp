# EP-06 – Mobile: fundamenty i design system Nocturne

> Dokument: `04-implementation-plans/06-mobile-fundamenty-i-design-system.md` · Tech Lead (Agent 2) · 23.10.2026 · Konwencje i DoD: [00-konwencje-i-definition-of-done.md](00-konwencje-i-definition-of-done.md) · Indeks: [91-indeks-zadan.md](91-indeks-zadan.md)

Aplikacja Expo SDK 58 (React Native 0.88, TypeScript 6, Expo Router – [ADR-001](../01-architecture/adr/ADR-001-aplikacja-mobilna-react-native-expo.md)), komponenty bazowe z [09-design-system.md §4](../02-specification/09-design-system.md#4-komponenty-bazowe), własny komponent `Sheet` (TL-03), splash z animacją (decyzja w spike IMP-606), wybór trybu i orientacja ([ADR-013](../01-architecture/adr/ADR-013-orientacja-i-rozmiar-okna-tabletu.md)), warstwa danych (klient OpenAPI, TanStack Query z MMKV, realtime z fallbackiem). Komponenty powstają przed ekranami; DevCatalog (IMP-212) jest źródłem regresji wizualnej.

## Podsumowanie

| Zadań | Suma | Rola (h) |
|---|---|---|
| 21 | 153 h | MOB 153 |


## Zadania

### IMP-200 – Inicjalizacja aplikacji Expo SDK 58
- **Epik / obszar:** EP-06 Mobile – fundamenty i design system Nocturne | **Rola:** MOB
- **Cel:** Aplikacja Expo SDK 58 z New Architecture uruchamia się w dev cliencie na iOS i Androidzie, z poprawnymi identyfikatorami, uprawnieniem kamery opisanym po polsku i bez blokady zmiany rozmiaru okna na Androidzie 16.
- **Zakres:** `apps/mobile` (Expo SDK 58, RN 0.88, TS ~6.0, Expo Router), `app.config.ts` (identyfikatory, iOS 16.4, Android minSdk 29 przez `expo-build-properties`, uprawnienia: kamera z opisem PL, brak lokalizacji/mikrofonu), `supportsTablet`, orientacja konfigurowana w runtime, ikona i splash statyczny (placeholder); **Poza zakresem:** Splash animowany (IMP-211)
- **Zależności:** [IMP-001](01-fundamenty-i-devops.md#imp-001--monorepo-pnpm-workspaces--turborepo--bazowa-konfiguracja-ts), [IMP-600](14-spike.md#imp-600--spike-zgodność-stosu-expo-sdk-58-limit-8-h)
- **Odwołania:** ADR-001, NFR-701, TL-01, TL-25, [TC-COMPAT-001](../03-test-plans/05-testy-niefunkcjonalne.md#tc-compat-001)
- **Kroki:**
  1. Utwórz `apps/mobile` szablonem TS Expo SDK 58 (RN 0.88, React 19.3, Expo Router 58) i podłącz do workspace (`package.json` z `@polechamp/*` jako `workspace:*`).
  2. Skonfiguruj `app.config.ts`: `ios.bundleIdentifier`/`android.package` `app.polechamp`, `ios.supportsTablet: true`, `orientation: 'default'` (blokady w runtime – IMP-213), `userInterfaceStyle: 'dark'`.
  3. Dodaj `expo-build-properties`: iOS `deploymentTarget` 16.4, Android `minSdkVersion` 29, `targetSdkVersion` 36.
  4. Dodaj `expo-camera` z `cameraPermission`: „PoleChamp używa aparatu do zeskanowania kodu parowania tabletu.”; usuń uprawnienia lokalizacji i mikrofonu (`android.blockedPermissions`).
  5. Napisz config plugin `plugins/with-android-resizability.js` ustawiający `PROPERTY_COMPAT_ALLOW_RESTRICTED_RESIZABILITY` w manifeście (ADR-013).
  6. Dodaj placeholder ikony i statycznego splasha (`expo-splash-screen`, tło `bg`) i zbuduj dev client na iOS i Androidzie.
  7. Dopisz lub uruchom przypadki TC-COMPAT-001 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  8. Otwórz PR `IMP-200: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] Dev client uruchamia się na 4 urządzeniach referencyjnych
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** średnie

### IMP-201 – Metro, pnpm workspace i środowisko testów mobile
- **Epik / obszar:** EP-06 Mobile – fundamenty i design system Nocturne | **Rola:** MOB
- **Cel:** Aplikacja importuje pakiety `@polechamp/*` z workspace w Metro i w Jest, a testy komponentów mają gotowe providery i mock SQLite.
- **Zakres:** `metro.config.js` (watchFolders `packages/*`, rozwiązywanie symlinków, ew. `node-linker=hoisted` – decyzja w tym zadaniu), Jest 30 + `jest-expo` 58 + React Native Testing Library 14, `test-utils` (providery: theme, i18n, query client, nawigacja), mock SQLite (better-sqlite3), Reassure; **Poza zakresem:** –
- **Zależności:** [IMP-200](#imp-200--inicjalizacja-aplikacji-expo-sdk-58), [IMP-050](02-pakiety-wspoldzielone.md#imp-050--polechampscoring--szkielet-pakietu), [IMP-058](02-pakiety-wspoldzielone.md#imp-058--polechampcontracts--szkielet), [IMP-068](02-pakiety-wspoldzielone.md#imp-068--polechamptokens--tokeny-nocturne), [IMP-069](02-pakiety-wspoldzielone.md#imp-069--polechampi18n--infrastruktura-liczba-mnoga-formatery)
- **Odwołania:** ADR-011, NFR-903, [TC-SCORING-031](../03-test-plans/01-testy-jednostkowe.md#tc-scoring-031)
- **Kroki:**
  1. Skonfiguruj `apps/mobile/metro.config.js` (`getDefaultConfig`, `watchFolders` = root monorepo, `resolver.unstable_enableSymlinks`, `nodeModulesPaths`) i zapisz decyzję o `node-linker` (`isolated` vs `hoisted`) w `apps/mobile/README.md`.
  2. Skonfiguruj `jest.config.js` (preset `jest-expo` 58, `transformIgnorePatterns` dla `@polechamp`, `phosphor-react-native`, `react-native-reanimated`) i `jest.setup.ts` (mock Reanimated, NetInfo, SecureStore, MMKV).
  3. Napisz `src/test-utils/render.tsx` z providerami `ThemeProvider`, `I18nextProvider`, `QueryClientProvider` (bez ponowień) i nawigacją Expo Router (`renderRouter`).
  4. Napisz mock `expo-sqlite` na `better-sqlite3` w `src/test-utils/sqlite-mock.ts` (te same migracje co w aplikacji).
  5. Dodaj Reassure (`reassure` + `measureRenders`) i skrypt `pnpm perf:test`.
  6. Napisz test dymny importujący `sheetTotal` z `@polechamp/scoring` i renderujący `Text` z tokenami.
  7. Dopisz lub uruchom przypadki TC-SCORING-031 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  8. Otwórz PR `IMP-201: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] `pnpm --filter mobile test` przechodzi w CI
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 5 h (M) | **Ryzyko:** średnie

### IMP-202 – Theme, fonty Inter i komponenty tekstu
- **Epik / obszar:** EP-06 Mobile – fundamenty i design system Nocturne | **Rola:** MOB
- **Cel:** Cała aplikacja używa fontu Inter i stylów tekstu z tokenów Nocturne, a powiększenie czcionki systemowej działa w granicach, które nie psują układu.
- **Zakres:** `@expo-google-fonts/inter` (400, 500), `ThemeProvider` z `@polechamp/tokens`, komponent `Text` z wariantami (display…pin, `tabular-nums`), `allowFontScaling` z limitem (organizator 130%, sędzia 120%), tło aplikacji `bg`, pasek statusu jasny; **Poza zakresem:** –
- **Zależności:** [IMP-201](#imp-201--metro-pnpm-workspace-i-środowisko-testów-mobile)
- **Odwołania:** NFR-204, NFR-209, 09-design-system §2.5, [TC-TOKENS-004](../03-test-plans/01-testy-jednostkowe.md#tc-tokens-004)
- **Kroki:**
  1. Załaduj `@expo-google-fonts/inter` (`Inter_400Regular`, `Inter_500Medium`) w `app/_layout.tsx` przez `useFonts`, z utrzymaniem splasha do załadowania.
  2. Napisz `src/ui/theme/ThemeProvider.tsx` i hook `useTheme()` udostępniające `color`, `roles`, `space`, `radius`, `shadow`, `typography`, `motion` z `@polechamp/tokens`.
  3. Napisz `src/ui/Text.tsx` z wariantami `display`, `title`, `heading`, `body`, `caption`, `kicker` (wersaliki, odstęp liter 0,08 em), `pin` i propem `tabular` (`fontVariant: ['tabular-nums']`).
  4. Ustaw `maxFontSizeMultiplier` per tryb: organizator 1,3, sędzia 1,2 (kontekst trybu z IMP-213).
  5. Ustaw tło aplikacji `bg` w `Stack` (`contentStyle`) i jasny pasek statusu (`expo-status-bar` `style="light"`).
  6. Dodaj sekcję „Typografia” w DevCatalog ze wszystkimi wariantami.
  7. Dopisz lub uruchom przypadki TC-TOKENS-004 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  8. Otwórz PR `IMP-202: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-TOKENS-004 (komponent) przechodzi
  - [ ] Zgodność z tokenami Nocturne i checklistą 09-design-system §7; zrzut w DevCatalog/ekranie dołączony do PR
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

### IMP-203 – Komponent Button (primary, secondary, ghost, iconRound)
- **Epik / obszar:** EP-06 Mobile – fundamenty i design system Nocturne | **Rola:** MOB
- **Cel:** Wszystkie przyciski w aplikacji mają jeden komponent z wariantami i stanami z design systemu, wystarczającą strefą dotyku i etykietami dla czytnika ekranu.
- **Zakres:** Warianty, rozmiary 44/48/52, stany pressed/disabled/loading/focus, ikony Phosphor, `hitSlop` dla małych, etykiety a11y; **Poza zakresem:** –
- **Zależności:** [IMP-202](#imp-202--theme-fonty-inter-i-komponenty-tekstu), [IMP-210](#imp-210--ikony-phosphor)
- **Odwołania:** NFR-203, NFR-206, UI-04, [TC-UI-001](../03-test-plans/01-testy-jednostkowe.md#tc-ui-001)
- **Kroki:**
  1. Napisz `src/ui/Button.tsx` z wariantami `primary` (tekst accent, obrys 1 dp accent, tło przezroczyste; w `StickyActionBar` i stopce `accent10OnBg`), `secondary` (tekst `text` lub neutral-300 dla usuwania, obrys divider), `ghost` (tekst accent, bez obrysu), `iconRound` (30/36/40/44 dp); bez wypełnienia akcentem (zakaz Nocturne).
  2. Dodaj rozmiary 44, 48 i 52 dp oraz propy `icon` (nazwa Phosphor), `iconPosition`, `fullWidth`.
  3. Obsłuż stany: `pressed` (rozjaśnienie), `disabled` (opacity 0,45, brak `onPress`), `loading` (spinner zamiast ikony, `accessibilityState.busy`), fokus klawiatury (obrys 2 dp accent, offset 2).
  4. Dodaj `hitSlop` dopełniający strefę dotyku do 44 × 44 dp dla mniejszych przycisków i `accessibilityRole="button"` z etykietą z propu lub tekstu.
  5. Napisz testy RNTL: brak `onPress` w stanie `disabled`/`loading`, etykieta a11y dla `iconRound`.
  6. Dodaj sekcję „Przyciski” w DevCatalog (wszystkie warianty × rozmiary × stany).
  7. Dopisz lub uruchom przypadki TC-UI-001 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  8. Otwórz PR `IMP-203: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-UI-001 przechodzi
  - [ ] Zgodność z tokenami Nocturne i checklistą 09-design-system §7; zrzut w DevCatalog/ekranie dołączony do PR
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 8 h (M) | **Ryzyko:** niskie

### IMP-204 – StatusPill, Badge, Avatar, ProgressBar
- **Epik / obszar:** EP-06 Mobile – fundamenty i design system Nocturne | **Rola:** MOB
- **Cel:** Statusy, liczniki, inicjały i paski postępu wyglądają tak samo na każdym ekranie, a status nigdy nie jest przyciskiem.
- **Zakres:** `StatusPill` (draft/live/done/provisional/unplayed + warianty sync), `Badge` (weight/penalty/number/scored), `Avatar` (inicjały), `ProgressBar` (3/4/6 dp, a11y); **Poza zakresem:** –
- **Zależności:** [IMP-202](#imp-202--theme-fonty-inter-i-komponenty-tekstu)
- **Odwołania:** FR-312, UI-02, UI-11, FR-701, [TC-UI-002](../03-test-plans/01-testy-jednostkowe.md#tc-ui-002), [TC-UI-003](../03-test-plans/01-testy-jednostkowe.md#tc-ui-003), [TC-UI-004](../03-test-plans/01-testy-jednostkowe.md#tc-ui-004), [TC-UI-023](../03-test-plans/01-testy-jednostkowe.md#tc-ui-023)
- **Kroki:**
  1. Napisz `src/ui/StatusPill.tsx` z wariantami `draft` („W przygotowaniu”), `live` („Trwa”, kropka accent), `done` („Zakończona”), `unplayed` („Nierozegrana”), `provisional` („wstępny”) i wariantami synchronizacji (`synced`, `sending`, `offlineQueue`, `offline`, `attention`).
  2. Napisz `src/ui/Badge.tsx`: `weight` („×1,5”, accent-900/accent-300), `penalty` („−2 pkt”, neutral-900/neutral-200), `number` (38/56 dp, radius 11/16), `scored` („Oceniono” z `check-circle`).
  3. Napisz `src/ui/Avatar.tsx` (28/38/44/64 dp, inicjały, warianty `active`, `inactive`, `locked` z ikoną `lock-simple`).
  4. Napisz `src/ui/ProgressBar.tsx` (wysokości 3/4/6 dp, tor neutral-800, wypełnienie accent lub accent-700, `accessibilityRole="progressbar"` z `accessibilityValue`).
  5. Formatuj liczby przez `formatWeight`/`formatPenaltyPoints` z `@polechamp/scoring` i teksty pigułek z kluczy i18n.
  6. Napisz testy RNTL (tekst i rola każdego wariantu) i dodaj sekcję w DevCatalog.
  7. Dopisz lub uruchom przypadki TC-UI-002, TC-UI-003, TC-UI-004, TC-UI-023 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  8. Otwórz PR `IMP-204: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-UI-002, 003, 004, 023 przechodzą
  - [ ] Zgodność z tokenami Nocturne i checklistą 09-design-system §7; zrzut w DevCatalog/ekranie dołączony do PR
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

### IMP-205 – Karty, listy grupowane, nagłówki sekcji, stany puste, szkielety
- **Epik / obszar:** EP-06 Mobile – fundamenty i design system Nocturne | **Rola:** MOB
- **Cel:** Karty turniejów i kategorii, listy grupowane, nagłówki sekcji, stany puste i szkielety ładowania są gotowe do składania ekranów zgodnie z designem.
- **Zakres:** `Card`, `TournamentCard` (gradient `expo-linear-gradient`), `CategoryCard`, `StatTiles`, `ProgressCard`, `GroupedList`/`ListRow` (chevron tylko edytowalne – UI-07), `SectionHeader`, `EmptyState` (3 warianty), `Skeleton` (reduce motion); **Poza zakresem:** –
- **Zależności:** [IMP-203](#imp-203--komponent-button-primary-secondary-ghost-iconround), [IMP-204](#imp-204--statuspill-badge-avatar-progressbar)
- **Odwołania:** UI-06, UI-07, NFR-205, NFR-207, [TC-UI-005](../03-test-plans/01-testy-jednostkowe.md#tc-ui-005), [TC-UI-016](../03-test-plans/01-testy-jednostkowe.md#tc-ui-016), [TC-UI-017](../03-test-plans/01-testy-jednostkowe.md#tc-ui-017), [TC-UI-028](../03-test-plans/01-testy-jednostkowe.md#tc-ui-028)
- **Kroki:**
  1. Napisz `src/ui/cards/Card.tsx` (padding 14/16, radius lg, surface, shadow-sm) i `TournamentCard.tsx` (gradient 160° accent 9% → surface przez `expo-linear-gradient`, pigułka, nazwa, meta z `calendar-blank`/`map-pin`, pasek i „{n} kategorii · {pct}%”).
  2. Napisz `CategoryCard.tsx` (nazwa z wielokropkiem, „{styl} · {poziom} · {n} zawodniczek”, pigułka bez zawijania, pasek „{done}/{exp} ocen”), `StatTiles.tsx` (3 kolumny z separatorami, opcjonalnie tapowalny kafel) i `ProgressCard.tsx`.
  3. Napisz `src/ui/list/GroupedList.tsx` i `ListRow.tsx` (separator 1 dp, chevron `caret-right` tylko dla wierszy edytowalnych – UI-07, stan nieaktywny) oraz `SectionHeader.tsx` (kicker + opcjonalna akcja ghost „Dodaj”).
  4. Napisz `src/ui/EmptyState.tsx` z wariantami `framed` (obrys divider, ikona accent 26 dp, całość tapowalna), `inline` (13 dp neutral-400) i `error` (`warning-circle`, „Nie udało się wczytać danych.”, przycisk „Spróbuj ponownie”).
  5. Napisz `src/ui/Skeleton.tsx` (neutral-800, puls opacity 0,5↔0,8; statyczny przy „Ogranicz ruch” z `useReducedMotion`) i presety `SkeletonCard`, `SkeletonRow`.
  6. Napisz testy RNTL (chevron, etykieta a11y karty „{nazwa}, {status}, {data}, {miejsce}, postęp {pct} procent”) i dodaj sekcje w DevCatalog.
  7. Dopisz lub uruchom przypadki TC-UI-005, TC-UI-016, TC-UI-017, TC-UI-028 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  8. Otwórz PR `IMP-205: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-UI-005, 016, 017, 028 przechodzą
  - [ ] Zgodność z tokenami Nocturne i checklistą 09-design-system §7; zrzut w DevCatalog/ekranie dołączony do PR
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 10 h (L) | **Ryzyko:** niskie

### IMP-206 – Komponent Sheet (bottom sheet) – implementacja własna
- **Epik / obszar:** EP-06 Mobile – fundamenty i design system Nocturne | **Rola:** MOB
- **Cel:** Arkusze organizatora otwierają się od dołu z dopasowaną wysokością, zamykają gestem, tapnięciem tła, „×” i przyciskiem wstecz, unoszą się nad klawiaturą i nie blokują dotyku po zamknięciu.
- **Zakres:** Reanimated 4 + Gesture Handler 3: wysokość dopasowana do treści (maks. 88%/86%), tło `sheetBackdrop` (tap zamyka, brak blokowania dotyku po zamknięciu), przeciągnięcie w dół, „×”, przycisk wstecz Androida, unikanie klawiatury (`react-native-keyboard-controller`), modalność a11y, wariant potwierdzenia (ikona w kole) i „drugi krok” (180 ms), safe area. Jeśli IMP-602 wybierze `@gorhom/bottom-sheet` – zadanie redukuje się do opakowania (6 h); **Poza zakresem:** –
- **Zależności:** [IMP-203](#imp-203--komponent-button-primary-secondary-ghost-iconround), [IMP-602](14-spike.md#imp-602--spike-bottom-sheet--gorhombottom-sheet-vs-własny-limit-4-h)
- **Odwołania:** 09-design-system §4.9, UI-04, UI-10, NFR-206, TL-03, [TC-UI-011](../03-test-plans/01-testy-jednostkowe.md#tc-ui-011), [TC-UI-012](../03-test-plans/01-testy-jednostkowe.md#tc-ui-012), [TC-A11Y-011](../03-test-plans/05-testy-niefunkcjonalne.md#tc-a11y-011)
- **Kroki:**
  1. Napisz `src/ui/sheet/Sheet.tsx` na Reanimated 4 i Gesture Handler 3: surface, radius 22 u góry, shadow-md, pomiar treści `onLayout`, wysokość maks. 88% (86% dla podglądu PDF), animacja wejścia/wyjścia z `motion` tokenów, uchwyt 36×5 dp neutral-700.
  2. Dodaj tło `sheetBackdrop` (tap zamyka; `pointerEvents="none"` po zamknięciu), `Gesture.Pan` z progiem zamknięcia (prędkość lub 30% wysokości) i obsługę `BackHandler` na Androidzie.
  3. Zintegruj `react-native-keyboard-controller` (`KeyboardAvoidingView` w arkuszu) i safe area dolną (padding 34 dp lub inset).
  4. Napisz `SheetHeader.tsx` (tytuł 20 dp/500 + przycisk zamknięcia 30 dp `x`) i `ConfirmSheet.tsx` (ikona w kole 52 dp accent-900, tytuł, tekst, przyciski w kolumnie 48 dp).
  5. Dodaj mechanizm „drugiego kroku” (`useSheetStep`, przejście 180 ms) dla potwierdzeń usunięcia w tym samym arkuszu.
  6. Ustaw modalność a11y (`accessibilityViewIsModal`, fokus na tytule po otwarciu, powrót fokusu po zamknięciu) i hook `useSheet()` do otwierania arkuszy z ekranów.
  7. Napisz testy RNTL (zamknięcie tłem i „×”, drugi krok) i scenariusz Maestro w DevCatalog (gest w dół, klawiatura).
  8. Dopisz lub uruchom przypadki TC-UI-011, TC-UI-012, TC-A11Y-011 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  9. Otwórz PR `IMP-206: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-UI-011, TC-UI-012, TC-A11Y-011 przechodzą
  - [ ] Zgodność z tokenami Nocturne i checklistą 09-design-system §7; zrzut w DevCatalog/ekranie dołączony do PR
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 16 h (XL) | **Ryzyko:** wysokie

### IMP-207 – Pola formularzy: TextField, NumberField, TextArea, ChoiceChip, pole daty
- **Epik / obszar:** EP-06 Mobile – fundamenty i design system Nocturne | **Rola:** MOB
- **Cel:** Formularze organizatora i komentarz sędziego mają pola z etykietą, błędem pod polem i walidacją ze schematów zod, w tym wygodny wybór daty i wagi bez wpisywania przecinka.
- **Zakres:** Pola z etykietą, błędem (accent-300 + ikona), obrys neutral-600, fokus accent; `NumberField` (przecinek/kropka, stepper 0,5); `TextArea` z licznikiem; `ChoiceChipGroup` (radiogroup); `DateRangeField` (natywny picker, „Jeden dzień / Kilka dni”, czyszczenie) z formatowaniem z `@polechamp/i18n`; integracja z walidacją zod (react-hook-form + resolver); **Poza zakresem:** –
- **Zależności:** [IMP-203](#imp-203--komponent-button-primary-secondary-ghost-iconround), [IMP-069](02-pakiety-wspoldzielone.md#imp-069--polechampi18n--infrastruktura-liczba-mnoga-formatery)
- **Odwołania:** FR-202, FR-305, FR-307, FR-605, NFR-202, UI-04, [TC-UI-007](../03-test-plans/01-testy-jednostkowe.md#tc-ui-007)…010, [TC-UI-027](../03-test-plans/01-testy-jednostkowe.md#tc-ui-027)
- **Kroki:**
  1. Napisz `src/ui/form/TextField.tsx` (etykieta 12 dp tekst 70%, wysokość min. 44 dp, tekst 15 dp, tło `bg`, obrys neutral-600 → accent przy fokusie, błąd 12 dp accent-300 z `warning-circle`, `accessibilityHint` z błędem).
  2. Napisz `NumberField.tsx` (klawiatura numeryczna, akceptacja przecinka i kropki, opcjonalny stepper −/+ z krokiem 0,5) i `TextArea.tsx` (min. 76 dp, licznik „{n}/500” od 400 znaków).
  3. Napisz `ChoiceChipGroup.tsx` (`accessibilityRole="radiogroup"`, chip 8/13, radius 999; wybrany accent-900/accent-200 z obrysem accent; stan nieaktywny z podpisem).
  4. Napisz `DateRangeField.tsx`: natywny picker (`@react-native-community/datetimepicker`), przełącznik „Jeden dzień / Kilka dni”, wartość z `formatTournamentDate`, czyszczenie ikoną `x-circle`.
  5. Napisz `useZodForm(schema)` (react-hook-form + `@hookform/resolvers/zod`) mapujący kody pól na teksty `errors.field.<CODE>` i błędy API `errors[]` na pola.
  6. Napisz testy RNTL (błąd pod polem, przecinek w wadze, chip nieaktywny) i dodaj sekcję „Formularze” w DevCatalog.
  7. Dopisz lub uruchom przypadki TC-UI-007…010, TC-UI-027 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  8. Otwórz PR `IMP-207: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-UI-007…010, TC-UI-027 przechodzą
  - [ ] Zgodność z tokenami Nocturne i checklistą 09-design-system §7; zrzut w DevCatalog/ekranie dołączony do PR
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 12 h (L) | **Ryzyko:** średnie

### IMP-208 – Toast, Banner, Dialog
- **Epik / obszar:** EP-06 Mobile – fundamenty i design system Nocturne | **Rola:** MOB
- **Cel:** Potwierdzenia, błędy i stany specjalne (blokada, odrzucenia, offline, weryfikacja e-maila) są komunikowane jednym systemem toastów, banerów i dialogów, ogłaszanym przez czytnik ekranu.
- **Zakres:** `ToastHost` (2,2 s, zastępowanie, warianty, ogłaszanie a11y, pozycja nad safe area), `Banner` (locked/rejected/offline/emailVerify), `Dialog` (tablet); **Poza zakresem:** –
- **Zależności:** [IMP-203](#imp-203--komponent-button-primary-secondary-ghost-iconround)
- **Odwołania:** NFR-206, FR-609, FR-805, FR-807, FR-808, [TC-UI-013](../03-test-plans/01-testy-jednostkowe.md#tc-ui-013)…015
- **Kroki:**
  1. Napisz `src/ui/Toast.tsx` z `ToastHost` w layoutcie i API `toast.success(key, params)` / `toast.error(key)`: kapsuła 28 dp nad dolną krawędzią safe area, surface + shadow-md, 2,2 s, nowy toast zastępuje poprzedni, ikona `check-circle` fill accent lub `warning-circle` accent-300.
  2. Ogłaszaj toasty `AccessibilityInfo.announceForAccessibility` i blokuj podwójne wyświetlenie tego samego klucza w ciągu 300 ms.
  3. Napisz `src/ui/Banner.tsx` z wariantami `locked` (`lock-simple`), `rejected` (`warning-circle`, tapowalny), `offline` (`cloud-slash`), `emailVerify` (z akcją „Wyślij kod ponownie”) w stylu accent-900/accent-200, radius md, padding 8/10.
  4. Napisz `src/ui/Dialog.tsx` (tablet: szer. ≤ 440 dp, surface, radius lg, shadow-lg, tło neutral-900 50%, akcje do prawej).
  5. Napisz testy RNTL (zastępowanie toastów, ogłoszenie, akcja banera) i dodaj sekcję w DevCatalog.
  6. Dopisz lub uruchom przypadki TC-UI-013…015 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-208: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-UI-013…015 przechodzą
  - [ ] Zgodność z tokenami Nocturne i checklistą 09-design-system §7; zrzut w DevCatalog/ekranie dołączony do PR
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 8 h (M) | **Ryzyko:** niskie

### IMP-209 – SegmentedControl, StickyActionBar, ScreenHeader/BackLink, kontenery ekranów
- **Epik / obszar:** EP-06 Mobile – fundamenty i design system Nocturne | **Rola:** MOB
- **Cel:** Każdy ekran organizatora ma tę samą ramę: nagłówek z linkiem wstecz, bezpieczne marginesy, jeden przewijany kontener i przyklejony pasek akcji, a na tablecie wyśrodkowaną kolumnę 480 dp.
- **Zakres:** `SegmentedControl` (UI-08), `StickyActionBar` (gradient, safe area), `ScreenHeader`/`BackLink`, `ScreenContainer` (safe area UI-10, brak pasków przewijania UI-09, przewinięcie na górę po zmianie ekranu, maks. szerokość 480 dp na tabletach – TL-24); **Poza zakresem:** –
- **Zależności:** [IMP-203](#imp-203--komponent-button-primary-secondary-ghost-iconround)
- **Odwołania:** UI-08, UI-09, UI-10, TL-24, [TC-UI-006](../03-test-plans/01-testy-jednostkowe.md#tc-ui-006), [TC-UI-024](../03-test-plans/01-testy-jednostkowe.md#tc-ui-024), [TC-DESIGN-010](../03-test-plans/06-testy-zgodnosci-z-designem.md#tc-design-010)
- **Kroki:**
  1. Napisz `src/ui/layout/ScreenContainer.tsx`: safe area górna (inset + 10 dp lub wiersz nawigacji 44 dp – UI-10), marginesy 16 dp, `ScrollView` bez wskaźników (UI-09), przewinięcie na górę po zmianie ekranu (`useFocusEffect`), poświata radialna tła.
  2. Ogranicz szerokość treści do 480 dp i wyśrodkuj ją na tablecie w trybie organizatora (TL-24) przez `useWindowDimensions`.
  3. Napisz `ScreenHeader.tsx` i `BackLink.tsx` („‹ Turnieje” / „‹ Turniej”: `caret-left` 20 dp + 15 dp accent, padding 6) z przyciskami akcji po prawej (36 dp).
  4. Napisz `SegmentedControl.tsx` (siatka kolumn, padding 3, radius 11, licznik 11 dp opacity 0,7, aktywny accent 14% nad bg z obrysem accent-700 – UI-08, `accessibilityRole="tablist"`).
  5. Napisz `StickyActionBar.tsx` (padding 18/16/34, gradient bg 72% → przezroczysty, safe area dolna) i odstęp treści równy wysokości paska.
  6. Napisz testy RNTL (rola tablist, przewinięcie na górę) i dodaj sekcję w DevCatalog.
  7. Dopisz lub uruchom przypadki TC-UI-006, TC-UI-024, TC-DESIGN-010 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  8. Otwórz PR `IMP-209: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-UI-006, TC-UI-024, TC-DESIGN-010 przechodzą
  - [ ] Zgodność z tokenami Nocturne i checklistą 09-design-system §7; zrzut w DevCatalog/ekranie dołączony do PR
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 8 h (M) | **Ryzyko:** niskie

### IMP-210 – Ikony Phosphor
- **Epik / obszar:** EP-06 Mobile – fundamenty i design system Nocturne | **Rola:** MOB
- **Cel:** Ikony w aplikacji pochodzą z jednego zestawu Phosphor i tylko z listy zatwierdzonej w design systemie.
- **Zakres:** `phosphor-react-native` 3 – komponent `Icon` z listą dozwolonych nazw (09-design-system §3, w tym `device-rotate`) i wariantem fill; **Poza zakresem:** –
- **Zależności:** [IMP-201](#imp-201--metro-pnpm-workspace-i-środowisko-testów-mobile)
- **Odwołania:** 09-design-system §3
- **Kroki:**
  1. Napisz `src/ui/Icon.tsx` opakowujący `phosphor-react-native` 3 z propem `name` typu unii nazw z 09-design-system §3 (w tym `device-rotate`, `cloud-check`, `cloud-slash`, `arrows-clockwise`, `link-break`).
  2. Dodaj propy `size` (12–28 dp), `color` (rola z tokenów) i `weight` (`regular`/`fill`) oraz `accessibilityElementsHidden` domyślnie (ikony dekoracyjne).
  3. Wygeneruj mapę `iconMap` importującą tylko używane ikony (mniejszy bundel) i test, że każda nazwa z listy design systemu ma odpowiednik.
  4. Dodaj sekcję „Ikony” w DevCatalog (siatka wszystkich ikon w wariantach).
  5. Otwórz PR `IMP-210: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] Lint/TS blokuje nazwę spoza listy
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 2 h (XS) | **Ryzyko:** niskie

### IMP-211 – Splash z animacją tancerki (PoleSpinner)
- **Epik / obszar:** EP-06 Mobile – fundamenty i design system Nocturne | **Rola:** MOB
- **Cel:** Start aplikacji pokazuje animację tancerki z designu z paskiem postępu i komunikatami etapów, płynnie na tabletach referencyjnych i statycznie przy „Ogranicz ruch”.
- **Zakres:** Wg decyzji spike IMP-606: port `design/pole-spinner.js` na `@shopify/react-native-skia` 2.14 (siatka 80×70, 24 kl./s, pętla 5,5 s) albo sekwencja klatek; rozmiary 340×300 / 470×410; wejście fade 0,9 s; „Ogranicz ruch” – statyczna klatka; komponent `SplashScreen` z paskiem postępu i komunikatami sterowanymi etapami ładowania; **Poza zakresem:** Logika ładowania (IMP-254, IMP-302)
- **Zależności:** [IMP-202](#imp-202--theme-fonty-inter-i-komponenty-tekstu), [IMP-606](14-spike.md#imp-606--spike-animacja-splash--skia-vs-sekwencja-klatek-limit-8-h)
- **Odwołania:** FR-210, FR-506, SCR-ORG-00, SCR-JDG-00, NFR-207, R-07, [TC-UI-017](../03-test-plans/01-testy-jednostkowe.md#tc-ui-017), [TC-DESIGN-016](../03-test-plans/06-testy-zgodnosci-z-designem.md#tc-design-016), [TC-DESIGN-019](../03-test-plans/06-testy-zgodnosci-z-designem.md#tc-design-019)
- **Kroki:**
  1. Zaimplementuj `src/ui/splash/PoleSpinner.tsx` wg decyzji spike IMP-606: port `design/pole-spinner.js` na `@shopify/react-native-skia` 2.14 (siatka 80×70, 24 kl./s, pętla 5,5 s, `useClock`) albo sekwencja klatek w atlasie.
  2. Napisz `SplashScreen.tsx`: poświata radialna accent-900 85%, PoleSpinner (340×300 organizator / 470×410 sędzia), logo 36 dp + „PoleChamp”, podtytuł, pasek 160×3 dp z poświatą i komunikat 12 dp.
  3. Dodaj animacje wejścia: fade spinnera 0,9 s, rise 0,6 s elementów 2–4 z opóźnieniami 0,2/0,35 s, wyjście fade 0,5 s.
  4. Steruj paskiem i komunikatem propem `stage` (np. `loadingTournaments` → `syncingResults` → `ready`), z minimalnym czasem 1,2 s i maksymalnym 4,3 s.
  5. Przy `useReducedMotion()` pokaż statyczną klatkę i ogłoś komunikat etapu (`accessibilityLiveRegion="polite"`).
  6. Ukryj natywny splash (`SplashScreen.hideAsync`) dopiero po pierwszej klatce komponentu i dodaj przypadek w DevCatalog.
  7. Dopisz lub uruchom przypadki TC-UI-017, TC-DESIGN-016, TC-DESIGN-019 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  8. Otwórz PR `IMP-211: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-UI-017 (splash), TC-DESIGN-016/019 (klatka) przechodzą; 60 fps na Tab A8
  - [ ] Zgodność z tokenami Nocturne i checklistą 09-design-system §7; zrzut w DevCatalog/ekranie dołączony do PR
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 16 h (XL) | **Ryzyko:** średnie

### IMP-212 – DevCatalog – katalog komponentów (tylko development)
- **Epik / obszar:** EP-06 Mobile – fundamenty i design system Nocturne | **Rola:** MOB
- **Cel:** Zespół i projektant przeglądają wszystkie komponenty we wszystkich stanach w jednym ekranie, który jest też źródłem zrzutów do regresji wizualnej.
- **Zakres:** Trasa `/(dev)/catalog` wykluczona z buildów produkcyjnych, wszystkie komponenty w stanach z 09-design-system §4, przełączniki skali czcionki i „Ogranicz ruch”; **Poza zakresem:** Pipeline zrzutów (IMP-459)
- **Zależności:** [IMP-205](#imp-205--karty-listy-grupowane-nagłówki-sekcji-stany-puste-szkielety), [IMP-206](#imp-206--komponent-sheet-bottom-sheet--implementacja-własna), [IMP-207](#imp-207--pola-formularzy-textfield-numberfield-textarea-choicechip-pole-daty), [IMP-208](#imp-208--toast-banner-dialog), [IMP-209](#imp-209--segmentedcontrol-stickyactionbar-screenheaderbacklink-kontenery-ekranów)
- **Odwołania:** NFR-208, NFR-210, [TC-DESIGN-023](../03-test-plans/06-testy-zgodnosci-z-designem.md#tc-design-023)
- **Kroki:**
  1. Utwórz trasę `app/(dev)/catalog/[section].tsx` dostępną tylko gdy `__DEV__` lub profil `preview` (strażnik w `_layout` + wykluczenie w `app.config.ts` dla `production`).
  2. Napisz rejestr `src/dev/catalog/registry.ts` (sekcja → lista przypadków `{ id, render }`) uzupełniany przez zadania komponentów.
  3. Dodaj przełączniki: skala czcionki (1,0/1,3), „Ogranicz ruch”, szerokość okna (telefon/tablet), pseudolokalizacja.
  4. Nadaj każdemu przypadkowi `testID` `catalog-<sekcja>-<id>` i deep link `polechamp://dev/catalog/<sekcja>?case=<id>` dla Maestro.
  5. Dodaj test, że build `production` nie zawiera trasy `(dev)` (sprawdzenie manifestu tras po `expo export`).
  6. Dopisz lub uruchom przypadki TC-DESIGN-023 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  7. Dodaj stany do DevCatalog lub zrzuty ekranu (telefon/tablet, iOS/Android) do PR; sprawdź etykiety a11y i skalowanie tekstu.
  8. Otwórz PR `IMP-212: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-DESIGN-023 ma kompletne źródło zrzutów; TC-SEC-018 potwierdza brak w produkcji
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** niskie

### IMP-213 – SCR-SYS-01 – wybór trybu, forma urządzenia, orientacja per tryb
- **Epik / obszar:** EP-06 Mobile – fundamenty i design system Nocturne | **Rola:** MOB
- **Cel:** Przy pierwszym uruchomieniu użytkownik wybiera tryb Organizatora albo Tabletu sędziowskiego, a aplikacja pamięta wybór, blokuje tryb sędziego na zbyt małych ekranach i pilnuje orientacji.
- **Zakres:** Ekran wyboru trybu po splashu, zapis trybu (MMKV), `deviceCapabilities` (NFR-702), `expo-screen-orientation` (organizator pion na telefonie, sędzia poziom), nakładka orientacji (TL-23) jako komponent `OrientationGuard`, routing grup `(org)` / `(judge)`; **Poza zakresem:** –
- **Zależności:** [IMP-205](#imp-205--karty-listy-grupowane-nagłówki-sekcji-stany-puste-szkielety), [IMP-209](#imp-209--segmentedcontrol-stickyactionbar-screenheaderbacklink-kontenery-ekranów)
- **Odwołania:** SCR-SYS-01, NFR-702, ADR-013, TL-23, TL-24, [TC-STATE-016](../03-test-plans/01-testy-jednostkowe.md#tc-state-016), [TC-UI-030](../03-test-plans/01-testy-jednostkowe.md#tc-ui-030), [TC-E2E-ORG-001](../03-test-plans/03-testy-e2e.md#tc-e2e-org-001), [TC-E2E-JDG-029](../03-test-plans/03-testy-e2e.md#tc-e2e-jdg-029)
- **Kroki:**
  1. Napisz ekran `app/(system)/mode.tsx` (SCR-SYS-01): logo, „Jak będziesz używać tego urządzenia?”, karty „Jestem organizatorem” (`device-mobile`) i „Tablet sędziowski” (`device-tablet`).
  2. Napisz `src/features/system/deviceCapabilities.ts` (NFR-702: najmniejszy wymiar ≥ 600 dp i szerokość w poziomie ≥ 1024 dp); poza progiem karta tabletu nieaktywna z podpisem „Panel sędziego wymaga tabletu.”.
  3. Zapisz tryb w MMKV (`app.mode`) i przekieruj: organizator → SCR-ORG-13/SCR-ORG-01, sędzia → SCR-JDG-06/SCR-JDG-00.
  4. Ustaw orientację przez `expo-screen-orientation`: telefon organizatora `PORTRAIT_UP`, sędzia `LANDSCAPE`, tablet organizatora bez blokady.
  5. Napisz `OrientationGuard.tsx` (TL-23): przy szerokości okna < 1024 dp lub pionie w trybie sędziego pełnoekranowa nakładka (`device-rotate`, „Obróć tablet do pozycji poziomej.”, „Panel sędziego działa tylko w poziomie.”) bez odmontowania formularza.
  6. Napisz testy RNTL (nieaktywna karta na telefonie, nakładka przy zmianie wymiarów) i dodaj przypadki w DevCatalog.
  7. Dopisz lub uruchom przypadki TC-STATE-016, TC-UI-030, TC-E2E-ORG-001, TC-E2E-JDG-029 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  8. Otwórz PR `IMP-213: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-STATE-016, TC-UI-030, TC-E2E-ORG-001, TC-E2E-JDG-029 przechodzą
  - [ ] Ekran zgodny z SCR-SYS-01 (teksty wiążące z kluczy i18n, stany: ładowanie/pusty/błąd/offline); przegląd projektanta dla ekranów z designu
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 6 h (M) | **Ryzyko:** średnie

### IMP-214 – Warstwa API klienta: tokeny, odświeżanie, błędy
- **Epik / obszar:** EP-06 Mobile – fundamenty i design system Nocturne | **Rola:** MOB
- **Cel:** Wszystkie wywołania API z aplikacji automatycznie dołączają token, odświeżają go raz dla wielu równoległych żądań, przekazują identyfikatory i zamieniają błędy na komunikaty PL.
- **Zakres:** Middleware `openapi-fetch`: nagłówek Authorization, odświeżanie tokenu `org` (pojedyncze, kolejka żądań), `X-Request-Id`, `X-Min-App-Version` → sygnał aktualizacji, mapowanie problem+json na błędy domenowe i teksty i18n, `Idempotency-Key` dla POST, timeouty; **Poza zakresem:** –
- **Zależności:** [IMP-067](02-pakiety-wspoldzielone.md#imp-067--klient-api-dla-aplikacji-typy-z-openapi), [IMP-069](02-pakiety-wspoldzielone.md#imp-069--polechampi18n--infrastruktura-liczba-mnoga-formatery)
- **Odwołania:** ADR-003, ADR-008, NFR-706, US-011, [TC-I18N-007](../03-test-plans/01-testy-jednostkowe.md#tc-i18n-007)
- **Kroki:**
  1. Napisz `src/data/api/auth-middleware.ts` dla `openapi-fetch`: nagłówek `Authorization` z magazynu tokenów (`org` w SecureStore, `device`/`judge` w pamięci + SecureStore).
  2. Obsłuż `401 UNAUTHENTICATED` jednym odświeżeniem (`POST /v1/auth/refresh` z blokadą single-flight, kolejka oczekujących żądań); `TOKEN_REUSED` → wylogowanie i SCR-ORG-13 z toastem „Sesja wygasła. Zaloguj się ponownie.”.
  3. Dodaj nagłówki `X-Request-Id` (UUIDv7) i `Idempotency-Key` dla `POST` (generowany raz na akcję użytkownika i ponawiany przy retry).
  4. Czytaj `X-Min-App-Version` i porównuj z wersją aplikacji (`expo-application`); niższa → sygnał `updateRequired` w magazynie stanu.
  5. Napisz `src/data/api/errors.ts`: `ApiError` z `code`, `status`, `fieldErrors`, `retryAfterSeconds` i `messageKey` = `errors.<CODE>`; błąd sieci i timeout (15 s, `AbortController`) → `NETWORK` („Brak połączenia z internetem.”).
  6. Napisz testy z `msw`: równoległe żądania przy wygasłym tokenie (jedno odświeżenie), mapowanie `START_NUMBER_TAKEN` na pole `startNumber`.
  7. Dopisz lub uruchom przypadki TC-I18N-007 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  8. Otwórz PR `IMP-214: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] Testy jednostkowe odświeżania i mapowania błędów; TC-I18N-007 w aplikacji
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 8 h (M) | **Ryzyko:** średnie

### IMP-215 – TanStack Query, cache MMKV i tryb offline organizatora
- **Epik / obszar:** EP-06 Mobile – fundamenty i design system Nocturne | **Rola:** MOB
- **Cel:** Ekrany organizatora wyświetlają ostatnio pobrane dane także bez sieci, a przy braku połączenia pokazują baner i blokują zapisy.
- **Zakres:** `QueryClient` z persystencją MMKV (`react-native-mmkv` 4), klucze zapytań, NetInfo + stan „online” (HTTP), hook `useCanWrite()`, globalny baner offline, czyszczenie cache przy wylogowaniu; **Poza zakresem:** Integracja ekranów (IMP-278)
- **Zależności:** [IMP-214](#imp-214--warstwa-api-klienta-tokeny-odświeżanie-błędy), [IMP-208](#imp-208--toast-banner-dialog)
- **Odwołania:** FR-807, FR-105, US-084, [TC-STATE-011](../03-test-plans/01-testy-jednostkowe.md#tc-state-011)
- **Kroki:**
  1. Skonfiguruj `src/data/query/queryClient.ts` (TanStack Query 5: `staleTime` 30 s, `gcTime` 24 h, 2 ponowienia poza 4xx) z persystencją `@tanstack/query-async-storage-persister` na MMKV 4 (`react-native-mmkv`).
  2. Zdefiniuj fabrykę kluczy `src/data/query/keys.ts`: `['tournaments', status]`, `['tournament', id]`, `['category', id]`, `['entries', categoryId, q]`, `['results', categoryId]`, `['judges', tournamentId]`, `['devices', tournamentId]`, `['rejected', tournamentId]`, `['scoreSheets', entryId]`, `['me']`, `['appConfig']`.
  3. Napisz `src/data/network/useOnline.ts`: „online” = połączony WebSocket lub udane żądanie HTTP < 60 s (TL-45), NetInfo tylko jako wyzwalacz ponownej próby.
  4. Napisz hook `useCanWrite()` (online i turniej nie `FINISHED`) używany przez przyciski zapisu (opacity 0,45 gdy `false`).
  5. Dodaj globalny `OfflineBanner` pod wierszem nawigacji („Brak połączenia — dane mogą być nieaktualne. Zmiany są niedostępne.”).
  6. Czyść cache i persystencję przy wylogowaniu i usunięciu konta; napisz testy odtworzenia cache po restarcie.
  7. Dopisz lub uruchom przypadki TC-STATE-011 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  8. Otwórz PR `IMP-215: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-STATE-011 przechodzi
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 8 h (M) | **Ryzyko:** niskie

### IMP-216 – Klient realtime z fallbackiem na odpytywanie
- **Epik / obszar:** EP-06 Mobile – fundamenty i design system Nocturne | **Rola:** MOB
- **Cel:** Organizator widzi zmiany na żywo (postęp, wyniki, tablety), a tablet reaguje na blokady i zmiany konfiguracji w 2–3 s; przy zablokowanym WSS obie strony przechodzą na odpytywanie.
- **Zakres:** `socket.io-client` 4.8 (`transports: ["websocket"]`, `auth` jako funkcja, backoff z rozrzutem), `subscribe`, obsługa `auth.expired`, ponowne połączenie po powrocie z tła + odświeżenie, ignorowanie starszych wersji; odpytywanie 15 s (organizator) / 30 s (tablet) przy braku WS; mapowanie zdarzeń na unieważnienie zapytań (organizator) i `pull` (tablet); **Poza zakresem:** –
- **Zależności:** [IMP-214](#imp-214--warstwa-api-klienta-tokeny-odświeżanie-błędy), [IMP-065](02-pakiety-wspoldzielone.md#imp-065--contracts-zdarzenia-realtime), [IMP-604](14-spike.md#imp-604--spike-socketio-przez-alb-i-klient-rn-w-tle-limit-8-h)
- **Odwołania:** FR-703, FR-804, NFR-303, ADR-003, [TC-SYNC-027](../03-test-plans/04-testy-offline-i-synchronizacji.md#tc-sync-027), [TC-SYNC-018](../03-test-plans/04-testy-offline-i-synchronizacji.md#tc-sync-018)
- **Kroki:**
  1. Napisz `src/data/realtime/socket.ts`: `io(env.wsUrl + '/rt', { transports: ['websocket'], auth: cb => cb({ token: currentToken() }), reconnectionDelayMax: 10_000, randomizationFactor: 0.5 })` z typami `ServerToClientEvents`.
  2. Po połączeniu emituj `subscribe { tournamentId }`; na `auth.expired` odśwież token i połącz ponownie; po powrocie z tła (`AppState`) połącz i wymuś odświeżenie.
  3. Napisz `src/data/realtime/orgBindings.ts`: `progress.updated` → `setQueryData(['tournament', id])` bez zapytania; `results.updated` → `invalidateQueries(['results', categoryId])`; `device.status`, `device.paired` → `['devices', id]`; `rejected.created` → `['rejected', id]`.
  4. Napisz `src/data/realtime/judgeBindings.ts`: `sync.hint`, `category.*`, `config.changed`, `judges.changed` → `SyncEngine.pull()`; `category.locked` → natychmiastowy lokalny tryb tylko do odczytu; `session.revoked` → obsługa sesji (IMP-306).
  5. Ignoruj zdarzenia ze starszą `version`/`resultsVersion`/`cursor` niż znana lokalnie.
  6. Dodaj fallback: brak połączenia WS przez 20 s → odpytywanie `GET /v1/tournaments/{id}` co 15 s (organizator) lub `sync/changes` co 30 s (tablet); wyłączenie po odzyskaniu WS.
  7. Napisz testy z mockiem serwera Socket.IO (unieważnienia zapytań, fallback, ignorowanie starych wersji).
  8. Dopisz lub uruchom przypadki TC-SYNC-027, TC-SYNC-018 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  9. Otwórz PR `IMP-216: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-SYNC-027 przechodzi; TC-SYNC-018 (część aplikacyjna)
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 8 h (M) | **Ryzyko:** średnie

### IMP-217 – Ekran wymuszonej aktualizacji
- **Epik / obszar:** EP-06 Mobile – fundamenty i design system Nocturne | **Rola:** MOB
- **Cel:** Gdy wersja aplikacji jest niższa niż minimalna, użytkownik widzi ekran aktualizacji z linkiem do sklepu, a niewysłane oceny tabletu nadal są wysyłane.
- **Zakres:** Ekran „Zaktualizuj aplikację” (link do sklepu) przy `minAppVersion`; wysyłka outboxu działa dalej; wersja aplikacji widoczna w SCR-ORG-21; **Poza zakresem:** –
- **Zależności:** [IMP-214](#imp-214--warstwa-api-klienta-tokeny-odświeżanie-błędy), [IMP-120](03-backend-konto-i-konfiguracja-turnieju.md#imp-120--konfiguracja-aplikacji-i-minimalna-wersja)
- **Odwołania:** NFR-706, [TC-SYNC-034](../03-test-plans/04-testy-offline-i-synchronizacji.md#tc-sync-034)
- **Kroki:**
  1. Napisz `src/features/system/update-required.tsx`: ikona, tytuł i tekst z kluczy i18n, przycisk primary „Zaktualizuj aplikację” (`Linking.openURL` do App Store / Google Play).
  2. Wyświetlaj ekran jako nakładkę w root layoutcie, gdy `updateRequired` (z `X-Min-App-Version` lub `GET /v1/app-config` → `minAppVersion`).
  3. Nie zatrzymuj `SyncEngine`, dopóki wersja ≥ `minSyncAppVersion`; poniżej – pokaż liczbę niewysłanych ocen i instrukcję.
  4. Pokaż wersję aplikacji (`expo-application` `nativeApplicationVersion` + numer buildu) w SCR-ORG-21 i na ekranie aktualizacji.
  5. Dopisz lub uruchom przypadki TC-SYNC-034 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  6. Dodaj stany do DevCatalog lub zrzuty ekranu (telefon/tablet, iOS/Android) do PR; sprawdź etykiety a11y i skalowanie tekstu.
  7. Otwórz PR `IMP-217: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-SYNC-034 przechodzi
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 3 h (S) | **Ryzyko:** niskie

### IMP-218 – Integracja Sentry w aplikacji
- **Epik / obszar:** EP-06 Mobile – fundamenty i design system Nocturne | **Rola:** MOB
- **Cel:** Awarie aplikacji trafiają do Sentry z wersją wydania i nawigacją, bez danych osobowych, a czas startu jest mierzony.
- **Zakres:** `@sentry/react-native` 8: init z wydaniem EAS, `beforeSend` usuwające PII, nawigacja, wydajność startu (znacznik TTI dla NFR-101); **Poza zakresem:** –
- **Zależności:** [IMP-021](01-fundamenty-i-devops.md#imp-021--sentry-region-ue--api-i-mobile), [IMP-200](#imp-200--inicjalizacja-aplikacji-expo-sdk-58)
- **Odwołania:** NFR-308, NFR-504, NFR-101, [TC-SEC-017](../03-test-plans/05-testy-niefunkcjonalne.md#tc-sec-017)
- **Kroki:**
  1. Napisz `src/observability/sentry.ts`: `Sentry.init` (`@sentry/react-native` 8) z DSN z konfiguracji, `release`/`dist` z EAS (`Updates.updateId`), `environment` = kanał.
  2. Podłącz `beforeSend` i `beforeBreadcrumb` do wspólnego `scrubPii` z `@polechamp/contracts` (usuwanie nazwisk, komentarzy, PIN-ów, tokenów z treści i URL-i).
  3. Dodaj integrację nawigacji Expo Router (`reactNavigationIntegration`) i `tracesSampleRate: 0.1`.
  4. Dodaj znacznik TTI („time to interactive”) po pierwszym renderze listy turniejów / wyboru profilu dla NFR-101.
  5. Owiń root w `Sentry.wrap` i dodaj test jednostkowy `scrubPii` na zdarzeniu z nazwiskiem w breadcrumbie.
  6. Dopisz lub uruchom przypadki TC-SEC-017 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  7. Otwórz PR `IMP-218: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-SEC-017 (mobile) przechodzi
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 3 h (S) | **Ryzyko:** niskie

### IMP-219 – i18n w aplikacji
- **Epik / obszar:** EP-06 Mobile – fundamenty i design system Nocturne | **Rola:** MOB
- **Cel:** Wszystkie teksty aplikacji pochodzą z kluczy `@polechamp/i18n` z poprawną odmianą liczebników i datami, a literał w ekranie nie przejdzie lintera.
- **Zakres:** `react-i18next` 17 z `@polechamp/i18n`, hook `useT`, komponenty liczby mnogiej i dat, lint `no-literal-string` aktywny dla `src/features/**`; **Poza zakresem:** –
- **Zależności:** [IMP-201](#imp-201--metro-pnpm-workspace-i-środowisko-testów-mobile), [IMP-069](02-pakiety-wspoldzielone.md#imp-069--polechampi18n--infrastruktura-liczba-mnoga-formatery)
- **Odwołania:** NFR-601, NFR-603, [TC-I18N-005](../03-test-plans/01-testy-jednostkowe.md#tc-i18n-005)
- **Kroki:**
  1. Napisz `src/i18n/index.ts`: inicjalizacja `react-i18next` 17 instancją z `@polechamp/i18n` (język `pl`, bez wykrywania języka urządzenia w MVP).
  2. Napisz hook `useT(namespace)` z typowanymi kluczami (generowany typ z plików `locales/pl/*.json`).
  3. Napisz komponenty `<Plural n keyBase />` i `<TournamentDate start end />` używające `plural()` i `formatTournamentDate`.
  4. Włącz regułę `i18next/no-literal-string` dla `src/features/**` z wyjątkami (`testID`, nazwy ikon, klucze stylów) i sprawdź ją w CI.
  5. Dopisz lub uruchom przypadki TC-I18N-005 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  6. Dodaj stany do DevCatalog lub zrzuty ekranu (telefon/tablet, iOS/Android) do PR; sprawdź etykiety a11y i skalowanie tekstu.
  7. Otwórz PR `IMP-219: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-I18N-005 przechodzi w aplikacji
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 3 h (S) | **Ryzyko:** niskie

### IMP-220 – Struktura tras Expo Router i nawigacja
- **Epik / obszar:** EP-06 Mobile – fundamenty i design system Nocturne | **Rola:** MOB
- **Cel:** Aplikacja ma docelową strukturę tras dla obu trybów, strażniki trybu i sesji, obsługę linków `polechamp://` i linków uniwersalnych oraz poprawne działanie przycisku wstecz.
- **Zakres:** Grupy tras `(system)`, `(org)` (stos: lista → turniej → kategoria, arkusze jako komponenty), `(judge)` (bez stosu: kategorie ↔ kategoria), strażniki trybu i sesji, przewinięcie na górę po zmianie ekranu, obsługa linków `polechamp://` i linków uniwersalnych, przycisk wstecz Androida; **Poza zakresem:** Ekrany (EP-07, EP-08)
- **Zależności:** [IMP-213](#imp-213--scr-sys-01--wybór-trybu-forma-urządzenia-orientacja-per-tryb)
- **Odwołania:** ADR-001, 03-analiza-designu §3, UI-09, [TC-COMPAT-008](../03-test-plans/05-testy-niefunkcjonalne.md#tc-compat-008)
- **Kroki:**
  1. Utwórz `app/_layout.tsx` (providery, fonty, `ToastHost`, `OrientationGuard`, strażnik trybu przez `Redirect`) oraz grupy `app/(system)`, `app/(org)`, `app/(judge)`, `app/(dev)`.
  2. Utwórz `app/(org)/_layout.tsx` (stos: `index` lista → `t/[tournamentId]` → `c/[categoryId]`, `account`, `judges/[tournamentId]`; strażnik sesji `org` → `login`) z arkuszami jako komponentami ekranów.
  3. Utwórz `app/(judge)/_layout.tsx` (bez stosu: `splash`, `pair`, `profiles`, `pin/[judgeId]`, `categories`, `category/[categoryId]`, `revoked`; strażnik urządzenia i sesji sędziego).
  4. Skonfiguruj `scheme: "polechamp"` i `associatedDomains`/`intentFilters` dla `https://polechamp.app/reset` i `/pair`; mapuj `polechamp://pair?c=…&t=…` na SCR-JDG-06 z wypełnionym kodem i `reset?token=` na ekran nowego hasła.
  5. Obsłuż przycisk wstecz Androida: zamknięcie arkusza, potem cofnięcie w stosie organizatora; w trybie sędziego bez wyjścia z aplikacji na ekranach formularza.
  6. Napisz testy nawigacji `expo-router/testing-library` (przekierowania strażników, deep link parowania).
  7. Dopisz lub uruchom przypadki TC-COMPAT-008 w `apps/mobile/src/**/*.test.ts(x)` (Jest + RNTL) lub `apps/mobile/e2e/maestro/**`; nazwa testu zawiera ID przypadku.
  8. Dodaj stany do DevCatalog lub zrzuty ekranu (telefon/tablet, iOS/Android) do PR; sprawdź etykiety a11y i skalowanie tekstu.
  9. Otwórz PR `IMP-220: …` z listą TC i opisem testu ręcznego; po scaleniu sprawdź na `dev` lub w buildzie `preview`.
- **Definition of Done:**
  - [ ] TC-COMPAT-008 przechodzi
  - [ ] Globalna DoD spełniona ([00 §3](00-konwencje-i-definition-of-done.md#3-globalna-definition-of-done))
- **Szacunek:** 5 h (M) | **Ryzyko:** niskie


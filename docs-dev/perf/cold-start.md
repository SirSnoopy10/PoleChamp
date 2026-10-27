# Zimny start (IMP-501)

TC: [TC-PERF-001](../../docs/03-test-plans/05-testy-niefunkcjonalne.md#tc-perf-001) · NFR-101. Budżet: zimny start do pierwszego interaktywnego ekranu ≤ 3,0 s (p90) na urządzeniach referencyjnych.

## Pomiar TTI

- **Aplikacja:** `markInteractive(interactiveScreen(mode))` w `app/_layout.tsx` po zakończeniu splasha (lista turniejów / profile tabletu / wybór trybu) – miara Sentry `time_to_interactive` (ms od startu procesu, `performance.now()`) + tag `tti_screen`. Znacznik istniał od IMP-218, ale nie był wywoływany – podpięty w IMP-501 (test `src/observability/__tests__/tti.test.ts`). W Sentry: Performance → miara `time_to_interactive`, p90 per `device.model`.
- **Android:** `node tools/e2e/src/cold-start.ts <serial> 20` – `am force-stop` + `am start -W`, p90 `TotalTime` (do pierwszej klatki; splash Skia doliczany przez miarę Sentry), kod wyjścia 1 przy p90 > 3000 ms.
- **iOS:** Xcode Instruments, szablon App Launch, 10 przebiegów po ponownym uruchomieniu urządzenia (zimny cache).

## Bundel (lokalnie, `pnpm --filter @polechamp/mobile bundle:report`)

Eksport `expo export --platform android --dump-sourcemap`, wariant `production`, 27.10.2026, commit `1c56ec0` + IMP-500/501.

| Metryka | Wartość |
|---|---|
| Bajtkod Hermes (`entry-*.hbc`) | 8 435 KB |
| Moduły | 3 573 |
| Źródła modułów (suma `sourcesContent`) | 13 941 KB |

Największe pakiety (udział w źródłach): react-native 15,8%, expo-router 9,2%, zod 6,0%, Reanimated 6,0%, `@sentry/react-native` + `@sentry/core` + `@sentry/conventions` + `@sentry/browser` + `@sentry/replay` ≈ 16%, kod aplikacji 4,9%, Gesture Handler 3,2%, quick-crypto 2,8% (+ `readable-stream` 1,4% przez strumienie szyfrów), Skia 2,3%, react-native-svg 2,1% (+ `css-tree`/`css-select`/`entities` ≈ 3% – moduł CSS eksportowany z głównego wejścia `react-native-svg`, nieużywany w aplikacji), ikony phosphor 1,2% (pojedyncze pliki – pełny zestaw nie trafia do bundla).

## Decyzje

- **Hermes bytecode:** potwierdzony (eksport `.hbc`, SDK 58 domyślnie Hermes). Bajtkod jest mapowany z pliku (mmap) i funkcje kompilowane leniwie, więc rozmiar bundla wpływa na start w ograniczonym stopniu – ważniejsze jest, co wykonuje się na starcie.
- **Leniwe grupy tras `(org)`/`(judge)`:** w Expo Router 58 leniwe ładowanie tras (`asyncRoutes`) działa w buildach produkcyjnych tylko na web; na natywnych platformach cały bajtkod jest w jednym pliku i Expo ustawia `inlineRequires: false` – wszystkie moduły (także tras drugiego trybu) wykonują się przy starcie. Odpowiednik leniwych tras to Metro `inlineRequires`: przełącznik `METRO_INLINE_REQUIRES=1` w `metro.config.js`. Koszt zmierzony lokalnie: bajtkod 8 435 → 10 486 KB (+24%, wywołania `require` w miejscach użycia). Domyślnie **wyłączony** – włączenie zależy od pomiaru A/B TTI na Tab A8 (zysk ≥ 150 ms p90 uzasadnia wzrost rozmiaru; budżet rozmiaru – IMP-506).
- **Sentry:** `Sentry.init` zostaje przed pierwszą klatką – przechwytuje awarie rozruchu (IMP-218). Integracja nawigacji z `enableTimeToInitialDisplay` zostaje (dostarcza TTID). `@sentry/replay` (260 KB źródeł) trafia do bundla przez `@sentry/browser`, nie jest inicjalizowany.
- **i18n:** słowniki to stałe obiekty w bajtkodzie (bez wczytywania plików) – odroczenie przestrzeni innych niż `common` nie zmniejsza pracy przy starcie w mierzalny sposób; bez zmian.
- **Połączenie WS:** już odroczone – organizator łączy się po zalogowaniu (`useOrgRealtime` w ekranach), tablet po synchronizacji (`connectRealtime` w `JudgeRuntime`).
- Kandydaci do redukcji rozmiaru (IMP-506): moduł CSS `react-native-svg` (alias Metro do pustego modułu), schematy `zod` z `@polechamp/contracts/openapi/routes` w bundlu aplikacji.

## Wyniki na urządzeniach (do wykonania – brak urządzeń i buildu preview)

| Urządzenie | Build | Przebiegi | `am start -W` p90 | TTI Sentry p90 | Wynik |
|---|---|---|---|---|---|
| iPhone 12 | {sha} | 10 | – | {…} | {…} |
| Pixel 6a | {sha} | 20 | {…} | {…} | {…} |
| iPad 9 | {sha} | 10 | – | {…} | {…} |
| Galaxy Tab A8 | {sha} | 20 | {…} | {…} | {…} |

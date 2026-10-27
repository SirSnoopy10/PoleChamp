# Rozmiar aplikacji (IMP-506)

TC: [TC-PERF-009](../../docs/03-test-plans/05-testy-niefunkcjonalne.md#tc-perf-009) · NFR-109 (pobranie ≤ 60 MB na iOS i Androidzie, bez niezauważonego wzrostu).

## Stan (lokalnie, 27.10.2026)

| Element | Wartość / stan |
|---|---|
| Bajtkod Hermes Android (`expo export`, production) | 8 436 KB (baza w `apps/mobile/size-baseline.json`) |
| Zasoby `assets/` | 33 KB (ikony i splash – placeholdery PNG; finalne grafiki: kompresja `oxipng`/`pngquant` przed IMP-550) |
| Fonty | tylko Inter 400 i 500 (`app/_layout.tsx`; inne grubości nieużywane – test `src/__tests__/app-size.test.ts`) |
| Ikony Phosphor | importy pojedynczych plików (`src/ui/Icon.tsx`) – 167 KB źródeł w bundlu |
| R8 / zasoby Androida | `enableMinifyInReleaseBuilds` + `enableShrinkResourcesInReleaseBuilds` (`expo-build-properties`, dodane w IMP-506) |
| Podział ABI | AAB – Google Play dostarcza tylko ABI urządzenia; APK do testów wewnętrznych – uniwersalny |

Kandydaci do redukcji bajtkodu (decyzja po pomiarze sklepowym): moduł CSS `react-native-svg` (~3% źródeł; alias Metro do pustego modułu), `@sentry/replay` przez `@sentry/browser`, schematy tras OpenAPI z `@polechamp/contracts` w aplikacji.

## Kontrola w CI

`node scripts/size-check.mjs --platform android` (job `perf` w `pr.yml`): eksport, bajtkod vs `size-baseline.json`, próg +10%. Po każdym wydaniu: zaktualizować bazę (bajtkod oraz `store.iosDownloadMb` / `store.androidDownloadMb`); wartości sklepowe > 60 MB są zgłaszane.

## Raport sklepowy (do wykonania – brak kont EAS / App Store Connect / Google Play)

1. `eas build --profile production` (iOS, Android) – rozmiar artefaktów z EAS.
2. iOS: App Thinning Size Report (Xcode Organizer → Export → „App Thinning: All compatible device variants”) – rozmiar pobrania dla iPhone 12 i iPad 9.
3. Android: Play Console → App bundle explorer → „Download size” dla Pixel 6a i Tab A8.

| Platforma | Urządzenie | Pobranie (MB) | Instalacja (MB) | Próg | Wynik |
|---|---|---|---|---|---|
| iOS | iPhone 12 | {…} | {…} | ≤ 60 | {…} |
| iOS | iPad 9 | {…} | {…} | ≤ 60 | {…} |
| Android | Pixel 6a | {…} | {…} | ≤ 60 | {…} |
| Android | Galaxy Tab A8 | {…} | {…} | ≤ 60 | {…} |

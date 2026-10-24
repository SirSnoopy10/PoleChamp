# ADR-001: Aplikacja mobilna w React Native (Expo) – jedna aplikacja, dwa tryby

- **Status:** Zaakceptowana ze zmianami przez Tech Leada 23.10.2026 (sekcja „Status: zmieniony” na końcu)
- **Data:** 2026-10-23
- **Powiązane:** [01-przeglad-architektury.md](../01-przeglad-architektury.md), [ADR-004](ADR-004-offline-first-tablet.md), [ADR-011](ADR-011-monorepo-i-wspoldzielony-silnik-punktacji.md), [NFR-7xx](../../02-specification/08-wymagania-niefunkcjonalne.md)

## Kontekst
- Aplikacja ma działać na **iOS i Androidzie**, na **telefonie** (organizator) i **tablecie w poziomie** (sędzia).
- Design (Nocturne) jest w pełni własny: ciemny motyw, obrysowane przyciski, bottom sheety, własny suwak, klawiatura PIN, animacja pixel-art na splashu (`pole-spinner.js`, canvas).
- Prototyp jest napisany w React (komponent `DCLogic`), łącznie z logiką liczenia wyników, PIN-u i nawigacji.
- Tryb sędziego wymaga solidnej lokalnej bazy (SQLite), bezpiecznego magazynu kluczy i kamery (QR do parowania).
- Mały zespół, potrzeba szybkich iteracji i aktualizacji poprawek bez pełnej publikacji w sklepach.

## Decyzja
1. **React Native z Expo** (managed workflow z dev clientem, New Architecture włączona, najnowszy stabilny Expo SDK w chwili startu), **TypeScript strict**, **Expo Router**.
2. **Jedna aplikacja „PoleChamp” z dwoma trybami**: Organizator (layout telefonu, orientacja pionowa) i Sędzia (layout tabletu, orientacja pozioma). Tryb wybierany przy pierwszym uruchomieniu i zapamiętywany per instalacja. Przełączenie trybu wymaga wylogowania lub odłączenia urządzenia.
3. Moduły: `expo-sqlite` (+ Drizzle), `expo-secure-store`, `expo-camera` (QR), `expo-sharing` / `expo-file-system` (PDF), `@react-native-community/netinfo`, `react-native-reanimated`, `react-native-gesture-handler`, `@gorhom/bottom-sheet`, `phosphor-react-native`, `@expo-google-fonts/inter`, `react-native-safe-area-context`, `@shopify/react-native-skia` (splash pixel-art przeniesiony z canvasa), `react-native-quick-crypto` (PBKDF2 natywnie).
4. Budowanie i dystrybucja przez **EAS Build / Submit**, poprawki JS przez **EAS Update** (kanały `dev` / `staging` / `production`, z polityką zamrożenia w dni zawodów).

## Rozważane alternatywy
| Opcja | Za | Przeciw | Werdykt |
|---|---|---|---|
| **Flutter** | Świetna wydajność UI, jeden kod | Dart: brak współdzielenia silnika punktacji i kontraktów z backendem TS; trzeba by przepisać logikę prototypu | Odrzucona |
| **Natywnie (Swift + Kotlin)** | Najlepsza integracja z platformą | Dwie bazy kodu, około 2× koszt, dwa zespoły | Odrzucona |
| **PWA / web na tablecie** | Brak sklepów, najprostsze wdrożenie | Ograniczone offline na iPadOS (limit i usuwanie magazynu), brak Keychain/Keystore, słabsza niezawodność w tle | Odrzucona |
| **Dwie osobne aplikacje (Organizator, Sędzia)** | Mniejsze paczki, czystsze uprawnienia | Dwa wpisy w sklepach, dwa procesy wydań, duplikacja design systemu | Odrzucona dla MVP (możliwa później, kod zorganizowany w `features/*` umożliwia podział) |
| **React Native bez Expo** | Pełna kontrola natywna | Więcej utrzymania (aktualizacje RN, konfiguracja buildów), brak EAS Update „z pudełka” | Odrzucona |

## Konsekwencje
- ➕ Logika prototypu (liczenie, PIN, nawigacja) przenosi się prawie 1:1. Silnik punktacji współdzielony z backendem ([ADR-011](ADR-011-monorepo-i-wspoldzielony-silnik-punktacji.md)).
- ➕ Szybkie poprawki JS przez OTA (z polityką wydań w dni zawodów).
- ➖ Animacja splash (canvas 2D, IK, splajny) wymaga przeniesienia na Skia. Koszt około 2–3 dni, ewentualnie wersja uproszczona (Lottie/sprite) – decyzja Tech Leada.
- ➖ Trzeba pilnować wydajności suwaków (Reanimated, worklety) na słabszych tabletach Android.
- ⚠ Ryzyko: kolizje wersji natywnych modułów przy aktualizacjach SDK – mitygacja: aktualizacja SDK tylko między sezonami zawodów i testy E2E (Maestro) na urządzeniach referencyjnych.

## Status: zmieniony – weryfikacja Tech Leada (23.10.2026)

Szczegóły i źródła: [98-weryfikacja-tech-leada.md](../98-weryfikacja-tech-leada.md) (TL-01, TL-03, TL-23).

1. **Wersja platformy:** start projektu na **Expo SDK 58** (wydany 15.10.2026; React Native 0.88, React 19.3, TypeScript ~6.0.3, Reanimated 4.7, react-native-worklets 0.13, Gesture Handler 3.3, minimum iOS 16.4, Android 7+ – my wymagamy Android 10 / API 29). SDK 57 (RN 0.86) jest planem awaryjnym, jeśli spike IMP-600 wykaże blokującą niezgodność modułu natywnego. Kolejna aktualizacja SDK – jedna, zaplanowana przed wydaniem 1.0 (IMP-507), potem tylko między sezonami.
2. **Bottom sheet:** `@gorhom/bottom-sheet` (ostatnie wydanie 5.2.14 z 09.05.2026, czyli sprzed Gesture Handler 3.0 z 28.05.2026) ma otwarte błędy z Reanimated ≥ 4.6 i blokowaniem dotyku przez tło po zamknięciu. Domyślnie budujemy **własny komponent `Sheet`** na Reanimated 4 + Gesture Handler 3 (IMP-206). Biblioteka wraca do gry tylko po pozytywnym spike'u IMP-602 (kryterium: brak błędów blokujących na iOS i Androidzie w 5 scenariuszach arkuszy z SCR-ORG-02/05/09/12/15).
3. **Moduły potwierdzone dla SDK 58:** `@shopify/react-native-skia` 2.14 (wymaga Reanimated ≥ 4 i worklets ≥ 0.7 – spełnione), `react-native-quick-crypto` 1.1.x (Nitro Modules, New Architecture), `react-native-mmkv` 4.x, `expo-sqlite`, `expo-secure-store`, `expo-camera` 58.x. Splash: decyzja Skia vs sekwencja klatek w spike'u IMP-606.
4. **Orientacja tabletu:** blokada orientacji przestaje być gwarantowana (Android 16 ignoruje ją na ekranach ≥ 600 dp dla target API 36, iPadOS 26 wycofuje `UIRequiresFullScreen`). Nowa decyzja: [ADR-013](ADR-013-orientacja-i-rozmiar-okna-tabletu.md).

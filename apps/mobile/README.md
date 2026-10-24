# @polechamp/mobile

Aplikacja mobilna PoleChamp: Expo SDK 58 (React Native 0.88), tryb Organizatora (telefon) i Sędziego (tablet) ([ADR-001](../../docs/01-architecture/adr/ADR-001-aplikacja-mobilna-react-native-expo.md)).

> Stan: szkielet monorepo (IMP-001). Projekt Expo powstaje w EP-06 (IMP-200).

## Wymagania

- Node.js ≥ 24 (docelowo 26 LTS), pnpm 12; później Expo CLI i EAS CLI.

## Uruchomienie

```bash
pnpm install
pnpm --filter @polechamp/mobile build
```

## Zmienne środowiskowe

`EXPO_PUBLIC_*` (adres API, flagy funkcji) – opis w IMP-024.

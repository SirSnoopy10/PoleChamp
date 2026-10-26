type Screens = typeof import('./CatalogScreens');

/**
 * Ekrany katalogu ładowane leniwie (TC-SEC-018). Warunek musi być zapisany wprost: w buildzie
 * produkcyjnym `__DEV__` i `EXPO_PUBLIC_APP_VARIANT` są wstawiane jako stałe, gałąź staje się
 * martwa i Metro nie dołącza `CatalogScreens` (ani sekcji) do bundla.
 */
export function loadCatalogScreens(): Screens | null {
  if (__DEV__ || process.env.EXPO_PUBLIC_APP_VARIANT === 'preview') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('./CatalogScreens') as Screens;
  }
  return null;
}

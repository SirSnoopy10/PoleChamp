type Screens = typeof import('./CatalogScreens');

/**
 * Ekrany katalogu ładowane leniwie za strażnikiem `isCatalogEnabled()` – w buildzie produkcyjnym
 * gałąź jest martwa i Metro nie dołącza katalogu do bundla (TC-SEC-018).
 */
export function loadCatalogScreens(): Screens {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('./CatalogScreens') as Screens;
}

/**
 * DevCatalog dostępny w development i w profilu `preview` (IMP-212, TC-SEC-018).
 * `EXPO_PUBLIC_APP_VARIANT` jest wstawiane przy bundlowaniu, więc w produkcji kod katalogu odpada.
 */
export function isCatalogEnabled(
  dev: boolean = __DEV__,
  variant = process.env.EXPO_PUBLIC_APP_VARIANT,
): boolean {
  return dev || variant === 'preview';
}

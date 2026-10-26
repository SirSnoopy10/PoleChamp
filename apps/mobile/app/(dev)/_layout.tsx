import { Redirect, Stack } from 'expo-router';
import { color } from '@polechamp/tokens';
import { loadCatalogScreens } from '../../src/dev/catalog/load';
import { isCatalogEnabled } from '../../src/dev/catalog/settings';

/** Grupa narzędzi deweloperskich (IMP-212): tylko development i profil `preview`. */
export default function DevLayout() {
  const screens = isCatalogEnabled() ? loadCatalogScreens() : null;
  if (!screens) return <Redirect href="/" />;
  const { CatalogSettingsProvider } = screens;
  return (
    <CatalogSettingsProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.bg } }} />
    </CatalogSettingsProvider>
  );
}

import { Redirect, Stack } from 'expo-router';
import { color } from '@polechamp/tokens';
import { CatalogSettingsProvider, isCatalogEnabled } from '../../src/dev/catalog/settings';

/** Grupa narzędzi deweloperskich (IMP-212): tylko development i profil `preview`. */
export default function DevLayout() {
  if (!isCatalogEnabled()) return <Redirect href="/" />;
  return (
    <CatalogSettingsProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.bg } }} />
    </CatalogSettingsProvider>
  );
}

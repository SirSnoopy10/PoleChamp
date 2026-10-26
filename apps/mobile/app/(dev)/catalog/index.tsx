import { loadCatalogScreens } from '../../../src/dev/catalog/load';
import { isCatalogEnabled } from '../../../src/dev/catalog/settings';

export default function CatalogIndexRoute() {
  const screens = isCatalogEnabled() ? loadCatalogScreens() : null;
  if (!screens) return null;
  const { CatalogIndex } = screens;
  return <CatalogIndex />;
}

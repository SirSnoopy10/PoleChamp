import { loadCatalogScreens } from '../../../src/dev/catalog/load';
import { isCatalogEnabled } from '../../../src/dev/catalog/settings';

export default function CatalogIndexRoute() {
  if (!isCatalogEnabled()) return null;
  const { CatalogIndex } = loadCatalogScreens();
  return <CatalogIndex />;
}

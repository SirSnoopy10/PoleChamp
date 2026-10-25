import { isCatalogEnabled } from '../../../src/dev/catalog/settings';

// `require` za strażnikiem: w buildzie produkcyjnym Metro usuwa kod katalogu (TC-SEC-018).
export default function CatalogIndexRoute() {
  if (!isCatalogEnabled()) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { CatalogIndex } =
    require('../../../src/dev/catalog/CatalogScreens') as typeof import('../../../src/dev/catalog/CatalogScreens');
  return <CatalogIndex />;
}

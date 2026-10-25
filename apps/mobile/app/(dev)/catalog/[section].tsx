import { useLocalSearchParams } from 'expo-router';
import { isCatalogEnabled } from '../../../src/dev/catalog/settings';

/** `polechamp://catalog/<sekcja>?case=<id>` – pojedynczy przypadek dla Maestro (IMP-212). */
export default function CatalogSectionRoute() {
  const { section, case: caseId } = useLocalSearchParams<{ section: string; case?: string }>();
  if (!isCatalogEnabled()) return null;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { CatalogSectionScreen } =
    require('../../../src/dev/catalog/CatalogScreens') as typeof import('../../../src/dev/catalog/CatalogScreens');
  return <CatalogSectionScreen id={section} caseId={caseId} />;
}

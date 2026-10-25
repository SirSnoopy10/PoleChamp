import { useLocalSearchParams } from 'expo-router';
import { loadCatalogScreens } from '../../../src/dev/catalog/load';
import { isCatalogEnabled } from '../../../src/dev/catalog/settings';

/** `polechamp://catalog/<sekcja>?case=<id>` – pojedynczy przypadek dla Maestro (IMP-212). */
export default function CatalogSectionRoute() {
  const { section, case: caseId } = useLocalSearchParams<{ section: string; case?: string }>();
  if (!isCatalogEnabled()) return null;
  const { CatalogSectionScreen } = loadCatalogScreens();
  return <CatalogSectionScreen id={section} caseId={caseId} />;
}

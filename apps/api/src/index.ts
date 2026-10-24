import { PACKAGE_NAME as SCORING } from '@polechamp/scoring';
import { PACKAGE_NAME as CONTRACTS } from '@polechamp/contracts';

/** Eksport kontrolny szkieletu (IMP-001): potwierdza, że API importuje pakiety współdzielone. */
export const SHARED_PACKAGES = [SCORING, CONTRACTS] as const;

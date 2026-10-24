import { PACKAGE_NAME as SCORING } from '@polechamp/scoring';
import { PACKAGE_NAME as CONTRACTS } from '@polechamp/contracts';
import { PACKAGE_NAME as TOKENS } from '@polechamp/tokens';
import { PACKAGE_NAME as I18N } from '@polechamp/i18n';

/** Eksport kontrolny szkieletu (IMP-001); aplikacja Expo powstaje w EP-06 (IMP-200). */
export const SHARED_PACKAGES = [SCORING, CONTRACTS, TOKENS, I18N] as const;

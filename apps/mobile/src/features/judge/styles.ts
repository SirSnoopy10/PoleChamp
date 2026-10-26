import type { TextStyle } from 'react-native';
import { fontFamily } from '@polechamp/tokens';

/** Waga 500 przez rodzinę fontu (Android ignoruje Inter przy jawnym `fontWeight`). */
export const MEDIUM: TextStyle = { fontFamily: fontFamily.medium };

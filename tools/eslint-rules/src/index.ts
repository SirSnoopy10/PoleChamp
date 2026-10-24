import type { ESLint } from 'eslint';
import { noRawStyleValues } from './no-raw-style-values.ts';

/** Wtyczka `polechamp` dla eslint.config.mjs (IMP-002). */
export const plugin: ESLint.Plugin = {
  meta: { name: '@polechamp/eslint-rules', version: '0.0.0' },
  rules: {
    'no-raw-style-values': noRawStyleValues,
  },
};

export default plugin;

import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';
import { noRawStyleValues } from './no-raw-style-values.ts';

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

describe('TC-TOKENS-003: polechamp/no-raw-style-values', () => {
  tester.run('no-raw-style-values', noRawStyleValues, {
    valid: [
      "import { color, space } from '@polechamp/tokens'; const s = { color: color.text, padding: space[3] };",
      'const s = { borderWidth: 1, opacity: 0.45, flex: 1, margin: 0 };',
      "const s = { fontFamily: 'Inter-Medium' };",
      "const label = 'Zatwierdź i przejdź dalej';",
      'const total = 54.3 * 2;',
    ],
    invalid: [
      { code: "const s = { color: '#fff' };", errors: [{ messageId: 'rawColor' }] },
      { code: "const s = { backgroundColor: 'rgba(0,0,0,0.5)' };", errors: [{ messageId: 'rawColor' }] },
      { code: 'const s = { padding: 13 };', errors: [{ messageId: 'rawNumber' }] },
      { code: 'const s = { marginTop: -8 };', errors: [{ messageId: 'rawNumber' }] },
      { code: "const s = { 'borderRadius': 8 };", errors: [{ messageId: 'rawNumber' }] },
      { code: "const s = { width: '12px' };", errors: [{ messageId: 'rawPx' }] },
      { code: "const s = { fontFamily: 'Roboto' };", errors: [{ messageId: 'rawFont' }] },
    ],
  });
});

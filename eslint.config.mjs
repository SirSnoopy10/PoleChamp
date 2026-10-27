// ESLint 9 flat config (IMP-002). Reguły per obszar monorepo: docs/04-implementation-plans/01-fundamenty-i-devops.md
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import polechamp from './tools/eslint-rules/src/index.ts';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/.turbo/**',
      'design/**',
      'docs/**',
      '**/.expo/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  // Skrypty k6 (IMP-461): zmienne globalne środowiska k6.
  {
    files: ['tools/k6/**/*.js'],
    languageOptions: { globals: { __ENV: 'readonly', __VU: 'readonly', __ITER: 'readonly' } },
  },
  {
    languageOptions: { globals: { ...globals.node } },
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { varsIgnorePattern: '^_', argsIgnorePattern: '^_' }],
      // Moduły NestJS to klasy z samym dekoratorem `@Module`.
      '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }],
    },
  },
  // Testy: asercja `!` po wstawieniu rekordu testowego jest czytelniejsza niż warunki.
  {
    files: [
      '**/test/**/*.ts',
      '**/*.test.{ts,tsx}',
      'packages/test-fixtures/src/**/*.ts',
      'tools/e2e/src/**/*.ts',
    ],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      // Treść odpowiedzi HTTP w testach integracyjnych jest dowolnym JSON-em.
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  // Silnik punktacji działa identycznie na serwerze i tablecie (ADR-011): zero importów platformowych.
  {
    files: ['packages/scoring/src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['node:*'], message: '@polechamp/scoring nie może zależeć od Node.js (ADR-011).' },
            {
              group: ['react-native', 'react-native/*'],
              message: '@polechamp/scoring nie może zależeć od React Native.',
            },
            { group: ['expo', 'expo-*', '@expo/*'], message: '@polechamp/scoring nie może zależeć od Expo.' },
          ],
        },
      ],
    },
  },
  // Aplikacja mobilna: teksty tylko z kluczy i18n w całym src/ i app/ (TC-I18N-005) – poza DevCatalog
  // (narzędzie zespołu, `src/dev/**` i `*.dev.tsx`) i testami.
  {
    files: ['apps/mobile/src/**/*.{ts,tsx}', 'apps/mobile/app/**/*.{ts,tsx}'],
    ignores: ['**/*.dev.tsx', 'apps/mobile/src/dev/**', '**/*.test.{ts,tsx}', '**/*.perf-test.tsx'],
    languageOptions: {
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser },
    },
    rules: {
      // eslint-plugin-i18next 6.x nie raportuje pod ESLint 9 – ten sam zakaz realizuje reguła wbudowana.
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXText[value=/[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]/]',
          message: 'Tekst w JSX musi pochodzić z klucza i18n (t(...)) – NFR-601.',
        },
        {
          selector:
            'JSXAttribute[name.name=/^(title|label|placeholder|accessibilityLabel|accessibilityHint)$/] > Literal',
          message: 'Tekst atrybutu musi pochodzić z klucza i18n (t(...)) – NFR-601.',
        },
      ],
    },
  },
  // Ekrany (src/features): style tylko z tokenów (TC-TOKENS-003); komponenty src/ui definiują wymiary.
  {
    files: ['apps/mobile/src/features/**/*.{ts,tsx}'],
    ignores: ['**/*.dev.tsx', '**/*.test.{ts,tsx}'],
    plugins: { polechamp },
    rules: { 'polechamp/no-raw-style-values': 'error' },
  },
  // Konfiguracja Expo/Metro/Jest i config pluginy aplikacji mobilnej są w CommonJS.
  {
    files: ['apps/mobile/*.js', 'apps/mobile/plugins/**/*.js'],
    languageOptions: { sourceType: 'commonjs', globals: { ...globals.node, ...globals.jest } },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  // eslint-plugin-react-native-a11y nie deklaruje zgodności z ESLint 9 – a11y sprawdzają testy RNTL
  // (role, etykiety) i przegląd DevCatalog (IMP-212).
);

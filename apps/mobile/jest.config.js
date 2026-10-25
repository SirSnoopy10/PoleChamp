// Jest 30 + jest-expo 58 (IMP-201). pnpm (isolated) trzyma pakiety pod node_modules/.pnpm/<nazwa>@…,
// więc wzorzec dopuszcza transformację także w tej ścieżce.
const TRANSFORM = [
  '(jest-)?react-native',
  '@react-native(-community)?',
  'expo(nent)?',
  '@expo(nent)?/.*',
  '@expo-google-fonts/.*',
  'expo-router',
  'react-navigation',
  '@react-navigation/.*',
  '@polechamp/.*',
  'phosphor-react-native',
  'react-native-reanimated',
  'react-native-worklets',
  'react-native-svg',
  'react-native-mmkv',
  'react-native-nitro-modules',
  'standard-navigation',
  '@sentry/.*',
  // msw 2 (testy warstwy API) – zależności tylko w ESM.
  'msw',
  '@mswjs/.*',
  'rettime',
  'until-async',
  'outvariant',
  'strict-event-emitter',
  '@open-draft/.*',
].join('|');

const expoPreset = require('jest-expo/jest-preset');

/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  // Reanimated 4 / Worklets: w Jest moduły w wariancie web (bez natywnego runtime'u workletów).
  resolver: require.resolve('react-native-reanimated/jest/resolver'),
  // Pakiety tylko ESM (`.mjs`, np. zależności msw) transformuje ten sam babel co `.js`.
  transform: { ...expoPreset.transform, '\\.mjs$': expoPreset.transform['\\.[jt]sx?$'] },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: [
    '<rootDir>/src/**/*.test.{ts,tsx}',
    '<rootDir>/app/**/*.test.{ts,tsx}',
    '<rootDir>/plugins/**/*.test.js',
  ],
  testPathIgnorePatterns: ['/node_modules/', '\\.perf-test\\.tsx$'],
  transformIgnorePatterns: [`node_modules/(?!(\\.pnpm/[^/]+/node_modules/)?(${TRANSFORM}))`],
  moduleNameMapper: {
    '^expo-sqlite$': '<rootDir>/src/test-utils/sqlite-mock.ts',
  },
};

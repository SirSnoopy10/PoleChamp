// babel-preset-expo dołącza plugin Reanimated/Worklets i Expo Router (SDK 58).
// Produkcja: bez `console.*` poza `console.error` (Sentry) – IMP-402, MASVS-CODE, TC-SEC-018.
const productionPlugins = [['transform-remove-console', { exclude: ['error'] }]];
// Preset z zależności `expo` (nie bezpośredniej zależności aplikacji): Metro uruchamiany przez Gradle
// (`createBundleReleaseJsAndAssets`, `createReleaseUpdatesResources`) nie znajdował go po nazwie (IMP-715).
const expoPreset = require.resolve('babel-preset-expo', { paths: [require.resolve('expo/package.json')] });

module.exports = (api) => {
  const production = api.cache.using(() => process.env.NODE_ENV) === 'production';
  return { presets: [expoPreset], plugins: production ? productionPlugins : [] };
};

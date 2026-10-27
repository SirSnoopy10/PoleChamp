// babel-preset-expo dołącza plugin Reanimated/Worklets i Expo Router (SDK 58).
// Produkcja: bez `console.*` poza `console.error` (Sentry) – IMP-402, MASVS-CODE, TC-SEC-018.
const productionPlugins = [['transform-remove-console', { exclude: ['error'] }]];

module.exports = (api) => {
  const production = api.cache.using(() => process.env.NODE_ENV) === 'production';
  return { presets: ['babel-preset-expo'], plugins: production ? productionPlugins : [] };
};

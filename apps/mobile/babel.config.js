// babel-preset-expo dołącza plugin Reanimated/Worklets i Expo Router (SDK 58).
module.exports = (api) => {
  api.cache(true);
  return { presets: ['babel-preset-expo'] };
};

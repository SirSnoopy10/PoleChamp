import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Konfiguracja Expo SDK 58 (IMP-200, ADR-001, ADR-013).
 * Wartości zastępcze do czasu kont Apple/Google/EAS: `EAS_PROJECT_ID`, `APPLE_TEAM_ID`.
 */
const BG = '#161826';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'PoleChamp',
  slug: 'polechamp',
  scheme: 'polechamp',
  version: '0.1.0',
  runtimeVersion: { policy: 'appVersion' },
  // Blokady orientacji per tryb ustawiane w runtime (IMP-213).
  orientation: 'default',
  userInterfaceStyle: 'dark',
  backgroundColor: BG,
  icon: './assets/icon.png',
  ios: {
    bundleIdentifier: 'app.polechamp',
    supportsTablet: true,
    ...(process.env.APPLE_TEAM_ID ? { appleTeamId: process.env.APPLE_TEAM_ID } : {}),
    infoPlist: { ITSAppUsesNonExemptEncryption: false },
  },
  android: {
    package: 'app.polechamp',
    adaptiveIcon: { foregroundImage: './assets/adaptive-icon.png', backgroundColor: BG },
    blockedPermissions: [
      'android.permission.RECORD_AUDIO',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_BACKGROUND_LOCATION',
    ],
  },
  web: { bundler: 'metro', output: 'single', backgroundColor: BG },
  plugins: [
    'expo-router',
    'expo-font',
    'expo-secure-store',
    'expo-localization',
    [
      'expo-build-properties',
      {
        ios: { deploymentTarget: '16.4' },
        android: { minSdkVersion: 29, targetSdkVersion: 36, compileSdkVersion: 36 },
      },
    ],
    [
      'expo-camera',
      {
        cameraPermission: 'PoleChamp używa aparatu do zeskanowania kodu parowania tabletu.',
        microphonePermission: false,
        recordAudioAndroid: false,
      },
    ],
    [
      'expo-splash-screen',
      { image: './assets/splash-icon.png', imageWidth: 160, backgroundColor: BG, resizeMode: 'contain' },
    ],
    './plugins/with-android-resizability.js',
  ],
  experiments: { typedRoutes: true },
  extra: {
    eas: { projectId: process.env.EAS_PROJECT_ID ?? '00000000-0000-0000-0000-000000000000' },
  },
});

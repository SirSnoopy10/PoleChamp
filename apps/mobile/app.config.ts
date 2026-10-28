import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Konfiguracja Expo SDK 58 (IMP-200, ADR-001, ADR-013).
 * Wartości zastępcze do czasu kont Apple/Google/EAS: `EAS_PROJECT_ID`, `APPLE_TEAM_ID`.
 */
const BG = '#161826';
const EAS_PROJECT_ID = process.env.EAS_PROJECT_ID;
/** Sentry (region UE) – plugin tylko po ustawieniu organizacji i projektu (wysyłka source map w EAS). */
const SENTRY =
  process.env.SENTRY_ORG && process.env.SENTRY_PROJECT
    ? ([
        '@sentry/react-native/expo',
        {
          organization: process.env.SENTRY_ORG,
          project: process.env.SENTRY_PROJECT,
          url: 'https://de.sentry.io/',
        },
      ] as [string, Record<string, string>])
    : null;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'PoleChamp',
  slug: 'polechamp',
  scheme: 'polechamp',
  version: '0.1.0',
  runtimeVersion: { policy: 'appVersion' },
  // Aktualizacje EAS dopiero po założeniu projektu (EAS_PROJECT_ID); do tego czasu wyłączone.
  updates: EAS_PROJECT_ID ? { url: `https://u.expo.dev/${EAS_PROJECT_ID}` } : { enabled: false },
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
    // Linki uniwersalne /reset i /pair (apple-app-site-association w apps/site, IMP-179).
    associatedDomains: ['applinks:polechamp.app'],
  },
  android: {
    package: 'app.polechamp',
    adaptiveIcon: { foregroundImage: './assets/adaptive-icon.png', backgroundColor: BG },
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [
          { scheme: 'https', host: 'polechamp.app', pathPrefix: '/reset' },
          { scheme: 'https', host: 'polechamp.app', pathPrefix: '/pair' },
        ],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
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
        android: {
          minSdkVersion: 29,
          targetSdkVersion: 36,
          compileSdkVersion: 37,
          // IMP-506 (NFR-109): R8 i usuwanie nieużywanych zasobów w buildach release; podział ABI
          // robi Google Play (AAB).
          enableMinifyInReleaseBuilds: true,
          enableShrinkResourcesInReleaseBuilds: true,
        },
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
    // Natywny dialog daty Androida w kolorach Nocturne (UX-36; `themeVariant` działa tylko na iOS).
    // Język dialogu = język systemu (Android ignoruje `locale`).
    [
      '@react-native-community/datetimepicker',
      {
        android: {
          datePicker: {
            colorAccent: { light: '#9184d9' },
            windowBackground: { light: '#232532' },
            textColorPrimary: { light: '#e9e9ed' },
            textColorSecondary: { light: '#cfd3e5' },
          },
        },
      },
    ],
    './plugins/with-android-resizability.js',
    './plugins/with-no-backup.js',
    './plugins/with-privacy-manifest.js',
    ...(SENTRY ? [SENTRY] : []),
  ],
  extra: {
    eas: { projectId: EAS_PROJECT_ID ?? '00000000-0000-0000-0000-000000000000' },
  },
});

import type { ConfigContext, ExpoConfig } from 'expo/config';
import appConfig from '../../app.config';

const config: ExpoConfig = appConfig({ config: {} } as ConfigContext);
const plugin = (name: string) =>
  config.plugins?.find((p) => (Array.isArray(p) ? p[0] : p) === name) as [string, Record<string, unknown>];

describe('app.config.ts (IMP-200)', () => {
  it('TC-COMPAT-001: identyfikatory, tablet, orientacja w runtime, ciemny interfejs', () => {
    expect(config.ios?.bundleIdentifier).toBe('app.polechamp');
    expect(config.android?.package).toBe('app.polechamp');
    expect(config.ios?.supportsTablet).toBe(true);
    expect(config.orientation).toBe('default');
    expect(config.userInterfaceStyle).toBe('dark');
  });

  it('TC-COMPAT-001: iOS 16.4, Android minSdk 29 / target 36', () => {
    const [, props] = plugin('expo-build-properties');
    expect(props).toMatchObject({
      ios: { deploymentTarget: '16.4' },
      android: { minSdkVersion: 29, targetSdkVersion: 36 },
    });
  });

  it('uprawnienia: kamera z opisem PL, bez mikrofonu i lokalizacji', () => {
    const [, camera] = plugin('expo-camera');
    expect(camera.cameraPermission).toBe('PoleChamp używa aparatu do zeskanowania kodu parowania tabletu.');
    expect(camera.microphonePermission).toBe(false);
    expect(config.android?.blockedPermissions).toEqual(
      expect.arrayContaining(['android.permission.RECORD_AUDIO', 'android.permission.ACCESS_FINE_LOCATION']),
    );
    expect(config.plugins).toContain('./plugins/with-android-resizability.js');
  });
});

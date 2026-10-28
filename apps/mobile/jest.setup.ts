// Mocki modułów natywnych dla Jest (IMP-201). MMKV 4 sam przechodzi na mock w środowisku testowym.
import { setUpTests } from 'react-native-reanimated';

setUpTests();

jest.mock('@react-native-community/netinfo', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-community/netinfo/jest/netinfo-mock.js'),
);

jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => void store.set(key, value)),
    deleteItemAsync: jest.fn(async (key: string) => void store.delete(key)),
    AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 2,
    __store: store,
  };
});

// Losowość z Node (natywny moduł expo-crypto w Jest nie wypełnia tablicy – UUIDv7 byłyby równe).
jest.mock('expo-crypto', () => ({
  ...jest.requireActual('expo-crypto'),
  getRandomValues: <T extends ArrayBufferView>(array: T) =>
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('node:crypto').webcrypto.getRandomValues(array),
}));

// MMKV 4 importuje Nitro przy ładowaniu modułu; instancje w testach i tak są mockiem (isTest()).
jest.mock('react-native-nitro-modules', () => ({
  NitroModules: { createHybridObject: jest.fn() },
}));

// Gesture Handler 3: mocki komponentów i bez instalacji powiązań z runtime'em UI workletów.
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('react-native-gesture-handler/jestSetup');
jest.mock('react-native-worklets', () => ({
  ...jest.requireActual('react-native-worklets'),
  getUIRuntimeHolder: () => ({}),
}));

jest.mock('react-native-keyboard-controller', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('react-native-keyboard-controller/jest'),
);

// Kamera parowania (SCR-JDG-06): zgoda sterowana z testu (`__setPermission`), podgląd jako widok.
jest.mock('expo-camera', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  let permission: { granted: boolean; canAskAgain: boolean } | null = { granted: true, canAskAgain: true };
  // Prośba systemowa: odmowa (bez kolejnego pytania), o ile uprawnienie nie było już nadane.
  const request = jest.fn(async () => {
    if (permission && !permission.granted) permission = { granted: false, canAskAgain: false };
    return permission;
  });
  return {
    CameraView: View,
    useCameraPermissions: () => [permission, request],
    __request: request,
    __setPermission: (p: typeof permission) => {
      permission = p;
    },
  };
});

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(async () => undefined),
  impactAsync: jest.fn(async () => undefined),
  ImpactFeedbackStyle: { Light: 'light' },
}));

jest.mock('expo-battery', () => ({ getBatteryLevelAsync: jest.fn(async () => 0.8) }));

jest.mock('expo-keep-awake', () => ({
  useKeepAwake: jest.fn(),
  activateKeepAwakeAsync: jest.fn(async () => undefined),
  deactivateKeepAwake: jest.fn(),
}));

// Skia: w testach komponentów wystarczy drzewo widoków (renderer natywny nie istnieje w Node).
jest.mock('@shopify/react-native-skia', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return {
    Canvas: View,
    Image: View,
    AlphaType: { Unpremul: 3 },
    ColorType: { RGBA_8888: 4 },
    FilterMode: { Nearest: 0 },
    MipmapMode: { None: 0 },
    Skia: { Data: { fromBytes: () => ({}) }, Image: { MakeImage: () => ({}) } },
  };
});

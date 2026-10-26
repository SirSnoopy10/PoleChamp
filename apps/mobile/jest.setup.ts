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
    __store: store,
  };
});

// Losowość z Node (natywny moduł expo-crypto w Jest nie wypełnia tablicy – UUIDv7 byłyby równe).
jest.mock('expo-crypto', () => ({
  ...jest.requireActual('expo-crypto'),
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  getRandomValues: <T extends ArrayBufferView>(array: T) =>
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

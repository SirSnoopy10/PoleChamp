import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { storage } from '../../storage/mmkv';

/**
 * Wspólne opcje SecureStore (IMP-402, ADR-005, TC-SEC-016): dostęp po pierwszym odblokowaniu (wysyłka
 * w tle), tylko to urządzenie – bez synchronizacji z iCloud Keychain i bez przenoszenia w kopiach;
 * bez biometrii (`requireAuthentication: false` – tablet współdzielony przez sędziów).
 */
export const SECURE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  requireAuthentication: false,
};

/** SecureStore (Keychain/Keystore); Expo web (DevCatalog, podgląd) nie ma bezpiecznego magazynu – MMKV. */
export const secure =
  Platform.OS === 'web'
    ? {
        getItemAsync: async (key: string, _options?: SecureStore.SecureStoreOptions) =>
          storage.getString(key) ?? null,
        setItemAsync: async (key: string, value: string, _options?: SecureStore.SecureStoreOptions) =>
          storage.set(key, value),
        deleteItemAsync: async (key: string, _options?: SecureStore.SecureStoreOptions) =>
          void storage.remove(key),
      }
    : SecureStore;

/** Bezpieczny magazyn aplikacji (tokeny, sekret i pepper urządzenia – nigdy SQLite/MMKV na urządzeniu). */
export const secureStorage = {
  get: (key: string) => secure.getItemAsync(key, SECURE_OPTIONS),
  set: (key: string, value: string | null) =>
    value === null
      ? secure.deleteItemAsync(key, SECURE_OPTIONS)
      : secure.setItemAsync(key, value, SECURE_OPTIONS),
};

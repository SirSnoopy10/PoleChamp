import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { storage } from '../../storage/mmkv';

export type TokenKind = 'org' | 'device' | 'judge';

export interface OrgTokens {
  accessToken: string;
  refreshToken: string;
}

export interface TokenState {
  org: OrgTokens | null;
  device: string | null;
  judge: string | null;
  /** Magazyn wczytany z SecureStore (strażniki tras czekają na `true`). */
  loaded: boolean;
}

const KEY: Record<TokenKind, string> = { org: 'auth.org', device: 'auth.device', judge: 'auth.judge' };

let state: TokenState = { org: null, device: null, judge: null, loaded: false };
const listeners = new Set<() => void>();

function emit(next: Partial<TokenState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

/** SecureStore (Keychain/Keystore); Expo web (DevCatalog, podgląd) nie ma bezpiecznego magazynu – MMKV. */
const secure =
  Platform.OS === 'web'
    ? {
        getItemAsync: async (key: string) => storage.getString(key) ?? null,
        setItemAsync: async (key: string, value: string, _options?: SecureStore.SecureStoreOptions) =>
          storage.set(key, value),
        deleteItemAsync: async (key: string) => void storage.remove(key),
      }
    : SecureStore;

/** Dostęp po pierwszym odblokowaniu, bez kopii w iCloud/kopiach zapasowych (IMP-250 krok 4). */
const SECURE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

/** Bezpieczny magazyn aplikacji (tokeny, sekret i pepper urządzenia – nigdy SQLite/MMKV na urządzeniu). */
export const secureStorage = {
  get: (key: string) => secure.getItemAsync(key),
  set: (key: string, value: string | null) =>
    value === null ? secure.deleteItemAsync(key) : secure.setItemAsync(key, value, SECURE_OPTIONS),
};

const write = (kind: TokenKind, value: string | null) => secureStorage.set(KEY[kind], value);

/**
 * Magazyn tokenów (IMP-214): `org` w SecureStore; `device` i `judge` w pamięci (szybki odczyt
 * w middleware) z kopią w SecureStore, żeby tablet przetrwał restart.
 */
export const tokenStore = {
  getState: (): TokenState => state,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  async load(): Promise<void> {
    try {
      const [org, device, judge] = await Promise.all([
        secure.getItemAsync(KEY.org),
        secure.getItemAsync(KEY.device),
        secure.getItemAsync(KEY.judge),
      ]);
      emit({ org: org ? (JSON.parse(org) as OrgTokens) : null, device, judge, loaded: true });
    } catch {
      // Uszkodzony lub niedostępny magazyn – start bez sesji (logowanie / parowanie od nowa).
      emit({ org: null, device: null, judge: null, loaded: true });
    }
  },
  async setOrg(tokens: OrgTokens | null): Promise<void> {
    emit({ org: tokens });
    await write('org', tokens ? JSON.stringify(tokens) : null);
  },
  async setDevice(token: string | null): Promise<void> {
    emit({ device: token });
    await write('device', token);
  },
  async setJudge(token: string | null): Promise<void> {
    emit({ judge: token });
    await write('judge', token);
  },
  /** Token bieżącego trybu: organizator → `org`; tablet → sesja sędziego albo token urządzenia. */
  current(mode: 'org' | 'judge' | null): string | null {
    if (mode === 'org') return state.org?.accessToken ?? null;
    if (mode === 'judge') return state.judge ?? state.device;
    return null;
  },
  /** Tylko testy. */
  reset() {
    state = { org: null, device: null, judge: null, loaded: false };
    listeners.forEach((l) => l());
  },
};

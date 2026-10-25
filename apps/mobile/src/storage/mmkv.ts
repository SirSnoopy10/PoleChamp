import { createMMKV } from 'react-native-mmkv';

/** Magazyn klucz-wartość aplikacji (MMKV 4): tryb urządzenia, cache zapytań organizatora. */
export const storage = createMMKV({ id: 'polechamp' });

/** Klucze magazynu – jedna lista, żeby wylogowanie mogło je wyczyścić. */
export const StorageKey = {
  mode: 'app.mode',
  queryCache: 'query.cache',
} as const;

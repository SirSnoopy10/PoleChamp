import { useSyncExternalStore } from 'react';
import { tokenStore, type TokenState } from './tokens';

/** Stan sesji dla strażników tras (IMP-220): organizator, urządzenie, sędzia. */
export function useSession(): TokenState {
  return useSyncExternalStore(tokenStore.subscribe, tokenStore.getState, tokenStore.getState);
}

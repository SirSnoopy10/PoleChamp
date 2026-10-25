import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import type { AppMode } from '../../mode/mode';
import { deviceCapabilities } from './deviceCapabilities';

export type OrientationPolicy = 'portrait' | 'landscape' | 'free';

/** ADR-013: organizator na telefonie – pion; sędzia – poziom; organizator na tablecie – bez blokady. */
export function orientationPolicy(mode: AppMode | null, isTablet: boolean): OrientationPolicy {
  if (mode === 'judge') return 'landscape';
  return isTablet ? 'free' : 'portrait';
}

const LOCK = {
  portrait: ScreenOrientation.OrientationLock.PORTRAIT_UP,
  landscape: ScreenOrientation.OrientationLock.LANDSCAPE,
} as const;

/** Ustawia blokadę orientacji dla trybu (Android 16 może ją zignorować – stąd `OrientationGuard`). */
export function useOrientationLock(mode: AppMode | null): void {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const policy = orientationPolicy(mode, deviceCapabilities().isTablet);
    void (policy === 'free' ? ScreenOrientation.unlockAsync() : ScreenOrientation.lockAsync(LOCK[policy]));
  }, [mode]);
}

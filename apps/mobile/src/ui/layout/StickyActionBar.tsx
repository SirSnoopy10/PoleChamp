import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color } from '@polechamp/tokens';

/** Wysokość treści paska (przycisk 48 dp + padding 18 u góry) bez dolnego safe area. */
export const STICKY_BAR_CONTENT = 18 + 48;

/** Wysokość paska do odstępu treści w `ScreenContainer` (`footerHeight`). */
export function useStickyBarHeight(): number {
  const { bottom } = useSafeAreaInsets();
  return STICKY_BAR_CONTENT + Math.max(34, bottom);
}

/**
 * Pasek przyklejony u dołu (09-design-system §4.22): padding 18/16/34 (+ safe area), gradient
 * `linear-gradient(to top, bg 72%, transparent)`, 1–2 przyciski 48 dp z `flex: 1`.
 */
export function StickyActionBar({ children }: { children: ReactNode }) {
  const { bottom } = useSafeAreaInsets();
  return (
    <View
      testID="sticky-bar"
      style={[styles.bar, { paddingBottom: Math.max(34, bottom) }]}
      pointerEvents="box-none"
    >
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(22,24,38,0)', color.bg, color.bg]}
        locations={[0, 0.28, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.row}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 18, paddingHorizontal: 16 },
  row: { flexDirection: 'row', gap: 8, width: '100%', maxWidth: 480, alignSelf: 'center' },
});

import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { color } from '@polechamp/tokens';
import { useT } from '../../i18n';
import { useReducedMotion } from '../motion';

export const PIN_LENGTH = 4;

export interface PinDotsProps {
  filled: number;
  /** Zmiana wartości uruchamia potrząśnięcie 300 ms (błędny PIN). */
  shakeKey?: number;
  /** Weryfikacja w toku > 500 ms – kropki pulsują (SCR-JDG-08). */
  pulsing?: boolean;
}

/** Cztery kropki PIN-u (SCR-JDG-02): 14 dp, odstęp 16; wpisana – accent, pusta – obrys neutral-600. */
export function PinDots({ filled, shakeKey = 0, pulsing = false }: PinDotsProps) {
  const t = useT();
  const reduced = useReducedMotion();
  const x = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (!shakeKey || reduced) return;
    x.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-8, { duration: 50 }),
      withTiming(8, { duration: 50 }),
      withTiming(-4, { duration: 50 }),
      withTiming(0, { duration: 50 }),
    );
  }, [shakeKey, reduced, x]);

  useEffect(() => {
    if (pulsing && !reduced) opacity.value = withRepeat(withTiming(0.35, { duration: 450 }), -1, true);
    else {
      cancelAnimation(opacity);
      opacity.value = 1;
    }
  }, [pulsing, reduced, opacity]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }], opacity: opacity.value }));
  return (
    <Animated.View
      testID="pin-dots"
      accessible
      accessibilityLabel={t(pulsing ? 'judge:pin.checking' : 'judge:pin.entered', { count: filled })}
      accessibilityLiveRegion="polite"
      style={[styles.row, style]}
    >
      {Array.from({ length: PIN_LENGTH }, (_, i) => (
        <View
          key={i}
          testID={i < filled ? 'pin-dot-filled' : 'pin-dot-empty'}
          style={[styles.dot, i < filled ? styles.filled : styles.empty]}
        />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 16, height: 14 },
  dot: { width: 14, height: 14, borderRadius: 7 },
  filled: { backgroundColor: color.accent },
  empty: { borderWidth: 1.5, borderColor: color.neutral[600] },
});

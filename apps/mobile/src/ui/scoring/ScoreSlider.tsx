import { useEffect } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import * as Haptics from 'expo-haptics';
import { color, shadow } from '@polechamp/tokens';

const TRACK = 8;
const THUMB = 28;

/** Krok noty w dziesiątych (0,5 pkt) – przyciąganie w workletcie. */
export function snapTenths(ratio: number, scaleMax: number, stepTenths = 5): number {
  'worklet';
  const r = Math.min(1, Math.max(0, ratio));
  return Math.round((r * scaleMax * 10) / stepTenths) * stepTenths;
}

export interface ScoreSliderProps {
  /** Nota w dziesiątych (8,5 → 85). */
  value: number;
  scaleMax: number;
  stepTenths?: number;
  onChange: (tenths: number) => void;
  disabled?: boolean;
  /** Etykieta „{kryterium}, {v} z {skala}” (rola `adjustable`). */
  accessibilityLabel: string;
  testID?: string;
}

/**
 * Suwak noty (IMP-310, R-01): pozycja kciuka liczona na wątku UI (Reanimated 4 + Gesture Handler 3),
 * krok 0,5 z przyciąganiem; do Reacta trafia tylko zmiana kroku (`scheduleOnRN`), więc przeciąganie
 * nie renderuje formularza co klatkę. Haptyka przy pełnym punkcie; czytnik ekranu – akcje ±0,5.
 */
export function ScoreSlider({
  value,
  scaleMax,
  stepTenths = 5,
  onChange,
  disabled = false,
  accessibilityLabel,
  testID = 'score-slider',
}: ScoreSliderProps) {
  const max = scaleMax * 10;
  const width = useSharedValue(0);
  const ratio = useSharedValue(value / max);
  const last = useSharedValue(value);
  const dragging = useSharedValue(false);

  useEffect(() => {
    if (dragging.value) return;
    last.value = value;
    ratio.value = value / max;
  }, [value, max, dragging, last, ratio]);

  const emit = (tenths: number) => {
    if (tenths % 10 === 0) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    onChange(tenths);
  };

  const move = (x: number) => {
    'worklet';
    if (width.value <= 0) return;
    const r = Math.min(1, Math.max(0, x / width.value));
    ratio.value = r;
    const tenths = snapTenths(r, scaleMax, stepTenths);
    if (tenths !== last.value) {
      last.value = tenths;
      scheduleOnRN(emit, tenths);
    }
  };

  const pan = Gesture.Pan()
    .enabled(!disabled)
    .minDistance(0)
    .hitSlop({ vertical: 12 })
    .onBegin((e) => {
      dragging.value = true;
      move(e.x);
    })
    .onUpdate((e) => move(e.x))
    .onFinalize(() => {
      dragging.value = false;
      ratio.value = withTiming(last.value / max, { duration: 80 });
    });

  const fill = useAnimatedStyle(() => ({ width: ratio.value * width.value }));
  const thumb = useAnimatedStyle(() => ({
    transform: [{ translateX: ratio.value * width.value - THUMB / 2 }],
  }));

  const onLayout = (e: LayoutChangeEvent) => {
    width.value = e.nativeEvent.layout.width;
  };

  const step = (delta: number) => onChange(Math.min(max, Math.max(0, value + delta)));

  return (
    <GestureDetector gesture={pan}>
      <View
        testID={testID}
        style={styles.hit}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
        accessibilityValue={{ min: 0, max, now: value }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => {
          if (disabled) return;
          if (e.nativeEvent.actionName === 'increment') step(stepTenths);
          if (e.nativeEvent.actionName === 'decrement') step(-stepTenths);
        }}
      >
        <View style={styles.track} onLayout={onLayout}>
          <Animated.View style={[styles.fill, fill]} />
          <Animated.View style={[styles.thumb, shadow.thumb, thumb]} />
        </View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  hit: { flex: 1, height: 44, justifyContent: 'center' },
  track: { height: TRACK, borderRadius: TRACK / 2, backgroundColor: color.neutral[800] },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: TRACK / 2,
    backgroundColor: color.accent,
  },
  thumb: {
    position: 'absolute',
    top: (TRACK - THUMB) / 2,
    left: 0,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: color.accentRamp[100],
    borderWidth: 7,
    borderColor: color.accent,
  },
});

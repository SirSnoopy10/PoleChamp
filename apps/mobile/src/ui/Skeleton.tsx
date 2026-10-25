import { useEffect } from 'react';
import { StyleSheet, View, type DimensionValue } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { color, radius, shadow } from '@polechamp/tokens';
import { useReducedMotion } from './motion';

export interface SkeletonProps {
  width?: DimensionValue;
  height: number;
  borderRadius?: number;
}

/** Blok szkieletu (09-design-system §4.23): puls opacity 0,5 ↔ 0,8 (1,2 s), statyczny przy „Ogranicz ruch”. */
export function Skeleton({ width = '100%', height, borderRadius = radius.md }: SkeletonProps) {
  const reduced = useReducedMotion();
  const opacity = useSharedValue(0.5);
  useEffect(() => {
    if (reduced) {
      cancelAnimation(opacity);
      opacity.value = 0.65;
      return;
    }
    opacity.value = withRepeat(
      withTiming(0.8, { duration: 600, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => cancelAnimation(opacity);
  }, [reduced, opacity]);
  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      testID="skeleton"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width, height, borderRadius, backgroundColor: color.neutral[800] }, animated]}
    />
  );
}

/** Szkielet karty turnieju/kategorii. */
export function SkeletonCard() {
  return (
    <View style={styles.card} testID="skeleton-card">
      <Skeleton width={96} height={20} borderRadius={radius.pill} />
      <Skeleton width="80%" height={20} />
      <Skeleton width="55%" height={14} />
      <Skeleton height={4} borderRadius={2} />
    </View>
  );
}

/** Szkielet wiersza listy grupowanej. */
export function SkeletonRow() {
  return (
    <View style={styles.row} testID="skeleton-row">
      <Skeleton width={40} height={40} borderRadius={radius.r12} />
      <View style={styles.rowTexts}>
        <Skeleton width="70%" height={15} />
        <Skeleton width="40%" height={12} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, gap: 12, borderRadius: radius.lg, backgroundColor: color.surface, ...shadow.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    minHeight: 60,
    backgroundColor: color.surface,
  },
  rowTexts: { flex: 1, gap: 6 },
});

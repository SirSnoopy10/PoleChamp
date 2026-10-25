import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { color, radius, shadow } from '@polechamp/tokens';

/** Rozjaśnienie wciśniętej karty – odpowiednik `filter: brightness(1.1)` z prototypu. */
export const PRESSED_OVERLAY = 'rgba(233,233,237,0.06)';

export interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  padding?: 14 | 16 | 18;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
  /** Tło własne (np. gradient w `TournamentCard`). */
  background?: ReactNode;
}

/** Karta Nocturne (09-design-system §4.4): surface, radius lg, krawędź shadow-sm. */
export function Card({
  children,
  onPress,
  padding = 14,
  style,
  accessibilityLabel,
  testID,
  background,
}: CardProps) {
  const body = (pressed: boolean) => (
    <>
      {background}
      {pressed ? (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: PRESSED_OVERLAY }]} />
      ) : null}
      {children}
    </>
  );
  const frame = [styles.card, { padding }, style];
  if (!onPress) {
    return (
      <View
        testID={testID}
        style={frame}
        accessible={!!accessibilityLabel}
        accessibilityLabel={accessibilityLabel}
      >
        {body(false)}
      </View>
    );
  }
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={frame}
    >
      {({ pressed }) => body(pressed)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    gap: 12,
    ...shadow.sm,
  },
});

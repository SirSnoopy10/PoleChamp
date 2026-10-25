import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { color, radius, shadow } from '@polechamp/tokens';
import { useReducedMotion } from './motion';
import { Portal } from './portal';
import { Text } from './Text';

export interface DialogProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  text?: string;
  /** Przyciski wyrównane do prawej (np. „Anuluj” secondary, „Wyloguj” primary). */
  actions: ReactNode;
  children?: ReactNode;
  testID?: string;
}

/** Dialog tabletu (09-design-system §4.10, SCR-JDG-09): szer. ≤ 440 dp, tło `dialogBackdrop`. */
export function Dialog({ visible, onClose, title, text, actions, children, testID = 'dialog' }: DialogProps) {
  const reduced = useReducedMotion();
  if (!visible) return null;
  const ms = reduced ? 0 : 180;
  return (
    <Portal>
      <Animated.View
        entering={FadeIn.duration(ms)}
        exiting={FadeOut.duration(ms)}
        style={StyleSheet.absoluteFill}
      >
        <Pressable
          testID={`${testID}-backdrop`}
          style={[StyleSheet.absoluteFill, styles.backdrop]}
          onPress={onClose}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
        <View style={styles.center} pointerEvents="box-none">
          <View testID={testID} accessibilityViewIsModal style={[styles.dialog, shadow.lg]}>
            <Text variant="heading" accessibilityRole="header">
              {title}
            </Text>
            {text ? (
              <Text variant="bodyS" color="rgba(233,233,237,0.85)">
                {text}
              </Text>
            ) : null}
            {children}
            <View style={styles.actions}>{actions}</View>
          </View>
        </View>
      </Animated.View>
    </Portal>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: color.overlay.dialogBackdrop },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialog: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: 11.2,
    gap: 8.4,
  },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 },
});

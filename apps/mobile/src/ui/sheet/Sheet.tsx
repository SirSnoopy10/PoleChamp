import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  BackHandler,
  findNodeHandle,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { color, motion, radius, shadow } from '@polechamp/tokens';
import { useReducedMotion } from '../motion';
import { Portal } from '../portal';
import type { TextInstance } from '../Text';
import { SheetContext } from './context';

const [x1, y1, x2, y2] = motion.sheetIn.easing as readonly [number, number, number, number];
const SHEET_EASING = Easing.bezier(x1, y1, x2, y2);
/** Próg zamknięcia gestem: 30% wysokości albo szybkie przeciągnięcie. */
const CLOSE_RATIO = 0.3;
const CLOSE_VELOCITY = 900;

/** Stos otwartych arkuszy – przycisk wstecz Androida zamyka tylko najwyższy (09-design-system §4.9). */
const openStack: symbol[] = [];

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Maks. wysokość: 88% (domyślnie) / 86% (podgląd PDF). */
  maxHeightRatio?: 0.88 | 0.86;
  /** Etykieta arkusza dla czytnika ekranu (zwykle tytuł). */
  accessibilityLabel?: string;
  testID?: string;
}

/**
 * Arkusz od dołu (IMP-206, TL-03): wysokość dopasowana do treści, zamknięcie tłem, gestem, „×”
 * i przyciskiem wstecz, unoszenie nad klawiaturą, modalność a11y. Po zamknięciu odmontowany –
 * tło nie blokuje dotyku.
 */
export function Sheet({
  visible,
  onClose,
  children,
  maxHeightRatio = 0.88,
  accessibilityLabel,
  testID = 'sheet',
}: SheetProps) {
  const [mounted, setMounted] = useState(visible);
  if (visible && !mounted) setMounted(true);
  const onHidden = useCallback(() => setMounted(false), []);
  if (!mounted) return null;
  return (
    <Portal>
      <SheetBody
        visible={visible}
        onClose={onClose}
        onHidden={onHidden}
        maxHeightRatio={maxHeightRatio}
        accessibilityLabel={accessibilityLabel}
        testID={testID}
      >
        {children}
      </SheetBody>
    </Portal>
  );
}

function SheetBody({
  visible,
  onClose,
  onHidden,
  children,
  maxHeightRatio,
  accessibilityLabel,
  testID,
}: Required<Omit<SheetProps, 'accessibilityLabel'>> & {
  onHidden: () => void;
  accessibilityLabel?: string;
}) {
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const id = useRef(Symbol('sheet')).current;
  const titleRef = useRef<TextInstance>(null);
  const hiddenRef = useRef(onHidden);
  hiddenRef.current = onHidden;
  const hidden = useCallback(() => hiddenRef.current(), []);
  const sheetHeight = useSharedValue(windowHeight);
  const translateY = useSharedValue(windowHeight);
  const backdrop = useSharedValue(0);
  const [closing, setClosing] = useState(false);

  const duration = reduced ? 0 : motion.sheetIn.duration;
  const fade = reduced ? 0 : motion.backdropFade.duration;

  useEffect(() => {
    if (visible) {
      setClosing(false);
      translateY.value = withTiming(0, { duration, easing: SHEET_EASING });
      backdrop.value = withTiming(1, { duration: fade });
    } else {
      setClosing(true);
      backdrop.value = withTiming(0, { duration: fade });
      translateY.value = withTiming(sheetHeight.value, { duration, easing: SHEET_EASING }, (done) => {
        if (done) scheduleOnRN(hidden);
      });
      if (!duration) hidden();
    }
  }, [visible, duration, fade, translateY, backdrop, sheetHeight, hidden]);

  // Fokus czytnika na treści arkusza po otwarciu (powrót fokusu zapewnia system po odmontowaniu).
  useEffect(() => {
    if (!visible || Platform.OS === 'web') return;
    const node = findNodeHandle(titleRef.current);
    if (node) AccessibilityInfo.setAccessibilityFocus(node);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    openStack.push(id);
    if (Platform.OS === 'web') return () => void openStack.splice(openStack.indexOf(id), 1);
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (openStack[openStack.length - 1] !== id) return false;
      onClose();
      return true;
    });
    return () => {
      sub.remove();
      openStack.splice(openStack.indexOf(id), 1);
    };
  }, [visible, id, onClose]);

  const close = useCallback(() => onClose(), [onClose]);

  const pan = Gesture.Pan()
    .activeOffsetY(10)
    .onUpdate((e) => {
      translateY.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > sheetHeight.value * CLOSE_RATIO || e.velocityY > CLOSE_VELOCITY) {
        scheduleOnRN(close);
      } else {
        translateY.value = withTiming(0, { duration: 180 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={closing ? 'none' : 'box-none'}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
        <Pressable
          testID={`${testID}-backdrop`}
          style={StyleSheet.absoluteFill}
          onPress={close}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      </Animated.View>
      <KeyboardAvoidingView behavior="padding" style={styles.avoider} pointerEvents="box-none">
        <GestureDetector gesture={pan}>
          <Animated.View
            testID={testID}
            accessibilityViewIsModal
            importantForAccessibility="yes"
            accessibilityLabel={accessibilityLabel}
            onLayout={(e) => {
              sheetHeight.value = e.nativeEvent.layout.height;
            }}
            style={[
              styles.sheet,
              shadow.md,
              { maxHeight: windowHeight * maxHeightRatio, paddingBottom: Math.max(34, insets.bottom + 8) },
              sheetStyle,
            ]}
          >
            <View style={styles.handle} />
            <SheetContext.Provider value={{ close, titleRef }}>{children}</SheetContext.Provider>
          </Animated.View>
        </GestureDetector>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: color.overlay.sheetBackdrop },
  avoider: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: color.surface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingTop: 8,
    paddingHorizontal: 18,
    gap: 14,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: color.neutral[700],
    marginBottom: 6,
  },
});

import {
  useCallback,
  useRef,
  useState,
  type ComponentRef,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions, type RefreshControlProps } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color } from '@polechamp/tokens';
import { ScreenGlow } from './ScreenGlow';

/** Maks. szerokość kolumny organizatora na tablecie (TL-24). */
export const ORG_MAX_WIDTH = 480;
/** Od tej szerokości okna traktujemy urządzenie jako tablet w trybie organizatora. */
const TABLET_MIN_WIDTH = 600;

export interface ScreenContainerProps {
  children: ReactNode;
  /** Pasek przyklejony u dołu (`StickyActionBar`) – poza przewijaną treścią. */
  footer?: ReactNode;
  /** Wysokość paska, żeby ostatni element treści nie chował się pod nim. */
  footerHeight?: number;
  /** Bez przewijania (np. ekran z własną listą). */
  scroll?: boolean;
  glow?: boolean;
  /** Pull-to-refresh (`RefreshControl` w kolorze accent). */
  refreshControl?: ReactElement<RefreshControlProps>;
  /** Ref przewijania dla ekranu (np. kafel „Kategorie” przewija do sekcji). */
  scrollRef?: RefObject<ComponentRef<typeof ScrollView> | null>;
  testID?: string;
}

/**
 * Rama ekranu organizatora (IMP-209): safe area górna + 10 dp (UI-10), marginesy 16 dp,
 * jeden przewijany kontener bez wskaźników (UI-09), przewinięcie na górę po powrocie na ekran,
 * kolumna 480 dp wyśrodkowana na tablecie (TL-24).
 */
export function ScreenContainer({
  children,
  footer,
  footerHeight = 0,
  scroll = true,
  glow = true,
  refreshControl,
  scrollRef,
  testID = 'screen',
}: ScreenContainerProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const ownRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const ref = scrollRef ?? ownRef;
  const [scrolled, setScrolled] = useState(false);
  const tablet = width >= TABLET_MIN_WIDTH;

  useFocusEffect(
    useCallback(() => {
      ref.current?.scrollTo({ y: 0, animated: false });
    }, [ref]),
  );

  const column = (
    <View
      testID={`${testID}-column`}
      style={[styles.column, tablet && { maxWidth: ORG_MAX_WIDTH, alignSelf: 'center' }]}
    >
      {children}
    </View>
  );
  const padding = {
    paddingTop: insets.top + 10,
    paddingBottom: footer ? footerHeight + 16 : insets.bottom + 24,
    paddingLeft: Math.max(16, insets.left),
    paddingRight: Math.max(16, insets.right),
  };

  return (
    <View testID={testID} style={styles.root}>
      {glow ? <ScreenGlow /> : null}
      {scroll ? (
        <ScrollView
          ref={ref}
          testID={`${testID}-scroll`}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}
          contentContainerStyle={padding}
          scrollEventThrottle={32}
          onScroll={(e) => setScrolled(e.nativeEvent.contentOffset.y > 4)}
        >
          {column}
        </ScrollView>
      ) : (
        <View style={[styles.root, padding]}>{column}</View>
      )}
      {/* Maska pod paskiem stanu – przewijana treść nie nachodzi na zegar (UX-29). */}
      {scroll && scrolled ? (
        <View
          testID={`${testID}-status-mask`}
          pointerEvents="none"
          style={[styles.mask, { height: insets.top }]}
        />
      ) : null}
      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  mask: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: color.bg },
  root: { flex: 1, backgroundColor: color.bg },
  column: { width: '100%' },
});

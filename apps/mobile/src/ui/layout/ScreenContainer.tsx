import { useCallback, useRef, type ComponentRef, type ReactElement, type ReactNode } from 'react';
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
  testID = 'screen',
}: ScreenContainerProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const ref = useRef<ComponentRef<typeof ScrollView>>(null);
  const tablet = width >= TABLET_MIN_WIDTH;

  useFocusEffect(
    useCallback(() => {
      ref.current?.scrollTo({ y: 0, animated: false });
    }, []),
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
        >
          {column}
        </ScrollView>
      ) : (
        <View style={[styles.root, padding]}>{column}</View>
      )}
      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  column: { width: '100%' },
});

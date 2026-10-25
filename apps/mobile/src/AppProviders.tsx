import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { color } from '@polechamp/tokens';
import { I18nProvider } from './i18n';
import { MAX_FONT_SCALE, ModeProvider, useMode } from './mode/mode';
import { PortalProvider } from './ui/portal';
import { ThemeProvider } from './ui/theme/ThemeProvider';
import { ToastHost } from './ui/Toast';

/** Theme z limitem skalowania czcionki bieżącego trybu (NFR-204). */
export function ThemedByMode({
  children,
  reducedMotion,
}: {
  children: ReactNode;
  reducedMotion?: boolean | null;
}) {
  const { mode } = useMode();
  return (
    <ThemeProvider maxFontScale={MAX_FONT_SCALE[mode ?? 'org']} reducedMotion={reducedMotion ?? null}>
      {children}
    </ThemeProvider>
  );
}

/** Providery aplikacji (kolejność: gesty → safe area → tryb → theme → i18n). */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ModeProvider>
          <ThemedByMode>
            <I18nProvider>
              <KeyboardProvider>
                <PortalProvider>
                  {children}
                  <ToastHost />
                </PortalProvider>
              </KeyboardProvider>
            </I18nProvider>
          </ThemedByMode>
        </ModeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: color.bg } });

import { useEffect, type ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { color } from '@polechamp/tokens';
import { api } from './data/api';
import { useOnlineProbe, useReconnectTrigger } from './data/network/online';
import { GC_TIME_MS, bindOnlineManager, queryClient, queryPersister } from './data/query/queryClient';
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

const refetchActive = () => void queryClient.invalidateQueries({ refetchType: 'active' });
const probeApi = () => api.GET('/v1/app-config');

/** Cache organizatora w MMKV (IMP-215) – tablet korzysta z SQLite (EP-08), nie z tego cache. */
function QueryProvider({ children }: { children: ReactNode }) {
  useEffect(() => bindOnlineManager(), []);
  // Powrót łączności wg NetInfo → odświeżenie aktywnych ekranów; udana odpowiedź przywraca „online” (IMP-278).
  useReconnectTrigger(refetchActive);
  // Tablet utrzymuje stan „online” heartbeatem synchronizacji – sonda tylko dla organizatora.
  useOnlineProbe(probeApi, useMode().mode !== 'judge');
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: queryPersister, maxAge: GC_TIME_MS }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}

/** Providery aplikacji (kolejność: gesty → safe area → tryb → theme → i18n → dane → warstwy). */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ModeProvider>
          <ThemedByMode>
            <I18nProvider>
              <QueryProvider>
                <KeyboardProvider>
                  <PortalProvider>{children}</PortalProvider>
                  {/* Toast nad arkuszami (portal) – UX-13. */}
                  <ToastHost />
                </KeyboardProvider>
              </QueryProvider>
            </I18nProvider>
          </ThemedByMode>
        </ModeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: color.bg } });

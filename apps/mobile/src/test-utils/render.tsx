import type { ReactElement, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { I18nProvider } from '../i18n';
import { ModeProvider, type AppMode } from '../mode/mode';
import { ThemedByMode } from '../AppProviders';
import { PortalProvider } from '../ui/portal';
import { ToastHost } from '../ui/Toast';

export const SAFE_AREA_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

/** Klient zapytań testów: bez ponowień i bez odśmiecania między asercjami. */
export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  });

export interface ProvidersOptions {
  mode?: AppMode | null;
  queryClient?: QueryClient;
  reducedMotion?: boolean;
}

export function Providers({
  children,
  mode = 'org',
  queryClient,
  reducedMotion,
}: ProvidersOptions & { children: ReactNode }) {
  return (
    <GestureHandlerRootView>
      <SafeAreaProvider initialMetrics={SAFE_AREA_METRICS}>
        <ModeProvider initial={mode}>
          <ThemedByMode reducedMotion={reducedMotion}>
            <I18nProvider>
              <QueryClientProvider client={queryClient ?? createTestQueryClient()}>
                <PortalProvider>{children}</PortalProvider>
                {/* Toast nad arkuszami (portal) – UX-13. */}
                <ToastHost />
              </QueryClientProvider>
            </I18nProvider>
          </ThemedByMode>
        </ModeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/** `render` z providerami aplikacji (theme, i18n, query client, tryb, safe area). */
export function renderWithProviders(
  ui: ReactElement,
  { mode, queryClient, reducedMotion, ...options }: ProvidersOptions & RenderOptions = {},
) {
  return render(ui, {
    wrapper: ({ children }) => (
      <Providers mode={mode} queryClient={queryClient} reducedMotion={reducedMotion}>
        {children}
      </Providers>
    ),
    ...options,
  });
}

export * from '@testing-library/react-native';

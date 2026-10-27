import * as Sentry from '@sentry/react-native';
import * as Updates from 'expo-updates';
import { env } from '../config/env';
import { appBuild, appVersion } from '../data/api/app-version';
import { scrubBreadcrumb, scrubEvent } from './scrub';

/** Integracja nawigacji Expo Router (`registerNavigationContainer` w root layoutcie). */
export const navigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: true,
});

/**
 * Sentry (IMP-218): wydanie = wersja aplikacji, `dist` = numer buildu / aktualizacja EAS,
 * środowisko = kanał. Bez DSN (lokalnie, testy) zdarzenia nie są wysyłane.
 */
export function initSentry(): void {
  Sentry.init({
    dsn: env.sentryDsn || undefined,
    enabled: !!env.sentryDsn,
    environment: Updates.channel ?? env.variant,
    release: `app.polechamp@${appVersion()}`,
    dist: Updates.updateId ?? appBuild(),
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    integrations: [navigationIntegration],
    beforeSend: scrubEvent,
    beforeBreadcrumb: scrubBreadcrumb,
  });
}

let ttiReported = false;

/** Ekran, na którym kończy się zimny start: lista turniejów, profile tabletu albo wybór trybu. */
export type InteractiveScreen = 'tournaments' | 'profiles' | 'mode';

export const interactiveScreen = (mode: 'org' | 'judge' | null | undefined): InteractiveScreen =>
  mode === 'org' ? 'tournaments' : mode === 'judge' ? 'profiles' : 'mode';

/** Znacznik „time to interactive” (NFR-101) po pierwszym renderze listy turniejów / profili. */
export function markInteractive(screen: InteractiveScreen): number | null {
  if (ttiReported) return null;
  ttiReported = true;
  // `performance.now()` w RN liczy od startu procesu – czas od zimnego startu do pierwszego ekranu.
  const ms = Math.round(performance.now());
  Sentry.setMeasurement('time_to_interactive', ms, 'millisecond');
  Sentry.setTag('tti_screen', screen);
  Sentry.addBreadcrumb({ category: 'app.lifecycle', message: `tti:${screen}`, level: 'info' });
  return ms;
}

export { Sentry };

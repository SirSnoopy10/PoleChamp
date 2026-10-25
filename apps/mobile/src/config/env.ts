/**
 * Konfiguracja aplikacji z `EXPO_PUBLIC_*` (wstawiane przy bundlowaniu, opis w `.env.example`).
 * Wartości domyślne dotyczą lokalnego API (`docker compose` + `apps/api`).
 */
const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export type AppVariant = 'development' | 'preview' | 'production';

export const env = {
  apiUrl,
  /** Socket.IO (`/rt`) – domyślnie ten sam host co API. */
  wsUrl: process.env.EXPO_PUBLIC_WS_URL ?? apiUrl,
  variant: (process.env.EXPO_PUBLIC_APP_VARIANT ?? 'development') as AppVariant,
  /** DSN Sentry (region UE) – pusty wyłącza wysyłkę zdarzeń. */
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
  /** Linki do sklepów (ekran wymuszonej aktualizacji) – wartości zastępcze do czasu kont Apple/Google. */
  storeUrl: {
    ios: process.env.EXPO_PUBLIC_APP_STORE_URL ?? 'https://apps.apple.com/app/id0000000000',
    android:
      process.env.EXPO_PUBLIC_PLAY_STORE_URL ?? 'https://play.google.com/store/apps/details?id=app.polechamp',
  },
  /** Limit czasu żądania HTTP (IMP-214). */
  requestTimeoutMs: 15_000,
} as const;

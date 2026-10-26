import { DeviceTokenResponse, type PairResponse } from '@polechamp/contracts';
import { ApiError, unwrap, type ApiClient } from '../api';
import { secureStorage, tokenStore } from '../api/tokens';

/** Klucze SecureStore tabletu (ADR-005): identyfikator, sekret i pepper PIN – nigdy w SQLite/MMKV. */
export const DEVICE_KEYS = {
  id: 'device.id',
  secret: 'device.secret',
  pinPepper: 'device.pinPepper',
  tournamentId: 'device.tournamentId',
} as const;

/** Odświeżenie tokenu urządzenia 5 min przed wygaśnięciem (IMP-356 krok 1). */
export const REFRESH_MARGIN_MS = 5 * 60_000;

export interface DeviceCredentials {
  deviceId: string;
  deviceSecret: string;
  pinPepper: string;
  tournamentId: string;
}

/** Zapis po parowaniu (`POST /v1/devices/pair` – ekran parowania tabletu, EP-08). */
export async function saveDeviceCredentials(pair: PairResponse): Promise<void> {
  await secureStorage.set(DEVICE_KEYS.id, pair.deviceId);
  await secureStorage.set(DEVICE_KEYS.secret, pair.deviceSecret);
  await secureStorage.set(DEVICE_KEYS.pinPepper, pair.pinPepper);
  await secureStorage.set(DEVICE_KEYS.tournamentId, pair.tournament.id);
}

export async function loadDeviceCredentials(): Promise<DeviceCredentials | null> {
  const [deviceId, deviceSecret, pinPepper, tournamentId] = await Promise.all([
    secureStorage.get(DEVICE_KEYS.id),
    secureStorage.get(DEVICE_KEYS.secret),
    secureStorage.get(DEVICE_KEYS.pinPepper),
    secureStorage.get(DEVICE_KEYS.tournamentId),
  ]);
  if (!deviceId || !deviceSecret || !pinPepper || !tournamentId) return null;
  return { deviceId, deviceSecret, pinPepper, tournamentId };
}

/** „Wyczyść dane” po odłączeniu (06-offline §7) – sekrety i tokeny tabletu. */
export async function clearDeviceCredentials(): Promise<void> {
  for (const key of Object.values(DEVICE_KEYS)) await secureStorage.set(key, null);
  await tokenStore.setJudge(null);
  await tokenStore.setDevice(null);
}

export interface DeviceAuthDeps {
  api: ApiClient;
  now?: () => number;
  /** `DEVICE_REVOKED` przy pobieraniu tokenu. */
  onRevoked?: () => void;
}

/**
 * Token urządzenia (IMP-356): `POST /v1/devices/token` sekretem z SecureStore, czas wygaśnięcia
 * w pamięci, odświeżanie 5 min przed `exp` i na żądanie po `401 UNAUTHENTICATED` (single-flight).
 */
export function createDeviceAuth({ api, now = Date.now, onRevoked }: DeviceAuthDeps) {
  let expiresAt = 0;
  let inflight: Promise<string | null> | null = null;

  function refresh(): Promise<string | null> {
    inflight ??= (async () => {
      const creds = await loadDeviceCredentials();
      if (!creds) return null;
      try {
        const res = DeviceTokenResponse.parse(
          await unwrap(
            api.POST('/v1/devices/token', {
              body: { deviceId: creds.deviceId, deviceSecret: creds.deviceSecret },
            }),
          ),
        );
        expiresAt = now() + res.expiresIn * 1000;
        await tokenStore.setDevice(res.deviceToken);
        return res.deviceToken;
      } catch (error) {
        if (error instanceof ApiError && error.code === 'DEVICE_REVOKED') onRevoked?.();
        throw error;
      }
    })().finally(() => {
      inflight = null;
    });
    return inflight;
  }

  return {
    /** Ważny token urządzenia przed przebiegiem synchronizacji. */
    async ensureToken(): Promise<string | null> {
      const token = tokenStore.getState().device;
      if (token && now() < expiresAt - REFRESH_MARGIN_MS) return token;
      return refresh();
    },
    refresh,
    /** Tylko testy. */
    expiresAt: () => expiresAt,
  };
}

export type DeviceAuth = ReturnType<typeof createDeviceAuth>;

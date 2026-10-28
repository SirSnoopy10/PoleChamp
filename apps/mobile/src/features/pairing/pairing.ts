import { Platform } from 'react-native';
import * as Device from 'expo-device';
import { createStore, useStore } from 'zustand';
import { PairingCode, PairResponse } from '@polechamp/contracts';
import { ApiError, unwrap } from '../../data/api';
import { appVersion } from '../../data/api/app-version';
import { saveDeviceCredentials } from '../../data/auth/deviceAuth';
import type { JudgeRuntime } from '../../data/judge/runtime';
import { restoreJudgeSession } from '../../data/judge/session';
import { outbox } from '../../data/outbox/outbox';
import { readMeta } from '../../data/sync/meta';
import { TabletDataLifecycle } from '../judge/TabletDataLifecycle';

/** Limit tabletów turnieju (`LIMIT_EXCEEDED`, 03-api). */
export const DEVICE_LIMIT = 20;

/** „k7qm4z” → „K7QM-4Z”: wielkie litery, tylko alfabet kodu, myślnik po 4 znakach (maska „XXXX-XXXX”). */
export function maskPairingCode(input: string): string {
  const raw = input
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8);
  return raw.length > 4 ? `${raw.slice(0, 4)}-${raw.slice(4)}` : raw;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Kod z QR / linku: `polechamp://pair?c=…&t=…` albo `https://polechamp.app/pair?c=…`. */
export function parsePairingLink(data: string): { code: string; tournamentId: string | null } | null {
  if (data.length > 512) return null;
  const match = /^(?:polechamp:\/\/|https:\/\/polechamp\.app\/)pair\?(.+)$/.exec(data.trim());
  if (!match) return null;
  const params = new URLSearchParams(match[1]);
  const code = PairingCode.safeParse(params.get('c') ?? '');
  // Długość linku ograniczona, `t` tylko jako UUID (TC-SEC-021) – reszta ignorowana.
  const t = params.get('t');
  return code.success ? { code: code.data, tournamentId: t && UUID.test(t) ? t : null } : null;
}

export type PairStage = 'idle' | 'connecting' | 'loading';
export type PairErrorKey =
  | 'errors:PAIRING_CODE_INVALID'
  | 'errors:LIMIT_EXCEEDED'
  | 'errors:RATE_LIMITED'
  | 'judge:pair.noNetwork'
  | 'errors:INTERNAL';

/** Parowanie w toku – strażnik trybu sędziego zostaje na SCR-JDG-06 do końca pobierania migawki. */
export const pairingStore = createStore<{ stage: PairStage }>()(() => ({ stage: 'idle' }));
export const usePairingStage = () => useStore(pairingStore, (s) => s.stage);

export function pairErrorKey(error: unknown): PairErrorKey {
  if (!(error instanceof ApiError)) return 'errors:INTERNAL';
  if (error.code === 'NETWORK' || error.code === 'TIMEOUT') return 'judge:pair.noNetwork';
  if (error.code === 'PAIRING_CODE_INVALID' || error.code === 'VALIDATION_FAILED')
    return 'errors:PAIRING_CODE_INVALID';
  if (error.code === 'LIMIT_EXCEEDED') return 'errors:LIMIT_EXCEEDED';
  if (error.code === 'RATE_LIMITED') return 'errors:RATE_LIMITED';
  return 'errors:INTERNAL';
}

/**
 * Parowanie (IMP-301 krok 4): `POST /v1/devices/pair` → sekret i pepper w SecureStore (ADR-005) →
 * token urządzenia → migawka (IMP-351). Dane innego turnieju są usuwane przed zapisem nowych
 * (IMP-319); niewysłane oceny zostają do eksportu.
 */
export async function pairDevice(
  rt: JudgeRuntime,
  input: { code: string; deviceName?: string },
): Promise<PairResponse> {
  pairingStore.setState({ stage: 'connecting' });
  try {
    const res = PairResponse.parse(
      await unwrap(
        rt.api.POST('/v1/devices/pair', {
          body: {
            code: PairingCode.parse(input.code),
            ...(input.deviceName ? { deviceName: input.deviceName } : {}),
            platform: Platform.OS === 'ios' ? 'ios' : 'android',
            model: (Device.modelName ?? 'unknown').slice(0, 100),
            osVersion: (Device.osVersion ?? 'unknown').slice(0, 40),
            appVersion: appVersion(),
          },
        }),
      ),
    );
    const previous = readMeta(rt.local.read).tournamentId;
    if (previous && previous !== res.tournament.id) {
      await TabletDataLifecycle.wipeTournament(rt.local, {
        keepPending: outbox.countPending(rt.local.read) > 0,
      });
    }
    await saveDeviceCredentials(res);
    pairingStore.setState({ stage: 'loading' });
    await rt.auth.refresh();
    await rt.engine.pullNow();
    restoreJudgeSession(rt.local.read, rt.clock.now());
    rt.connectRealtime(res.tournament.id);
    void rt.engine.start();
    return res;
  } finally {
    pairingStore.setState({ stage: 'idle' });
  }
}

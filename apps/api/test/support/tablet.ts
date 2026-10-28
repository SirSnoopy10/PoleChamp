import type { Call } from './http.js';
import type { organizer } from './scenario.js';

/** Sparowany tablet: kod parowania organizatora → `devices/pair` → token urządzenia. */
export async function pairTablet(
  call: Call,
  org: ReturnType<typeof organizer>,
  tournamentId: string,
  /** `null` – parowanie bez nazwy (API nadaje „Tablet {n}”). */
  name: string | null = 'Tablet stół 1',
) {
  const code = (await org.req('POST', `/v1/tournaments/${tournamentId}/pairing-codes`)).body.code as string;
  const paired = await call('POST', '/v1/devices/pair', {
    body: {
      code,
      ...(name === null ? {} : { deviceName: name }),
      platform: 'android',
      model: 'Galaxy Tab A8',
      osVersion: '15',
      appVersion: '1.0.0',
    },
    ip: `10.50.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`,
  });
  const { deviceId, deviceSecret, pinPepper } = paired.body as {
    deviceId: string;
    deviceSecret: string;
    pinPepper: string;
  };
  const token = (
    await call('POST', '/v1/devices/token', { body: { deviceId, deviceSecret }, ip: '10.60.0.1' })
  ).body.deviceToken as string;
  return { deviceId, deviceSecret, pinPepper, token };
}

/** Logowanie sędziego PIN-em na tablecie (online). */
export async function judgeLogin(call: Call, deviceToken: string, judgeId: string, pin: string) {
  const res = await call('POST', '/v1/judge-sessions', { token: deviceToken, body: { judgeId, pin } });
  return res.body as { judgeToken: string; sessionId: string };
}

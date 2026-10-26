import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pinCrypto } from '../pinCrypto';
import { pinCrypto as webCrypto } from '../pinCrypto.web';
import {
  deviceKey,
  fromBase64,
  toBase64,
  verifierAad,
  verifyPinOffline,
  VerifierUnavailableError,
} from '../pinVerifier';

interface Vector {
  name: string;
  pinPepper: string;
  judgeId: string;
  pinVersion: number;
  pin: string;
  salt: string;
  iterations: number;
  verifier: string;
  deviceKey: string;
  aad: string;
  wrapped: string;
}

const { vectors } = JSON.parse(
  readFileSync(resolve(__dirname, '../../../../../packages/test-fixtures/vectors/pin-wrap.json'), 'utf8'),
) as { vectors: Vector[] };

const input = (v: Vector) => ({
  judgeId: v.judgeId,
  pinVersion: v.pinVersion,
  wrapped: v.wrapped,
  salt: v.salt,
  iterations: v.iterations,
});

describe('IMP-305: weryfikator PIN offline (TL-04, wektory pin-wrap.json)', () => {
  it.each(vectors)('K_dev i aad zgodne z wektorem: $name', async (v) => {
    expect(toBase64(await deviceKey(v.pinPepper))).toBe(v.deviceKey);
    expect(toBase64(verifierAad(v.judgeId, v.pinVersion))).toBe(v.aad);
  });

  it.each(vectors)('TC-STATE-004: poprawny PIN przechodzi, inny nie: $name', async (v) => {
    await expect(verifyPinOffline(v.pin, v.pinPepper, input(v))).resolves.toBe(true);
    const wrong = String((Number(v.pin) + 1) % 10_000).padStart(4, '0');
    await expect(verifyPinOffline(wrong, v.pinPepper, input(v))).resolves.toBe(false);
  });

  it('weryfikator innej wersji PIN-u lub innego sędziego się nie odszyfrowuje (aad)', async () => {
    const v = vectors[0] as Vector;
    await expect(
      verifyPinOffline(v.pin, v.pinPepper, { ...input(v), pinVersion: v.pinVersion + 1 }),
    ).rejects.toBeInstanceOf(VerifierUnavailableError);
    await expect(verifyPinOffline(v.pin, (vectors[1] as Vector).pinPepper, input(v))).rejects.toBeInstanceOf(
      VerifierUnavailableError,
    );
  });

  it('wariant WebCrypto (podgląd web) daje te same wyniki', async () => {
    const v = vectors[1] as Vector;
    expect(toBase64(await deviceKey(v.pinPepper, webCrypto))).toBe(v.deviceKey);
    await expect(verifyPinOffline(v.pin, v.pinPepper, input(v), webCrypto)).resolves.toBe(true);
    expect(webCrypto.equal(fromBase64(v.verifier), fromBase64(v.verifier))).toBe(true);
    expect(pinCrypto.equal(fromBase64(v.verifier), fromBase64(v.deviceKey))).toBe(false);
  });
});

import { pbkdf2Sync } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { deviceKey, pinAad, unwrapVerifier, wrapVerifier } from '../../src/crypto/pin-wrap.js';

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
  iv: string;
  wrapped: string;
}

const { vectors } = JSON.parse(
  readFileSync(new URL('../../../../packages/test-fixtures/vectors/pin-wrap.json', import.meta.url), 'utf8'),
) as { vectors: Vector[] };
const b64 = (v: string) => Buffer.from(v, 'base64');

/** Szyfrowanie weryfikatora PIN offline kluczem urządzenia (TL-04, IMP-144) – wektory wspólne z aplikacją. */
describe('pin-wrap (TL-04)', () => {
  it.each(vectors)('wektor: $name', (v) => {
    const key = deviceKey(b64(v.pinPepper));
    expect(key.toString('base64')).toBe(v.deviceKey);
    expect(pinAad(v.judgeId, v.pinVersion).toString('base64')).toBe(v.aad);
    expect(wrapVerifier(key, b64(v.verifier), v.judgeId, v.pinVersion, b64(v.iv))).toBe(v.wrapped);
    expect(unwrapVerifier(key, v.wrapped, v.judgeId, v.pinVersion).toString('base64')).toBe(v.verifier);
  });

  it('weryfikator z wektora odpowiada PBKDF2 PIN-u', () => {
    const v = vectors[0]!;
    expect(pbkdf2Sync(v.pin, b64(v.salt), v.iterations, 32, 'sha256').toString('base64')).toBe(v.verifier);
  });

  it('inny pepper, sędzia albo wersja PIN-u → odszyfrowanie się nie udaje', () => {
    const v = vectors[0]!;
    const key = deviceKey(b64(v.pinPepper));
    expect(() => unwrapVerifier(key, v.wrapped, v.judgeId, v.pinVersion + 1)).toThrow();
    expect(() => unwrapVerifier(key, v.wrapped, vectors[1]!.judgeId, v.pinVersion)).toThrow();
    expect(() => unwrapVerifier(deviceKey(b64(vectors[1]!.pinPepper)), v.wrapped, v.judgeId, 1)).toThrow();
  });

  it('losowy IV: dwa szyfrowania tego samego weryfikatora różnią się', () => {
    const key = deviceKey(Buffer.alloc(32, 7));
    const verifier = Buffer.alloc(32, 1);
    const a = wrapVerifier(key, verifier, vectors[0]!.judgeId, 1);
    expect(a).not.toBe(wrapVerifier(key, verifier, vectors[0]!.judgeId, 1));
    expect(b64(a)).toHaveLength(12 + 32 + 16);
  });
});

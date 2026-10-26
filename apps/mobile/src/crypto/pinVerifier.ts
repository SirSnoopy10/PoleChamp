import { pinCrypto } from './pinCrypto';
import type { PinCrypto } from './types';

const utf8 = (text: string) => new TextEncoder().encode(text);

export function fromBase64(value: string): Uint8Array {
  const bin = atob(value);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function toBase64(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

/** `aad = UTF-8(judgeId małymi literami) ‖ uint32 BE(pinVersion)` – wiąże weryfikator z sędzią i wersją. */
export function verifierAad(judgeId: string, pinVersion: number): Uint8Array {
  const id = utf8(judgeId.toLowerCase());
  const out = new Uint8Array(id.length + 4);
  out.set(id, 0);
  new DataView(out.buffer).setUint32(id.length, pinVersion, false);
  return out;
}

/** `K_dev = HKDF-SHA256(pinPepper, sól pusta, "pc-pin-v1", 32 B)` (TL-04). */
export const deviceKey = (pinPepper: string, crypto: PinCrypto = pinCrypto) =>
  crypto.hkdfSha256(fromBase64(pinPepper), utf8('pc-pin-v1'), 32);

export interface OfflineVerifier {
  judgeId: string;
  pinVersion: number;
  /** base64(iv 12 B ‖ szyfrogram ‖ tag 16 B). */
  wrapped: string;
  salt: string;
  iterations: number;
}

/** Weryfikator nie daje się odszyfrować (inny pepper, uszkodzone dane) – logowanie tylko online. */
export class VerifierUnavailableError extends Error {
  constructor() {
    super('VERIFIER_UNAVAILABLE');
    this.name = 'VerifierUnavailableError';
  }
}

/**
 * Weryfikacja PIN-u offline (ADR-005, TL-04): odszyfrowanie weryfikatora kluczem urządzenia,
 * PBKDF2-HMAC-SHA256(pin, sól, 600 000) i porównanie w stałym czasie. PIN nie jest nigdzie zapisywany.
 */
export async function verifyPinOffline(
  pin: string,
  pinPepper: string,
  v: OfflineVerifier,
  crypto: PinCrypto = pinCrypto,
): Promise<boolean> {
  const wrapped = fromBase64(v.wrapped);
  if (wrapped.length < 12 + 16 + 1) throw new VerifierUnavailableError();
  let verifier: Uint8Array;
  try {
    verifier = await crypto.aesGcmDecrypt(
      await deviceKey(pinPepper, crypto),
      wrapped.subarray(0, 12),
      wrapped.subarray(12, wrapped.length - 16),
      wrapped.subarray(wrapped.length - 16),
      verifierAad(v.judgeId, v.pinVersion),
    );
  } catch {
    throw new VerifierUnavailableError();
  }
  const derived = await crypto.pbkdf2Sha256(utf8(pin), fromBase64(v.salt), v.iterations, verifier.length);
  return crypto.equal(derived, verifier);
}

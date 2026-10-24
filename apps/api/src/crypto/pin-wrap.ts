import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';

/** Kontekst HKDF klucza urządzenia (TL-04, ADR-005). */
export const PIN_WRAP_INFO = 'pc-pin-v1';
const IV_BYTES = 12;
const TAG_BYTES = 16;

/** `K_dev = HKDF-SHA256(pinPepper, salt = pusty, info = "pc-pin-v1")`, 32 B. */
export function deviceKey(pepper: Buffer): Buffer {
  return Buffer.from(hkdfSync('sha256', pepper, Buffer.alloc(0), PIN_WRAP_INFO, 32));
}

/** `aad = UTF-8(judgeId małymi literami) ‖ uint32 BE(pinVersion)` – weryfikator ważny dla jednej wersji PIN-u. */
export function pinAad(judgeId: string, pinVersion: number): Buffer {
  const version = Buffer.alloc(4);
  version.writeUInt32BE(pinVersion);
  return Buffer.concat([Buffer.from(judgeId.toLowerCase(), 'utf8'), version]);
}

/** `wrapped = base64(iv ‖ AES-256-GCM(K_dev, weryfikator, aad) ‖ tag)`, losowy IV 12 B (IMP-144). */
export function wrapVerifier(
  key: Buffer,
  verifier: Buffer,
  judgeId: string,
  pinVersion: number,
  iv: Buffer = randomBytes(IV_BYTES),
): string {
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(pinAad(judgeId, pinVersion));
  const ct = Buffer.concat([cipher.update(verifier), cipher.final()]);
  return Buffer.concat([iv, ct, cipher.getAuthTag()]).toString('base64');
}

/** Odwrotność `wrapVerifier` (testy i wektory) – zły klucz, sędzia lub wersja PIN-u → wyjątek. */
export function unwrapVerifier(key: Buffer, wrapped: string, judgeId: string, pinVersion: number): Buffer {
  const raw = Buffer.from(wrapped, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', key, raw.subarray(0, IV_BYTES));
  decipher.setAAD(pinAad(judgeId, pinVersion));
  decipher.setAuthTag(raw.subarray(raw.length - TAG_BYTES));
  return Buffer.concat([decipher.update(raw.subarray(IV_BYTES, raw.length - TAG_BYTES)), decipher.final()]);
}

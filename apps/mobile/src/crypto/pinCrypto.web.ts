import type { PinCrypto } from './types';

const subtle = () => globalThis.crypto.subtle;
const buf = (a: Uint8Array) => a as Uint8Array<ArrayBuffer>;

/** Podgląd Expo web (DevCatalog): te same operacje przez WebCrypto. */
export const pinCrypto: PinCrypto = {
  async hkdfSha256(ikm, info, length) {
    const key = await subtle().importKey('raw', buf(ikm), 'HKDF', false, ['deriveBits']);
    const bits = await subtle().deriveBits(
      { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: buf(info) },
      key,
      length * 8,
    );
    return new Uint8Array(bits);
  },
  async aesGcmDecrypt(key, iv, ciphertext, tag, aad) {
    const k = await subtle().importKey('raw', buf(key), 'AES-GCM', false, ['decrypt']);
    const data = new Uint8Array(ciphertext.length + tag.length);
    data.set(ciphertext, 0);
    data.set(tag, ciphertext.length);
    return new Uint8Array(
      await subtle().decrypt({ name: 'AES-GCM', iv: buf(iv), additionalData: buf(aad) }, k, data),
    );
  },
  async pbkdf2Sha256(password, salt, iterations, length) {
    const key = await subtle().importKey('raw', buf(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await subtle().deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt: buf(salt), iterations },
      key,
      length * 8,
    );
    return new Uint8Array(bits);
  },
  equal(a, b) {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= (a[i] as number) ^ (b[i] as number);
    return diff === 0;
  },
};

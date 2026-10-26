import { Buffer, createDecipheriv, hkdfSync, pbkdf2, timingSafeEqual } from 'react-native-quick-crypto';
import type { PinCrypto } from './types';

/**
 * Prymitywy weryfikacji PIN offline na urządzeniu (TL-04): `react-native-quick-crypto` (OpenSSL
 * przez JSI). PBKDF2 600k liczy się natywnie poza wątkiem JS (wariant z wywołaniem zwrotnym).
 * W Jest moduł mapowany na `node:crypto` (to samo API).
 */
export const pinCrypto: PinCrypto = {
  async hkdfSha256(ikm, info, length) {
    return new Uint8Array(hkdfSync('sha256', ikm, new Uint8Array(0), info, length));
  },
  async aesGcmDecrypt(key, iv, ciphertext, tag, aad) {
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAAD(Buffer.from(aad));
    decipher.setAuthTag(Buffer.from(tag));
    const head = decipher.update(ciphertext);
    const tail = decipher.final();
    const out = new Uint8Array(head.length + tail.length);
    out.set(head, 0);
    out.set(tail, head.length);
    return out;
  },
  pbkdf2Sha256(password, salt, iterations, length) {
    return new Promise((resolve, reject) =>
      pbkdf2(password, salt, iterations, length, 'sha256', (error, key) =>
        error || !key ? reject(error ?? new Error('PBKDF2')) : resolve(new Uint8Array(key)),
      ),
    );
  },
  equal: (a, b) => a.length === b.length && timingSafeEqual(a, b),
};

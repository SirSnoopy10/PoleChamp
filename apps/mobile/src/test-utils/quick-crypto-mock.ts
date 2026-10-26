// `react-native-quick-crypto` w Jest: to samo API co `node:crypto` (OpenSSL), bez modułu JSI.
export { Buffer } from 'node:buffer';
export { createDecipheriv, hkdfSync, pbkdf2, timingSafeEqual } from 'node:crypto';

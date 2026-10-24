import { mkdirSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { exportJWK, generateKeyPair } from 'jose';
import { uuidv7 } from './common/ids.js';

/**
 * Lokalne klucze (IMP-006 krok 4): para ES256 do JWT i klucz HMAC `pin_fingerprint`.
 * Zapis do `.secrets/` (w .gitignore) i wypisanie linii do `.env`. W chmurze – Secrets Manager (IMP-014).
 */
const { privateKey } = await generateKeyPair('ES256', { extractable: true });
const jwtKeys = JSON.stringify({ active: { kid: uuidv7(), privateJwk: await exportJWK(privateKey) } });
const pinKey = randomBytes(32).toString('base64');

mkdirSync('.secrets', { recursive: true });
writeFileSync('.secrets/jwt-signing.json', jwtKeys);
writeFileSync('.secrets/pin-fingerprint-hmac.txt', pinKey);
console.log(`JWT_KEYS='${jwtKeys}'`);
console.log(`PIN_FINGERPRINT_KEY=${pinKey}`);

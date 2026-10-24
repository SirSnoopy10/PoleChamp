import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/** UUIDv7 (RFC 9562): 48 bit czasu w ms + losowość – identyfikatory żądań i rodzin tokenów. */
export function uuidv7(now = Date.now()): string {
  const bytes = randomBytes(16);
  bytes.writeUIntBE(now, 0, 6);
  bytes[6] = ((bytes[6] as number) & 0x0f) | 0x70;
  bytes[8] = ((bytes[8] as number) & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const sha256 = (value: string | Buffer): Buffer => createHash('sha256').update(value).digest();
export const sha256Hex = (value: string | Buffer): string => sha256(value).toString('hex');

/** Porównanie stałoczasowe skrótów (kody e-mail, sekrety urządzeń). */
export function safeEqual(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Losowy token 256 bit w base64url (refresh, reset hasła, sekret urządzenia). */
export const randomToken = (): string => randomBytes(32).toString('base64url');

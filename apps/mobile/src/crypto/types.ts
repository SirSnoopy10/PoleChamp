/** Prymitywy kryptograficzne weryfikatora PIN (TL-04) – natywnie quick-crypto, na web WebCrypto. */
export interface PinCrypto {
  /** HKDF-SHA256 z pustą solą. */
  hkdfSha256(ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array>;
  /** AES-256-GCM; błędny tag (zły klucz, `aad`) → wyjątek. */
  aesGcmDecrypt(
    key: Uint8Array,
    iv: Uint8Array,
    ciphertext: Uint8Array,
    tag: Uint8Array,
    aad: Uint8Array,
  ): Promise<Uint8Array>;
  pbkdf2Sha256(
    password: Uint8Array,
    salt: Uint8Array,
    iterations: number,
    length: number,
  ): Promise<Uint8Array>;
  /** Porównanie w stałym czasie. */
  equal(a: Uint8Array, b: Uint8Array): boolean;
}

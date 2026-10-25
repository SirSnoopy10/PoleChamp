import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSite, PLACEHOLDER_CONFIG, type SiteConfig } from './site.js';

/**
 * Budowa strony do `apps/site/public` (IMP-179). Identyfikatory aplikacji z env (CI, po utworzeniu
 * kont Apple / Google / EAS): `APPLE_APP_ID`, `ANDROID_PACKAGE`, `ANDROID_CERT_SHA256` (po przecinku).
 */
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const env = process.env;
const config: SiteConfig = {
  ...PLACEHOLDER_CONFIG,
  ...(env.APPLE_APP_ID ? { appleAppId: env.APPLE_APP_ID } : {}),
  ...(env.ANDROID_PACKAGE ? { androidPackage: env.ANDROID_PACKAGE } : {}),
  ...(env.ANDROID_CERT_SHA256 ? { androidCertFingerprints: env.ANDROID_CERT_SHA256.split(',') } : {}),
  ...(env.APP_STORE_URL ? { appStoreUrl: env.APP_STORE_URL } : {}),
  ...(env.PLAY_STORE_URL ? { playStoreUrl: env.PLAY_STORE_URL } : {}),
};
const files = buildSite(join(root, 'public'), join(root, 'content'), config);
console.log(`Strona: ${files.length} plików w apps/site/public`);

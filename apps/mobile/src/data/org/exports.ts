import { Linking, Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { api, ApiError, unwrap } from '../api';

export const EXPORT_POLL_MS = 1000;
export const EXPORT_TIMEOUT_MS = 30_000;

export type ExportScope =
  | { scope: 'TOURNAMENT'; tournamentId: string }
  | {
      scope: 'CATEGORY';
      tournamentId: string;
      categoryId: string;
    };

export interface ExportDeps {
  create: (body: ExportScope & { format: 'PDF' }) => Promise<{ exportId: string }>;
  status: (exportId: string) => Promise<{ status: 'PENDING' | 'READY' | 'FAILED'; downloadUrl?: string }>;
  /** Pobranie i udostępnienie pliku (systemowy arkusz). */
  deliver: (url: string) => Promise<void>;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
}

/**
 * Eksport PDF (IMP-270): `POST /v1/exports` → odpytywanie co 1 s (maks. 30 s) → pobranie i udostępnienie.
 * Przekroczenie czasu lub `FAILED` → `ApiError('INTERNAL')` (toast „Nie udało się wygenerować PDF…”).
 */
export async function runExport(scope: ExportScope, deps: ExportDeps): Promise<void> {
  const { exportId } = await deps.create({ ...scope, format: 'PDF' });
  const deadline = deps.now() + EXPORT_TIMEOUT_MS;
  for (;;) {
    const current = await deps.status(exportId);
    if (current.status === 'READY' && current.downloadUrl) return deps.deliver(current.downloadUrl);
    if (current.status === 'FAILED' || deps.now() >= deadline) {
      throw new ApiError({ code: 'INTERNAL', status: 500 });
    }
    await deps.sleep(EXPORT_POLL_MS);
  }
}

/** Plik do `cacheDirectory` → arkusz udostępniania → usunięcie z cache (web: otwarcie linku). */
async function deliverPdf(url: string): Promise<void> {
  if (Platform.OS === 'web' || !(await Sharing.isAvailableAsync())) {
    await Linking.openURL(url);
    return;
  }
  const dir = new Directory(Paths.cache, 'exports');
  if (!dir.exists) dir.create({ intermediates: true });
  const file = await File.downloadFileAsync(url, dir, { idempotent: true });
  try {
    await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
  } finally {
    if (file.exists) file.delete();
  }
}

export const exportDeps: ExportDeps = {
  create: (body) => unwrap(api.POST('/v1/exports', { body })),
  status: (exportId) => unwrap(api.GET('/v1/exports/{exportId}', { params: { path: { exportId } } })),
  deliver: deliverPdf,
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now: () => Date.now(),
};

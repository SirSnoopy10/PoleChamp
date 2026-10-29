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

export type ExportFormat = 'PDF' | 'CSV';

export interface ExportDeps {
  create: (body: ExportScope & { format: ExportFormat }) => Promise<{ exportId: string }>;
  status: (exportId: string) => Promise<{ status: 'PENDING' | 'READY' | 'FAILED'; downloadUrl?: string }>;
  /** Pobranie i udostępnienie pliku (systemowy arkusz). */
  deliver: (url: string, format: ExportFormat) => Promise<void>;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
}

/**
 * Eksport PDF/CSV (IMP-270, UX-13/42): `POST /v1/exports` → odpytywanie co 1 s (maks. 30 s) → pobranie
 * i udostępnienie. Gotowy plik z poprzedniego eksportu (`READY` od razu) też trafia do udostępnienia.
 * Przekroczenie czasu lub `FAILED` → `ApiError('INTERNAL')`; błąd pobrania przechodzi do wywołującego.
 */
export async function runExport(
  scope: ExportScope,
  deps: ExportDeps,
  format: ExportFormat = 'PDF',
): Promise<void> {
  const { exportId } = await deps.create({ ...scope, format });
  const deadline = deps.now() + EXPORT_TIMEOUT_MS;
  for (;;) {
    const current = await deps.status(exportId);
    if (current.status === 'READY' && current.downloadUrl) return deps.deliver(current.downloadUrl, format);
    if (current.status === 'FAILED' || deps.now() >= deadline) {
      throw new ApiError({ code: 'INTERNAL', status: 500 });
    }
    await deps.sleep(EXPORT_POLL_MS);
  }
}

const MIME = {
  PDF: { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' },
  CSV: { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text' },
} as const;

/**
 * Plik do `cache/exports` → arkusz udostępniania (web: otwarcie linku). Poprzednie pliki usuwamy przed
 * pobraniem – na Androidzie `shareAsync` kończy się, zanim aplikacja docelowa odczyta plik (UX-13).
 */
async function deliverFile(url: string, format: ExportFormat): Promise<void> {
  if (Platform.OS === 'web' || !(await Sharing.isAvailableAsync())) {
    await Linking.openURL(url);
    return;
  }
  const dir = new Directory(Paths.cache, 'exports');
  if (dir.exists) dir.delete();
  dir.create({ intermediates: true });
  // Czytelna nazwa zamiast klucza S3 (UUID) w arkuszu udostępniania.
  const target = new File(dir, `PoleChamp-wyniki.${format.toLowerCase()}`);
  const file = await File.downloadFileAsync(url, target, { idempotent: true });
  await Sharing.shareAsync(file.uri, MIME[format]);
}

export const exportDeps: ExportDeps = {
  create: (body) => unwrap(api.POST('/v1/exports', { body })),
  status: (exportId) => unwrap(api.GET('/v1/exports/{exportId}', { params: { path: { exportId } } })),
  deliver: deliverFile,
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now: () => Date.now(),
};

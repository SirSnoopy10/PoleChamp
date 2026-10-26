import { Platform, Share } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { loadDeviceCredentials } from '../../data/auth/deviceAuth';
import { readTournament } from '../../data/judge/queries';
import type { Db } from '../../data/local/LocalDb';
import { outbox } from '../../data/outbox/outbox';

/** Wersja formatu pliku eksportu (import po stronie organizatora – v1.1). */
export const EXPORT_FORMAT = 'polechamp.pending-mutations.v1';

/**
 * Treść eksportu niewysłanych ocen (SCR-JDG-10, 06-offline §7): turniej, urządzenie i mutacje
 * z treścią arkuszy. Bez PIN-ów, tokenów, sekretu i peppera urządzenia.
 */
export function buildPendingExport(db: Db, deviceId: string | null, now: Date) {
  const tournament = readTournament(db);
  return {
    format: EXPORT_FORMAT,
    exportedAt: now.toISOString(),
    tournament: tournament ? { id: tournament.id, name: tournament.name } : null,
    deviceId,
    mutations: outbox.pending(db).map((e) => e.mutation),
  };
}

/** Plik JSON przez arkusz udostępniania (`expo-sharing`); web – systemowe `Share` z treścią. */
export async function exportPendingScores(db: Db, now = new Date()): Promise<void> {
  const creds = await loadDeviceCredentials();
  const text = JSON.stringify(buildPendingExport(db, creds?.deviceId ?? null, now), null, 2);
  if (Platform.OS === 'web' || !(await Sharing.isAvailableAsync())) {
    await Share.share({ message: text });
    return;
  }
  const file = new File(Paths.cache, `polechamp-niewyslane-${now.toISOString().replace(/[:.]/g, '-')}.json`);
  file.write(text);
  try {
    await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json' });
  } finally {
    if (file.exists) file.delete();
  }
}

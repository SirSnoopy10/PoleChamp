import { Platform, Share } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { diagLog } from './diagLog';

/** Liczba tapnięć w tytuł „Synchronizacja” (SCR-JDG-07) otwierająca eksport dziennika. */
export const SUPPORT_TAPS = 5;
const TAP_WINDOW_MS = 3000;

/** Ukryty gest wsparcia: `SUPPORT_TAPS` tapnięć w ciągu 3 s → `onUnlock`. */
export function createSupportGesture(onUnlock: () => void, now: () => number = Date.now) {
  let taps: number[] = [];
  return () => {
    const t = now();
    taps = [...taps.filter((x) => t - x < TAP_WINDOW_MS), t];
    if (taps.length >= SUPPORT_TAPS) {
      taps = [];
      onUnlock();
    }
  };
}

/** Eksport dziennika jako plik tekstowy przez arkusz udostępniania (web: systemowe `Share`). */
export async function shareDiagLog(now = new Date()): Promise<void> {
  const text = diagLog.toText();
  if (Platform.OS === 'web' || !(await Sharing.isAvailableAsync())) {
    await Share.share({ message: text });
    return;
  }
  const file = new File(Paths.cache, `polechamp-sync-${now.toISOString().replace(/[:.]/g, '-')}.txt`);
  file.write(text);
  try {
    await Sharing.shareAsync(file.uri, { mimeType: 'text/plain', UTI: 'public.plain-text' });
  } finally {
    if (file.exists) file.delete();
  }
}

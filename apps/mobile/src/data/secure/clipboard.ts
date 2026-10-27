import * as Clipboard from 'expo-clipboard';

/** Czas, po którym skopiowany sekret znika ze schowka (IMP-402 krok 4). */
export const SECRET_CLIPBOARD_TTL_MS = 60_000;

let timer: ReturnType<typeof setTimeout> | undefined;

/**
 * Świadome „Kopiuj” sekretu (PIN sędziego u organizatora): po 60 s schowek jest czyszczony, o ile nadal
 * zawiera ten sekret (nie kasujemy czegoś, co użytkownik skopiował później).
 */
export async function copySecret(value: string): Promise<void> {
  await Clipboard.setStringAsync(value);
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = undefined;
    void Clipboard.getStringAsync()
      .then((current) => (current === value ? Clipboard.setStringAsync('') : undefined))
      .catch(() => undefined);
  }, SECRET_CLIPBOARD_TTL_MS);
}

import type { TFunction } from 'i18next';

const pad = (n: number) => String(n).padStart(2, '0');

/** „14:05” (dziś) albo „3.10 14:05” – czas lokalny urządzenia (SCR-ORG-19, SCR-ORG-22). */
export function formatClock(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const today =
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  return today ? time : `${d.getDate()}.${pad(d.getMonth() + 1)} ${time}`;
}

/** „5 min” / „2 godz.” / „3 dni” od chwili `iso` (SCR-ORG-14, SCR-ORG-18). */
export function sinceText(t: TFunction<['ui', 'org']>, iso: string | null, now = Date.now()): string {
  if (!iso) return t('org:since.now');
  const minutes = Math.max(0, Math.floor((now - Date.parse(iso)) / 60_000));
  if (minutes < 1) return t('org:since.now');
  if (minutes < 60) return t('org:since.minutes', { n: minutes });
  if (minutes < 24 * 60) return t('org:since.hours', { n: Math.floor(minutes / 60) });
  return t('org:since.days', { n: Math.floor(minutes / (24 * 60)) });
}

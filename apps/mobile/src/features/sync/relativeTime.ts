import type { useT } from '../../i18n';

/** „przed chwilą” / „{n} min temu” / „{n} godz. temu” (SCR-JDG-07). */
export function relativeTime(t: ReturnType<typeof useT>, at: number | null, now: number): string {
  if (at === null) return t('judge:sync.never');
  const minutes = Math.floor(Math.max(0, now - at) / 60_000);
  if (minutes < 1) return t('judge:sync.justNow');
  if (minutes < 60) return t('judge:sync.minutesAgo', { count: minutes });
  return t('judge:sync.hoursAgo', { count: Math.floor(minutes / 60) });
}

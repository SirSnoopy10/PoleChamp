const pad = (n: number) => String(n).padStart(2, '0');

/** „14:05” (dziś) albo „3.10 14:05” – czas lokalny urządzenia (SCR-ORG-19, SCR-ORG-22). */
export function formatClock(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const today =
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  return today ? time : `${d.getDate()}.${pad(d.getMonth() + 1)} ${time}`;
}

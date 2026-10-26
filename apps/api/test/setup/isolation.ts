import pg from 'pg';
import { inject, vi } from 'vitest';

/**
 * Izolacja i czas w testach integracyjnych (IMP-451).
 * Domyślnie pliki izolują się unikalnymi danymi (nowe konto na plik) – testy nie zależą od pustej bazy.
 * `truncateAll()` czyści dane aplikacji dla plików, które liczą wiersze globalnie (np. retencja, outbox).
 */
export async function truncateAll(): Promise<void> {
  const client = new pg.Client({ connectionString: inject('adminDatabaseUrl') });
  await client.connect();
  try {
    const { rows } = await client.query<{ name: string }>(
      `SELECT quote_ident(tablename) AS name FROM pg_tables
        WHERE schemaname = 'public' AND tablename <> 'schema_migrations'`,
    );
    if (rows.length > 0) {
      await client.query(`TRUNCATE ${rows.map((r) => r.name).join(', ')} RESTART IDENTITY CASCADE`);
    }
  } finally {
    await client.end();
  }
}

/**
 * Sterowany zegar logiki aplikacji: podmienia tylko `Date` (timery i I/O działają normalnie,
 * więc Fastify, pg i Socket.IO nie zawisają). Baza używa `now()` – czas wierszy cofaj `backdate`.
 */
export function freezeAppClock(at: Date | string) {
  vi.useFakeTimers({ toFake: ['Date'], now: new Date(at) });
  return {
    advance: (ms: number) => vi.setSystemTime(Date.now() + ms),
    restore: () => vi.useRealTimers(),
  };
}

/** Przesuwa kolumnę czasu wierszy w przeszłość (testy wygasania i retencji bez `app_now()`). */
export async function backdate(
  table: string,
  column: string,
  where: { column: string; value: string },
  interval: string,
): Promise<number> {
  const client = new pg.Client({ connectionString: inject('adminDatabaseUrl') });
  await client.connect();
  try {
    const res = await client.query(
      `UPDATE ${pg.escapeIdentifier(table)} SET ${pg.escapeIdentifier(column)} = ${pg.escapeIdentifier(column)} - $1::interval
        WHERE ${pg.escapeIdentifier(where.column)} = $2`,
      [interval, where.value],
    );
    return res.rowCount ?? 0;
  } finally {
    await client.end();
  }
}

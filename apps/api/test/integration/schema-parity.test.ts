import { is } from 'drizzle-orm';
import { getTableConfig, PgTable } from 'drizzle-orm/pg-core';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import * as schema from '../../src/db/schema.js';

/**
 * Zgodność schematu Drizzle (typowane zapytania) z bazą po migracjach SQL (IMP-103 krok 5):
 * każda tabela i kolumna TS istnieje w bazie, a każda kolumna bazy ma odpowiednik w TS.
 */
let client: pg.Client;
beforeAll(async () => {
  client = new pg.Client({ connectionString: inject('adminDatabaseUrl') });
  await client.connect();
});
afterAll(async () => {
  await client.end();
});

const tables = Object.values(schema as Record<string, unknown>).filter((v): v is PgTable => is(v, PgTable));

describe('schemat Drizzle ↔ migracje SQL', () => {
  it('obejmuje wszystkie tabele domenowe', async () => {
    const { rows } = await client.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
          AND table_name NOT LIKE 'audit_log_%' AND table_name <> 'schema_migrations'`,
    );
    const inDb = rows.map((r) => r.table_name).sort();
    const inTs = tables.map((t) => getTableConfig(t).name).sort();
    expect(inTs).toEqual(inDb);
  });

  it.each(tables.map((t) => [getTableConfig(t).name, t] as const))(
    'kolumny tabeli %s',
    async (name, table) => {
      const { rows } = await client.query<{ column_name: string; is_nullable: string }>(
        'SELECT column_name, is_nullable FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2',
        ['public', name],
      );
      const dbColumns = Object.fromEntries(rows.map((r) => [r.column_name, r.is_nullable === 'NO']));
      const tsColumns = Object.fromEntries(getTableConfig(table).columns.map((c) => [c.name, c.notNull]));
      expect(tsColumns).toEqual(dbColumns);
    },
  );
});

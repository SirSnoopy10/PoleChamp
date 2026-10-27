import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';

/** Kolumny techniczne (bez danych osobowych) – reszta musi być w inwentarzu IMP-406. */
const TECHNICAL = new Set([
  'id',
  'tournament_id',
  'created_at',
  'updated_at',
  'version',
  'position',
  'is_active',
  'pin_version',
  'failed_pin_count',
  'pin_locked_at',
  'email_verified_at',
  'failed_login_count',
  'locked_until',
  'lockout_level',
  'deleted_at',
  'pseudonymized_at',
]);

/** Kolumny spoza 05-bezpieczenstwo §5.2 – nie mogą istnieć (NFR-502). */
const FORBIDDEN = /pesel|address|adres|phone|telefon|birth_date|date_of_birth|photo|health/i;

const inventory = readFileSync(
  resolve(import.meta.dirname, '../../../../docs-dev/privacy/data-inventory.md'),
  'utf8',
);

/** Kolumny z danymi osobowymi wpisane dla tabeli w inwentarzu. */
function inventoryColumns(table: string): string[] {
  const row = inventory.split('\n').find((l) => l.startsWith(`| \`${table}\` |`));
  return [...(row?.split('|')[2] ?? '').matchAll(/`([a-z_]+)`/g)].map((m) => m[1]!);
}

let client: pg.Client;
beforeAll(async () => {
  client = new pg.Client({ connectionString: inject('adminDatabaseUrl') });
  await client.connect();
});
afterAll(async () => {
  await client.end();
});

describe('IMP-406: minimalizacja danych', () => {
  it.each(['athlete', 'judge', 'app_user'])(
    'TC-RODO-003: kolumny tabeli %s – tylko techniczne i z inwentarza, bez danych spoza §5.2',
    async (table) => {
      const { rows } = await client.query<{ column_name: string }>(
        'SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2',
        ['public', table],
      );
      const columns = rows.map((r) => r.column_name);
      const personal = inventoryColumns(table);
      expect(personal.length).toBeGreaterThan(0);
      expect(columns.filter((c) => FORBIDDEN.test(c))).toEqual([]);
      expect(columns.filter((c) => !TECHNICAL.has(c) && !personal.includes(c))).toEqual([]);
      // Inwentarz nie opisuje kolumn, których nie ma.
      expect(personal.filter((c) => !columns.includes(c))).toEqual([]);
    },
  );

  it('TC-RODO-003: zawodniczka bez e-maila', async () => {
    const { rows } = await client.query(
      "SELECT 1 FROM information_schema.columns WHERE table_name = 'athlete' AND column_name LIKE '%mail%'",
    );
    expect(rows).toEqual([]);
  });
});

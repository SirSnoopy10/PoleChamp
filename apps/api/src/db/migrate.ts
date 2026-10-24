import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

/** Katalog migracji SQL (przeglądanych w PR) – ten sam dla `src/` i `dist/`. */
export const MIGRATIONS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../migrations');

const MIGRATION_FILE = /^\d{4}_[a-z0-9_]+\.sql$/;

export interface MigrateOptions {
  /** Hasła ról ustawiane po utworzeniu (lokalnie i w testach; w produkcji Secrets Manager). */
  rolePasswords?: Partial<Record<'pc_app' | 'pc_migrator' | 'pc_retention' | 'pc_readonly', string>>;
  log?: (message: string) => void;
}

/**
 * Polecenie `migrate` (IMP-103): role → migracje `NNNN_*.sql` w kolejności (każda w transakcji,
 * zapis w `schema_migrations`) → uprawnienia. Idempotentne.
 */
export async function migrate(connectionString: string, options: MigrateOptions = {}): Promise<string[]> {
  const log = options.log ?? (() => undefined);
  const client = new pg.Client({ connectionString });
  await client.connect();
  const applied: string[] = [];
  try {
    await client.query(readFileSync(resolve(MIGRATIONS_DIR, 'roles.sql'), 'utf8'));
    for (const [role, password] of Object.entries(options.rolePasswords ?? {})) {
      if (password) await client.query(`ALTER ROLE ${role} PASSWORD ${pg.escapeLiteral(password)}`);
    }
    await client.query(
      'CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())',
    );
    const done = new Set(
      (await client.query<{ version: string }>('SELECT version FROM schema_migrations')).rows.map(
        (r) => r.version,
      ),
    );
    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => MIGRATION_FILE.test(f))
      .sort();
    for (const file of files) {
      const version = file.replace(/\.sql$/, '');
      if (done.has(version)) continue;
      await client.query('BEGIN');
      try {
        await client.query(readFileSync(resolve(MIGRATIONS_DIR, file), 'utf8'));
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [version]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`Migracja ${file} nie powiodła się: ${(error as Error).message}`, { cause: error });
      }
      applied.push(version);
      log(`migracja ${version}`);
    }
    await client.query(readFileSync(resolve(MIGRATIONS_DIR, 'grants.sql'), 'utf8'));
  } finally {
    await client.end();
  }
  return applied;
}

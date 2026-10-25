import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Migracje lokalnej bazy tabletu (`PRAGMA user_version`). Schemat danych sędziego (outbox, migawka)
 * dochodzi w EP-08; EP-06 zakłada tylko mechanizm i tabelę metadanych.
 */
export const MIGRATIONS: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);`,
];

export function migrate(db: Pick<SQLiteDatabase, 'execSync' | 'getFirstSync'>): number {
  const row = db.getFirstSync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  for (; version < MIGRATIONS.length; version++) {
    db.execSync(`${MIGRATIONS[version]}\nPRAGMA user_version = ${version + 1};`);
  }
  return version;
}

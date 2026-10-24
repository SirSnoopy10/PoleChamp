import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';

export type Db = NodePgDatabase<typeof schema>;
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];
export { schema };

export interface DbHandle {
  db: Db;
  pool: pg.Pool;
}

/** Pula `pg` + Drizzle (IMP-103 krok 1): limity czasu zapytań i transakcji, TLS poza dev. */
export function createDb(options: { url: string; ssl?: boolean; max?: number }): DbHandle {
  const pool = new pg.Pool({
    connectionString: options.url,
    max: options.max ?? 20,
    ssl: options.ssl ? { rejectUnauthorized: true } : undefined,
    statement_timeout: 5_000,
    idle_in_transaction_session_timeout: 10_000,
  });
  return { pool, db: drizzle(pool, { schema }) };
}

export const DB = Symbol('DB');
export const DB_POOL = Symbol('DB_POOL');

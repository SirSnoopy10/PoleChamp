import { Platform } from 'react-native';
import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';
import { migrate } from './migrations';

/** Synchroniczne API połączenia używane przez repozytoria (wewnątrz `tx` i do odczytów). */
export type Db = Pick<SQLiteDatabase, 'execSync' | 'runSync' | 'getFirstSync' | 'getAllSync'>;

export const DB_NAME = 'polechamp.db';

/** PRAGMA trwałości (TL-20): WAL + `synchronous = FULL` (utrata zasilania – NFR-302), na iOS fullfsync. */
export function applyPragmas(db: Db, os: string = Platform.OS): void {
  db.execSync('PRAGMA journal_mode = WAL;');
  db.execSync('PRAGMA synchronous = FULL;');
  db.execSync('PRAGMA foreign_keys = ON;');
  if (os === 'ios') {
    db.execSync('PRAGMA fullfsync = ON;');
    db.execSync('PRAGMA checkpoint_fullfsync = ON;');
  }
}

/**
 * Lokalna baza tabletu (IMP-350). Zapisy wyłącznie przez `tx` (`BEGIN IMMEDIATE`); transakcje są
 * kolejkowane, bo jedno połączenie nie może mieć dwóch otwartych transakcji (await w środku `fn`).
 * Obietnica `tx` kończy się po `COMMIT` – dopiero wtedy UI może potwierdzić zapis oceny.
 */
export class LocalDb {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(readonly db: SQLiteDatabase) {}

  static open(name = DB_NAME, directory?: string): LocalDb {
    const db = openDatabaseSync(name, undefined, directory);
    applyPragmas(db);
    migrate(db);
    return new LocalDb(db);
  }

  tx<T>(fn: (db: Db) => T | Promise<T>): Promise<T> {
    const run = this.queue.then(async () => {
      this.db.execSync('BEGIN IMMEDIATE');
      try {
        const result = await fn(this.db);
        this.db.execSync('COMMIT');
        return result;
      } catch (error) {
        this.db.execSync('ROLLBACK');
        throw error;
      }
    });
    this.queue = run.catch(() => undefined);
    return run;
  }

  get read(): Db {
    return this.db;
  }

  close(): void {
    this.db.closeSync();
  }
}

let shared: LocalDb | null = null;

/** Baza aplikacji otwierana leniwie przy pierwszym ekranie trybu sędziego. */
export function localDb(): LocalDb {
  shared ??= LocalDb.open();
  return shared;
}

/** Tylko testy. */
export function setLocalDb(db: LocalDb | null): void {
  shared = db;
}

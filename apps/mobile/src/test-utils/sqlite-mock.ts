// Mock `expo-sqlite` na better-sqlite3 (IMP-201): to samo API synchroniczne/asynchroniczne,
// którego używa aplikacja, i te same migracje (`src/db/migrations.ts`).
import Database from 'better-sqlite3';

type Params = unknown[] | Record<string, unknown>;

const normalize = (params: unknown[]): Params => {
  const [first] = params;
  if (params.length === 1 && first !== null && typeof first === 'object') return first as Params;
  return params.length === 1 && Array.isArray(first) ? (first as unknown[]) : params;
};

/** Parametry nazwane expo-sqlite mają prefiks (`$id`), better-sqlite3 – bez prefiksu. */
const bind = (params: Params) =>
  Array.isArray(params)
    ? params
    : Object.fromEntries(Object.entries(params).map(([k, v]) => [k.replace(/^[$:@]/, ''), v]));

export class SQLiteDatabase {
  readonly db: Database.Database;

  /** Bez katalogu – baza w pamięci; z katalogiem (testy PRAGMA WAL) – plik. */
  constructor(readonly databasePath: string) {
    this.db = new Database(/[/\\]/.test(databasePath) ? databasePath : ':memory:');
  }

  execSync(source: string): void {
    this.db.exec(source);
  }
  runSync(source: string, ...params: unknown[]) {
    const r = this.db.prepare(source).run(bind(normalize(params)));
    return { lastInsertRowId: Number(r.lastInsertRowid), changes: r.changes };
  }
  getFirstSync<T>(source: string, ...params: unknown[]): T | null {
    return (this.db.prepare(source).get(bind(normalize(params))) as T | undefined) ?? null;
  }
  getAllSync<T>(source: string, ...params: unknown[]): T[] {
    return this.db.prepare(source).all(bind(normalize(params))) as T[];
  }
  withTransactionSync(task: () => void): void {
    this.db.transaction(task)();
  }
  closeSync(): void {
    this.db.close();
  }

  async execAsync(source: string) {
    this.execSync(source);
  }
  async runAsync(source: string, ...params: unknown[]) {
    return this.runSync(source, ...params);
  }
  async getFirstAsync<T>(source: string, ...params: unknown[]) {
    return this.getFirstSync<T>(source, ...params);
  }
  async getAllAsync<T>(source: string, ...params: unknown[]) {
    return this.getAllSync<T>(source, ...params);
  }
  async withTransactionAsync(task: () => Promise<void>) {
    this.db.exec('BEGIN');
    try {
      await task();
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
  async closeAsync() {
    this.closeSync();
  }
}

const path = (name: string, directory?: string) => (directory ? `${directory}/${name}` : name);

export const openDatabaseSync = (name: string, _options?: unknown, directory?: string) =>
  new SQLiteDatabase(path(name, directory));
export const openDatabaseAsync = async (name: string, _options?: unknown, directory?: string) =>
  new SQLiteDatabase(path(name, directory));

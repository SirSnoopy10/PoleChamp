import type pg from 'pg';

export type Role = 'pc_app' | 'pc_retention' | 'pc_readonly';

/** Klient zapytań w imieniu roli: osobne połączenie (staging) albo `SET ROLE` administratora (testy). */
export type RoleQuery = (role: Role, sql: string) => Promise<void>;

interface Denied {
  role: Role;
  sql: string;
}

/**
 * Operacje, które muszą się nie udać (INT-08, NFR-409, TC-INT-008/TC-SEC-019). `WHERE false` – sprawdzenie
 * uprawnień następuje przy planowaniu, więc na staging/produkcji żaden wiersz nie jest zmieniany.
 */
export const MUST_DENY: readonly Denied[] = [
  { role: 'pc_app', sql: 'UPDATE audit_log SET action = action WHERE false' },
  { role: 'pc_app', sql: 'DELETE FROM audit_log WHERE false' },
  { role: 'pc_app', sql: 'TRUNCATE audit_log' },
  { role: 'pc_app', sql: 'UPDATE score_sheet_revision SET revision = revision WHERE false' },
  { role: 'pc_app', sql: 'DELETE FROM score_sheet_revision WHERE false' },
  { role: 'pc_app', sql: 'SELECT 1 FROM schema_migrations WHERE false' },
  { role: 'pc_app', sql: 'CREATE TABLE pc_privilege_probe (id int)' },
  { role: 'pc_app', sql: "SELECT drop_old_audit_partitions(DATE '1900-01-01')" },
  { role: 'pc_readonly', sql: "INSERT INTO audit_log (actor_type, action) SELECT 'SYSTEM', 'X' WHERE false" },
  { role: 'pc_readonly', sql: 'UPDATE athlete SET club = club WHERE false' },
  { role: 'pc_readonly', sql: 'DELETE FROM tournament WHERE false' },
  { role: 'pc_readonly', sql: 'CREATE TABLE pc_privilege_probe (id int)' },
  { role: 'pc_retention', sql: 'UPDATE athlete SET tournament_id = tournament_id WHERE false' },
  { role: 'pc_retention', sql: 'DELETE FROM athlete WHERE false' },
  { role: 'pc_retention', sql: 'DELETE FROM audit_log WHERE false' },
  { role: 'pc_retention', sql: 'UPDATE audit_log SET action = action WHERE false' },
  { role: 'pc_retention', sql: 'CREATE TABLE pc_privilege_probe (id int)' },
];

/** Operacje, które role muszą móc wykonać (bez zmian danych). */
export const MUST_ALLOW: readonly Denied[] = [
  { role: 'pc_app', sql: "INSERT INTO audit_log (actor_type, action) SELECT 'SYSTEM', 'X' WHERE false" },
  { role: 'pc_app', sql: 'UPDATE athlete SET club = club WHERE false' },
  { role: 'pc_readonly', sql: 'SELECT 1 FROM audit_log WHERE false' },
  { role: 'pc_retention', sql: 'UPDATE athlete SET full_name = full_name WHERE false' },
  { role: 'pc_retention', sql: 'UPDATE audit_log SET ip = ip WHERE false' },
  { role: 'pc_retention', sql: 'DELETE FROM change_log WHERE false' },
];

const INSUFFICIENT_PRIVILEGE = '42501';

/** Lista naruszeń (pusta = role zgodne z INT-08). */
export async function checkPrivileges(query: RoleQuery): Promise<string[]> {
  const violations: string[] = [];
  for (const { role, sql } of MUST_DENY) {
    try {
      await query(role, sql);
      violations.push(`${role} może: ${sql}`);
    } catch (error) {
      if ((error as { code?: string }).code !== INSUFFICIENT_PRIVILEGE) {
        violations.push(
          `${role}: nieoczekiwany błąd ${(error as { code?: string }).code ?? '?'} dla: ${sql}`,
        );
      }
    }
  }
  for (const { role, sql } of MUST_ALLOW) {
    try {
      await query(role, sql);
    } catch (error) {
      violations.push(`${role} nie może (${(error as { code?: string }).code ?? '?'}): ${sql}`);
    }
  }
  return violations;
}

/** Każde sprawdzenie w transakcji wycofywanej – nawet przypadkowo przyznane uprawnienie niczego nie zmieni. */
export async function inRollback(client: pg.ClientBase, sql: string, setRole?: Role): Promise<void> {
  await client.query('BEGIN');
  try {
    if (setRole) await client.query(`SET LOCAL ROLE ${setRole}`);
    await client.query(sql);
  } finally {
    await client.query('ROLLBACK');
  }
}

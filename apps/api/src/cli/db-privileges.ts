import pg from 'pg';
import { checkPrivileges, inRollback, type Role } from '../db/privileges.js';

/**
 * Test uprawnień ról bazy na środowisku (IMP-409, `--target staging`): łączy się każdą rolą osobno
 * (adresy z Secrets Manager w zadaniu ECS: `PC_APP_DATABASE_URL`, `RETENTION_DATABASE_URL`,
 * `PC_READONLY_DATABASE_URL`) i wypisuje naruszenia; kod wyjścia 1 przy naruszeniu. Każde sprawdzenie
 * w wycofywanej transakcji z `WHERE false` – nie zmienia danych.
 */
const URLS: Record<Role, string | undefined> = {
  pc_app: process.env.PC_APP_DATABASE_URL ?? process.env.DATABASE_URL,
  pc_retention: process.env.RETENTION_DATABASE_URL,
  pc_readonly: process.env.PC_READONLY_DATABASE_URL,
};

const clients = new Map<Role, pg.Client>();
try {
  for (const [role, url] of Object.entries(URLS) as [Role, string | undefined][]) {
    if (!url) throw new Error(`Brak adresu bazy dla roli ${role}`);
    const client = new pg.Client({ connectionString: url, application_name: 'db-privileges' });
    await client.connect();
    clients.set(role, client);
  }
  const violations = await checkPrivileges((role, sql) => {
    const client = clients.get(role);
    if (!client) throw new Error(`Brak połączenia roli ${role}`);
    return inRollback(client, sql);
  });
  console.log(
    JSON.stringify({ check: 'db_privileges', target: process.env.DEPLOY_ENV ?? 'local', violations }),
  );
  if (violations.length > 0) process.exitCode = 1;
} finally {
  await Promise.all([...clients.values()].map((c) => c.end()));
}

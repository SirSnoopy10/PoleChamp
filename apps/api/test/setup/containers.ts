import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { GenericContainer, type StartedTestContainer } from 'testcontainers';
import type { TestProject } from 'vitest/node';
import { migrate } from '../../src/db/migrate.js';

/**
 * Global setup testów integracyjnych (IMP-004, IMP-451): PostgreSQL 18 i Valkey 8 w Testcontainers,
 * migracje jako superużytkownik, aplikacja łączy się rolą `pc_app` (jak w produkcji).
 */
export const APP_PASSWORD = 'pc_app_test';

let postgres: StartedPostgreSqlContainer | undefined;
let valkey: StartedTestContainer | undefined;

export async function setup(project: TestProject) {
  [postgres, valkey] = await Promise.all([
    new PostgreSqlContainer('postgres:18').withDatabase('polechamp').start(),
    new GenericContainer('valkey/valkey:8').withExposedPorts(6379).start(),
  ]);
  const adminUrl = postgres.getConnectionUri();
  await migrate(adminUrl, { rolePasswords: { pc_app: APP_PASSWORD } });
  const appUrl = new URL(adminUrl);
  appUrl.username = 'pc_app';
  appUrl.password = APP_PASSWORD;
  project.provide('adminDatabaseUrl', adminUrl);
  project.provide('databaseUrl', appUrl.toString());
  project.provide('valkeyUrl', `redis://${valkey.getHost()}:${valkey.getMappedPort(6379)}`);
  project.provide('valkeyContainerId', valkey.getId());
}

export async function teardown() {
  await Promise.all([postgres?.stop(), valkey?.stop()]);
}

declare module 'vitest' {
  export interface ProvidedContext {
    adminDatabaseUrl: string;
    databaseUrl: string;
    valkeyUrl: string;
    valkeyContainerId: string;
  }
}

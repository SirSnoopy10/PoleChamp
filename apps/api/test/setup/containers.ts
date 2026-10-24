import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { GenericContainer, Wait, type StartedTestContainer } from 'testcontainers';
import type { TestProject } from 'vitest/node';
import { migrate } from '../../src/db/migrate.js';

/**
 * Global setup testów integracyjnych (IMP-004, IMP-451): PostgreSQL 18, Valkey 8 i S3Mock (S3, IMP-171)
 * w Testcontainers,
 * migracje jako superużytkownik, aplikacja łączy się rolą `pc_app` (jak w produkcji).
 */
export const APP_PASSWORD = 'pc_app_test';
export const S3_KEY = 'polechamp';
export const S3_SECRET = 'polechamp-test';

let postgres: StartedPostgreSqlContainer | undefined;
let valkey: StartedTestContainer | undefined;
let s3mock: StartedTestContainer | undefined;

export async function setup(project: TestProject) {
  [postgres, valkey, s3mock] = await Promise.all([
    new PostgreSqlContainer('postgres:18').withDatabase('polechamp').start(),
    new GenericContainer('valkey/valkey:8').withExposedPorts(6379).start(),
    // Obrazy MinIO nie są już publikowane w Docker Hub – S3Mock (Adobe) jako lokalne S3.
    new GenericContainer('adobe/s3mock:4.10.0')
      .withEnvironment({ COM_ADOBE_TESTING_S3MOCK_STORE_INITIAL_BUCKETS: 'exports' })
      .withExposedPorts(9090)
      .withWaitStrategy(Wait.forHttp('/favicon.ico', 9090).forStatusCodeMatching(() => true))
      .start(),
  ]);
  const s3Endpoint = `http://${s3mock.getHost()}:${s3mock.getMappedPort(9090)}`;
  const adminUrl = postgres.getConnectionUri();
  await migrate(adminUrl, { rolePasswords: { pc_app: APP_PASSWORD } });
  const appUrl = new URL(adminUrl);
  appUrl.username = 'pc_app';
  appUrl.password = APP_PASSWORD;
  project.provide('adminDatabaseUrl', adminUrl);
  project.provide('databaseUrl', appUrl.toString());
  project.provide('valkeyUrl', `redis://${valkey.getHost()}:${valkey.getMappedPort(6379)}`);
  project.provide('valkeyContainerId', valkey.getId());
  project.provide('s3Endpoint', s3Endpoint);
}

export async function teardown() {
  await Promise.all([postgres?.stop(), valkey?.stop(), s3mock?.stop()]);
}

declare module 'vitest' {
  export interface ProvidedContext {
    adminDatabaseUrl: string;
    databaseUrl: string;
    valkeyUrl: string;
    valkeyContainerId: string;
    s3Endpoint: string;
  }
}

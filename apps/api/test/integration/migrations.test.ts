import pg from 'pg';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { migrate } from '../../src/db/migrate.js';

let admin: pg.Client;
let app: pg.Client;

beforeAll(async () => {
  admin = new pg.Client({ connectionString: inject('adminDatabaseUrl') });
  app = new pg.Client({ connectionString: inject('databaseUrl') });
  await Promise.all([admin.connect(), app.connect()]);
});
afterAll(async () => {
  await Promise.all([admin.end(), app.end()]);
});

describe('migracje (IMP-103…107)', () => {
  it('są idempotentne – ponowne uruchomienie nic nie stosuje', async () => {
    expect(await migrate(inject('adminDatabaseUrl'))).toEqual([]);
    const { rows } = await admin.query('SELECT version FROM schema_migrations ORDER BY version');
    expect(rows.map((r) => r.version)).toEqual([
      '0001_auth',
      '0002_tournament_config',
      '0003_scoring',
      '0004_technical',
      '0005_search',
      '0006_judge_name_ci',
      '0007_event_device_target',
      '0008_score_sheet_judge_idx',
      '0009_domain_event_notify',
      '0010_export_format',
      '0011_retention',
    ]);
  });

  it('PostgreSQL 18 – natywne uuidv7()', async () => {
    const { rows } = await app.query('SELECT uuidv7()::text AS id');
    expect(rows[0].id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7/);
  });

  it('TC-INT-008 / TC-SEC-019: rola aplikacji nie zmienia ani nie usuwa historii', async () => {
    await app.query(
      "INSERT INTO audit_log (actor_type, action, entity_type) VALUES ('SYSTEM', 'TEST_ENTRY', 'test')",
    );
    await expect(app.query("UPDATE audit_log SET action = 'X'")).rejects.toMatchObject({ code: '42501' });
    await expect(app.query('DELETE FROM audit_log')).rejects.toMatchObject({ code: '42501' });
    await expect(app.query('DELETE FROM score_sheet_revision')).rejects.toMatchObject({ code: '42501' });
    await expect(app.query('SELECT * FROM schema_migrations')).rejects.toMatchObject({ code: '42501' });
    const { rows } = await app.query("SELECT count(*)::int AS n FROM audit_log WHERE action = 'TEST_ENTRY'");
    expect(rows[0].n).toBe(1);
  });

  it('audyt ma partycje miesięczne i partycję zapasową', async () => {
    const { rows } = await admin.query(
      "SELECT relname FROM pg_class c JOIN pg_inherits i ON i.inhrelid = c.oid WHERE i.inhparent = 'audit_log'::regclass",
    );
    const names = rows.map((r) => r.relname as string);
    expect(names).toContain('audit_log_default');
    expect(names.filter((n) => /^audit_log_\d{4}_\d{2}$/.test(n)).length).toBeGreaterThanOrEqual(4);
  });
});

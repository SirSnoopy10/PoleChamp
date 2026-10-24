-- Role bazy (IMP-009, INT-08). Idempotentne – uruchamiane przed migracjami.
-- Hasła ustawia operator (Secrets Manager); lokalnie i w testach – polecenie `migrate` z env.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'pc_migrator') THEN CREATE ROLE pc_migrator LOGIN; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'pc_app') THEN CREATE ROLE pc_app LOGIN; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'pc_retention') THEN CREATE ROLE pc_retention LOGIN; END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'pc_readonly') THEN CREATE ROLE pc_readonly LOGIN; END IF;
END
$$;

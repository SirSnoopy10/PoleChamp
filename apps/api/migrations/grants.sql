-- Uprawnienia ról (INT-08, IMP-107). Idempotentne – uruchamiane po każdej migracji.
GRANT USAGE ON SCHEMA public TO pc_app, pc_retention, pc_readonly;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO pc_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO pc_app;
-- Historia jest tylko do dopisywania dla aplikacji.
REVOKE UPDATE, DELETE, TRUNCATE ON audit_log, score_sheet_revision FROM pc_app;
REVOKE UPDATE, DELETE, TRUNCATE ON audit_log_default FROM pc_app;
DO $$
DECLARE part record;
BEGIN
  FOR part IN SELECT inhrelid::regclass AS rel FROM pg_inherits WHERE inhparent = 'audit_log'::regclass LOOP
    EXECUTE format('REVOKE UPDATE, DELETE, TRUNCATE ON %s FROM pc_app', part.rel);
  END LOOP;
END
$$;
GRANT EXECUTE ON FUNCTION ensure_audit_partitions(integer) TO pc_app;
REVOKE ALL ON schema_migrations FROM pc_app;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO pc_readonly;

-- Retencja: usuwanie danych technicznych i pseudonimizacja (TL-16).
GRANT SELECT ON ALL TABLES IN SCHEMA public TO pc_retention;
GRANT DELETE ON change_log, processed_mutation, idempotency_key, auth_email_token, auth_refresh_token TO pc_retention;
GRANT UPDATE (before, after, ip) ON audit_log TO pc_retention;
GRANT UPDATE (snapshot) ON score_sheet_revision TO pc_retention;
GRANT UPDATE (full_name, club, birth_year, pseudonymized_at) ON athlete TO pc_retention;
GRANT UPDATE (full_name, initials) ON judge TO pc_retention;
GRANT DELETE ON export_job TO pc_retention;
-- Dziennik zmian dla tabletów po pseudonimizacji (blokada i kursor turnieju) oraz audyt `SYSTEM`.
GRANT INSERT ON change_log, domain_event, audit_log TO pc_retention;
GRANT UPDATE (change_seq) ON tournament TO pc_retention;
GRANT UPDATE (payload) ON domain_event TO pc_retention;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO pc_retention;
GRANT EXECUTE ON FUNCTION drop_old_audit_partitions(date), purge_account(uuid) TO pc_retention;
REVOKE EXECUTE ON FUNCTION drop_old_audit_partitions(date), purge_account(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION scrub_athlete_pii(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION scrub_athlete_pii(uuid) TO pc_app;

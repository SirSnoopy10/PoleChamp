-- IMP-107: audyt (partycje miesięczne), dziennik zmian, idempotencja mutacji, outbox zdarzeń, eksporty.
CREATE TABLE audit_log (
  id bigserial,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  tournament_id uuid,
  actor_type actor_type NOT NULL,
  actor_id uuid,
  device_id uuid,
  action varchar(60) NOT NULL,
  entity_type varchar(40),
  entity_id uuid,
  before jsonb,
  after jsonb,
  request_id uuid,
  ip inet,
  PRIMARY KEY (id, occurred_at)
) PARTITION BY RANGE (occurred_at);
CREATE INDEX audit_log_tournament_idx ON audit_log (tournament_id, occurred_at DESC);
CREATE INDEX audit_log_entity_idx ON audit_log (entity_type, entity_id);

-- Tworzy partycje od bieżącego miesiąca na `months_ahead` miesięcy (worker raz dziennie, IMP-107 krok 1).
CREATE FUNCTION ensure_audit_partitions(months_ahead integer) RETURNS void
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  month_start date := date_trunc('month', now())::date;
  i integer;
  from_d date;
  to_d date;
  part text;
BEGIN
  FOR i IN 0..months_ahead LOOP
    from_d := (month_start + make_interval(months => i))::date;
    to_d := (from_d + interval '1 month')::date;
    part := format('audit_log_%s', to_char(from_d, 'YYYY_MM'));
    IF NOT EXISTS (SELECT FROM pg_class WHERE relname = part) THEN
      EXECUTE format('CREATE TABLE %I PARTITION OF audit_log FOR VALUES FROM (%L) TO (%L)', part, from_d, to_d);
    END IF;
  END LOOP;
END;
$$;
SELECT ensure_audit_partitions(3);
-- Partycja zapasowa – wpis z datą spoza utworzonych partycji nie może zgubić audytu.
CREATE TABLE audit_log_default PARTITION OF audit_log DEFAULT;

CREATE TABLE change_log (
  seq bigserial PRIMARY KEY,
  tournament_id uuid NOT NULL REFERENCES tournament (id) ON DELETE CASCADE,
  entity_type varchar(30) NOT NULL,
  entity_id uuid NOT NULL,
  op char(1) NOT NULL CHECK (op IN ('U', 'D')),
  audience varchar(50) NOT NULL DEFAULT 'ALL',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX change_log_tournament_seq_idx ON change_log (tournament_id, seq);

CREATE TABLE processed_mutation (
  mutation_id uuid PRIMARY KEY,
  device_id uuid,
  request_hash char(64) NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE domain_event (
  id bigserial PRIMARY KEY,
  tournament_id uuid,
  type varchar(40) NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);
CREATE INDEX domain_event_unpublished_idx ON domain_event (published_at) WHERE published_at IS NULL;

CREATE TABLE export_job (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  tournament_id uuid NOT NULL REFERENCES tournament (id) ON DELETE CASCADE,
  scope export_scope NOT NULL,
  category_id uuid REFERENCES category (id) ON DELETE CASCADE,
  status export_status NOT NULL DEFAULT 'QUEUED',
  results_versions jsonb,
  results_hash char(64),
  s3_key text,
  created_by uuid REFERENCES app_user (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  expires_at timestamptz,
  error text
);

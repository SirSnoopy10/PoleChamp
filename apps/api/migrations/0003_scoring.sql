-- IMP-106: urządzenia, sesje, arkusze ocen, odrzucenia, wyniki (02-model §2.11–2.19, INT-03, INT-06).
CREATE TABLE device (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  tournament_id uuid NOT NULL REFERENCES tournament (id) ON DELETE CASCADE,
  name varchar(60) NOT NULL,
  platform varchar(10) NOT NULL CHECK (platform IN ('ios', 'android')),
  model varchar(100),
  os_version varchar(40),
  app_version varchar(40),
  secret_hash bytea NOT NULL,
  pepper bytea NOT NULL,
  paired_at timestamptz NOT NULL DEFAULT now(),
  paired_by uuid REFERENCES app_user (id),
  revoked_at timestamptz,
  last_seen_at timestamptz,
  last_sync_at timestamptz,
  last_sync_cursor bigint,
  pending_mutations integer NOT NULL DEFAULT 0,
  active_judge_id uuid REFERENCES judge (id) ON DELETE SET NULL,
  battery_level smallint CHECK (battery_level BETWEEN 0 AND 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX device_active_idx ON device (tournament_id) WHERE revoked_at IS NULL;

CREATE TABLE pairing_code (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  tournament_id uuid NOT NULL REFERENCES tournament (id) ON DELETE CASCADE,
  code_hash bytea NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  max_uses smallint NOT NULL DEFAULT 10,
  use_count smallint NOT NULL DEFAULT 0,
  created_by uuid REFERENCES app_user (id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE judge_session (
  id uuid PRIMARY KEY,
  judge_id uuid NOT NULL REFERENCES judge (id) ON DELETE CASCADE,
  device_id uuid NOT NULL REFERENCES device (id) ON DELETE CASCADE,
  auth_mode auth_mode NOT NULL,
  pin_version integer NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  ended_reason varchar(20) CHECK (ended_reason IN ('LOGOUT', 'TIMEOUT', 'REVOKED', 'REPLACED'))
);

CREATE TABLE score_sheet (
  id uuid PRIMARY KEY,
  category_id uuid NOT NULL REFERENCES category (id) ON DELETE CASCADE,
  entry_id uuid NOT NULL REFERENCES entry (id) ON DELETE RESTRICT,
  judge_id uuid NOT NULL REFERENCES judge (id) ON DELETE RESTRICT,
  revision integer NOT NULL DEFAULT 1,
  criteria_total_hundredths integer NOT NULL,
  penalty_total_hundredths integer NOT NULL,
  total_hundredths integer NOT NULL CHECK (total_hundredths >= 0),
  client_total_hundredths integer,
  comment varchar(500) NOT NULL DEFAULT '',
  submitted_at timestamptz NOT NULL DEFAULT now(),
  client_submitted_at timestamptz,
  device_id uuid REFERENCES device (id),
  judge_session_id uuid,
  auth_mode auth_mode NOT NULL,
  last_mutation_id uuid,
  CONSTRAINT score_sheet_entry_judge_uq UNIQUE (entry_id, judge_id)
);
CREATE INDEX score_sheet_category_judge_idx ON score_sheet (category_id, judge_id);
CREATE INDEX score_sheet_category_entry_idx ON score_sheet (category_id, entry_id);

CREATE TABLE score_value (
  score_sheet_id uuid NOT NULL REFERENCES score_sheet (id) ON DELETE CASCADE,
  criterion_id uuid NOT NULL REFERENCES criterion (id),
  value_tenths smallint NOT NULL CHECK (value_tenths >= 0 AND value_tenths % 5 = 0),
  PRIMARY KEY (score_sheet_id, criterion_id)
);

CREATE TABLE score_penalty (
  score_sheet_id uuid NOT NULL REFERENCES score_sheet (id) ON DELETE CASCADE,
  penalty_type_id uuid NOT NULL REFERENCES penalty_type (id),
  count smallint NOT NULL CHECK (count BETWEEN 0 AND 10),
  PRIMARY KEY (score_sheet_id, penalty_type_id)
);

CREATE TABLE score_sheet_revision (
  id bigserial PRIMARY KEY,
  score_sheet_id uuid NOT NULL REFERENCES score_sheet (id) ON DELETE CASCADE,
  revision integer NOT NULL,
  snapshot jsonb NOT NULL,
  actor_type actor_type NOT NULL,
  judge_session_id uuid,
  device_id uuid,
  mutation_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT score_sheet_revision_uq UNIQUE (score_sheet_id, revision)
);

CREATE TABLE rejected_submission (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  mutation_id uuid NOT NULL UNIQUE,
  tournament_id uuid NOT NULL REFERENCES tournament (id) ON DELETE CASCADE,
  category_id uuid REFERENCES category (id) ON DELETE CASCADE,
  entry_id uuid REFERENCES entry (id) ON DELETE SET NULL,
  judge_id uuid REFERENCES judge (id) ON DELETE SET NULL,
  device_id uuid REFERENCES device (id) ON DELETE SET NULL,
  payload jsonb NOT NULL,
  reason rejection_reason NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  resolution rejection_resolution NOT NULL DEFAULT 'PENDING',
  resolved_by uuid REFERENCES app_user (id),
  resolved_at timestamptz
);
CREATE INDEX rejected_submission_pending_idx ON rejected_submission (tournament_id, resolution);

CREATE TABLE category_result (
  category_id uuid NOT NULL REFERENCES category (id) ON DELETE CASCADE,
  entry_id uuid NOT NULL REFERENCES entry (id) ON DELETE CASCADE,
  sheet_count smallint NOT NULL,
  expected_count smallint NOT NULL,
  sum_hundredths integer NOT NULL,
  official_hundredths integer,
  tie_break_hundredths integer,
  penalty_mean_hundredths integer,
  rank smallint,
  is_complete boolean NOT NULL,
  results_version integer NOT NULL,
  computed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (category_id, entry_id)
);
CREATE INDEX category_result_rank_idx ON category_result (category_id, rank);

-- INT-03: nota ≤ skala kryterium i licznik ≤ maks. wystąpień (CHECK nie widzi innych tabel).
CREATE FUNCTION trg_score_value_range() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE max_tenths integer;
BEGIN
  SELECT scale_max * 10 INTO max_tenths FROM criterion WHERE id = NEW.criterion_id;
  IF NEW.value_tenths > max_tenths THEN
    RAISE EXCEPTION 'value_tenths % > scale_max*10 % (criterion %)', NEW.value_tenths, max_tenths, NEW.criterion_id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER score_value_range BEFORE INSERT OR UPDATE ON score_value
  FOR EACH ROW EXECUTE FUNCTION trg_score_value_range();

CREATE FUNCTION trg_score_penalty_max() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE max_count integer;
BEGIN
  SELECT max_occurrences INTO max_count FROM penalty_type WHERE id = NEW.penalty_type_id;
  IF NEW.count > max_count THEN
    RAISE EXCEPTION 'count % > max_occurrences % (penalty_type %)', NEW.count, max_count, NEW.penalty_type_id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER score_penalty_max BEFORE INSERT OR UPDATE ON score_penalty
  FOR EACH ROW EXECUTE FUNCTION trg_score_penalty_max();

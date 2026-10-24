-- IMP-105: konfiguracja turnieju (02-model §2.3–2.10, INT-03, INT-10).
CREATE TABLE tournament (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_id uuid NOT NULL REFERENCES app_user (id),
  name varchar(120) NOT NULL,
  start_date date,
  end_date date,
  venue varchar(120),
  timezone varchar(40) NOT NULL DEFAULT 'Europe/Warsaw',
  status tournament_status NOT NULL DEFAULT 'DRAFT',
  started_at timestamptz,
  finished_at timestamptz,
  allow_offline_pin_login boolean NOT NULL DEFAULT true,
  change_seq bigint NOT NULL DEFAULT 0,
  version integer NOT NULL DEFAULT 1,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tournament_dates_ck CHECK (end_date IS NULL OR (start_date IS NOT NULL AND end_date >= start_date))
);
CREATE INDEX tournament_owner_status_idx ON tournament (owner_id, status) WHERE deleted_at IS NULL;

CREATE TABLE category (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  tournament_id uuid NOT NULL REFERENCES tournament (id) ON DELETE CASCADE,
  name varchar(80) NOT NULL,
  style category_style NOT NULL DEFAULT 'POLE_SPORT',
  level category_level NOT NULL DEFAULT 'BEGINNER',
  age_group varchar(40) NOT NULL DEFAULT 'Open',
  position integer NOT NULL,
  status category_status NOT NULL DEFAULT 'DRAFT',
  aggregation_method aggregation_method NOT NULL DEFAULT 'MEAN',
  tie_break_criterion_id uuid,
  started_at timestamptz,
  locked_at timestamptz,
  locked_by uuid REFERENCES app_user (id),
  results_version integer NOT NULL DEFAULT 0,
  final_results_hash char(64),
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT category_position_uq UNIQUE (tournament_id, position) DEFERRABLE INITIALLY IMMEDIATE
);

CREATE TABLE criterion (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  category_id uuid NOT NULL REFERENCES category (id) ON DELETE CASCADE,
  name varchar(60) NOT NULL,
  description varchar(200),
  scale_max smallint NOT NULL DEFAULT 10 CHECK (scale_max BETWEEN 1 AND 20),
  step numeric(3, 1) NOT NULL DEFAULT 0.5,
  weight_tenths smallint NOT NULL CHECK (weight_tenths BETWEEN 5 AND 50 AND weight_tenths % 5 = 0),
  position integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT criterion_position_uq UNIQUE (category_id, position) DEFERRABLE INITIALLY IMMEDIATE
);

ALTER TABLE category
  ADD CONSTRAINT category_tie_break_fk FOREIGN KEY (tie_break_criterion_id)
  REFERENCES criterion (id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE penalty_type (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  category_id uuid NOT NULL REFERENCES category (id) ON DELETE CASCADE,
  name varchar(60) NOT NULL,
  points_tenths smallint NOT NULL CHECK (points_tenths BETWEEN 5 AND 500 AND points_tenths % 5 = 0),
  max_occurrences smallint NOT NULL DEFAULT 3 CHECK (max_occurrences BETWEEN 1 AND 10),
  position integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT penalty_type_position_uq UNIQUE (category_id, position) DEFERRABLE INITIALLY IMMEDIATE
);

CREATE TABLE athlete (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  tournament_id uuid NOT NULL REFERENCES tournament (id) ON DELETE CASCADE,
  full_name varchar(100) NOT NULL,
  club varchar(100),
  birth_year smallint CHECK (birth_year BETWEEN 1920 AND 2100),
  is_minor boolean NOT NULL DEFAULT false,
  guardian_consent_confirmed boolean NOT NULL DEFAULT false,
  pseudonymized_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT athlete_guardian_consent_ck CHECK (NOT is_minor OR guardian_consent_confirmed OR pseudonymized_at IS NOT NULL)
);
CREATE INDEX athlete_name_idx ON athlete (tournament_id, lower(full_name));

CREATE TABLE entry (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  tournament_id uuid NOT NULL REFERENCES tournament (id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES category (id) ON DELETE CASCADE,
  athlete_id uuid NOT NULL REFERENCES athlete (id) ON DELETE RESTRICT,
  start_number integer NOT NULL CHECK (start_number BETWEEN 1 AND 9999),
  start_order integer NOT NULL,
  status entry_status NOT NULL DEFAULT 'ACTIVE',
  withdrawn_at timestamptz,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT entry_start_number_uq UNIQUE (tournament_id, start_number),
  CONSTRAINT entry_athlete_uq UNIQUE (category_id, athlete_id),
  CONSTRAINT entry_start_order_uq UNIQUE (category_id, start_order) DEFERRABLE INITIALLY IMMEDIATE
);

CREATE TABLE judge (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  tournament_id uuid NOT NULL REFERENCES tournament (id) ON DELETE CASCADE,
  full_name varchar(80) NOT NULL,
  initials varchar(3) NOT NULL,
  pin_hash text NOT NULL,
  pin_fingerprint bytea NOT NULL,
  pin_offline_salt bytea NOT NULL,
  pin_offline_verifier bytea NOT NULL,
  pin_version integer NOT NULL DEFAULT 1,
  failed_pin_count smallint NOT NULL DEFAULT 0,
  pin_locked_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  position integer NOT NULL,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT judge_name_uq UNIQUE (tournament_id, full_name),
  CONSTRAINT judge_pin_fingerprint_uq UNIQUE (tournament_id, pin_fingerprint)
);
CREATE INDEX judge_position_idx ON judge (tournament_id, position);

CREATE TABLE category_judge (
  category_id uuid NOT NULL REFERENCES category (id) ON DELETE CASCADE,
  judge_id uuid NOT NULL REFERENCES judge (id) ON DELETE CASCADE,
  PRIMARY KEY (category_id, judge_id)
);

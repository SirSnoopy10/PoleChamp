-- IMP-103 / IMP-104: typy wyliczeniowe (02-model §1) oraz konto, tokeny i idempotencja REST.
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TYPE tournament_status AS ENUM ('DRAFT', 'IN_PROGRESS', 'FINISHED');
CREATE TYPE category_status AS ENUM ('DRAFT', 'IN_PROGRESS', 'LOCKED');
CREATE TYPE category_style AS ENUM ('POLE_SPORT', 'POLE_ART', 'EXOTIC', 'DOUBLES');
CREATE TYPE category_level AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'PRO', 'ELITE');
CREATE TYPE aggregation_method AS ENUM ('MEAN', 'TRIMMED_MEAN');
CREATE TYPE entry_status AS ENUM ('ACTIVE', 'WITHDRAWN');
CREATE TYPE rejection_reason AS ENUM (
  'CATEGORY_LOCKED', 'CATEGORY_NOT_STARTED', 'TOURNAMENT_FINISHED', 'JUDGE_NOT_IN_PANEL',
  'JUDGE_INACTIVE', 'ENTRY_WITHDRAWN', 'PIN_VERSION_OUTDATED', 'JUDGE_SESSION_INVALID'
);
CREATE TYPE rejection_resolution AS ENUM ('PENDING', 'ACCEPTED', 'DISCARDED');
CREATE TYPE actor_type AS ENUM ('ORGANIZER', 'JUDGE', 'DEVICE', 'SYSTEM');
CREATE TYPE auth_mode AS ENUM ('ONLINE_PIN', 'OFFLINE_PIN');
CREATE TYPE export_scope AS ENUM ('TOURNAMENT', 'CATEGORY');
CREATE TYPE export_status AS ENUM ('QUEUED', 'RUNNING', 'DONE', 'FAILED');

CREATE TABLE app_user (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  email citext NOT NULL,
  password_hash text NOT NULL,
  display_name varchar(80) NOT NULL,
  email_verified_at timestamptz,
  locale varchar(5) NOT NULL DEFAULT 'pl',
  terms_accepted_at timestamptz NOT NULL,
  terms_version varchar(20) NOT NULL,
  failed_login_count smallint NOT NULL DEFAULT 0,
  locked_until timestamptz,
  lockout_level smallint NOT NULL DEFAULT 0,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- E-mail unikalny wśród kont nieusuniętych, bez rozróżniania wielkości liter (citext).
CREATE UNIQUE INDEX app_user_email_uq ON app_user (email) WHERE deleted_at IS NULL;

CREATE TABLE auth_refresh_token (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  user_id uuid NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
  family_id uuid NOT NULL,
  token_hash bytea NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  replaced_by_id uuid REFERENCES auth_refresh_token (id),
  user_agent text,
  ip inet,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX auth_refresh_token_family_idx ON auth_refresh_token (user_id, family_id);

CREATE TABLE auth_email_token (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  user_id uuid NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
  purpose varchar(20) NOT NULL CHECK (purpose IN ('VERIFY_EMAIL', 'RESET_PASSWORD')),
  token_hash bytea NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  attempts smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX auth_email_token_active_idx ON auth_email_token (user_id, purpose) WHERE used_at IS NULL;

CREATE TABLE idempotency_key (
  key uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
  method varchar(10) NOT NULL,
  path varchar(200) NOT NULL,
  request_hash char(64) NOT NULL,
  response_status smallint NOT NULL,
  response_body jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (key, user_id)
);
CREATE INDEX idempotency_key_created_idx ON idempotency_key (created_at);

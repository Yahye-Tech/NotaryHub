-- ─────────────────────────────────────────────────────────────
-- NotaryHub Auth Schema
-- Idempotent: safe to run multiple times (CREATE IF NOT EXISTS)
-- ─────────────────────────────────────────────────────────────

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── ENUM types ──────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
    'SUPER_ADMIN',
    'COMPANY_ADMIN',
    'BRANCH_ADMIN',
    'EMPLOYEE',
    'CUSTOMER'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE user_status AS ENUM (
    'pending_verification',
    'active',
    'suspended',
    'deleted'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE token_type AS ENUM (
    'email_verification',
    'password_reset'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── TENANTS ─────────────────────────────────────────────────
-- Must exist before users so users can reference it
CREATE TABLE IF NOT EXISTS tenants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  subdomain   TEXT NOT NULL UNIQUE,
  status      TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('active','suspended','trial')),
  plan        TEXT NOT NULL DEFAULT 'Basic' CHECK (plan IN ('Basic','Professional','Enterprise')),
  email       TEXT,
  license_number TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted  BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at  TIMESTAMPTZ,
  deleted_by  UUID
);

-- ─── USERS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email               TEXT NOT NULL UNIQUE,
  password_hash       TEXT NOT NULL,          -- bcrypt, BCRYPT_ROUNDS=12
  role                user_role NOT NULL,
  status              user_status NOT NULL DEFAULT 'pending_verification',

  -- Tenant scoping (NULL for SUPER_ADMIN)
  tenant_id           UUID REFERENCES tenants(id) ON DELETE SET NULL,

  -- Profile
  full_name           TEXT NOT NULL,
  phone               TEXT,

  -- Email verification
  email_verified      BOOLEAN NOT NULL DEFAULT FALSE,
  email_verified_at   TIMESTAMPTZ,

  -- 2FA
  totp_secret         TEXT,                   -- NULL = 2FA not enabled
  totp_enabled        BOOLEAN NOT NULL DEFAULT FALSE,
  totp_enabled_at     TIMESTAMPTZ,

  -- Login tracking
  last_login_at       TIMESTAMPTZ,
  last_login_ip       INET,
  failed_login_count  INT NOT NULL DEFAULT 0,
  locked_until        TIMESTAMPTZ,            -- NULL = not locked

  -- Audit
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted          BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at          TIMESTAMPTZ,
  deleted_by          UUID
);

CREATE INDEX IF NOT EXISTS idx_users_email       ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_tenant_id   ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_role        ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status      ON users(status);

-- ─── REFRESH TOKENS ──────────────────────────────────────────
-- One row per active device/session. Revoke by deleting the row.
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash    TEXT NOT NULL UNIQUE,         -- SHA-256 of the raw token
  user_agent    TEXT,
  ip_address    INET,
  expires_at    TIMESTAMPTZ NOT NULL,
  revoked       BOOLEAN NOT NULL DEFAULT FALSE,
  revoked_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id    ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
-- Auto-cleanup hook: rows older than expires_at are stale
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- ─── ONE-TIME TOKENS ─────────────────────────────────────────
-- Used for email verification and password reset flows
CREATE TABLE IF NOT EXISTS one_time_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash    TEXT NOT NULL UNIQUE,         -- SHA-256 of the raw token
  type          token_type NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  used          BOOLEAN NOT NULL DEFAULT FALSE,
  used_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ott_user_id    ON one_time_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_ott_token_hash ON one_time_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_ott_type       ON one_time_tokens(type);

-- ─── AUDIT LOG ───────────────────────────────────────────────
-- Append-only. Never update or delete rows.
CREATE TABLE IF NOT EXISTS auth_audit_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID,                         -- NULL for failed/anonymous attempts
  tenant_id     UUID,
  action        TEXT NOT NULL,                -- LOGIN_SUCCESS, LOGIN_FAILED, PASSWORD_RESET, etc.
  ip_address    INET,
  user_agent    TEXT,
  meta          JSONB,                        -- any extra context (e.g. {"reason":"bad_password"})
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id    ON auth_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_id  ON auth_audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action     ON auth_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON auth_audit_log(created_at DESC);

-- ─── updated_at trigger ──────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── Seed: first SUPER_ADMIN ─────────────────────────────────
-- Password: Admin@2026! (bcrypt 12 rounds, pre-hashed)
-- Change this immediately in production.
INSERT INTO users (
  email,
  password_hash,
  role,
  status,
  full_name,
  email_verified,
  email_verified_at
)
VALUES (
  'admin@notaryhub.local',
  '$2b$12$Ej06nmGMe.yEw74lepB7n.VReyborEKRWdIFh12SWYXtsqX5mULOi',
  'SUPER_ADMIN',
  'active',
  'Super Administrator',
  TRUE,
  NOW()
)
ON CONFLICT (email) DO NOTHING;

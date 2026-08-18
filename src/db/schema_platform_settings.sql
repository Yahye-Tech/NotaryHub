-- ─────────────────────────────────────────────────────────────
-- NotaryHub — Step 15: Platform-wide AI feature switches
-- Adds: platform_settings (singleton row, SUPER_ADMIN managed)
-- Enforces the "Global Feature Switches" toggles in SuperAdminPortal,
-- which previously only updated local React state and gated nothing.
-- Run after: schema.sql
-- Idempotent: safe to run multiple times
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS platform_settings (
  id                          SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- singleton row
  ai_ocr_enabled              BOOLEAN NOT NULL DEFAULT TRUE,
  ai_doc_generation_enabled   BOOLEAN NOT NULL DEFAULT TRUE,
  platform_name               TEXT NOT NULL DEFAULT 'NotaryHub'
                               CHECK (char_length(platform_name) BETWEEN 1 AND 60),
  branding_color              TEXT NOT NULL DEFAULT '#2563EB'
                               CHECK (branding_color ~* '^#[0-9a-f]{6}$'),
  smtp_host                   TEXT,
  smtp_port                   INTEGER CHECK (smtp_port IS NULL OR smtp_port BETWEEN 1 AND 65535),
  smtp_user                   TEXT,
  smtp_secure                 BOOLEAN,
  updated_by                  UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO platform_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Step 16: platform_name / branding_color added after the initial Step 15
-- release. ALTER TABLE fallback keeps this script idempotent for DBs that
-- already have the singleton row from before these columns existed.
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS platform_name TEXT NOT NULL DEFAULT 'NotaryHub';
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS branding_color TEXT NOT NULL DEFAULT '#2563EB';
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS smtp_host TEXT;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS smtp_port INTEGER;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS smtp_user TEXT;
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS smtp_secure BOOLEAN;
DO $$ BEGIN
  ALTER TABLE platform_settings ADD CONSTRAINT platform_settings_name_len
    CHECK (char_length(platform_name) BETWEEN 1 AND 60);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE platform_settings ADD CONSTRAINT platform_settings_color_hex
    CHECK (branding_color ~* '^#[0-9a-f]{6}$');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE platform_settings ADD CONSTRAINT platform_settings_smtp_port_range
    CHECK (smtp_port IS NULL OR smtp_port BETWEEN 1 AND 65535);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_platform_settings_updated_at
    BEFORE UPDATE ON platform_settings
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

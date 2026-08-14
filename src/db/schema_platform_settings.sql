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
  updated_by                  UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO platform_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  CREATE TRIGGER trg_platform_settings_updated_at
    BEFORE UPDATE ON platform_settings
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

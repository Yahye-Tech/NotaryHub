-- ─────────────────────────────────────────────────────────────
-- NotaryHub File Uploads Schema (P2-3)
-- Idempotent: safe to run multiple times
-- Run after: schema.sql, schema_tenants.sql, schema_full.sql
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS file_uploads (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id           UUID REFERENCES branches(id) ON DELETE SET NULL,
  customer_id         UUID REFERENCES customers(id) ON DELETE SET NULL,
  document_id         UUID REFERENCES documents(id) ON DELETE SET NULL,

  uploaded_by         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  original_name       TEXT NOT NULL,
  stored_name         TEXT NOT NULL,
  storage_path        TEXT NOT NULL,

  mime_type           TEXT NOT NULL,
  size_bytes          BIGINT NOT NULL,
  category            TEXT,
  file_hash           TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted          BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at          TIMESTAMPTZ,
  deleted_by          UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_file_uploads_tenant_id    ON file_uploads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_uploaded_by    ON file_uploads(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_file_uploads_customer_id    ON file_uploads(customer_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_branch_id    ON file_uploads(branch_id);

DO $$ BEGIN
  CREATE TRIGGER trg_file_uploads_updated_at
    BEFORE UPDATE ON file_uploads
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

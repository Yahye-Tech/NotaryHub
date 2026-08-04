-- ─────────────────────────────────────────────────────────────
-- NotaryHub — Step 12: Dynamic RBAC Permissions Schema
-- Adds: tenant_permissions
-- Layered resolution: tenant override → platform default → hardcoded fallback
-- Run after: schema.sql, schema_tenants.sql, schema_full.sql
-- Idempotent: safe to run multiple times
-- ─────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE permission_key AS ENUM (
    'CREATE_DOCUMENT',
    'EDIT_DOCUMENT',
    'DELETE_DOCUMENT',
    'VIEW_REPORTS',
    'CREATE_EMPLOYEE',
    'CREATE_BRANCH',
    'MANAGE_SUBSCRIPTIONS'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- tenant_id = NULL means a platform-wide default row (SUPER_ADMIN managed).
-- tenant_id = <uuid> means a tenant-specific override (COMPANY_ADMIN/SUPER_ADMIN managed),
-- which takes precedence over the platform default for that tenant.
CREATE TABLE IF NOT EXISTS tenant_permissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role            user_role NOT NULL,
  permission_key  permission_key NOT NULL,
  allowed         BOOLEAN NOT NULL,
  updated_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Partial unique indexes: NULL tenant_id needs its own uniqueness rule
-- since Postgres treats NULL as distinct in a normal UNIQUE constraint.
CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_permissions_platform
  ON tenant_permissions (role, permission_key)
  WHERE tenant_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_permissions_tenant
  ON tenant_permissions (tenant_id, role, permission_key)
  WHERE tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tenant_permissions_tenant ON tenant_permissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_permissions_role ON tenant_permissions(role);

-- Auto-touch updated_at on change
DO $$ BEGIN
  CREATE OR REPLACE FUNCTION touch_tenant_permissions_updated_at()
  RETURNS TRIGGER AS $body$
  BEGIN
    NEW.updated_at = now();
    RETURN NEW;
  END;
  $body$ LANGUAGE plpgsql;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_tenant_permissions_updated_at ON tenant_permissions;
CREATE TRIGGER trg_tenant_permissions_updated_at
  BEFORE UPDATE ON tenant_permissions
  FOR EACH ROW EXECUTE FUNCTION touch_tenant_permissions_updated_at();

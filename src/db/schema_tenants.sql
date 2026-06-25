-- ─────────────────────────────────────────────────────────────
-- NotaryHub Multi-Tenant Schema Migration
-- Adds: branches, employees tables
-- All UUIDs are valid RFC 4122 v4
-- Idempotent: safe to run multiple times
-- ─────────────────────────────────────────────────────────────

-- ─── BRANCHES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS branches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  address         TEXT NOT NULL,
  phone           TEXT,
  counters_count  INT NOT NULL DEFAULT 2 CHECK (counters_count >= 1),
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','suspended','archived')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at      TIMESTAMPTZ,
  deleted_by      UUID,
  UNIQUE (tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_branches_tenant_id ON branches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_branches_status    ON branches(status);

DO $$ BEGIN
  CREATE TRIGGER trg_branches_updated_at
    BEFORE UPDATE ON branches
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── EMPLOYEES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employees (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  job_role        TEXT NOT NULL DEFAULT 'NOTARY_OFFICER'
                    CHECK (job_role IN ('NOTARY_OFFICER','RECEPTIONIST','BRANCH_ADMIN')),
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','suspended','offline')),
  assigned_counter INT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at      TIMESTAMPTZ,
  deleted_by      UUID
);

CREATE INDEX IF NOT EXISTS idx_employees_tenant_id ON employees(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employees_branch_id ON employees(branch_id);
CREATE INDEX IF NOT EXISTS idx_employees_user_id   ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_status    ON employees(status);

DO $$ BEGIN
  CREATE TRIGGER trg_employees_updated_at
    BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── Seed: 4 tenants (valid v4 UUIDs) ───────────────────────
INSERT INTO tenants (id, name, subdomain, status, plan, email, license_number)
VALUES
  ('886c9f73-82a4-4e75-a023-cc4802712c52', 'Bosaso Notary Services',  'bosaso-notary',  'active',    'Enterprise',   'info@bosaso.com',      'LIC-2026-001'),
  ('8a0804b2-7018-4927-839d-b9c648ca3c9f', 'Puntland Legal Bureau',   'puntland-legal', 'active',    'Professional', 'info@puntland.com',    'LIC-2026-002'),
  ('13a06b4d-0a41-4361-ae4f-5e6491864181', 'Horn Africa Notary',      'horn-africa',    'suspended', 'Basic',        'info@hornafrica.com',  'LIC-2026-003'),
  ('57886b6f-289e-4d73-bb8a-bcbc0d8bcb58', 'Somali Legal Solutions',  'somali-legal',   'active',    'Professional', 'info@somalilegal.com', 'LIC-2026-004')
ON CONFLICT (subdomain) DO NOTHING;

-- ─── Seed: 4 branches ───────────────────────────────────────
INSERT INTO branches (id, tenant_id, name, address, phone, counters_count)
VALUES
  ('135aa207-1cc2-4417-9bc0-b68c3ae9cf69',
   '886c9f73-82a4-4e75-a023-cc4802712c52',
   'Bosaso Main Branch', 'Kismayo Street, Central Bosaso', '+252907791234', 4),

  ('96e8280c-c659-4336-966a-05b1cc8f4c39',
   '886c9f73-82a4-4e75-a023-cc4802712c52',
   'Garowe Corporate Office', 'Mogadishu Highway, Garowe', '+252907795678', 2),

  ('5f12bfe5-ca47-4bea-a8e9-6ae9f6bbe6ad',
   '8a0804b2-7018-4927-839d-b9c648ca3c9f',
   'Galkayo Witness Hub', 'Afgoye Road, Galkayo', '+252907799999', 3),

  ('55794c66-3fc2-44d8-b87a-21810f94ba4e',
   '57886b6f-289e-4d73-bb8a-bcbc0d8bcb58',
   'Mogadishu Counter', 'Lido Beach Road, Mogadishu', '+252907001122', 2)
ON CONFLICT (tenant_id, name) DO NOTHING;

-- ─── Seed: COMPANY_ADMIN users ───────────────────────────────
-- Password: Admin@2026!
-- Hash: $2b$12$Ej06nmGMe.yEw74lepB7n.VReyborEKRWdIFh12SWYXtsqX5mULOi
INSERT INTO users (email, password_hash, role, status, tenant_id, full_name, email_verified, email_verified_at)
VALUES
  ('admin@bosaso-notary.com',
   '$2b$12$Ej06nmGMe.yEw74lepB7n.VReyborEKRWdIFh12SWYXtsqX5mULOi',
   'COMPANY_ADMIN', 'active',
   '886c9f73-82a4-4e75-a023-cc4802712c52',
   'Bosaso Admin', TRUE, NOW()),

  ('admin@puntland-legal.com',
   '$2b$12$Ej06nmGMe.yEw74lepB7n.VReyborEKRWdIFh12SWYXtsqX5mULOi',
   'COMPANY_ADMIN', 'active',
   '8a0804b2-7018-4927-839d-b9c648ca3c9f',
   'Puntland Admin', TRUE, NOW()),

  ('admin@somali-legal.com',
   '$2b$12$Ej06nmGMe.yEw74lepB7n.VReyborEKRWdIFh12SWYXtsqX5mULOi',
   'COMPANY_ADMIN', 'active',
   '57886b6f-289e-4d73-bb8a-bcbc0d8bcb58',
   'Somali Legal Admin', TRUE, NOW())
ON CONFLICT (email) DO NOTHING;

-- ─── Seed: BRANCH_ADMIN users ────────────────────────────────
INSERT INTO users (email, password_hash, role, status, tenant_id, full_name, email_verified, email_verified_at)
VALUES
  ('supervisor@bosaso-main.com',
   '$2b$12$Ej06nmGMe.yEw74lepB7n.VReyborEKRWdIFh12SWYXtsqX5mULOi',
   'BRANCH_ADMIN', 'active',
   '886c9f73-82a4-4e75-a023-cc4802712c52',
   'Bosaso Main Supervisor', TRUE, NOW()),

  ('supervisor@galkayo-hub.com',
   '$2b$12$Ej06nmGMe.yEw74lepB7n.VReyborEKRWdIFh12SWYXtsqX5mULOi',
   'BRANCH_ADMIN', 'active',
   '8a0804b2-7018-4927-839d-b9c648ca3c9f',
   'Galkayo Supervisor', TRUE, NOW())
ON CONFLICT (email) DO NOTHING;

-- ─── Seed: EMPLOYEE users ────────────────────────────────────
INSERT INTO users (id, email, password_hash, role, status, tenant_id, full_name, email_verified, email_verified_at)
VALUES
  ('bc505fec-32be-472d-bc38-0799486f31b1',
   'm.vance@bosaso-notary.com',
   '$2b$12$Ej06nmGMe.yEw74lepB7n.VReyborEKRWdIFh12SWYXtsqX5mULOi',
   'EMPLOYEE', 'active',
   '886c9f73-82a4-4e75-a023-cc4802712c52',
   'Michael Vance', TRUE, NOW()),

  ('940b86dc-efca-4aac-a3ba-939c0c96aad1',
   'e.rostova@bosaso-notary.com',
   '$2b$12$Ej06nmGMe.yEw74lepB7n.VReyborEKRWdIFh12SWYXtsqX5mULOi',
   'EMPLOYEE', 'active',
   '886c9f73-82a4-4e75-a023-cc4802712c52',
   'Elena Rostova', TRUE, NOW()),

  ('b9628baa-9b9e-47a1-85b5-7cd798e661bb',
   'r.sanchez@puntland-legal.com',
   '$2b$12$Ej06nmGMe.yEw74lepB7n.VReyborEKRWdIFh12SWYXtsqX5mULOi',
   'EMPLOYEE', 'active',
   '8a0804b2-7018-4927-839d-b9c648ca3c9f',
   'Raul Sanchez', TRUE, NOW())
ON CONFLICT (email) DO NOTHING;

-- ─── Seed: employee records (link users to branches) ─────────
INSERT INTO employees (user_id, tenant_id, branch_id, job_role, assigned_counter)
SELECT
  'bc505fec-32be-472d-bc38-0799486f31b1',
  '886c9f73-82a4-4e75-a023-cc4802712c52',
  '135aa207-1cc2-4417-9bc0-b68c3ae9cf69',
  'NOTARY_OFFICER', 2
WHERE NOT EXISTS (
  SELECT 1 FROM employees WHERE user_id = 'bc505fec-32be-472d-bc38-0799486f31b1'
);

INSERT INTO employees (user_id, tenant_id, branch_id, job_role, assigned_counter)
SELECT
  '940b86dc-efca-4aac-a3ba-939c0c96aad1',
  '886c9f73-82a4-4e75-a023-cc4802712c52',
  '135aa207-1cc2-4417-9bc0-b68c3ae9cf69',
  'RECEPTIONIST', 1
WHERE NOT EXISTS (
  SELECT 1 FROM employees WHERE user_id = '940b86dc-efca-4aac-a3ba-939c0c96aad1'
);

INSERT INTO employees (user_id, tenant_id, branch_id, job_role, assigned_counter)
SELECT
  'b9628baa-9b9e-47a1-85b5-7cd798e661bb',
  '8a0804b2-7018-4927-839d-b9c648ca3c9f',
  '5f12bfe5-ca47-4bea-a8e9-6ae9f6bbe6ad',
  'NOTARY_OFFICER', 1
WHERE NOT EXISTS (
  SELECT 1 FROM employees WHERE user_id = 'b9628baa-9b9e-47a1-85b5-7cd798e661bb'
);

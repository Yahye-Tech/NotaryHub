-- ─────────────────────────────────────────────────────────────
-- NotaryHub Appointments Schema (P2-1)
-- Idempotent: safe to run multiple times
-- Run after: schema.sql, schema_tenants.sql, schema_full.sql
-- ─────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE appointment_status AS ENUM (
    'scheduled',
    'confirmed',
    'checked_in',
    'completed',
    'cancelled',
    'no_show'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS appointments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id           UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  customer_id         UUID REFERENCES customers(id) ON DELETE SET NULL,

  customer_name       TEXT NOT NULL,
  customer_email      TEXT,
  service_type        TEXT NOT NULL,

  start_time          TIMESTAMPTZ NOT NULL,
  end_time            TIMESTAMPTZ,

  status              appointment_status NOT NULL DEFAULT 'scheduled',
  notes               TEXT,

  assigned_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  booked_by           UUID REFERENCES users(id) ON DELETE SET NULL,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted          BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at          TIMESTAMPTZ,
  deleted_by          UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_appointments_tenant_id   ON appointments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_appointments_branch_id   ON appointments(branch_id);
CREATE INDEX IF NOT EXISTS idx_appointments_customer_id ON appointments(customer_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time  ON appointments(tenant_id, branch_id, start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status      ON appointments(tenant_id, status);

DO $$ BEGIN
  CREATE TRIGGER trg_appointments_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── Demo seed appointments ─────────────────────────────────
INSERT INTO appointments (
  tenant_id, branch_id, customer_id,
  customer_name, customer_email, service_type,
  start_time, end_time, status
)
SELECT
  c.tenant_id,
  '135aa207-1cc2-4417-9bc0-b68c3ae9cf69',
  c.id,
  c.full_name,
  c.email,
  'Power of Attorney (POA)',
  (CURRENT_DATE + INTERVAL '2 days') + TIME '10:00',
  (CURRENT_DATE + INTERVAL '2 days') + TIME '11:00',
  'scheduled'
FROM customers c
WHERE c.email = 'hodan.jama@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM appointments a
    WHERE a.customer_id = c.id AND a.is_deleted = FALSE
  );

INSERT INTO appointments (
  tenant_id, branch_id, customer_id,
  customer_name, customer_email, service_type,
  start_time, end_time, status
)
SELECT
  c.tenant_id,
  '135aa207-1cc2-4417-9bc0-b68c3ae9cf69',
  c.id,
  c.full_name,
  c.email,
  'Affidavit Statement',
  (CURRENT_DATE + INTERVAL '3 days') + TIME '14:30',
  (CURRENT_DATE + INTERVAL '3 days') + TIME '15:30',
  'scheduled'
FROM customers c
WHERE c.email = 'abdirahman.nur@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM appointments a
    WHERE a.customer_id = c.id AND a.service_type = 'Affidavit Statement' AND a.is_deleted = FALSE
  );

-- ═════════════════════════════════════════════════════════════════════════════
-- NotaryHub — Step 3: Full Production Database Schema
-- New tables: company_profiles, customers, documents,
--             subscriptions, payments, audit_logs, notifications
-- All existing tables (tenants, users, branches, employees, auth_audit_log,
-- refresh_tokens, one_time_tokens) are untouched.
-- Idempotent: safe to run multiple times.
-- ═════════════════════════════════════════════════════════════════════════════

-- ─── Helper: reusable set_updated_at already exists from schema.sql ──────


-- ═════════════════════════════════════════════════════════════════════════════
-- 1. COMPANY PROFILES
--    Extends tenants 1:1 with operational / branding metadata.
--    "Company" in the UI = tenant + company_profile.
--    No duplicate data — tenant core fields stay in tenants table.
-- ═════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS company_profiles (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,

  -- Branding
  logo_url            TEXT,
  primary_color       TEXT DEFAULT '#1e3a5f',  -- hex
  secondary_color     TEXT DEFAULT '#2563eb',

  -- Contact
  address             TEXT,
  city                TEXT,
  country             TEXT DEFAULT 'Somalia',
  postal_code         TEXT,
  contact_name        TEXT,
  contact_phone       TEXT,
  contact_email       TEXT,
  website             TEXT,

  -- Legal
  registration_number TEXT,
  tax_id              TEXT,
  legal_representative TEXT,
  notary_seal_number  TEXT,

  -- Settings
  timezone            TEXT NOT NULL DEFAULT 'Africa/Mogadishu',
  locale              TEXT NOT NULL DEFAULT 'so',              -- ISO 639-1
  working_days        TEXT[] DEFAULT ARRAY['MON','TUE','WED','THU','SUN'],
  working_hours_start TIME DEFAULT '08:00',
  working_hours_end   TIME DEFAULT '17:00',
  max_daily_appointments INT DEFAULT 50,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_profiles_tenant_id ON company_profiles(tenant_id);

DO $$ BEGIN
  CREATE TRIGGER trg_company_profiles_updated_at
    BEFORE UPDATE ON company_profiles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ═════════════════════════════════════════════════════════════════════════════
-- 2. CUSTOMERS
--    People who request notarisation services.
--    Scoped to a tenant. Can have a user account (optional).
-- ═════════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE customer_id_type AS ENUM (
    'NATIONAL_ID', 'PASSPORT', 'DRIVERS_LICENSE', 'RESIDENCE_PERMIT', 'OTHER'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE customer_status AS ENUM (
    'active', 'suspended', 'blacklisted'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS customers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Optional link to a user account (when customer has portal login)
  user_id             UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,

  -- Identity
  full_name           TEXT NOT NULL,
  email               TEXT,
  phone               TEXT,
  date_of_birth       DATE,
  nationality         TEXT,
  address             TEXT,
  city                TEXT,
  country             TEXT,

  -- ID document
  id_type             customer_id_type,
  id_number           TEXT,
  id_issue_date       DATE,
  id_expiry_date      DATE,
  id_issuing_authority TEXT,

  -- Status
  status              customer_status NOT NULL DEFAULT 'active',
  notes               TEXT,
  blacklist_reason    TEXT,

  -- Audit
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by          UUID REFERENCES users(id) ON DELETE SET NULL,
  is_deleted          BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at          TIMESTAMPTZ,
  deleted_by          UUID,

  -- A customer's email must be unique within a tenant (if provided)
  UNIQUE NULLS NOT DISTINCT (tenant_id, email)
);

CREATE INDEX IF NOT EXISTS idx_customers_tenant_id  ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_user_id    ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_status     ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_id_number  ON customers(id_number);
CREATE INDEX IF NOT EXISTS idx_customers_email      ON customers(email);

DO $$ BEGIN
  CREATE TRIGGER trg_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ═════════════════════════════════════════════════════════════════════════════
-- 3. DOCUMENTS
--    Notarised legal documents. Scoped to tenant + branch.
--    Linked to the customer it was made for and the employee who processed it.
-- ═════════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE document_type AS ENUM (
    'POWER_OF_ATTORNEY',
    'AFFIDAVIT',
    'DEED',
    'CONTRACT',
    'WILL',
    'STATUTORY_DECLARATION',
    'CERTIFIED_COPY',
    'AUTHENTICATION',
    'APOSTILLE',
    'OTHER'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE document_status AS ENUM (
    'draft',
    'pending_review',
    'approved',
    'signed',
    'notarised',
    'rejected',
    'expired',
    'revoked'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS documents (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id           UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  customer_id         UUID REFERENCES customers(id) ON DELETE SET NULL,

  -- Employee who processed/notarised this document
  processed_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  -- Employee who reviewed/approved (may differ)
  reviewed_by         UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Document identity
  document_number     TEXT NOT NULL,   -- human-readable ref e.g. BOS-2026-00042
  title               TEXT NOT NULL,
  doc_type            document_type NOT NULL,
  status              document_status NOT NULL DEFAULT 'draft',

  -- Content
  content             TEXT,            -- full document text (may be large)
  summary             TEXT,            -- short description
  jurisdiction        TEXT,
  language            TEXT DEFAULT 'en',

  -- File storage (when PDF/scan is uploaded)
  file_url            TEXT,
  file_size_bytes     BIGINT,
  file_mime_type      TEXT,
  file_hash           TEXT,            -- SHA-256 for integrity

  -- Dates
  issued_at           TIMESTAMPTZ,
  expires_at          TIMESTAMPTZ,
  signed_at           TIMESTAMPTZ,
  notarised_at        TIMESTAMPTZ,

  -- Notary seal / watermark
  seal_code           TEXT UNIQUE,     -- e.g. NOTARY-SECURE-123456
  ai_generated        BOOLEAN NOT NULL DEFAULT FALSE,

  -- Rejection
  rejection_reason    TEXT,

  -- Audit
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by          UUID REFERENCES users(id) ON DELETE SET NULL,
  is_deleted          BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at          TIMESTAMPTZ,
  deleted_by          UUID,

  -- Document number must be unique within a tenant
  UNIQUE (tenant_id, document_number)
);

CREATE INDEX IF NOT EXISTS idx_documents_tenant_id    ON documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_branch_id    ON documents(branch_id);
CREATE INDEX IF NOT EXISTS idx_documents_customer_id  ON documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_documents_processed_by ON documents(processed_by);
CREATE INDEX IF NOT EXISTS idx_documents_status       ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_doc_type     ON documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_documents_issued_at    ON documents(issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_seal_code    ON documents(seal_code);

DO $$ BEGIN
  CREATE TRIGGER trg_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ═════════════════════════════════════════════════════════════════════════════
-- 4. SUBSCRIPTIONS
--    Billing plan per tenant. One active subscription at a time.
--    Historical subscriptions are kept for audit.
-- ═════════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM (
    'trialing', 'active', 'past_due', 'cancelled', 'expired'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE billing_interval AS ENUM (
    'monthly', 'quarterly', 'annual'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS subscriptions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Plan
  plan                TEXT NOT NULL CHECK (plan IN ('Basic','Professional','Enterprise')),
  status              subscription_status NOT NULL DEFAULT 'trialing',
  billing_interval    billing_interval NOT NULL DEFAULT 'monthly',

  -- Pricing (stored in cents to avoid float rounding)
  amount_cents        INT NOT NULL DEFAULT 0,
  currency            TEXT NOT NULL DEFAULT 'USD',

  -- Dates
  trial_ends_at       TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end  TIMESTAMPTZ NOT NULL,
  cancelled_at        TIMESTAMPTZ,
  ended_at            TIMESTAMPTZ,

  -- Limits for this plan
  max_branches        INT NOT NULL DEFAULT 1,
  max_employees       INT NOT NULL DEFAULT 5,
  max_documents_month INT NOT NULL DEFAULT 100,

  -- External billing ref (Stripe, etc.)
  external_id         TEXT,

  -- Audit
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by          UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_id ON subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status    ON subscriptions(status);

DO $$ BEGIN
  CREATE TRIGGER trg_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ═════════════════════════════════════════════════════════════════════════════
-- 5. PAYMENTS
--    Individual payment transactions linked to a subscription.
-- ═════════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM (
    'pending', 'processing', 'succeeded', 'failed', 'refunded', 'disputed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM (
    'card', 'bank_transfer', 'mobile_money', 'cash', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS payments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subscription_id     UUID NOT NULL REFERENCES subscriptions(id) ON DELETE RESTRICT,

  -- Amount
  amount_cents        INT NOT NULL,
  currency            TEXT NOT NULL DEFAULT 'USD',

  -- Status and method
  status              payment_status NOT NULL DEFAULT 'pending',
  method              payment_method NOT NULL DEFAULT 'card',

  -- Dates
  paid_at             TIMESTAMPTZ,
  period_start        TIMESTAMPTZ NOT NULL,
  period_end          TIMESTAMPTZ NOT NULL,
  due_date            TIMESTAMPTZ NOT NULL,

  -- External references
  external_id         TEXT,               -- Stripe charge ID etc.
  receipt_url         TEXT,
  failure_reason      TEXT,

  -- Invoice
  invoice_number      TEXT UNIQUE,

  -- Audit
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by          UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_payments_tenant_id        ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_subscription_id  ON payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_status           ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at          ON payments(paid_at DESC);

DO $$ BEGIN
  CREATE TRIGGER trg_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ═════════════════════════════════════════════════════════════════════════════
-- 6. AUDIT LOGS
--    General operational audit trail (separate from auth_audit_log).
--    Captures who did what to which resource.
--    Append-only — never UPDATE or DELETE rows.
-- ═════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Actor
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  tenant_id       UUID REFERENCES tenants(id) ON DELETE SET NULL,
  branch_id       UUID REFERENCES branches(id) ON DELETE SET NULL,

  -- Action
  action          TEXT NOT NULL,         -- e.g. DOCUMENT_CREATED, CUSTOMER_UPDATED
  resource_type   TEXT NOT NULL,         -- 'document', 'customer', 'branch', etc.
  resource_id     UUID,                  -- ID of the affected resource
  resource_label  TEXT,                  -- human-readable (e.g. document_number)

  -- Change detail
  old_values      JSONB,                 -- state before change
  new_values      JSONB,                 -- state after change
  meta            JSONB,                 -- any extra context

  -- Request context
  ip_address      INET,
  user_agent      TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id       ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id     ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_branch_id     ON audit_logs(branch_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action        ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_id   ON audit_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at    ON audit_logs(created_at DESC);


-- ═════════════════════════════════════════════════════════════════════════════
-- 7. NOTIFICATIONS
--    In-app notifications delivered to specific users.
-- ═════════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'info', 'success', 'warning', 'error'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Recipient
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id       UUID REFERENCES tenants(id) ON DELETE CASCADE,

  -- Content
  type            notification_type NOT NULL DEFAULT 'info',
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  action_url      TEXT,             -- optional deep-link

  -- Linked resource (optional)
  resource_type   TEXT,             -- 'document', 'payment', etc.
  resource_id     UUID,

  -- State
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  read_at         TIMESTAMPTZ,
  is_dismissed    BOOLEAN NOT NULL DEFAULT FALSE,
  dismissed_at    TIMESTAMPTZ,

  -- Delivery
  send_email      BOOLEAN NOT NULL DEFAULT FALSE,
  email_sent      BOOLEAN NOT NULL DEFAULT FALSE,
  email_sent_at   TIMESTAMPTZ,

  -- Expiry (NULL = never expires)
  expires_at      TIMESTAMPTZ,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id     ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_id   ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read     ON notifications(user_id, is_read)
  WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_resource    ON notifications(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at  ON notifications(created_at DESC);


-- ═════════════════════════════════════════════════════════════════════════════
-- SEED: company_profiles for the 4 demo tenants
-- ═════════════════════════════════════════════════════════════════════════════
INSERT INTO company_profiles (tenant_id, address, city, country, contact_name, contact_phone, contact_email, timezone)
VALUES
  ('886c9f73-82a4-4e75-a023-cc4802712c52',
   'Kismayo Street 12, Central Bosaso', 'Bosaso', 'Somalia',
   'Ahmed Farah', '+252907791234', 'admin@bosaso-notary.com', 'Africa/Mogadishu'),

  ('8a0804b2-7018-4927-839d-b9c648ca3c9f',
   'Ministry Road 5, Garowe', 'Garowe', 'Somalia',
   'Fatima Ali', '+252907795678', 'admin@puntland-legal.com', 'Africa/Mogadishu'),

  ('13a06b4d-0a41-4361-ae4f-5e6491864181',
   'Port Road 7, Berbera', 'Berbera', 'Somalia',
   'Omar Hassan', '+252907799999', 'info@hornafrica.com', 'Africa/Mogadishu'),

  ('57886b6f-289e-4d73-bb8a-bcbc0d8bcb58',
   'Lido Beach Road 22, Mogadishu', 'Mogadishu', 'Somalia',
   'Deeqa Warsame', '+252907001122', 'admin@somali-legal.com', 'Africa/Mogadishu')
ON CONFLICT (tenant_id) DO NOTHING;

-- ═════════════════════════════════════════════════════════════════════════════
-- SEED: subscriptions for the 4 demo tenants
-- ═════════════════════════════════════════════════════════════════════════════
INSERT INTO subscriptions (
  tenant_id, plan, status, billing_interval,
  amount_cents, currency,
  current_period_start, current_period_end,
  max_branches, max_employees, max_documents_month
)
VALUES
  ('886c9f73-82a4-4e75-a023-cc4802712c52',
   'Enterprise', 'active', 'annual',
   120000, 'USD',
   '2026-01-01', '2027-01-01', 10, 100, 1000),

  ('8a0804b2-7018-4927-839d-b9c648ca3c9f',
   'Professional', 'active', 'monthly',
   4900, 'USD',
   '2026-06-01', '2026-07-01', 5, 25, 300),

  ('13a06b4d-0a41-4361-ae4f-5e6491864181',
   'Basic', 'cancelled', 'monthly',
   1900, 'USD',
   '2026-05-01', '2026-06-01', 1, 5, 50),

  ('57886b6f-289e-4d73-bb8a-bcbc0d8bcb58',
   'Professional', 'active', 'monthly',
   4900, 'USD',
   '2026-06-01', '2026-07-01', 5, 25, 300)
ON CONFLICT DO NOTHING;

-- ═════════════════════════════════════════════════════════════════════════════
-- SEED: demo customers
-- ═════════════════════════════════════════════════════════════════════════════
INSERT INTO customers (tenant_id, full_name, email, phone, nationality, id_type, id_number, id_expiry_date, status)
VALUES
  ('886c9f73-82a4-4e75-a023-cc4802712c52',
   'Hodan Jama', 'hodan.jama@gmail.com', '+252615551001',
   'Somali', 'NATIONAL_ID', 'SO-NID-2024-001', '2029-12-31', 'active'),

  ('886c9f73-82a4-4e75-a023-cc4802712c52',
   'Abdirahman Nur', 'abdirahman.nur@gmail.com', '+252615551002',
   'Somali', 'PASSPORT', 'A1234567', '2028-06-30', 'active'),

  ('8a0804b2-7018-4927-839d-b9c648ca3c9f',
   'Faadumo Hassan', 'faadumo.hassan@outlook.com', '+252615551003',
   'Somali', 'NATIONAL_ID', 'SO-NID-2024-003', '2030-01-01', 'active'),

  ('57886b6f-289e-4d73-bb8a-bcbc0d8bcb58',
   'Khalid Muse', 'khalid.muse@gmail.com', '+252615551004',
   'Somali', 'DRIVERS_LICENSE', 'DL-2023-MOG-007', '2027-09-15', 'active')
ON CONFLICT DO NOTHING;

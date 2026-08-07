-- ─────────────────────────────────────────────────────────────
-- NotaryHub — Step 13: Customer Invoicing
-- Adds: invoices, invoice_items
-- Distinct from subscriptions/payments (platform SaaS billing) —
-- this is the notary office billing its own customers for services.
-- Run after: schema.sql, schema_tenants.sql, schema_full.sql
-- Idempotent: safe to run multiple times
-- ─────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM (
    'draft', 'unpaid', 'paid', 'void'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- New RBAC permission for the invoicing workflow.
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'MANAGE_INVOICES';

CREATE TABLE IF NOT EXISTS invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id       UUID REFERENCES branches(id) ON DELETE SET NULL,
  customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  document_id     UUID REFERENCES documents(id) ON DELETE SET NULL,

  invoice_number  TEXT NOT NULL,           -- e.g. "BOS-INV-000042"
  sequence_num    INT NOT NULL,            -- race-safe per-tenant counter (mirrors queue_tickets pattern)

  status          invoice_status NOT NULL DEFAULT 'unpaid',

  subtotal_cents  INT NOT NULL DEFAULT 0,
  tax_cents       INT NOT NULL DEFAULT 0,
  total_cents     INT NOT NULL DEFAULT 0,
  currency        TEXT NOT NULL DEFAULT 'USD',

  due_date        DATE NOT NULL,
  paid_at         TIMESTAMPTZ,
  payment_method  payment_method,          -- reuses the enum from Step 3 (card/bank_transfer/mobile_money/cash/other)

  notes           TEXT,

  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id   ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_branch_id   ON invoices(branch_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status      ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date    ON invoices(due_date);

CREATE TABLE IF NOT EXISTS invoice_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id        UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description       TEXT NOT NULL,
  quantity          INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price_cents  INT NOT NULL CHECK (unit_price_cents >= 0),
  line_total_cents  INT NOT NULL CHECK (line_total_cents >= 0),
  sort_order        INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);

DO $$ BEGIN
  CREATE TRIGGER trg_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

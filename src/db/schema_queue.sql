-- ─────────────────────────────────────────────────────────────
-- NotaryHub Queue System Schema
-- Branch-scoped walk-in queue with real sequential daily numbering.
-- Idempotent: safe to run multiple times.
-- ─────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE queue_ticket_status AS ENUM (
    'waiting', 'calling', 'serving', 'completed', 'passed', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS queue_tickets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id       UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,

  -- Ticket identity — sequence resets daily per branch, prefix rotates A/B/C
  ticket_number   TEXT NOT NULL,         -- e.g. "A-001"
  sequence_num    INT NOT NULL,          -- raw sequence for ordering/generation
  ticket_date     DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Who is being served
  customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name   TEXT NOT NULL,         -- denormalised for walk-ins with no customer record
  service_type    TEXT NOT NULL,

  -- Status workflow: waiting -> calling -> serving -> completed
  --                          \-> passed (skipped, can be recalled)
  --                          \-> cancelled
  status          queue_ticket_status NOT NULL DEFAULT 'waiting',

  -- Counter assignment — comes from the calling employee's real
  -- assigned_counter (employees.assigned_counter), not hardcoded
  called_counter  INT,
  served_by       UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Timestamps for each stage
  check_in_time   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  called_at       TIMESTAMPTZ,
  serving_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,

  -- Link to the document created during this visit, if any
  document_id     UUID REFERENCES documents(id) ON DELETE SET NULL,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- A branch cannot issue the same ticket number twice on the same day
  UNIQUE (branch_id, ticket_date, ticket_number)
);

CREATE INDEX IF NOT EXISTS idx_queue_tickets_branch_id   ON queue_tickets(branch_id);
CREATE INDEX IF NOT EXISTS idx_queue_tickets_tenant_id   ON queue_tickets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_queue_tickets_status      ON queue_tickets(status);
CREATE INDEX IF NOT EXISTS idx_queue_tickets_ticket_date ON queue_tickets(ticket_date);
CREATE INDEX IF NOT EXISTS idx_queue_tickets_customer_id ON queue_tickets(customer_id);
-- Hot path: "find next waiting ticket for this branch today, oldest first"
CREATE INDEX IF NOT EXISTS idx_queue_tickets_waiting_lookup
  ON queue_tickets(branch_id, ticket_date, status, check_in_time)
  WHERE status = 'waiting';

DO $$ BEGIN
  CREATE TRIGGER trg_queue_tickets_updated_at
    BEFORE UPDATE ON queue_tickets
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

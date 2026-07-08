import { query, withTransaction } from "../db/pool.js";

export type QueueTicketStatus =
  | "waiting" | "calling" | "serving" | "completed" | "passed" | "cancelled";

export interface QueueTicketRecord {
  id: string;
  tenant_id: string;
  branch_id: string;
  ticket_number: string;
  sequence_num: number;
  ticket_date: string;
  customer_id: string | null;
  customer_name: string;
  service_type: string;
  status: QueueTicketStatus;
  called_counter: number | null;
  served_by: string | null;
  check_in_time: string;
  called_at: string | null;
  serving_at: string | null;
  completed_at: string | null;
  document_id: string | null;
  created_at: string;
  updated_at: string;
  // joined
  served_by_name?: string | null;
}

// Prefix rotates A, B, C by day-of-week-bucket so branches don't run out
// of distinct codes during a busy day — purely cosmetic, sequence_num is
// what actually guarantees uniqueness and ordering.
const PREFIXES = ["A", "B", "C"];

function prefixForSequence(seq: number): string {
  // Every 100 tickets, rotate to the next prefix letter (A-001..A-099, B-001..)
  const bucket = Math.floor((seq - 1) / 99);
  return PREFIXES[bucket % PREFIXES.length];
}

// ─── Check-in: issue a new ticket ───────────────────────────────────────────────
// Race-safe: uses a transaction + advisory-lock-free approach by relying on the
// UNIQUE(branch_id, ticket_date, ticket_number) constraint and retrying the
// sequence read inside the same transaction.

export async function checkInCustomer(input: {
  tenantId: string;
  branchId: string;
  customerName: string;
  serviceType: string;
  customerId?: string;
}): Promise<QueueTicketRecord> {
  return withTransaction(async (client) => {
    // Lock the branch row for the duration of this transaction so two
    // simultaneous check-ins on the same branch can't read the same
    // "next sequence" value.
    await client.query(
      `SELECT id FROM branches WHERE id = $1 FOR UPDATE`,
      [input.branchId]
    );

    const { rows: maxRows } = await client.query<{ max_seq: number | null }>(
      `SELECT MAX(sequence_num) AS max_seq
       FROM queue_tickets
       WHERE branch_id = $1 AND ticket_date = CURRENT_DATE`,
      [input.branchId]
    );

    const nextSeq = (maxRows[0]?.max_seq ?? 0) + 1;
    const prefix = prefixForSequence(nextSeq);
    const localNum = ((nextSeq - 1) % 99) + 1;
    const ticketNumber = `${prefix}-${String(localNum).padStart(3, "0")}`;

    const { rows } = await client.query<QueueTicketRecord>(
      `INSERT INTO queue_tickets (
         tenant_id, branch_id, ticket_number, sequence_num, ticket_date,
         customer_id, customer_name, service_type, status
       ) VALUES (
         $1, $2, $3, $4, CURRENT_DATE,
         $5, $6, $7, 'waiting'
       )
       RETURNING *`,
      [
        input.tenantId,
        input.branchId,
        ticketNumber,
        nextSeq,
        input.customerId ?? null,
        input.customerName.trim(),
        input.serviceType,
      ]
    );

    return rows[0];
  });
}

// ─── Read ──────────────────────────────────────────────────────────────────────

export async function getQueueForBranch(
  branchId: string,
  tenantId: string,
  date?: string
): Promise<QueueTicketRecord[]> {
  const { rows } = await query<QueueTicketRecord>(
    `SELECT q.*, u.full_name AS served_by_name
     FROM queue_tickets q
     LEFT JOIN users u ON u.id = q.served_by
     WHERE q.branch_id = $1
       AND q.tenant_id = $2
       AND q.ticket_date = $3
     ORDER BY q.sequence_num ASC`,
    [branchId, tenantId, date ?? new Date().toISOString().slice(0, 10)]
  );
  return rows;
}

export async function getTicketById(
  ticketId: string,
  tenantId: string
): Promise<QueueTicketRecord | null> {
  const { rows } = await query<QueueTicketRecord>(
    `SELECT q.*, u.full_name AS served_by_name
     FROM queue_tickets q
     LEFT JOIN users u ON u.id = q.served_by
     WHERE q.id = $1 AND q.tenant_id = $2`,
    [ticketId, tenantId]
  );
  return rows[0] ?? null;
}

// ─── Call next waiting ticket (FIFO) ───────────────────────────────────────────
// The calling employee's counter comes from their real employee record,
// not a hardcoded number. If the employee has no assigned_counter,
// the caller must supply one explicitly (front desk override).

export async function callNextTicket(
  branchId: string,
  tenantId: string,
  callingUserId: string,
  overrideCounter?: number
): Promise<QueueTicketRecord> {
  return withTransaction(async (client) => {
    // Resolve the calling employee's real assigned counter
    const { rows: empRows } = await client.query<{ assigned_counter: number | null }>(
      `SELECT assigned_counter FROM employees WHERE user_id = $1 AND is_deleted = FALSE`,
      [callingUserId]
    );
    const counter = overrideCounter ?? empRows[0]?.assigned_counter;
    if (!counter) {
      throw new Error("NO_COUNTER_ASSIGNED");
    }

    // Lock and fetch the oldest waiting ticket for this branch today
    const { rows: nextRows } = await client.query<QueueTicketRecord>(
      `SELECT * FROM queue_tickets
       WHERE branch_id = $1
         AND tenant_id = $2
         AND ticket_date = CURRENT_DATE
         AND status = 'waiting'
       ORDER BY check_in_time ASC
       LIMIT 1
       FOR UPDATE SKIP LOCKED`,
      [branchId, tenantId]
    );

    if (nextRows.length === 0) {
      throw new Error("NO_WAITING_TICKETS");
    }

    const ticket = nextRows[0];

    // Auto-complete this employee's previous "calling"/"serving" ticket
    // at the same counter, so a counter never has two active tickets.
    await client.query(
      `UPDATE queue_tickets
       SET status = 'completed', completed_at = NOW(), updated_at = NOW()
       WHERE branch_id = $1
         AND ticket_date = CURRENT_DATE
         AND called_counter = $2
         AND status IN ('calling', 'serving')`,
      [branchId, counter]
    );

    const { rows: updated } = await client.query<QueueTicketRecord>(
      `UPDATE queue_tickets
       SET status = 'calling',
           called_counter = $2,
           served_by = $3,
           called_at = NOW(),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [ticket.id, counter, callingUserId]
    );

    return updated[0];
  });
}

// ─── Transition: calling -> serving ────────────────────────────────────────────

export async function markServing(
  ticketId: string,
  tenantId: string
): Promise<QueueTicketRecord> {
  const { rows } = await query<QueueTicketRecord>(
    `UPDATE queue_tickets
     SET status = 'serving', serving_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2 AND status = 'calling'
     RETURNING *`,
    [ticketId, tenantId]
  );
  if (rows.length === 0) throw new Error("INVALID_TRANSITION");
  return rows[0];
}

// ─── Complete ──────────────────────────────────────────────────────────────────

export async function completeTicket(
  ticketId: string,
  tenantId: string,
  documentId?: string
): Promise<QueueTicketRecord> {
  const { rows } = await query<QueueTicketRecord>(
    `UPDATE queue_tickets
     SET status = 'completed', completed_at = NOW(), updated_at = NOW(),
         document_id = COALESCE($3, document_id)
     WHERE id = $1 AND tenant_id = $2 AND status IN ('calling','serving')
     RETURNING *`,
    [ticketId, tenantId, documentId ?? null]
  );
  if (rows.length === 0) throw new Error("INVALID_TRANSITION");
  return rows[0];
}

// ─── Skip (passed) — can be recalled later ─────────────────────────────────────

export async function skipTicket(
  ticketId: string,
  tenantId: string
): Promise<QueueTicketRecord> {
  const { rows } = await query<QueueTicketRecord>(
    `UPDATE queue_tickets
     SET status = 'passed', updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2 AND status IN ('waiting','calling')
     RETURNING *`,
    [ticketId, tenantId]
  );
  if (rows.length === 0) throw new Error("INVALID_TRANSITION");
  return rows[0];
}

// ─── Recall a passed ticket back to waiting ────────────────────────────────────

export async function recallTicket(
  ticketId: string,
  tenantId: string
): Promise<QueueTicketRecord> {
  const { rows } = await query<QueueTicketRecord>(
    `UPDATE queue_tickets
     SET status = 'waiting', called_counter = NULL, served_by = NULL,
         called_at = NULL, updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2 AND status = 'passed'
     RETURNING *`,
    [ticketId, tenantId]
  );
  if (rows.length === 0) throw new Error("INVALID_TRANSITION");
  return rows[0];
}

// ─── Cancel ────────────────────────────────────────────────────────────────────

export async function cancelTicket(
  ticketId: string,
  tenantId: string
): Promise<QueueTicketRecord> {
  const { rows } = await query<QueueTicketRecord>(
    `UPDATE queue_tickets
     SET status = 'cancelled', updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2 AND status NOT IN ('completed','cancelled')
     RETURNING *`,
    [ticketId, tenantId]
  );
  if (rows.length === 0) throw new Error("INVALID_TRANSITION");
  return rows[0];
}

// ─── Stats for dashboard ────────────────────────────────────────────────────────

export async function getQueueStats(
  branchId: string,
  tenantId: string
): Promise<{
  waiting: number;
  serving: number;
  completedToday: number;
  averageWaitMinutes: number | null;
}> {
  const { rows } = await query<{
    waiting: string;
    serving: string;
    completed_today: string;
    avg_wait_minutes: string | null;
  }>(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'waiting')                AS waiting,
       COUNT(*) FILTER (WHERE status IN ('calling','serving'))   AS serving,
       COUNT(*) FILTER (WHERE status = 'completed')              AS completed_today,
       AVG(EXTRACT(EPOCH FROM (called_at - check_in_time)) / 60)
         FILTER (WHERE called_at IS NOT NULL)                    AS avg_wait_minutes
     FROM queue_tickets
     WHERE branch_id = $1 AND tenant_id = $2 AND ticket_date = CURRENT_DATE`,
    [branchId, tenantId]
  );

  return {
    waiting:        parseInt(rows[0]?.waiting ?? "0", 10),
    serving:        parseInt(rows[0]?.serving ?? "0", 10),
    completedToday: parseInt(rows[0]?.completed_today ?? "0", 10),
    averageWaitMinutes: rows[0]?.avg_wait_minutes
      ? Math.round(parseFloat(rows[0].avg_wait_minutes))
      : null,
  };
}

// ─── Tenant-wide queue (for COMPANY_ADMIN without a specific branch) ───────────

export async function getQueueForTenant(
  tenantId: string,
  date?: string
): Promise<QueueTicketRecord[]> {
  const { rows } = await query<QueueTicketRecord>(
    `SELECT q.*, u.full_name AS served_by_name
     FROM queue_tickets q
     LEFT JOIN users u ON u.id = q.served_by
     WHERE q.tenant_id = $1
       AND q.ticket_date = $2
     ORDER BY q.branch_id, q.sequence_num ASC`,
    [tenantId, date ?? new Date().toISOString().slice(0, 10)]
  );
  return rows;
}

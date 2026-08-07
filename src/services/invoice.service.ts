import { query, withTransaction } from "../db/pool.js";

export type InvoiceStatus = "draft" | "unpaid" | "paid" | "void";
export type PaymentMethod = "card" | "bank_transfer" | "mobile_money" | "cash" | "other";

// Status as stored in the DB never includes "overdue" — that's derived at
// read time from (status = 'unpaid' AND due_date < today), same way a bank
// statement doesn't store "overdue", just unpaid + a date you compare against
// the calendar. Keeps us honest without needing a cron job to keep it in sync.
export type EffectiveInvoiceStatus = InvoiceStatus | "overdue";

export interface InvoiceItemInput {
  description: string;
  quantity: number;
  unitPriceCents: number;
}

export interface InvoiceItemRecord extends InvoiceItemInput {
  id: string;
  invoice_id: string;
  line_total_cents: number;
  sort_order: number;
}

export interface InvoiceRecord {
  id: string;
  tenant_id: string;
  branch_id: string | null;
  customer_id: string;
  document_id: string | null;
  invoice_number: string;
  sequence_num: number;
  status: InvoiceStatus;
  effective_status: EffectiveInvoiceStatus;
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  currency: string;
  due_date: string;
  paid_at: string | null;
  payment_method: PaymentMethod | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // joined
  customer_name?: string;
  customer_email?: string | null;
  branch_name?: string | null;
  items?: InvoiceItemRecord[];
}

const EFFECTIVE_STATUS_SQL = `
  CASE
    WHEN i.status = 'unpaid' AND i.due_date < CURRENT_DATE THEN 'overdue'
    ELSE i.status::text
  END AS effective_status
`;

// ─── Generate a race-safe, per-tenant sequential invoice number ────────────
// Mirrors the queue_tickets pattern: lock the tenant row for the duration of
// the transaction so two concurrent invoice creations on the same tenant
// can't read the same "next sequence" value.
async function generateInvoiceNumber(
  tenantId: string,
  client: { query: (sql: string, params?: any[]) => Promise<any> }
): Promise<{ invoiceNumber: string; sequenceNum: number }> {
  await client.query(`SELECT id FROM tenants WHERE id = $1 FOR UPDATE`, [tenantId]);

  const { rows: tenantRows } = await client.query(
    `SELECT subdomain FROM tenants WHERE id = $1`,
    [tenantId]
  );
  const subdomain = tenantRows[0]?.subdomain ?? "INV";
  const prefix = subdomain.replace(/-/g, "").slice(0, 3).toUpperCase();

  const { rows: maxRows } = await client.query(
    `SELECT MAX(sequence_num) AS max_seq FROM invoices WHERE tenant_id = $1`,
    [tenantId]
  );
  const nextSeq = (maxRows[0]?.max_seq ?? 0) + 1;
  const invoiceNumber = `${prefix}-INV-${String(nextSeq).padStart(6, "0")}`;

  return { invoiceNumber, sequenceNum: nextSeq };
}

// ─── Create ─────────────────────────────────────────────────────────────
export async function createInvoice(input: {
  tenantId: string;
  branchId?: string | null;
  customerId: string;
  documentId?: string | null;
  items: InvoiceItemInput[];
  taxCents?: number;
  currency?: string;
  dueDate: string; // ISO date
  notes?: string | null;
  createdBy: string;
  status?: "draft" | "unpaid";
}): Promise<InvoiceRecord> {
  if (!input.items || input.items.length === 0) {
    throw new Error("INVOICE_NEEDS_ITEMS");
  }

  return withTransaction(async (client) => {
    // Confirm the customer belongs to this tenant (tenant isolation)
    const { rows: custRows } = await client.query(
      `SELECT id, full_name, email FROM customers WHERE id = $1 AND tenant_id = $2`,
      [input.customerId, input.tenantId]
    );
    if (custRows.length === 0) {
      throw new Error("CUSTOMER_NOT_FOUND");
    }

    const subtotalCents = input.items.reduce(
      (sum, item) => sum + Math.round(item.quantity * item.unitPriceCents),
      0
    );
    const taxCents = input.taxCents ?? 0;
    const totalCents = subtotalCents + taxCents;

    const { invoiceNumber, sequenceNum } = await generateInvoiceNumber(input.tenantId, client);

    const { rows } = await client.query(
      `INSERT INTO invoices (
         tenant_id, branch_id, customer_id, document_id,
         invoice_number, sequence_num, status,
         subtotal_cents, tax_cents, total_cents, currency,
         due_date, notes, created_by
       ) VALUES (
         $1, $2, $3, $4,
         $5, $6, $7,
         $8, $9, $10, $11,
         $12, $13, $14
       )
       RETURNING *`,
      [
        input.tenantId,
        input.branchId ?? null,
        input.customerId,
        input.documentId ?? null,
        invoiceNumber,
        sequenceNum,
        input.status ?? "unpaid",
        subtotalCents,
        taxCents,
        totalCents,
        input.currency ?? "USD",
        input.dueDate,
        input.notes ?? null,
        input.createdBy,
      ]
    );
    const invoice = rows[0];

    for (let i = 0; i < input.items.length; i++) {
      const item = input.items[i];
      const lineTotal = Math.round(item.quantity * item.unitPriceCents);
      await client.query(
        `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price_cents, line_total_cents, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [invoice.id, item.description, item.quantity, item.unitPriceCents, lineTotal, i]
      );
    }

    return getInvoiceById(invoice.id, input.tenantId, client);
  });
}

// ─── Read ───────────────────────────────────────────────────────────────
export async function getInvoiceById(
  id: string,
  tenantId: string,
  client?: { query: (sql: string, params?: any[]) => Promise<any> }
): Promise<InvoiceRecord> {
  const q = client ?? { query };
  const { rows } = await q.query(
    `SELECT i.*, ${EFFECTIVE_STATUS_SQL}, c.full_name AS customer_name, c.email AS customer_email,
            b.name AS branch_name
     FROM invoices i
     JOIN customers c ON c.id = i.customer_id
     LEFT JOIN branches b ON b.id = i.branch_id
     WHERE i.id = $1 AND i.tenant_id = $2`,
    [id, tenantId]
  );
  if (rows.length === 0) {
    throw new Error("INVOICE_NOT_FOUND");
  }
  const invoice = rows[0] as InvoiceRecord;

  const { rows: itemRows } = await q.query(
    `SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY sort_order ASC`,
    [id]
  );
  invoice.items = itemRows;
  return invoice;
}

export async function listInvoices(
  tenantId: string,
  filters: { branchId?: string; customerId?: string; status?: EffectiveInvoiceStatus; limit?: number; offset?: number } = {}
): Promise<{ invoices: InvoiceRecord[]; total: number }> {
  const conditions: string[] = [`i.tenant_id = $1`];
  const params: any[] = [tenantId];

  if (filters.branchId) {
    params.push(filters.branchId);
    conditions.push(`i.branch_id = $${params.length}`);
  }
  if (filters.customerId) {
    params.push(filters.customerId);
    conditions.push(`i.customer_id = $${params.length}`);
  }

  const whereClause = conditions.join(" AND ");

  // Filtering on the derived effective_status requires wrapping in a subquery
  // since it's not a real column we can reference in WHERE directly.
  let sql = `
    SELECT * FROM (
      SELECT i.*, ${EFFECTIVE_STATUS_SQL}, c.full_name AS customer_name, c.email AS customer_email,
             b.name AS branch_name
      FROM invoices i
      JOIN customers c ON c.id = i.customer_id
      LEFT JOIN branches b ON b.id = i.branch_id
      WHERE ${whereClause}
    ) sub
  `;
  if (filters.status) {
    params.push(filters.status);
    sql += ` WHERE effective_status = $${params.length}`;
  }
  sql += ` ORDER BY created_at DESC`;

  if (filters.limit) {
    params.push(filters.limit);
    sql += ` LIMIT $${params.length}`;
  }
  if (filters.offset) {
    params.push(filters.offset);
    sql += ` OFFSET $${params.length}`;
  }

  const { rows } = await query(sql, params);

  const countSql = `SELECT COUNT(*) AS count FROM invoices i WHERE ${whereClause}`;
  const { rows: countRows } = await query(countSql, params.slice(0, conditions.length));

  return { invoices: rows, total: parseInt(countRows[0]?.count ?? "0", 10) };
}

// ─── Payment recording ──────────────────────────────────────────────────
export async function recordPayment(
  id: string,
  tenantId: string,
  paymentMethod: PaymentMethod
): Promise<InvoiceRecord> {
  const { rows } = await query(
    `UPDATE invoices
     SET status = 'paid', paid_at = now(), payment_method = $3
     WHERE id = $1 AND tenant_id = $2 AND status IN ('draft', 'unpaid')
     RETURNING id`,
    [id, tenantId, paymentMethod]
  );
  if (rows.length === 0) {
    throw new Error("INVOICE_NOT_PAYABLE");
  }
  return getInvoiceById(id, tenantId);
}

export async function voidInvoice(id: string, tenantId: string): Promise<InvoiceRecord> {
  const { rows } = await query(
    `UPDATE invoices SET status = 'void' WHERE id = $1 AND tenant_id = $2 AND status != 'paid' RETURNING id`,
    [id, tenantId]
  );
  if (rows.length === 0) {
    throw new Error("INVOICE_NOT_FOUND_OR_PAID");
  }
  return getInvoiceById(id, tenantId);
}

// ─── Stats ──────────────────────────────────────────────────────────────
export async function getInvoiceStats(tenantId: string, branchId?: string): Promise<{
  totalInvoicedCents: number;
  totalPaidCents: number;
  totalOutstandingCents: number;
  totalOverdueCents: number;
  collectionRate: number;
}> {
  const conditions = [`tenant_id = $1`];
  const params: any[] = [tenantId];
  if (branchId) {
    params.push(branchId);
    conditions.push(`branch_id = $${params.length}`);
  }

  const { rows } = await query(
    `SELECT
       COALESCE(SUM(total_cents), 0) AS total_invoiced,
       COALESCE(SUM(total_cents) FILTER (WHERE status = 'paid'), 0) AS total_paid,
       COALESCE(SUM(total_cents) FILTER (WHERE status = 'unpaid'), 0) AS total_outstanding,
       COALESCE(SUM(total_cents) FILTER (WHERE status = 'unpaid' AND due_date < CURRENT_DATE), 0) AS total_overdue
     FROM invoices
     WHERE ${conditions.join(" AND ")} AND status != 'void'`,
    params
  );

  const r = rows[0];
  const totalInvoiced = parseInt(r.total_invoiced, 10);
  const totalPaid = parseInt(r.total_paid, 10);

  return {
    totalInvoicedCents: totalInvoiced,
    totalPaidCents: totalPaid,
    totalOutstandingCents: parseInt(r.total_outstanding, 10),
    totalOverdueCents: parseInt(r.total_overdue, 10),
    collectionRate: totalInvoiced > 0 ? Math.round((totalPaid / totalInvoiced) * 1000) / 10 : 0,
  };
}

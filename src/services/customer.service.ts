import { query, withTransaction } from "../db/pool.js";

export interface CustomerRecord {
  id: string;
  tenant_id: string;
  user_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  nationality: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  id_type: string | null;
  id_number: string | null;
  id_issue_date: string | null;
  id_expiry_date: string | null;
  id_issuing_authority: string | null;
  status: "active" | "suspended" | "blacklisted";
  notes: string | null;
  blacklist_reason: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  is_deleted: boolean;
  // Aggregated
  document_count?: number;
}

// ─── Read ──────────────────────────────────────────────────────────────────────

export async function getCustomersByTenant(
  tenantId: string,
  search?: string
): Promise<CustomerRecord[]> {
  const params: unknown[] = [tenantId];
  let searchClause = "";

  if (search?.trim()) {
    searchClause = `AND (
      c.full_name ILIKE $2 OR
      c.email     ILIKE $2 OR
      c.phone     ILIKE $2 OR
      c.id_number ILIKE $2
    )`;
    params.push(`%${search.trim()}%`);
  }

  const { rows } = await query<CustomerRecord>(
    `SELECT
       c.*,
       COUNT(d.id) AS document_count
     FROM customers c
     LEFT JOIN documents d ON d.customer_id = c.id AND d.is_deleted = FALSE
     WHERE c.tenant_id = $1
       AND c.is_deleted = FALSE
       ${searchClause}
     GROUP BY c.id
     ORDER BY c.full_name ASC`,
    params
  );
  return rows;
}

export async function getCustomerById(
  customerId: string,
  tenantId: string
): Promise<CustomerRecord | null> {
  const { rows } = await query<CustomerRecord>(
    `SELECT c.*, COUNT(d.id) AS document_count
     FROM customers c
     LEFT JOIN documents d ON d.customer_id = c.id AND d.is_deleted = FALSE
     WHERE c.id = $1 AND c.tenant_id = $2 AND c.is_deleted = FALSE
     GROUP BY c.id`,
    [customerId, tenantId]
  );
  return rows[0] ?? null;
}

// ─── Create ────────────────────────────────────────────────────────────────────

export interface CreateCustomerInput {
  fullName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  nationality?: string;
  address?: string;
  city?: string;
  country?: string;
  idType?: string;
  idNumber?: string;
  idIssueDate?: string;
  idExpiryDate?: string;
  idIssuingAuthority?: string;
  notes?: string;
}

export async function createCustomer(
  tenantId: string,
  input: CreateCustomerInput,
  createdBy: string
): Promise<CustomerRecord> {
  // Check email uniqueness within tenant
  if (input.email) {
    const { rows } = await query(
      `SELECT id FROM customers WHERE tenant_id = $1 AND email = $2 AND is_deleted = FALSE`,
      [tenantId, input.email.toLowerCase().trim()]
    );
    if (rows.length > 0) throw new Error("CUSTOMER_EMAIL_TAKEN");
  }

  const { rows } = await query<CustomerRecord>(
    `INSERT INTO customers (
       tenant_id, full_name, email, phone,
       date_of_birth, nationality, address, city, country,
       id_type, id_number, id_issue_date, id_expiry_date, id_issuing_authority,
       notes, created_by
     ) VALUES (
       $1, $2, $3, $4,
       $5, $6, $7, $8, $9,
       $10, $11, $12, $13, $14,
       $15, $16
     )
     RETURNING *`,
    [
      tenantId,
      input.fullName.trim(),
      input.email?.toLowerCase().trim() ?? null,
      input.phone ?? null,
      input.dateOfBirth ?? null,
      input.nationality ?? null,
      input.address ?? null,
      input.city ?? null,
      input.country ?? "Somalia",
      input.idType ?? null,
      input.idNumber ?? null,
      input.idIssueDate ?? null,
      input.idExpiryDate ?? null,
      input.idIssuingAuthority ?? null,
      input.notes ?? null,
      createdBy,
    ]
  );
  return rows[0];
}

// ─── Update ────────────────────────────────────────────────────────────────────

export async function updateCustomer(
  customerId: string,
  tenantId: string,
  input: Partial<CreateCustomerInput> & { status?: CustomerRecord["status"]; blacklistReason?: string }
): Promise<CustomerRecord> {
  const customer = await getCustomerById(customerId, tenantId);
  if (!customer) throw new Error("CUSTOMER_NOT_FOUND");

  const { rows } = await query<CustomerRecord>(
    `UPDATE customers SET
       full_name            = COALESCE($3,  full_name),
       email                = COALESCE($4,  email),
       phone                = COALESCE($5,  phone),
       date_of_birth        = COALESCE($6,  date_of_birth),
       nationality          = COALESCE($7,  nationality),
       address              = COALESCE($8,  address),
       city                 = COALESCE($9,  city),
       country              = COALESCE($10, country),
       id_type              = COALESCE($11, id_type),
       id_number            = COALESCE($12, id_number),
       id_issue_date        = COALESCE($13, id_issue_date),
       id_expiry_date       = COALESCE($14, id_expiry_date),
       id_issuing_authority = COALESCE($15, id_issuing_authority),
       notes                = COALESCE($16, notes),
       status               = COALESCE($17, status),
       blacklist_reason     = COALESCE($18, blacklist_reason),
       updated_at           = NOW()
     WHERE id = $1 AND tenant_id = $2
     RETURNING *`,
    [
      customerId, tenantId,
      input.fullName?.trim() ?? null,
      input.email?.toLowerCase().trim() ?? null,
      input.phone ?? null,
      input.dateOfBirth ?? null,
      input.nationality ?? null,
      input.address ?? null,
      input.city ?? null,
      input.country ?? null,
      input.idType ?? null,
      input.idNumber ?? null,
      input.idIssueDate ?? null,
      input.idExpiryDate ?? null,
      input.idIssuingAuthority ?? null,
      input.notes ?? null,
      input.status ?? null,
      input.blacklistReason ?? null,
    ]
  );
  return rows[0];
}

// ─── Soft delete ───────────────────────────────────────────────────────────────

export async function deleteCustomer(
  customerId: string,
  tenantId: string,
  deletedBy: string
): Promise<void> {
  const customer = await getCustomerById(customerId, tenantId);
  if (!customer) throw new Error("CUSTOMER_NOT_FOUND");

  await query(
    `UPDATE customers
     SET is_deleted = TRUE, deleted_at = NOW(), deleted_by = $3, updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2`,
    [customerId, tenantId, deletedBy]
  );
}

import { query, withTransaction } from "../db/pool.js";

export interface BranchRecord {
  id: string;
  tenant_id: string;
  name: string;
  address: string;
  phone: string | null;
  counters_count: number;
  status: "active" | "suspended" | "archived";
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  is_deleted: boolean;
}

// ─── Read ──────────────────────────────────────────────────────────────────

export async function getBranchesByTenant(tenantId: string): Promise<BranchRecord[]> {
  const { rows } = await query<BranchRecord>(
    `SELECT id, tenant_id, name, address, phone, counters_count, status,
            created_at, updated_at, created_by, is_deleted
     FROM branches
     WHERE tenant_id = $1 AND is_deleted = FALSE
     ORDER BY name ASC`,
    [tenantId]
  );
  return rows;
}

export async function getBranchById(
  branchId: string,
  tenantId: string
): Promise<BranchRecord | null> {
  const { rows } = await query<BranchRecord>(
    `SELECT id, tenant_id, name, address, phone, counters_count, status,
            created_at, updated_at, created_by, is_deleted
     FROM branches
     WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE`,
    [branchId, tenantId]
  );
  return rows[0] ?? null;
}

// ─── Create ────────────────────────────────────────────────────────────────

export interface CreateBranchInput {
  name: string;
  address: string;
  phone?: string;
  countersCount?: number;
}

export async function createBranch(
  tenantId: string,
  input: CreateBranchInput,
  createdBy: string
): Promise<BranchRecord> {
  // Name must be unique within a tenant
  const { rows: exists } = await query(
    `SELECT id FROM branches WHERE tenant_id = $1 AND name = $2 AND is_deleted = FALSE`,
    [tenantId, input.name.trim()]
  );
  if (exists.length > 0) throw new Error("BRANCH_NAME_TAKEN");

  const { rows } = await query<BranchRecord>(
    `INSERT INTO branches (tenant_id, name, address, phone, counters_count, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, tenant_id, name, address, phone, counters_count, status,
               created_at, updated_at, created_by, is_deleted`,
    [
      tenantId,
      input.name.trim(),
      input.address.trim(),
      input.phone ?? null,
      input.countersCount ?? 2,
      createdBy,
    ]
  );
  return rows[0];
}

// ─── Update ────────────────────────────────────────────────────────────────

export interface UpdateBranchInput {
  name?: string;
  address?: string;
  phone?: string;
  countersCount?: number;
  status?: "active" | "suspended" | "archived";
}

export async function updateBranch(
  branchId: string,
  tenantId: string,
  input: UpdateBranchInput
): Promise<BranchRecord> {
  const branch = await getBranchById(branchId, tenantId);
  if (!branch) throw new Error("BRANCH_NOT_FOUND");

  // Check name uniqueness if being changed
  if (input.name && input.name.trim() !== branch.name) {
    const { rows: exists } = await query(
      `SELECT id FROM branches WHERE tenant_id = $1 AND name = $2 AND id != $3 AND is_deleted = FALSE`,
      [tenantId, input.name.trim(), branchId]
    );
    if (exists.length > 0) throw new Error("BRANCH_NAME_TAKEN");
  }

  const { rows } = await query<BranchRecord>(
    `UPDATE branches
     SET name            = COALESCE($3, name),
         address         = COALESCE($4, address),
         phone           = COALESCE($5, phone),
         counters_count  = COALESCE($6, counters_count),
         status          = COALESCE($7, status),
         updated_at      = NOW()
     WHERE id = $1 AND tenant_id = $2
     RETURNING id, tenant_id, name, address, phone, counters_count, status,
               created_at, updated_at, created_by, is_deleted`,
    [
      branchId,
      tenantId,
      input.name?.trim() ?? null,
      input.address?.trim() ?? null,
      input.phone ?? null,
      input.countersCount ?? null,
      input.status ?? null,
    ]
  );
  return rows[0];
}

// ─── Soft Delete ───────────────────────────────────────────────────────────

export async function deleteBranch(
  branchId: string,
  tenantId: string,
  deletedBy: string
): Promise<void> {
  const branch = await getBranchById(branchId, tenantId);
  if (!branch) throw new Error("BRANCH_NOT_FOUND");

  await withTransaction(async (client) => {
    const now = new Date().toISOString();

    // Cascade: soft-delete all employees in this branch
    await client.query(
      `UPDATE employees
       SET is_deleted = TRUE, deleted_at = $2, deleted_by = $3, updated_at = NOW()
       WHERE branch_id = $1 AND is_deleted = FALSE`,
      [branchId, now, deletedBy]
    );

    // Cascade: deactivate user accounts for those employees
    await client.query(
      `UPDATE users SET status = 'suspended', updated_at = NOW()
       WHERE id IN (
         SELECT user_id FROM employees WHERE branch_id = $1
       )`,
      [branchId]
    );

    // Soft-delete the branch
    await client.query(
      `UPDATE branches
       SET is_deleted = TRUE, deleted_at = $2, deleted_by = $3,
           status = 'archived', updated_at = NOW()
       WHERE id = $1`,
      [branchId, now, deletedBy]
    );
  });
}

// ─── Branch stats ──────────────────────────────────────────────────────────

export async function getBranchStats(branchId: string): Promise<{
  activeEmployees: number;
  totalEmployees: number;
}> {
  const { rows } = await query<{ active: string; total: string }>(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'active') AS active,
       COUNT(*) AS total
     FROM employees
     WHERE branch_id = $1 AND is_deleted = FALSE`,
    [branchId]
  );
  return {
    activeEmployees: parseInt(rows[0].active, 10),
    totalEmployees:  parseInt(rows[0].total, 10),
  };
}

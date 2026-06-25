import { query, withTransaction } from "../db/pool.js";

export interface TenantRecord {
  id: string;
  name: string;
  subdomain: string;
  status: "active" | "suspended" | "trial";
  plan: "Basic" | "Professional" | "Enterprise";
  email: string | null;
  license_number: string | null;
  created_at: Date;
  updated_at: Date;
  is_deleted: boolean;
}

// ─── Read ──────────────────────────────────────────────────────────────────

export async function getAllTenants(): Promise<TenantRecord[]> {
  const { rows } = await query<TenantRecord>(
    `SELECT id, name, subdomain, status, plan, email, license_number,
            created_at, updated_at, is_deleted
     FROM tenants
     WHERE is_deleted = FALSE
     ORDER BY name ASC`
  );
  return rows;
}

export async function getTenantById(id: string): Promise<TenantRecord | null> {
  const { rows } = await query<TenantRecord>(
    `SELECT id, name, subdomain, status, plan, email, license_number,
            created_at, updated_at, is_deleted
     FROM tenants
     WHERE id = $1 AND is_deleted = FALSE`,
    [id]
  );
  return rows[0] ?? null;
}

export async function getTenantBySubdomain(subdomain: string): Promise<TenantRecord | null> {
  const { rows } = await query<TenantRecord>(
    `SELECT id, name, subdomain, status, plan, email, license_number,
            created_at, updated_at, is_deleted
     FROM tenants
     WHERE subdomain = $1 AND is_deleted = FALSE`,
    [subdomain.toLowerCase().trim()]
  );
  return rows[0] ?? null;
}

// ─── Create ────────────────────────────────────────────────────────────────

export interface CreateTenantInput {
  name: string;
  subdomain: string;
  plan: TenantRecord["plan"];
  email?: string;
  licenseNumber?: string;
}

export async function createTenant(
  input: CreateTenantInput,
  createdBy: string
): Promise<TenantRecord> {
  // Check subdomain uniqueness
  const existing = await getTenantBySubdomain(input.subdomain);
  if (existing) throw new Error("SUBDOMAIN_TAKEN");

  // Check email uniqueness if provided
  if (input.email) {
    const { rows } = await query(
      `SELECT id FROM tenants WHERE email = $1 AND is_deleted = FALSE`,
      [input.email.toLowerCase().trim()]
    );
    if (rows.length > 0) throw new Error("EMAIL_TAKEN");
  }

  // Check license number uniqueness if provided
  if (input.licenseNumber) {
    const { rows } = await query(
      `SELECT id FROM tenants WHERE license_number = $1 AND is_deleted = FALSE`,
      [input.licenseNumber]
    );
    if (rows.length > 0) throw new Error("LICENSE_NUMBER_TAKEN");
  }

  const { rows } = await query<TenantRecord>(
    `INSERT INTO tenants (name, subdomain, status, plan, email, license_number)
     VALUES ($1, $2, 'active', $3, $4, $5)
     RETURNING id, name, subdomain, status, plan, email, license_number,
               created_at, updated_at, is_deleted`,
    [
      input.name.trim(),
      input.subdomain.toLowerCase().trim(),
      input.plan,
      input.email?.toLowerCase().trim() ?? null,
      input.licenseNumber ?? null,
    ]
  );
  return rows[0];
}

// ─── Update ────────────────────────────────────────────────────────────────

export interface UpdateTenantInput {
  name?: string;
  plan?: TenantRecord["plan"];
  email?: string;
  licenseNumber?: string;
}

export async function updateTenant(
  id: string,
  input: UpdateTenantInput
): Promise<TenantRecord> {
  const tenant = await getTenantById(id);
  if (!tenant) throw new Error("TENANT_NOT_FOUND");

  const { rows } = await query<TenantRecord>(
    `UPDATE tenants
     SET name = COALESCE($2, name),
         plan = COALESCE($3, plan),
         email = COALESCE($4, email),
         license_number = COALESCE($5, license_number),
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, name, subdomain, status, plan, email, license_number,
               created_at, updated_at, is_deleted`,
    [
      id,
      input.name?.trim() ?? null,
      input.plan ?? null,
      input.email?.toLowerCase().trim() ?? null,
      input.licenseNumber ?? null,
    ]
  );
  return rows[0];
}

export async function setTenantStatus(
  id: string,
  status: "active" | "suspended"
): Promise<TenantRecord> {
  const tenant = await getTenantById(id);
  if (!tenant) throw new Error("TENANT_NOT_FOUND");

  const { rows } = await query<TenantRecord>(
    `UPDATE tenants SET status = $2, updated_at = NOW() WHERE id = $1
     RETURNING id, name, subdomain, status, plan, email, license_number,
               created_at, updated_at, is_deleted`,
    [id, status]
  );
  return rows[0];
}

// ─── Soft Delete (cascades to branches, employees, users) ──────────────────

export async function deleteTenant(id: string, deletedBy: string): Promise<void> {
  const tenant = await getTenantById(id);
  if (!tenant) throw new Error("TENANT_NOT_FOUND");

  await withTransaction(async (client) => {
    const now = new Date().toISOString();

    // 1. Soft-delete all users belonging to this tenant
    await client.query(
      `UPDATE users SET is_deleted = TRUE, deleted_at = $2, deleted_by = $3,
                        status = 'deleted', updated_at = NOW()
       WHERE tenant_id = $1 AND is_deleted = FALSE`,
      [id, now, deletedBy]
    );

    // 2. Soft-delete all employees
    await client.query(
      `UPDATE employees SET is_deleted = TRUE, deleted_at = $2, deleted_by = $3, updated_at = NOW()
       WHERE tenant_id = $1 AND is_deleted = FALSE`,
      [id, now, deletedBy]
    );

    // 3. Soft-delete all branches
    await client.query(
      `UPDATE branches SET is_deleted = TRUE, deleted_at = $2, deleted_by = $3,
                           status = 'archived', updated_at = NOW()
       WHERE tenant_id = $1 AND is_deleted = FALSE`,
      [id, now, deletedBy]
    );

    // 4. Soft-delete the tenant itself
    await client.query(
      `UPDATE tenants SET is_deleted = TRUE, deleted_at = $2, deleted_by = $3,
                          status = 'suspended', updated_at = NOW()
       WHERE id = $1`,
      [id, now, deletedBy]
    );
  });
}

// ─── Stats (for SUPER_ADMIN dashboard) ────────────────────────────────────

export async function getTenantStats(tenantId: string): Promise<{
  branchCount: number;
  employeeCount: number;
  userCount: number;
}> {
  const { rows } = await query<{
    branch_count: string;
    employee_count: string;
    user_count: string;
  }>(
    `SELECT
       (SELECT COUNT(*) FROM branches  WHERE tenant_id=$1 AND is_deleted=FALSE) AS branch_count,
       (SELECT COUNT(*) FROM employees WHERE tenant_id=$1 AND is_deleted=FALSE) AS employee_count,
       (SELECT COUNT(*) FROM users     WHERE tenant_id=$1 AND is_deleted=FALSE) AS user_count`,
    [tenantId]
  );
  return {
    branchCount:   parseInt(rows[0].branch_count, 10),
    employeeCount: parseInt(rows[0].employee_count, 10),
    userCount:     parseInt(rows[0].user_count, 10),
  };
}

import { query, withTransaction } from "../db/pool.js";
import { hashPassword, validatePasswordStrength } from "../auth/auth.service.js";

export interface EmployeeRecord {
  id: string;
  user_id: string;
  tenant_id: string;
  branch_id: string;
  job_role: "NOTARY_OFFICER" | "RECEPTIONIST" | "BRANCH_ADMIN";
  status: "active" | "suspended" | "offline";
  assigned_counter: number | null;
  created_at: Date;
  updated_at: Date;
  is_deleted: boolean;
  // Joined from users table
  email: string;
  full_name: string;
  phone: string | null;
  user_status: string;
  last_login_at: Date | null;
}

// ─── Read ──────────────────────────────────────────────────────────────────

export async function getEmployeesByBranch(
  branchId: string,
  tenantId: string
): Promise<EmployeeRecord[]> {
  const { rows } = await query<EmployeeRecord>(
    `SELECT e.id, e.user_id, e.tenant_id, e.branch_id, e.job_role, e.status,
            e.assigned_counter, e.created_at, e.updated_at, e.is_deleted,
            u.email, u.full_name, u.phone, u.status AS user_status,
            u.last_login_at
     FROM employees e
     JOIN users u ON e.user_id = u.id
     WHERE e.branch_id = $1 AND e.tenant_id = $2 AND e.is_deleted = FALSE
     ORDER BY u.full_name ASC`,
    [branchId, tenantId]
  );
  return rows;
}

export async function getEmployeesByTenant(
  tenantId: string
): Promise<EmployeeRecord[]> {
  const { rows } = await query<EmployeeRecord>(
    `SELECT e.id, e.user_id, e.tenant_id, e.branch_id, e.job_role, e.status,
            e.assigned_counter, e.created_at, e.updated_at, e.is_deleted,
            u.email, u.full_name, u.phone, u.status AS user_status,
            u.last_login_at
     FROM employees e
     JOIN users u ON e.user_id = u.id
     WHERE e.tenant_id = $1 AND e.is_deleted = FALSE
     ORDER BY u.full_name ASC`,
    [tenantId]
  );
  return rows;
}

export async function getEmployeeById(
  employeeId: string,
  tenantId: string
): Promise<EmployeeRecord | null> {
  const { rows } = await query<EmployeeRecord>(
    `SELECT e.id, e.user_id, e.tenant_id, e.branch_id, e.job_role, e.status,
            e.assigned_counter, e.created_at, e.updated_at, e.is_deleted,
            u.email, u.full_name, u.phone, u.status AS user_status,
            u.last_login_at
     FROM employees e
     JOIN users u ON e.user_id = u.id
     WHERE e.id = $1 AND e.tenant_id = $2 AND e.is_deleted = FALSE`,
    [employeeId, tenantId]
  );
  return rows[0] ?? null;
}

// ─── Create ────────────────────────────────────────────────────────────────

export interface CreateEmployeeInput {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  jobRole: EmployeeRecord["job_role"];
  assignedCounter?: number;
}

export async function createEmployee(
  tenantId: string,
  branchId: string,
  input: CreateEmployeeInput,
  createdBy: string
): Promise<EmployeeRecord> {
  // Validate password strength
  const pwError = validatePasswordStrength(input.password);
  if (pwError) throw new Error(`WEAK_PASSWORD: ${pwError}`);

  // Check email uniqueness across ALL users
  const { rows: existingEmail } = await query(
    `SELECT id FROM users WHERE email = $1`,
    [input.email.toLowerCase().trim()]
  );
  if (existingEmail.length > 0) throw new Error("EMAIL_TAKEN");

  // Determine user role from job_role
  const userRole = input.jobRole === "BRANCH_ADMIN" ? "BRANCH_ADMIN" : "EMPLOYEE";
  const passwordHash = await hashPassword(input.password);

  return await withTransaction(async (client) => {
    // Create user account
    const { rows: userRows } = await client.query(
      `INSERT INTO users (email, password_hash, role, status, tenant_id, full_name, phone,
                          email_verified, email_verified_at)
       VALUES ($1, $2, $3, 'active', $4, $5, $6, TRUE, NOW())
       RETURNING id`,
      [
        input.email.toLowerCase().trim(),
        passwordHash,
        userRole,
        tenantId,
        input.fullName.trim(),
        input.phone ?? null,
      ]
    );
    const userId = userRows[0].id;

    // Create employee record
    const { rows: empRows } = await client.query<EmployeeRecord>(
      `INSERT INTO employees (user_id, tenant_id, branch_id, job_role, assigned_counter, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, user_id, tenant_id, branch_id, job_role, status,
                 assigned_counter, created_at, updated_at, is_deleted`,
      [userId, tenantId, branchId, input.jobRole, input.assignedCounter ?? null, createdBy]
    );

    return {
      ...empRows[0],
      email: input.email.toLowerCase().trim(),
      full_name: input.fullName.trim(),
      phone: input.phone ?? null,
      user_status: "active",
      last_login_at: null,
    };
  });
}

// ─── Update ────────────────────────────────────────────────────────────────

export interface UpdateEmployeeInput {
  fullName?: string;
  phone?: string;
  jobRole?: EmployeeRecord["job_role"];
  assignedCounter?: number;
  branchId?: string;
}

export async function updateEmployee(
  employeeId: string,
  tenantId: string,
  input: UpdateEmployeeInput
): Promise<EmployeeRecord> {
  const employee = await getEmployeeById(employeeId, tenantId);
  if (!employee) throw new Error("EMPLOYEE_NOT_FOUND");

  await withTransaction(async (client) => {
    // Update user profile
    if (input.fullName || input.phone !== undefined) {
      await client.query(
        `UPDATE users
         SET full_name  = COALESCE($2, full_name),
             phone      = COALESCE($3, phone),
             updated_at = NOW()
         WHERE id = $1`,
        [employee.user_id, input.fullName?.trim() ?? null, input.phone ?? null]
      );
    }

    // Update employee record
    if (input.jobRole || input.assignedCounter !== undefined || input.branchId) {
      const newUserRole =
        input.jobRole === "BRANCH_ADMIN" ? "BRANCH_ADMIN" :
        input.jobRole === "NOTARY_OFFICER" || input.jobRole === "RECEPTIONIST" ? "EMPLOYEE" :
        null;

      if (newUserRole) {
        await client.query(
          `UPDATE users SET role = $2, updated_at = NOW() WHERE id = $1`,
          [employee.user_id, newUserRole]
        );
      }

      await client.query(
        `UPDATE employees
         SET job_role         = COALESCE($3, job_role),
             assigned_counter = COALESCE($4, assigned_counter),
             branch_id        = COALESCE($5, branch_id),
             updated_at       = NOW()
         WHERE id = $1 AND tenant_id = $2`,
        [
          employeeId,
          tenantId,
          input.jobRole ?? null,
          input.assignedCounter ?? null,
          input.branchId ?? null,
        ]
      );
    }
  });

  return (await getEmployeeById(employeeId, tenantId))!;
}

// ─── Status management ─────────────────────────────────────────────────────

export async function setEmployeeStatus(
  employeeId: string,
  tenantId: string,
  status: "active" | "suspended" | "offline"
): Promise<EmployeeRecord> {
  const employee = await getEmployeeById(employeeId, tenantId);
  if (!employee) throw new Error("EMPLOYEE_NOT_FOUND");

  // Sync user account status
  const userStatus = status === "suspended" ? "suspended" : "active";
  await query(
    `UPDATE users SET status = $2, updated_at = NOW() WHERE id = $1`,
    [employee.user_id, userStatus]
  );

  await query(
    `UPDATE employees SET status = $2, updated_at = NOW() WHERE id = $1`,
    [employeeId, status]
  );

  return (await getEmployeeById(employeeId, tenantId))!;
}

// ─── Reset password ────────────────────────────────────────────────────────

export async function resetEmployeePassword(
  employeeId: string,
  tenantId: string,
  newPassword: string
): Promise<void> {
  const employee = await getEmployeeById(employeeId, tenantId);
  if (!employee) throw new Error("EMPLOYEE_NOT_FOUND");

  const pwError = validatePasswordStrength(newPassword);
  if (pwError) throw new Error(`WEAK_PASSWORD: ${pwError}`);

  const passwordHash = await hashPassword(newPassword);
  await query(
    `UPDATE users SET password_hash = $2, updated_at = NOW() WHERE id = $1`,
    [employee.user_id, passwordHash]
  );
}

// ─── Soft Delete ───────────────────────────────────────────────────────────

export async function deleteEmployee(
  employeeId: string,
  tenantId: string,
  deletedBy: string
): Promise<void> {
  const employee = await getEmployeeById(employeeId, tenantId);
  if (!employee) throw new Error("EMPLOYEE_NOT_FOUND");

  const now = new Date().toISOString();

  await withTransaction(async (client) => {
    // Deactivate user account
    await client.query(
      `UPDATE users SET status = 'suspended', updated_at = NOW() WHERE id = $1`,
      [employee.user_id]
    );
    // Soft-delete employee record
    await client.query(
      `UPDATE employees
       SET is_deleted = TRUE, deleted_at = $2, deleted_by = $3, status = 'offline', updated_at = NOW()
       WHERE id = $1`,
      [employeeId, now, deletedBy]
    );
  });
}

import { Router, type Request, type Response } from "express";
import { validationResult } from "express-validator";
import { requireAuth, requireRole, requireMinRole } from "../middleware/auth.middleware.js";
import {
  getAllTenants,
  getTenantById,
  createTenant,
  updateTenant,
  setTenantStatus,
  deleteTenant,
  getTenantStats,
} from "../services/tenant.service.js";
import {
  getBranchesByTenant,
  getBranchById,
  createBranch,
  updateBranch,
  deleteBranch,
} from "../services/branch.service.js";
import {
  getEmployeesByBranch,
  getEmployeesByTenant,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  setEmployeeStatus,
  resetEmployeePassword,
  deleteEmployee,
} from "../services/employee.service.js";
import { writeAuditLog } from "../auth/auth.service.js";
import {
  createTenantValidator,
  updateTenantValidator,
  createBranchValidator,
  updateBranchValidator,
  createEmployeeValidator,
  updateEmployeeValidator,
  resetEmployeePasswordValidator,
} from "../validators/tenant.validators.js";

const router = Router();

function validate(req: Request, res: Response): boolean {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ error: "VALIDATION_ERROR", details: errors.array() });
    return false;
  }
  return true;
}

function getIp(req: Request): string {
  return (
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket.remoteAddress || "unknown"
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TENANTS  —  /api/tenants
// SUPER_ADMIN only
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/tenants
router.get("/", requireAuth, requireRole("SUPER_ADMIN"), async (req: Request, res: Response) => {
  const tenants = await getAllTenants();

  // Attach stats to each tenant
  const withStats = await Promise.all(
    tenants.map(async (t) => ({
      ...t,
      stats: await getTenantStats(t.id),
    }))
  );

  res.json({ tenants: withStats });
});

// GET /api/tenants/:tenantId
router.get("/:tenantId", requireAuth, requireMinRole("COMPANY_ADMIN"), async (req: Request, res: Response) => {
  const { tenantId } = req.params;

  // COMPANY_ADMIN and below can only see their own tenant
  if (req.user!.role !== "SUPER_ADMIN" && req.user!.tenantId !== tenantId) {
    res.status(403).json({ error: "FORBIDDEN", message: "Access to this tenant is not permitted" });
    return;
  }

  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    res.status(404).json({ error: "NOT_FOUND", message: "Tenant not found" });
    return;
  }

  const stats = await getTenantStats(tenantId);
  res.json({ tenant: { ...tenant, stats } });
});

// POST /api/tenants
router.post("/", requireAuth, requireRole("SUPER_ADMIN"), createTenantValidator, async (req: Request, res: Response) => {
  if (!validate(req, res)) return;

  const { name, subdomain, plan, email, licenseNumber } = req.body;

  try {
    const tenant = await createTenant(
      { name, subdomain, plan, email, licenseNumber },
      req.user!.sub
    );

    await writeAuditLog({
      userId: req.user!.sub,
      action: "TENANT_CREATED",
      ipAddress: getIp(req),
      meta: { tenantId: tenant.id, subdomain: tenant.subdomain },
    });

    res.status(201).json({ message: "Tenant created successfully", tenant });
  } catch (err: any) {
    const known: Record<string, string> = {
      SUBDOMAIN_TAKEN: "This subdomain is already in use",
      EMAIL_TAKEN: "This email is already registered to another tenant",
      LICENSE_NUMBER_TAKEN: "This license number is already in use",
    };
    if (known[err.message]) {
      res.status(409).json({ error: err.message, message: known[err.message] });
    } else {
      console.error("[Tenants] Create error:", err.message);
      res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to create tenant" });
    }
  }
});

// PATCH /api/tenants/:tenantId
router.patch("/:tenantId", requireAuth, requireRole("SUPER_ADMIN"), updateTenantValidator, async (req: Request, res: Response) => {
  if (!validate(req, res)) return;

  const { tenantId } = req.params;
  const { name, plan, email, licenseNumber, status } = req.body;

  try {
    let tenant;
    if (status) {
      tenant = await setTenantStatus(tenantId, status);
    } else {
      tenant = await updateTenant(tenantId, { name, plan, email, licenseNumber });
    }

    await writeAuditLog({
      userId: req.user!.sub,
      action: "TENANT_UPDATED",
      ipAddress: getIp(req),
      meta: { tenantId },
    });

    res.json({ message: "Tenant updated", tenant });
  } catch (err: any) {
    if (err.message === "TENANT_NOT_FOUND") {
      res.status(404).json({ error: "NOT_FOUND", message: "Tenant not found" });
    } else {
      console.error("[Tenants] Update error:", err.message);
      res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to update tenant" });
    }
  }
});

// DELETE /api/tenants/:tenantId
router.delete("/:tenantId", requireAuth, requireRole("SUPER_ADMIN"), async (req: Request, res: Response) => {
  const { tenantId } = req.params;

  try {
    await deleteTenant(tenantId, req.user!.sub);

    await writeAuditLog({
      userId: req.user!.sub,
      action: "TENANT_DELETED",
      ipAddress: getIp(req),
      meta: { tenantId },
    });

    res.json({ message: "Tenant and all associated data soft-deleted" });
  } catch (err: any) {
    if (err.message === "TENANT_NOT_FOUND") {
      res.status(404).json({ error: "NOT_FOUND", message: "Tenant not found" });
    } else {
      console.error("[Tenants] Delete error:", err.message);
      res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to delete tenant" });
    }
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// BRANCHES  —  /api/tenants/:tenantId/branches
// SUPER_ADMIN: full access to any tenant
// COMPANY_ADMIN: own tenant only
// BRANCH_ADMIN: read own branch only
// ══════════════════════════════════════════════════════════════════════════════

// ─── Tenant scope guard ───────────────────────────────────────────────────
// All branch routes enforce: caller must own the tenant OR be SUPER_ADMIN
function enforceTenantScope(req: Request, res: Response): boolean {
  if (req.user!.role === "SUPER_ADMIN") return true;
  if (req.user!.tenantId !== req.params.tenantId) {
    res.status(403).json({
      error: "FORBIDDEN",
      message: "You cannot access another company's resources",
    });
    return false;
  }
  return true;
}

// GET /api/tenants/:tenantId/branches
router.get("/:tenantId/branches", requireAuth, requireMinRole("BRANCH_ADMIN"), async (req: Request, res: Response) => {
  if (!enforceTenantScope(req, res)) return;

  const branches = await getBranchesByTenant(req.params.tenantId);

  // BRANCH_ADMIN can only see their own branch
  if (req.user!.role === "BRANCH_ADMIN") {
    // branchId comes from the employee record — look it up
    const { rows } = await import("../db/pool.js").then(m =>
      m.query<{ branch_id: string }>(
        `SELECT branch_id FROM employees WHERE user_id = $1 AND is_deleted = FALSE`,
        [req.user!.sub]
      )
    );
    const myBranchId = rows[0]?.branch_id;
    const filtered = branches.filter(b => b.id === myBranchId);
    res.json({ branches: filtered });
    return;
  }

  res.json({ branches });
});

// GET /api/tenants/:tenantId/branches/:branchId
router.get("/:tenantId/branches/:branchId", requireAuth, requireMinRole("BRANCH_ADMIN"), async (req: Request, res: Response) => {
  if (!enforceTenantScope(req, res)) return;
  const { tenantId, branchId } = req.params;

  // BRANCH_ADMIN: verify this is their branch
  if (req.user!.role === "BRANCH_ADMIN") {
    const { rows } = await import("../db/pool.js").then(m =>
      m.query<{ branch_id: string }>(
        `SELECT branch_id FROM employees WHERE user_id = $1 AND is_deleted = FALSE`,
        [req.user!.sub]
      )
    );
    if (rows[0]?.branch_id !== branchId) {
      res.status(403).json({ error: "FORBIDDEN", message: "You can only access your own branch" });
      return;
    }
  }

  const branch = await getBranchById(branchId, tenantId);
  if (!branch) {
    res.status(404).json({ error: "NOT_FOUND", message: "Branch not found" });
    return;
  }

  res.json({ branch });
});

// POST /api/tenants/:tenantId/branches
router.post("/:tenantId/branches", requireAuth, requireMinRole("COMPANY_ADMIN"), createBranchValidator, async (req: Request, res: Response) => {
  if (!validate(req, res)) return;
  if (!enforceTenantScope(req, res)) return;

  const { tenantId } = req.params;
  const { name, address, phone, countersCount } = req.body;

  try {
    const branch = await createBranch(
      tenantId,
      { name, address, phone, countersCount },
      req.user!.sub
    );

    await writeAuditLog({
      userId: req.user!.sub,
      tenantId,
      action: "BRANCH_CREATED",
      ipAddress: getIp(req),
      meta: { branchId: branch.id, name: branch.name },
    });

    res.status(201).json({ message: "Branch created successfully", branch });
  } catch (err: any) {
    if (err.message === "BRANCH_NAME_TAKEN") {
      res.status(409).json({ error: "BRANCH_NAME_TAKEN", message: "A branch with this name already exists in this company" });
    } else {
      console.error("[Branches] Create error:", err.message);
      res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to create branch" });
    }
  }
});

// PATCH /api/tenants/:tenantId/branches/:branchId
router.patch("/:tenantId/branches/:branchId", requireAuth, requireMinRole("COMPANY_ADMIN"), updateBranchValidator, async (req: Request, res: Response) => {
  if (!validate(req, res)) return;
  if (!enforceTenantScope(req, res)) return;

  const { tenantId, branchId } = req.params;
  const { name, address, phone, countersCount, status } = req.body;

  try {
    const branch = await updateBranch(branchId, tenantId, { name, address, phone, countersCount, status });

    await writeAuditLog({
      userId: req.user!.sub,
      tenantId,
      action: "BRANCH_UPDATED",
      ipAddress: getIp(req),
      meta: { branchId },
    });

    res.json({ message: "Branch updated", branch });
  } catch (err: any) {
    if (err.message === "BRANCH_NOT_FOUND") {
      res.status(404).json({ error: "NOT_FOUND", message: "Branch not found" });
    } else if (err.message === "BRANCH_NAME_TAKEN") {
      res.status(409).json({ error: "BRANCH_NAME_TAKEN", message: "Branch name already in use" });
    } else {
      console.error("[Branches] Update error:", err.message);
      res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to update branch" });
    }
  }
});

// DELETE /api/tenants/:tenantId/branches/:branchId
router.delete("/:tenantId/branches/:branchId", requireAuth, requireMinRole("COMPANY_ADMIN"), async (req: Request, res: Response) => {
  if (!enforceTenantScope(req, res)) return;
  const { tenantId, branchId } = req.params;

  try {
    await deleteBranch(branchId, tenantId, req.user!.sub);

    await writeAuditLog({
      userId: req.user!.sub,
      tenantId,
      action: "BRANCH_DELETED",
      ipAddress: getIp(req),
      meta: { branchId },
    });

    res.json({ message: "Branch and associated employees soft-deleted" });
  } catch (err: any) {
    if (err.message === "BRANCH_NOT_FOUND") {
      res.status(404).json({ error: "NOT_FOUND", message: "Branch not found" });
    } else {
      console.error("[Branches] Delete error:", err.message);
      res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to delete branch" });
    }
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// EMPLOYEES  —  /api/tenants/:tenantId/branches/:branchId/employees
// SUPER_ADMIN: full access
// COMPANY_ADMIN: own tenant only
// BRANCH_ADMIN: own branch only (read + limited write)
// EMPLOYEE: cannot manage employees
// ══════════════════════════════════════════════════════════════════════════════

// ─── Branch scope guard ───────────────────────────────────────────────────
async function enforceBranchScope(req: Request, res: Response): Promise<boolean> {
  if (!enforceTenantScope(req, res)) return false;

  if (req.user!.role === "BRANCH_ADMIN") {
    const { rows } = await import("../db/pool.js").then(m =>
      m.query<{ branch_id: string }>(
        `SELECT branch_id FROM employees WHERE user_id = $1 AND is_deleted = FALSE`,
        [req.user!.sub]
      )
    );
    if (rows[0]?.branch_id !== req.params.branchId) {
      res.status(403).json({
        error: "FORBIDDEN",
        message: "You can only manage employees in your own branch",
      });
      return false;
    }
  }
  return true;
}

// GET /api/tenants/:tenantId/branches/:branchId/employees
router.get("/:tenantId/branches/:branchId/employees", requireAuth, requireMinRole("BRANCH_ADMIN"), async (req: Request, res: Response) => {
  if (!(await enforceBranchScope(req, res))) return;
  const { tenantId, branchId } = req.params;

  const employees = await getEmployeesByBranch(branchId, tenantId);
  res.json({ employees });
});

// GET /api/tenants/:tenantId/employees  (all employees across tenant — COMPANY_ADMIN+)
router.get("/:tenantId/employees", requireAuth, requireMinRole("COMPANY_ADMIN"), async (req: Request, res: Response) => {
  if (!enforceTenantScope(req, res)) return;
  const employees = await getEmployeesByTenant(req.params.tenantId);
  res.json({ employees });
});

// GET /api/tenants/:tenantId/branches/:branchId/employees/:employeeId
router.get("/:tenantId/branches/:branchId/employees/:employeeId", requireAuth, requireMinRole("BRANCH_ADMIN"), async (req: Request, res: Response) => {
  if (!(await enforceBranchScope(req, res))) return;
  const { tenantId, employeeId } = req.params;

  const employee = await getEmployeeById(employeeId, tenantId);
  if (!employee) {
    res.status(404).json({ error: "NOT_FOUND", message: "Employee not found" });
    return;
  }
  res.json({ employee });
});

// POST /api/tenants/:tenantId/branches/:branchId/employees
router.post("/:tenantId/branches/:branchId/employees", requireAuth, requireMinRole("COMPANY_ADMIN"), createEmployeeValidator, async (req: Request, res: Response) => {
  if (!validate(req, res)) return;
  if (!enforceTenantScope(req, res)) return;
  const { tenantId, branchId } = req.params;
  const { email, password, fullName, phone, jobRole, assignedCounter } = req.body;

  try {
    const employee = await createEmployee(
      tenantId,
      branchId,
      { email, password, fullName, phone, jobRole, assignedCounter },
      req.user!.sub
    );

    await writeAuditLog({
      userId: req.user!.sub,
      tenantId,
      action: "EMPLOYEE_CREATED",
      ipAddress: getIp(req),
      meta: { employeeId: employee.id, email },
    });

    res.status(201).json({ message: "Employee created successfully", employee });
  } catch (err: any) {
    if (err.message === "EMAIL_TAKEN") {
      res.status(409).json({ error: "EMAIL_TAKEN", message: "This email is already registered" });
    } else if (err.message?.startsWith("WEAK_PASSWORD")) {
      res.status(422).json({ error: "WEAK_PASSWORD", message: err.message.replace("WEAK_PASSWORD: ", "") });
    } else {
      console.error("[Employees] Create error:", err.message);
      res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to create employee" });
    }
  }
});

// PATCH /api/tenants/:tenantId/branches/:branchId/employees/:employeeId
router.patch("/:tenantId/branches/:branchId/employees/:employeeId", requireAuth, requireMinRole("COMPANY_ADMIN"), updateEmployeeValidator, async (req: Request, res: Response) => {
  if (!validate(req, res)) return;
  if (!enforceTenantScope(req, res)) return;
  const { tenantId, employeeId } = req.params;
  const { fullName, phone, jobRole, assignedCounter, branchId } = req.body;

  try {
    const employee = await updateEmployee(employeeId, tenantId, {
      fullName, phone, jobRole, assignedCounter, branchId,
    });

    await writeAuditLog({
      userId: req.user!.sub,
      tenantId,
      action: "EMPLOYEE_UPDATED",
      ipAddress: getIp(req),
      meta: { employeeId },
    });

    res.json({ message: "Employee updated", employee });
  } catch (err: any) {
    if (err.message === "EMPLOYEE_NOT_FOUND") {
      res.status(404).json({ error: "NOT_FOUND", message: "Employee not found" });
    } else {
      console.error("[Employees] Update error:", err.message);
      res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to update employee" });
    }
  }
});

// PATCH /api/tenants/:tenantId/branches/:branchId/employees/:employeeId/status
router.patch("/:tenantId/branches/:branchId/employees/:employeeId/status", requireAuth, requireMinRole("BRANCH_ADMIN"), async (req: Request, res: Response) => {
  if (!(await enforceBranchScope(req, res))) return;
  const { tenantId, employeeId } = req.params;
  const { status } = req.body;

  if (!["active", "suspended", "offline"].includes(status)) {
    res.status(422).json({ error: "VALIDATION_ERROR", message: "Status must be active, suspended, or offline" });
    return;
  }

  try {
    const employee = await setEmployeeStatus(employeeId, tenantId, status);

    await writeAuditLog({
      userId: req.user!.sub,
      tenantId,
      action: "EMPLOYEE_STATUS_CHANGED",
      ipAddress: getIp(req),
      meta: { employeeId, status },
    });

    res.json({ message: `Employee status set to ${status}`, employee });
  } catch (err: any) {
    res.status(404).json({ error: "NOT_FOUND", message: "Employee not found" });
  }
});

// POST /api/tenants/:tenantId/branches/:branchId/employees/:employeeId/reset-password
router.post("/:tenantId/branches/:branchId/employees/:employeeId/reset-password", requireAuth, requireMinRole("COMPANY_ADMIN"), resetEmployeePasswordValidator, async (req: Request, res: Response) => {
  if (!validate(req, res)) return;
  if (!enforceTenantScope(req, res)) return;
  const { tenantId, employeeId } = req.params;
  const { newPassword } = req.body;

  try {
    await resetEmployeePassword(employeeId, tenantId, newPassword);

    await writeAuditLog({
      userId: req.user!.sub,
      tenantId,
      action: "EMPLOYEE_PASSWORD_RESET",
      ipAddress: getIp(req),
      meta: { employeeId },
    });

    res.json({ message: "Employee password reset successfully" });
  } catch (err: any) {
    if (err.message === "EMPLOYEE_NOT_FOUND") {
      res.status(404).json({ error: "NOT_FOUND", message: "Employee not found" });
    } else if (err.message?.startsWith("WEAK_PASSWORD")) {
      res.status(422).json({ error: "WEAK_PASSWORD", message: err.message.replace("WEAK_PASSWORD: ", "") });
    } else {
      res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to reset password" });
    }
  }
});

// DELETE /api/tenants/:tenantId/branches/:branchId/employees/:employeeId
router.delete("/:tenantId/branches/:branchId/employees/:employeeId", requireAuth, requireMinRole("COMPANY_ADMIN"), async (req: Request, res: Response) => {
  if (!enforceTenantScope(req, res)) return;
  const { tenantId, employeeId } = req.params;

  try {
    await deleteEmployee(employeeId, tenantId, req.user!.sub);

    await writeAuditLog({
      userId: req.user!.sub,
      tenantId,
      action: "EMPLOYEE_DELETED",
      ipAddress: getIp(req),
      meta: { employeeId },
    });

    res.json({ message: "Employee soft-deleted successfully" });
  } catch (err: any) {
    if (err.message === "EMPLOYEE_NOT_FOUND") {
      res.status(404).json({ error: "NOT_FOUND", message: "Employee not found" });
    } else {
      console.error("[Employees] Delete error:", err.message);
      res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to delete employee" });
    }
  }
});

export default router;

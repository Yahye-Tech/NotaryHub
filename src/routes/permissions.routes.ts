import { Router, type Request, type Response } from "express";
import { body, validationResult } from "express-validator";
import { requireAuth, requireMinRole, requireRole } from "../middleware/auth.middleware.js";
import {
  getEffectivePermissionsMatrix,
  setPermission,
  clearTenantOverride,
  ALL_PERMISSION_KEYS,
  ALL_ROLES,
  type PermissionKey,
} from "../services/permissions.service.js";
import { writeAuditLog } from "../auth/auth.service.js";

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

const roleValidator = body("role").isIn(ALL_ROLES).withMessage("Invalid role");
const keyValidator = body("permissionKey").isIn(ALL_PERMISSION_KEYS).withMessage("Invalid permission key");
const allowedValidator = body("allowed").isBoolean().withMessage("allowed must be boolean");

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/permissions
// Returns the effective permissions matrix for the caller's own tenant
// (COMPANY_ADMIN+). SUPER_ADMIN without a tenant gets the platform defaults.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/", requireAuth, requireMinRole("COMPANY_ADMIN"), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.role === "SUPER_ADMIN" ? (req.query.tenantId as string) ?? null : req.user!.tenantId ?? null;
    const matrix = await getEffectivePermissionsMatrix(tenantId);
    res.json({ matrix, scope: tenantId ? "tenant" : "platform", tenantId });
  } catch (err: any) {
    console.error("[Permissions] Get matrix error:", err.message);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to load permissions" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/permissions
// Set a single permission cell for the caller's own tenant.
// COMPANY_ADMIN can only write tenant-scoped overrides for their own tenant.
// ─────────────────────────────────────────────────────────────────────────────
router.patch(
  "/",
  requireAuth,
  requireMinRole("COMPANY_ADMIN"),
  [roleValidator, keyValidator, allowedValidator],
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;

    const tenantId = req.user!.tenantId;
    if (req.user!.role !== "SUPER_ADMIN" && !tenantId) {
      res.status(400).json({ error: "NO_TENANT", message: "No tenant associated with your account" });
      return;
    }

    const { role, permissionKey, allowed } = req.body as {
      role: string;
      permissionKey: PermissionKey;
      allowed: boolean;
    };

    try {
      await setPermission({
        tenantId: tenantId!,
        role: role as any,
        key: permissionKey,
        allowed,
        updatedBy: req.user!.sub,
      });

      await writeAuditLog({
        userId: req.user!.sub,
        tenantId: tenantId!,
        action: "PERMISSION_UPDATED",
        ipAddress: getIp(req),
        meta: { role, permissionKey, allowed, scope: "tenant" },
      });

      const matrix = await getEffectivePermissionsMatrix(tenantId!);
      res.json({ message: "Permission updated", matrix });
    } catch (err: any) {
      if (err.message === "PERMISSION_LOCKED") {
        res.status(409).json({
          error: "PERMISSION_LOCKED",
          message: "This permission cannot be revoked",
        });
        return;
      }
      console.error("[Permissions] Set error:", err.message);
      res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to update permission" });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/permissions
// Clear a tenant override, reverting that cell to the platform default.
// ─────────────────────────────────────────────────────────────────────────────
router.delete(
  "/",
  requireAuth,
  requireMinRole("COMPANY_ADMIN"),
  async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    if (!tenantId) {
      res.status(400).json({ error: "NO_TENANT" });
      return;
    }

    const role = req.query.role as string;
    const permissionKey = req.query.permissionKey as PermissionKey;

    if (!ALL_ROLES.includes(role as any)) {
      res.status(422).json({ error: "VALIDATION_ERROR", message: "Invalid role" });
      return;
    }
    if (!ALL_PERMISSION_KEYS.includes(permissionKey)) {
      res.status(422).json({ error: "VALIDATION_ERROR", message: "Invalid permission key" });
      return;
    }

    try {
      await clearTenantOverride(tenantId, role as any, permissionKey);

      await writeAuditLog({
        userId: req.user!.sub,
        tenantId,
        action: "PERMISSION_RESET",
        ipAddress: getIp(req),
        meta: { role, permissionKey },
      });

      const matrix = await getEffectivePermissionsMatrix(tenantId);
      res.json({ message: "Permission reverted to platform default", matrix });
    } catch (err: any) {
      console.error("[Permissions] Clear error:", err.message);
      res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to reset permission" });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/permissions/platform
// SUPER_ADMIN-only: view the platform-wide default matrix.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/platform", requireAuth, requireRole("SUPER_ADMIN"), async (_req: Request, res: Response) => {
  try {
    const matrix = await getEffectivePermissionsMatrix(null);
    res.json({ matrix, scope: "platform" });
  } catch (err: any) {
    console.error("[Permissions] Get platform matrix error:", err.message);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to load platform permissions" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/permissions/platform
// SUPER_ADMIN-only: set a platform-wide default permission cell.
// ─────────────────────────────────────────────────────────────────────────────
router.patch(
  "/platform",
  requireAuth,
  requireRole("SUPER_ADMIN"),
  [roleValidator, keyValidator, allowedValidator],
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;

    const { role, permissionKey, allowed } = req.body as {
      role: string;
      permissionKey: PermissionKey;
      allowed: boolean;
    };

    try {
      await setPermission({
        tenantId: null,
        role: role as any,
        key: permissionKey,
        allowed,
        updatedBy: req.user!.sub,
      });

      await writeAuditLog({
        userId: req.user!.sub,
        action: "PERMISSION_UPDATED",
        ipAddress: getIp(req),
        meta: { role, permissionKey, allowed, scope: "platform" },
      });

      const matrix = await getEffectivePermissionsMatrix(null);
      res.json({ message: "Platform default updated", matrix });
    } catch (err: any) {
      if (err.message === "PERMISSION_LOCKED") {
        res.status(409).json({
          error: "PERMISSION_LOCKED",
          message: "This permission cannot be revoked",
        });
        return;
      }
      console.error("[Permissions] Set platform error:", err.message);
      res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to update platform default" });
    }
  }
);

export default router;

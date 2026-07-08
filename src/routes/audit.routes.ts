import { Router, type Request, type Response } from "express";
import { requireAuth, requireMinRole } from "../middleware/auth.middleware.js";
import { queryAuditLogs } from "../services/audit-query.service.js";

const router = Router();

// GET /api/audit-logs
router.get("/", requireAuth, requireMinRole("COMPANY_ADMIN"), async (req: Request, res: Response) => {
  const { action, resourceType, branchId, limit, offset } = req.query as Record<string, string>;

  let tenantId: string | undefined;
  if (req.user!.role === "SUPER_ADMIN") {
    tenantId = req.query.tenantId as string | undefined;
  } else {
    tenantId = req.user!.tenantId ?? undefined;
  }

  if (!tenantId && req.user!.role !== "SUPER_ADMIN") {
    res.status(400).json({ error: "NO_TENANT", message: "No tenant associated with this account" });
    return;
  }

  try {
    const result = await queryAuditLogs({
      tenantId,
      branchId,
      action,
      resourceType,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
    res.json(result);
  } catch (err: any) {
    console.error("[Audit] Query error:", err.message);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to load audit logs" });
  }
});

export default router;

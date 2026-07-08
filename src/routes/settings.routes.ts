import { Router, type Request, type Response } from "express";
import { body, validationResult } from "express-validator";
import { requireAuth, requireMinRole } from "../middleware/auth.middleware.js";
import { getCompanyProfile, updateCompanyProfile } from "../services/settings.service.js";
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

function resolveTenantId(req: Request): string | null {
  if (req.user!.role === "SUPER_ADMIN" && req.query.tenantId) {
    return req.query.tenantId as string;
  }
  return req.user!.tenantId ?? null;
}

// GET /api/settings
router.get("/", requireAuth, requireMinRole("COMPANY_ADMIN"), async (req: Request, res: Response) => {
  const tenantId = resolveTenantId(req);
  if (!tenantId) {
    res.status(400).json({ error: "NO_TENANT", message: "No tenant associated with this account" });
    return;
  }

  const profile = await getCompanyProfile(tenantId);
  if (!profile) {
    res.status(404).json({ error: "NOT_FOUND", message: "Company profile not found for this tenant" });
    return;
  }

  res.json({ profile });
});

// PATCH /api/settings
router.patch(
  "/",
  requireAuth,
  requireMinRole("COMPANY_ADMIN"),
  [
    body("primaryColor").optional().isString(),
    body("secondaryColor").optional().isString(),
    body("address").optional().isString(),
    body("city").optional().isString(),
    body("country").optional().isString(),
    body("contactName").optional().isString(),
    body("contactPhone").optional().isString(),
    body("contactEmail").optional().isEmail(),
    body("website").optional().isString(),
    body("timezone").optional().isString(),
    body("locale").optional().isString(),
    body("maxDailyAppointments").optional().isInt({ min: 1 }),
  ],
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;

    const tenantId = resolveTenantId(req);
    if (!tenantId) {
      res.status(400).json({ error: "NO_TENANT", message: "No tenant associated with this account" });
      return;
    }

    if (req.user!.role !== "SUPER_ADMIN" && req.user!.tenantId !== tenantId) {
      res.status(403).json({ error: "FORBIDDEN", message: "Cannot modify another tenant's settings" });
      return;
    }

    try {
      const profile = await updateCompanyProfile(tenantId, req.body);
      await writeAuditLog({
        userId: req.user!.sub,
        tenantId,
        action: "SETTINGS_UPDATED",
        meta: { fields: Object.keys(req.body) },
      });
      res.json({ message: "Settings updated", profile });
    } catch (err: any) {
      console.error("[Settings] Update error:", err.message);
      res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to update settings" });
    }
  }
);

export default router;

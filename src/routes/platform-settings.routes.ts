import { Router, type Request, type Response } from "express";
import { body, validationResult } from "express-validator";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { getPlatformSettings, setPlatformSettings, getPublicBranding } from "../services/platform-settings.service.js";
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

// GET /api/platform-settings/public — no auth required.
// Returns only platformName + brandingColor so the client shell can set
// <title> and the --brand-color CSS custom property before login. Must stay
// ahead of any auth middleware and must never leak the AI flags or audit
// fields that the full record below carries.
router.get("/public", async (_req: Request, res: Response) => {
  try {
    const branding = await getPublicBranding();
    res.json({ branding });
  } catch (err: any) {
    console.error("[PlatformSettings] Get public branding error:", err.message);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to load branding" });
  }
});

// GET /api/platform-settings — SUPER_ADMIN only
router.get("/", requireAuth, requireRole("SUPER_ADMIN"), async (_req: Request, res: Response) => {
  try {
    const settings = await getPlatformSettings();
    res.json({ settings });
  } catch (err: any) {
    console.error("[PlatformSettings] Get error:", err.message);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to load platform settings" });
  }
});

// PATCH /api/platform-settings — SUPER_ADMIN only
router.patch(
  "/",
  requireAuth,
  requireRole("SUPER_ADMIN"),
  [
    body("aiOcrEnabled").optional().isBoolean(),
    body("aiDocGenerationEnabled").optional().isBoolean(),
    body("platformName").optional().isString().trim().isLength({ min: 1, max: 60 }),
    body("brandingColor").optional().isString().matches(/^#[0-9a-fA-F]{6}$/),
    body("smtpHost").optional({ nullable: true }).isString().trim().isLength({ max: 255 }),
    body("smtpPort").optional({ nullable: true }).isInt({ min: 1, max: 65535 }),
    body("smtpUser").optional({ nullable: true }).isString().trim().isLength({ max: 255 }),
    body("smtpSecure").optional({ nullable: true }).isBoolean(),
  ],
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;
    try {
      const settings = await setPlatformSettings(
        {
          aiOcrEnabled: req.body.aiOcrEnabled,
          aiDocGenerationEnabled: req.body.aiDocGenerationEnabled,
          platformName: req.body.platformName,
          brandingColor: req.body.brandingColor,
          smtpHost: req.body.smtpHost,
          smtpPort: req.body.smtpPort === null ? null : (req.body.smtpPort === undefined ? undefined : Number(req.body.smtpPort)),
          smtpUser: req.body.smtpUser,
          smtpSecure: req.body.smtpSecure === null ? null : (req.body.smtpSecure === undefined ? undefined : req.body.smtpSecure === true || req.body.smtpSecure === "true"),
        },
        req.user!.sub
      );

      await writeAuditLog({
        userId: req.user!.sub,
        action: "PLATFORM_SETTINGS_UPDATED",
        ipAddress: getIp(req),
        meta: req.body,
      });

      res.json({ message: "Platform settings updated", settings });
    } catch (err: any) {
      if (err.code === "VALIDATION_ERROR") {
        res.status(422).json({ error: "VALIDATION_ERROR", message: err.message });
        return;
      }
      console.error("[PlatformSettings] Set error:", err.message);
      res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to update platform settings" });
    }
  }
);

export default router;

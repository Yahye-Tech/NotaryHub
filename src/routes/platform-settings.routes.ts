import { Router, type Request, type Response } from "express";
import { body, validationResult } from "express-validator";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { getPlatformSettings, setPlatformSettings } from "../services/platform-settings.service.js";
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
  ],
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;
    try {
      const settings = await setPlatformSettings(
        {
          aiOcrEnabled: req.body.aiOcrEnabled,
          aiDocGenerationEnabled: req.body.aiDocGenerationEnabled,
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
      console.error("[PlatformSettings] Set error:", err.message);
      res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to update platform settings" });
    }
  }
);

export default router;

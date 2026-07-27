import { Router, type Request, type Response } from "express";
import { param } from "express-validator";
import { validationResult } from "express-validator";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  getNotificationsForUser,
  markNotificationRead,
  markAllNotificationsRead,
} from "../services/notification.service.js";

const router = Router();

function validate(req: Request, res: Response): boolean {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ error: "VALIDATION_ERROR", details: errors.array() });
    return false;
  }
  return true;
}

// GET /api/notifications
router.get("/", requireAuth, async (req: Request, res: Response) => {
  const { limit, offset, unreadOnly } = req.query as Record<string, string>;
  try {
    const result = await getNotificationsForUser(req.user!.sub, {
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
      unreadOnly: unreadOnly === "true",
    });
    res.json(result);
  } catch (err: any) {
    console.error("[Notifications] List error:", err.message);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to load notifications" });
  }
});

// PATCH /api/notifications/:id/read
router.patch("/:id/read", requireAuth, [param("id").isUUID()], async (req: Request, res: Response) => {
  if (!validate(req, res)) return;
  try {
    const updated = await markNotificationRead(req.params.id, req.user!.sub);
    if (!updated) {
      res.status(404).json({ error: "NOT_FOUND", message: "Notification not found" });
      return;
    }
    res.json({ notification: updated });
  } catch (err: any) {
    console.error("[Notifications] Mark read error:", err.message);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to update notification" });
  }
});

// POST /api/notifications/read-all
router.post("/read-all", requireAuth, async (req: Request, res: Response) => {
  try {
    const count = await markAllNotificationsRead(req.user!.sub);
    res.json({ message: "All notifications marked read", count });
  } catch (err: any) {
    console.error("[Notifications] Mark all read error:", err.message);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to update notifications" });
  }
});

export default router;

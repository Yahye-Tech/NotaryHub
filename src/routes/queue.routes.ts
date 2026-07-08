import { Router, type Request, type Response } from "express";
import { body, param, query as queryParam, validationResult } from "express-validator";
import { requireAuth, requireMinRole } from "../middleware/auth.middleware.js";
import {
  checkInCustomer,
  getQueueForBranch,
  getTicketById,
  callNextTicket,
  markServing,
  completeTicket,
  skipTicket,
  recallTicket,
  cancelTicket,
  getQueueStats,
  getQueueForTenant,
} from "../services/queue.service.js";
import { writeAuditLog } from "../auth/auth.service.js";
import { query as dbQuery } from "../db/pool.js";

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

// ─── Resolve the caller's own branch (for EMPLOYEE / BRANCH_ADMIN) ─────────────
async function resolveOwnBranch(userId: string): Promise<string | null> {
  const { rows } = await dbQuery<{ branch_id: string }>(
    `SELECT branch_id FROM employees WHERE user_id = $1 AND is_deleted = FALSE`,
    [userId]
  );
  return rows[0]?.branch_id ?? null;
}

// Determines the effective branchId for a request: explicit param/query wins
// for COMPANY_ADMIN+, otherwise falls back to the employee's own branch.
async function resolveBranchId(req: Request): Promise<string | null> {
  const explicit = (req.params.branchId || req.query.branchId) as string | undefined;
  // COMPANY_ADMIN and SUPER_ADMIN may not have an employee row — they pass branchId explicitly
  // or receive a full tenant-wide list (branchId = null means all branches)
  if (["COMPANY_ADMIN", "SUPER_ADMIN"].includes(req.user!.role)) {
    return explicit ?? null;
  }
  // BRANCH_ADMIN and EMPLOYEE resolve from their employee record
  return explicit ?? resolveOwnBranch(req.user!.sub);
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/queue?branchId=&date=
// List today's queue for a branch
// ─────────────────────────────────────────────────────────────────────────────
router.get("/", requireAuth, requireMinRole("EMPLOYEE"), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) {
    res.status(400).json({ error: "NO_TENANT" });
    return;
  }

  const branchId = await resolveBranchId(req);

  // EMPLOYEE / BRANCH_ADMIN must have a branch assignment
  if (!branchId && !["COMPANY_ADMIN", "SUPER_ADMIN"].includes(req.user!.role)) {
    res.status(400).json({ error: "NO_BRANCH", message: "No branch associated with this account" });
    return;
  }

  try {
    if (branchId) {
      const tickets = await getQueueForBranch(branchId, tenantId, req.query.date as string | undefined);
      const stats = await getQueueStats(branchId, tenantId);
      res.json({ tickets, stats });
    } else {
      // COMPANY_ADMIN / SUPER_ADMIN without explicit branchId — return all branches
      const allTickets = await getQueueForTenant(tenantId, req.query.date as string | undefined);
      res.json({ tickets: allTickets, stats: null });
    }
  } catch (err: any) {
    console.error("[Queue] List error:", err.message);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to load queue" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/queue/check-in
// Issue a new ticket — real sequential numbering per branch per day
// ─────────────────────────────────────────────────────────────────────────────
router.post("/check-in", requireAuth, requireMinRole("EMPLOYEE"), [
  body("customerName").isString().trim().isLength({ min: 2, max: 120 }).withMessage("Customer name required"),
  body("serviceType").isString().trim().isLength({ min: 2, max: 120 }).withMessage("Service type required"),
  body("customerId").optional().isUUID(),
  body("branchId").optional().isUUID(),
], async (req: Request, res: Response) => {
  if (!validate(req, res)) return;

  const tenantId = req.user!.tenantId;
  if (!tenantId) {
    res.status(400).json({ error: "NO_TENANT" });
    return;
  }

  const branchId = req.body.branchId
    ? req.body.branchId
    : await resolveOwnBranch(req.user!.sub);

  if (!branchId) {
    res.status(400).json({ error: "NO_BRANCH", message: "No branch associated with this account" });
    return;
  }

  try {
    const ticket = await checkInCustomer({
      tenantId,
      branchId,
      customerName: req.body.customerName,
      serviceType: req.body.serviceType,
      customerId: req.body.customerId,
    });

    await writeAuditLog({
      userId: req.user!.sub,
      tenantId,
      action: "QUEUE_CHECK_IN",
      ipAddress: getIp(req),
      meta: { ticketId: ticket.id, ticketNumber: ticket.ticket_number },
    });

    res.status(201).json({ message: "Customer checked in", ticket });
  } catch (err: any) {
    console.error("[Queue] Check-in error:", err.message);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to check in customer" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/queue/call-next
// Calls the oldest waiting ticket to the caller's real assigned counter
// ─────────────────────────────────────────────────────────────────────────────
router.post("/call-next", requireAuth, requireMinRole("EMPLOYEE"), [
  body("branchId").optional().isUUID(),
  body("counter").optional().isInt({ min: 1, max: 100 }),
], async (req: Request, res: Response) => {
  if (!validate(req, res)) return;

  const tenantId = req.user!.tenantId;
  if (!tenantId) {
    res.status(400).json({ error: "NO_TENANT" });
    return;
  }

  const branchId = req.body.branchId
    ? req.body.branchId
    : await resolveOwnBranch(req.user!.sub);

  if (!branchId) {
    res.status(400).json({ error: "NO_BRANCH" });
    return;
  }

  try {
    const ticket = await callNextTicket(branchId, tenantId, req.user!.sub, req.body.counter);

    await writeAuditLog({
      userId: req.user!.sub,
      tenantId,
      action: "QUEUE_TICKET_CALLED",
      ipAddress: getIp(req),
      meta: { ticketId: ticket.id, ticketNumber: ticket.ticket_number, counter: ticket.called_counter },
    });

    res.json({ message: `Calling ${ticket.ticket_number} to counter ${ticket.called_counter}`, ticket });
  } catch (err: any) {
    const known: Record<string, [number, string]> = {
      NO_COUNTER_ASSIGNED: [400, "You have no counter assigned. Ask your branch admin to set one, or specify a counter explicitly."],
      NO_WAITING_TICKETS:  [404, "No customers waiting in the queue."],
    };
    const [status, message] = known[err.message] ?? [500, "Failed to call next ticket"];
    res.status(status).json({ error: err.message, message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/queue/:id/serving
// ─────────────────────────────────────────────────────────────────────────────
router.post("/:id/serving", requireAuth, requireMinRole("EMPLOYEE"), [
  param("id").isUUID(),
], async (req: Request, res: Response) => {
  if (!validate(req, res)) return;
  const tenantId = req.user!.tenantId;
  if (!tenantId) { res.status(400).json({ error: "NO_TENANT" }); return; }

  try {
    const ticket = await markServing(req.params.id, tenantId);
    res.json({ message: "Now serving", ticket });
  } catch (err: any) {
    res.status(409).json({ error: "INVALID_TRANSITION", message: "Ticket must be in 'calling' status" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/queue/:id/complete
// ─────────────────────────────────────────────────────────────────────────────
router.post("/:id/complete", requireAuth, requireMinRole("EMPLOYEE"), [
  param("id").isUUID(),
  body("documentId").optional().isUUID(),
], async (req: Request, res: Response) => {
  if (!validate(req, res)) return;
  const tenantId = req.user!.tenantId;
  if (!tenantId) { res.status(400).json({ error: "NO_TENANT" }); return; }

  try {
    const ticket = await completeTicket(req.params.id, tenantId, req.body.documentId);

    await writeAuditLog({
      userId: req.user!.sub,
      tenantId,
      action: "QUEUE_TICKET_COMPLETED",
      ipAddress: getIp(req),
      meta: { ticketId: ticket.id, ticketNumber: ticket.ticket_number },
    });

    res.json({ message: "Ticket completed", ticket });
  } catch (err: any) {
    res.status(409).json({ error: "INVALID_TRANSITION", message: "Ticket must be in 'calling' or 'serving' status" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/queue/:id/skip
// ─────────────────────────────────────────────────────────────────────────────
router.post("/:id/skip", requireAuth, requireMinRole("EMPLOYEE"), [
  param("id").isUUID(),
], async (req: Request, res: Response) => {
  if (!validate(req, res)) return;
  const tenantId = req.user!.tenantId;
  if (!tenantId) { res.status(400).json({ error: "NO_TENANT" }); return; }

  try {
    const ticket = await skipTicket(req.params.id, tenantId);
    res.json({ message: "Ticket skipped", ticket });
  } catch (err: any) {
    res.status(409).json({ error: "INVALID_TRANSITION", message: "Ticket must be 'waiting' or 'calling' to skip" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/queue/:id/recall
// ─────────────────────────────────────────────────────────────────────────────
router.post("/:id/recall", requireAuth, requireMinRole("EMPLOYEE"), [
  param("id").isUUID(),
], async (req: Request, res: Response) => {
  if (!validate(req, res)) return;
  const tenantId = req.user!.tenantId;
  if (!tenantId) { res.status(400).json({ error: "NO_TENANT" }); return; }

  try {
    const ticket = await recallTicket(req.params.id, tenantId);
    res.json({ message: "Ticket recalled to waiting", ticket });
  } catch (err: any) {
    res.status(409).json({ error: "INVALID_TRANSITION", message: "Only a 'passed' ticket can be recalled" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/queue/:id/cancel
// ─────────────────────────────────────────────────────────────────────────────
router.post("/:id/cancel", requireAuth, requireMinRole("EMPLOYEE"), [
  param("id").isUUID(),
], async (req: Request, res: Response) => {
  if (!validate(req, res)) return;
  const tenantId = req.user!.tenantId;
  if (!tenantId) { res.status(400).json({ error: "NO_TENANT" }); return; }

  try {
    const ticket = await cancelTicket(req.params.id, tenantId);
    res.json({ message: "Ticket cancelled", ticket });
  } catch (err: any) {
    res.status(409).json({ error: "INVALID_TRANSITION", message: "Cannot cancel a completed or already-cancelled ticket" });
  }
});

export default router;

import { Router, type Request, type Response } from "express";
import { body, param, query as queryParam } from "express-validator";
import { validationResult } from "express-validator";
import { requireAuth, requireMinRole } from "../middleware/auth.middleware.js";
import {
  getAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  transitionAppointmentStatus,
  deleteAppointment,
  parseAppointmentDateTime,
  fromUiStatus,
  type AppointmentStatus,
} from "../services/appointment.service.js";
import { writeAuditLog } from "../auth/auth.service.js";
import { query } from "../db/pool.js";

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

async function getEmployeeBranchId(userId: string): Promise<string | null> {
  const { rows } = await query<{ branch_id: string }>(
    `SELECT branch_id FROM employees WHERE user_id = $1 AND is_deleted = FALSE`,
    [userId]
  );
  return rows[0]?.branch_id ?? null;
}

// GET /api/appointments
router.get("/", requireAuth, requireMinRole("CUSTOMER"), async (req: Request, res: Response) => {
  const { status, branchId, from, to, limit, offset } = req.query as Record<string, string>;

  try {
    if (req.user!.role === "SUPER_ADMIN") {
      res.status(400).json({ error: "NO_TENANT", message: "Super admin must use tenant-scoped tools" });
      return;
    }

    const tenantId = req.user!.tenantId;
    if (!tenantId) {
      res.status(400).json({ error: "NO_TENANT", message: "No tenant associated with this account" });
      return;
    }

    let scopedBranchId = branchId;
    if (req.user!.role === "EMPLOYEE" || req.user!.role === "BRANCH_ADMIN") {
      scopedBranchId = (await getEmployeeBranchId(req.user!.sub)) ?? undefined;
    }

    const filters: Parameters<typeof getAppointments>[0] = {
      tenantId,
      branchId: scopedBranchId,
      status: status ? fromUiStatus(status) as AppointmentStatus : undefined,
      from,
      to,
      limit: limit ? parseInt(limit, 10) : 100,
      offset: offset ? parseInt(offset, 10) : 0,
    };

    if (req.user!.role === "CUSTOMER") {
      filters.customerUserId = req.user!.sub;
      filters.customerEmail = req.user!.email;
      delete filters.branchId;
    }

    const result = await getAppointments(filters);
    res.json(result);
  } catch (err: any) {
    console.error("[Appointments] List error:", err.message);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to load appointments" });
  }
});

// GET /api/appointments/:id
router.get("/:id", requireAuth, requireMinRole("CUSTOMER"),
  [param("id").isUUID()],
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;

    const tenantId = req.user!.tenantId;
    if (!tenantId) {
      res.status(400).json({ error: "NO_TENANT" });
      return;
    }

    const appointment = await getAppointmentById(req.params.id, tenantId);
    if (!appointment) {
      res.status(404).json({ error: "NOT_FOUND", message: "Appointment not found" });
      return;
    }

    if (req.user!.role === "CUSTOMER") {
      const { rows } = await query<{ id: string }>(
        `SELECT id FROM customers
         WHERE tenant_id = $1 AND is_deleted = FALSE
           AND (user_id = $2 OR email ILIKE $3)
           AND id = $4`,
        [tenantId, req.user!.sub, req.user!.email, appointment.customer_id]
      );
      const emailMatch = appointment.customer_email?.toLowerCase() === req.user!.email.toLowerCase();
      if (rows.length === 0 && !emailMatch) {
        res.status(403).json({ error: "FORBIDDEN", message: "You cannot view this appointment" });
        return;
      }
    }

    res.json({ appointment });
  }
);

// POST /api/appointments
router.post("/", requireAuth, requireMinRole("CUSTOMER"), [
  body("branchId").isUUID(),
  body("customerName").isString().trim().notEmpty(),
  body("serviceType").isString().trim().notEmpty(),
  body("startTime").optional().isISO8601(),
  body("appointmentDate").optional().isString(),
  body("appointmentTime").optional().isString(),
  body("customerEmail").optional().isEmail(),
  body("customerId").optional().isUUID(),
  body("notes").optional().isString(),
], async (req: Request, res: Response) => {
  if (!validate(req, res)) return;

  const tenantId = req.user!.tenantId;
  if (!tenantId) {
    res.status(400).json({ error: "NO_TENANT" });
    return;
  }

  try {
    let startTime = req.body.startTime as string | undefined;
    if (!startTime && req.body.appointmentDate) {
      startTime = parseAppointmentDateTime(req.body.appointmentDate, req.body.appointmentTime);
    }
    if (!startTime) {
      res.status(422).json({ error: "VALIDATION_ERROR", message: "startTime or appointmentDate is required" });
      return;
    }

    const appointment = await createAppointment({
      tenantId,
      branchId: req.body.branchId,
      customerName: req.body.customerName,
      customerEmail: req.body.customerEmail ?? req.user!.email,
      customerId: req.body.customerId,
      serviceType: req.body.serviceType,
      startTime,
      endTime: req.body.endTime,
      notes: req.body.notes,
      bookedBy: req.user!.sub,
    });

    await writeAuditLog({
      userId: req.user!.sub,
      tenantId,
      action: "APPOINTMENT_CREATED",
      meta: { appointmentId: appointment.id, branchId: appointment.branch_id },
    });

    res.status(201).json({ message: "Appointment created", appointment });
  } catch (err: any) {
    if (err.message === "INVALID_START_TIME") {
      res.status(422).json({ error: "INVALID_START_TIME", message: "Invalid appointment date or time" });
      return;
    }
    if (err.message === "CUSTOMER_EMAIL_TAKEN") {
      res.status(409).json({ error: "CUSTOMER_EMAIL_TAKEN", message: "Customer email conflict" });
      return;
    }
    console.error("[Appointments] Create error:", err.message);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to create appointment" });
  }
});

// PATCH /api/appointments/:id
router.patch("/:id", requireAuth, requireMinRole("EMPLOYEE"), [
  param("id").isUUID(),
  body("serviceType").optional().isString(),
  body("startTime").optional().isISO8601(),
  body("appointmentDate").optional().isString(),
  body("appointmentTime").optional().isString(),
  body("endTime").optional().isISO8601(),
  body("notes").optional().isString(),
  body("assignedEmployeeId").optional({ nullable: true }).isUUID(),
], async (req: Request, res: Response) => {
  if (!validate(req, res)) return;

  const tenantId = req.user!.tenantId;
  if (!tenantId) {
    res.status(400).json({ error: "NO_TENANT" });
    return;
  }

  try {
    let startTime = req.body.startTime as string | undefined;
    if (!startTime && req.body.appointmentDate) {
      startTime = parseAppointmentDateTime(req.body.appointmentDate, req.body.appointmentTime);
    }

    const appointment = await updateAppointment(req.params.id, tenantId, {
      serviceType: req.body.serviceType,
      startTime,
      endTime: req.body.endTime,
      notes: req.body.notes,
      assignedEmployeeId: req.body.assignedEmployeeId,
    });
    res.json({ message: "Appointment updated", appointment });
  } catch (err: any) {
    if (err.message === "INVALID_START_TIME") {
      res.status(422).json({ error: "INVALID_START_TIME", message: "Invalid appointment date or time" });
      return;
    }
    if (err.message === "APPOINTMENT_NOT_FOUND") {
      res.status(404).json({ error: "NOT_FOUND", message: "Appointment not found" });
      return;
    }
    if (err.message === "APPOINTMENT_NOT_EDITABLE") {
      res.status(409).json({ error: "NOT_EDITABLE", message: "Appointment cannot be edited in its current status" });
      return;
    }
    console.error("[Appointments] Update error:", err.message);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to update appointment" });
  }
});

// POST /api/appointments/:id/transition
router.post("/:id/transition", requireAuth, requireMinRole("CUSTOMER"), [
  param("id").isUUID(),
  body("status").isString().notEmpty(),
], async (req: Request, res: Response) => {
  if (!validate(req, res)) return;

  const tenantId = req.user!.tenantId;
  if (!tenantId) {
    res.status(400).json({ error: "NO_TENANT" });
    return;
  }

  const uiStatus = req.body.status as string;
  let newStatus = fromUiStatus(uiStatus);
  if (uiStatus === "completed" && req.body.action === "check_in") {
    newStatus = "checked_in";
  }
  if (uiStatus === "completed") {
    newStatus = "completed";
  }

  if (req.user!.role === "CUSTOMER" && newStatus !== "cancelled") {
    res.status(403).json({ error: "FORBIDDEN", message: "Customers may only cancel their own appointments" });
    return;
  }

  try {
    if (req.user!.role === "CUSTOMER") {
      const existing = await getAppointmentById(req.params.id, tenantId);
      if (!existing) {
        res.status(404).json({ error: "NOT_FOUND", message: "Appointment not found" });
        return;
      }
      const { rows } = await query<{ id: string }>(
        `SELECT id FROM customers
         WHERE tenant_id = $1 AND is_deleted = FALSE
           AND (user_id = $2 OR email ILIKE $3)
           AND id = $4`,
        [tenantId, req.user!.sub, req.user!.email, existing.customer_id]
      );
      const emailMatch = existing.customer_email?.toLowerCase() === req.user!.email.toLowerCase();
      if (rows.length === 0 && !emailMatch) {
        res.status(403).json({ error: "FORBIDDEN", message: "You cannot modify this appointment" });
        return;
      }
    }

    const appointment = await transitionAppointmentStatus(
      req.params.id,
      tenantId,
      newStatus
    );

    await writeAuditLog({
      userId: req.user!.sub,
      tenantId,
      action: "APPOINTMENT_STATUS_CHANGED",
      meta: { appointmentId: appointment.id, status: appointment.status },
    });

    res.json({ message: "Status updated", appointment });
  } catch (err: any) {
    if (err.message === "APPOINTMENT_NOT_FOUND") {
      res.status(404).json({ error: "NOT_FOUND", message: "Appointment not found" });
      return;
    }
    if (err.message.startsWith("INVALID_TRANSITION")) {
      res.status(409).json({ error: "INVALID_TRANSITION", message: err.message });
      return;
    }
    console.error("[Appointments] Transition error:", err.message);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to update status" });
  }
});

// DELETE /api/appointments/:id
router.delete("/:id", requireAuth, requireMinRole("BRANCH_ADMIN"), [
  param("id").isUUID(),
], async (req: Request, res: Response) => {
  if (!validate(req, res)) return;

  const tenantId = req.user!.tenantId;
  if (!tenantId) {
    res.status(400).json({ error: "NO_TENANT" });
    return;
  }

  try {
    await deleteAppointment(req.params.id, tenantId, req.user!.sub);
    res.json({ message: "Appointment deleted" });
  } catch (err: any) {
    if (err.message === "APPOINTMENT_NOT_FOUND") {
      res.status(404).json({ error: "NOT_FOUND", message: "Appointment not found" });
      return;
    }
    console.error("[Appointments] Delete error:", err.message);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to delete appointment" });
  }
});

export default router;

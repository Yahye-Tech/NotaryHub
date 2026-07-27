import { query } from "../db/pool.js";
import { createCustomer, getCustomersByTenant } from "./customer.service.js";

export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "checked_in"
  | "completed"
  | "cancelled"
  | "no_show";

export interface AppointmentRecord {
  id: string;
  tenant_id: string;
  branch_id: string;
  customer_id: string | null;
  customer_name: string;
  customer_email: string | null;
  service_type: string;
  start_time: string;
  end_time: string | null;
  status: AppointmentStatus;
  notes: string | null;
  assigned_employee_id: string | null;
  booked_by: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  branch_name?: string | null;
}

const ALLOWED_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  scheduled:  ["confirmed", "checked_in", "cancelled", "no_show"],
  confirmed:  ["checked_in", "cancelled", "no_show"],
  checked_in: ["completed", "cancelled"],
  completed:  [],
  cancelled:  [],
  no_show:    [],
};

export interface CreateAppointmentInput {
  tenantId: string;
  branchId: string;
  customerName: string;
  customerEmail?: string;
  customerId?: string;
  serviceType: string;
  startTime: string;
  endTime?: string;
  notes?: string;
  bookedBy?: string;
  bookedByRole?: string;
  assignedEmployeeId?: string;
}

export interface ListAppointmentsFilters {
  tenantId: string;
  branchId?: string;
  customerId?: string;
  customerUserId?: string;
  customerEmail?: string;
  status?: AppointmentStatus;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

async function resolveCustomerId(
  tenantId: string,
  input: { customerId?: string; customerName: string; customerEmail?: string; bookedBy?: string; bookedByRole?: string }
): Promise<string | null> {
  if (input.customerId) return input.customerId;

  const linkUserId = input.bookedByRole === "CUSTOMER" ? input.bookedBy : undefined;

  if (input.customerEmail) {
    const { rows } = await query<{ id: string; user_id: string | null }>(
      `SELECT id, user_id FROM customers
       WHERE tenant_id = $1 AND email = $2 AND is_deleted = FALSE
       LIMIT 1`,
      [tenantId, input.customerEmail.toLowerCase().trim()]
    );
    if (rows[0]) {
      // Backfill the portal-login link if we now know it and didn't before
      if (linkUserId && !rows[0].user_id) {
        await query(`UPDATE customers SET user_id = $1 WHERE id = $2`, [linkUserId, rows[0].id]);
      }
      return rows[0].id;
    }
  }

  const customer = await createCustomer(
    tenantId,
    {
      fullName: input.customerName.trim(),
      email: input.customerEmail?.trim(),
      userId: linkUserId,
    },
    input.bookedBy!
  );
  return customer.id;
}

export async function getAppointments(
  filters: ListAppointmentsFilters
): Promise<{ appointments: AppointmentRecord[]; total: number }> {
  const conditions = ["a.tenant_id = $1", "a.is_deleted = FALSE"];
  const params: unknown[] = [filters.tenantId];
  let p = 2;

  if (filters.branchId) {
    conditions.push(`a.branch_id = $${p++}`);
    params.push(filters.branchId);
  }
  if (filters.customerId) {
    conditions.push(`a.customer_id = $${p++}`);
    params.push(filters.customerId);
  }
  if (filters.customerUserId) {
    conditions.push(`EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = a.customer_id AND c.user_id = $${p} AND c.is_deleted = FALSE
    )`);
    params.push(filters.customerUserId);
    p++;
  }
  if (filters.customerEmail) {
    conditions.push(`(a.customer_email ILIKE $${p} OR EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = a.customer_id AND c.email ILIKE $${p} AND c.is_deleted = FALSE
    ))`);
    params.push(filters.customerEmail);
    p++;
  }
  if (filters.status) {
    conditions.push(`a.status = $${p++}`);
    params.push(filters.status);
  }
  if (filters.from) {
    conditions.push(`a.start_time >= $${p++}`);
    params.push(filters.from);
  }
  if (filters.to) {
    conditions.push(`a.start_time <= $${p++}`);
    params.push(filters.to);
  }

  const where = conditions.join(" AND ");
  const limit = Math.min(filters.limit ?? 100, 200);
  const offset = filters.offset ?? 0;

  const { rows } = await query<AppointmentRecord>(
    `SELECT a.*, b.name AS branch_name
     FROM appointments a
     LEFT JOIN branches b ON b.id = a.branch_id
     WHERE ${where}
     ORDER BY a.start_time ASC
     LIMIT $${p} OFFSET $${p + 1}`,
    [...params, limit, offset]
  );

  const { rows: countRows } = await query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM appointments a WHERE ${where}`,
    params
  );

  return {
    appointments: rows,
    total: parseInt(countRows[0]?.count ?? "0", 10),
  };
}

export async function getAppointmentById(
  appointmentId: string,
  tenantId: string
): Promise<AppointmentRecord | null> {
  const { rows } = await query<AppointmentRecord>(
    `SELECT a.*, b.name AS branch_name
     FROM appointments a
     LEFT JOIN branches b ON b.id = a.branch_id
     WHERE a.id = $1 AND a.tenant_id = $2 AND a.is_deleted = FALSE`,
    [appointmentId, tenantId]
  );
  return rows[0] ?? null;
}

export async function createAppointment(
  input: CreateAppointmentInput
): Promise<AppointmentRecord> {
  const customerId = await resolveCustomerId(input.tenantId, {
    customerId: input.customerId,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    bookedBy: input.bookedBy,
    bookedByRole: input.bookedByRole,
  });

  const startTime = new Date(input.startTime);
  if (Number.isNaN(startTime.getTime())) {
    throw new Error("INVALID_START_TIME");
  }

  const endTime = input.endTime
    ? new Date(input.endTime)
    : new Date(startTime.getTime() + 60 * 60 * 1000);

  const { rows } = await query<AppointmentRecord>(
    `INSERT INTO appointments (
       tenant_id, branch_id, customer_id,
       customer_name, customer_email, service_type,
       start_time, end_time, status, notes,
       assigned_employee_id, booked_by
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'scheduled',$9,$10,$11)
     RETURNING *`,
    [
      input.tenantId,
      input.branchId,
      customerId,
      input.customerName.trim(),
      input.customerEmail?.trim() ?? null,
      input.serviceType.trim(),
      startTime.toISOString(),
      endTime.toISOString(),
      input.notes ?? null,
      input.assignedEmployeeId ?? null,
      input.bookedBy ?? null,
    ]
  );

  const created = rows[0];
  const withBranch = await getAppointmentById(created.id, input.tenantId);
  return withBranch ?? created;
}

export async function updateAppointment(
  appointmentId: string,
  tenantId: string,
  updates: {
    serviceType?: string;
    startTime?: string;
    endTime?: string;
    notes?: string;
    assignedEmployeeId?: string | null;
  }
): Promise<AppointmentRecord> {
  const existing = await getAppointmentById(appointmentId, tenantId);
  if (!existing) throw new Error("APPOINTMENT_NOT_FOUND");

  if (!["scheduled", "confirmed"].includes(existing.status)) {
    throw new Error("APPOINTMENT_NOT_EDITABLE");
  }

  const { rows } = await query<AppointmentRecord>(
    `UPDATE appointments SET
       service_type = COALESCE($3, service_type),
       start_time   = COALESCE($4, start_time),
       end_time     = COALESCE($5, end_time),
       notes        = COALESCE($6, notes),
       assigned_employee_id = COALESCE($7, assigned_employee_id),
       updated_at   = NOW()
     WHERE id = $1 AND tenant_id = $2
     RETURNING *`,
    [
      appointmentId,
      tenantId,
      updates.serviceType ?? null,
      updates.startTime ?? null,
      updates.endTime ?? null,
      updates.notes ?? null,
      updates.assignedEmployeeId ?? null,
    ]
  );

  const updated = await getAppointmentById(rows[0].id, tenantId);
  return updated ?? rows[0];
}

export async function transitionAppointmentStatus(
  appointmentId: string,
  tenantId: string,
  newStatus: AppointmentStatus
): Promise<AppointmentRecord> {
  const existing = await getAppointmentById(appointmentId, tenantId);
  if (!existing) throw new Error("APPOINTMENT_NOT_FOUND");

  const allowed = ALLOWED_TRANSITIONS[existing.status];
  if (!allowed.includes(newStatus)) {
    throw new Error(
      `INVALID_TRANSITION: Cannot move from '${existing.status}' to '${newStatus}'`
    );
  }

  const { rows } = await query<AppointmentRecord>(
    `UPDATE appointments SET status = $3, updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2
     RETURNING *`,
    [appointmentId, tenantId, newStatus]
  );

  const updated = await getAppointmentById(rows[0].id, tenantId);
  return updated ?? rows[0];
}

export async function deleteAppointment(
  appointmentId: string,
  tenantId: string,
  deletedBy: string
): Promise<void> {
  const existing = await getAppointmentById(appointmentId, tenantId);
  if (!existing) throw new Error("APPOINTMENT_NOT_FOUND");

  await query(
    `UPDATE appointments SET
       is_deleted = TRUE,
       deleted_at = NOW(),
       deleted_by = $3,
       updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2`,
    [appointmentId, tenantId, deletedBy]
  );
}

/** Parse "2026-06-15 @ 10:00 AM" or ISO string into Date ISO string */
export function parseAppointmentDateTime(dateStr: string, timeStr?: string): string {
  if (!timeStr) {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) throw new Error("INVALID_START_TIME");
    return d.toISOString();
  }

  const cleanedTime = timeStr.trim().toUpperCase();
  const match = cleanedTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/);
  if (!match) {
    const combined = `${dateStr} ${timeStr}`;
    const d = new Date(combined);
    if (Number.isNaN(d.getTime())) throw new Error("INVALID_START_TIME");
    return d.toISOString();
  }

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3];

  if (meridiem === "PM" && hours < 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;

  const iso = `${dateStr}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) throw new Error("INVALID_START_TIME");
  return d.toISOString();
}

export function formatAppointmentDisplayTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const date = d.toISOString().slice(0, 10);
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${date} @ ${time}`;
}

/** Map DB status to legacy UI status strings */
export function toUiStatus(status: AppointmentStatus): string {
  if (status === "cancelled") return "canceled";
  if (status === "checked_in") return "scheduled";
  return status;
}

/** Map UI action status to DB status */
export function fromUiStatus(status: string): AppointmentStatus {
  const map: Record<string, AppointmentStatus> = {
    scheduled: "scheduled",
    confirmed: "confirmed",
    "checked_in": "checked_in",
    completed: "completed",
    canceled: "cancelled",
    cancelled: "cancelled",
    no_show: "no_show",
    notarised: "completed",
  };
  return map[status] ?? "scheduled";
}

export async function findCustomerIdForUser(
  tenantId: string,
  userId: string,
  email: string
): Promise<string | null> {
  const { rows } = await query<{ id: string }>(
    `SELECT id FROM customers
     WHERE tenant_id = $1 AND is_deleted = FALSE
       AND (user_id = $2 OR email ILIKE $3)
     ORDER BY user_id NULLS LAST
     LIMIT 1`,
    [tenantId, userId, email]
  );
  return rows[0]?.id ?? null;
}

export { getCustomersByTenant };

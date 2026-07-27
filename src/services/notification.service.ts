import { query } from "../db/pool.js";
import { sendNotificationEmail } from "./email.service.js";

export type NotificationType = "info" | "success" | "warning" | "error";

export interface NotificationRecord {
  id: string;
  user_id: string;
  tenant_id: string | null;
  type: NotificationType;
  title: string;
  body: string;
  action_url: string | null;
  resource_type: string | null;
  resource_id: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface CreateNotificationInput {
  userId: string;
  tenantId: string | null;
  type?: NotificationType;
  title: string;
  body: string;
  actionUrl?: string;
  resourceType?: string;
  resourceId?: string;
  sendEmail?: boolean; // If true, also attempts real email delivery (best-effort, non-fatal on failure)
}

// Insert a single notification for one recipient.
export async function createNotification(input: CreateNotificationInput): Promise<NotificationRecord> {
  const { rows } = await query<NotificationRecord>(
    `INSERT INTO notifications (user_id, tenant_id, type, title, body, action_url, resource_type, resource_id, send_email)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      input.userId,
      input.tenantId,
      input.type ?? "info",
      input.title,
      input.body,
      input.actionUrl ?? null,
      input.resourceType ?? null,
      input.resourceId ?? null,
      input.sendEmail ?? false,
    ]
  );
  const notification = rows[0];

  if (input.sendEmail) {
    // Best-effort — a failed email must never break notification creation or the caller's request.
    deliverNotificationEmail(notification).catch(err => {
      console.error("[Notifications] Email delivery failed:", err.message);
    });
  }

  return notification;
}

async function deliverNotificationEmail(notification: NotificationRecord): Promise<void> {
  const { rows } = await query<{ email: string; full_name: string }>(
    `SELECT email, full_name FROM users WHERE id = $1 AND is_deleted = FALSE`,
    [notification.user_id]
  );
  const user = rows[0];
  if (!user) return;

  await sendNotificationEmail(user.email, user.full_name, notification.title, notification.body, notification.action_url);

  await query(
    `UPDATE notifications SET email_sent = TRUE, email_sent_at = NOW() WHERE id = $1`,
    [notification.id]
  );
}

// Insert the same notification for multiple recipients (e.g. all branch admins).
export async function createNotificationForUsers(
  userIds: string[],
  base: Omit<CreateNotificationInput, "userId">
): Promise<void> {
  if (userIds.length === 0) return;
  await Promise.all(userIds.map(userId => createNotification({ ...base, userId })));
}

// ─── Recipient resolution helpers ──────────────────────────────────────────

export async function getBranchAdminUserIds(branchId: string): Promise<string[]> {
  const { rows } = await query<{ user_id: string }>(
    `SELECT e.user_id FROM employees e
     JOIN users u ON u.id = e.user_id
     WHERE e.branch_id = $1 AND e.is_deleted = FALSE
       AND u.role = 'BRANCH_ADMIN' AND u.is_deleted = FALSE`,
    [branchId]
  );
  return rows.map(r => r.user_id);
}

export async function getCompanyAdminUserIds(tenantId: string): Promise<string[]> {
  const { rows } = await query<{ id: string }>(
    `SELECT id FROM users WHERE tenant_id = $1 AND role = 'COMPANY_ADMIN' AND is_deleted = FALSE`,
    [tenantId]
  );
  return rows.map(r => r.id);
}

// Resolve the portal user_id linked to a customer record, if the customer has portal access.
export async function getCustomerUserId(customerId: string | null): Promise<string | null> {
  if (!customerId) return null;
  const { rows } = await query<{ user_id: string | null }>(
    `SELECT user_id FROM customers WHERE id = $1`,
    [customerId]
  );
  return rows[0]?.user_id ?? null;
}

// ─── Reading / updating notifications ──────────────────────────────────────

export async function getNotificationsForUser(
  userId: string,
  opts: { limit?: number; offset?: number; unreadOnly?: boolean } = {}
): Promise<{ notifications: NotificationRecord[]; unreadCount: number }> {
  const limit = opts.limit ?? 30;
  const offset = opts.offset ?? 0;

  const unreadFilter = opts.unreadOnly ? "AND is_read = FALSE" : "";
  const { rows } = await query<NotificationRecord>(
    `SELECT * FROM notifications
     WHERE user_id = $1 AND is_dismissed = FALSE ${unreadFilter}
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  const { rows: countRows } = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM notifications WHERE user_id = $1 AND is_read = FALSE AND is_dismissed = FALSE`,
    [userId]
  );

  return { notifications: rows, unreadCount: parseInt(countRows[0]?.count ?? "0", 10) };
}

export async function markNotificationRead(id: string, userId: string): Promise<NotificationRecord | null> {
  const { rows } = await query<NotificationRecord>(
    `UPDATE notifications SET is_read = TRUE, read_at = NOW()
     WHERE id = $1 AND user_id = $2
     RETURNING *`,
    [id, userId]
  );
  return rows[0] ?? null;
}

export async function markAllNotificationsRead(userId: string): Promise<number> {
  const { rowCount } = await query(
    `UPDATE notifications SET is_read = TRUE, read_at = NOW()
     WHERE user_id = $1 AND is_read = FALSE`,
    [userId]
  );
  return rowCount ?? 0;
}

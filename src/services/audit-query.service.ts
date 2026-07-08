import { query } from "../db/pool.js";

export interface AuditLogEntry {
  id: string;
  source: "operational" | "auth";
  user_id: string | null;
  tenant_id: string | null;
  branch_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  resource_label: string | null;
  actor_name: string | null;
  ip_address: string | null;
  user_agent: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
}

export interface AuditLogQuery {
  tenantId?: string;
  branchId?: string;
  action?: string;
  resourceType?: string;
  limit?: number;
  offset?: number;
}

export async function queryAuditLogs(filters: AuditLogQuery): Promise<{
  logs: AuditLogEntry[];
  total: number;
}> {
  const limit = Math.min(filters.limit ?? 50, 200);
  const offset = filters.offset ?? 0;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (filters.tenantId) {
    conditions.push(`combined.tenant_id = $${idx++}`);
    params.push(filters.tenantId);
  }
  if (filters.branchId) {
    conditions.push(`combined.branch_id = $${idx++}`);
    params.push(filters.branchId);
  }
  if (filters.action) {
    conditions.push(`combined.action ILIKE $${idx++}`);
    params.push(`%${filters.action}%`);
  }
  if (filters.resourceType) {
    conditions.push(`combined.resource_type ILIKE $${idx++}`);
    params.push(`%${filters.resourceType}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const countSql = `
    SELECT COUNT(*)::int AS total FROM (
      SELECT al.id, al.tenant_id, al.branch_id, al.action,
             al.resource_type, al.resource_id, al.resource_label,
             al.user_id, al.ip_address, al.user_agent, al.meta, al.created_at
      FROM audit_logs al
      UNION ALL
      SELECT aal.id, aal.tenant_id, NULL AS branch_id, aal.action,
             'auth' AS resource_type, aal.user_id AS resource_id, NULL AS resource_label,
             aal.user_id, aal.ip_address::text, aal.user_agent, aal.meta, aal.created_at
      FROM auth_audit_log aal
    ) combined
    ${where}`;

  const { rows: countRows } = await query<{ total: number }>(countSql, params);
  const total = countRows[0]?.total ?? 0;

  const dataSql = `
    SELECT combined.*, u.full_name AS actor_name FROM (
      SELECT al.id, 'operational'::text AS source, al.user_id, al.tenant_id, al.branch_id,
             al.action, al.resource_type, al.resource_id, al.resource_label,
             al.ip_address::text, al.user_agent, al.meta, al.created_at
      FROM audit_logs al
      UNION ALL
      SELECT aal.id, 'auth'::text AS source, aal.user_id, aal.tenant_id, NULL AS branch_id,
             aal.action, 'auth' AS resource_type, aal.user_id AS resource_id, NULL AS resource_label,
             aal.ip_address::text, aal.user_agent, aal.meta, aal.created_at
      FROM auth_audit_log aal
    ) combined
    LEFT JOIN users u ON u.id = combined.user_id
    ${where}
    ORDER BY combined.created_at DESC
    LIMIT $${idx++} OFFSET $${idx++}`;

  const { rows } = await query<AuditLogEntry>(dataSql, [...params, limit, offset]);
  return { logs: rows, total };
}

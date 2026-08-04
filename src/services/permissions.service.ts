import { query } from "../db/pool.js";
import type { Role } from "../middleware/auth.middleware.js";

export type PermissionKey =
  | "CREATE_DOCUMENT"
  | "EDIT_DOCUMENT"
  | "DELETE_DOCUMENT"
  | "VIEW_REPORTS"
  | "CREATE_EMPLOYEE"
  | "CREATE_BRANCH"
  | "MANAGE_SUBSCRIPTIONS";

export const ALL_PERMISSION_KEYS: PermissionKey[] = [
  "CREATE_DOCUMENT",
  "EDIT_DOCUMENT",
  "DELETE_DOCUMENT",
  "VIEW_REPORTS",
  "CREATE_EMPLOYEE",
  "CREATE_BRANCH",
  "MANAGE_SUBSCRIPTIONS",
];

export const ALL_ROLES: Role[] = [
  "SUPER_ADMIN",
  "COMPANY_ADMIN",
  "BRANCH_ADMIN",
  "EMPLOYEE",
  "CUSTOMER",
];

// ─── Hardcoded fallback ────────────────────────────────────────────────────
// This is the last resort when neither a tenant override nor a platform
// default row exists in the DB. It mirrors the original role hierarchy
// intent and must always leave SUPER_ADMIN able to manage subscriptions —
// that specific cell is also protected at the DB-write layer (see
// setPermission below), not just here.
const HARDCODED_FALLBACK: Record<Role, Record<PermissionKey, boolean>> = {
  SUPER_ADMIN: {
    CREATE_DOCUMENT: true,
    EDIT_DOCUMENT: true,
    DELETE_DOCUMENT: true,
    VIEW_REPORTS: true,
    CREATE_EMPLOYEE: true,
    CREATE_BRANCH: true,
    MANAGE_SUBSCRIPTIONS: true,
  },
  COMPANY_ADMIN: {
    CREATE_DOCUMENT: true,
    EDIT_DOCUMENT: true,
    DELETE_DOCUMENT: true,
    VIEW_REPORTS: true,
    CREATE_EMPLOYEE: true,
    CREATE_BRANCH: true,
    MANAGE_SUBSCRIPTIONS: true,
  },
  BRANCH_ADMIN: {
    CREATE_DOCUMENT: true,
    EDIT_DOCUMENT: true,
    DELETE_DOCUMENT: false,
    VIEW_REPORTS: true,
    CREATE_EMPLOYEE: false,
    CREATE_BRANCH: false,
    MANAGE_SUBSCRIPTIONS: false,
  },
  EMPLOYEE: {
    CREATE_DOCUMENT: true,
    EDIT_DOCUMENT: true,
    DELETE_DOCUMENT: false,
    VIEW_REPORTS: false,
    CREATE_EMPLOYEE: false,
    CREATE_BRANCH: false,
    MANAGE_SUBSCRIPTIONS: false,
  },
  CUSTOMER: {
    CREATE_DOCUMENT: false,
    EDIT_DOCUMENT: false,
    DELETE_DOCUMENT: false,
    VIEW_REPORTS: false,
    CREATE_EMPLOYEE: false,
    CREATE_BRANCH: false,
    MANAGE_SUBSCRIPTIONS: false,
  },
};

// Cells that can never be turned off, regardless of tenant override or
// platform default. Enforced both when writing and when resolving.
const IMMUTABLE_TRUE: Array<{ role: Role; key: PermissionKey }> = [
  { role: "SUPER_ADMIN", key: "MANAGE_SUBSCRIPTIONS" },
];

function isImmutableTrue(role: Role, key: PermissionKey): boolean {
  return IMMUTABLE_TRUE.some((c) => c.role === role && c.key === key);
}

interface PermissionRow {
  tenant_id: string | null;
  role: Role;
  permission_key: PermissionKey;
  allowed: boolean;
}

export type PermissionsMatrix = Record<Role, Record<PermissionKey, boolean>>;

/**
 * Resolve the full effective permissions matrix for a tenant:
 * tenant override → platform default → hardcoded fallback.
 * If tenantId is null, resolves platform-wide (tenant overrides never apply).
 */
export async function getEffectivePermissionsMatrix(
  tenantId: string | null
): Promise<PermissionsMatrix> {
  const { rows } = await query<PermissionRow>(
    `SELECT tenant_id, role, permission_key, allowed
     FROM tenant_permissions
     WHERE tenant_id IS NULL OR tenant_id = $1`,
    [tenantId]
  );

  const platformOverrides = new Map<string, boolean>();
  const tenantOverrides = new Map<string, boolean>();

  for (const row of rows) {
    const cellKey = `${row.role}:${row.permission_key}`;
    if (row.tenant_id === null) {
      platformOverrides.set(cellKey, row.allowed);
    } else {
      tenantOverrides.set(cellKey, row.allowed);
    }
  }

  const matrix = {} as PermissionsMatrix;
  for (const role of ALL_ROLES) {
    matrix[role] = {} as Record<PermissionKey, boolean>;
    for (const key of ALL_PERMISSION_KEYS) {
      const cellKey = `${role}:${key}`;
      let value: boolean;
      if (tenantOverrides.has(cellKey)) {
        value = tenantOverrides.get(cellKey)!;
      } else if (platformOverrides.has(cellKey)) {
        value = platformOverrides.get(cellKey)!;
      } else {
        value = HARDCODED_FALLBACK[role][key];
      }
      if (isImmutableTrue(role, key)) {
        value = true;
      }
      matrix[role][key] = value;
    }
  }
  return matrix;
}

/**
 * Resolve a single permission for a role within a tenant's context.
 * Used by the requirePermission() middleware on the hot path — this issues
 * one lightweight query rather than resolving the whole matrix.
 */
export async function resolvePermission(
  tenantId: string | null,
  role: Role,
  key: PermissionKey
): Promise<boolean> {
  if (isImmutableTrue(role, key)) return true;

  const { rows } = await query<PermissionRow>(
    `SELECT tenant_id, allowed
     FROM tenant_permissions
     WHERE role = $1 AND permission_key = $2 AND (tenant_id = $3 OR tenant_id IS NULL)`,
    [role, key, tenantId]
  );

  const tenantRow = rows.find((r) => r.tenant_id === tenantId && tenantId !== null);
  if (tenantRow) return tenantRow.allowed;

  const platformRow = rows.find((r) => r.tenant_id === null);
  if (platformRow) return platformRow.allowed;

  return HARDCODED_FALLBACK[role][key];
}

/**
 * Set a permission cell. scope="platform" requires tenantId=null (SUPER_ADMIN
 * only, enforced at the route layer). scope="tenant" requires a tenantId.
 */
export async function setPermission(input: {
  tenantId: string | null;
  role: Role;
  key: PermissionKey;
  allowed: boolean;
  updatedBy: string;
}): Promise<void> {
  const { tenantId, role, key, allowed, updatedBy } = input;

  if (isImmutableTrue(role, key) && allowed === false) {
    throw new Error("PERMISSION_LOCKED");
  }

  const sql =
    tenantId === null
      ? `INSERT INTO tenant_permissions (tenant_id, role, permission_key, allowed, updated_by)
         VALUES (NULL, $1, $2, $3, $4)
         ON CONFLICT (role, permission_key) WHERE tenant_id IS NULL
           DO UPDATE SET allowed = EXCLUDED.allowed, updated_by = EXCLUDED.updated_by, updated_at = now()`
      : `INSERT INTO tenant_permissions (tenant_id, role, permission_key, allowed, updated_by)
         VALUES ($5, $1, $2, $3, $4)
         ON CONFLICT (tenant_id, role, permission_key) WHERE tenant_id IS NOT NULL
           DO UPDATE SET allowed = EXCLUDED.allowed, updated_by = EXCLUDED.updated_by, updated_at = now()`;

  const params =
    tenantId === null
      ? [role, key, allowed, updatedBy]
      : [role, key, allowed, updatedBy, tenantId];

  await query(sql, params);
}

/** Reset a tenant override back to platform default (delete the override row). */
export async function clearTenantOverride(
  tenantId: string,
  role: Role,
  key: PermissionKey
): Promise<void> {
  await query(
    `DELETE FROM tenant_permissions WHERE tenant_id = $1 AND role = $2 AND permission_key = $3`,
    [tenantId, role, key]
  );
}

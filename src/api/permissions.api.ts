import { api } from "./client.js";

export type Role = "SUPER_ADMIN" | "COMPANY_ADMIN" | "BRANCH_ADMIN" | "EMPLOYEE" | "CUSTOMER";
export type PermissionKey =
  | "CREATE_DOCUMENT"
  | "EDIT_DOCUMENT"
  | "DELETE_DOCUMENT"
  | "VIEW_REPORTS"
  | "CREATE_EMPLOYEE"
  | "CREATE_BRANCH"
  | "MANAGE_SUBSCRIPTIONS";

export type PermissionsMatrix = Record<Role, Record<PermissionKey, boolean>>;

export const permissionsApi = {
  // Effective matrix for the caller's own tenant (or platform, for a
  // tenant-less SUPER_ADMIN).
  get: (tenantId?: string) =>
    api.get<{ matrix: PermissionsMatrix; scope: "tenant" | "platform"; tenantId: string | null }>(
      `/api/permissions${tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : ""}`
    ),

  // Set a tenant-scoped override.
  set: (role: Role, permissionKey: PermissionKey, allowed: boolean) =>
    api.patch<{ message: string; matrix: PermissionsMatrix }>("/api/permissions", {
      role,
      permissionKey,
      allowed,
    }),

  // Revert a tenant override back to the platform default.
  reset: (role: Role, permissionKey: PermissionKey) =>
    api.delete<{ message: string; matrix: PermissionsMatrix }>(
      `/api/permissions?role=${encodeURIComponent(role)}&permissionKey=${encodeURIComponent(permissionKey)}`
    ),

  // SUPER_ADMIN-only: platform-wide defaults.
  getPlatform: () =>
    api.get<{ matrix: PermissionsMatrix; scope: "platform" }>("/api/permissions/platform"),

  setPlatform: (role: Role, permissionKey: PermissionKey, allowed: boolean) =>
    api.patch<{ message: string; matrix: PermissionsMatrix }>("/api/permissions/platform", {
      role,
      permissionKey,
      allowed,
    }),
};

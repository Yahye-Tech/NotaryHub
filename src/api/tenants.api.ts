import { api } from "./client.js";

// ─── Tenant types ─────────────────────────────────────────────────────────────

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  status: "active" | "suspended" | "trial";
  plan: "Basic" | "Professional" | "Enterprise";
  email: string | null;
  license_number: string | null;
  created_at: string;
  updated_at: string;
  stats?: {
    branchCount: number;
    employeeCount: number;
    userCount: number;
  };
}

export interface Branch {
  id: string;
  tenant_id: string;
  name: string;
  address: string;
  phone: string | null;
  counters_count: number;
  status: "active" | "suspended" | "archived";
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  user_id: string;
  tenant_id: string;
  branch_id: string;
  job_role: "NOTARY_OFFICER" | "RECEPTIONIST" | "BRANCH_ADMIN";
  status: "active" | "suspended" | "offline";
  assigned_counter: number | null;
  email: string;
  full_name: string;
  phone: string | null;
  user_status: string;
  last_login_at: string | null;
  created_at: string;
}

// ─── Tenant endpoints ─────────────────────────────────────────────────────────

export const tenantsApi = {
  list: () =>
    api.get<{ tenants: Tenant[] }>("/api/tenants"),

  get: (tenantId: string) =>
    api.get<{ tenant: Tenant }>(`/api/tenants/${tenantId}`),

  create: (data: {
    name: string;
    subdomain: string;
    plan: Tenant["plan"];
    email?: string;
    licenseNumber?: string;
  }) => api.post<{ message: string; tenant: Tenant }>("/api/tenants", data),

  update: (tenantId: string, data: {
    name?: string;
    plan?: Tenant["plan"];
    email?: string;
    licenseNumber?: string;
    status?: "active" | "suspended";
  }) => api.patch<{ message: string; tenant: Tenant }>(`/api/tenants/${tenantId}`, data),

  delete: (tenantId: string) =>
    api.delete<{ message: string }>(`/api/tenants/${tenantId}`),
};

// ─── Branch endpoints ─────────────────────────────────────────────────────────

export const branchesApi = {
  list: (tenantId: string) =>
    api.get<{ branches: Branch[] }>(`/api/tenants/${tenantId}/branches`),

  get: (tenantId: string, branchId: string) =>
    api.get<{ branch: Branch }>(`/api/tenants/${tenantId}/branches/${branchId}`),

  create: (tenantId: string, data: {
    name: string;
    address: string;
    phone?: string;
    countersCount?: number;
  }) =>
    api.post<{ message: string; branch: Branch }>(
      `/api/tenants/${tenantId}/branches`,
      data
    ),

  update: (tenantId: string, branchId: string, data: {
    name?: string;
    address?: string;
    phone?: string;
    countersCount?: number;
    status?: Branch["status"];
  }) =>
    api.patch<{ message: string; branch: Branch }>(
      `/api/tenants/${tenantId}/branches/${branchId}`,
      data
    ),

  delete: (tenantId: string, branchId: string) =>
    api.delete<{ message: string }>(
      `/api/tenants/${tenantId}/branches/${branchId}`
    ),
};

// ─── Employee endpoints ───────────────────────────────────────────────────────

export const employeesApi = {
  listByBranch: (tenantId: string, branchId: string) =>
    api.get<{ employees: Employee[] }>(
      `/api/tenants/${tenantId}/branches/${branchId}/employees`
    ),

  listByTenant: (tenantId: string) =>
    api.get<{ employees: Employee[] }>(
      `/api/tenants/${tenantId}/employees`
    ),

  get: (tenantId: string, branchId: string, employeeId: string) =>
    api.get<{ employee: Employee }>(
      `/api/tenants/${tenantId}/branches/${branchId}/employees/${employeeId}`
    ),

  create: (tenantId: string, branchId: string, data: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    jobRole: Employee["job_role"];
    assignedCounter?: number;
  }) =>
    api.post<{ message: string; employee: Employee }>(
      `/api/tenants/${tenantId}/branches/${branchId}/employees`,
      data
    ),

  update: (tenantId: string, branchId: string, employeeId: string, data: {
    fullName?: string;
    phone?: string;
    jobRole?: Employee["job_role"];
    assignedCounter?: number;
    branchId?: string;
  }) =>
    api.patch<{ message: string; employee: Employee }>(
      `/api/tenants/${tenantId}/branches/${branchId}/employees/${employeeId}`,
      data
    ),

  setStatus: (
    tenantId: string,
    branchId: string,
    employeeId: string,
    status: Employee["status"]
  ) =>
    api.patch<{ message: string; employee: Employee }>(
      `/api/tenants/${tenantId}/branches/${branchId}/employees/${employeeId}/status`,
      { status }
    ),

  resetPassword: (
    tenantId: string,
    branchId: string,
    employeeId: string,
    newPassword: string
  ) =>
    api.post<{ message: string }>(
      `/api/tenants/${tenantId}/branches/${branchId}/employees/${employeeId}/reset-password`,
      { newPassword }
    ),

  delete: (tenantId: string, branchId: string, employeeId: string) =>
    api.delete<{ message: string }>(
      `/api/tenants/${tenantId}/branches/${branchId}/employees/${employeeId}`
    ),
};

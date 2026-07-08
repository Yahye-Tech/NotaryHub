import { api } from "./client.js";

export interface CompanyProfile {
  id: string;
  tenant_id: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  postal_code: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  website: string | null;
  registration_number: string | null;
  tax_id: string | null;
  legal_representative: string | null;
  notary_seal_number: string | null;
  timezone: string;
  locale: string;
  working_days: string[];
  working_hours_start: string | null;
  working_hours_end: string | null;
  max_daily_appointments: number;
  created_at: string;
  updated_at: string;
}

export const settingsApi = {
  get: (tenantId?: string) =>
    api.get<{ profile: CompanyProfile }>(
      `/api/settings${tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : ""}`
    ),

  update: (data: {
    primaryColor?: string;
    secondaryColor?: string;
    address?: string;
    city?: string;
    country?: string;
    contactName?: string;
    contactPhone?: string;
    contactEmail?: string;
    website?: string;
    timezone?: string;
    locale?: string;
    maxDailyAppointments?: number;
  }) => api.patch<{ message: string; profile: CompanyProfile }>("/api/settings", data),
};

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
  created_at: string;
}

export const auditApi = {
  list: (params?: {
    tenantId?: string;
    branchId?: string;
    action?: string;
    resourceType?: string;
    limit?: number;
    offset?: number;
  }) => {
    const qs = params
      ? "?" + Object.entries(params)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
          .join("&")
      : "";
    return api.get<{ logs: AuditLogEntry[]; total: number }>(`/api/audit-logs${qs}`);
  },
};

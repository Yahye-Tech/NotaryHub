// ─── NotaryHub — Shared TypeScript types ──────────────────────────────────────
// All types mirror the real PostgreSQL schema.
// No fake/demo fields. No localStorage keys.

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
  is_deleted: boolean;
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
  is_deleted: boolean;
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
  updated_at: string;
  is_deleted: boolean;
}

export interface Customer {
  id: string;
  tenant_id: string;
  user_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  nationality: string | null;
  address: string | null;
  id_type: "NATIONAL_ID" | "PASSPORT" | "DRIVERS_LICENSE" | "RESIDENCE_PERMIT" | "OTHER" | null;
  id_number: string | null;
  id_expiry_date: string | null;
  status: "active" | "suspended" | "blacklisted";
  notes: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export interface NotaryDocument {
  id: string;
  tenant_id: string;
  branch_id: string;
  customer_id: string | null;
  processed_by: string | null;
  reviewed_by: string | null;
  document_number: string;
  title: string;
  doc_type:
    | "POWER_OF_ATTORNEY"
    | "AFFIDAVIT"
    | "DEED"
    | "CONTRACT"
    | "WILL"
    | "STATUTORY_DECLARATION"
    | "CERTIFIED_COPY"
    | "AUTHENTICATION"
    | "APOSTILLE"
    | "OTHER";
  status: "draft" | "pending_review" | "approved" | "signed" | "notarised" | "rejected" | "expired" | "revoked";
  content: string | null;
  summary: string | null;
  jurisdiction: string | null;
  language: string;
  file_url: string | null;
  seal_code: string | null;
  ai_generated: boolean;
  issued_at: string | null;
  expires_at: string | null;
  signed_at: string | null;
  notarised_at: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export interface Subscription {
  id: string;
  tenant_id: string;
  plan: "Basic" | "Professional" | "Enterprise";
  status: "trialing" | "active" | "past_due" | "cancelled" | "expired";
  billing_interval: "monthly" | "quarterly" | "annual";
  amount_cents: number;
  currency: string;
  current_period_start: string;
  current_period_end: string;
  trial_ends_at: string | null;
  max_branches: number;
  max_employees: number;
  max_documents_month: number;
  created_at: string;
}

export interface Payment {
  id: string;
  tenant_id: string;
  subscription_id: string;
  amount_cents: number;
  currency: string;
  status: "pending" | "processing" | "succeeded" | "failed" | "refunded" | "disputed";
  method: "card" | "bank_transfer" | "mobile_money" | "cash" | "other";
  paid_at: string | null;
  period_start: string;
  period_end: string;
  due_date: string;
  invoice_number: string | null;
  receipt_url: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  tenant_id: string | null;
  branch_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  resource_label: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  meta: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  tenant_id: string | null;
  type: "info" | "success" | "warning" | "error";
  title: string;
  body: string;
  action_url: string | null;
  resource_type: string | null;
  resource_id: string | null;
  is_read: boolean;
  read_at: string | null;
  is_dismissed: boolean;
  expires_at: string | null;
  created_at: string;
}

export interface QueueTicket {
  id: string;
  ticket_number: string;
  customer_name: string;
  service_type: string;
  check_in_time: string;
  status: "waiting" | "calling" | "serving" | "completed" | "passed";
  called_counter?: number | null;
  served_by?: string | null;
  tenant_id?: string | null;
  branch_id?: string | null;
  created_at?: string;
}

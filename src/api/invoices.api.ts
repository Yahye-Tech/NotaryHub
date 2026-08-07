import { api } from "./client.js";

export type InvoiceStatus = "draft" | "unpaid" | "paid" | "void";
export type EffectiveInvoiceStatus = InvoiceStatus | "overdue";
export type PaymentMethod = "card" | "bank_transfer" | "mobile_money" | "cash" | "other";

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;
}

export interface Invoice {
  id: string;
  tenant_id: string;
  branch_id: string | null;
  customer_id: string;
  document_id: string | null;
  invoice_number: string;
  status: InvoiceStatus;
  effective_status: EffectiveInvoiceStatus;
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  currency: string;
  due_date: string;
  paid_at: string | null;
  payment_method: PaymentMethod | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  customer_name: string;
  customer_email: string | null;
  branch_name: string | null;
  items?: InvoiceItem[];
}

export interface InvoiceStats {
  totalInvoicedCents: number;
  totalPaidCents: number;
  totalOutstandingCents: number;
  totalOverdueCents: number;
  collectionRate: number;
}

export const invoicesApi = {
  list: (filters?: { branchId?: string; customerId?: string; status?: EffectiveInvoiceStatus }) => {
    const params = new URLSearchParams();
    if (filters?.branchId) params.set("branchId", filters.branchId);
    if (filters?.customerId) params.set("customerId", filters.customerId);
    if (filters?.status) params.set("status", filters.status);
    const qs = params.toString();
    return api.get<{ invoices: Invoice[]; total: number }>(`/api/invoices${qs ? `?${qs}` : ""}`);
  },

  stats: (branchId?: string) =>
    api.get<InvoiceStats>(`/api/invoices/stats${branchId ? `?branchId=${encodeURIComponent(branchId)}` : ""}`),

  get: (id: string) => api.get<{ invoice: Invoice }>(`/api/invoices/${id}`),

  create: (input: {
    customerId: string;
    branchId?: string;
    documentId?: string;
    items: { description: string; quantity: number; unitPriceCents: number }[];
    taxCents?: number;
    currency?: string;
    dueDate: string;
    notes?: string;
    status?: "draft" | "unpaid";
  }) => api.post<{ message: string; invoice: Invoice }>("/api/invoices", input),

  pay: (id: string, paymentMethod: PaymentMethod) =>
    api.patch<{ message: string; invoice: Invoice }>(`/api/invoices/${id}/pay`, { paymentMethod }),

  void: (id: string) =>
    api.patch<{ message: string; invoice: Invoice }>(`/api/invoices/${id}/void`, {}),
};

import { api } from "./client.js";
import type { NotaryDocument, Customer } from "../types";

// ─── Documents ────────────────────────────────────────────────────────────────

export interface CreateDocumentInput {
  branchId: string;
  title: string;
  docType: NotaryDocument["doc_type"];
  content?: string;
  summary?: string;
  jurisdiction?: string;
  language?: string;
  customerId?: string;
  aiGenerated?: boolean;
  expiresAt?: string;
}

export interface UpdateDocumentInput {
  title?: string;
  content?: string;
  summary?: string;
  jurisdiction?: string;
  customerId?: string;
  expiresAt?: string;
}

export const documentsApi = {
  list: (params?: {
    status?: string;
    docType?: string;
    branchId?: string;
    limit?: number;
    offset?: number;
  }) => {
    const qs = params
      ? "?" + Object.entries(params)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
          .join("&")
      : "";
    return api.get<{ documents: NotaryDocument[]; total: number }>(
      `/api/documents${qs}`
    );
  },

  get: (id: string) =>
    api.get<{ document: NotaryDocument }>(`/api/documents/${id}`),

  create: (data: CreateDocumentInput) =>
    api.post<{ message: string; document: NotaryDocument }>("/api/documents", data),

  update: (id: string, data: UpdateDocumentInput) =>
    api.patch<{ message: string; document: NotaryDocument }>(`/api/documents/${id}`, data),

  transition: (
    id: string,
    status: NotaryDocument["status"],
    rejectionReason?: string
  ) =>
    api.post<{ message: string; document: NotaryDocument }>(
      `/api/documents/${id}/transition`,
      { status, rejectionReason }
    ),

  delete: (id: string) =>
    api.delete<{ message: string }>(`/api/documents/${id}`),
};

// ─── Customers ────────────────────────────────────────────────────────────────

export interface CreateCustomerInput {
  fullName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  nationality?: string;
  address?: string;
  city?: string;
  country?: string;
  idType?: Customer["id_type"];
  idNumber?: string;
  idIssueDate?: string;
  idExpiryDate?: string;
  idIssuingAuthority?: string;
  notes?: string;
}

export const customersApi = {
  list: (search?: string) =>
    api.get<{ customers: Customer[] }>(
      `/api/customers${search ? `?search=${encodeURIComponent(search)}` : ""}`
    ),

  get: (id: string) =>
    api.get<{ customer: Customer }>(`/api/customers/${id}`),

  create: (data: CreateCustomerInput) =>
    api.post<{ message: string; customer: Customer }>("/api/customers", data),

  update: (
    id: string,
    data: Partial<CreateCustomerInput> & {
      status?: Customer["status"];
      blacklistReason?: string;
    }
  ) =>
    api.patch<{ message: string; customer: Customer }>(`/api/customers/${id}`, data),

  delete: (id: string) =>
    api.delete<{ message: string }>(`/api/customers/${id}`),
};

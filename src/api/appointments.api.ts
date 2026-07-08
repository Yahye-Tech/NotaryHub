import { api } from "./client.js";
import type { AppointmentStatus } from "../services/appointment.service.js";

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
  branch_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UiAppointment {
  id: string;
  branchId: string;
  customerName: string;
  customerEmail?: string;
  serviceType: string;
  appointmentTime: string;
  status: string;
  startTime: string;
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

export function toUiAppointment(a: AppointmentRecord): UiAppointment {
  return {
    id: a.id,
    branchId: a.branch_id,
    customerName: a.customer_name,
    customerEmail: a.customer_email ?? undefined,
    serviceType: a.service_type,
    appointmentTime: formatAppointmentDisplayTime(a.start_time),
    status: a.status === "cancelled" ? "canceled" : a.status,
    startTime: a.start_time,
  };
}

export const appointmentsApi = {
  list: (params?: {
    status?: string;
    branchId?: string;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  }) => {
    const qs = params
      ? "?" + Object.entries(params)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
          .join("&")
      : "";
    return api.get<{ appointments: AppointmentRecord[]; total: number }>(
      `/api/appointments${qs}`
    );
  },

  get: (id: string) =>
    api.get<{ appointment: AppointmentRecord }>(`/api/appointments/${id}`),

  create: (data: {
    branchId: string;
    customerName: string;
    serviceType: string;
    startTime?: string;
    appointmentDate?: string;
    appointmentTime?: string;
    customerEmail?: string;
    customerId?: string;
    notes?: string;
  }) => api.post<{ message: string; appointment: AppointmentRecord }>(
    "/api/appointments",
    data
  ),

  update: (id: string, data: {
    serviceType?: string;
    startTime?: string;
    endTime?: string;
    notes?: string;
    assignedEmployeeId?: string | null;
    appointmentDate?: string;
    appointmentTime?: string;
  }) => api.patch<{ message: string; appointment: AppointmentRecord }>(
    `/api/appointments/${id}`,
    data
  ),

  transition: (id: string, status: string) =>
    api.post<{ message: string; appointment: AppointmentRecord }>(
      `/api/appointments/${id}/transition`,
      { status }
    ),

  delete: (id: string) =>
    api.delete<{ message: string }>(`/api/appointments/${id}`),
};

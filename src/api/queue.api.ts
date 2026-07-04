import { api } from "./client.js";
import type { QueueTicket } from "../types";

export interface QueueStats {
  waiting: number;
  serving: number;
  completedToday: number;
  averageWaitMinutes: number | null;
}

export const queueApi = {
  list: (branchId?: string, date?: string) => {
    const params = new URLSearchParams();
    if (branchId) params.set("branchId", branchId);
    if (date) params.set("date", date);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return api.get<{ tickets: QueueTicket[]; stats: QueueStats }>(`/api/queue${qs}`);
  },

  checkIn: (data: {
    customerName: string;
    serviceType: string;
    customerId?: string;
    branchId?: string;
  }) =>
    api.post<{ message: string; ticket: QueueTicket }>("/api/queue/check-in", data),

  callNext: (branchId?: string, counter?: number) =>
    api.post<{ message: string; ticket: QueueTicket }>("/api/queue/call-next", { branchId, counter }),

  markServing: (ticketId: string) =>
    api.post<{ message: string; ticket: QueueTicket }>(`/api/queue/${ticketId}/serving`),

  complete: (ticketId: string, documentId?: string) =>
    api.post<{ message: string; ticket: QueueTicket }>(`/api/queue/${ticketId}/complete`, { documentId }),

  skip: (ticketId: string) =>
    api.post<{ message: string; ticket: QueueTicket }>(`/api/queue/${ticketId}/skip`),

  recall: (ticketId: string) =>
    api.post<{ message: string; ticket: QueueTicket }>(`/api/queue/${ticketId}/recall`),

  cancel: (ticketId: string) =>
    api.post<{ message: string; ticket: QueueTicket }>(`/api/queue/${ticketId}/cancel`),
};

import { api } from "./client.js";

export type NotificationType = "info" | "success" | "warning" | "error";

export interface NotificationRecord {
  id: string;
  user_id: string;
  tenant_id: string | null;
  type: NotificationType;
  title: string;
  body: string;
  action_url: string | null;
  resource_type: string | null;
  resource_id: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export const notificationsApi = {
  list: (params?: { limit?: number; offset?: number; unreadOnly?: boolean }) => {
    const qs = params
      ? "?" + Object.entries(params)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
          .join("&")
      : "";
    return api.get<{ notifications: NotificationRecord[]; unreadCount: number }>(`/api/notifications${qs}`);
  },

  markRead: (id: string) =>
    api.patch<{ notification: NotificationRecord }>(`/api/notifications/${id}/read`, {}),

  markAllRead: () =>
    api.post<{ message: string; count: number }>(`/api/notifications/read-all`, {}),
};

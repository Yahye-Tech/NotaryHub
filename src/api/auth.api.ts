import { api } from "./client.js";

export interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    tenantId: string | null;
    totpEnabled: boolean;
  };
  requires2fa?: boolean;
}

export interface MeResponse {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: string;
  tenantId: string | null;
  status: string;
  emailVerified: boolean;
  totpEnabled: boolean;
}

export const authApi = {
  login: (email: string, password: string, totpCode?: string) =>
    api.post<LoginResponse>("/api/auth/login", { email, password, totpCode }),

  logout: () =>
    api.post<{ message: string }>("/api/auth/logout"),

  refresh: () =>
    api.post<{ accessToken: string }>("/api/auth/refresh"),

  me: () =>
    api.get<MeResponse>("/api/auth/me"),

  register: (data: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    role?: string;
    tenantId?: string;
  }) => api.post<{ message: string; userId: string }>("/api/auth/register", data),

  forgotPassword: (email: string) =>
    api.post<{ message: string }>("/api/auth/forgot-password", { email }),

  resetPassword: (token: string, password: string) =>
    api.post<{ message: string }>("/api/auth/reset-password", { token, password }),

  verifyEmail: (token: string) =>
    api.get<{ message: string }>(`/api/auth/verify-email?token=${token}`),

  resendVerification: (email: string) =>
    api.post<{ message: string }>("/api/auth/resend-verification", { email }),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.post<{ message: string }>("/api/auth/change-password", {
      currentPassword,
      newPassword,
    }),

  setup2fa: () =>
    api.post<{ secret: string; otpauthUrl: string; qrDataUrl: string }>(
      "/api/auth/2fa/setup"
    ),

  enable2fa: (totpCode: string) =>
    api.post<{ message: string }>("/api/auth/2fa/enable", { totpCode }),

  disable2fa: (totpCode: string) =>
    api.post<{ message: string }>("/api/auth/2fa/disable", { totpCode }),
};

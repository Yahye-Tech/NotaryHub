import { api } from "./client.js";

export interface PlatformSettings {
  aiOcrEnabled: boolean;
  aiDocGenerationEnabled: boolean;
  platformName: string;
  brandingColor: string;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  smtpSecure: boolean | null;
  smtpPasswordConfigured: boolean;
  updatedBy: string | null;
  updatedAt: string;
}

export interface PublicBranding {
  platformName: string;
  brandingColor: string;
}

export const platformSettingsApi = {
  get: () => api.get<{ settings: PlatformSettings }>("/api/platform-settings"),

  // No-auth read for <title> / --brand-color, safe to call before login.
  getPublicBranding: () => api.get<{ branding: PublicBranding }>("/api/platform-settings/public"),

  set: (updates: Partial<{
    aiOcrEnabled: boolean;
    aiDocGenerationEnabled: boolean;
    platformName: string;
    brandingColor?: string;
    smtpHost?: string | null;
    smtpPort?: number | null;
    smtpUser?: string | null;
    smtpSecure?: boolean | null;
  }>) =>
    api.patch<{ message: string; settings: PlatformSettings }>("/api/platform-settings", updates),
};

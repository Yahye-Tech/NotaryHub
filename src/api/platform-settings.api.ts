import { api } from "./client.js";

export interface PlatformSettings {
  aiOcrEnabled: boolean;
  aiDocGenerationEnabled: boolean;
  updatedBy: string | null;
  updatedAt: string;
}

export const platformSettingsApi = {
  get: () => api.get<{ settings: PlatformSettings }>("/api/platform-settings"),

  set: (updates: Partial<{ aiOcrEnabled: boolean; aiDocGenerationEnabled: boolean }>) =>
    api.patch<{ message: string; settings: PlatformSettings }>("/api/platform-settings", updates),
};

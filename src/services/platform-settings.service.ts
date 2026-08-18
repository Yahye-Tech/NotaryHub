import { query } from "../db/pool.js";

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

// Subset that's safe to expose without authentication — just enough for the
// client shell to set <title> and the --brand-color CSS custom property
// before any user is logged in. Never include the AI flags, SMTP settings, or
// audit fields here.
export interface PublicBranding {
  platformName: string;
  brandingColor: string;
}

interface PlatformSettingsRow {
  ai_ocr_enabled: boolean;
  ai_doc_generation_enabled: boolean;
  platform_name: string;
  branding_color: string;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_user: string | null;
  smtp_secure: boolean | null;
  updated_by: string | null;
  updated_at: string;
}

const DEFAULT_PLATFORM_NAME = "NotaryHub";
const DEFAULT_BRANDING_COLOR = "#2563EB";
const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i;

function envSmtpPort(): number | null {
  const value = Number.parseInt(process.env.SMTP_PORT || "", 10);
  return Number.isInteger(value) && value >= 1 && value <= 65535 ? value : null;
}

function envSmtpSecure(): boolean | null {
  if (process.env.SMTP_SECURE === undefined) return null;
  return process.env.SMTP_SECURE === "true";
}

function toPlatformSettings(row: PlatformSettingsRow): PlatformSettings {
  return {
    aiOcrEnabled: row.ai_ocr_enabled,
    aiDocGenerationEnabled: row.ai_doc_generation_enabled,
    platformName: row.platform_name,
    brandingColor: row.branding_color,
    smtpHost: row.smtp_host ?? process.env.SMTP_HOST ?? null,
    smtpPort: row.smtp_port ?? envSmtpPort(),
    smtpUser: row.smtp_user ?? process.env.SMTP_USER ?? null,
    smtpSecure: row.smtp_secure ?? envSmtpSecure(),
    // The password is deliberately never persisted in platform_settings.
    smtpPasswordConfigured: Boolean(process.env.SMTP_PASS),
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
  };
}

function defaultPlatformSettings(): PlatformSettings {
  return {
    aiOcrEnabled: true,
    aiDocGenerationEnabled: true,
    platformName: DEFAULT_PLATFORM_NAME,
    brandingColor: DEFAULT_BRANDING_COLOR,
    smtpHost: process.env.SMTP_HOST ?? null,
    smtpPort: envSmtpPort(),
    smtpUser: process.env.SMTP_USER ?? null,
    smtpSecure: envSmtpSecure(),
    smtpPasswordConfigured: Boolean(process.env.SMTP_PASS),
    updatedBy: null,
    updatedAt: new Date().toISOString(),
  };
}

const SETTINGS_SELECT = `
  SELECT ai_ocr_enabled, ai_doc_generation_enabled, platform_name, branding_color,
         smtp_host, smtp_port, smtp_user, smtp_secure, updated_by, updated_at
  FROM platform_settings WHERE id = 1`;

export async function getPlatformSettings(): Promise<PlatformSettings> {
  const { rows } = await query<PlatformSettingsRow>(SETTINGS_SELECT);
  return rows.length === 0 ? defaultPlatformSettings() : toPlatformSettings(rows[0]);
}

// Unauthenticated read used by the client shell on every page load (including
// pre-login) to set document.title and the --brand-color CSS custom property.
// Deliberately returns only the two branding fields.
export async function getPublicBranding(): Promise<PublicBranding> {
  const { rows } = await query<{ platform_name: string; branding_color: string }>(
    `SELECT platform_name, branding_color FROM platform_settings WHERE id = 1`
  );
  if (rows.length === 0) {
    return { platformName: DEFAULT_PLATFORM_NAME, brandingColor: DEFAULT_BRANDING_COLOR };
  }
  return { platformName: rows[0].platform_name, brandingColor: rows[0].branding_color };
}

export async function setPlatformSettings(
  updates: Partial<{
    aiOcrEnabled: boolean;
    aiDocGenerationEnabled: boolean;
    platformName: string;
    brandingColor: string;
    smtpHost: string | null;
    smtpPort: number | null;
    smtpUser: string | null;
    smtpSecure: boolean | null;
  }>,
  updatedBy: string
): Promise<PlatformSettings> {
  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (updates.aiOcrEnabled !== undefined) {
    sets.push(`ai_ocr_enabled = $${idx++}`);
    params.push(updates.aiOcrEnabled);
  }
  if (updates.aiDocGenerationEnabled !== undefined) {
    sets.push(`ai_doc_generation_enabled = $${idx++}`);
    params.push(updates.aiDocGenerationEnabled);
  }
  if (updates.platformName !== undefined) {
    const trimmed = updates.platformName.trim();
    if (trimmed.length < 1 || trimmed.length > 60) {
      throw Object.assign(new Error("platformName must be 1-60 characters"), { code: "VALIDATION_ERROR" });
    }
    sets.push(`platform_name = $${idx++}`);
    params.push(trimmed);
  }
  if (updates.brandingColor !== undefined) {
    if (!HEX_COLOR_RE.test(updates.brandingColor)) {
      throw Object.assign(new Error("brandingColor must be a 6-digit hex color, e.g. #2563EB"), { code: "VALIDATION_ERROR" });
    }
    sets.push(`branding_color = $${idx++}`);
    params.push(updates.brandingColor);
  }
  if (updates.smtpHost !== undefined) {
    const host = updates.smtpHost?.trim() || null;
    if (host && host.length > 255) {
      throw Object.assign(new Error("smtpHost must be at most 255 characters"), { code: "VALIDATION_ERROR" });
    }
    sets.push(`smtp_host = $${idx++}`);
    params.push(host);
  }
  if (updates.smtpPort !== undefined) {
    const port = updates.smtpPort;
    if (port !== null && (!Number.isInteger(port) || port < 1 || port > 65535)) {
      throw Object.assign(new Error("smtpPort must be between 1 and 65535"), { code: "VALIDATION_ERROR" });
    }
    sets.push(`smtp_port = $${idx++}`);
    params.push(port);
  }
  if (updates.smtpUser !== undefined) {
    const user = updates.smtpUser?.trim() || null;
    if (user && user.length > 255) {
      throw Object.assign(new Error("smtpUser must be at most 255 characters"), { code: "VALIDATION_ERROR" });
    }
    sets.push(`smtp_user = $${idx++}`);
    params.push(user);
  }
  if (updates.smtpSecure !== undefined) {
    sets.push(`smtp_secure = $${idx++}`);
    params.push(updates.smtpSecure);
  }

  if (sets.length === 0) {
    return getPlatformSettings();
  }

  sets.push(`updated_by = $${idx++}`);
  params.push(updatedBy);

  const { rows } = await query<PlatformSettingsRow>(
    `UPDATE platform_settings SET ${sets.join(", ")} WHERE id = 1
     RETURNING ai_ocr_enabled, ai_doc_generation_enabled, platform_name, branding_color,
               smtp_host, smtp_port, smtp_user, smtp_secure, updated_by, updated_at`,
    params
  );
  return toPlatformSettings(rows[0]);
}

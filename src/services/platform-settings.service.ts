import { query } from "../db/pool.js";

export interface PlatformSettings {
  aiOcrEnabled: boolean;
  aiDocGenerationEnabled: boolean;
  platformName: string;
  brandingColor: string;
  updatedBy: string | null;
  updatedAt: string;
}

// Subset that's safe to expose without authentication — just enough for the
// client shell to set <title> and the --brand-color CSS custom property
// before any user is logged in. Never include the AI flags or audit fields
// here; those stay behind SUPER_ADMIN auth in the full record above.
export interface PublicBranding {
  platformName: string;
  brandingColor: string;
}

interface PlatformSettingsRow {
  ai_ocr_enabled: boolean;
  ai_doc_generation_enabled: boolean;
  platform_name: string;
  branding_color: string;
  updated_by: string | null;
  updated_at: string;
}

const DEFAULT_PLATFORM_NAME = "NotaryHub";
const DEFAULT_BRANDING_COLOR = "#2563EB";
const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i;

function toPlatformSettings(row: PlatformSettingsRow): PlatformSettings {
  return {
    aiOcrEnabled: row.ai_ocr_enabled,
    aiDocGenerationEnabled: row.ai_doc_generation_enabled,
    platformName: row.platform_name,
    brandingColor: row.branding_color,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
  };
}

export async function getPlatformSettings(): Promise<PlatformSettings> {
  const { rows } = await query<PlatformSettingsRow>(
    `SELECT ai_ocr_enabled, ai_doc_generation_enabled, platform_name, branding_color, updated_by, updated_at
     FROM platform_settings WHERE id = 1`
  );
  // The singleton row is seeded by the migration, but fall back defensively
  // rather than throwing if it's ever missing (e.g. a fresh DB mid-migration).
  if (rows.length === 0) {
    return {
      aiOcrEnabled: true,
      aiDocGenerationEnabled: true,
      platformName: DEFAULT_PLATFORM_NAME,
      brandingColor: DEFAULT_BRANDING_COLOR,
      updatedBy: null,
      updatedAt: new Date().toISOString(),
    };
  }
  return toPlatformSettings(rows[0]);
}

// Unauthenticated read used by the client shell on every page load (including
// pre-login) to set document.title and the --brand-color CSS custom property.
// Deliberately returns only the two branding fields — never the AI flags,
// updatedBy, or updatedAt, which are SUPER_ADMIN-only via getPlatformSettings.
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
  if (sets.length === 0) {
    return getPlatformSettings();
  }

  sets.push(`updated_by = $${idx++}`);
  params.push(updatedBy);

  const { rows } = await query<PlatformSettingsRow>(
    `UPDATE platform_settings SET ${sets.join(", ")} WHERE id = 1
     RETURNING ai_ocr_enabled, ai_doc_generation_enabled, platform_name, branding_color, updated_by, updated_at`,
    params
  );
  return toPlatformSettings(rows[0]);
}

import { query } from "../db/pool.js";

export interface PlatformSettings {
  aiOcrEnabled: boolean;
  aiDocGenerationEnabled: boolean;
  updatedBy: string | null;
  updatedAt: string;
}

interface PlatformSettingsRow {
  ai_ocr_enabled: boolean;
  ai_doc_generation_enabled: boolean;
  updated_by: string | null;
  updated_at: string;
}

function toPlatformSettings(row: PlatformSettingsRow): PlatformSettings {
  return {
    aiOcrEnabled: row.ai_ocr_enabled,
    aiDocGenerationEnabled: row.ai_doc_generation_enabled,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
  };
}

export async function getPlatformSettings(): Promise<PlatformSettings> {
  const { rows } = await query<PlatformSettingsRow>(
    `SELECT ai_ocr_enabled, ai_doc_generation_enabled, updated_by, updated_at
     FROM platform_settings WHERE id = 1`
  );
  // The singleton row is seeded by the migration, but fall back defensively
  // rather than throwing if it's ever missing (e.g. a fresh DB mid-migration).
  if (rows.length === 0) {
    return { aiOcrEnabled: true, aiDocGenerationEnabled: true, updatedBy: null, updatedAt: new Date().toISOString() };
  }
  return toPlatformSettings(rows[0]);
}

export async function setPlatformSettings(
  updates: Partial<{ aiOcrEnabled: boolean; aiDocGenerationEnabled: boolean }>,
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
  if (sets.length === 0) {
    return getPlatformSettings();
  }

  sets.push(`updated_by = $${idx++}`);
  params.push(updatedBy);

  const { rows } = await query<PlatformSettingsRow>(
    `UPDATE platform_settings SET ${sets.join(", ")} WHERE id = 1
     RETURNING ai_ocr_enabled, ai_doc_generation_enabled, updated_by, updated_at`,
    params
  );
  return toPlatformSettings(rows[0]);
}

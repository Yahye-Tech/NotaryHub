import { createHash, randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";
import { query } from "../db/pool.js";

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
]);

const MAX_FILE_BYTES = 10 * 1024 * 1024;

export interface FileUploadRecord {
  id: string;
  tenant_id: string;
  branch_id: string | null;
  customer_id: string | null;
  document_id: string | null;
  uploaded_by: string;
  original_name: string;
  stored_name: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  category: string | null;
  file_hash: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  uploader_name?: string | null;
}

export interface CreateFileUploadInput {
  tenantId: string;
  uploadedBy: string;
  originalName: string;
  mimeType: string;
  contentBase64: string;
  category?: string;
  branchId?: string;
  customerId?: string;
  documentId?: string;
}

export interface ListFileUploadsFilters {
  tenantId: string;
  uploadedBy?: string;
  customerId?: string;
  branchId?: string;
  category?: string;
  limit?: number;
  offset?: number;
}

function getUploadRoot(): string {
  return process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
}

function sanitizeFileName(name: string): string {
  const base = path.basename(name).replace(/[^a-zA-Z0-9._-]/g, "_");
  return base.slice(0, 200) || "upload.bin";
}

function normalizeMimeType(mimeType: string): string {
  const normalized = mimeType.toLowerCase().trim();
  if (normalized === "image/jpg") return "image/jpeg";
  return normalized;
}

export async function ensureUploadRoot(): Promise<void> {
  await fs.mkdir(getUploadRoot(), { recursive: true });
}

export async function getFileUploads(
  filters: ListFileUploadsFilters
): Promise<{ uploads: FileUploadRecord[]; total: number }> {
  const conditions = ["f.tenant_id = $1", "f.is_deleted = FALSE"];
  const params: unknown[] = [filters.tenantId];
  let p = 2;

  if (filters.uploadedBy) {
    conditions.push(`f.uploaded_by = $${p++}`);
    params.push(filters.uploadedBy);
  }
  if (filters.customerId) {
    conditions.push(`f.customer_id = $${p++}`);
    params.push(filters.customerId);
  }
  if (filters.branchId) {
    conditions.push(`f.branch_id = $${p++}`);
    params.push(filters.branchId);
  }
  if (filters.category) {
    conditions.push(`f.category = $${p++}`);
    params.push(filters.category);
  }

  const where = conditions.join(" AND ");
  const limit = Math.min(filters.limit ?? 100, 200);
  const offset = filters.offset ?? 0;

  const { rows } = await query<FileUploadRecord>(
    `SELECT f.*, u.full_name AS uploader_name
     FROM file_uploads f
     LEFT JOIN users u ON u.id = f.uploaded_by
     WHERE ${where}
     ORDER BY f.created_at DESC
     LIMIT $${p} OFFSET $${p + 1}`,
    [...params, limit, offset]
  );

  const { rows: countRows } = await query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM file_uploads f WHERE ${where}`,
    params
  );

  return {
    uploads: rows.map(r => ({ ...r, size_bytes: Number(r.size_bytes) })),
    total: parseInt(countRows[0]?.count ?? "0", 10),
  };
}

export async function getFileUploadById(
  uploadId: string,
  tenantId: string
): Promise<FileUploadRecord | null> {
  const { rows } = await query<FileUploadRecord>(
    `SELECT f.*, u.full_name AS uploader_name
     FROM file_uploads f
     LEFT JOIN users u ON u.id = f.uploaded_by
     WHERE f.id = $1 AND f.tenant_id = $2 AND f.is_deleted = FALSE`,
    [uploadId, tenantId]
  );
  const row = rows[0];
  if (!row) return null;
  return { ...row, size_bytes: Number(row.size_bytes) };
}

export async function createFileUpload(
  input: CreateFileUploadInput
): Promise<FileUploadRecord> {
  const mimeType = normalizeMimeType(input.mimeType);
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error("INVALID_MIME_TYPE");
  }

  const buffer = Buffer.from(input.contentBase64, "base64");
  if (buffer.length === 0) {
    throw new Error("EMPTY_FILE");
  }
  if (buffer.length > MAX_FILE_BYTES) {
    throw new Error("FILE_TOO_LARGE");
  }

  await ensureUploadRoot();

  const fileHash = createHash("sha256").update(buffer).digest("hex");
  const storedName = `${randomUUID()}-${sanitizeFileName(input.originalName)}`;
  const tenantDir = path.join(getUploadRoot(), input.tenantId);
  await fs.mkdir(tenantDir, { recursive: true });
  const absolutePath = path.join(tenantDir, storedName);
  const storagePath = path.relative(getUploadRoot(), absolutePath).replace(/\\/g, "/");

  await fs.writeFile(absolutePath, buffer);

  const { rows } = await query<FileUploadRecord>(
    `INSERT INTO file_uploads (
       tenant_id, branch_id, customer_id, document_id,
       uploaded_by, original_name, stored_name, storage_path,
       mime_type, size_bytes, category, file_hash
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING *`,
    [
      input.tenantId,
      input.branchId ?? null,
      input.customerId ?? null,
      input.documentId ?? null,
      input.uploadedBy,
      input.originalName.trim(),
      storedName,
      storagePath,
      mimeType,
      buffer.length,
      input.category?.trim() ?? null,
      fileHash,
    ]
  );

  const created = await getFileUploadById(rows[0].id, input.tenantId);
  return created ?? { ...rows[0], size_bytes: Number(rows[0].size_bytes) };
}

export async function getFileUploadAbsolutePath(
  upload: FileUploadRecord
): Promise<string> {
  const absolute = path.resolve(getUploadRoot(), upload.storage_path);
  const root = path.resolve(getUploadRoot());
  if (!absolute.startsWith(root)) {
    throw new Error("INVALID_STORAGE_PATH");
  }
  return absolute;
}

export async function deleteFileUpload(
  uploadId: string,
  tenantId: string,
  deletedBy: string
): Promise<void> {
  const existing = await getFileUploadById(uploadId, tenantId);
  if (!existing) throw new Error("UPLOAD_NOT_FOUND");

  await query(
    `UPDATE file_uploads SET
       is_deleted = TRUE,
       deleted_at = NOW(),
       deleted_by = $3,
       updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2`,
    [uploadId, tenantId, deletedBy]
  );

  try {
    const absolutePath = await getFileUploadAbsolutePath(existing);
    await fs.unlink(absolutePath);
  } catch {
    // File may already be missing on disk; DB record is still soft-deleted.
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

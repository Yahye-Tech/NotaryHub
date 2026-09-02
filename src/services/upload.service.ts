import { createHash, randomUUID } from "crypto";
import path from "path";
import { query } from "../db/pool.js";
import { getStorageAdapter } from "./storage-adapter.js";

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

function sanitizeFileName(name: string): string {
  const base = path.basename(name).replace(/[^a-zA-Z0-9._-]/g, "_");
  return base.slice(0, 200) || "upload.bin";
}

function normalizeMimeType(mimeType: string): string {
  const normalized = mimeType.toLowerCase().trim();
  if (normalized === "image/jpg") return "image/jpeg";
  return normalized;
}

function detectMimeType(buffer: Buffer): string | null {
  if (buffer.subarray(0, 5).toString("ascii") === "%PDF-") return "application/pdf";
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  return null;
}

export async function ensureUploadRoot(): Promise<void> {
  await getStorageAdapter().verify();
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
  const declaredMimeType = normalizeMimeType(input.mimeType);
  if (!ALLOWED_MIME_TYPES.has(declaredMimeType)) {
    throw new Error("INVALID_MIME_TYPE");
  }

  const encodedContent = input.contentBase64.replace(/^data:[^;]+;base64,/, "");
  const buffer = Buffer.from(encodedContent, "base64");
  if (buffer.length === 0) {
    throw new Error("EMPTY_FILE");
  }
  if (buffer.length > MAX_FILE_BYTES) {
    throw new Error("FILE_TOO_LARGE");
  }

  const detectedMimeType = detectMimeType(buffer);
  if (!detectedMimeType || detectedMimeType !== declaredMimeType) {
    throw new Error("INVALID_FILE_CONTENT");
  }

  const fileHash = createHash("sha256").update(buffer).digest("hex");
  const storedName = `${randomUUID()}-${sanitizeFileName(input.originalName)}`;
  // storagePath is a logical key (tenant-scoped), not a filesystem path — the
  // active storage adapter (local disk or S3-compatible) resolves it however
  // is appropriate for that backend.
  const storagePath = `${input.tenantId}/${storedName}`;
  const storage = getStorageAdapter();

  await storage.write(storagePath, buffer);

  try {
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
        declaredMimeType,
        buffer.length,
        input.category?.trim() ?? null,
        fileHash,
      ]
    );

    const created = await getFileUploadById(rows[0].id, input.tenantId);
    return created ?? { ...rows[0], size_bytes: Number(rows[0].size_bytes) };
  } catch (error) {
    try {
      await storage.delete(storagePath);
    } catch (cleanupError) {
      console.error("[Uploads] Failed to clean up orphaned file:", cleanupError);
    }
    throw error;
  }
}

// Streams the file directly to the HTTP response via the active storage
// adapter (local disk sendFile, or an S3 GetObject stream piped through).
export async function sendFileUploadToResponse(
  upload: FileUploadRecord,
  res: import("express").Response
): Promise<void> {
  await getStorageAdapter().sendToResponse(upload.storage_path, res);
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
    await getStorageAdapter().delete(existing.storage_path);
  } catch {
    // File may already be missing from storage; DB record is still soft-deleted.
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

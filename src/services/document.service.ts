import { query, withTransaction } from "../db/pool.js";
import crypto from "crypto";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DocumentStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "signed"
  | "notarised"
  | "rejected"
  | "expired"
  | "revoked";

export type DocumentType =
  | "POWER_OF_ATTORNEY"
  | "AFFIDAVIT"
  | "DEED"
  | "CONTRACT"
  | "WILL"
  | "STATUTORY_DECLARATION"
  | "CERTIFIED_COPY"
  | "AUTHENTICATION"
  | "APOSTILLE"
  | "OTHER";

export interface DocumentRecord {
  id: string;
  tenant_id: string;
  branch_id: string;
  customer_id: string | null;
  processed_by: string | null;
  reviewed_by: string | null;
  document_number: string;
  title: string;
  doc_type: DocumentType;
  status: DocumentStatus;
  content: string | null;
  summary: string | null;
  jurisdiction: string | null;
  language: string;
  file_url: string | null;
  seal_code: string | null;
  ai_generated: boolean;
  rejection_reason: string | null;
  issued_at: string | null;
  expires_at: string | null;
  signed_at: string | null;
  notarised_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  is_deleted: boolean;
  // Joined fields
  customer_name?: string | null;
  processed_by_name?: string | null;
  reviewed_by_name?: string | null;
}

// ─── Valid status transitions ─────────────────────────────────────────────────
// Enforced server-side. A document cannot skip stages.

const ALLOWED_TRANSITIONS: Record<DocumentStatus, DocumentStatus[]> = {
  draft:          ["pending_review", "rejected"],
  pending_review: ["approved", "rejected"],
  approved:       ["signed", "rejected"],
  signed:         ["notarised", "rejected"],
  notarised:      ["revoked"],  // only allowed by SUPER_ADMIN
  rejected:       ["draft"],    // can be re-opened
  expired:        [],
  revoked:        [],
};

// ─── Document number generator ────────────────────────────────────────────────
// Format: {SUBDOMAIN_PREFIX}-{YYYY}-{SEQUENCE}
// Example: BOS-2026-000042
// Sequence is per-tenant, auto-incrementing

async function generateDocumentNumber(tenantId: string): Promise<string> {
  // Get tenant subdomain prefix (first 3 chars uppercase)
  const { rows: tenantRows } = await query<{ subdomain: string }>(
    `SELECT subdomain FROM tenants WHERE id = $1`,
    [tenantId]
  );
  const subdomain = tenantRows[0]?.subdomain ?? "DOC";
  const prefix = subdomain.replace(/-/g, "").slice(0, 3).toUpperCase();
  const year = new Date().getFullYear();

  // Get current count for this tenant this year
  const { rows: countRows } = await query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM documents
     WHERE tenant_id = $1
       AND EXTRACT(YEAR FROM created_at) = $2`,
    [tenantId, year]
  );
  const seq = parseInt(countRows[0]?.count ?? "0", 10) + 1;
  const padded = String(seq).padStart(6, "0");

  return `${prefix}-${year}-${padded}`;
}

// ─── Seal code generator ──────────────────────────────────────────────────────
// Cryptographically random, globally unique
function generateSealCode(): string {
  const rand = crypto.randomBytes(6).toString("hex").toUpperCase();
  return `NOTARY-SEAL-${rand}`;
}

// ─── Read ──────────────────────────────────────────────────────────────────────

export async function getDocumentsByTenant(
  tenantId: string,
  filters: {
    status?: DocumentStatus;
    docType?: DocumentType;
    branchId?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ documents: DocumentRecord[]; total: number }> {
  const conditions: string[] = ["d.tenant_id = $1", "d.is_deleted = FALSE"];
  const params: unknown[] = [tenantId];
  let p = 2;

  if (filters.status) {
    conditions.push(`d.status = $${p++}`);
    params.push(filters.status);
  }
  if (filters.docType) {
    conditions.push(`d.doc_type = $${p++}`);
    params.push(filters.docType);
  }
  if (filters.branchId) {
    conditions.push(`d.branch_id = $${p++}`);
    params.push(filters.branchId);
  }

  const where = conditions.join(" AND ");
  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;

  const { rows } = await query<DocumentRecord>(
    `SELECT
       d.*,
       c.full_name   AS customer_name,
       pb.full_name  AS processed_by_name,
       rb.full_name  AS reviewed_by_name
     FROM documents d
     LEFT JOIN customers c ON c.id = d.customer_id
     LEFT JOIN users pb ON pb.id = d.processed_by
     LEFT JOIN users rb ON rb.id = d.reviewed_by
     WHERE ${where}
     ORDER BY d.created_at DESC
     LIMIT $${p} OFFSET $${p + 1}`,
    [...params, limit, offset]
  );

  const { rows: countRows } = await query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM documents d WHERE ${where}`,
    params
  );

  return {
    documents: rows,
    total: parseInt(countRows[0]?.count ?? "0", 10),
  };
}

export async function getDocumentsByBranch(
  branchId: string,
  tenantId: string
): Promise<DocumentRecord[]> {
  const { rows } = await query<DocumentRecord>(
    `SELECT
       d.*,
       c.full_name   AS customer_name,
       pb.full_name  AS processed_by_name,
       rb.full_name  AS reviewed_by_name
     FROM documents d
     LEFT JOIN customers c ON c.id = d.customer_id
     LEFT JOIN users pb ON pb.id = d.processed_by
     LEFT JOIN users rb ON rb.id = d.reviewed_by
     WHERE d.branch_id = $1
       AND d.tenant_id = $2
       AND d.is_deleted = FALSE
     ORDER BY d.created_at DESC`,
    [branchId, tenantId]
  );
  return rows;
}

export async function getDocumentById(
  documentId: string,
  tenantId: string
): Promise<DocumentRecord | null> {
  const { rows } = await query<DocumentRecord>(
    `SELECT
       d.*,
       c.full_name   AS customer_name,
       pb.full_name  AS processed_by_name,
       rb.full_name  AS reviewed_by_name
     FROM documents d
     LEFT JOIN customers c ON c.id = d.customer_id
     LEFT JOIN users pb ON pb.id = d.processed_by
     LEFT JOIN users rb ON rb.id = d.reviewed_by
     WHERE d.id = $1
       AND d.tenant_id = $2
       AND d.is_deleted = FALSE`,
    [documentId, tenantId]
  );
  return rows[0] ?? null;
}

// ─── Create ────────────────────────────────────────────────────────────────────

export interface CreateDocumentInput {
  tenantId: string;
  branchId: string;
  customerId?: string;
  processedBy: string;
  title: string;
  docType: DocumentType;
  content?: string;
  summary?: string;
  jurisdiction?: string;
  language?: string;
  aiGenerated?: boolean;
  expiresAt?: string;
}

export async function createDocument(input: CreateDocumentInput): Promise<DocumentRecord> {
  const documentNumber = await generateDocumentNumber(input.tenantId);

  const { rows } = await query<DocumentRecord>(
    `INSERT INTO documents (
       tenant_id, branch_id, customer_id, processed_by,
       document_number, title, doc_type, status,
       content, summary, jurisdiction, language,
       ai_generated, expires_at, created_by
     ) VALUES (
       $1, $2, $3, $4,
       $5, $6, $7, 'draft',
       $8, $9, $10, $11,
       $12, $13, $4
     )
     RETURNING *`,
    [
      input.tenantId,
      input.branchId,
      input.customerId ?? null,
      input.processedBy,
      documentNumber,
      input.title.trim(),
      input.docType,
      input.content ?? null,
      input.summary ?? null,
      input.jurisdiction ?? null,
      input.language ?? "en",
      input.aiGenerated ?? false,
      input.expiresAt ?? null,
    ]
  );

  return rows[0];
}

// ─── Update content ────────────────────────────────────────────────────────────

export async function updateDocumentContent(
  documentId: string,
  tenantId: string,
  updates: {
    title?: string;
    content?: string;
    summary?: string;
    jurisdiction?: string;
    customerId?: string;
    expiresAt?: string;
  }
): Promise<DocumentRecord> {
  const doc = await getDocumentById(documentId, tenantId);
  if (!doc) throw new Error("DOCUMENT_NOT_FOUND");

  if (!["draft", "rejected"].includes(doc.status)) {
    throw new Error("DOCUMENT_NOT_EDITABLE");
  }

  const { rows } = await query<DocumentRecord>(
    `UPDATE documents SET
       title        = COALESCE($3, title),
       content      = COALESCE($4, content),
       summary      = COALESCE($5, summary),
       jurisdiction = COALESCE($6, jurisdiction),
       customer_id  = COALESCE($7, customer_id),
       expires_at   = COALESCE($8, expires_at),
       updated_at   = NOW()
     WHERE id = $1 AND tenant_id = $2
     RETURNING *`,
    [
      documentId,
      tenantId,
      updates.title ?? null,
      updates.content ?? null,
      updates.summary ?? null,
      updates.jurisdiction ?? null,
      updates.customerId ?? null,
      updates.expiresAt ?? null,
    ]
  );
  return rows[0];
}

// ─── Status transitions ────────────────────────────────────────────────────────

export async function transitionDocumentStatus(
  documentId: string,
  tenantId: string,
  newStatus: DocumentStatus,
  actorId: string,
  meta: { rejectionReason?: string; reviewedBy?: string } = {}
): Promise<DocumentRecord> {
  const doc = await getDocumentById(documentId, tenantId);
  if (!doc) throw new Error("DOCUMENT_NOT_FOUND");

  const allowed = ALLOWED_TRANSITIONS[doc.status];
  if (!allowed.includes(newStatus)) {
    throw new Error(
      `INVALID_TRANSITION: Cannot move from '${doc.status}' to '${newStatus}'. Allowed: ${allowed.join(", ") || "none"}`
    );
  }

  // Build update fields based on target status
  const now = new Date().toISOString();
  let extraFields = "";
  const extraParams: unknown[] = [];
  let paramIdx = 4;

  if (newStatus === "approved" && meta.reviewedBy) {
    extraFields += `, reviewed_by = $${paramIdx++}`;
    extraParams.push(meta.reviewedBy);
  }
  if (newStatus === "signed") {
    extraFields += `, signed_at = $${paramIdx++}`;
    extraParams.push(now);
  }
  if (newStatus === "notarised") {
    const sealCode = generateSealCode();
    extraFields += `, notarised_at = $${paramIdx++}, seal_code = $${paramIdx++}, issued_at = $${paramIdx++}`;
    extraParams.push(now, sealCode, now);
  }
  if (newStatus === "rejected" && meta.rejectionReason) {
    extraFields += `, rejection_reason = $${paramIdx++}`;
    extraParams.push(meta.rejectionReason);
  }

  const { rows } = await query<DocumentRecord>(
    `UPDATE documents SET
       status     = $3,
       updated_at = NOW()
       ${extraFields}
     WHERE id = $1 AND tenant_id = $2
     RETURNING *`,
    [documentId, tenantId, newStatus, ...extraParams]
  );

  // Write to operational audit log
  await query(
    `INSERT INTO audit_logs (user_id, tenant_id, branch_id, action, resource_type, resource_id, resource_label, new_values)
     VALUES ($1, $2, $3, $4, 'document', $5, $6, $7)`,
    [
      actorId,
      tenantId,
      doc.branch_id,
      `DOCUMENT_${newStatus.toUpperCase()}`,
      documentId,
      doc.document_number,
      JSON.stringify({ from: doc.status, to: newStatus, ...(meta.rejectionReason ? { reason: meta.rejectionReason } : {}) }),
    ]
  );

  return rows[0];
}

// ─── Soft delete ───────────────────────────────────────────────────────────────

export async function deleteDocument(
  documentId: string,
  tenantId: string,
  deletedBy: string
): Promise<void> {
  const doc = await getDocumentById(documentId, tenantId);
  if (!doc) throw new Error("DOCUMENT_NOT_FOUND");

  if (["notarised", "signed"].includes(doc.status)) {
    throw new Error("DOCUMENT_LOCKED");
  }

  await query(
    `UPDATE documents
     SET is_deleted = TRUE, deleted_at = NOW(), deleted_by = $3, updated_at = NOW()
     WHERE id = $1 AND tenant_id = $2`,
    [documentId, tenantId, deletedBy]
  );
}

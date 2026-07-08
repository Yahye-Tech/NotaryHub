import { Router, type Request, type Response } from "express";
import { body, param } from "express-validator";
import { validationResult } from "express-validator";
import { requireAuth, requireMinRole } from "../middleware/auth.middleware.js";
import {
  getFileUploads,
  getFileUploadById,
  createFileUpload,
  deleteFileUpload,
  getFileUploadAbsolutePath,
} from "../services/upload.service.js";
import { writeAuditLog } from "../auth/auth.service.js";
import { query } from "../db/pool.js";
import fs from "fs/promises";

const router = Router();

function validate(req: Request, res: Response): boolean {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ error: "VALIDATION_ERROR", details: errors.array() });
    return false;
  }
  return true;
}

async function getEmployeeBranchId(userId: string): Promise<string | null> {
  const { rows } = await query<{ branch_id: string }>(
    `SELECT branch_id FROM employees WHERE user_id = $1 AND is_deleted = FALSE`,
    [userId]
  );
  return rows[0]?.branch_id ?? null;
}

async function getCustomerIdForUser(
  tenantId: string,
  userId: string,
  email: string
): Promise<string | null> {
  const { rows } = await query<{ id: string }>(
    `SELECT id FROM customers
     WHERE tenant_id = $1 AND is_deleted = FALSE
       AND (user_id = $2 OR email ILIKE $3)
     ORDER BY user_id NULLS LAST
     LIMIT 1`,
    [tenantId, userId, email]
  );
  return rows[0]?.id ?? null;
}

async function assertCanAccessUpload(req: Request, uploadId: string): Promise<boolean> {
  const tenantId = req.user!.tenantId;
  if (!tenantId) return false;

  const upload = await getFileUploadById(uploadId, tenantId);
  if (!upload) return false;

  if (req.user!.role === "CUSTOMER") {
    if (upload.uploaded_by === req.user!.sub) return true;
    const customerId = await getCustomerIdForUser(tenantId, req.user!.sub, req.user!.email);
    return customerId !== null && upload.customer_id === customerId;
  }

  if (req.user!.role === "EMPLOYEE" || req.user!.role === "BRANCH_ADMIN") {
    const branchId = await getEmployeeBranchId(req.user!.sub);
    return !branchId || upload.branch_id === null || upload.branch_id === branchId;
  }

  return true;
}

// GET /api/uploads
router.get("/", requireAuth, requireMinRole("CUSTOMER"), async (req: Request, res: Response) => {
  const { category, limit, offset } = req.query as Record<string, string>;

  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) {
      res.status(400).json({ error: "NO_TENANT", message: "No tenant associated with this account" });
      return;
    }

    const filters: Parameters<typeof getFileUploads>[0] = {
      tenantId,
      category,
      limit: limit ? parseInt(limit, 10) : 100,
      offset: offset ? parseInt(offset, 10) : 0,
    };

    if (req.user!.role === "CUSTOMER") {
      filters.uploadedBy = req.user!.sub;
    } else if (req.user!.role === "EMPLOYEE" || req.user!.role === "BRANCH_ADMIN") {
      filters.branchId = (await getEmployeeBranchId(req.user!.sub)) ?? undefined;
    }

    const result = await getFileUploads(filters);
    res.json(result);
  } catch (err: any) {
    console.error("[Uploads] List error:", err.message);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to load uploads" });
  }
});

// GET /api/uploads/:id
router.get("/:id", requireAuth, requireMinRole("CUSTOMER"), [
  param("id").isUUID(),
], async (req: Request, res: Response) => {
  if (!validate(req, res)) return;

  const tenantId = req.user!.tenantId;
  if (!tenantId) {
    res.status(400).json({ error: "NO_TENANT" });
    return;
  }

  const allowed = await assertCanAccessUpload(req, req.params.id);
  if (!allowed) {
    res.status(403).json({ error: "FORBIDDEN", message: "You cannot access this file" });
    return;
  }

  const upload = await getFileUploadById(req.params.id, tenantId);
  if (!upload) {
    res.status(404).json({ error: "NOT_FOUND", message: "Upload not found" });
    return;
  }

  res.json({ upload });
});

// GET /api/uploads/:id/download
router.get("/:id/download", requireAuth, requireMinRole("CUSTOMER"), [
  param("id").isUUID(),
], async (req: Request, res: Response) => {
  if (!validate(req, res)) return;

  const tenantId = req.user!.tenantId;
  if (!tenantId) {
    res.status(400).json({ error: "NO_TENANT" });
    return;
  }

  const allowed = await assertCanAccessUpload(req, req.params.id);
  if (!allowed) {
    res.status(403).json({ error: "FORBIDDEN", message: "You cannot download this file" });
    return;
  }

  const upload = await getFileUploadById(req.params.id, tenantId);
  if (!upload) {
    res.status(404).json({ error: "NOT_FOUND", message: "Upload not found" });
    return;
  }

  try {
    const absolutePath = await getFileUploadAbsolutePath(upload);
    await fs.access(absolutePath);
    res.setHeader("Content-Type", upload.mime_type);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${upload.original_name.replace(/"/g, "")}"`
    );
    res.sendFile(absolutePath);
  } catch {
    res.status(404).json({ error: "FILE_MISSING", message: "File not found on server" });
  }
});

// POST /api/uploads
router.post("/", requireAuth, requireMinRole("CUSTOMER"), [
  body("fileName").isString().trim().notEmpty(),
  body("mimeType").isString().trim().notEmpty(),
  body("contentBase64").isString().notEmpty(),
  body("category").optional().isString(),
  body("branchId").optional().isUUID(),
  body("customerId").optional().isUUID(),
  body("documentId").optional().isUUID(),
], async (req: Request, res: Response) => {
  if (!validate(req, res)) return;

  const tenantId = req.user!.tenantId;
  if (!tenantId) {
    res.status(400).json({ error: "NO_TENANT" });
    return;
  }

  try {
    let branchId = req.body.branchId as string | undefined;
    let customerId = req.body.customerId as string | undefined;

    if (req.user!.role === "CUSTOMER") {
      customerId = await getCustomerIdForUser(tenantId, req.user!.sub, req.user!.email) ?? undefined;
    } else if (req.user!.role === "EMPLOYEE" || req.user!.role === "BRANCH_ADMIN") {
      branchId = (await getEmployeeBranchId(req.user!.sub)) ?? branchId;
    }

    const upload = await createFileUpload({
      tenantId,
      uploadedBy: req.user!.sub,
      originalName: req.body.fileName,
      mimeType: req.body.mimeType,
      contentBase64: req.body.contentBase64,
      category: req.body.category,
      branchId,
      customerId,
      documentId: req.body.documentId,
    });

    await writeAuditLog({
      userId: req.user!.sub,
      tenantId,
      action: "FILE_UPLOADED",
      meta: { uploadId: upload.id, fileName: upload.original_name },
    });

    res.status(201).json({ message: "File uploaded", upload });
  } catch (err: any) {
    if (err.message === "INVALID_MIME_TYPE") {
      res.status(422).json({ error: "INVALID_MIME_TYPE", message: "Only PDF, JPG, and PNG files are allowed" });
      return;
    }
    if (err.message === "FILE_TOO_LARGE") {
      res.status(413).json({ error: "FILE_TOO_LARGE", message: "File exceeds the 10 MB limit" });
      return;
    }
    if (err.message === "EMPTY_FILE") {
      res.status(422).json({ error: "EMPTY_FILE", message: "Uploaded file is empty" });
      return;
    }
    console.error("[Uploads] Create error:", err.message);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to upload file" });
  }
});

// DELETE /api/uploads/:id
router.delete("/:id", requireAuth, requireMinRole("CUSTOMER"), [
  param("id").isUUID(),
], async (req: Request, res: Response) => {
  if (!validate(req, res)) return;

  const tenantId = req.user!.tenantId;
  if (!tenantId) {
    res.status(400).json({ error: "NO_TENANT" });
    return;
  }

  const allowed = await assertCanAccessUpload(req, req.params.id);
  if (!allowed) {
    res.status(403).json({ error: "FORBIDDEN", message: "You cannot delete this file" });
    return;
  }

  try {
    await deleteFileUpload(req.params.id, tenantId, req.user!.sub);
    res.json({ message: "File deleted" });
  } catch (err: any) {
    if (err.message === "UPLOAD_NOT_FOUND") {
      res.status(404).json({ error: "NOT_FOUND", message: "Upload not found" });
      return;
    }
    console.error("[Uploads] Delete error:", err.message);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to delete file" });
  }
});

export default router;

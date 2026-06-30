import { Router, type Request, type Response } from "express";
import { body, param, query as queryParam } from "express-validator";
import { validationResult } from "express-validator";
import { requireAuth, requireMinRole } from "../middleware/auth.middleware.js";
import {
  getDocumentsByTenant,
  getDocumentsByBranch,
  getDocumentById,
  createDocument,
  updateDocumentContent,
  transitionDocumentStatus,
  deleteDocument,
  type DocumentStatus,
  type DocumentType,
} from "../services/document.service.js";
import { writeAuditLog } from "../auth/auth.service.js";

const router = Router();

function validate(req: Request, res: Response): boolean {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ error: "VALIDATION_ERROR", details: errors.array() });
    return false;
  }
  return true;
}

function getIp(req: Request): string {
  return (
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket.remoteAddress || "unknown"
  );
}

// ─── Tenant scope guard ────────────────────────────────────────────────────────
function getTenantId(req: Request): string {
  if (req.user!.role === "SUPER_ADMIN") {
    return req.params.tenantId ?? req.query.tenantId as string;
  }
  return req.user!.tenantId!;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/documents
// List documents for the caller's tenant (filtered by status, type, branch)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/", requireAuth, requireMinRole("EMPLOYEE"), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId;
  if (!tenantId && req.user!.role !== "SUPER_ADMIN") {
    res.status(400).json({ error: "NO_TENANT", message: "No tenant associated with this account" });
    return;
  }

  const { status, docType, branchId, limit, offset } = req.query as Record<string, string>;

  // EMPLOYEE and BRANCH_ADMIN can only see their branch's documents
  let scopedBranchId = branchId;
  if (req.user!.role === "EMPLOYEE" || req.user!.role === "BRANCH_ADMIN") {
    const { rows } = await import("../db/pool.js").then(m =>
      m.query<{ branch_id: string }>(
        `SELECT branch_id FROM employees WHERE user_id = $1 AND is_deleted = FALSE`,
        [req.user!.sub]
      )
    );
    scopedBranchId = rows[0]?.branch_id;
  }

  try {
    if (scopedBranchId && req.user!.role !== "COMPANY_ADMIN" && req.user!.role !== "SUPER_ADMIN") {
      const documents = await getDocumentsByBranch(scopedBranchId, tenantId!);
      res.json({ documents, total: documents.length });
    } else {
      const result = await getDocumentsByTenant(tenantId!, {
        status: status as DocumentStatus,
        docType: docType as DocumentType,
        branchId: scopedBranchId,
        limit: limit ? parseInt(limit, 10) : 50,
        offset: offset ? parseInt(offset, 10) : 0,
      });
      res.json(result);
    }
  } catch (err: any) {
    console.error("[Documents] List error:", err.message);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to load documents" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/documents/:id
// ─────────────────────────────────────────────────────────────────────────────
router.get("/:id", requireAuth, requireMinRole("EMPLOYEE"),
  [param("id").isUUID()],
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;

    const tenantId = req.user!.tenantId;
    if (!tenantId) {
      res.status(400).json({ error: "NO_TENANT" });
      return;
    }

    const doc = await getDocumentById(req.params.id, tenantId);
    if (!doc) {
      res.status(404).json({ error: "NOT_FOUND", message: "Document not found" });
      return;
    }
    res.json({ document: doc });
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/documents
// Create a new document (starts as draft)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/", requireAuth, requireMinRole("EMPLOYEE"), [
  body("branchId").isUUID().withMessage("Valid branchId required"),
  body("title").isString().trim().isLength({ min: 3, max: 255 }).withMessage("Title required (3-255 chars)"),
  body("docType").isIn([
    "POWER_OF_ATTORNEY","AFFIDAVIT","DEED","CONTRACT","WILL",
    "STATUTORY_DECLARATION","CERTIFIED_COPY","AUTHENTICATION","APOSTILLE","OTHER",
  ]).withMessage("Invalid document type"),
  body("content").optional().isString(),
  body("summary").optional().isString().isLength({ max: 500 }),
  body("jurisdiction").optional().isString().isLength({ max: 120 }),
  body("language").optional().isIn(["en", "so", "ar"]),
  body("customerId").optional().isUUID(),
  body("aiGenerated").optional().isBoolean(),
  body("expiresAt").optional().isISO8601(),
], async (req: Request, res: Response) => {
  if (!validate(req, res)) return;

  const tenantId = req.user!.tenantId;
  if (!tenantId) {
    res.status(400).json({ error: "NO_TENANT", message: "No tenant associated with your account" });
    return;
  }

  const {
    branchId, title, docType, content, summary,
    jurisdiction, language, customerId, aiGenerated, expiresAt,
  } = req.body;

  try {
    const document = await createDocument({
      tenantId,
      branchId,
      customerId,
      processedBy: req.user!.sub,
      title,
      docType,
      content,
      summary,
      jurisdiction,
      language,
      aiGenerated: aiGenerated ?? false,
      expiresAt,
    });

    await writeAuditLog({
      userId: req.user!.sub,
      tenantId,
      action: "DOCUMENT_CREATED",
      ipAddress: getIp(req),
      meta: { documentId: document.id, documentNumber: document.document_number, docType },
    });

    res.status(201).json({ message: "Document created", document });
  } catch (err: any) {
    if (err.message === "CUSTOMER_BLACKLISTED") {
      res.status(403).json({
        error: "CUSTOMER_BLACKLISTED",
        message: "This customer is blacklisted and cannot have new documents created for them",
      });
      return;
    }
    if (err.message === "CUSTOMER_NOT_FOUND") {
      res.status(404).json({ error: "CUSTOMER_NOT_FOUND", message: "Selected customer not found" });
      return;
    }
    console.error("[Documents] Create error:", err.message);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to create document" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/documents/:id
// Update content (only allowed in draft or rejected status)
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/:id", requireAuth, requireMinRole("EMPLOYEE"), [
  param("id").isUUID(),
  body("title").optional().isString().trim().isLength({ min: 3, max: 255 }),
  body("content").optional().isString(),
  body("summary").optional().isString().isLength({ max: 500 }),
  body("jurisdiction").optional().isString().isLength({ max: 120 }),
  body("customerId").optional().isUUID(),
  body("expiresAt").optional().isISO8601(),
], async (req: Request, res: Response) => {
  if (!validate(req, res)) return;

  const tenantId = req.user!.tenantId;
  if (!tenantId) {
    res.status(400).json({ error: "NO_TENANT" });
    return;
  }

  try {
    const document = await updateDocumentContent(req.params.id, tenantId, req.body);

    await writeAuditLog({
      userId: req.user!.sub,
      tenantId,
      action: "DOCUMENT_UPDATED",
      ipAddress: getIp(req),
      meta: { documentId: req.params.id },
    });

    res.json({ message: "Document updated", document });
  } catch (err: any) {
    const known: Record<string, [number, string]> = {
      DOCUMENT_NOT_FOUND:    [404, "Document not found"],
      DOCUMENT_NOT_EDITABLE: [409, "Only draft or rejected documents can be edited"],
    };
    const [status, message] = known[err.message] ?? [500, "Failed to update document"];
    res.status(status).json({ error: err.message, message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/documents/:id/transition
// Move document through workflow stages
// draft → pending_review → approved → signed → notarised
// ─────────────────────────────────────────────────────────────────────────────
router.post("/:id/transition", requireAuth, requireMinRole("EMPLOYEE"), [
  param("id").isUUID(),
  body("status").isIn([
    "draft","pending_review","approved","signed","notarised","rejected","revoked",
  ]).withMessage("Invalid status"),
  body("rejectionReason").optional().isString().isLength({ max: 500 }),
], async (req: Request, res: Response) => {
  if (!validate(req, res)) return;

  const tenantId = req.user!.tenantId;
  if (!tenantId) {
    res.status(400).json({ error: "NO_TENANT" });
    return;
  }

  const { status, rejectionReason } = req.body;

  // Role-based transition restrictions
  const userRole = req.user!.role;
  const restrictedTransitions: Record<string, string[]> = {
    approved:  ["BRANCH_ADMIN", "COMPANY_ADMIN", "SUPER_ADMIN"],
    notarised: ["BRANCH_ADMIN", "COMPANY_ADMIN", "SUPER_ADMIN"],
    revoked:   ["COMPANY_ADMIN", "SUPER_ADMIN"],
  };

  if (restrictedTransitions[status] && !restrictedTransitions[status].includes(userRole)) {
    res.status(403).json({
      error: "FORBIDDEN",
      message: `Only ${restrictedTransitions[status].join(" or ")} can set status to '${status}'`,
    });
    return;
  }

  // Rejection requires a reason
  if (status === "rejected" && !rejectionReason?.trim()) {
    res.status(422).json({
      error: "REJECTION_REASON_REQUIRED",
      message: "Please provide a reason for rejection",
    });
    return;
  }

  try {
    const document = await transitionDocumentStatus(
      req.params.id,
      tenantId,
      status as DocumentStatus,
      req.user!.sub,
      { rejectionReason, reviewedBy: req.user!.sub }
    );

    res.json({
      message: `Document moved to '${status}'`,
      document,
    });
  } catch (err: any) {
    if (err.message === "DOCUMENT_NOT_FOUND") {
      res.status(404).json({ error: "NOT_FOUND", message: "Document not found" });
    } else if (err.message?.startsWith("INVALID_TRANSITION")) {
      res.status(409).json({ error: "INVALID_TRANSITION", message: err.message });
    } else {
      console.error("[Documents] Transition error:", err.message);
      res.status(500).json({ error: "INTERNAL_ERROR", message: "Transition failed" });
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/documents/:id
// Soft-delete (blocked for notarised/signed documents)
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/:id", requireAuth, requireMinRole("COMPANY_ADMIN"), [
  param("id").isUUID(),
], async (req: Request, res: Response) => {
  if (!validate(req, res)) return;

  const tenantId = req.user!.tenantId;
  if (!tenantId) {
    res.status(400).json({ error: "NO_TENANT" });
    return;
  }

  try {
    await deleteDocument(req.params.id, tenantId, req.user!.sub);

    await writeAuditLog({
      userId: req.user!.sub,
      tenantId,
      action: "DOCUMENT_DELETED",
      ipAddress: getIp(req),
      meta: { documentId: req.params.id },
    });

    res.json({ message: "Document deleted" });
  } catch (err: any) {
    const known: Record<string, [number, string]> = {
      DOCUMENT_NOT_FOUND: [404, "Document not found"],
      DOCUMENT_LOCKED:    [409, "Notarised and signed documents cannot be deleted"],
    };
    const [status, message] = known[err.message] ?? [500, "Failed to delete document"];
    res.status(status).json({ error: err.message, message });
  }
});

export default router;

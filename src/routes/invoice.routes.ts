import { Router, type Request, type Response } from "express";
import { body, param, query as queryParam, validationResult } from "express-validator";
import { requireAuth, requireMinRole, requirePermission } from "../middleware/auth.middleware.js";
import {
  createInvoice,
  getInvoiceById,
  listInvoices,
  recordPayment,
  voidInvoice,
  getInvoiceStats,
  type PaymentMethod,
} from "../services/invoice.service.js";
import { writeAuditLog } from "../auth/auth.service.js";
import { createNotification, getCustomerUserId } from "../services/notification.service.js";

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

function getTenantId(req: Request): string | null {
  return req.user!.tenantId ?? null;
}

const PAYMENT_METHODS: PaymentMethod[] = ["card", "bank_transfer", "mobile_money", "cash", "other"];

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/invoices — list, filterable by branch/customer/status
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/",
  requireAuth,
  requireMinRole("EMPLOYEE"),
  requirePermission("MANAGE_INVOICES"),
  async (req: Request, res: Response) => {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      res.status(400).json({ error: "NO_TENANT" });
      return;
    }
    try {
      const { branchId, customerId, status, limit, offset } = req.query;
      const result = await listInvoices(tenantId, {
        branchId: branchId as string | undefined,
        customerId: customerId as string | undefined,
        status: status as any,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
      });
      res.json(result);
    } catch (err: any) {
      console.error("[Invoices] List error:", err.message);
      res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to list invoices" });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/invoices/stats — collection rate, totals
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/stats",
  requireAuth,
  requireMinRole("EMPLOYEE"),
  requirePermission("MANAGE_INVOICES"),
  async (req: Request, res: Response) => {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      res.status(400).json({ error: "NO_TENANT" });
      return;
    }
    try {
      const stats = await getInvoiceStats(tenantId, req.query.branchId as string | undefined);
      res.json(stats);
    } catch (err: any) {
      console.error("[Invoices] Stats error:", err.message);
      res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to load invoice stats" });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/invoices/:id
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/:id",
  requireAuth,
  requireMinRole("EMPLOYEE"),
  requirePermission("MANAGE_INVOICES"),
  [param("id").isUUID()],
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;
    const tenantId = getTenantId(req);
    if (!tenantId) {
      res.status(400).json({ error: "NO_TENANT" });
      return;
    }
    try {
      const invoice = await getInvoiceById(req.params.id, tenantId);
      res.json({ invoice });
    } catch (err: any) {
      if (err.message === "INVOICE_NOT_FOUND") {
        res.status(404).json({ error: "INVOICE_NOT_FOUND" });
        return;
      }
      console.error("[Invoices] Get error:", err.message);
      res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to load invoice" });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/invoices — create
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/",
  requireAuth,
  requireMinRole("EMPLOYEE"),
  requirePermission("MANAGE_INVOICES"),
  [
    body("customerId").isUUID(),
    body("branchId").optional().isUUID(),
    body("documentId").optional().isUUID(),
    body("items").isArray({ min: 1 }),
    body("items.*.description").isString().trim().isLength({ min: 1, max: 500 }),
    body("items.*.quantity").isInt({ min: 1 }),
    body("items.*.unitPriceCents").isInt({ min: 0 }),
    body("taxCents").optional().isInt({ min: 0 }),
    body("currency").optional().isString().isLength({ min: 3, max: 3 }),
    body("dueDate").isISO8601(),
    body("notes").optional().isString().isLength({ max: 2000 }),
    body("status").optional().isIn(["draft", "unpaid"]),
  ],
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;
    const tenantId = getTenantId(req);
    if (!tenantId) {
      res.status(400).json({ error: "NO_TENANT" });
      return;
    }

    try {
      const invoice = await createInvoice({
        tenantId,
        branchId: req.body.branchId ?? null,
        customerId: req.body.customerId,
        documentId: req.body.documentId ?? null,
        items: req.body.items,
        taxCents: req.body.taxCents,
        currency: req.body.currency,
        dueDate: req.body.dueDate,
        notes: req.body.notes ?? null,
        createdBy: req.user!.sub,
        status: req.body.status,
      });

      await writeAuditLog({
        userId: req.user!.sub,
        tenantId,
        action: "INVOICE_CREATED",
        ipAddress: getIp(req),
        meta: { invoiceId: invoice.id, invoiceNumber: invoice.invoice_number, totalCents: invoice.total_cents },
      });

      // Fire-and-forget: notify the customer if they have a portal login
      (async () => {
        try {
          const customerUserId = await getCustomerUserId(invoice.customer_id);
          if (customerUserId && invoice.status !== "draft") {
            await createNotification({
              userId: customerUserId,
              tenantId,
              type: "info",
              title: "New invoice issued",
              body: `Invoice ${invoice.invoice_number} for $${(invoice.total_cents / 100).toFixed(2)} is due ${invoice.due_date}.`,
              resourceType: "invoice",
              resourceId: invoice.id,
              sendEmail: true,
            });
          }
        } catch (notifErr: any) {
          console.error("[Invoices] Notify error:", notifErr.message);
        }
      })();

      res.status(201).json({ message: "Invoice created", invoice });
    } catch (err: any) {
      if (err.message === "CUSTOMER_NOT_FOUND") {
        res.status(404).json({ error: "CUSTOMER_NOT_FOUND", message: "Customer not found for this tenant" });
        return;
      }
      if (err.message === "INVOICE_NEEDS_ITEMS") {
        res.status(422).json({ error: "INVOICE_NEEDS_ITEMS", message: "At least one line item is required" });
        return;
      }
      console.error("[Invoices] Create error:", err.message);
      res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to create invoice" });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/invoices/:id/pay — record a payment
// ─────────────────────────────────────────────────────────────────────────────
router.patch(
  "/:id/pay",
  requireAuth,
  requireMinRole("EMPLOYEE"),
  requirePermission("MANAGE_INVOICES"),
  [param("id").isUUID(), body("paymentMethod").isIn(PAYMENT_METHODS)],
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;
    const tenantId = getTenantId(req);
    if (!tenantId) {
      res.status(400).json({ error: "NO_TENANT" });
      return;
    }

    try {
      const invoice = await recordPayment(req.params.id, tenantId, req.body.paymentMethod);

      await writeAuditLog({
        userId: req.user!.sub,
        tenantId,
        action: "INVOICE_PAID",
        ipAddress: getIp(req),
        meta: { invoiceId: invoice.id, invoiceNumber: invoice.invoice_number, paymentMethod: req.body.paymentMethod },
      });

      (async () => {
        try {
          const customerUserId = await getCustomerUserId(invoice.customer_id);
          if (customerUserId) {
            await createNotification({
              userId: customerUserId,
              tenantId,
              type: "success",
              title: "Payment received",
              body: `Your payment for invoice ${invoice.invoice_number} has been recorded. Thank you.`,
              resourceType: "invoice",
              resourceId: invoice.id,
              sendEmail: true,
            });
          }
        } catch (notifErr: any) {
          console.error("[Invoices] Payment notify error:", notifErr.message);
        }
      })();

      res.json({ message: "Payment recorded", invoice });
    } catch (err: any) {
      if (err.message === "INVOICE_NOT_PAYABLE") {
        res.status(409).json({ error: "INVOICE_NOT_PAYABLE", message: "Invoice is already paid or void" });
        return;
      }
      console.error("[Invoices] Pay error:", err.message);
      res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to record payment" });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/invoices/:id/void
// ─────────────────────────────────────────────────────────────────────────────
router.patch(
  "/:id/void",
  requireAuth,
  requireMinRole("COMPANY_ADMIN"),
  requirePermission("MANAGE_INVOICES"),
  [param("id").isUUID()],
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;
    const tenantId = getTenantId(req);
    if (!tenantId) {
      res.status(400).json({ error: "NO_TENANT" });
      return;
    }
    try {
      const invoice = await voidInvoice(req.params.id, tenantId);

      await writeAuditLog({
        userId: req.user!.sub,
        tenantId,
        action: "INVOICE_VOIDED",
        ipAddress: getIp(req),
        meta: { invoiceId: invoice.id, invoiceNumber: invoice.invoice_number },
      });

      res.json({ message: "Invoice voided", invoice });
    } catch (err: any) {
      if (err.message === "INVOICE_NOT_FOUND_OR_PAID") {
        res.status(409).json({ error: "INVOICE_NOT_FOUND_OR_PAID", message: "Invoice not found or already paid" });
        return;
      }
      console.error("[Invoices] Void error:", err.message);
      res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to void invoice" });
    }
  }
);

export default router;

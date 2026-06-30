import { Router, type Request, type Response } from "express";
import { body, param } from "express-validator";
import { validationResult } from "express-validator";
import { requireAuth, requireMinRole } from "../middleware/auth.middleware.js";
import {
  getCustomersByTenant,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerDocumentHistory,
  getCustomerActivity,
} from "../services/customer.service.js";
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

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/customers?search=
// ─────────────────────────────────────────────────────────────────────────────
router.get("/", requireAuth, requireMinRole("EMPLOYEE"), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId;
  if (!tenantId) {
    res.status(400).json({ error: "NO_TENANT" });
    return;
  }

  const { search } = req.query as { search?: string };

  try {
    const customers = await getCustomersByTenant(tenantId, search);
    res.json({ customers });
  } catch (err: any) {
    console.error("[Customers] List error:", err.message);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to load customers" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/customers/:id
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

    const customer = await getCustomerById(req.params.id, tenantId);
    if (!customer) {
      res.status(404).json({ error: "NOT_FOUND", message: "Customer not found" });
      return;
    }
    res.json({ customer });
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/customers
// ─────────────────────────────────────────────────────────────────────────────
router.post("/", requireAuth, requireMinRole("EMPLOYEE"), [
  body("fullName").isString().trim().isLength({ min: 2, max: 120 }).withMessage("Full name required"),
  body("email").optional().isEmail().normalizeEmail(),
  body("phone").optional().isString().trim().isLength({ min: 5, max: 30 }),
  body("dateOfBirth").optional().isISO8601(),
  body("nationality").optional().isString().trim().isLength({ max: 80 }),
  body("address").optional().isString().trim().isLength({ max: 255 }),
  body("city").optional().isString().trim().isLength({ max: 80 }),
  body("country").optional().isString().trim().isLength({ max: 80 }),
  body("idType").optional().isIn([
    "NATIONAL_ID","PASSPORT","DRIVERS_LICENSE","RESIDENCE_PERMIT","OTHER",
  ]),
  body("idNumber").optional().isString().trim().isLength({ max: 80 }),
  body("idIssueDate").optional().isISO8601(),
  body("idExpiryDate").optional().isISO8601(),
  body("idIssuingAuthority").optional().isString().trim().isLength({ max: 120 }),
  body("notes").optional().isString().trim().isLength({ max: 1000 }),
], async (req: Request, res: Response) => {
  if (!validate(req, res)) return;

  const tenantId = req.user!.tenantId;
  if (!tenantId) {
    res.status(400).json({ error: "NO_TENANT" });
    return;
  }

  try {
    const customer = await createCustomer(tenantId, req.body, req.user!.sub);

    await writeAuditLog({
      userId: req.user!.sub,
      tenantId,
      action: "CUSTOMER_CREATED",
      ipAddress: getIp(req),
      meta: { customerId: customer.id, fullName: customer.full_name },
    });

    res.status(201).json({ message: "Customer created", customer });
  } catch (err: any) {
    if (err.message === "CUSTOMER_EMAIL_TAKEN") {
      res.status(409).json({ error: "EMAIL_TAKEN", message: "A customer with this email already exists" });
    } else {
      console.error("[Customers] Create error:", err.message);
      res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to create customer" });
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/customers/:id
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/:id", requireAuth, requireMinRole("EMPLOYEE"), [
  param("id").isUUID(),
  body("fullName").optional().isString().trim().isLength({ min: 2, max: 120 }),
  body("email").optional().isEmail().normalizeEmail(),
  body("phone").optional().isString().trim().isLength({ min: 5, max: 30 }),
  body("status").optional().isIn(["active","suspended","blacklisted"]),
  body("blacklistReason").optional().isString().trim().isLength({ max: 500 }),
  body("notes").optional().isString().trim().isLength({ max: 1000 }),
], async (req: Request, res: Response) => {
  if (!validate(req, res)) return;

  const tenantId = req.user!.tenantId;
  if (!tenantId) {
    res.status(400).json({ error: "NO_TENANT" });
    return;
  }

  try {
    const customer = await updateCustomer(req.params.id, tenantId, req.body);

    await writeAuditLog({
      userId: req.user!.sub,
      tenantId,
      action: "CUSTOMER_UPDATED",
      ipAddress: getIp(req),
      meta: { customerId: req.params.id },
    });

    res.json({ message: "Customer updated", customer });
  } catch (err: any) {
    if (err.message === "CUSTOMER_NOT_FOUND") {
      res.status(404).json({ error: "NOT_FOUND", message: "Customer not found" });
    } else {
      console.error("[Customers] Update error:", err.message);
      res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to update customer" });
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/customers/:id/history
// Real document history + activity trail for this customer.
// Replaces the fake hardcoded `history` array that lived in frontend state.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/:id/history", requireAuth, requireMinRole("EMPLOYEE"),
  [param("id").isUUID()],
  async (req: Request, res: Response) => {
    if (!validate(req, res)) return;

    const tenantId = req.user!.tenantId;
    if (!tenantId) {
      res.status(400).json({ error: "NO_TENANT" });
      return;
    }

    const customer = await getCustomerById(req.params.id, tenantId);
    if (!customer) {
      res.status(404).json({ error: "NOT_FOUND", message: "Customer not found" });
      return;
    }

    try {
      const [documents, activity] = await Promise.all([
        getCustomerDocumentHistory(req.params.id, tenantId),
        getCustomerActivity(req.params.id, tenantId),
      ]);
      res.json({ documents, activity });
    } catch (err: any) {
      console.error("[Customers] History error:", err.message);
      res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to load customer history" });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/customers/:id
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
    await deleteCustomer(req.params.id, tenantId, req.user!.sub);

    await writeAuditLog({
      userId: req.user!.sub,
      tenantId,
      action: "CUSTOMER_DELETED",
      ipAddress: getIp(req),
      meta: { customerId: req.params.id },
    });

    res.json({ message: "Customer deleted" });
  } catch (err: any) {
    if (err.message === "CUSTOMER_NOT_FOUND") {
      res.status(404).json({ error: "NOT_FOUND", message: "Customer not found" });
    } else {
      console.error("[Customers] Delete error:", err.message);
      res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to delete customer" });
    }
  }
});

export default router;

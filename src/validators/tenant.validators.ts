import { body, param } from "express-validator";

// ─── Tenant ────────────────────────────────────────────────────────────────

export const createTenantValidator = [
  body("name")
    .isString().trim()
    .isLength({ min: 2, max: 120 }).withMessage("Name must be 2–120 characters"),

  body("subdomain")
    .isString().trim()
    .isLength({ min: 2, max: 63 }).withMessage("Subdomain must be 2–63 characters")
    .matches(/^[a-z0-9-]+$/).withMessage("Subdomain may only contain lowercase letters, numbers, and hyphens"),

  body("plan")
    .isIn(["Basic", "Professional", "Enterprise"]).withMessage("Plan must be Basic, Professional, or Enterprise"),

  body("email")
    .optional()
    .isEmail().withMessage("Valid email required")
    .normalizeEmail(),

  body("licenseNumber")
    .optional()
    .isString().trim()
    .isLength({ min: 3, max: 50 }).withMessage("License number must be 3–50 characters"),
];

export const updateTenantValidator = [
  param("tenantId")
    .isUUID().withMessage("Invalid tenantId"),

  body("name")
    .optional()
    .isString().trim()
    .isLength({ min: 2, max: 120 }).withMessage("Name must be 2–120 characters"),

  body("plan")
    .optional()
    .isIn(["Basic", "Professional", "Enterprise"]).withMessage("Invalid plan"),

  body("email")
    .optional()
    .isEmail().withMessage("Valid email required")
    .normalizeEmail(),

  body("licenseNumber")
    .optional()
    .isString().trim()
    .isLength({ min: 3, max: 50 }),

  body("status")
    .optional()
    .isIn(["active", "suspended"]).withMessage("Status must be active or suspended"),
];

// ─── Branch ────────────────────────────────────────────────────────────────

export const createBranchValidator = [
  param("tenantId")
    .isUUID().withMessage("Invalid tenantId"),

  body("name")
    .isString().trim()
    .isLength({ min: 2, max: 120 }).withMessage("Branch name must be 2–120 characters"),

  body("address")
    .isString().trim()
    .isLength({ min: 5, max: 255 }).withMessage("Address must be 5–255 characters"),

  body("phone")
    .optional()
    .isString().trim()
    .isLength({ min: 5, max: 30 }).withMessage("Phone must be 5–30 characters"),

  body("countersCount")
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage("Counters count must be 1–50"),
];

export const updateBranchValidator = [
  param("tenantId").isUUID().withMessage("Invalid tenantId"),
  param("branchId").isUUID().withMessage("Invalid branchId"),

  body("name")
    .optional()
    .isString().trim()
    .isLength({ min: 2, max: 120 }),

  body("address")
    .optional()
    .isString().trim()
    .isLength({ min: 5, max: 255 }),

  body("phone")
    .optional()
    .isString().trim()
    .isLength({ min: 5, max: 30 }),

  body("countersCount")
    .optional()
    .isInt({ min: 1, max: 50 }),

  body("status")
    .optional()
    .isIn(["active", "suspended", "archived"]).withMessage("Invalid status"),
];

// ─── Employee ──────────────────────────────────────────────────────────────

export const createEmployeeValidator = [
  param("tenantId").isUUID().withMessage("Invalid tenantId"),
  param("branchId").isUUID().withMessage("Invalid branchId"),

  body("email")
    .isEmail().withMessage("Valid email required")
    .normalizeEmail(),

  body("password")
    .isString()
    .isLength({ min: 8, max: 128 }).withMessage("Password must be 8–128 characters"),

  body("fullName")
    .isString().trim()
    .isLength({ min: 2, max: 120 }).withMessage("Full name required (2–120 chars)"),

  body("phone")
    .optional()
    .isString().trim()
    .isLength({ min: 5, max: 30 }),

  body("jobRole")
    .isIn(["NOTARY_OFFICER", "RECEPTIONIST", "BRANCH_ADMIN"])
    .withMessage("jobRole must be NOTARY_OFFICER, RECEPTIONIST, or BRANCH_ADMIN"),

  body("assignedCounter")
    .optional()
    .isInt({ min: 1, max: 100 }),
];

export const updateEmployeeValidator = [
  param("tenantId").isUUID().withMessage("Invalid tenantId"),
  param("branchId").isUUID().withMessage("Invalid branchId"),
  param("employeeId").isUUID().withMessage("Invalid employeeId"),

  body("fullName")
    .optional()
    .isString().trim()
    .isLength({ min: 2, max: 120 }),

  body("phone")
    .optional()
    .isString().trim()
    .isLength({ min: 5, max: 30 }),

  body("jobRole")
    .optional()
    .isIn(["NOTARY_OFFICER", "RECEPTIONIST", "BRANCH_ADMIN"]),

  body("assignedCounter")
    .optional()
    .isInt({ min: 1, max: 100 }),

  body("branchId")
    .optional()
    .isUUID().withMessage("Invalid branchId for transfer"),
];

export const resetEmployeePasswordValidator = [
  param("tenantId").isUUID(),
  param("branchId").isUUID(),
  param("employeeId").isUUID(),

  body("newPassword")
    .isString()
    .isLength({ min: 8, max: 128 }).withMessage("Password must be 8–128 characters"),
];

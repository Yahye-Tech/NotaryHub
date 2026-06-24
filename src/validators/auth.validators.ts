import { body, query as queryParam } from "express-validator";

// ─── Register ─────────────────────────────────────────────────────────────
export const registerValidator = [
  body("email")
    .isEmail().withMessage("Valid email required")
    .normalizeEmail()
    .isLength({ max: 254 }).withMessage("Email too long"),

  body("password")
    .isString()
    .isLength({ min: 8, max: 128 }).withMessage("Password must be 8–128 characters"),

  body("fullName")
    .isString().trim()
    .isLength({ min: 2, max: 120 }).withMessage("Full name required (2–120 chars)"),

  body("phone")
    .optional()
    .isMobilePhone("any").withMessage("Invalid phone number"),

  body("role")
    .optional()
    .isIn(["CUSTOMER", "EMPLOYEE", "BRANCH_ADMIN", "COMPANY_ADMIN"])
    .withMessage("Invalid role"),

  body("tenantId")
    .optional()
    .isUUID().withMessage("Invalid tenantId"),
];

// ─── Login ────────────────────────────────────────────────────────────────
export const loginValidator = [
  body("email")
    .isEmail().withMessage("Valid email required")
    .normalizeEmail(),

  body("password")
    .isString()
    .notEmpty().withMessage("Password required"),

  body("totpCode")
    .optional()
    .isString()
    .isLength({ min: 6, max: 6 }).withMessage("TOTP code must be 6 digits")
    .matches(/^\d{6}$/).withMessage("TOTP code must be numeric"),
];

// ─── Forgot password ──────────────────────────────────────────────────────
export const forgotPasswordValidator = [
  body("email")
    .isEmail().withMessage("Valid email required")
    .normalizeEmail(),
];

// ─── Reset password ───────────────────────────────────────────────────────
export const resetPasswordValidator = [
  body("token")
    .isString()
    .isLength({ min: 64, max: 64 }).withMessage("Invalid reset token"),

  body("password")
    .isString()
    .isLength({ min: 8, max: 128 }).withMessage("Password must be 8–128 characters"),
];

// ─── Verify email ─────────────────────────────────────────────────────────
export const verifyEmailValidator = [
  queryParam("token")
    .isString()
    .isLength({ min: 64, max: 64 }).withMessage("Invalid verification token"),
];

// ─── Enable 2FA ───────────────────────────────────────────────────────────
export const enable2faValidator = [
  body("totpCode")
    .isString()
    .isLength({ min: 6, max: 6 }).withMessage("TOTP code must be 6 digits")
    .matches(/^\d{6}$/).withMessage("TOTP code must be numeric"),
];

// ─── Disable 2FA ──────────────────────────────────────────────────────────
export const disable2faValidator = [
  body("totpCode")
    .isString()
    .isLength({ min: 6, max: 6 }).withMessage("TOTP code must be 6 digits")
    .matches(/^\d{6}$/).withMessage("TOTP code must be numeric"),
];

// ─── Change password (authenticated) ─────────────────────────────────────
export const changePasswordValidator = [
  body("currentPassword")
    .isString()
    .notEmpty().withMessage("Current password required"),

  body("newPassword")
    .isString()
    .isLength({ min: 8, max: 128 }).withMessage("Password must be 8–128 characters"),
];

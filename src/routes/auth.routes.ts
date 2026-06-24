import { Router, type Request, type Response } from "express";
import { validationResult } from "express-validator";
import rateLimit from "express-rate-limit";

import {
  findUserByEmail,
  findUserById,
  createUser,
  verifyPassword,
  validatePasswordStrength,
  recordFailedLogin,
  clearFailedLogins,
  isAccountLocked,
  getLockRemainingSeconds,
  createOneTimeToken,
  consumeOneTimeToken,
  markEmailVerified,
  resetPassword,
  generateTotpSecret,
  saveTotpSecret,
  enableTotp,
  disableTotp,
  verifyTotpCode,
  writeAuditLog,
} from "../auth/auth.service.js";

import {
  signAccessToken,
  createRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllUserRefreshTokens,
} from "../auth/jwt.service.js";

import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  sendTwoFactorEnabledEmail,
} from "../services/email.service.js";

import { requireAuth } from "../middleware/auth.middleware.js";

import {
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  verifyEmailValidator,
  enable2faValidator,
  disable2faValidator,
  changePasswordValidator,
} from "../validators/auth.validators.js";

const router = Router();

// ─── Helpers ───────────────────────────────────────────────────────────────

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
    req.socket.remoteAddress ||
    "unknown"
  );
}

function getUserAgent(req: Request): string {
  return req.headers["user-agent"] || "unknown";
}

const REFRESH_COOKIE = "notaryhub_refresh";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/api/auth",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

// ─── Rate limiters ─────────────────────────────────────────────────────────

// In test mode (TEST_SKIP_RATE_LIMIT=true), rate limiters are bypassed entirely.
// Never set this in production.
const skipRateLimit = process.env.TEST_SKIP_RATE_LIMIT === "true";

const loginLimiter = skipRateLimit
  ? ((_req: any, _res: any, next: any) => next())
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 10,
      message: { error: "TOO_MANY_REQUESTS", message: "Too many login attempts. Try again in 15 minutes." },
      standardHeaders: true,
      legacyHeaders: false,
    });

const forgotPasswordLimiter = skipRateLimit
  ? ((_req: any, _res: any, next: any) => next())
  : rateLimit({
      windowMs: 60 * 60 * 1000,
      max: 5,
      message: { error: "TOO_MANY_REQUESTS", message: "Too many password reset requests. Try again in 1 hour." },
      standardHeaders: true,
      legacyHeaders: false,
    });

const registerLimiter = skipRateLimit
  ? ((_req: any, _res: any, next: any) => next())
  : rateLimit({
      windowMs: 60 * 60 * 1000,
      max: 20,
      message: { error: "TOO_MANY_REQUESTS", message: "Too many registrations. Try again later." },
      standardHeaders: true,
      legacyHeaders: false,
    });

// ─────────────────────────────────────────────────────────────────────────
// POST /api/auth/register
// Creates a new user account and sends a verification email.
// ─────────────────────────────────────────────────────────────────────────
router.post("/register", registerLimiter, registerValidator, async (req: Request, res: Response) => {
  if (!validate(req, res)) return;

  const { email, password, fullName, phone, role = "CUSTOMER", tenantId } = req.body;

  // Password strength (beyond basic length)
  const pwError = validatePasswordStrength(password);
  if (pwError) {
    res.status(422).json({ error: "WEAK_PASSWORD", message: pwError });
    return;
  }

  // Check duplicate email
  const existing = await findUserByEmail(email);
  if (existing) {
    // Don't reveal whether the account exists — constant-time response
    res.status(409).json({ error: "EMAIL_TAKEN", message: "An account with this email already exists" });
    return;
  }

  try {
    const user = await createUser({ email, password, fullName, phone, role, tenantId });

    // Send verification email — non-fatal: account is created even if email fails
    try {
      const token = await createOneTimeToken(user.id, "email_verification");
      await sendVerificationEmail(user.email, user.full_name, token);
    } catch (emailErr: any) {
      console.error("[Auth] Verification email failed (non-fatal):", emailErr.message);
    }

    await writeAuditLog({
      userId: user.id,
      tenantId: user.tenant_id ?? undefined,
      action: "REGISTER",
      ipAddress: getIp(req),
      userAgent: getUserAgent(req),
    });

    res.status(201).json({
      message: "Account created. Please check your email to verify your address.",
      userId: user.id,
    });
  } catch (err: any) {
    console.error("[Auth] Register error:", err.message);
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Registration failed" });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// Authenticates email + password, handles 2FA, issues tokens.
// ─────────────────────────────────────────────────────────────────────────
router.post("/login", loginLimiter, loginValidator, async (req: Request, res: Response) => {
  if (!validate(req, res)) return;

  const { email, password, totpCode } = req.body;
  const ip = getIp(req);
  const ua = getUserAgent(req);

  const user = await findUserByEmail(email);

  // User not found — use constant-time comparison to prevent timing attacks
  if (!user) {
    await bcryptDummyCompare(); // timing equalisation
    await writeAuditLog({ action: "LOGIN_FAILED", ipAddress: ip, userAgent: ua, meta: { reason: "user_not_found", email } });
    res.status(401).json({ error: "INVALID_CREDENTIALS", message: "Incorrect email or password" });
    return;
  }

  // Account locked?
  if (isAccountLocked(user)) {
    const remaining = getLockRemainingSeconds(user);
    await writeAuditLog({ userId: user.id, tenantId: user.tenant_id ?? undefined, action: "LOGIN_BLOCKED_LOCKED", ipAddress: ip, userAgent: ua });
    res.status(403).json({
      error: "ACCOUNT_LOCKED",
      message: `Account temporarily locked. Try again in ${Math.ceil(remaining / 60)} minutes.`,
      retryAfterSeconds: remaining,
    });
    return;
  }

  // Account status checks
  if (user.status === "deleted") {
    res.status(403).json({ error: "ACCOUNT_DELETED", message: "This account no longer exists" });
    return;
  }
  if (user.status === "suspended") {
    res.status(403).json({ error: "ACCOUNT_SUSPENDED", message: "Your account has been suspended. Contact support." });
    return;
  }

  // Password check
  const passwordValid = await verifyPassword(password, user.password_hash);
  if (!passwordValid) {
    await recordFailedLogin(user.id);
    await writeAuditLog({ userId: user.id, tenantId: user.tenant_id ?? undefined, action: "LOGIN_FAILED", ipAddress: ip, userAgent: ua, meta: { reason: "bad_password" } });

    // Re-fetch to get updated count
    const updated = await findUserById(user.id);
    const remaining = updated ? Math.max(0, 5 - updated.failed_login_count) : 0;
    res.status(401).json({
      error: "INVALID_CREDENTIALS",
      message: "Incorrect email or password",
      attemptsRemaining: remaining,
    });
    return;
  }

  // Email not verified?
  if (!user.email_verified) {
    res.status(403).json({
      error: "EMAIL_NOT_VERIFIED",
      message: "Please verify your email address before logging in. Check your inbox.",
    });
    return;
  }

  // 2FA check
  if (user.totp_enabled) {
    if (!totpCode) {
      // Signal to the frontend that a 2FA code is required
      res.status(200).json({ requires2fa: true, message: "Enter your 2FA code to continue" });
      return;
    }

    const totpValid = verifyTotpCode(user.totp_secret!, totpCode);
    if (!totpValid) {
      await writeAuditLog({ userId: user.id, tenantId: user.tenant_id ?? undefined, action: "LOGIN_FAILED_2FA", ipAddress: ip, userAgent: ua });
      res.status(401).json({ error: "TOTP_INVALID", message: "Invalid 2FA code. Check your authenticator app." });
      return;
    }
  }

  // ── All checks passed — issue tokens ─────────────────────────────────

  await clearFailedLogins(user.id);

  // Update last_login_ip
  const { query: dbQuery } = await import("../db/pool.js");
  await dbQuery(
    `UPDATE users SET last_login_ip = $2, updated_at = NOW() WHERE id = $1`,
    [user.id, ip]
  );

  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    tenantId: user.tenant_id,
  });

  const rawRefreshToken = await createRefreshToken(user.id, ip, ua);

  // Refresh token → httpOnly cookie
  res.cookie(REFRESH_COOKIE, rawRefreshToken, COOKIE_OPTIONS);

  await writeAuditLog({
    userId: user.id,
    tenantId: user.tenant_id ?? undefined,
    action: "LOGIN_SUCCESS",
    ipAddress: ip,
    userAgent: ua,
  });

  res.json({
    accessToken,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      tenantId: user.tenant_id,
      totpEnabled: user.totp_enabled,
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────
// POST /api/auth/logout
// Revokes the current refresh token. Access token expires naturally (15m).
// ─────────────────────────────────────────────────────────────────────────
router.post("/logout", requireAuth, async (req: Request, res: Response) => {
  const rawRefreshToken = req.cookies?.[REFRESH_COOKIE];

  if (rawRefreshToken) {
    await revokeRefreshToken(rawRefreshToken);
  }

  res.clearCookie(REFRESH_COOKIE, { ...COOKIE_OPTIONS, maxAge: 0 });

  await writeAuditLog({
    userId: req.user!.sub,
    tenantId: req.user!.tenantId ?? undefined,
    action: "LOGOUT",
    ipAddress: getIp(req),
    userAgent: getUserAgent(req),
  });

  res.json({ message: "Logged out successfully" });
});

// ─────────────────────────────────────────────────────────────────────────
// POST /api/auth/refresh
// Rotates the refresh token and returns a new access token.
// ─────────────────────────────────────────────────────────────────────────
router.post("/refresh", async (req: Request, res: Response) => {
  const rawRefreshToken = req.cookies?.[REFRESH_COOKIE];

  if (!rawRefreshToken) {
    res.status(401).json({ error: "NO_REFRESH_TOKEN", message: "No refresh token provided" });
    return;
  }

  try {
    const ip = getIp(req);
    const ua = getUserAgent(req);
    const { userId, newRawToken } = await rotateRefreshToken(rawRefreshToken, ip, ua);

    const user = await findUserById(userId);
    if (!user || user.status !== "active") {
      res.status(401).json({ error: "USER_INACTIVE", message: "Account is not active" });
      return;
    }

    const accessToken = signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenant_id,
    });

    // Set new refresh token cookie
    res.cookie(REFRESH_COOKIE, newRawToken, COOKIE_OPTIONS);

    res.json({ accessToken });
  } catch (err: any) {
    res.clearCookie(REFRESH_COOKIE, { ...COOKIE_OPTIONS, maxAge: 0 });

    const errorMap: Record<string, number> = {
      REFRESH_TOKEN_NOT_FOUND: 401,
      REFRESH_TOKEN_EXPIRED: 401,
      REFRESH_TOKEN_REUSE_DETECTED: 401,
    };

    res.status(errorMap[err.message] ?? 401).json({
      error: err.message ?? "REFRESH_FAILED",
      message: "Session expired. Please log in again.",
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// GET /api/auth/verify-email?token=...
// Marks the user's email as verified and activates the account.
// ─────────────────────────────────────────────────────────────────────────
router.get("/verify-email", verifyEmailValidator, async (req: Request, res: Response) => {
  if (!validate(req, res)) return;

  const { token } = req.query as { token: string };

  try {
    const userId = await consumeOneTimeToken(token, "email_verification");
    await markEmailVerified(userId);

    const user = await findUserById(userId);
    await writeAuditLog({
      userId,
      tenantId: user?.tenant_id ?? undefined,
      action: "EMAIL_VERIFIED",
      ipAddress: getIp(req),
      userAgent: getUserAgent(req),
    });

    // Redirect to frontend with success flag
    res.redirect(`${process.env.APP_URL || "http://localhost:3000"}/?emailVerified=true`);
  } catch (err: any) {
    const errorMessages: Record<string, string> = {
      TOKEN_INVALID: "This verification link is invalid.",
      TOKEN_ALREADY_USED: "This verification link has already been used.",
      TOKEN_EXPIRED: "This verification link has expired. Request a new one.",
    };

    const msg = errorMessages[err.message] ?? "Email verification failed.";
    res.redirect(
      `${process.env.APP_URL || "http://localhost:3000"}/?emailVerifyError=${encodeURIComponent(msg)}`
    );
  }
});

// ─────────────────────────────────────────────────────────────────────────
// POST /api/auth/resend-verification
// Resends the email verification link.
// ─────────────────────────────────────────────────────────────────────────
router.post("/resend-verification", forgotPasswordLimiter, forgotPasswordValidator, async (req: Request, res: Response) => {
  if (!validate(req, res)) return;

  const { email } = req.body;
  const user = await findUserByEmail(email);

  // Always respond 200 to prevent email enumeration
  if (!user || user.email_verified) {
    res.json({ message: "If this email exists and is unverified, a new link has been sent." });
    return;
  }

  try {
    const token = await createOneTimeToken(user.id, "email_verification");
    await sendVerificationEmail(user.email, user.full_name, token);
  } catch (err: any) {
    console.error("[Auth] Resend verification error:", err.message);
  }

  res.json({ message: "If this email exists and is unverified, a new link has been sent." });
});

// ─────────────────────────────────────────────────────────────────────────
// POST /api/auth/forgot-password
// Sends a password reset email.
// ─────────────────────────────────────────────────────────────────────────
router.post("/forgot-password", forgotPasswordLimiter, forgotPasswordValidator, async (req: Request, res: Response) => {
  if (!validate(req, res)) return;

  const { email } = req.body;
  const user = await findUserByEmail(email);

  // Always respond 200 to prevent email enumeration
  const genericMsg = "If an account with that email exists, a reset link has been sent.";

  if (!user || user.status === "deleted") {
    res.json({ message: genericMsg });
    return;
  }

  try {
    const token = await createOneTimeToken(user.id, "password_reset");
    try {
      await sendPasswordResetEmail(user.email, user.full_name, token);
    } catch (emailErr: any) {
      console.error("[Auth] Reset email failed (non-fatal):", emailErr.message);
    }

    await writeAuditLog({
      userId: user.id,
      tenantId: user.tenant_id ?? undefined,
      action: "PASSWORD_RESET_REQUESTED",
      ipAddress: getIp(req),
      userAgent: getUserAgent(req),
    });
  } catch (err: any) {
    console.error("[Auth] Forgot password error:", err.message);
  }

  res.json({ message: genericMsg });
});

// ─────────────────────────────────────────────────────────────────────────
// POST /api/auth/reset-password
// Validates the token and sets a new password.
// ─────────────────────────────────────────────────────────────────────────
router.post("/reset-password", resetPasswordValidator, async (req: Request, res: Response) => {
  if (!validate(req, res)) return;

  const { token, password } = req.body;

  const pwError = validatePasswordStrength(password);
  if (pwError) {
    res.status(422).json({ error: "WEAK_PASSWORD", message: pwError });
    return;
  }

  try {
    const userId = await consumeOneTimeToken(token, "password_reset");

    await resetPassword(userId, password);
    await revokeAllUserRefreshTokens(userId); // Force re-login everywhere

    const user = await findUserById(userId);
    if (user) {
      try {
        await sendPasswordChangedEmail(user.email, user.full_name);
      } catch (emailErr: any) {
        console.error("[Auth] Password changed email failed (non-fatal):", emailErr.message);
      }
      await writeAuditLog({
        userId,
        tenantId: user.tenant_id ?? undefined,
        action: "PASSWORD_RESET_COMPLETED",
        ipAddress: getIp(req),
        userAgent: getUserAgent(req),
      });
    }

    res.json({ message: "Password reset successfully. You can now log in." });
  } catch (err: any) {
    const errorMessages: Record<string, string> = {
      TOKEN_INVALID: "This reset link is invalid.",
      TOKEN_ALREADY_USED: "This reset link has already been used. Request a new one.",
      TOKEN_EXPIRED: "This reset link has expired. Request a new one.",
    };

    const msg = errorMessages[err.message];
    if (msg) {
      res.status(400).json({ error: err.message, message: msg });
    } else {
      console.error("[Auth] Reset password error:", err.message);
      res.status(500).json({ error: "INTERNAL_ERROR", message: "Password reset failed" });
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────
// GET /api/auth/me
// Returns the authenticated user's profile.
// ─────────────────────────────────────────────────────────────────────────
router.get("/me", requireAuth, async (req: Request, res: Response) => {
  const user = await findUserById(req.user!.sub);
  if (!user) {
    res.status(404).json({ error: "USER_NOT_FOUND", message: "User not found" });
    return;
  }

  res.json({
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    phone: user.phone,
    role: user.role,
    tenantId: user.tenant_id,
    status: user.status,
    emailVerified: user.email_verified,
    totpEnabled: user.totp_enabled,
  });
});

// ─────────────────────────────────────────────────────────────────────────
// POST /api/auth/change-password
// Changes password for an authenticated user (knows current password).
// ─────────────────────────────────────────────────────────────────────────
router.post("/change-password", requireAuth, changePasswordValidator, async (req: Request, res: Response) => {
  if (!validate(req, res)) return;

  const { currentPassword, newPassword } = req.body;

  const pwError = validatePasswordStrength(newPassword);
  if (pwError) {
    res.status(422).json({ error: "WEAK_PASSWORD", message: pwError });
    return;
  }

  const user = await findUserById(req.user!.sub);
  if (!user) {
    res.status(404).json({ error: "USER_NOT_FOUND", message: "User not found" });
    return;
  }

  const passwordValid = await verifyPassword(currentPassword, user.password_hash);
  if (!passwordValid) {
    res.status(401).json({ error: "INVALID_CREDENTIALS", message: "Current password is incorrect" });
    return;
  }

  await resetPassword(user.id, newPassword);
  await revokeAllUserRefreshTokens(user.id); // Force re-login on all other devices

  try {
    await sendPasswordChangedEmail(user.email, user.full_name);
  } catch (emailErr: any) {
    console.error("[Auth] Password changed email failed (non-fatal):", emailErr.message);
  }

  await writeAuditLog({
    userId: user.id,
    tenantId: user.tenant_id ?? undefined,
    action: "PASSWORD_CHANGED",
    ipAddress: getIp(req),
    userAgent: getUserAgent(req),
  });

  // Clear the current session's refresh token cookie too
  res.clearCookie(REFRESH_COOKIE, { ...COOKIE_OPTIONS, maxAge: 0 });
  res.json({ message: "Password changed successfully. Please log in again." });
});

// ─────────────────────────────────────────────────────────────────────────
// POST /api/auth/2fa/setup
// Generates a new TOTP secret and returns the QR code.
// Does NOT enable 2FA yet — user must verify with /2fa/enable.
// ─────────────────────────────────────────────────────────────────────────
router.post("/2fa/setup", requireAuth, async (req: Request, res: Response) => {
  const user = await findUserById(req.user!.sub);
  if (!user) {
    res.status(404).json({ error: "USER_NOT_FOUND", message: "User not found" });
    return;
  }

  if (user.totp_enabled) {
    res.status(409).json({ error: "TOTP_ALREADY_ENABLED", message: "2FA is already enabled on this account" });
    return;
  }

  const { secret, otpauthUrl, qrDataUrl } = await generateTotpSecret(user.email);
  await saveTotpSecret(user.id, secret);

  // Return the secret and QR — the client must confirm with a valid code
  res.json({
    secret,          // show as text backup code
    otpauthUrl,      // for manual entry in authenticator apps
    qrDataUrl,       // base64 PNG QR code for display in UI
  });
});

// ─────────────────────────────────────────────────────────────────────────
// POST /api/auth/2fa/enable
// Verifies the first TOTP code and activates 2FA on the account.
// ─────────────────────────────────────────────────────────────────────────
router.post("/2fa/enable", requireAuth, enable2faValidator, async (req: Request, res: Response) => {
  if (!validate(req, res)) return;

  const { totpCode } = req.body;

  try {
    await enableTotp(req.user!.sub, totpCode);

    const user = await findUserById(req.user!.sub);
    if (user) {
      await sendTwoFactorEnabledEmail(user.email, user.full_name);
      await writeAuditLog({
        userId: user.id,
        tenantId: user.tenant_id ?? undefined,
        action: "2FA_ENABLED",
        ipAddress: getIp(req),
        userAgent: getUserAgent(req),
      });
    }

    res.json({ message: "Two-factor authentication enabled successfully." });
  } catch (err: any) {
    if (err.message === "TOTP_CODE_INVALID") {
      res.status(401).json({ error: "TOTP_INVALID", message: "Invalid code. Check your authenticator app." });
    } else if (err.message === "TOTP_SECRET_NOT_FOUND") {
      res.status(400).json({ error: "TOTP_SETUP_REQUIRED", message: "Complete 2FA setup first: POST /api/auth/2fa/setup" });
    } else {
      console.error("[Auth] 2FA enable error:", err.message);
      res.status(500).json({ error: "INTERNAL_ERROR", message: "Could not enable 2FA" });
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────
// POST /api/auth/2fa/disable
// Disables 2FA after verifying a valid code.
// ─────────────────────────────────────────────────────────────────────────
router.post("/2fa/disable", requireAuth, disable2faValidator, async (req: Request, res: Response) => {
  if (!validate(req, res)) return;

  const { totpCode } = req.body;

  const user = await findUserById(req.user!.sub);
  if (!user) {
    res.status(404).json({ error: "USER_NOT_FOUND", message: "User not found" });
    return;
  }

  if (!user.totp_enabled || !user.totp_secret) {
    res.status(400).json({ error: "TOTP_NOT_ENABLED", message: "2FA is not enabled on this account" });
    return;
  }

  const valid = verifyTotpCode(user.totp_secret, totpCode);
  if (!valid) {
    res.status(401).json({ error: "TOTP_INVALID", message: "Invalid 2FA code" });
    return;
  }

  await disableTotp(user.id);

  await writeAuditLog({
    userId: user.id,
    tenantId: user.tenant_id ?? undefined,
    action: "2FA_DISABLED",
    ipAddress: getIp(req),
    userAgent: getUserAgent(req),
  });

  res.json({ message: "Two-factor authentication disabled." });
});

// ─── Timing equalisation helper ───────────────────────────────────────────
// Prevents timing-based user enumeration on login endpoint.
import bcrypt from "bcryptjs";
const DUMMY_HASH = "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGniMnLzVmqVKCGhXLTTx.MR6FS";
async function bcryptDummyCompare(): Promise<void> {
  await bcrypt.compare("dummy_timing_equalisation", DUMMY_HASH);
}

export default router;

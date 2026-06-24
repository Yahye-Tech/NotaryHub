import bcrypt from "bcryptjs";
import speakeasy from "speakeasy";
import qrcode from "qrcode";
import crypto from "crypto";
import { query, withTransaction } from "../db/pool.js";

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || "12", 10);
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export interface UserRecord {
  id: string;
  email: string;
  password_hash: string;
  role: string;
  status: string;
  tenant_id: string | null;
  full_name: string;
  phone: string | null;
  email_verified: boolean;
  totp_secret: string | null;
  totp_enabled: boolean;
  failed_login_count: number;
  locked_until: Date | null;
}

// ─── Password ──────────────────────────────────────────────────────────────

export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  plaintext: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}

export function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter";
  if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter";
  if (!/[0-9]/.test(password)) return "Password must contain at least one number";
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return "Password must contain at least one special character";
  }
  return null; // valid
}

// ─── User lookup ───────────────────────────────────────────────────────────

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const { rows } = await query<UserRecord>(
    `SELECT id, email, password_hash, role, status, tenant_id, full_name, phone,
            email_verified, totp_secret, totp_enabled, failed_login_count, locked_until
     FROM users
     WHERE email = $1 AND is_deleted = FALSE`,
    [email.toLowerCase().trim()]
  );
  return rows[0] ?? null;
}

export async function findUserById(id: string): Promise<UserRecord | null> {
  const { rows } = await query<UserRecord>(
    `SELECT id, email, password_hash, role, status, tenant_id, full_name, phone,
            email_verified, totp_secret, totp_enabled, failed_login_count, locked_until
     FROM users
     WHERE id = $1 AND is_deleted = FALSE`,
    [id]
  );
  return rows[0] ?? null;
}

// ─── Account locking ───────────────────────────────────────────────────────

export async function recordFailedLogin(userId: string): Promise<void> {
  await query(
    `UPDATE users
     SET failed_login_count = failed_login_count + 1,
         locked_until = CASE
           WHEN failed_login_count + 1 >= $2
           THEN NOW() + INTERVAL '15 minutes'
           ELSE locked_until
         END,
         updated_at = NOW()
     WHERE id = $1`,
    [userId, MAX_FAILED_ATTEMPTS]
  );
}

export async function clearFailedLogins(userId: string): Promise<void> {
  await query(
    `UPDATE users
     SET failed_login_count = 0,
         locked_until = NULL,
         last_login_at = NOW(),
         updated_at = NOW()
     WHERE id = $1`,
    [userId]
  );
}

export function isAccountLocked(user: UserRecord): boolean {
  if (!user.locked_until) return false;
  return new Date() < new Date(user.locked_until);
}

export function getLockRemainingSeconds(user: UserRecord): number {
  if (!user.locked_until) return 0;
  const remaining = new Date(user.locked_until).getTime() - Date.now();
  return Math.max(0, Math.ceil(remaining / 1000));
}

// ─── Account registration ──────────────────────────────────────────────────

export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  role: string;
  tenantId?: string;
}

export async function createUser(input: RegisterInput): Promise<UserRecord> {
  const passwordHash = await hashPassword(input.password);

  const { rows } = await query<UserRecord>(
    `INSERT INTO users (email, password_hash, role, status, tenant_id, full_name, phone)
     VALUES ($1, $2, $3, 'pending_verification', $4, $5, $6)
     RETURNING id, email, password_hash, role, status, tenant_id, full_name, phone,
               email_verified, totp_secret, totp_enabled, failed_login_count, locked_until`,
    [
      input.email.toLowerCase().trim(),
      passwordHash,
      input.role,
      input.tenantId ?? null,
      input.fullName.trim(),
      input.phone ?? null,
    ]
  );

  return rows[0];
}

// ─── One-time tokens (email verification & password reset) ────────────────

export async function createOneTimeToken(
  userId: string,
  type: "email_verification" | "password_reset"
): Promise<string> {
  // Invalidate any existing unused tokens of the same type first
  await query(
    `UPDATE one_time_tokens SET used = TRUE, used_at = NOW()
     WHERE user_id = $1 AND type = $2 AND used = FALSE`,
    [userId, type]
  );

  const rawToken = crypto.randomBytes(32).toString("hex"); // 64-char hex
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  const ttlSeconds = type === "email_verification"
    ? parseInt(process.env.EMAIL_VERIFY_TTL || "86400", 10)
    : parseInt(process.env.PASSWORD_RESET_TTL || "3600", 10);

  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

  await query(
    `INSERT INTO one_time_tokens (user_id, token_hash, type, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [userId, tokenHash, type, expiresAt]
  );

  return rawToken;
}

export async function consumeOneTimeToken(
  rawToken: string,
  type: "email_verification" | "password_reset"
): Promise<string> {
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  const { rows } = await query<{
    id: string;
    user_id: string;
    expires_at: Date;
    used: boolean;
  }>(
    `SELECT id, user_id, expires_at, used
     FROM one_time_tokens
     WHERE token_hash = $1 AND type = $2`,
    [tokenHash, type]
  );

  if (rows.length === 0) throw new Error("TOKEN_INVALID");
  if (rows[0].used) throw new Error("TOKEN_ALREADY_USED");
  if (new Date() > new Date(rows[0].expires_at)) throw new Error("TOKEN_EXPIRED");

  // Mark as used
  await query(
    `UPDATE one_time_tokens SET used = TRUE, used_at = NOW() WHERE id = $1`,
    [rows[0].id]
  );

  return rows[0].user_id;
}

// ─── Email verification ────────────────────────────────────────────────────

export async function markEmailVerified(userId: string): Promise<void> {
  await query(
    `UPDATE users
     SET email_verified = TRUE,
         email_verified_at = NOW(),
         status = CASE WHEN status = 'pending_verification' THEN 'active' ELSE status END,
         updated_at = NOW()
     WHERE id = $1`,
    [userId]
  );
}

// ─── Password reset ────────────────────────────────────────────────────────

export async function resetPassword(
  userId: string,
  newPassword: string
): Promise<void> {
  const hash = await hashPassword(newPassword);
  await query(
    `UPDATE users
     SET password_hash = $2,
         failed_login_count = 0,
         locked_until = NULL,
         updated_at = NOW()
     WHERE id = $1`,
    [userId, hash]
  );
}

// ─── 2FA / TOTP ────────────────────────────────────────────────────────────

export async function generateTotpSecret(
  userEmail: string
): Promise<{ secret: string; otpauthUrl: string; qrDataUrl: string }> {
  const issuer = process.env.TOTP_ISSUER || "NotaryHub";

  const secretObj = speakeasy.generateSecret({
    name: `${issuer} (${userEmail})`,
    issuer,
    length: 20,
  });

  const otpauthUrl = secretObj.otpauth_url!;
  const qrDataUrl = await qrcode.toDataURL(otpauthUrl);

  return {
    secret: secretObj.base32,
    otpauthUrl,
    qrDataUrl,
  };
}

export async function saveTotpSecret(
  userId: string,
  secret: string
): Promise<void> {
  // Saves the secret but does NOT enable 2FA yet —
  // the user must verify the first code to confirm they have the secret.
  await query(
    `UPDATE users SET totp_secret = $2, updated_at = NOW() WHERE id = $1`,
    [userId, secret]
  );
}

export async function enableTotp(userId: string, totpCode: string): Promise<void> {
  const { rows } = await query<{ totp_secret: string }>(
    `SELECT totp_secret FROM users WHERE id = $1`,
    [userId]
  );

  if (!rows[0]?.totp_secret) throw new Error("TOTP_SECRET_NOT_FOUND");

  const valid = speakeasy.totp.verify({
    secret: rows[0].totp_secret,
    encoding: "base32",
    token: totpCode,
    window: 1, // allow ±1 time step (30s drift tolerance)
  });

  if (!valid) throw new Error("TOTP_CODE_INVALID");

  await query(
    `UPDATE users
     SET totp_enabled = TRUE,
         totp_enabled_at = NOW(),
         updated_at = NOW()
     WHERE id = $1`,
    [userId]
  );
}

export async function disableTotp(userId: string): Promise<void> {
  await query(
    `UPDATE users
     SET totp_enabled = FALSE,
         totp_secret = NULL,
         totp_enabled_at = NULL,
         updated_at = NOW()
     WHERE id = $1`,
    [userId]
  );
}

export function verifyTotpCode(secret: string, code: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: "base32",
    token: code,
    window: 1,
  });
}

// ─── Audit log ─────────────────────────────────────────────────────────────

export async function writeAuditLog(entry: {
  userId?: string;
  tenantId?: string;
  action: string;
  ipAddress?: string;
  userAgent?: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  await query(
    `INSERT INTO auth_audit_log (user_id, tenant_id, action, ip_address, user_agent, meta)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      entry.userId ?? null,
      entry.tenantId ?? null,
      entry.action,
      entry.ipAddress ?? null,
      entry.userAgent ?? null,
      entry.meta ? JSON.stringify(entry.meta) : null,
    ]
  );
}

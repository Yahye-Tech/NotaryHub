import jwt from "jsonwebtoken";
import crypto from "crypto";
import { query } from "../db/pool.js";

if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
  throw new Error("JWT_ACCESS_SECRET and JWT_REFRESH_SECRET are required");
}

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || "15m";
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || "7d";

export interface AccessTokenPayload {
  sub: string;          // user UUID
  email: string;
  role: string;
  tenantId: string | null;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  sub: string;          // user UUID
  jti: string;          // unique token ID (matches refresh_tokens.id)
}

// ─── Access Token ──────────────────────────────────────────────────────────

export function signAccessToken(payload: Omit<AccessTokenPayload, "iat" | "exp">): string {
  return jwt.sign(payload, ACCESS_SECRET, {
    expiresIn: ACCESS_EXPIRES as any,
    algorithm: "HS256" as any,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, ACCESS_SECRET, {
    algorithms: ["HS256"],
  }) as AccessTokenPayload;
}

// ─── Refresh Token ─────────────────────────────────────────────────────────

/**
 * Creates a cryptographically random refresh token, stores its SHA-256
 * hash in the database, and returns the raw token (sent to client).
 */
export async function createRefreshToken(
  userId: string,
  ipAddress: string | null,
  userAgent: string | null
): Promise<string> {
  // Raw token: 48 random bytes → 96-char hex string
  const rawToken = crypto.randomBytes(48).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  // Expiry matching the JWT config
  const expiryMs = parseExpiry(REFRESH_EXPIRES);
  const expiresAt = new Date(Date.now() + expiryMs);

  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, user_agent, ip_address, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, tokenHash, userAgent, ipAddress, expiresAt]
  );

  return rawToken;
}

/**
 * Validates a raw refresh token against the database.
 * Returns the user_id if valid, throws otherwise.
 */
export async function rotateRefreshToken(
  rawToken: string,
  ipAddress: string | null,
  userAgent: string | null
): Promise<{ userId: string; newRawToken: string }> {
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  const { rows } = await query<{
    id: string;
    user_id: string;
    expires_at: Date;
    revoked: boolean;
  }>(
    `SELECT id, user_id, expires_at, revoked
     FROM refresh_tokens
     WHERE token_hash = $1`,
    [tokenHash]
  );

  if (rows.length === 0) {
    throw new Error("REFRESH_TOKEN_NOT_FOUND");
  }

  const stored = rows[0];

  if (stored.revoked) {
    // Possible token reuse attack — revoke ALL tokens for this user
    await query(
      `UPDATE refresh_tokens SET revoked = TRUE, revoked_at = NOW()
       WHERE user_id = $1 AND revoked = FALSE`,
      [stored.user_id]
    );
    throw new Error("REFRESH_TOKEN_REUSE_DETECTED");
  }

  if (new Date() > new Date(stored.expires_at)) {
    throw new Error("REFRESH_TOKEN_EXPIRED");
  }

  // Revoke the used token (rotate)
  await query(
    `UPDATE refresh_tokens SET revoked = TRUE, revoked_at = NOW()
     WHERE id = $1`,
    [stored.id]
  );

  // Issue a new refresh token
  const newRawToken = await createRefreshToken(stored.user_id, ipAddress, userAgent);

  return { userId: stored.user_id, newRawToken };
}

/**
 * Revokes a single refresh token by its raw value.
 */
export async function revokeRefreshToken(rawToken: string): Promise<void> {
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  await query(
    `UPDATE refresh_tokens SET revoked = TRUE, revoked_at = NOW()
     WHERE token_hash = $1`,
    [tokenHash]
  );
}

/**
 * Revokes ALL refresh tokens for a user (used on password change / security events).
 */
export async function revokeAllUserRefreshTokens(userId: string): Promise<void> {
  await query(
    `UPDATE refresh_tokens SET revoked = TRUE, revoked_at = NOW()
     WHERE user_id = $1 AND revoked = FALSE`,
    [userId]
  );
}

// ─── Utility ───────────────────────────────────────────────────────────────

function parseExpiry(expiry: string): number {
  const unit = expiry.slice(-1);
  const value = parseInt(expiry.slice(0, -1), 10);
  const units: Record<string, number> = {
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  if (!units[unit]) throw new Error(`Unknown expiry unit: ${unit}`);
  return value * units[unit];
}

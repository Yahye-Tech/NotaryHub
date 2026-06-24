import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken, type AccessTokenPayload } from "../auth/jwt.service.js";

// Extend Express Request with the authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

// Role hierarchy: higher index = more privilege
const ROLE_ORDER = [
  "CUSTOMER",
  "EMPLOYEE",
  "BRANCH_ADMIN",
  "COMPANY_ADMIN",
  "SUPER_ADMIN",
] as const;

export type Role = (typeof ROLE_ORDER)[number];

// ─── requireAuth ──────────────────────────────────────────────────────────
// Validates the JWT access token from the Authorization header.
// Attaches the decoded payload to req.user.

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "UNAUTHENTICATED", message: "Access token required" });
    return;
  }

  const token = authHeader.slice(7);
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      res.status(401).json({ error: "TOKEN_EXPIRED", message: "Access token has expired" });
    } else {
      res.status(401).json({ error: "TOKEN_INVALID", message: "Access token is invalid" });
    }
  }
}

// ─── requireRole ─────────────────────────────────────────────────────────
// Checks that the authenticated user holds at least one of the allowed roles.
// Always call after requireAuth.

export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "UNAUTHENTICATED", message: "Authentication required" });
      return;
    }

    if (!allowedRoles.includes(req.user.role as Role)) {
      res.status(403).json({
        error: "FORBIDDEN",
        message: `Role '${req.user.role}' is not permitted to access this resource`,
      });
      return;
    }

    next();
  };
}

// ─── requireMinRole ───────────────────────────────────────────────────────
// Checks that the authenticated user's role is at or above a minimum in the hierarchy.
// Example: requireMinRole("BRANCH_ADMIN") allows BRANCH_ADMIN, COMPANY_ADMIN, SUPER_ADMIN.

export function requireMinRole(minRole: Role) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "UNAUTHENTICATED", message: "Authentication required" });
      return;
    }

    const userRoleIndex  = ROLE_ORDER.indexOf(req.user.role as Role);
    const minRoleIndex   = ROLE_ORDER.indexOf(minRole);

    if (userRoleIndex < minRoleIndex) {
      res.status(403).json({
        error: "FORBIDDEN",
        message: `This operation requires '${minRole}' or higher`,
      });
      return;
    }

    next();
  };
}

// ─── requireTenantAccess ─────────────────────────────────────────────────
// Ensures a tenant-scoped user can only access their own tenant's resources.
// SUPER_ADMIN bypasses this check entirely.
// Usage: attach to any route that has :tenantId in the URL.

export function requireTenantAccess(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "UNAUTHENTICATED", message: "Authentication required" });
    return;
  }

  // SUPER_ADMIN has cross-tenant access
  if (req.user.role === "SUPER_ADMIN") {
    next();
    return;
  }

  const routeTenantId = req.params.tenantId;
  if (!routeTenantId) {
    next(); // Route doesn't specify a tenantId param — skip check
    return;
  }

  if (req.user.tenantId !== routeTenantId) {
    res.status(403).json({
      error: "FORBIDDEN",
      message: "You do not have access to this tenant's resources",
    });
    return;
  }

  next();
}

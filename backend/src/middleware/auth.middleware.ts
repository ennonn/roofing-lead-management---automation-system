import { Request, Response, NextFunction } from "express";
import { AuthUser, UserRole } from "@roofing/shared-types";

// Augment Express Request interface with authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Middleware ensuring the request is authenticated via an active server session.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const sessionUser = req.session?.user;

  if (!sessionUser || !sessionUser.id) {
    res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required to access this resource.",
      },
    });
    return;
  }

  req.user = sessionUser;
  next();
}

/**
 * Middleware enforcing role-based access control (RBAC) boundaries on protected endpoints.
 */
export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required to access this resource.",
        },
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "You do not have permission to access this resource.",
        },
      });
      return;
    }

    next();
  };
}

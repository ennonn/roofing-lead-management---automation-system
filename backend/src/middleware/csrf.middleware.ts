import { Request, Response, NextFunction } from "express";
import { env } from "../config/env.js";

/**
 * Defense-in-depth CSRF Protection Middleware for Session-Based API Endpoints.
 * Combines SameSite=Lax cookie defense with:
 * 1. Origin header verification against allowed client origins.
 * 2. Custom header requirement (e.g. X-Requested-With) on state-changing requests
 *    which browsers prevent cross-origin scripts from setting without CORS preflight.
 */
function parseOriginSafely(value: string | undefined): string | null {
  if (!value || value === "null") {
    return null;
  }
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

/**
 * Defense-in-depth CSRF Protection Middleware for Session-Based API Endpoints.
 * Combines SameSite=Lax cookie defense with:
 * 1. Origin & Referer header verification against allowed client origins.
 * 2. Custom header requirement (e.g. X-Requested-With / X-CSRF-Token) on state-changing requests
 *    which browsers prevent cross-origin HTML forms and scripts from setting without CORS preflight.
 */
export function verifyCsrf(req: Request, res: Response, next: NextFunction): void {
  // Safe HTTP methods do not change state
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  const allowedOrigin = new URL(env.CLIENT_ORIGIN).origin;

  // 1. If Origin header is provided (even if "null" or malformed), verify it matches CLIENT_ORIGIN
  if (req.headers.origin !== undefined) {
    const requestOrigin = parseOriginSafely(req.headers.origin);
    if (!requestOrigin || requestOrigin !== allowedOrigin) {
      res.status(403).json({
        success: false,
        error: {
          code: "CSRF_ORIGIN_INVALID",
          message: "Cross-site request forgery protection rejected this request origin.",
        },
      });
      return;
    }
  } else if (req.headers.referer !== undefined) {
    // 2. Fallback to Referer header if Origin is absent
    const refererOrigin = parseOriginSafely(req.headers.referer);
    if (!refererOrigin || refererOrigin !== allowedOrigin) {
      res.status(403).json({
        success: false,
        error: {
          code: "CSRF_ORIGIN_INVALID",
          message: "Cross-site request forgery protection rejected this request referer.",
        },
      });
      return;
    }
  }

  // 3. Custom header verification on state-changing requests
  // Standard browsers enforce that cross-origin HTML forms and scripts cannot set custom headers without CORS preflight
  const requestedWith = req.headers["x-requested-with"];
  const customCsrfHeader = req.headers["x-csrf-token"];

  if (!requestedWith && !customCsrfHeader) {
    res.status(403).json({
      success: false,
      error: {
        code: "CSRF_TOKEN_MISSING",
        message: "Missing required CSRF verification header (e.g. X-Requested-With: XMLHttpRequest).",
      },
    });
    return;
  }

  next();
}

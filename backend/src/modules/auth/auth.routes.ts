import express, { Router, RequestHandler } from "express";
import { AuthController } from "./auth.controller.js";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { authRateLimiter } from "../../middleware/rateLimiter.js";
import { verifyCsrf } from "../../middleware/csrf.middleware.js";

export interface AuthRouterOptions {
  controller?: AuthController;
  rateLimiter?: RequestHandler;
}

export function createAuthRouter(options?: AuthRouterOptions): Router {
  const router = express.Router();
  const controller = options?.controller ?? new AuthController();
  const rateLimiter = options?.rateLimiter ?? authRateLimiter;

  // POST /login: Rate-limited and CSRF-protected
  router.post("/login", rateLimiter, verifyCsrf, controller.handleLogin);

  // POST /logout: Authenticated, CSRF-protected session termination
  router.post("/logout", verifyCsrf, requireAuth, controller.handleLogout);

  // GET /session & /me: Retrieve active authenticated session identity
  router.get("/session", requireAuth, controller.handleGetSession);
  router.get("/me", requireAuth, controller.handleGetSession);

  return router;
}

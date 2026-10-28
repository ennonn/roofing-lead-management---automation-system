import express, { Router, RequestHandler } from "express";
import { LeadsController } from "./leads.controller.js";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { verifyCsrf } from "../../middleware/csrf.middleware.js";
import { leadSubmissionRateLimiter } from "../../middleware/rateLimiter.js";

export interface LeadsRouterOptions {
  controller?: LeadsController;
  rateLimiter?: RequestHandler;
}

export function createLeadsRouter(options?: LeadsRouterOptions): Router {
  const router = express.Router();
  const controller = options?.controller ?? new LeadsController();
  const rateLimiter = options?.rateLimiter ?? leadSubmissionRateLimiter;

  // 1. Public quote intake: Rate-limited, no auth required
  router.post("/", rateLimiter, controller.handleCreateLead);

  // 2. Authenticated lead listing: Owner / Admin only
  router.get("/", requireAuth, requireRole(["owner", "admin"]), controller.handleGetLeads);

  // 3. Authenticated single lead details: Owner / Admin only
  router.get("/:id", requireAuth, requireRole(["owner", "admin"]), controller.handleGetLeadById);

  // 4. Authenticated lead status update: CSRF-protected, Owner / Admin only
  router.patch("/:id/status", verifyCsrf, requireAuth, requireRole(["owner", "admin"]), controller.handleUpdateLeadStatus);

  // 5. Authenticated follow-up note creation: CSRF-protected, Owner / Admin only
  router.post("/:id/notes", verifyCsrf, requireAuth, requireRole(["owner", "admin"]), controller.handleAddLeadNote);

  return router;
}

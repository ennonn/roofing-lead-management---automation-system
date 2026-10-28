import express, { Router } from "express";
import {
  handleGetPublicBusinessInfo,
  handleGetBusinessSettings,
  handleUpdateBusinessSettings,
} from "./business.controller.js";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { verifyCsrf } from "../../middleware/csrf.middleware.js";

export function createBusinessRouter(): Router {
  const router = express.Router();

  // 1. Public operational & availability info: Rate-limited, no auth required
  router.get("/public-info", handleGetPublicBusinessInfo);

  // 2. Authenticated business settings read: Owner & Admin only
  router.get("/settings", requireAuth, requireRole(["owner", "admin"]), handleGetBusinessSettings);

  // 3. Authenticated business settings update: CSRF-protected, Owner & Admin only
  router.patch("/settings", verifyCsrf, requireAuth, requireRole(["owner", "admin"]), handleUpdateBusinessSettings);

  return router;
}

import express, { Router } from "express";
import { DashboardController } from "./dashboard.controller.js";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";

export interface DashboardRouterOptions {
  controller?: DashboardController;
}

export function createDashboardRouter(options?: DashboardRouterOptions): Router {
  const router = express.Router();
  const controller = options?.controller ?? new DashboardController();

  // GET /stats: Authenticated overview stats restricted to owner and admin roles
  router.get("/stats", requireAuth, requireRole(["owner", "admin"]), controller.handleGetStats);

  return router;
}

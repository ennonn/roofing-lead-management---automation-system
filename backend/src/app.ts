import express, { Express, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import session from "express-session";
import { env } from "./config/env.js";
import { createSessionMiddleware } from "./config/session.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { leadSubmissionRateLimiter, generalApiRateLimiter } from "./middleware/rateLimiter.js";
import { requireAuth, requireRole } from "./middleware/auth.middleware.js";
import { createBusinessRouter } from "./modules/business/business.routes.js";
import { createAuthRouter, AuthRouterOptions } from "./modules/auth/auth.routes.js";
import { createDashboardRouter, DashboardRouterOptions } from "./modules/dashboard/dashboard.routes.js";
import { createLeadsRouter, LeadsRouterOptions } from "./modules/leads/leads.routes.js";

export interface AppOptions {
  sessionStore?: session.Store;
  authRouterOptions?: AuthRouterOptions;
  dashboardRouterOptions?: DashboardRouterOptions;
  leadsRouterOptions?: LeadsRouterOptions;
}

export function createApp(options?: AppOptions): Express {
  const app = express();

  // Trust first proxy when running behind reverse proxy (e.g. Caddy / Docker in production)
  if (env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  // Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: env.NODE_ENV === "production",
      crossOriginEmbedderPolicy: false,
    })
  );

  // CORS Configuration
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "X-CSRF-Token"],
    })
  );

  // Request Logging
  if (env.NODE_ENV !== "test") {
    app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
  }

  // Body Parsing with size limits
  app.use(express.json({ limit: "10kb" }));
  app.use(express.urlencoded({ extended: true, limit: "10kb" }));

  // Session Management Middleware (Server-Managed Cookies)
  app.use(createSessionMiddleware({ store: options?.sessionStore }));

  // Liveness / Health Probe
  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Base API Router
  const apiRouter = express.Router();

  // General rate limiting on API
  if (env.NODE_ENV === "production") {
    apiRouter.use(generalApiRateLimiter);
  }

  // Authentication Routes (/api/v1/auth)
  apiRouter.use("/auth", createAuthRouter(options?.authRouterOptions));

  // Authenticated Dashboard Routes (/api/v1/dashboard)
  apiRouter.use("/dashboard", createDashboardRouter(options?.dashboardRouterOptions));

  // Protected Dashboard Authorization Probe (for testing & role verification)
  apiRouter.get("/auth/protected-probe", requireAuth, requireRole(["owner", "admin"]), (req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      data: {
        user: req.user,
        message: "Authorized dashboard access confirmed.",
      },
    });
  });

  // Leads Router (Public Quote Intake & Authenticated Lead Management)
  apiRouter.use("/leads", createLeadsRouter(options?.leadsRouterOptions));

  // Business Settings & Public Info Router (/api/v1/business)
  apiRouter.use("/business", createBusinessRouter());

  // Mount versioned API prefix
  app.use(env.API_PREFIX, apiRouter);

  // 404 Handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "The requested API resource does not exist.",
      },
    });
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}

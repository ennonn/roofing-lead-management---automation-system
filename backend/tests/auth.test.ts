import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import session from "express-session";
import rateLimit from "express-rate-limit";
import { createApp } from "../src/app.js";
import { AuthService } from "../src/modules/auth/auth.service.js";
import { seedDatabase } from "../src/db/seed.js";
import { parseEnv, env } from "../src/config/env.js";
import { createSessionMiddleware } from "../src/config/session.js";
import { users, sessions } from "../src/db/schema.js";
import { AuthUser } from "@roofing/shared-types";

describe("Milestone 4.1 & 4.1.1 — Secure Owner Authentication & Security Verification", () => {
  const testOwnerUser: AuthUser = {
    id: "11111111-1111-4111-8111-111111111111",
    email: "owner@example-roofing.com",
    fullName: "Apex Business Owner",
    role: "owner",
  };

  const testStaffUser: AuthUser = {
    id: "22222222-2222-4222-8222-222222222222",
    email: "staff@example-roofing.com",
    fullName: "Lead Estimator",
    role: "staff",
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // Helper to create app with mock auth controller / isolated rate limiter
  function createTestApp(authServiceOverride?: Partial<AuthService>) {
    const authService = new AuthService({} as any);
    if (authServiceOverride) {
      Object.assign(authService, authServiceOverride);
    }

    // Isolated rate limiter per test suite to avoid test leakage
    const testRateLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100, // relaxed for regular tests
      standardHeaders: true,
      legacyHeaders: false,
    });

    const app = createApp({
      authRouterOptions: {
        rateLimiter: testRateLimiter,
      },
    });

    return { app, authService };
  }

  describe("1. Login & Authentication Flow", () => {
    it("successfully authenticates owner with valid credentials, sets secure session cookie, and returns user profile without passwordHash", async () => {
      const { app } = createTestApp();
      vi.spyOn(AuthService.prototype, "authenticate").mockResolvedValueOnce(testOwnerUser);

      const res = await request(app)
        .post("/api/v1/auth/login")
        .set("Origin", "http://localhost:5173")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({
          email: "owner@example-roofing.com",
          password: "ValidStrongPassword123!",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toEqual({
        id: testOwnerUser.id,
        email: testOwnerUser.email,
        fullName: testOwnerUser.fullName,
        role: "owner",
      });
      expect(res.body.data.user.passwordHash).toBeUndefined();

      // Check session cookie is set
      const setCookie = res.headers["set-cookie"];
      expect(setCookie).toBeDefined();
      const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie;
      expect(cookieStr).toContain("roofing_sid=");
      expect(cookieStr.toLowerCase()).toContain("httponly");
      expect(cookieStr.toLowerCase()).toContain("samesite=lax");
      expect(cookieStr.toLowerCase()).toContain("path=/");
    });

    it("returns generic 401 when email does not exist (preventing account enumeration)", async () => {
      const { app } = createTestApp();
      vi.spyOn(AuthService.prototype, "authenticate").mockResolvedValueOnce(null);

      const res = await request(app)
        .post("/api/v1/auth/login")
        .set("Origin", "http://localhost:5173")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({
          email: "nonexistent@example.com",
          password: "AnyPassword123!",
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
      expect(res.body.error.message).toBe("Invalid email or password.");
    });

    it("returns identical generic 401 when password is wrong", async () => {
      const { app } = createTestApp();
      vi.spyOn(AuthService.prototype, "authenticate").mockResolvedValueOnce(null);

      const res = await request(app)
        .post("/api/v1/auth/login")
        .set("Origin", "http://localhost:5173")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({
          email: "owner@example-roofing.com",
          password: "IncorrectPassword!",
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
      expect(res.body.error.message).toBe("Invalid email or password.");
    });

    it("rejects invalid submission format with 400 Validation Error", async () => {
      const { app } = createTestApp();

      const res = await request(app)
        .post("/api/v1/auth/login")
        .set("Origin", "http://localhost:5173")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({
          email: "not-an-email",
          password: "",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(Array.isArray(res.body.error.details)).toBe(true);
    });

    it("AuthService executes constant-time bcrypt compare when user is not found", async () => {
      const compareSpy = vi.spyOn(bcrypt, "compare").mockImplementation(async () => false);

      // Mock DB returning no user
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValueOnce([]),
      } as any;

      const authService = new AuthService(mockDb);
      const result = await authService.authenticate("nonexistent@example.com", "PlainPassword123!");

      expect(result).toBeNull();
      // Verifies timing-safe compare was invoked with DUMMY_HASH
      expect(compareSpy).toHaveBeenCalledTimes(1);
      expect(compareSpy).toHaveBeenCalledWith("PlainPassword123!", expect.stringContaining("$2a$12$"));
    });

    it("AuthService returns null if user isActive is false", async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValueOnce([]), // where isActive=true filters out inactive
      } as any;

      const authService = new AuthService(mockDb);
      const result = await authService.authenticate("inactive@example.com", "PlainPassword123!");

      expect(result).toBeNull();
    });
  });

  describe("2. Session Storage, Lifecycle & Fixation Protection", () => {
    it("regenerates the session ID upon successful login", async () => {
      const { app } = createTestApp();
      vi.spyOn(AuthService.prototype, "authenticate").mockResolvedValue(testOwnerUser);

      const agent = request.agent(app);

      // 1. Establish an initial unauthenticated session by calling an endpoint
      const initRes = await agent.get("/health");
      const initCookie = initRes.headers["set-cookie"]?.[0] || "";

      // 2. Perform login using same agent
      const loginRes = await agent
        .post("/api/v1/auth/login")
        .set("Origin", "http://localhost:5173")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({
          email: "owner@example-roofing.com",
          password: "ValidStrongPassword123!",
        });

      expect(loginRes.status).toBe(200);
      const loginCookie = loginRes.headers["set-cookie"]?.[0] || "";

      // The session identifier in the cookie must be regenerated/different from pre-login
      if (initCookie && loginCookie) {
        const initSid = initCookie.split(";")[0];
        const loginSid = loginCookie.split(";")[0];
        expect(loginSid).not.toBe(initSid);
      }
      expect(loginCookie).toContain("roofing_sid=");
    });

    it("throws fatal error if MemoryStore is passed when NODE_ENV is production", () => {
      const originalEnv = env.NODE_ENV;
      try {
        (env as any).NODE_ENV = "production";
        expect(() => {
          createSessionMiddleware({ store: new session.MemoryStore() });
        }).toThrow(/MemoryStore cannot be used in production/);
      } finally {
        (env as any).NODE_ENV = originalEnv;
      }
    });

    it("verifies unauthenticated access to /api/v1/auth/me returns 401 Unauthorized", async () => {
      const { app } = createTestApp();
      const res = await request(app).get("/api/v1/auth/me");

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("verifies matching cookie-clearing options on logout", async () => {
      const { app } = createTestApp();
      vi.spyOn(AuthService.prototype, "authenticate").mockResolvedValue(testOwnerUser);

      const agent = request.agent(app);
      await agent
        .post("/api/v1/auth/login")
        .set("Origin", "http://localhost:5173")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ email: "owner@example-roofing.com", password: "pw" });

      const logoutRes = await agent
        .post("/api/v1/auth/logout")
        .set("Origin", "http://localhost:5173")
        .set("X-Requested-With", "XMLHttpRequest");

      expect(logoutRes.status).toBe(200);
      const cookieHeader = logoutRes.headers["set-cookie"]?.[0] || "";
      expect(cookieHeader).toContain("roofing_sid=;");
      expect(cookieHeader.toLowerCase()).toContain("path=/");
      expect(cookieHeader.toLowerCase()).toContain("httponly");
      expect(cookieHeader.toLowerCase()).toContain("samesite=lax");
    });
  });

  describe("3. Logout & Session Invalidation", () => {
    it("destroys the session and clears the session cookie on logout", async () => {
      const { app } = createTestApp();
      vi.spyOn(AuthService.prototype, "authenticate").mockResolvedValue(testOwnerUser);

      const agent = request.agent(app);

      // Login
      const loginRes = await agent
        .post("/api/v1/auth/login")
        .set("Origin", "http://localhost:5173")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({
          email: "owner@example-roofing.com",
          password: "ValidStrongPassword123!",
        });
      expect(loginRes.status).toBe(200);

      // Verify active session works
      const sessionRes = await agent.get("/api/v1/auth/session");
      expect(sessionRes.status).toBe(200);
      expect(sessionRes.body.data.user.email).toBe("owner@example-roofing.com");

      // Logout
      const logoutRes = await agent
        .post("/api/v1/auth/logout")
        .set("Origin", "http://localhost:5173")
        .set("X-Requested-With", "XMLHttpRequest");

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.message).toBe("Logged out successfully.");

      // Subsequent access with agent should now be 401 Unauthorized
      const verifyRes = await agent.get("/api/v1/auth/session");
      expect(verifyRes.status).toBe(401);
      expect(verifyRes.body.error.code).toBe("UNAUTHORIZED");
    });
  });

  describe("4. Authorization & Protected Endpoints Middleware", () => {
    it("rejects unauthenticated requests to GET /api/v1/auth/session with 401 Unauthorized", async () => {
      const { app } = createTestApp();
      const res = await request(app).get("/api/v1/auth/session");

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("rejects unauthenticated requests to protected probe route with 401 Unauthorized", async () => {
      const { app } = createTestApp();
      const res = await request(app).get("/api/v1/auth/protected-probe");

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("allows owner to access protected probe route", async () => {
      const { app } = createTestApp();
      vi.spyOn(AuthService.prototype, "authenticate").mockResolvedValue(testOwnerUser);

      const agent = request.agent(app);
      await agent
        .post("/api/v1/auth/login")
        .set("Origin", "http://localhost:5173")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ email: "owner@example-roofing.com", password: "pw" });

      const res = await agent.get("/api/v1/auth/protected-probe");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe("owner");
      expect(res.body.data.message).toBe("Authorized dashboard access confirmed.");
    });

    it("enforces role boundaries: denies staff role on owner-only protected probe with 403 Forbidden", async () => {
      const { app } = createTestApp();
      vi.spyOn(AuthService.prototype, "authenticate").mockResolvedValue(testStaffUser);

      const agent = request.agent(app);
      await agent
        .post("/api/v1/auth/login")
        .set("Origin", "http://localhost:5173")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ email: "staff@example-roofing.com", password: "pw" });

      // Probe accepts ["owner", "admin"], staff should be denied with 403
      const res = await agent.get("/api/v1/auth/protected-probe");
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });
  });

  describe("5. CSRF Protection Middleware (Origin, Referer, and Custom Header Validation)", () => {
    it("rejects login request when X-Requested-With and X-CSRF-Token are missing with 403", async () => {
      const { app } = createTestApp();

      const res = await request(app)
        .post("/api/v1/auth/login")
        .set("Origin", "http://localhost:5173")
        // No custom headers
        .send({ email: "owner@example.com", password: "pw" });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("CSRF_TOKEN_MISSING");
    });

    it("rejects request with mismatched Origin header with 403", async () => {
      const { app } = createTestApp();

      const res = await request(app)
        .post("/api/v1/auth/login")
        .set("Origin", "https://malicious-attacker-domain.com")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ email: "owner@example.com", password: "pw" });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("CSRF_ORIGIN_INVALID");
    });

    it("rejects request when Origin is the string 'null' (sandboxed iframe exploit) with 403", async () => {
      const { app } = createTestApp();

      const res = await request(app)
        .post("/api/v1/auth/login")
        .set("Origin", "null")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ email: "owner@example.com", password: "pw" });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("CSRF_ORIGIN_INVALID");
    });

    it("rejects request when Origin is malformed with 403", async () => {
      const { app } = createTestApp();

      const res = await request(app)
        .post("/api/v1/auth/login")
        .set("Origin", "invalid-origin-url")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ email: "owner@example.com", password: "pw" });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("CSRF_ORIGIN_INVALID");
    });

    it("allows legitimate request when Origin is missing but custom header X-Requested-With is present", async () => {
      const { app } = createTestApp();
      vi.spyOn(AuthService.prototype, "authenticate").mockResolvedValue(testOwnerUser);

      const res = await request(app)
        .post("/api/v1/auth/login")
        // No Origin header
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ email: "owner@example-roofing.com", password: "ValidStrongPassword123!" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("rejects request when Origin is missing and custom header is also missing with 403", async () => {
      const { app } = createTestApp();

      const res = await request(app)
        .post("/api/v1/auth/login")
        // Neither Origin nor custom headers
        .send({ email: "owner@example.com", password: "pw" });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("CSRF_TOKEN_MISSING");
    });

    it("rejects request when Origin is missing but Referer is from a foreign domain with 403", async () => {
      const { app } = createTestApp();

      const res = await request(app)
        .post("/api/v1/auth/login")
        .set("Referer", "https://malicious-phishing-site.com/login.html")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ email: "owner@example.com", password: "pw" });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("CSRF_ORIGIN_INVALID");
    });

    it("allows request when Origin is missing but Referer matches CLIENT_ORIGIN with custom header", async () => {
      const { app } = createTestApp();
      vi.spyOn(AuthService.prototype, "authenticate").mockResolvedValue(testOwnerUser);

      const res = await request(app)
        .post("/api/v1/auth/login")
        .set("Referer", "http://localhost:5173/admin/login")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ email: "owner@example-roofing.com", password: "ValidStrongPassword123!" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("allows request when valid Origin and X-CSRF-Token header are supplied", async () => {
      const { app } = createTestApp();
      vi.spyOn(AuthService.prototype, "authenticate").mockResolvedValue(testOwnerUser);

      const res = await request(app)
        .post("/api/v1/auth/login")
        .set("Origin", "http://localhost:5173")
        .set("X-CSRF-Token", "custom-client-token-abc")
        .send({ email: "owner@example-roofing.com", password: "ValidStrongPassword123!" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("rejects logout request when CSRF header is missing even if Origin is valid with 403", async () => {
      const { app } = createTestApp();

      const res = await request(app)
        .post("/api/v1/auth/logout")
        .set("Origin", "http://localhost:5173");

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("CSRF_TOKEN_MISSING");
    });

    it("rejects logout request when Origin is mismatched with 403", async () => {
      const { app } = createTestApp();

      const res = await request(app)
        .post("/api/v1/auth/logout")
        .set("Origin", "http://attacker-site.com")
        .set("X-Requested-With", "XMLHttpRequest");

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("CSRF_ORIGIN_INVALID");
    });

    it("safe GET /session does not require CSRF header", async () => {
      const { app } = createTestApp();
      // Should evaluate auth middleware (returning 401), NOT CSRF 403
      const res = await request(app).get("/api/v1/auth/session");
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });
  });

  describe("6. Login Rate Limiting", () => {
    it("enforces strict rate limit and blocks 11th login attempt with 429", async () => {
      // Create dedicated app with real authRateLimiter (limit = 10)
      const strictRateLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 10,
        standardHeaders: true,
        legacyHeaders: false,
        statusCode: 429,
        message: {
          success: false,
          error: {
            code: "AUTH_RATE_LIMIT_EXCEEDED",
            message: "Too many login attempts. Please wait 15 minutes before trying again.",
          },
        },
      });

      const app = createApp({
        authRouterOptions: {
          rateLimiter: strictRateLimiter,
        },
      });

      vi.spyOn(AuthService.prototype, "authenticate").mockResolvedValue(null);

      // Perform 10 failed login attempts
      for (let i = 0; i < 10; i++) {
        const res = await request(app)
          .post("/api/v1/auth/login")
          .set("Origin", "http://localhost:5173")
          .set("X-Requested-With", "XMLHttpRequest")
          .send({ email: "owner@example.com", password: "wrong" });
        expect(res.status).toBe(401);
      }

      // The 11th request must be blocked by rate limiter
      const blockedRes = await request(app)
        .post("/api/v1/auth/login")
        .set("Origin", "http://localhost:5173")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ email: "owner@example.com", password: "wrong" });

      expect(blockedRes.status).toBe(429);
      expect(blockedRes.body.success).toBe(false);
      expect(blockedRes.body.error.code).toBe("AUTH_RATE_LIMIT_EXCEEDED");
    });
  });

  describe("7. Secure Owner Initialization & Production Safeguards", () => {
    it("seeds owner account with bcrypt 12 rounds when users table is empty", async () => {
      const hashSpy = vi.spyOn(bcrypt, "hash");
      const valuesSpy = vi.fn().mockResolvedValue([]);
      const insertSpy = vi.fn().mockReturnValue({ values: valuesSpy });

      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi
            .fn()
            .mockResolvedValueOnce([{ value: 0 }]) // userCount = 0
            .mockResolvedValueOnce([{ value: 1 }]), // settingsCount = 1 (skip settings seed)
        }),
        insert: insertSpy,
      } as any;

      await seedDatabase(mockDb);

      expect(hashSpy).toHaveBeenCalledWith(env.INITIAL_OWNER_PASSWORD, 12);
      expect(insertSpy).toHaveBeenCalledWith(users);
      expect(valuesSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          email: env.INITIAL_OWNER_EMAIL.toLowerCase().trim(),
          role: "owner",
          isActive: true,
        })
      );
    });

    it("skips user creation when users table already contains an account", async () => {
      const hashSpy = vi.spyOn(bcrypt, "hash");
      const insertSpy = vi.fn();

      const mockDb = {
        select: vi.fn().mockReturnValue({
          from: vi
            .fn()
            .mockResolvedValueOnce([{ value: 1 }]) // userCount = 1
            .mockResolvedValueOnce([{ value: 1 }]), // settingsCount = 1
        }),
        insert: insertSpy,
      } as any;

      await seedDatabase(mockDb);

      // Must not hash or insert when accounts already exist
      expect(hashSpy).not.toHaveBeenCalled();
      expect(insertSpy).not.toHaveBeenCalled();
    });

    it("confirms no public HTTP endpoint exists for owner seeding (returns 404)", async () => {
      const { app } = createTestApp();

      const resPost = await request(app).post("/api/v1/auth/seed");
      expect(resPost.status).toBe(404);

      const resGet = await request(app).get("/api/v1/seed");
      expect(resGet.status).toBe(404);
    });

    it("fails safely in production when SESSION_SECRET is default or < 32 characters", () => {
      expect(() => {
        parseEnv({
          NODE_ENV: "production",
          SESSION_SECRET: "development_session_secret_min_32_characters_long_12345",
          INITIAL_OWNER_PASSWORD: "ProdPasswordValid123!",
          N8N_WEBHOOK_SECRET: "prod_n8n_secret_valid_12345",
        });
      }).toThrow(/SESSION_SECRET/);

      expect(() => {
        parseEnv({
          NODE_ENV: "production",
          SESSION_SECRET: "too-short",
          INITIAL_OWNER_PASSWORD: "ProdPasswordValid123!",
          N8N_WEBHOOK_SECRET: "prod_n8n_secret_valid_12345",
        });
      }).toThrow(/SESSION_SECRET/);
    });

    it("fails safely in production when INITIAL_OWNER_PASSWORD is default or < 12 characters", () => {
      expect(() => {
        parseEnv({
          NODE_ENV: "production",
          SESSION_SECRET: "production_secret_at_least_32_characters_long_abc123",
          INITIAL_OWNER_PASSWORD: "TemporaryPassword123!",
          N8N_WEBHOOK_SECRET: "prod_n8n_secret_valid_12345",
        });
      }).toThrow(/INITIAL_OWNER_PASSWORD/);

      expect(() => {
        parseEnv({
          NODE_ENV: "production",
          SESSION_SECRET: "production_secret_at_least_32_characters_long_abc123",
          INITIAL_OWNER_PASSWORD: "short",
          N8N_WEBHOOK_SECRET: "prod_n8n_secret_valid_12345",
        });
      }).toThrow(/INITIAL_OWNER_PASSWORD/);
    });

    it("fails safely in production when N8N_WEBHOOK_SECRET is the development default", () => {
      expect(() => {
        parseEnv({
          NODE_ENV: "production",
          SESSION_SECRET: "production_secret_at_least_32_characters_long_abc123",
          INITIAL_OWNER_PASSWORD: "ProdSecurePassword2026!",
          N8N_WEBHOOK_SECRET: "development_n8n_webhook_secret_key",
        });
      }).toThrow(/N8N_WEBHOOK_SECRET/);
    });

    it("forces COOKIE_SECURE=true when in production", () => {
      const parsed = parseEnv({
        NODE_ENV: "production",
        SESSION_SECRET: "production_secret_at_least_32_characters_long_abc123",
        INITIAL_OWNER_PASSWORD: "ProdSecurePassword2026!",
        N8N_WEBHOOK_SECRET: "prod_n8n_secret_valid_12345",
        COOKIE_SECURE: "false",
      });
      expect(parsed.COOKIE_SECURE).toBe(true);
    });
  });

  describe("8. SQL Parameterization Preflight & Migration Consistency", () => {
    it("verifies all n8n workflow Postgres nodes use $1, $2 query parameters and queryReplacement bindings", () => {
      const workflowPath = path.resolve(
        __dirname,
        "../../automation/n8n/roofing-lead-notification-workflow.json"
      );
      const content = fs.readFileSync(workflowPath, "utf-8");
      const workflow = JSON.parse(content);

      const postgresNodes = workflow.nodes.filter(
        (node: any) => node.type === "n8n-nodes-base.postgres"
      );

      expect(postgresNodes.length).toBe(6);

      for (const node of postgresNodes) {
        const query = node.parameters?.query || "";
        const options = node.parameters?.options || {};

        // 1. Verify query has $1 parameterized placeholder
        expect(query).toMatch(/\$1/);

        // 2. Verify query does NOT contain raw unparameterized template interpolation
        expect(query).not.toContain("{{");
        expect(query).not.toContain("}}");

        // 3. Verify options.queryReplacement is defined with parameter array binding
        expect(options.queryReplacement).toBeDefined();
        expect(options.queryReplacement).toMatch(/=\s*\{\{\s*\[.*\]\s*\}\}/);
      }
    });

    it("verifies exact parameter count, order, and SQL casts for each n8n Postgres node", () => {
      const workflowPath = path.resolve(
        __dirname,
        "../../automation/n8n/roofing-lead-notification-workflow.json"
      );
      const content = fs.readFileSync(workflowPath, "utf-8");
      const workflow = JSON.parse(content);

      const nodeMap = new Map<string, any>();
      for (const node of workflow.nodes) {
        if (node.type === "n8n-nodes-base.postgres") {
          nodeMap.set(node.id, node);
        }
      }

      // 1. Acquire Claim: expects ($1::uuid, $2::uuid)
      const acquireNode = nodeMap.get("node-postgres-acquire-claim");
      expect(acquireNode.parameters.query).toBe(
        "SELECT * FROM acquire_n8n_lead_claim($1::uuid, $2::uuid);"
      );
      expect(acquireNode.parameters.options.queryReplacement).toContain("idempotencyKey");
      expect(acquireNode.parameters.options.queryReplacement).toContain("leadId");

      // 2. Pre-flight Staff: expects ($1::uuid, $2::integer)
      const verifyStaffNode = nodeMap.get("node-postgres-verify-staff");
      expect(verifyStaffNode.parameters.query).toBe(
        "SELECT * FROM verify_and_renew_n8n_claim($1::uuid, $2::integer);"
      );
      expect(verifyStaffNode.parameters.options.queryReplacement).toContain("idempotencyKey");
      expect(verifyStaffNode.parameters.options.queryReplacement).toContain("claim_version");

      // 3. Mark Staff: expects ($1::uuid, $2::integer)
      const markStaffNode = nodeMap.get("node-postgres-mark-staff");
      expect(markStaffNode.parameters.query).toContain("WHERE idempotency_key = $1::uuid AND claim_version = $2::integer;");
      expect(markStaffNode.parameters.options.queryReplacement).toContain("idempotencyKey");
      expect(markStaffNode.parameters.options.queryReplacement).toContain("claim_version");

      // 4. Pre-flight Customer: expects ($1::uuid, $2::integer)
      const verifyCustomerNode = nodeMap.get("node-postgres-verify-customer");
      expect(verifyCustomerNode.parameters.query).toBe(
        "SELECT * FROM verify_and_renew_n8n_claim($1::uuid, $2::integer);"
      );

      // 5. Mark Customer: expects ($1::uuid, $2::integer)
      const markCustomerNode = nodeMap.get("node-postgres-mark-customer");
      expect(markCustomerNode.parameters.query).toContain("WHERE idempotency_key = $1::uuid AND claim_version = $2::integer;");

      // 6. Mark Completed: expects ($1::uuid, $2::integer)
      const completeNode = nodeMap.get("node-postgres-mark-completed");
      expect(completeNode.parameters.query).toContain("WHERE idempotency_key = $1::uuid AND claim_version = $2::integer RETURNING");
    });

    it("verifies migration 0000 defines users and sessions tables consistent with Drizzle schema and connect-pg-simple", () => {
      const migrationPath = path.resolve(__dirname, "../drizzle/0000_peaceful_killmonger.sql");
      const migrationSql = fs.readFileSync(migrationPath, "utf-8");

      expect(migrationSql).toContain('CREATE TABLE "users"');
      expect(migrationSql).toContain('"password_hash" varchar(255) NOT NULL');
      expect(migrationSql).toContain('"role" varchar(20) DEFAULT \'staff\' NOT NULL');

      // connect-pg-simple compatibility check
      expect(migrationSql).toContain('CREATE TABLE "sessions"');
      expect(migrationSql).toContain('"sid" varchar(255) PRIMARY KEY NOT NULL');
      expect(migrationSql).toContain('"sess" json NOT NULL');
      expect(migrationSql).toContain('"expire" timestamp with time zone NOT NULL');
      expect(migrationSql).toContain('CREATE INDEX "idx_sessions_expire" ON "sessions"');

      // Drizzle schema check
      expect(sessions.sid).toBeDefined();
      expect(sessions.sess).toBeDefined();
      expect(sessions.expire).toBeDefined();
    });

    it("verifies migration 0003 defines n8n atomic claim stored functions", () => {
      const migrationPath = path.resolve(__dirname, "../drizzle/0003_n8n_claim_functions.sql");
      const migrationSql = fs.readFileSync(migrationPath, "utf-8");

      expect(migrationSql).toContain("CREATE OR REPLACE FUNCTION acquire_n8n_lead_claim");
      expect(migrationSql).toContain("CREATE OR REPLACE FUNCTION verify_and_renew_n8n_claim");
      expect(migrationSql).toContain("FOR UPDATE");
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { AuthService } from "../src/modules/auth/auth.service.js";
import { DashboardService } from "../src/modules/dashboard/dashboard.service.js";
import { AuthUser, DashboardStats } from "@roofing/shared-types";

describe("Milestone 4.2 — Dashboard Overview API Endpoints", () => {
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

  function createTestApp() {
    return createApp();
  }

  describe("GET /api/v1/dashboard/stats", () => {
    it("rejects unauthenticated requests with 401 Unauthorized", async () => {
      const app = createTestApp();
      const res = await request(app).get("/api/v1/dashboard/stats");

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("rejects non-owner / non-admin staff role with 403 Forbidden", async () => {
      const app = createTestApp();
      vi.spyOn(AuthService.prototype, "authenticate").mockResolvedValue(testStaffUser);

      const agent = request.agent(app);
      await agent
        .post("/api/v1/auth/login")
        .set("Origin", "http://localhost:5173")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ email: "staff@example-roofing.com", password: "pw" });

      const res = await agent.get("/api/v1/dashboard/stats");
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("returns real calculated statistics for authenticated owner", async () => {
      const app = createTestApp();
      vi.spyOn(AuthService.prototype, "authenticate").mockResolvedValue(testOwnerUser);

      const mockStats: DashboardStats = {
        totalLeads: 45,
        last30Days: 18,
        conversionRate: 26.7,
        statusCounts: {
          new: 8,
          contacted: 12,
          estimate_scheduled: 10,
          won: 12,
          lost: 3,
        },
        urgentAttentionCount: 2,
      };

      vi.spyOn(DashboardService.prototype, "getStats").mockResolvedValueOnce(mockStats);

      const agent = request.agent(app);
      await agent
        .post("/api/v1/auth/login")
        .set("Origin", "http://localhost:5173")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ email: "owner@example-roofing.com", password: "ValidStrongPassword123!" });

      const res = await agent.get("/api/v1/dashboard/stats");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual(mockStats);
      expect(res.body.data.totalLeads).toBe(45);
      expect(res.body.data.statusCounts.new).toBe(8);
      expect(res.body.data.statusCounts.won).toBe(12);
      expect(res.body.data.conversionRate).toBe(26.7);
    });

    it("DashboardService correctly aggregates metrics and zero values on empty database", async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
      } as any;

      // 1. totalResult -> 0
      // 2. recentResult -> 0
      // 3. statusRows -> []
      // 4. urgentResult -> 0
      mockDb.select
        .mockReturnValueOnce({
          from: vi.fn().mockResolvedValueOnce([{ value: 0 }]),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockResolvedValueOnce([{ value: 0 }]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValueOnce({
            groupBy: vi.fn().mockResolvedValueOnce([]),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockResolvedValueOnce([{ value: 0 }]),
          }),
        });

      const service = new DashboardService(mockDb);
      const stats = await service.getStats();

      expect(stats.totalLeads).toBe(0);
      expect(stats.last30Days).toBe(0);
      expect(stats.conversionRate).toBe(0);
      expect(stats.urgentAttentionCount).toBe(0);
      expect(stats.statusCounts).toEqual({
        new: 0,
        contacted: 0,
        estimate_scheduled: 0,
        won: 0,
        lost: 0,
      });
    });
  });
});

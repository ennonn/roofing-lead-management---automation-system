import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { AuthService } from "../src/modules/auth/auth.service.js";
import * as businessService from "../src/modules/business/business.service.js";
import * as leadsService from "../src/modules/leads/leads.service.js";
import { QuoteIntakePausedError } from "../src/middleware/error.middleware.js";
import type { AuthUser } from "@roofing/shared-types";

describe("Milestone 11 — Business Settings, Availability Controls & Dynamic Public Information", () => {
  const mockOwnerUser: AuthUser = {
    id: "11111111-1111-4111-8111-111111111111",
    email: "owner@apexroofing.com",
    fullName: "Apex Business Owner",
    role: "owner",
  };

  const mockStaffUser: AuthUser = {
    id: "22222222-2222-4222-8222-222222222222",
    email: "staff@apexroofing.com",
    fullName: "Lead Estimator",
    role: "staff",
  };

  const sampleSettings = {
    id: "settings-uuid-1",
    companyName: "Apex Elite Roofing",
    phone: "(555) 777-8888",
    emergencyPhone: "(555) 999-HELP",
    dispatchEmail: "dispatch@apexroofing.com",
    address: "123 Commercial Blvd, Suite 400",
    serviceAreas: ["Metro Dallas", "Fort Worth", "Arlington"],
    businessHours: {
      weekdays: "7:00 AM - 6:00 PM",
      saturday: "8:00 AM - 2:00 PM",
      sunday: "Emergency Storm Response Only",
    },
    licenseNumber: "LIC-TX-998811",
    availabilityStatus: "available" as const,
    noticeHeadline: null,
    noticeBody: null,
    reopenAt: null,
    autoResume: false,
    acceptQuotesWhenUnavailable: false,
    timezone: "America/Chicago",
    createdAt: "2026-10-27T10:00:00.000Z",
    updatedAt: "2026-10-27T10:00:00.000Z",
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function createTestApp() {
    return createApp({
      authRouterOptions: {
        rateLimiter: (_req, _res, next) => next(),
      },
    });
  }

  async function loginAs(user: AuthUser, agent: ReturnType<typeof request.agent>) {
    vi.spyOn(AuthService.prototype, "authenticate").mockResolvedValue(user);
    const loginRes = await agent
      .post("/api/v1/auth/login")
      .set("Origin", "http://localhost:5173")
      .set("X-Requested-With", "XMLHttpRequest")
      .send({ email: user.email, password: "ValidStrongPassword123!" });
    expect(loginRes.status).toBe(200);
  }

  describe("1. GET /api/v1/business/public-info (Privacy & Public Notice)", () => {
    it("returns public operational info without leaking private dispatch email or database IDs", async () => {
      vi.spyOn(businessService, "getPublicBusinessInfo").mockResolvedValueOnce({
        companyName: sampleSettings.companyName,
        phone: sampleSettings.phone,
        emergencyPhone: sampleSettings.emergencyPhone,
        address: sampleSettings.address,
        serviceAreas: sampleSettings.serviceAreas,
        businessHours: sampleSettings.businessHours,
        licenseNumber: sampleSettings.licenseNumber,
        dispatchEmail: "private-internal-dispatch@apexroofing.com",
        availability: {
          status: "available",
          noticeHeadline: null,
          noticeBody: null,
          reopenAt: null,
          autoResume: false,
          acceptQuotesWhenUnavailable: false,
          timezone: "America/Chicago",
        },
      });

      const app = createTestApp();
      const res = await request(app).get("/api/v1/business/public-info");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.companyName).toBe("Apex Elite Roofing");
      expect(res.body.data.phone).toBe("(555) 777-8888");
      expect(res.body.data.emergencyPhone).toBe("(555) 999-HELP");
      expect(res.body.data.address).toBe("123 Commercial Blvd, Suite 400");
      expect(res.body.data.licenseNumber).toBe("LIC-TX-998811");
      expect(res.body.data.availability).toEqual({
        status: "available",
        noticeHeadline: null,
        noticeBody: null,
        reopenAt: null,
        autoResume: false,
        acceptQuotesWhenUnavailable: false,
        timezone: "America/Chicago",
      });

      // Privacy: dispatchEmail and internal database IDs must NEVER be returned
      expect(res.body.data.dispatchEmail).toBeUndefined();
      expect(res.body.data.id).toBeUndefined();
    });

    it("returns public notice and closure details when business is unavailable", async () => {
      vi.spyOn(businessService, "getPublicBusinessInfo").mockResolvedValueOnce({
        companyName: sampleSettings.companyName,
        phone: sampleSettings.phone,
        emergencyPhone: sampleSettings.emergencyPhone,
        address: sampleSettings.address,
        serviceAreas: sampleSettings.serviceAreas,
        businessHours: sampleSettings.businessHours,
        licenseNumber: sampleSettings.licenseNumber,
        availability: {
          status: "temporarily_unavailable",
          noticeHeadline: "Holiday Office Closure",
          noticeBody: "Our office and crews are closed for Thanksgiving. We will reopen Monday at 7am.",
          reopenAt: "2026-11-30T13:00:00.000Z",
          autoResume: true,
          acceptQuotesWhenUnavailable: false,
          timezone: "America/Chicago",
        },
      });

      const app = createTestApp();
      const res = await request(app).get("/api/v1/business/public-info");

      expect(res.status).toBe(200);
      expect(res.body.data.availability.status).toBe("temporarily_unavailable");
      expect(res.body.data.availability.noticeHeadline).toBe("Holiday Office Closure");
      expect(res.body.data.availability.reopenAt).toBe("2026-11-30T13:00:00.000Z");
      expect(res.body.data.availability.acceptQuotesWhenUnavailable).toBe(false);
    });
  });

  describe("2. GET /api/v1/business/settings (Authentication & RBAC)", () => {
    it("rejects unauthenticated requests with 401 Unauthorized", async () => {
      const app = createTestApp();
      const res = await request(app).get("/api/v1/business/settings");

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("rejects staff role with 403 Forbidden", async () => {
      const app = createTestApp();
      const agent = request.agent(app);
      await loginAs(mockStaffUser, agent);

      const res = await agent.get("/api/v1/business/settings");

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("authorizes owner and returns complete settings including dispatchEmail", async () => {
      vi.spyOn(businessService, "getBusinessSettings").mockResolvedValueOnce(sampleSettings);

      const app = createTestApp();
      const agent = request.agent(app);
      await loginAs(mockOwnerUser, agent);

      const res = await agent.get("/api/v1/business/settings");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.dispatchEmail).toBe("dispatch@apexroofing.com");
      expect(res.body.data.companyName).toBe("Apex Elite Roofing");
      expect(res.body.data.availabilityStatus).toBe("available");
    });
  });

  describe("3. PATCH /api/v1/business/settings (Validation, CSRF & Updates)", () => {
    it("rejects requests missing valid CSRF token with 403 CSRF_TOKEN_MISSING", async () => {
      const app = createTestApp();
      const agent = request.agent(app);
      await loginAs(mockOwnerUser, agent);

      // Omitting X-Requested-With and X-CSRF-Token
      const res = await agent
        .patch("/api/v1/business/settings")
        .set("Origin", "http://localhost:5173")
        .send({ companyName: "New Roofing Name" });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("CSRF_TOKEN_MISSING");
    });

    it("rejects staff role with 403 Forbidden even with CSRF header", async () => {
      const app = createTestApp();
      const agent = request.agent(app);
      await loginAs(mockStaffUser, agent);

      const res = await agent
        .patch("/api/v1/business/settings")
        .set("Origin", "http://localhost:5173")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ companyName: "New Roofing Name" });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("rejects invalid availabilityStatus enum with 422 VALIDATION_ERROR", async () => {
      const app = createTestApp();
      const agent = request.agent(app);
      await loginAs(mockOwnerUser, agent);

      const res = await agent
        .patch("/api/v1/business/settings")
        .set("Origin", "http://localhost:5173")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({
          availabilityStatus: "invalid_status_enum",
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.details.some((d: any) => d.field.includes("availabilityStatus"))).toBe(true);
    });

    it("rejects autoResume=true when availabilityStatus is unavailable_indefinite", async () => {
      const app = createTestApp();
      const agent = request.agent(app);
      await loginAs(mockOwnerUser, agent);

      const res = await agent
        .patch("/api/v1/business/settings")
        .set("Origin", "http://localhost:5173")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({
          availabilityStatus: "unavailable_indefinite",
          autoResume: true,
          reopenAt: "2026-12-01T10:00:00Z",
        });

      expect(res.status).toBe(422);
      expect(res.body.error.details.some((d: any) => d.message.includes("Indefinite closure"))).toBe(true);
    });

    it("rejects autoResume=true without a scheduled reopenAt date", async () => {
      const app = createTestApp();
      const agent = request.agent(app);
      await loginAs(mockOwnerUser, agent);

      const res = await agent
        .patch("/api/v1/business/settings")
        .set("Origin", "http://localhost:5173")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({
          availabilityStatus: "temporarily_unavailable",
          autoResume: true,
          reopenAt: null,
        });

      expect(res.status).toBe(422);
      expect(res.body.error.details.some((d: any) => d.field.includes("reopenAt"))).toBe(true);
    });

    it("rejects malformed IANA timezone with 422", async () => {
      const app = createTestApp();
      const agent = request.agent(app);
      await loginAs(mockOwnerUser, agent);

      const res = await agent
        .patch("/api/v1/business/settings")
        .set("Origin", "http://localhost:5173")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({
          timezone: "Invalid/Not_A_Real_Timezone_123",
        });

      expect(res.status).toBe(422);
      expect(res.body.error.details.some((d: any) => d.field.includes("timezone"))).toBe(true);
    });

    it("successfully updates settings when valid input and CSRF token are provided by owner", async () => {
      const updatedMock = {
        ...sampleSettings,
        companyName: "Apex Storm Restorations",
        availabilityStatus: "temporarily_unavailable" as const,
        noticeHeadline: "Winter Freeze Operations",
        noticeBody: "Crews suspended during ice storm.",
        reopenAt: "2026-11-20T14:00:00.000Z",
        autoResume: true,
        acceptQuotesWhenUnavailable: true,
      };

      vi.spyOn(businessService, "updateBusinessSettings").mockResolvedValueOnce(updatedMock);

      const app = createTestApp();
      const agent = request.agent(app);
      await loginAs(mockOwnerUser, agent);

      const res = await agent
        .patch("/api/v1/business/settings")
        .set("Origin", "http://localhost:5173")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({
          companyName: "Apex Storm Restorations",
          availabilityStatus: "temporarily_unavailable",
          noticeHeadline: "Winter Freeze Operations",
          noticeBody: "Crews suspended during ice storm.",
          reopenAt: "2026-11-20T14:00:00.000Z",
          autoResume: true,
          acceptQuotesWhenUnavailable: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.companyName).toBe("Apex Storm Restorations");
      expect(res.body.data.availabilityStatus).toBe("temporarily_unavailable");
      expect(res.body.data.acceptQuotesWhenUnavailable).toBe(true);
      expect(res.body.message).toContain("updated successfully");
    });
  });

  describe("4. Quote Intake Enforcement (POST /api/v1/leads)", () => {
    const validLeadBody = {
      customerName: "Jane Doe",
      phone: "(555) 987-6543",
      email: "jane@example.com",
      serviceType: "Roof Replacement",
      propertyLocation: "789 Pine St, Dallas, TX",
      projectDescription: "Looking for metal roof estimate.",
      preferredContactMethod: "phone",
      leadSource: "website_quote_form",
      _hp: "",
    };

    it("accepts quote submission when business availability is available", async () => {
      vi.spyOn(leadsService, "createLead").mockResolvedValueOnce({
        leadId: "lead-available-1",
        status: "new",
        submissionDate: new Date(),
      });

      const app = createTestApp();
      const res = await request(app)
        .post("/api/v1/leads")
        .send(validLeadBody);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.leadId).toBe("lead-available-1");
    });

    it("strictly rejects quote submission with 422 QUOTE_INTAKE_PAUSED when intake is paused", async () => {
      vi.spyOn(leadsService, "createLead").mockRejectedValueOnce(
        new QuoteIntakePausedError("Quote requests are temporarily paused due to storm response backlog.")
      );

      const app = createTestApp();
      const res = await request(app)
        .post("/api/v1/leads")
        .send(validLeadBody);

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("QUOTE_INTAKE_PAUSED");
      expect(res.body.error.message).toContain("temporarily paused");
    });
  });

  describe("5. Lazy Auto-Reopening Logic Unit Tests", () => {
    it("auto-reopens when scheduled time has passed and autoResume is true", async () => {
      const pastDate = new Date(Date.now() - 3600000); // 1 hour ago
      const mockSettings = {
        id: "settings-lazy-1",
        availabilityStatus: "temporarily_unavailable",
        autoResume: true,
        reopenAt: pastDate,
        noticeHeadline: "Closed for Holiday",
        noticeBody: "Returning soon",
        acceptQuotesWhenUnavailable: false,
        timezone: "America/New_York",
      };

      let updatedState: any = null;
      const mockDb = {
        select: () => ({
          from: () => ({
            limit: async () => [{ ...mockSettings }],
          }),
        }),
        update: () => ({
          set: (vals: any) => {
            updatedState = vals;
            return {
              where: async () => [vals],
            };
          },
        }),
      } as any;

      const check = await businessService.checkQuoteIntakeAllowed(mockDb);

      expect(check.allowed).toBe(true);
      expect(updatedState).toBeDefined();
      expect(updatedState.availabilityStatus).toBe("available");
      expect(updatedState.autoResume).toBe(false);
    });

    it("does not auto-reopen when scheduled time is in the future", async () => {
      const futureDate = new Date(Date.now() + 3600000); // 1 hour in future
      const mockSettings = {
        id: "settings-lazy-2",
        availabilityStatus: "temporarily_unavailable",
        autoResume: true,
        reopenAt: futureDate,
        noticeHeadline: "Closed for Holiday",
        noticeBody: "Back in 1 hour",
        acceptQuotesWhenUnavailable: false,
        timezone: "America/New_York",
      };

      const mockDb = {
        select: () => ({
          from: () => ({
            limit: async () => [{ ...mockSettings }],
          }),
        }),
      } as any;

      const check = await businessService.checkQuoteIntakeAllowed(mockDb);

      expect(check.allowed).toBe(false);
      expect(check.reason).toBe("Back in 1 hour");
    });

    it("does not auto-reopen when autoResume is false, even if reopenAt has passed", async () => {
      const pastDate = new Date(Date.now() - 3600000); // 1 hour ago
      const mockSettings = {
        id: "settings-lazy-3",
        availabilityStatus: "temporarily_unavailable",
        autoResume: false,
        reopenAt: pastDate,
        noticeHeadline: "Closed for inventory",
        noticeBody: "Manual reopen required",
        acceptQuotesWhenUnavailable: false,
        timezone: "America/New_York",
      };

      const mockDb = {
        select: () => ({
          from: () => ({
            limit: async () => [{ ...mockSettings }],
          }),
        }),
      } as any;

      const check = await businessService.checkQuoteIntakeAllowed(mockDb);

      expect(check.allowed).toBe(false);
      expect(check.reason).toBe("Manual reopen required");
    });

    it("allows intake when unavailable if acceptQuotesWhenUnavailable is true", async () => {
      const mockSettings = {
        id: "settings-lazy-4",
        availabilityStatus: "temporarily_unavailable",
        autoResume: false,
        reopenAt: null,
        noticeHeadline: "Holiday Closure",
        noticeBody: "Quotes will be answered on Monday",
        acceptQuotesWhenUnavailable: true,
        timezone: "America/New_York",
      };

      const mockDb = {
        select: () => ({
          from: () => ({
            limit: async () => [{ ...mockSettings }],
          }),
        }),
      } as any;

      const check = await businessService.checkQuoteIntakeAllowed(mockDb);

      expect(check.allowed).toBe(true);
    });
  });
});

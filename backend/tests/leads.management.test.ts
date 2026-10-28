import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { AuthService } from "../src/modules/auth/auth.service.js";
import * as leadsService from "../src/modules/leads/leads.service.js";
import type {
  AuthUser,
  Lead,
  LeadListItem,
  LeadWithNotes,
  LeadNote,
  LeadListResponse,
} from "@roofing/shared-types";

describe("Milestone 4.3.1 — Lead Management API Endpoints", () => {
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

  const validLeadId = "7b3b3a62-4217-48f8-b118-2ad16a69df4a";
  const missingLeadId = "99999999-9999-4999-8999-999999999999";

  const mockLeadListItem: LeadListItem = {
    id: validLeadId,
    customerName: "Jane Doe",
    phone: "(555) 234-5678",
    email: "jane.doe@example.com",
    serviceType: "Roof Replacement",
    propertyLocation: "123 Maple St, Dallas, TX 75201",
    status: "new",
    submissionDate: "2026-10-27T14:30:00.000Z",
    lastStatusUpdate: "2026-10-27T14:30:00.000Z",
    notesCount: 2,
    createdAt: "2026-10-27T14:30:00.000Z",
  };

  const mockLeadWithNotes: LeadWithNotes = {
    id: validLeadId,
    customerName: "Jane Doe",
    phone: "(555) 234-5678",
    email: "jane.doe@example.com",
    serviceType: "Roof Replacement",
    propertyLocation: "123 Maple St, Dallas, TX 75201",
    projectDescription: "Asphalt shingle roof is 22 years old and leaking around chimney.",
    preferredContactMethod: "phone",
    leadSource: "website_quote_form",
    status: "contacted",
    automationStatus: "delivered",
    submissionDate: "2026-10-27T14:30:00.000Z",
    lastStatusUpdate: "2026-10-27T15:10:00.000Z",
    createdAt: "2026-10-27T14:30:00.000Z",
    updatedAt: "2026-10-27T15:10:00.000Z",
    notes: [
      {
        id: "119842c2-8089-4bc5-827c-c820b9e8432a",
        leadId: validLeadId,
        authorId: testOwnerUser.id,
        authorName: "Apex Business Owner",
        noteText: "Called homeowner. Booked roof inspection for Thursday at 2:00 PM.",
        createdAt: "2026-10-27T15:10:00.000Z",
      },
    ],
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

  // ============================================================================
  // 1. Authentication & Authorization Boundaries
  // ============================================================================
  describe("Authentication & Authorization Enforcement", () => {
    it("rejects unauthenticated requests to GET /leads with 401 Unauthorized", async () => {
      const app = createTestApp();
      const res = await request(app).get("/api/v1/leads");
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("rejects staff role on GET /leads with 403 Forbidden", async () => {
      const app = createTestApp();
      const agent = request.agent(app);
      await loginAs(testStaffUser, agent);

      const res = await agent.get("/api/v1/leads");
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("rejects unauthenticated requests to GET /leads/:id with 401 Unauthorized", async () => {
      const app = createTestApp();
      const res = await request(app).get(`/api/v1/leads/${validLeadId}`);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("rejects staff role on GET /leads/:id with 403 Forbidden", async () => {
      const app = createTestApp();
      const agent = request.agent(app);
      await loginAs(testStaffUser, agent);

      const res = await agent.get(`/api/v1/leads/${validLeadId}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it("rejects status updates without CSRF custom header with 403 Forbidden", async () => {
      const app = createTestApp();
      const agent = request.agent(app);
      await loginAs(testOwnerUser, agent);

      // Omitting X-Requested-With and X-CSRF-Token
      const res = await agent
        .patch(`/api/v1/leads/${validLeadId}/status`)
        .set("Origin", "http://localhost:5173")
        .send({ status: "contacted" });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("CSRF_TOKEN_MISSING");
    });

    it("rejects note creation without CSRF custom header with 403 Forbidden", async () => {
      const app = createTestApp();
      const agent = request.agent(app);
      await loginAs(testOwnerUser, agent);

      const res = await agent
        .post(`/api/v1/leads/${validLeadId}/notes`)
        .set("Origin", "http://localhost:5173")
        .send({ noteText: "Inspection scheduled." });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("CSRF_TOKEN_MISSING");
    });
  });

  // ============================================================================
  // 2. Lead Listing (GET /api/v1/leads)
  // ============================================================================
  describe("GET /api/v1/leads", () => {
    it("returns paginated leads with default parameters (page=1, limit=20, sortBy=submissionDate, sortOrder=desc)", async () => {
      const app = createTestApp();
      const agent = request.agent(app);
      await loginAs(testOwnerUser, agent);

      const mockResponse: LeadListResponse = {
        leads: [mockLeadListItem],
        pagination: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
        },
      };

      const listSpy = vi.spyOn(leadsService, "listLeads").mockResolvedValueOnce(mockResponse);

      const res = await agent.get("/api/v1/leads");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.leads).toHaveLength(1);
      expect(res.body.data.leads[0].id).toBe(validLeadId);
      expect(res.body.data.pagination).toEqual({
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });

      // Verify default parameters were supplied
      expect(listSpy).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        sortBy: "submissionDate",
        sortOrder: "desc",
      });
    });

    it("supports custom pagination, status filter, search query, and sorting", async () => {
      const app = createTestApp();
      const agent = request.agent(app);
      await loginAs(testOwnerUser, agent);

      const mockResponse: LeadListResponse = {
        leads: [mockLeadListItem],
        pagination: {
          total: 42,
          page: 2,
          limit: 10,
          totalPages: 5,
        },
      };

      const listSpy = vi.spyOn(leadsService, "listLeads").mockResolvedValueOnce(mockResponse);

      const res = await agent
        .get("/api/v1/leads")
        .query({
          page: "2",
          limit: "10",
          status: "new",
          search: "Doe",
          sortBy: "customerName",
          sortOrder: "asc",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.pagination.page).toBe(2);
      expect(res.body.data.pagination.limit).toBe(10);

      expect(listSpy).toHaveBeenCalledWith({
        page: 2,
        limit: 10,
        status: "new",
        search: "Doe",
        sortBy: "customerName",
        sortOrder: "asc",
      });
    });

    it("returns genuine zero counts on empty database without error", async () => {
      const app = createTestApp();
      const agent = request.agent(app);
      await loginAs(testOwnerUser, agent);

      const emptyResponse: LeadListResponse = {
        leads: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 0,
        },
      };

      vi.spyOn(leadsService, "listLeads").mockResolvedValueOnce(emptyResponse);

      const res = await agent.get("/api/v1/leads");

      expect(res.status).toBe(200);
      expect(res.body.data.leads).toEqual([]);
      expect(res.body.data.pagination.total).toBe(0);
      expect(res.body.data.pagination.totalPages).toBe(0);
    });

    it("validates query parameters and rejects invalid values with 422", async () => {
      const app = createTestApp();
      const agent = request.agent(app);
      await loginAs(testOwnerUser, agent);

      // 1. Invalid page (< 1)
      const resPage = await agent.get("/api/v1/leads").query({ page: "0" });
      expect(resPage.status).toBe(422);
      expect(resPage.body.error.code).toBe("VALIDATION_ERROR");

      // 2. Limit exceeds 100
      const resLimit = await agent.get("/api/v1/leads").query({ limit: "150" });
      expect(resLimit.status).toBe(422);

      // 3. Invalid status
      const resStatus = await agent.get("/api/v1/leads").query({ status: "bogus_status" });
      expect(resStatus.status).toBe(422);

      // 4. Invalid sort column (not in allowlist)
      const resSortBy = await agent.get("/api/v1/leads").query({ sortBy: "password_hash" });
      expect(resSortBy.status).toBe(422);

      // 5. Invalid sort order
      const resOrder = await agent.get("/api/v1/leads").query({ sortOrder: "sideways" });
      expect(resOrder.status).toBe(422);
    });
  });

  // ============================================================================
  // 3. Lead Details (GET /api/v1/leads/:id)
  // ============================================================================
  describe("GET /api/v1/leads/:id", () => {
    it("returns 422 Unprocessable Entity when id parameter is not a valid UUID", async () => {
      const app = createTestApp();
      const agent = request.agent(app);
      await loginAs(testOwnerUser, agent);

      const res = await agent.get("/api/v1/leads/not-a-valid-uuid");
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 404 Not Found when lead ID does not exist", async () => {
      const app = createTestApp();
      const agent = request.agent(app);
      await loginAs(testOwnerUser, agent);

      vi.spyOn(leadsService, "getLeadById").mockResolvedValueOnce(null);

      const res = await agent.get(`/api/v1/leads/${missingLeadId}`);
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("NOT_FOUND");
    });

    it("returns full lead profile with chronological follow-up notes", async () => {
      const app = createTestApp();
      const agent = request.agent(app);
      await loginAs(testOwnerUser, agent);

      vi.spyOn(leadsService, "getLeadById").mockResolvedValueOnce(mockLeadWithNotes);

      const res = await agent.get(`/api/v1/leads/${validLeadId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(validLeadId);
      expect(res.body.data.customerName).toBe("Jane Doe");
      expect(res.body.data.notes).toHaveLength(1);
      expect(res.body.data.notes[0].noteText).toContain("Booked roof inspection");
      expect(res.body.data.notes[0].authorName).toBe("Apex Business Owner");

      // Verify no password hashes or secrets leak
      expect(res.body.data.passwordHash).toBeUndefined();
      expect(res.body.data.notes[0].passwordHash).toBeUndefined();
    });
  });

  // ============================================================================
  // 4. Status Updates (PATCH /api/v1/leads/:id/status)
  // ============================================================================
  describe("PATCH /api/v1/leads/:id/status", () => {
    it("returns 422 Unprocessable Entity when id is not a valid UUID", async () => {
      const app = createTestApp();
      const agent = request.agent(app);
      await loginAs(testOwnerUser, agent);

      const res = await agent
        .patch("/api/v1/leads/invalid-uuid/status")
        .set("Origin", "http://localhost:5173")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ status: "contacted" });

      expect(res.status).toBe(422);
    });

    it("returns 422 when status is missing or not one of the 5 allowed statuses", async () => {
      const app = createTestApp();
      const agent = request.agent(app);
      await loginAs(testOwnerUser, agent);

      const resMissing = await agent
        .patch(`/api/v1/leads/${validLeadId}/status`)
        .set("Origin", "http://localhost:5173")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({});

      expect(resMissing.status).toBe(422);

      const resInvalid = await agent
        .patch(`/api/v1/leads/${validLeadId}/status`)
        .set("Origin", "http://localhost:5173")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ status: "in_progress" });

      expect(resInvalid.status).toBe(422);
    });

    it("prevents mass-assignment: rejects body with extra fields", async () => {
      const app = createTestApp();
      const agent = request.agent(app);
      await loginAs(testOwnerUser, agent);

      const res = await agent
        .patch(`/api/v1/leads/${validLeadId}/status`)
        .set("Origin", "http://localhost:5173")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({
          status: "won",
          customerName: "Attacker Attempt",
          automationStatus: "delivered",
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 404 when updating nonexistent lead ID", async () => {
      const app = createTestApp();
      const agent = request.agent(app);
      await loginAs(testOwnerUser, agent);

      vi.spyOn(leadsService, "updateLeadStatus").mockResolvedValueOnce(null);

      const res = await agent
        .patch(`/api/v1/leads/${missingLeadId}/status`)
        .set("Origin", "http://localhost:5173")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ status: "estimate_scheduled" });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("NOT_FOUND");
    });

    it("updates lead status and returns updated record and confirmation message", async () => {
      const app = createTestApp();
      const agent = request.agent(app);
      await loginAs(testOwnerUser, agent);

      const updatedLead: Lead = {
        ...mockLeadWithNotes,
        status: "estimate_scheduled",
        lastStatusUpdate: "2026-10-28T09:00:00.000Z",
        updatedAt: "2026-10-28T09:00:00.000Z",
      };

      const updateSpy = vi.spyOn(leadsService, "updateLeadStatus").mockResolvedValueOnce(updatedLead);

      const res = await agent
        .patch(`/api/v1/leads/${validLeadId}/status`)
        .set("Origin", "http://localhost:5173")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ status: "estimate_scheduled" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("estimate_scheduled");
      expect(res.body.message).toContain("estimate_scheduled");
      expect(updateSpy).toHaveBeenCalledWith(validLeadId, "estimate_scheduled");
    });
  });

  // ============================================================================
  // 5. Follow-Up Notes (POST /api/v1/leads/:id/notes)
  // ============================================================================
  describe("POST /api/v1/leads/:id/notes", () => {
    it("returns 422 when noteText is empty, whitespace only, or missing", async () => {
      const app = createTestApp();
      const agent = request.agent(app);
      await loginAs(testOwnerUser, agent);

      const resEmpty = await agent
        .post(`/api/v1/leads/${validLeadId}/notes`)
        .set("Origin", "http://localhost:5173")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ noteText: "   " });

      expect(resEmpty.status).toBe(422);

      const resMissing = await agent
        .post(`/api/v1/leads/${validLeadId}/notes`)
        .set("Origin", "http://localhost:5173")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({});

      expect(resMissing.status).toBe(422);
    });

    it("returns 422 when noteText exceeds maximum length (2000 chars)", async () => {
      const app = createTestApp();
      const agent = request.agent(app);
      await loginAs(testOwnerUser, agent);

      const longText = "a".repeat(2001);

      const res = await agent
        .post(`/api/v1/leads/${validLeadId}/notes`)
        .set("Origin", "http://localhost:5173")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ noteText: longText });

      expect(res.status).toBe(422);
    });

    it("returns 404 when adding note to nonexistent lead ID", async () => {
      const app = createTestApp();
      const agent = request.agent(app);
      await loginAs(testOwnerUser, agent);

      vi.spyOn(leadsService, "addLeadNote").mockResolvedValueOnce(null);

      const res = await agent
        .post(`/api/v1/leads/${missingLeadId}/notes`)
        .set("Origin", "http://localhost:5173")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ noteText: "Customer called back to ask for shingle samples." });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("NOT_FOUND");
    });

    it("persists and returns created note associated with authenticated author", async () => {
      const app = createTestApp();
      const agent = request.agent(app);
      await loginAs(testOwnerUser, agent);

      const createdNote: LeadNote = {
        id: "note-uuid-9999",
        leadId: validLeadId,
        authorId: testOwnerUser.id,
        authorName: "Apex Business Owner",
        noteText: "Customer requested architectural shingle sample catalog.",
        createdAt: "2026-10-28T09:15:00.000Z",
      };

      const addNoteSpy = vi.spyOn(leadsService, "addLeadNote").mockResolvedValueOnce(createdNote);

      const res = await agent
        .post(`/api/v1/leads/${validLeadId}/notes`)
        .set("Origin", "http://localhost:5173")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ noteText: "Customer requested architectural shingle sample catalog." });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe("note-uuid-9999");
      expect(res.body.data.noteText).toBe("Customer requested architectural shingle sample catalog.");
      expect(res.body.data.authorName).toBe("Apex Business Owner");

      expect(addNoteSpy).toHaveBeenCalledWith(
        validLeadId,
        testOwnerUser.id,
        "Customer requested architectural shingle sample catalog."
      );
    });
  });

  // ============================================================================
  // 6. Database Error & Resilience Handling
  // ============================================================================
  describe("Database Error & Resilience Handling", () => {
    it("handles database exceptions during lead listing gracefully with 500", async () => {
      const app = createTestApp();
      const agent = request.agent(app);
      await loginAs(testOwnerUser, agent);

      vi.spyOn(leadsService, "listLeads").mockRejectedValueOnce(new Error("PostgreSQL connection terminated unexpectedly"));

      const res = await agent.get("/api/v1/leads");

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("INTERNAL_SERVER_ERROR");
    });

    it("handles database exceptions during status update gracefully with 500", async () => {
      const app = createTestApp();
      const agent = request.agent(app);
      await loginAs(testOwnerUser, agent);

      vi.spyOn(leadsService, "updateLeadStatus").mockRejectedValueOnce(new Error("Deadlock detected during transaction"));

      const res = await agent
        .patch(`/api/v1/leads/${validLeadId}/status`)
        .set("Origin", "http://localhost:5173")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ status: "won" });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("INTERNAL_SERVER_ERROR");
    });

    it("handles database exceptions during note creation gracefully with 500", async () => {
      const app = createTestApp();
      const agent = request.agent(app);
      await loginAs(testOwnerUser, agent);

      vi.spyOn(leadsService, "addLeadNote").mockRejectedValueOnce(new Error("Foreign key constraint violation"));

      const res = await agent
        .post(`/api/v1/leads/${validLeadId}/notes`)
        .set("Origin", "http://localhost:5173")
        .set("X-Requested-With", "XMLHttpRequest")
        .send({ noteText: "Follow-up note test." });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("INTERNAL_SERVER_ERROR");
    });
  });
});

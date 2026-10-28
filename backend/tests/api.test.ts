import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import * as leadsService from "../src/modules/leads/leads.service.js";
import * as businessService from "../src/modules/business/business.service.js";

describe("API Endpoints & Middleware", () => {
  const app = createApp();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /health", () => {
    it("returns 200 OK with health status", async () => {
      const res = await request(app).get("/health");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");
      expect(res.body.timestamp).toBeDefined();
    });
  });

  describe("POST /api/v1/leads", () => {
    const validLeadInput = {
      customerName: "Alice Walker",
      phone: "(555) 345-6789",
      email: "alice@example.com",
      serviceType: "Roof Replacement",
      propertyLocation: "456 Oak Avenue, Dallas, TX",
      projectDescription: "Hail damage from recent storm.",
      preferredContactMethod: "phone",
      leadSource: "website_quote_form",
      _hp: "",
    };

    it("accepts valid quote request and returns 201 Created", async () => {
      vi.spyOn(leadsService, "createLead").mockResolvedValueOnce({
        leadId: "lead-uuid-1234",
        status: "new",
        submissionDate: new Date("2026-10-27T10:00:00Z"),
      });

      const res = await request(app)
        .post("/api/v1/leads")
        .send(validLeadInput);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.leadId).toBe("lead-uuid-1234");
      expect(res.body.data.status).toBe("new");
      expect(res.body.message).toContain("received");
    });

    it("rejects invalid input with 422 Unprocessable Entity and structured errors", async () => {
      const res = await request(app)
        .post("/api/v1/leads")
        .send({
          customerName: "A", // too short (min 2)
          email: "not-an-email", // invalid email
          phone: "123", // too short
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(Array.isArray(res.body.error.details)).toBe(true);
      expect(res.body.error.details.length).toBeGreaterThan(0);
    });

    it("silently suppresses spam bots that fill honeypot _hp without error", async () => {
      vi.spyOn(leadsService, "createLead").mockResolvedValueOnce({
        leadId: "fake-uuid",
        status: "new",
        submissionDate: new Date(),
        isSpamSuppressed: true,
      });

      const res = await request(app)
        .post("/api/v1/leads")
        .send({
          ...validLeadInput,
          _hp: "automated-spam-content",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });

  describe("GET /api/v1/business/public-info", () => {
    it("returns public operational information", async () => {
      vi.spyOn(businessService, "getPublicBusinessInfo").mockResolvedValueOnce({
        companyName: "Apex Roofing Solutions",
        phone: "(555) 123-4567",
        emergencyPhone: "(555) 999-HELP",
        dispatchEmail: "leads@apexroofingexample.com",
        address: "100 Commercial Pkwy",
        serviceAreas: ["Metro Area", "North County"],
        businessHours: { weekdays: "7:00 AM - 6:00 PM" },
        licenseNumber: "ROOF-LIC-10928",
      });

      const res = await request(app).get("/api/v1/business/public-info");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.companyName).toBe("Apex Roofing Solutions");
      expect(res.body.data.serviceAreas).toContain("Metro Area");
    });
  });

  describe("404 Route Handling", () => {
    it("returns 404 for unknown endpoints", async () => {
      const res = await request(app).get("/api/v1/unknown-endpoint");
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("NOT_FOUND");
    });
  });
});

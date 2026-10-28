import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  fetchLeads,
  fetchLeadById,
  updateLeadStatus,
  addLeadNote,
  LeadApiError,
} from "../services/leads.service";
import type { LeadListResponse, LeadWithNotes, LeadNote } from "@roofing/shared-types";

describe("Frontend Leads Service API Client", () => {
  let fetchSpy: any;

  beforeEach(() => {
    vi.restoreAllMocks();
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("fetchLeads", () => {
    it("constructs proper query parameters and includes session credentials", async () => {
      const mockResponse: LeadListResponse = {
        leads: [
          {
            id: "lead-1",
            customerName: "Jane Homeowner",
            phone: "(555) 123-4567",
            email: "jane@example.com",
            serviceType: "Roof Replacement",
            propertyLocation: "Dallas, TX",
            status: "new",
            submissionDate: "2026-10-27T10:00:00.000Z",
            lastStatusUpdate: "2026-10-27T10:00:00.000Z",
            notesCount: 1,
            createdAt: "2026-10-27T10:00:00.000Z",
          },
        ],
        pagination: {
          total: 1,
          page: 2,
          limit: 20,
          totalPages: 1,
        },
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: mockResponse }),
      });

      const data = await fetchLeads({
        page: 2,
        limit: 20,
        status: "new",
        search: "Jane",
        sortBy: "customerName",
        sortOrder: "asc",
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/leads?page=2&limit=20&status=new&search=Jane&sortBy=customerName&sortOrder=asc"),
        expect.objectContaining({
          method: "GET",
          credentials: "include",
          headers: { Accept: "application/json" },
        })
      );
      expect(data.leads).toHaveLength(1);
      expect(data.pagination.page).toBe(2);
    });

    it("throws LeadApiError with 401 status on session expiration", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          success: false,
          error: { code: "UNAUTHORIZED", message: "Authentication required." },
        }),
      });

      await expect(fetchLeads()).rejects.toThrow(LeadApiError);
    });

    it("throws network error when fetch fails", async () => {
      fetchSpy.mockRejectedValueOnce(new TypeError("Failed to fetch"));

      await expect(fetchLeads()).rejects.toThrow(/Unable to connect to the lead service/i);
    });
  });

  describe("fetchLeadById", () => {
    it("retrieves lead details by ID with credentials", async () => {
      const mockLead: LeadWithNotes = {
        id: "lead-uuid-123",
        customerName: "Bob Builder",
        phone: "(555) 987-6543",
        email: "bob@example.com",
        serviceType: "Roof Repair",
        propertyLocation: "Fort Worth, TX",
        projectDescription: "Hail storm dented metal panels.",
        preferredContactMethod: "phone",
        leadSource: "website_quote_form",
        status: "contacted",
        automationStatus: "delivered",
        submissionDate: "2026-10-27T12:00:00.000Z",
        lastStatusUpdate: "2026-10-27T12:30:00.000Z",
        createdAt: "2026-10-27T12:00:00.000Z",
        updatedAt: "2026-10-27T12:30:00.000Z",
        notes: [],
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: mockLead }),
      });

      const data = await fetchLeadById("lead-uuid-123");

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/leads/lead-uuid-123"),
        expect.objectContaining({
          method: "GET",
          credentials: "include",
        })
      );
      expect(data.customerName).toBe("Bob Builder");
    });

    it("throws LeadApiError with 404 status when lead is not found", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          success: false,
          error: { code: "NOT_FOUND", message: "Lead not found." },
        }),
      });

      await expect(fetchLeadById("missing-lead-id")).rejects.toThrow(
        expect.objectContaining({
          status: 404,
          code: "NOT_FOUND",
        })
      );
    });
  });

  describe("updateLeadStatus", () => {
    it("submits PATCH with CSRF header X-Requested-With and JSON body", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            id: "lead-123",
            status: "estimate_scheduled",
            lastStatusUpdate: "2026-10-27T14:00:00.000Z",
            updatedAt: "2026-10-27T14:00:00.000Z",
          },
          message: "Lead status updated to 'estimate_scheduled'.",
        }),
      });

      const result = await updateLeadStatus("lead-123", "estimate_scheduled");

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/leads/lead-123/status"),
        expect.objectContaining({
          method: "PATCH",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest",
          }),
          credentials: "include",
          body: JSON.stringify({ status: "estimate_scheduled" }),
        })
      );

      expect(result.lead.status).toBe("estimate_scheduled");
      expect(result.message).toContain("estimate_scheduled");
    });

    it("throws LeadApiError on update failure", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => ({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Invalid status value." },
        }),
      });

      await expect(updateLeadStatus("lead-123", "invalid" as any)).rejects.toThrow(
        LeadApiError
      );
    });
  });

  describe("addLeadNote", () => {
    it("submits POST with CSRF header and trimmed noteText", async () => {
      const mockCreatedNote: LeadNote = {
        id: "note-uuid-555",
        leadId: "lead-123",
        authorId: "author-uuid-1",
        authorName: "Apex Business Owner",
        noteText: "Called customer to confirm appointment.",
        createdAt: "2026-10-27T15:00:00.000Z",
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          success: true,
          data: mockCreatedNote,
        }),
      });

      const note = await addLeadNote("lead-123", "  Called customer to confirm appointment.  ");

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/leads/lead-123/notes"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest",
          }),
          credentials: "include",
          body: JSON.stringify({ noteText: "Called customer to confirm appointment." }),
        })
      );

      expect(note.id).toBe("note-uuid-555");
      expect(note.authorName).toBe("Apex Business Owner");
    });
  });
});

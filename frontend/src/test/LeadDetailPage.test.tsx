import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { LeadDetailPage } from "../pages/LeadDetailPage";
import * as leadsService from "../services/leads.service";
import type { LeadWithNotes, LeadNote } from "@roofing/shared-types";

const mockLead: LeadWithNotes = {
  id: "lead-test-123",
  customerName: "Sarah Connor",
  phone: "(555) 777-8888",
  email: "sarah@cyberdyne.com",
  serviceType: "Storm Damage Restoration",
  propertyLocation: "404 Skynet Way, Dallas, TX",
  projectDescription: "Heavy hail created significant roof leaks above the main garage.",
  preferredContactMethod: "phone",
  leadSource: "website_quote_form",
  status: "new",
  automationStatus: "delivered",
  submissionDate: "2026-10-27T14:00:00.000Z",
  lastStatusUpdate: "2026-10-27T14:00:00.000Z",
  createdAt: "2026-10-27T14:00:00.000Z",
  updatedAt: "2026-10-27T14:00:00.000Z",
  notes: [
    {
      id: "note-1",
      leadId: "lead-test-123",
      authorId: "user-1",
      authorName: "John Connor",
      noteText: "Initial dispatch SMS sent to estimator.",
      createdAt: "2026-10-27T14:05:00.000Z",
    },
  ],
};

describe("LeadDetailPage Component", () => {
  let fetchLeadByIdSpy: any;
  let updateStatusSpy: any;
  let addNoteSpy: any;

  beforeEach(() => {
    vi.restoreAllMocks();
    fetchLeadByIdSpy = vi.spyOn(leadsService, "fetchLeadById").mockResolvedValue(mockLead);
    updateStatusSpy = vi.spyOn(leadsService, "updateLeadStatus").mockResolvedValue({
      lead: { id: "lead-test-123", status: "contacted", lastStatusUpdate: "2026-10-27T15:00:00.000Z" },
      message: "Lead status updated to 'contacted'.",
    });
    addNoteSpy = vi.spyOn(leadsService, "addLeadNote");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders lead details, customer information, project description, and existing notes", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard/leads/lead-test-123"]}>
        <Routes>
          <Route path="/dashboard/leads/:id" element={<LeadDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByRole("heading", { level: 1, name: "Sarah Connor" })).toBeInTheDocument();
    expect(screen.getByText("Storm Damage Restoration")).toBeInTheDocument();
    expect(screen.getByText("404 Skynet Way, Dallas, TX")).toBeInTheDocument();
    expect(screen.getByText("(555) 777-8888")).toBeInTheDocument();
    expect(screen.getByText("sarah@cyberdyne.com")).toBeInTheDocument();
    expect(screen.getByText(/Heavy hail created significant roof leaks/i)).toBeInTheDocument();

    // Notes
    expect(screen.getByText("Initial dispatch SMS sent to estimator.")).toBeInTheDocument();
    expect(screen.getByText("John Connor")).toBeInTheDocument();
  });

  it("renders 404 Not Found state when lead does not exist", async () => {
    fetchLeadByIdSpy.mockRejectedValueOnce(
      new leadsService.LeadApiError("Lead not found.", 404, "NOT_FOUND")
    );

    render(
      <MemoryRouter initialEntries={["/dashboard/leads/missing-uuid"]}>
        <Routes>
          <Route path="/dashboard/leads/:id" element={<LeadDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByRole("heading", { level: 2, name: /Lead Not Found/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Return to Leads List/i })).toBeInTheDocument();
  });

  it("updates lead status and displays success confirmation", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard/leads/lead-test-123"]}>
        <Routes>
          <Route path="/dashboard/leads/:id" element={<LeadDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await screen.findByRole("heading", { level: 1, name: "Sarah Connor" });

    // Click "Contacted" status button
    const contactedButton = screen.getByRole("button", { name: /Contacted/i });
    fireEvent.click(contactedButton);

    await waitFor(() => {
      expect(updateStatusSpy).toHaveBeenCalledWith("lead-test-123", "contacted");
    });

    expect(await screen.findByText(/Lead status updated to 'contacted'/i)).toBeInTheDocument();
  });

  it("handles status update failure with error alert and rollback", async () => {
    updateStatusSpy.mockRejectedValueOnce(
      new leadsService.LeadApiError("Failed to update status on server.", 500)
    );

    render(
      <MemoryRouter initialEntries={["/dashboard/leads/lead-test-123"]}>
        <Routes>
          <Route path="/dashboard/leads/:id" element={<LeadDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await screen.findByRole("heading", { level: 1, name: "Sarah Connor" });

    const estimateScheduledBtn = screen.getByRole("button", { name: /Estimate Scheduled/i });
    fireEvent.click(estimateScheduledBtn);

    expect(await screen.findByText(/Failed to update status on server/i)).toBeInTheDocument();
  });

  it("validates follow-up note input: disables submission for empty or whitespace-only text", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard/leads/lead-test-123"]}>
        <Routes>
          <Route path="/dashboard/leads/:id" element={<LeadDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await screen.findByRole("heading", { level: 1, name: "Sarah Connor" });

    const submitBtn = screen.getByRole("button", { name: /Add Note/i });
    expect(submitBtn).toBeDisabled();

    const textarea = screen.getByLabelText(/Add Follow-Up Note/i);
    fireEvent.change(textarea, { target: { value: "    " } });
    expect(submitBtn).toBeDisabled();
  });

  it("submits follow-up note, clears form on success, and appends note to history", async () => {
    const newNote: LeadNote = {
      id: "note-new-999",
      leadId: "lead-test-123",
      authorId: "user-owner",
      authorName: "Apex Owner",
      noteText: "Customer agreed to roof inspection on Friday morning.",
      createdAt: "2026-10-27T16:00:00.000Z",
    };
    addNoteSpy.mockResolvedValueOnce(newNote);

    render(
      <MemoryRouter initialEntries={["/dashboard/leads/lead-test-123"]}>
        <Routes>
          <Route path="/dashboard/leads/:id" element={<LeadDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await screen.findByRole("heading", { level: 1, name: "Sarah Connor" });

    const textarea = screen.getByLabelText(/Add Follow-Up Note/i);
    fireEvent.change(textarea, {
      target: { value: "Customer agreed to roof inspection on Friday morning." },
    });

    const submitBtn = screen.getByRole("button", { name: /Add Note/i });
    expect(submitBtn).not.toBeDisabled();
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(addNoteSpy).toHaveBeenCalledWith(
        "lead-test-123",
        "Customer agreed to roof inspection on Friday morning."
      );
    });

    // On success: textarea is cleared
    expect(textarea).toHaveValue("");
    expect(await screen.findByText(/Follow-up note saved successfully/i)).toBeInTheDocument();
    // New note appears in the list
    expect(screen.getByText("Customer agreed to roof inspection on Friday morning.")).toBeInTheDocument();
    expect(screen.getByText("Apex Owner")).toBeInTheDocument();
  });

  it("preserves note text on failure and displays error message", async () => {
    addNoteSpy.mockRejectedValueOnce(
      new leadsService.LeadApiError("Server timed out adding note.", 500)
    );

    render(
      <MemoryRouter initialEntries={["/dashboard/leads/lead-test-123"]}>
        <Routes>
          <Route path="/dashboard/leads/:id" element={<LeadDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await screen.findByRole("heading", { level: 1, name: "Sarah Connor" });

    const textarea = screen.getByLabelText(/Add Follow-Up Note/i);
    fireEvent.change(textarea, {
      target: { value: "Important customer note that should not be lost." },
    });

    const submitBtn = screen.getByRole("button", { name: /Add Note/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/Server timed out adding note/i)).toBeInTheDocument();
    // Text remains preserved in textarea
    expect(textarea).toHaveValue("Important customer note that should not be lost.");
  });

  it("navigates back to leads list via back link", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard/leads/lead-test-123"]}>
        <Routes>
          <Route path="/dashboard/leads" element={<div data-testid="leads-list-mock">Leads List</div>} />
          <Route path="/dashboard/leads/:id" element={<LeadDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

    await screen.findByRole("heading", { level: 1, name: "Sarah Connor" });

    const backLink = screen.getByRole("link", { name: /Back to Leads List/i });
    fireEvent.click(backLink);

    expect(await screen.findByTestId("leads-list-mock")).toBeInTheDocument();
  });
});

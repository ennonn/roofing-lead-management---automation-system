import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { LeadsListPage } from "../pages/LeadsListPage";
import * as leadsService from "../services/leads.service";
import type { LeadListResponse, LeadListItem } from "@roofing/shared-types";

const mockLeads: LeadListItem[] = [
  {
    id: "lead-001",
    customerName: "Alice Walker",
    phone: "(555) 111-2222",
    email: "alice@example.com",
    serviceType: "Roof Replacement",
    propertyLocation: "100 Oak St, Dallas, TX",
    status: "new",
    submissionDate: "2026-10-27T10:00:00.000Z",
    lastStatusUpdate: "2026-10-27T10:00:00.000Z",
    notesCount: 0,
    createdAt: "2026-10-27T10:00:00.000Z",
  },
  {
    id: "lead-002",
    customerName: "Bob Miller",
    phone: "(555) 333-4444",
    email: "bob@example.com",
    serviceType: "Roof Repair",
    propertyLocation: "200 Pine St, Plano, TX",
    status: "contacted",
    submissionDate: "2026-10-27T11:00:00.000Z",
    lastStatusUpdate: "2026-10-27T11:30:00.000Z",
    notesCount: 2,
    createdAt: "2026-10-27T11:00:00.000Z",
  },
];

const mockSuccessResponse: LeadListResponse = {
  leads: mockLeads,
  pagination: {
    total: 2,
    page: 1,
    limit: 20,
    totalPages: 1,
  },
};

describe("LeadsListPage Component", () => {
  let fetchLeadsSpy: any;

  beforeEach(() => {
    vi.restoreAllMocks();
    fetchLeadsSpy = vi.spyOn(leadsService, "fetchLeads").mockResolvedValue(mockSuccessResponse);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the leads list page with header, search bar, and status filters", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard/leads"]}>
        <Routes>
          <Route path="/dashboard/leads" element={<LeadsListPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { level: 1, name: /Leads Management/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search by customer name, phone, email, or property/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "All Leads" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Contacted" })).toBeInTheDocument();

    // Data table rendering
    const table = await screen.findByRole("table");
    expect(within(table).getByText("Alice Walker")).toBeInTheDocument();
    expect(within(table).getByText("Bob Miller")).toBeInTheDocument();
    expect(within(table).getByText("Roof Replacement")).toBeInTheDocument();
    expect(within(table).getByText("Roof Repair")).toBeInTheDocument();
  });

  it("filters leads by status when clicking status chips", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard/leads"]}>
        <Routes>
          <Route path="/dashboard/leads" element={<LeadsListPage />} />
        </Routes>
      </MemoryRouter>
    );

    const table = await screen.findByRole("table");
    expect(within(table).getByText("Alice Walker")).toBeInTheDocument();

    // Click "Contacted" filter
    const contactedBtn = screen.getByRole("button", { name: "Contacted" });
    fireEvent.click(contactedBtn);

    await waitFor(() => {
      expect(fetchLeadsSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "contacted",
          page: 1,
        }),
        expect.any(AbortSignal)
      );
    });
  });

  it("searches leads with debouncing when user types in search input", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard/leads"]}>
        <Routes>
          <Route path="/dashboard/leads" element={<LeadsListPage />} />
        </Routes>
      </MemoryRouter>
    );

    const table = await screen.findByRole("table");
    expect(within(table).getByText("Alice Walker")).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(/Search by customer name/i);
    fireEvent.change(searchInput, { target: { value: "Oak St" } });

    await waitFor(
      () => {
        expect(fetchLeadsSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            search: "Oak St",
            page: 1,
          }),
          expect.any(AbortSignal)
        );
      },
      { timeout: 1000 }
    );
  });

  it("handles sorting field and direction toggle", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard/leads"]}>
        <Routes>
          <Route path="/dashboard/leads" element={<LeadsListPage />} />
        </Routes>
      </MemoryRouter>
    );

    const table = await screen.findByRole("table");
    expect(within(table).getByText("Alice Walker")).toBeInTheDocument();

    const sortSelect = screen.getByLabelText(/Sort leads by field/i);
    fireEvent.change(sortSelect, { target: { value: "customerName" } });

    await waitFor(() => {
      expect(fetchLeadsSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: "customerName",
          sortOrder: "desc",
        }),
        expect.any(AbortSignal)
      );
    });

    // Toggle direction button
    const toggleOrderBtn = screen.getByTitle(/Toggle sort order/i);
    fireEvent.click(toggleOrderBtn);

    await waitFor(() => {
      expect(fetchLeadsSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: "customerName",
          sortOrder: "asc",
        }),
        expect.any(AbortSignal)
      );
    });
  });

  it("renders empty state when no leads are returned", async () => {
    fetchLeadsSpy.mockResolvedValueOnce({
      leads: [],
      pagination: {
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      },
    });

    render(
      <MemoryRouter initialEntries={["/dashboard/leads"]}>
        <Routes>
          <Route path="/dashboard/leads" element={<LeadsListPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText(/No leads received yet/i)).toBeInTheDocument();
  });

  it("renders filter empty state with reset button when search yields no matches", async () => {
    fetchLeadsSpy.mockResolvedValueOnce({
      leads: [],
      pagination: {
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      },
    });

    render(
      <MemoryRouter initialEntries={["/dashboard/leads?search=Nonexistent"]}>
        <Routes>
          <Route path="/dashboard/leads" element={<LeadsListPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText(/No matching leads found/i)).toBeInTheDocument();
    const clearBtn = screen.getByRole("button", { name: /Clear All Filters/i });
    expect(clearBtn).toBeInTheDocument();

    fireEvent.click(clearBtn);

    await waitFor(() => {
      expect(fetchLeadsSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          search: undefined,
          page: 1,
        }),
        expect.any(AbortSignal)
      );
    });
  });

  it("displays error banner and retry button on API failure", async () => {
    fetchLeadsSpy.mockRejectedValueOnce(new leadsService.LeadApiError("Failed to fetch leads", 500));

    render(
      <MemoryRouter initialEntries={["/dashboard/leads"]}>
        <Routes>
          <Route path="/dashboard/leads" element={<LeadsListPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText(/Unable to load leads/i)).toBeInTheDocument();
    expect(screen.getByText(/Failed to fetch leads/i)).toBeInTheDocument();

    const tryAgainBtn = screen.getByRole("button", { name: /Try Again/i });
    expect(tryAgainBtn).toBeInTheDocument();

    fetchLeadsSpy.mockResolvedValueOnce(mockSuccessResponse);
    fireEvent.click(tryAgainBtn);

    const table = await screen.findByRole("table");
    expect(within(table).getByText("Alice Walker")).toBeInTheDocument();
  });

  it("navigates to lead details when clicking a lead row", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard/leads"]}>
        <Routes>
          <Route path="/dashboard/leads" element={<LeadsListPage />} />
          <Route path="/dashboard/leads/:id" element={<div data-testid="detail-mock">Detail View</div>} />
        </Routes>
      </MemoryRouter>
    );

    const leadRow = await screen.findByLabelText(/View lead details for Alice Walker/i);
    fireEvent.click(leadRow);

    expect(await screen.findByTestId("detail-mock")).toBeInTheDocument();
  });
});

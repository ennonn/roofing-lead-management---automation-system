import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "../context/AuthContext";
import { LoginPage } from "../pages/LoginPage";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { DashboardLayout } from "../components/dashboard/DashboardLayout";
import { DashboardOverviewPage } from "../pages/DashboardOverviewPage";
import type { AuthUser, DashboardStats } from "@roofing/shared-types";

const mockOwner: AuthUser = {
  id: "user-owner-123",
  email: "owner@apexroofing.com",
  fullName: "Apex Business Owner",
  role: "owner",
};

const mockStats: DashboardStats = {
  totalLeads: 42,
  last30Days: 18,
  conversionRate: 23.8,
  urgentAttentionCount: 3,
  statusCounts: {
    new: 5,
    contacted: 12,
    estimate_scheduled: 15,
    won: 10,
    lost: 0,
  },
};

const mockZeroStats: DashboardStats = {
  totalLeads: 0,
  last30Days: 0,
  conversionRate: 0,
  urgentAttentionCount: 0,
  statusCounts: {
    new: 0,
    contacted: 0,
    estimate_scheduled: 0,
    won: 0,
    lost: 0,
  },
};

describe("Authentication UI & Frontend Session Flow", () => {
  let fetchSpy: any;

  beforeEach(() => {
    vi.restoreAllMocks();
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the login page with accessible labels, branding, and input controls", () => {
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <AuthProvider skipInitialCheck={true}>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { level: 1, name: /Owner Dashboard Portal/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Owner Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sign In to Dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Return to public website/i })).toBeInTheDocument();
  });

  it("validates empty fields client-side without submitting request", async () => {
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <AuthProvider skipInitialCheck={true}>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: /Sign In to Dashboard/i }));

    expect(await screen.findByText(/Email address is required\./i)).toBeInTheDocument();
    expect(screen.getByText(/Password is required\./i)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("validates invalid email format client-side", async () => {
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <AuthProvider skipInitialCheck={true}>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/Owner Email Address/i), {
      target: { value: "not-an-email" },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: "securepassword123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Sign In to Dashboard/i }));

    expect(await screen.findByText(/Please enter a valid email address\./i)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("submits login with credentials and security headers, then redirects upon success", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: { user: mockOwner },
      }),
    } as Response);

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <AuthProvider skipInitialCheck={true}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<div>Dashboard Landed</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/Owner Email Address/i), {
      target: { value: "owner@apexroofing.com" },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: "correct-password" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Sign In to Dashboard/i }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    const [calledUrl, calledInit] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(calledUrl).toContain("/api/v1/auth/login");
    expect(calledInit?.method).toBe("POST");
    expect(calledInit?.credentials).toBe("include");
    const headers = calledInit?.headers as Record<string, string>;
    expect(headers["X-Requested-With"]).toBe("XMLHttpRequest");
    expect(headers["Content-Type"]).toBe("application/json");

    expect(await screen.findByText("Dashboard Landed")).toBeInTheDocument();
  });

  it("handles 401 invalid credentials with a generic error message (preventing email enumeration)", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Invalid email or password." },
      }),
    } as Response);

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <AuthProvider skipInitialCheck={true}>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/Owner Email Address/i), {
      target: { value: "unknown@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: "wrong-password" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Sign In to Dashboard/i }));

    expect(
      await screen.findByText(/Invalid email or password\./i)
    ).toBeInTheDocument();
  });

  it("handles 429 rate limit error gracefully", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({
        success: false,
        error: { code: "TOO_MANY_REQUESTS", message: "Rate limit exceeded" },
      }),
    } as Response);

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <AuthProvider skipInitialCheck={true}>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/Owner Email Address/i), {
      target: { value: "owner@apexroofing.com" },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Sign In to Dashboard/i }));

    expect(
      await screen.findByText(/Rate limit exceeded/i)
    ).toBeInTheDocument();
  });

  it("handles network errors cleanly", async () => {
    fetchSpy.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <AuthProvider skipInitialCheck={true}>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/Owner Email Address/i), {
      target: { value: "owner@apexroofing.com" },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Sign In to Dashboard/i }));

    expect(
      await screen.findByText(/Unable to connect to the authentication server/i)
    ).toBeInTheDocument();
  });

  it("restores active session automatically on app load without storing tokens in storage", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: { user: mockOwner },
      }),
    } as Response);

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <AuthProvider skipInitialCheck={false}>
          <ProtectedRoute>
            <div>Secured Private Content</div>
          </ProtectedRoute>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText("Secured Private Content")).toBeInTheDocument();

    const [calledUrl, calledInit] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(calledUrl).toContain("/api/v1/auth/session");
    expect(calledInit?.credentials).toBe("include");

    // Ensure tokens were never written to client storage
    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("sessionId")).toBeNull();
    expect(sessionStorage.getItem("token")).toBeNull();
  });

  it("handles expired session on app load by redirecting protected route to login", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Not authenticated" },
      }),
    } as Response);

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <AuthProvider skipInitialCheck={false}>
          <Routes>
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <div>Secured Private Content</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div>Redirected To Login</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText("Redirected To Login")).toBeInTheDocument();
    expect(screen.queryByText("Secured Private Content")).not.toBeInTheDocument();
  });
});

describe("Dashboard Shell & Protected Route", () => {
  let fetchSpy: any;

  beforeEach(() => {
    vi.restoreAllMocks();
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  it("redirects unauthenticated users from /dashboard to /login", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <AuthProvider skipInitialCheck={true}>
          <Routes>
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div>Login Page Landing</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByText("Login Page Landing")).toBeInTheDocument();
  });

  it("renders dashboard shell with branding, user identity, and navigation when authenticated", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <AuthProvider skipInitialCheck={true} initialUser={mockOwner}>
          <Routes>
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<div>Dashboard Child Overview</div>} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    // Identity details
    expect(screen.getAllByText("Apex Business Owner").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("owner@apexroofing.com").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Owner Dashboard").length).toBeGreaterThanOrEqual(1);

    // Navigation and links
    expect(screen.getAllByRole("link", { name: /Overview/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("link", { name: /View Public Website/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sign Out/i })).toBeInTheDocument();
    expect(screen.getByText("Dashboard Child Overview")).toBeInTheDocument();
  });

  it("executes logout, sending credentials and CSRF header, clearing auth state and navigating to /login", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: { message: "Successfully logged out" },
      }),
    } as Response);

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <AuthProvider skipInitialCheck={true} initialUser={mockOwner}>
          <Routes>
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div>Returned to Login</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: /Sign Out/i }));

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    const [calledUrl, calledInit] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(calledUrl).toContain("/api/v1/auth/logout");
    expect(calledInit?.method).toBe("POST");
    expect(calledInit?.credentials).toBe("include");
    const headers = calledInit?.headers as Record<string, string>;
    expect(headers["X-Requested-With"]).toBe("XMLHttpRequest");

    expect(await screen.findByText("Returned to Login")).toBeInTheDocument();
  });

  it("supports keyboard Escape key to close mobile drawer", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <AuthProvider skipInitialCheck={true} initialUser={mockOwner}>
          <DashboardLayout />
        </AuthProvider>
      </MemoryRouter>
    );

    const menuToggle = screen.getByRole("button", { name: /Toggle navigation menu/i });
    expect(menuToggle).toHaveAttribute("aria-expanded", "false");

    // Open mobile menu
    fireEvent.click(menuToggle);
    expect(menuToggle).toHaveAttribute("aria-expanded", "true");

    // Press Escape
    fireEvent.keyDown(window, { key: "Escape" });
    expect(menuToggle).toHaveAttribute("aria-expanded", "false");
  });
});

describe("Dashboard Overview Page & Metrics", () => {
  let fetchSpy: any;

  beforeEach(() => {
    vi.restoreAllMocks();
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  it("displays real metric numbers and pipeline status breakdown when data is loaded", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: mockStats,
      }),
    } as Response);

    render(
      <MemoryRouter>
        <AuthProvider skipInitialCheck={true} initialUser={mockOwner}>
          <DashboardOverviewPage />
        </AuthProvider>
      </MemoryRouter>
    );

    // Initial loading state verification
    expect(screen.getByTestId("dashboard-overview")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("button", { name: /Refresh dashboard statistics/i })).toBeDisabled();

    // Verify stats cards rendered
    expect(await screen.findByText("42")).toBeInTheDocument(); // totalLeads
    expect(screen.getByText("18")).toBeInTheDocument(); // last30Days
    expect(screen.getByText("23.8%")).toBeInTheDocument(); // conversionRate
    expect(screen.getByText("3")).toBeInTheDocument(); // urgentAttentionCount

    // Verify pipeline breakdown counts
    expect(screen.getByText(/Lead Status Pipeline/i)).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument(); // won leads count
    expect(screen.getByText("12")).toBeInTheDocument(); // contacted leads count
    expect(screen.getByText("15")).toBeInTheDocument(); // estimate scheduled count
  });

  it("displays genuine zero values and empty-state guidance when total leads is 0", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: mockZeroStats,
      }),
    } as Response);

    render(
      <MemoryRouter>
        <AuthProvider skipInitialCheck={true} initialUser={mockOwner}>
          <DashboardOverviewPage />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText(/No customer leads received yet/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Your lead management system is active and connected to PostgreSQL/i)
    ).toBeInTheDocument();

    const testQuoteBtn = screen.getByRole("link", { name: /Test Public Quote Form/i });
    expect(testQuoteBtn).toHaveAttribute("href", "/contact");

    // All metric values are genuine 0
    const zeroElements = screen.getAllByText("0");
    expect(zeroElements.length).toBeGreaterThanOrEqual(4);
  });

  it("displays error banner and retry button when fetching metrics fails", async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Database connection failed" },
      }),
    } as Response);

    render(
      <MemoryRouter>
        <AuthProvider skipInitialCheck={true} initialUser={mockOwner}>
          <DashboardOverviewPage />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(
      await screen.findByRole("alert")
    ).toHaveTextContent(/Database connection failed/i);

    const retryBtn = screen.getByRole("button", { name: /Retry/i });
    expect(retryBtn).toBeInTheDocument();

    // Now mock recovery
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: mockStats,
      }),
    } as Response);

    fireEvent.click(retryBtn);

    expect(await screen.findByText("42")).toBeInTheDocument();
  });
});

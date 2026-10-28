import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BusinessSettingsPage } from "../pages/BusinessSettingsPage";
import * as AuthContext from "../context/AuthContext";
import * as BusinessContext from "../context/BusinessInfoContext";
import * as businessService from "../services/business.service";
import type { BusinessSettings, AuthUser } from "@roofing/shared-types";

describe("BusinessSettingsPage Dashboard View", () => {
  const mockOwnerUser: AuthUser = {
    id: "usr-owner-1",
    email: "owner@roofingtest.com",
    fullName: "John Owner",
    role: "owner",
  };

  const mockStaffUser: AuthUser = {
    id: "usr-staff-1",
    email: "staff@roofingtest.com",
    fullName: "Sally Staff",
    role: "staff",
  };

  const createMockAuth = (user: AuthUser | null): AuthContext.AuthContextValue => ({
    user,
    isAuthenticated: Boolean(user),
    isLoading: false,
    error: null,
    login: vi.fn(),
    logout: vi.fn(),
    refreshSession: vi.fn(),
  });

  const mockInitialSettings: BusinessSettings = {
    id: "bs-1",
    companyName: "Apex Peak Roofing",
    phone: "(555) 123-4567",
    emergencyPhone: "(555) 999-8888",
    dispatchEmail: "dispatch@roofingtest.com",
    address: "100 Roofing Way, Phoenix, AZ",
    serviceAreas: ["Phoenix", "Scottsdale"],
    businessHours: {
      weekdays: "7:00 AM - 6:00 PM",
      saturday: "8:00 AM - 2:00 PM",
      sunday: "Closed",
    },
    licenseNumber: "ROC123456",
    availabilityStatus: "available",
    noticeHeadline: null,
    noticeBody: null,
    reopenAt: null,
    autoResume: false,
    acceptQuotesWhenUnavailable: true,
    timezone: "America/New_York",
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
  };

  const mockRefresh = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(BusinessContext, "useBusinessInfo").mockReturnValue({
      businessInfo: {
        companyName: mockInitialSettings.companyName,
        phone: mockInitialSettings.phone,
        emergencyPhone: mockInitialSettings.emergencyPhone ?? null,
        address: mockInitialSettings.address ?? null,
        serviceAreas: mockInitialSettings.serviceAreas,
        businessHours: mockInitialSettings.businessHours,
        licenseNumber: mockInitialSettings.licenseNumber ?? null,
        availability: {
          status: "available",
          noticeHeadline: null,
          noticeBody: null,
          reopenAt: null,
          autoResume: false,
          acceptQuotesWhenUnavailable: true,
          timezone: "America/New_York",
        },
      },
      isLoading: false,
      error: null,
      reload: mockRefresh,
      refreshBusinessInfo: mockRefresh,
    });
  });

  it("blocks staff role users and displays Access Restricted notice", async () => {
    vi.spyOn(AuthContext, "useAuth").mockReturnValue(createMockAuth(mockStaffUser));

    render(<BusinessSettingsPage />);

    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
    expect(
      screen.getByText(/You do not have administrative privileges/i)
    ).toBeInTheDocument();
  });

  it("loads and displays settings for authorized owner", async () => {
    vi.spyOn(AuthContext, "useAuth").mockReturnValue(createMockAuth(mockOwnerUser));

    vi.spyOn(businessService, "fetchBusinessSettings").mockResolvedValue(
      mockInitialSettings
    );

    render(<BusinessSettingsPage />);

    expect(await screen.findByDisplayValue("Apex Peak Roofing")).toBeInTheDocument();
    expect(screen.getByDisplayValue("(555) 123-4567")).toBeInTheDocument();
    expect(screen.getByDisplayValue("(555) 999-8888")).toBeInTheDocument();
    expect(screen.getByDisplayValue("dispatch@roofingtest.com")).toBeInTheDocument();
  });

  it("supports switching tabs and editing service areas", async () => {
    vi.spyOn(AuthContext, "useAuth").mockReturnValue(createMockAuth(mockOwnerUser));

    vi.spyOn(businessService, "fetchBusinessSettings").mockResolvedValue(
      mockInitialSettings
    );

    render(<BusinessSettingsPage />);

    await screen.findByDisplayValue("Apex Peak Roofing");

    // Click Service Areas tab
    const coverageTab = screen.getByRole("button", {
      name: /Service Areas & Hours/i,
    });
    fireEvent.click(coverageTab);

    // Initial areas rendered
    expect(screen.getByText("Phoenix")).toBeInTheDocument();
    expect(screen.getByText("Scottsdale")).toBeInTheDocument();

    // Add new area
    const addInput = screen.getByPlaceholderText(/Enter city or neighborhood/i);
    fireEvent.change(addInput, { target: { value: "Tempe, AZ" } });
    const addBtn = screen.getByRole("button", { name: /Add Area/i });
    fireEvent.click(addBtn);

    expect(screen.getByText("Tempe, AZ")).toBeInTheDocument();

    // Remove an area
    const removeScottsdaleBtn = screen.getByRole("button", {
      name: /Remove Scottsdale/i,
    });
    fireEvent.click(removeScottsdaleBtn);
    expect(screen.queryByText("Scottsdale")).not.toBeInTheDocument();
  });

  it("supports availability settings, pause modal confirmation, and live notice preview", async () => {
    vi.spyOn(AuthContext, "useAuth").mockReturnValue(createMockAuth(mockOwnerUser));

    vi.spyOn(businessService, "fetchBusinessSettings").mockResolvedValue(
      mockInitialSettings
    );

    render(<BusinessSettingsPage />);

    await screen.findByDisplayValue("Apex Peak Roofing");

    // Switch to Availability tab
    const availTab = screen.getByRole("button", {
      name: /Availability & Public Notices/i,
    });
    fireEvent.click(availTab);

    // Select Temporarily Closed radio
    const tempClosedRadio = screen.getByLabelText(/Temporarily Closed/i);
    fireEvent.click(tempClosedRadio);

    // Form shows notice headline and body inputs
    const headlineInput = screen.getByLabelText(/Notice Headline/i);
    fireEvent.change(headlineInput, {
      target: { value: "Severe Rainstorm Operational Pause" },
    });

    const bodyInput = screen.getByLabelText(/Notice Body \/ Description/i);
    fireEvent.change(bodyInput, {
      target: { value: "Field repairs on hold until weather clears safely." },
    });

    // Check live preview
    expect(
      screen.getAllByText("Severe Rainstorm Operational Pause").length
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText("Field repairs on hold until weather clears safely.").length
    ).toBeGreaterThanOrEqual(1);

    // Pause online quote intake toggle
    const pauseIntakeBtn = screen.getByRole("button", { name: /Pause Intake/i });
    fireEvent.click(pauseIntakeBtn);

    // Confirmation modal appears
    expect(
      screen.getByRole("heading", { name: /Pause Online Quote Requests\?/i })
    ).toBeInTheDocument();

    // Confirm pause
    const confirmBtn = screen.getByRole("button", {
      name: /Confirm Pause Intake/i,
    });
    fireEvent.click(confirmBtn);

    // Modal closes and intake badge shows Paused
    expect(
      screen.queryByRole("heading", { name: /Pause Online Quote Requests\?/i })
    ).not.toBeInTheDocument();
    expect(screen.getByText(/^Paused$/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Enable Intake/i })
    ).toBeInTheDocument();
  });

  it("validates required fields before calling save", async () => {
    vi.spyOn(AuthContext, "useAuth").mockReturnValue(createMockAuth(mockOwnerUser));

    vi.spyOn(businessService, "fetchBusinessSettings").mockResolvedValue(
      mockInitialSettings
    );

    render(<BusinessSettingsPage />);

    const companyInput = await screen.findByDisplayValue("Apex Peak Roofing");
    fireEvent.change(companyInput, { target: { value: "   " } }); // empty company name

    const saveBtn = screen.getByRole("button", { name: /Save Changes/i });
    fireEvent.click(saveBtn);

    expect(
      await screen.findByText("Company name is required.")
    ).toBeInTheDocument();
  });

  it("saves changes, calls saveBusinessSettings, and updates context", async () => {
    vi.spyOn(AuthContext, "useAuth").mockReturnValue(createMockAuth(mockOwnerUser));

    vi.spyOn(businessService, "fetchBusinessSettings").mockResolvedValue(
      mockInitialSettings
    );

    const saveSpy = vi
      .spyOn(businessService, "saveBusinessSettings")
      .mockResolvedValue({
        ...mockInitialSettings,
        companyName: "Summit Apex Roofing Co.",
      });

    render(<BusinessSettingsPage />);

    const companyInput = await screen.findByDisplayValue("Apex Peak Roofing");
    fireEvent.change(companyInput, {
      target: { value: "Summit Apex Roofing Co." },
    });

    const saveBtn = screen.getByRole("button", { name: /Save Changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(saveSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          companyName: "Summit Apex Roofing Co.",
        })
      );
      expect(mockRefresh).toHaveBeenCalled();
      expect(
        screen.getByText(/Business settings and public availability saved successfully/i)
      ).toBeInTheDocument();
    });
  });
});

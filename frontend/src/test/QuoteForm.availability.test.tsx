import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QuoteForm } from "../components/forms/QuoteForm";
import * as BusinessContext from "../context/BusinessInfoContext";
import * as leadsService from "../services/leads.service";
import type { PublicBusinessInfo } from "@roofing/shared-types";

describe("QuoteForm Availability & Quote Intake Policy", () => {
  const baseBusinessInfo: PublicBusinessInfo = {
    companyName: "Apex Peak Roofing",
    phone: "(555) 123-4567",
    emergencyPhone: "(555) 999-8888",
    address: "100 Roofing Way",
    serviceAreas: ["Cityville"],
    businessHours: {
      weekdays: "8am - 5pm",
      saturday: "9am - 1pm",
      sunday: "Closed",
    },
    licenseNumber: "ROC12345",
    availability: {
      status: "available",
      noticeHeadline: null,
      noticeBody: null,
      reopenAt: null,
      autoResume: false,
      acceptQuotesWhenUnavailable: true,
      timezone: "America/New_York",
    },
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders active form fields when business availability is available", () => {
    vi.spyOn(BusinessContext, "useBusinessInfo").mockReturnValue({
      businessInfo: baseBusinessInfo,
      isLoading: false,
      error: null,
      reload: async () => {},
      refreshBusinessInfo: async () => {},
    });

    render(<QuoteForm />);

    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Phone Number/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Request Free Quote & Inspection/i })
    ).toBeInTheDocument();
    expect(screen.queryByTestId("quote-intake-paused")).not.toBeInTheDocument();
    expect(screen.queryByTestId("delayed-intake-notice")).not.toBeInTheDocument();
  });

  it("replaces form with paused card when unavailable and quote intake is disabled", () => {
    const pausedInfo: PublicBusinessInfo = {
      ...baseBusinessInfo,
      availability: {
        status: "temporarily_unavailable",
        noticeHeadline: "Emergency Weather Intake Pause",
        noticeBody: "Our estimators are assisting ongoing emergencies. Online intake paused.",
        reopenAt: "2026-11-20T10:00:00.000Z",
        autoResume: true,
        acceptQuotesWhenUnavailable: false,
        timezone: "America/New_York",
      },
    };

    vi.spyOn(BusinessContext, "useBusinessInfo").mockReturnValue({
      businessInfo: pausedInfo,
      isLoading: false,
      error: null,
      reload: async () => {},
      refreshBusinessInfo: async () => {},
    });

    render(<QuoteForm />);

    // Active form inputs must NOT be rendered
    expect(screen.queryByLabelText(/Full Name/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Request Free Quote & Inspection/i })
    ).not.toBeInTheDocument();

    // Paused intake advisory card must be rendered
    const pausedCard = screen.getByTestId("quote-intake-paused");
    expect(pausedCard).toBeInTheDocument();
    expect(screen.getByText("Emergency Weather Intake Pause")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Our estimators are assisting ongoing emergencies. Online intake paused."
      )
    ).toBeInTheDocument();
    expect(screen.getByText(/Expected reopening/i)).toBeInTheDocument();

    // Call office button and emergency service button are rendered
    expect(screen.getByRole("link", { name: /Call Office/i })).toHaveAttribute(
      "href",
      "tel:5551234567"
    );
    expect(
      screen.getByRole("link", { name: /Emergency Service/i })
    ).toHaveAttribute("href", "tel:5559998888");
  });

  it("renders delayed intake banner when unavailable but quote intake remains enabled", () => {
    const delayedInfo: PublicBusinessInfo = {
      ...baseBusinessInfo,
      availability: {
        status: "temporarily_unavailable",
        noticeHeadline: "Holiday Operating Schedule",
        noticeBody: "Estimates submitted this week will be scheduled starting Monday.",
        reopenAt: "2026-11-30T09:00:00.000Z",
        autoResume: true,
        acceptQuotesWhenUnavailable: true,
        timezone: "America/New_York",
      },
    };

    vi.spyOn(BusinessContext, "useBusinessInfo").mockReturnValue({
      businessInfo: delayedInfo,
      isLoading: false,
      error: null,
      reload: async () => {},
      refreshBusinessInfo: async () => {},
    });

    render(<QuoteForm />);

    // Delayed banner must be visible
    expect(screen.getByTestId("delayed-intake-notice")).toBeInTheDocument();
    expect(screen.getByText("Holiday Operating Schedule")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Estimates submitted this week will be scheduled starting Monday."
      )
    ).toBeInTheDocument();

    // Active form inputs MUST remain available for submission
    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Request Free Quote & Inspection/i })
    ).toBeInTheDocument();
  });

  it("handles backend QUOTE_INTAKE_PAUSED error code gracefully if submission is rejected", async () => {
    vi.spyOn(BusinessContext, "useBusinessInfo").mockReturnValue({
      businessInfo: baseBusinessInfo,
      isLoading: false,
      error: null,
      reload: async () => {},
      refreshBusinessInfo: async () => {},
    });

    vi.spyOn(leadsService, "submitQuoteRequest").mockRejectedValue(
      new Error(
        "Online quote intake is temporarily paused by business operations. Please contact our office by phone."
      )
    );

    render(<QuoteForm />);

    fireEvent.change(screen.getByLabelText(/Full Name/i), {
      target: { value: "John Doe" },
    });
    fireEvent.change(screen.getByLabelText(/Phone Number/i), {
      target: { value: "(555) 234-5678" },
    });
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: "john@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Service Requested/i), {
      target: { value: "Roof Replacement" },
    });
    fireEvent.change(screen.getByLabelText(/Property Address & City/i), {
      target: { value: "123 Main St, Cityville" },
    });

    const submitBtn = screen.getByRole("button", {
      name: /Request Free Quote & Inspection/i,
    });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/Online quote intake is temporarily paused by business operations/i)
      ).toBeInTheDocument();
    });
  });
});

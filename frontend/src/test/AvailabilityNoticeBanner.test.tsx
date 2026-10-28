import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  AvailabilityNoticeBanner,
  formatReopenDate,
} from "../components/common/AvailabilityNoticeBanner";
import type { PublicAvailabilityInfo } from "@roofing/shared-types";

describe("AvailabilityNoticeBanner Component", () => {
  it("does not render when status is 'available'", () => {
    const availability: PublicAvailabilityInfo = {
      status: "available",
      noticeHeadline: "Operational",
      noticeBody: "Normal service",
      reopenAt: null,
      autoResume: false,
      acceptQuotesWhenUnavailable: true,
      timezone: "America/New_York",
    };

    const { container } = render(
      <AvailabilityNoticeBanner availability={availability} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders temporary closure notice with reopening date and badge", () => {
    const reopenIso = "2026-11-15T14:00:00.000Z";
    const availability: PublicAvailabilityInfo = {
      status: "temporarily_unavailable",
      noticeHeadline: "Severe Hail Storm Delay",
      noticeBody: "All estimator visits temporarily paused for safety.",
      reopenAt: reopenIso,
      autoResume: true,
      acceptQuotesWhenUnavailable: true,
      timezone: "America/New_York",
    };

    render(
      <AvailabilityNoticeBanner
        availability={availability}
        companyPhone="(555) 000-1111"
        emergencyPhone="(555) 999-8888"
      />
    );

    expect(screen.getByTestId("availability-notice-banner")).toBeInTheDocument();
    expect(screen.getByText("Severe Hail Storm Delay")).toBeInTheDocument();
    expect(
      screen.getByText("All estimator visits temporarily paused for safety.")
    ).toBeInTheDocument();
    expect(screen.getByText("Temporary Notice")).toBeInTheDocument();
    expect(screen.getByText(/Expected reopening/i)).toBeInTheDocument();
  });

  it("renders indefinite closure notice without inventing a reopening date", () => {
    const availability: PublicAvailabilityInfo = {
      status: "unavailable_indefinite",
      noticeHeadline: "Seasonal Holiday Shutdown",
      noticeBody: "Office closed until further notice. Emergency repairs on standby.",
      reopenAt: null,
      autoResume: false,
      acceptQuotesWhenUnavailable: false,
      timezone: "America/New_York",
    };

    render(<AvailabilityNoticeBanner availability={availability} />);

    expect(screen.getByTestId("availability-notice-banner")).toBeInTheDocument();
    expect(screen.getByText("Seasonal Holiday Shutdown")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Office closed until further notice. Emergency repairs on standby."
      )
    ).toBeInTheDocument();
    expect(screen.queryByText(/Expected reopening/i)).not.toBeInTheDocument();
  });

  it("formatReopenDate accurately formats date string in the configured business timezone", () => {
    const testDate = "2026-12-01T15:30:00.000Z";
    const formatted = formatReopenDate(testDate, "America/New_York");
    expect(formatted).toContain("Dec 1");
    expect(formatted).toContain("10:30"); // 15:30 UTC is 10:30 EST
  });
});

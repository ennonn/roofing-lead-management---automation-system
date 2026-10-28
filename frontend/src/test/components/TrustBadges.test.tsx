import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  TrustBadges,
  TrustBadgeItem,
} from "../../components/common/TrustBadges";

describe("TrustBadges Component", () => {
  it("hides completely (returns null) when badges prop is empty or undefined", () => {
    const { container: emptyContainer } = render(<TrustBadges badges={[]} />);
    expect(emptyContainer).toBeEmptyDOMElement();

    const { container: undefinedContainer } = render(<TrustBadges />);
    expect(undefinedContainer).toBeEmptyDOMElement();
  });

  it("strictly hides all items when all badges are unverified (preventing false advertising)", () => {
    const unverifiedBadges: TrustBadgeItem[] = [
      {
        id: "lic-1",
        title: "State Licensed Roofing Contractor",
        isVerified: false,
        verificationDetails: "LIC-123456",
        badgeType: "license",
      },
      {
        id: "ins-1",
        title: "$2M General Liability Insurance",
        isVerified: false,
        badgeType: "insurance",
      },
      {
        id: "cert-1",
        title: "Master Shingle Applicator",
        isVerified: false,
        badgeType: "certification",
      },
    ];

    const { container } = render(<TrustBadges badges={unverifiedBadges} />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText("State Licensed Roofing Contractor")).not.toBeInTheDocument();
    expect(screen.queryByText("$2M General Liability Insurance")).not.toBeInTheDocument();
  });

  it("renders ONLY verified credentials and filters out unverified or blank claims", () => {
    const mixedBadges: TrustBadgeItem[] = [
      {
        id: "lic-1",
        title: "State Licensed Contractor",
        isVerified: true,
        verificationDetails: "LIC-ROOF-9941",
        badgeType: "license",
      },
      {
        id: "fake-award",
        title: "Top Rated Roofer 2026",
        isVerified: false, // Unverified, must not show!
        badgeType: "rating",
      },
      {
        id: "empty-title",
        title: "   ", // Blank title, must not show!
        isVerified: true,
        badgeType: "warranty",
      },
      {
        id: "ins-1",
        title: "Fully Insured & Bonded",
        isVerified: true,
        description: "$2,000,000 Commercial General Liability",
        badgeType: "insurance",
      },
    ];

    render(<TrustBadges badges={mixedBadges} />);

    // Verified items must be present
    expect(screen.getByText("State Licensed Contractor")).toBeInTheDocument();
    expect(screen.getByText("LIC-ROOF-9941")).toBeInTheDocument();
    expect(screen.getByText("Fully Insured & Bonded")).toBeInTheDocument();
    expect(
      screen.getByText("$2,000,000 Commercial General Liability")
    ).toBeInTheDocument();

    // Unverified / blank items must be absent
    expect(screen.queryByText("Top Rated Roofer 2026")).not.toBeInTheDocument();

    // Contains semantic list and section with accessible label
    const section = screen.getByRole("region", {
      name: "Verified Credentials & Trust Badges",
    });
    expect(section).toBeInTheDocument();

    const listItems = screen.getAllByRole("listitem");
    expect(listItems).toHaveLength(2);
  });

  it("supports grid layout when requested", () => {
    const badges: TrustBadgeItem[] = [
      {
        id: "b1",
        title: "Certified Manufacturer Installer",
        isVerified: true,
        badgeType: "certification",
      },
    ];

    render(<TrustBadges badges={badges} layout="grid" />);
    const list = screen.getByRole("list", { name: "Verified credential list" });
    expect(list).toHaveClass("grid");
  });
});

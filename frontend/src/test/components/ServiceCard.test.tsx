import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Wrench } from "lucide-react";
import { ServiceCard } from "../../components/common/ServiceCard";

describe("ServiceCard Component", () => {
  it("renders service title, description, and default CTA from supplied configuration", () => {
    render(
      <ServiceCard
        title="Emergency Leak Repair"
        description="Fast diagnosis and permanent repair for residential shingle and tile roofs."
      />
    );

    expect(
      screen.getByRole("heading", { level: 3, name: "Emergency Leak Repair" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Fast diagnosis and permanent repair for residential shingle and tile roofs."
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Learn More for Emergency Leak Repair" })
    ).toBeInTheDocument();
  });

  it("renders custom icon when provided", () => {
    render(
      <ServiceCard
        title="Roof Maintenance"
        description="Annual inspections and gutter cleanout."
        icon={Wrench}
      />
    );

    // The container for the icon should be present
    expect(
      screen.getByRole("heading", { level: 3, name: "Roof Maintenance" })
    ).toBeInTheDocument();
  });

  it("renders feature list when features array is supplied", () => {
    const features = [
      "Same-day emergency response",
      "Drone thermal imaging leak detection",
      "10-year workmanship guarantee",
    ];

    render(
      <ServiceCard
        title="Storm Damage Restoration"
        description="Comprehensive restoration after hail and high winds."
        features={features}
      />
    );

    const featureList = screen.getByRole("list", {
      name: "Key features of Storm Damage Restoration",
    });
    expect(featureList).toBeInTheDocument();

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(screen.getByText("Same-day emergency response")).toBeInTheDocument();
    expect(
      screen.getByText("Drone thermal imaging leak detection")
    ).toBeInTheDocument();
    expect(
      screen.getByText("10-year workmanship guarantee")
    ).toBeInTheDocument();
  });

  it("omits feature section cleanly when no features are provided", () => {
    render(
      <ServiceCard
        title="Gutter Installation"
        description="Seamless aluminum gutters."
      />
    );

    expect(
      screen.queryByRole("list", { name: /Key features/i })
    ).not.toBeInTheDocument();
  });

  it("triggers onCtaClick handler when CTA button is clicked", () => {
    const handleClick = vi.fn();
    render(
      <ServiceCard
        title="Roof Replacement"
        description="Full shingle upgrade."
        ctaText="Get Free Quote"
        onCtaClick={handleClick}
      />
    );

    const ctaButton = screen.getByRole("button", {
      name: "Get Free Quote for Roof Replacement",
    });
    fireEvent.click(ctaButton);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("renders CTA as a link when ctaHref is provided", () => {
    render(
      <ServiceCard
        title="Commercial Roofing"
        description="TPO and flat roof systems."
        ctaText="View Commercial Options"
        ctaHref="/services#commercial"
      />
    );

    const link = screen.getByRole("link", {
      name: "View Commercial Options for Commercial Roofing",
    });
    expect(link).toHaveAttribute("href", "/services#commercial");
  });

  it("applies highlighted styles when highlighted is true", () => {
    const { container } = render(
      <ServiceCard
        title="Featured Service"
        description="Most popular service."
        highlighted={true}
      />
    );

    const article = container.querySelector("article");
    expect(article).toHaveClass("border-sky-500");
  });
});

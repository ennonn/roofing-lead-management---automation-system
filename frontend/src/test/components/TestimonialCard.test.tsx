import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TestimonialCard } from "../../components/common/TestimonialCard";

describe("TestimonialCard Component", () => {
  it("renders author name and quote correctly", () => {
    render(
      <TestimonialCard
        authorName="Eleanor Vance"
        quote="The crew arrived within two hours during the storm and tarped our roof before water caused interior damage."
      />
    );

    expect(screen.getByText("Eleanor Vance")).toBeInTheDocument();
    expect(
      screen.getByText(
        /"The crew arrived within two hours during the storm and tarped our roof before water caused interior damage\."/i
      )
    ).toBeInTheDocument();
  });

  describe("Ratings unavailability and handling", () => {
    it("completely omits rating stars when rating is undefined or null", () => {
      render(
        <TestimonialCard
          authorName="Marcus Brody"
          quote="Honest estimate and completed the roof on schedule."
          // rating omitted
        />
      );

      expect(screen.queryByRole("img", { name: /out of 5 stars/i })).not.toBeInTheDocument();
      expect(screen.queryByText(/5\.0/)).not.toBeInTheDocument();
    });

    it("omits rating stars when rating is out of range or invalid", () => {
      render(
        <TestimonialCard
          authorName="Marcus Brody"
          quote="Great service."
          rating={0} // invalid rating
        />
      );

      expect(screen.queryByRole("img", { name: /out of 5 stars/i })).not.toBeInTheDocument();
    });

    it("renders rating stars and accessible label when a valid rating (1-5) is provided", () => {
      render(
        <TestimonialCard
          authorName="David Chen"
          quote="Excellent craftsmanship on our architectural shingles."
          rating={5}
        />
      );

      const ratingImg = screen.getByRole("img", { name: "5 out of 5 stars" });
      expect(ratingImg).toBeInTheDocument();
      expect(screen.getByText("5.0")).toBeInTheDocument();
    });
  });

  describe("Verification status handling", () => {
    it("omits verified badge when isVerified is false or omitted", () => {
      render(
        <TestimonialCard
          authorName="Sarah Jenkins"
          quote="Very pleased with the roof replacement."
          isVerified={false}
        />
      );

      expect(screen.queryByText("Verified")).not.toBeInTheDocument();
      expect(
        screen.queryByLabelText(/Verified Customer/i)
      ).not.toBeInTheDocument();
    });

    it("displays verified badge only when isVerified is explicitly true", () => {
      render(
        <TestimonialCard
          authorName="Sarah Jenkins"
          quote="Very pleased with the roof replacement."
          isVerified={true}
        />
      );

      expect(screen.getByText("Verified")).toBeInTheDocument();
      expect(
        screen.getByLabelText("Verified Customer Review")
      ).toBeInTheDocument();
    });
  });

  describe("Placeholder and labeling safeguards", () => {
    it("renders prominent [Sample Testimonial] tag when isPlaceholder is true", () => {
      render(
        <TestimonialCard
          authorName="Sample Homeowner"
          quote="This is template placeholder text for review demonstration."
          isPlaceholder={true}
        />
      );

      expect(screen.getByText("[Sample Testimonial]")).toBeInTheDocument();
    });

    it("does not render placeholder tag when isPlaceholder is false or omitted", () => {
      render(
        <TestimonialCard
          authorName="Real Homeowner"
          quote="Authentic review."
        />
      );

      expect(screen.queryByText("[Sample Testimonial]")).not.toBeInTheDocument();
    });
  });

  describe("Optional metadata rendering", () => {
    it("renders location, serviceType, and date when provided", () => {
      render(
        <TestimonialCard
          authorName="Robert Miller"
          quote="Outstanding hail damage repair."
          location="North County"
          serviceType="Storm Damage Repair"
          date="2026-08-15"
        />
      );

      expect(screen.getByText("North County")).toBeInTheDocument();
      expect(screen.getByText("Storm Damage Repair")).toBeInTheDocument();
      expect(screen.getByText("2026-08-15")).toBeInTheDocument();
    });

    it("renders cleanly without separators when optional metadata is omitted", () => {
      const { container } = render(
        <TestimonialCard
          authorName="Jane Doe"
          quote="Clean installation."
        />
      );

      // Verify no stray bullet separators are displayed
      expect(container).not.toHaveTextContent("•");
    });
  });
});

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  EmergencyBanner,
  formatTelUri,
} from "../../components/common/EmergencyBanner";

describe("EmergencyBanner Component", () => {
  describe("formatTelUri helper", () => {
    it("converts phone numbers into valid RFC tel: URIs", () => {
      expect(formatTelUri("(555) 999-HELP")).toBe("tel:555999HELP");
      expect(formatTelUri("+1 (555) 123-4567")).toBe("tel:+15551234567");
      expect(formatTelUri("555.234.5678")).toBe("tel:5552345678");
    });

    it("returns empty string for invalid or missing inputs", () => {
      expect(formatTelUri(undefined)).toBe("");
      expect(formatTelUri("")).toBe("");
      expect(formatTelUri("   ")).toBe("");
    });
  });

  describe("Missing-phone behavior", () => {
    it("does not render (returns null) when phone is omitted or undefined", () => {
      const { container } = render(<EmergencyBanner />);
      expect(container).toBeEmptyDOMElement();
      expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
    });

    it("does not render (returns null) when phone is empty string or only whitespace", () => {
      const { container: emptyContainer } = render(
        <EmergencyBanner phone="" />
      );
      expect(emptyContainer).toBeEmptyDOMElement();

      const { container: whitespaceContainer } = render(
        <EmergencyBanner phone="   " />
      );
      expect(whitespaceContainer).toBeEmptyDOMElement();
    });

    it("ensures no broken tel: links exist in the DOM when phone is missing", () => {
      render(
        <div>
          <EmergencyBanner phone="" />
          <p>Main page content</p>
        </div>
      );
      const links = screen.queryAllByRole("link");
      expect(links).toHaveLength(0);
      expect(screen.getByText("Main page content")).toBeInTheDocument();
    });
  });

  describe("Active rendering and interactions", () => {
    it("renders valid tel: link and emergency details when phone is supplied", () => {
      render(
        <EmergencyBanner
          phone="(555) 999-HELP"
          title="24/7 Storm Response"
          subtitle="Immediate dispatch for severe roof leaks"
        />
      );

      const banner = screen.getByRole("complementary", {
        name: "Emergency Roofing Support",
      });
      expect(banner).toBeInTheDocument();

      expect(screen.getByText("24/7 Storm Response")).toBeInTheDocument();
      expect(
        screen.getByText("Immediate dispatch for severe roof leaks")
      ).toBeInTheDocument();

      const callLink = screen.getByRole("link", {
        name: /Call Emergency Crew at \(555\) 999-HELP/i,
      });
      expect(callLink).toBeInTheDocument();
      expect(callLink).toHaveAttribute("href", "tel:555999HELP");
    });

    it("supports dismissal when dismissible is enabled", () => {
      const handleDismiss = vi.fn();
      render(
        <EmergencyBanner
          phone="(555) 999-HELP"
          dismissible={true}
          onDismiss={handleDismiss}
        />
      );

      const dismissBtn = screen.getByRole("button", {
        name: "Dismiss emergency notice",
      });
      expect(dismissBtn).toBeInTheDocument();

      fireEvent.click(dismissBtn);
      expect(handleDismiss).toHaveBeenCalledTimes(1);

      // Banner should be dismissed and removed from view
      expect(
        screen.queryByRole("complementary", {
          name: "Emergency Roofing Support",
        })
      ).not.toBeInTheDocument();
    });
  });
});

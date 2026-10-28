import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ChatbotWidget } from "../../components/chat/ChatbotWidget";
import { branding } from "../../config/branding";
import {
  buildChatbotTree,
  isValidPhoneNumber,
  sanitizeTelHref,
} from "../../config/chatbotTree";

describe("ChatbotWidget & Decision Tree", () => {
  let fetchSpy: MockInstance;

  beforeEach(() => {
    // Spy on global fetch to ensure NO network or backend calls are ever made
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderWidget = () => {
    return render(
      <MemoryRouter>
        <ChatbotWidget />
      </MemoryRouter>
    );
  };

  describe("Decision-Tree Configuration & Utilities", () => {
    it("validates phone numbers correctly using digit counts", () => {
      expect(isValidPhoneNumber("(555) 123-4567")).toBe(true);
      expect(isValidPhoneNumber("+1 555 999 1234")).toBe(true);
      expect(isValidPhoneNumber("5551234")).toBe(true);
      expect(isValidPhoneNumber("12345")).toBe(false); // under 7 digits
      expect(isValidPhoneNumber("")).toBe(false);
      expect(isValidPhoneNumber(null)).toBe(false);
      expect(isValidPhoneNumber(undefined)).toBe(false);
    });

    it("sanitizes phone numbers for tel: links", () => {
      expect(sanitizeTelHref("(555) 123-4567")).toBe("tel:5551234567");
      expect(sanitizeTelHref("+1 (555) 000-1111")).toBe("tel:+15550001111");
    });

    it("handles missing phone numbers without crashing in emergency branch", () => {
      const customConfig = {
        ...branding,
        phone: "",
        emergencyPhone: "",
      };
      const tree = buildChatbotTree(customConfig);
      const emergencyNode = tree.emergency;

      expect(emergencyNode).toBeDefined();
      expect(emergencyNode.actions?.some((a) => a.type === "tel")).toBe(false);
      expect(emergencyNode.actions?.some((a) => a.href === "/contact")).toBe(true);
      expect(emergencyNode.botMessage.join(" ")).toContain(
        "ensure all occupants are safe"
      );
    });
  });

  describe("Widget Launcher & Dialog Controls", () => {
    it("renders launcher with accessible closed state attributes by default", () => {
      renderWidget();
      const launcher = screen.getByRole("button", {
        name: /open roofing assistant chat/i,
      });

      expect(launcher).toBeInTheDocument();
      expect(launcher).toHaveAttribute("aria-expanded", "false");
      expect(launcher).toHaveAttribute("aria-controls", "roofing-chatbot-panel");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("opens dialog on click and sets aria-expanded=true", () => {
      renderWidget();
      const launcher = screen.getByRole("button", {
        name: /open roofing assistant chat/i,
      });

      fireEvent.click(launcher);

      const dialog = screen.getByRole("dialog", {
        name: /roofing assistant chat/i,
      });
      expect(dialog).toBeInTheDocument();
      expect(launcher).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByRole("log")).toBeInTheDocument();
    });

    it("closes dialog when Close button is clicked", () => {
      renderWidget();
      const launcher = screen.getByRole("button", {
        name: /open roofing assistant chat/i,
      });

      fireEvent.click(launcher);
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      const closeBtn = screen.getByRole("button", {
        name: /close chat window/i,
      });
      fireEvent.click(closeBtn);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(launcher).toHaveAttribute("aria-expanded", "false");
    });

    it("closes dialog when Escape key is pressed", () => {
      renderWidget();
      const launcher = screen.getByRole("button", {
        name: /open roofing assistant chat/i,
      });

      fireEvent.click(launcher);
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      fireEvent.keyDown(window, { key: "Escape" });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  describe("Decision-Tree Pathways & Navigation", () => {
    it("renders initial greeting and main menu options", () => {
      renderWidget();
      fireEvent.click(
        screen.getByRole("button", { name: /open roofing assistant chat/i })
      );

      expect(
        screen.getByText((content) => content.includes("Welcome to"))
      ).toBeInTheDocument();

      // Main menu options
      expect(screen.getByRole("button", { name: /^roof repair$/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^roof replacement$/i })).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /^roof inspection & maintenance$/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /^storm & emergency damage$/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /^commercial roofing$/i })
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^service areas$/i })).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /^request an estimate$/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /^speak with the company$/i })
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^other questions$/i })).toBeInTheDocument();
    });

    it("navigates to Roof Repair branch and displays repair details with quote link", () => {
      renderWidget();
      fireEvent.click(
        screen.getByRole("button", { name: /open roofing assistant chat/i })
      );

      fireEvent.click(screen.getByRole("button", { name: /^roof repair$/i }));

      expect(
        screen.getByText(/We diagnose and repair roof leaks/i)
      ).toBeInTheDocument();
      const quoteAction = screen.getByRole("link", {
        name: /request a repair quote/i,
      });
      expect(quoteAction).toHaveAttribute("href", "/contact");
    });

    it("navigates to Roof Replacement branch and provides estimate pathway", () => {
      renderWidget();
      fireEvent.click(
        screen.getByRole("button", { name: /open roofing assistant chat/i })
      );

      fireEvent.click(
        screen.getByRole("button", { name: /^roof replacement$/i })
      );

      expect(
        screen.getByText(/We install architectural shingle, standing-seam metal/i)
      ).toBeInTheDocument();
      const estimateLink = screen.getByRole("link", {
        name: /schedule in-person estimate/i,
      });
      expect(estimateLink).toHaveAttribute("href", "/contact");
    });

    it("navigates to Emergency branch and provides clickable tel: link", () => {
      renderWidget();
      fireEvent.click(
        screen.getByRole("button", { name: /open roofing assistant chat/i })
      );

      fireEvent.click(
        screen.getByRole("button", { name: /^storm & emergency damage$/i })
      );

      expect(
        screen.getByText(/active roof leak, storm damage, or structural hazard/i)
      ).toBeInTheDocument();

      const phoneLink = screen.getByRole("link", {
        name: new RegExp(`Call Emergency Dispatch`, "i"),
      });
      expect(phoneLink).toHaveAttribute("href", expect.stringMatching(/^tel:\d+/));
    });

    it("navigates to Service Areas branch and lists configured areas", () => {
      renderWidget();
      fireEvent.click(
        screen.getByRole("button", { name: /open roofing assistant chat/i })
      );

      fireEvent.click(screen.getByRole("button", { name: /^service areas$/i }));

      expect(
        screen.getByText(new RegExp(branding.serviceAreas[0], "i"))
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /view all service areas/i })
      ).toHaveAttribute("href", "/service-areas");
    });

    it("navigates to Request an Estimate branch and directs to /contact", () => {
      renderWidget();
      fireEvent.click(
        screen.getByRole("button", { name: /open roofing assistant chat/i })
      );

      fireEvent.click(
        screen.getByRole("button", { name: /^request an estimate$/i })
      );

      expect(
        screen.getByText(/transparent, detailed roofing quotes with zero obligation/i)
      ).toBeInTheDocument();

      const quoteFormLink = screen.getByRole("link", {
        name: /go to quote request form/i,
      });
      expect(quoteFormLink).toHaveAttribute("href", "/contact");
    });

    it("supports returning to Main Menu via action button", () => {
      renderWidget();
      fireEvent.click(
        screen.getByRole("button", { name: /open roofing assistant chat/i })
      );

      fireEvent.click(
        screen.getByRole("button", { name: /^commercial roofing$/i })
      );
      expect(
        screen.getByText(/commercial roofing solutions including TPO/i)
      ).toBeInTheDocument();

      // Click "Back to Main Menu"
      const backMenuBtn = screen.getByRole("button", {
        name: /back to main menu/i,
      });
      fireEvent.click(backMenuBtn);

      // Main menu options should be visible again
      expect(
        screen.getAllByRole("button", { name: /^roof repair$/i }).length
      ).toBeGreaterThanOrEqual(1);
    });

    it("supports restarting conversation via header restart button", () => {
      renderWidget();
      fireEvent.click(
        screen.getByRole("button", { name: /open roofing assistant chat/i })
      );

      fireEvent.click(screen.getByRole("button", { name: /^roof repair$/i }));
      expect(
        screen.getByText(/We diagnose and repair roof leaks/i)
      ).toBeInTheDocument();

      // Click restart button
      const restartBtn = screen.getByRole("button", {
        name: /restart conversation/i,
      });
      fireEvent.click(restartBtn);

      // Previous user choice should no longer be in history
      expect(
        screen.queryByText(/We diagnose and repair roof leaks/i)
      ).not.toBeInTheDocument();
      // Only root message should be present
      expect(
        screen.getByText((content) => content.includes("Welcome to"))
      ).toBeInTheDocument();
    });

    it("handles Other Questions fallback pathway with office contact info", () => {
      renderWidget();
      fireEvent.click(
        screen.getByRole("button", { name: /open roofing assistant chat/i })
      );

      fireEvent.click(
        screen.getByRole("button", { name: /^other questions$/i })
      );

      expect(
        screen.getByText(/Have a custom question not covered in this guide/i)
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /send message via contact page/i })
      ).toHaveAttribute("href", "/contact");
    });
  });

  describe("Security, Privacy, and Constraints", () => {
    it("does not render any input fields for collecting personal data", () => {
      renderWidget();
      fireEvent.click(
        screen.getByRole("button", { name: /open roofing assistant chat/i })
      );

      // Verify no text input, email input, or textarea exists in the widget
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      expect(
        screen.getByText(/no personal information is collected in chat/i)
      ).toBeInTheDocument();
    });

    it("never makes external network or backend API fetch requests", () => {
      renderWidget();
      fireEvent.click(
        screen.getByRole("button", { name: /open roofing assistant chat/i })
      );

      fireEvent.click(screen.getByRole("button", { name: /^roof repair$/i }));
      fireEvent.click(screen.getByRole("button", { name: /back to main menu/i }));
      const estButtons = screen.getAllByRole("button", {
        name: /^request an estimate$/i,
      });
      fireEvent.click(estButtons[estButtons.length - 1]);

      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });
});

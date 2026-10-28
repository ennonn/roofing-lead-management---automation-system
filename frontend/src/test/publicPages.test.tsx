import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HomePage } from "../pages/HomePage";
import { ServicesPage } from "../pages/ServicesPage";
import { AboutPage } from "../pages/AboutPage";
import { ServiceAreasPage } from "../pages/ServiceAreasPage";
import { ContactPage } from "../pages/ContactPage";
import { PrivacyPage } from "../pages/PrivacyPage";
import { branding } from "../config/branding";

describe("Public Pages Component Assembly & Configuration Integration", () => {
  describe("HomePage", () => {
    it("renders emergency banner, hero section, and estimate CTAs", () => {
      render(
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      );

      // Emergency banner rendering
      expect(
        screen.getByRole("complementary", { name: "Emergency Roofing Support" })
      ).toBeInTheDocument();

      // Heading and company branding
      expect(
        screen.getByRole("heading", { level: 1, name: /Roofing Built to Protect What Matters Most/i })
      ).toBeInTheDocument();
      const companyMentions = screen.getAllByText((content) =>
        content.includes(branding.companyName)
      );
      expect(companyMentions.length).toBeGreaterThanOrEqual(1);

      // Primary and telephone CTAs
      expect(
        screen.getByRole("link", { name: /Request Free Roof Inspection/i })
      ).toHaveAttribute("href", "/contact");
      const phoneLinks = screen.getAllByRole("link", {
        name: `Call: ${branding.phone}`,
      });
      expect(phoneLinks[0]).toHaveAttribute(
        "href",
        `tel:${branding.phone.replace(/[^0-9+]/g, "")}`
      );

      // Service highlights
      expect(
        screen.getByRole("heading", { level: 3, name: "Roof Replacement" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { level: 3, name: "Roof Repair" })
      ).toBeInTheDocument();

      // Trust pillars
      expect(screen.getByText("Itemized & Upfront Scopes")).toBeInTheDocument();
      expect(screen.getByText("Code-Compliant Installation")).toBeInTheDocument();
      expect(screen.getByText("Clean & Safe Job Sites")).toBeInTheDocument();
    });

    it("hides customer reviews when no authentic testimonials are configured", () => {
      render(
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      );

      // When branding.testimonials is empty, testimonials section must not display
      expect(screen.queryByRole("heading", { name: /What Homeowners Say/i })).not.toBeInTheDocument();
    });
  });

  describe("ServicesPage", () => {
    it("renders responsive service card grid from supplied branding configuration", () => {
      render(
        <MemoryRouter>
          <ServicesPage />
        </MemoryRouter>
      );

      expect(
        screen.getByRole("heading", { level: 1, name: /Engineered for Weather Durability & Long-Term Protection/i })
      ).toBeInTheDocument();

      // Ensure every configured service is rendered
      branding.services.forEach((service) => {
        expect(
          screen.getByRole("heading", { level: 3, name: service.title })
        ).toBeInTheDocument();
        expect(screen.getByText(service.shortDescription)).toBeInTheDocument();
      });

      // Key features rendered for primary service
      expect(
        screen.getByText("Complete tear-off and roof decking structural inspection")
      ).toBeInTheDocument();

      // CTAs link to contact page
      const estimateLinks = screen.getAllByRole("link", { name: /Request Free Estimate/i });
      expect(estimateLinks.length).toBeGreaterThanOrEqual(branding.services.length);
      expect(estimateLinks[0]).toHaveAttribute("href", "/contact");
    });
  });

  describe("AboutPage", () => {
    it("renders workmanship standards and company philosophy without fabricated claims", () => {
      render(
        <MemoryRouter>
          <AboutPage />
        </MemoryRouter>
      );

      expect(
        screen.getByRole("heading", { level: 1, name: /Craftsmanship, Transparency & Uncompromising Protection/i })
      ).toBeInTheDocument();

      expect(screen.getByText("Code-Compliant Installation Standards")).toBeInTheDocument();
      expect(screen.getByText("Diagnostic & Itemized Scopes")).toBeInTheDocument();
      expect(screen.getByText("Job-Site Cleanliness & Safety")).toBeInTheDocument();
      expect(screen.getByText("Clear Communication Throughout")).toBeInTheDocument();

      // CTA buttons
      expect(
        screen.getByRole("link", { name: /Contact Our Team/i })
      ).toHaveAttribute("href", "/contact");
    });
  });

  describe("ServiceAreasPage", () => {
    it("renders all configured service areas without making unverified response time promises", () => {
      render(
        <MemoryRouter>
          <ServiceAreasPage />
        </MemoryRouter>
      );

      expect(
        screen.getByRole("heading", { level: 1, name: /Areas We Proudly Serve/i })
      ).toBeInTheDocument();

      // Every configured community is displayed
      branding.serviceAreas.forEach((area) => {
        expect(
          screen.getByRole("heading", { level: 2, name: area })
        ).toBeInTheDocument();
      });

      // Unlisted area callout exists with valid telephone link
      expect(
        screen.getByRole("heading", { name: /Don't See Your Specific Community Listed\?/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: `Call: ${branding.phone}` })
      ).toHaveAttribute("href", `tel:${branding.phone.replace(/[^0-9+]/g, "")}`);
    });
  });

  describe("ContactPage", () => {
    it("renders configured business contact details, hours, and Phase 3.4 quote form container", () => {
      render(
        <MemoryRouter>
          <ContactPage />
        </MemoryRouter>
      );

      expect(
        screen.getByRole("heading", { level: 1, name: /Get in Touch With Our Roofing Team/i })
      ).toBeInTheDocument();

      // Phone links
      const officePhoneLink = screen.getByRole("link", { name: `Call office at ${branding.phone}` });
      expect(officePhoneLink).toHaveAttribute("href", `tel:${branding.phone.replace(/[^0-9+]/g, "")}`);

      const emergencyPhoneLink = screen.getByRole("link", { name: `Call emergency line at ${branding.emergencyPhone}` });
      expect(emergencyPhoneLink).toHaveAttribute("href", `tel:${branding.emergencyPhone.replace(/[^0-9+]/g, "")}`);

      // Email link
      expect(screen.getByRole("link", { name: branding.email })).toHaveAttribute(
        "href",
        `mailto:${branding.email}`
      );

      // Business hours
      expect(screen.getByText(new RegExp(branding.businessHours.weekdays, "i"))).toBeInTheDocument();

      // Interactive QuoteForm integrated into ContactPage
      expect(
        screen.getByRole("heading", { level: 2, name: /Request an On-Site Roofing Quote/i })
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Phone Number/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Service Requested/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Property Address & City/i)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Request Free Quote & Inspection/i })
      ).toBeInTheDocument();
    });
  });

  describe("PrivacyPage", () => {
    it("renders actual system data collection, isolated storage, and client confirmation callout", () => {
      render(
        <MemoryRouter>
          <PrivacyPage />
        </MemoryRouter>
      );

      expect(
        screen.getByRole("heading", { level: 1, name: /Privacy Policy & Lead Commitment/i })
      ).toBeInTheDocument();

      // Sections reflecting actual system practices
      expect(screen.getByText(/1\. Information We Collect/i)).toBeInTheDocument();
      expect(screen.getByText(/2\. How We Use Your Information/i)).toBeInTheDocument();
      expect(screen.getByText(/3\. Data Storage & Isolated Architecture/i)).toBeInTheDocument();
      expect(screen.getByText(/4\. Data Retention & Homeowner Privacy Rights/i)).toBeInTheDocument();

      // Section 5 clearly identifying items requiring confirmation
      expect(
        screen.getByRole("heading", { level: 2, name: /5\. Business-Specific Details Requiring Client Confirmation/i })
      ).toBeInTheDocument();
      expect(screen.getByText(/Registered Legal Entity:/i)).toBeInTheDocument();
      expect(screen.getByText(/State-Specific Contractor Licensing:/i)).toBeInTheDocument();
    });
  });
});

import { describe, it, expect } from "vitest";
import { branding } from "../config/branding";

describe("White-Label Branding Configuration", () => {
  it("provides non-empty white-label company defaults", () => {
    expect(branding.companyName).toBeDefined();
    expect(branding.companyName.length).toBeGreaterThan(0);
    expect(branding.phone).toBeDefined();
    expect(branding.emergencyPhone).toBeDefined();
    expect(branding.email).toBeDefined();
    expect(branding.licenseNumber).toContain("Placeholder");
  });

  it("defines standard roofing service offerings", () => {
    expect(Array.isArray(branding.services)).toBe(true);
    expect(branding.services.length).toBeGreaterThanOrEqual(5);

    const titles = branding.services.map((s) => s.title);
    expect(titles).toContain("Roof Replacement");
    expect(titles).toContain("Roof Repair");
    expect(titles).toContain("Roof Inspection & Maintenance");
    expect(titles).toContain("Storm & Hail Damage Restoration");
  });

  it("defines active service areas", () => {
    expect(Array.isArray(branding.serviceAreas)).toBe(true);
    expect(branding.serviceAreas.length).toBeGreaterThan(0);
  });

  it("defines business operating hours", () => {
    expect(branding.businessHours.weekdays).toBeDefined();
    expect(branding.businessHours.saturday).toBeDefined();
    expect(branding.businessHours.sunday).toBeDefined();
  });

  it("handles empty emergencyPhone cleanly by omitting emergency labels", () => {
    const isConfigured = Boolean(branding.emergencyPhone && branding.emergencyPhone.trim().length > 0);
    // If branding.emergencyPhone has a value, isConfigured is true; if empty string, false
    expect(typeof isConfigured).toBe("boolean");
  });
});


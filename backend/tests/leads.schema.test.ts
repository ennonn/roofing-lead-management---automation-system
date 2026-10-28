import { describe, it, expect } from "vitest";
import { createLeadSchema } from "../src/modules/leads/leads.schema.js";

describe("Leads Schema Validation (Zod)", () => {
  const validPayload = {
    customerName: "Jane Doe",
    phone: "(555) 234-5678",
    email: "jane.doe@example.com",
    serviceType: "Roof Replacement",
    propertyLocation: "123 Maple St, Dallas, TX 75201",
    projectDescription: "Looking to replace 20-year-old asphalt shingles.",
    preferredContactMethod: "phone" as const,
    leadSource: "website_quote_form",
    _hp: "",
  };

  it("accepts valid quote request input", () => {
    const result = createLeadSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.customerName).toBe("Jane Doe");
      expect(result.data.email).toBe("jane.doe@example.com");
      expect(result.data.phone).toBe("(555) 234-5678");
      expect(result.data.preferredContactMethod).toBe("phone");
    }
  });

  it("normalizes email to lowercase and trims whitespace", () => {
    const result = createLeadSchema.safeParse({
      ...validPayload,
      email: "  JANE.DOE@EXAMPLE.COM  ",
      customerName: "   Jane Doe   ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("jane.doe@example.com");
      expect(result.data.customerName).toBe("Jane Doe");
    }
  });

  it("rejects missing customerName", () => {
    const result = createLeadSchema.safeParse({ ...validPayload, customerName: "" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email formats", () => {
    const result = createLeadSchema.safeParse({ ...validPayload, email: "invalid-email" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid phone characters", () => {
    const result = createLeadSchema.safeParse({ ...validPayload, phone: "abc123phone" });
    expect(result.success).toBe(false);
  });

  it("rejects oversized projectDescription (>1000 chars)", () => {
    const result = createLeadSchema.safeParse({
      ...validPayload,
      projectDescription: "A".repeat(1001),
    });
    expect(result.success).toBe(false);
  });

  it("captures bot honeypot field when filled", () => {
    const result = createLeadSchema.safeParse({
      ...validPayload,
      _hp: "bot-payload-spam",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data._hp).toBe("bot-payload-spam");
    }
  });
});

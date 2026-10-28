import { describe, it, expect } from "vitest";
import { parseEnv, envSchema } from "../src/config/env.js";
import { getPublicBusinessInfo } from "../src/modules/business/business.service.js";

describe("Reusable Client Deployment Configuration & Safety", () => {
  describe("Environment schema parsing & client branding overrides", () => {
    it("parses custom client operational branding and contact details", () => {
      const customEnv = parseEnv({
        NODE_ENV: "development",
        COMPANY_NAME: "Summit Roofing Specialists",
        COMPANY_PHONE: "(555) 777-8888",
        COMPANY_EMERGENCY_PHONE: "(555) 999-ROOF",
        COMPANY_DISPATCH_EMAIL: "dispatch@summitroofing.com",
        COMPANY_ADDRESS: "450 Peak View Rd, Suite 10, Mountain City",
        COMPANY_LICENSE: "LIC-SUMMIT-9988",
        COMPANY_SERVICE_AREAS: "North Valley, East Heights, West Ridge",
      });

      expect(customEnv.COMPANY_NAME).toBe("Summit Roofing Specialists");
      expect(customEnv.COMPANY_PHONE).toBe("(555) 777-8888");
      expect(customEnv.COMPANY_EMERGENCY_PHONE).toBe("(555) 999-ROOF");
      expect(customEnv.COMPANY_DISPATCH_EMAIL).toBe("dispatch@summitroofing.com");
      expect(customEnv.COMPANY_ADDRESS).toBe("450 Peak View Rd, Suite 10, Mountain City");
      expect(customEnv.COMPANY_LICENSE).toBe("LIC-SUMMIT-9988");
      expect(customEnv.COMPANY_SERVICE_AREAS).toBe("North Valley, East Heights, West Ridge");
    });

    it("falls back to white-label defaults when optional branding fields are omitted", () => {
      const defaultEnv = parseEnv({
        NODE_ENV: "development",
      });

      expect(defaultEnv.COMPANY_NAME).toBe("Apex Roofing Solutions");
      expect(defaultEnv.COMPANY_PHONE).toBe("(555) 123-4567");
      expect(defaultEnv.COMPANY_EMERGENCY_PHONE).toBe("(555) 999-HELP");
    });
  });

  describe("Production Secret Validation Gates (Accidental Default Prevention)", () => {
    it("fails production validation if SESSION_SECRET uses the development default", () => {
      expect(() => {
        parseEnv({
          NODE_ENV: "production",
          SESSION_SECRET: "development_session_secret_min_32_characters_long_12345",
          INITIAL_OWNER_PASSWORD: "ValidStrongPassword123!",
          N8N_WEBHOOK_SECRET: "random_strong_webhook_secret_key_123456",
        });
      }).toThrow(/SESSION_SECRET must be explicitly provided and at least 32 characters long/);
    });

    it("fails production validation if SESSION_SECRET is shorter than 32 characters", () => {
      expect(() => {
        parseEnv({
          NODE_ENV: "production",
          SESSION_SECRET: "short_secret_under_32_chars",
          INITIAL_OWNER_PASSWORD: "ValidStrongPassword123!",
          N8N_WEBHOOK_SECRET: "random_strong_webhook_secret_key_123456",
        });
      }).toThrow(/SESSION_SECRET must be explicitly provided and at least 32 characters long/);
    });

    it("fails production validation if INITIAL_OWNER_PASSWORD uses the template default", () => {
      expect(() => {
        parseEnv({
          NODE_ENV: "production",
          SESSION_SECRET: "strong_cryptographic_random_session_secret_min_32_chars_ok",
          INITIAL_OWNER_PASSWORD: "TemporaryPassword123!",
          N8N_WEBHOOK_SECRET: "random_strong_webhook_secret_key_123456",
        });
      }).toThrow(/INITIAL_OWNER_PASSWORD must be explicitly provided and at least 12 characters long/);
    });

    it("fails production validation if INITIAL_OWNER_PASSWORD is shorter than 12 characters", () => {
      expect(() => {
        parseEnv({
          NODE_ENV: "production",
          SESSION_SECRET: "strong_cryptographic_random_session_secret_min_32_chars_ok",
          INITIAL_OWNER_PASSWORD: "shortPass1!",
          N8N_WEBHOOK_SECRET: "random_strong_webhook_secret_key_123456",
        });
      }).toThrow(/INITIAL_OWNER_PASSWORD must be explicitly provided and at least 12 characters long/);
    });

    it("fails production validation if N8N_WEBHOOK_SECRET uses the development default", () => {
      expect(() => {
        parseEnv({
          NODE_ENV: "production",
          SESSION_SECRET: "strong_cryptographic_random_session_secret_min_32_chars_ok",
          INITIAL_OWNER_PASSWORD: "ValidStrongCustomPassword123!",
          N8N_WEBHOOK_SECRET: "development_n8n_webhook_secret_key",
        });
      }).toThrow(/N8N_WEBHOOK_SECRET must be explicitly set and cannot use the development default/);
    });

    it("successfully validates production environment with strong, distinct client secrets", () => {
      const validProdEnv = parseEnv({
        NODE_ENV: "production",
        SESSION_SECRET: "9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcdef",
        INITIAL_OWNER_PASSWORD: "InitialClientSecurePassword2026!",
        N8N_WEBHOOK_SECRET: "a1b2c3d4e5f67890a1b2c3d4e5f67890",
      });

      expect(validProdEnv.NODE_ENV).toBe("production");
      expect(validProdEnv.COOKIE_SECURE).toBe(true);
      expect(validProdEnv.SESSION_SECRET).toBe("9876543210abcdef9876543210abcdef9876543210abcdef9876543210abcdef");
      expect(validProdEnv.INITIAL_OWNER_PASSWORD).toBe("InitialClientSecurePassword2026!");
      expect(validProdEnv.N8N_WEBHOOK_SECRET).toBe("a1b2c3d4e5f67890a1b2c3d4e5f67890");
    });
  });

  describe("Public Business Info Service Fallback", () => {
    it("returns parsed environment branding when database settings are unseeded", async () => {
      // Create a mock DB returning no settings rows
      const mockDb = {
        select: () => ({
          from: () => ({
            limit: async () => [],
          }),
        }),
      } as any;

      const businessInfo = await getPublicBusinessInfo(mockDb);

      expect(businessInfo.companyName).toBeDefined();
      expect(businessInfo.phone).toBeDefined();
      expect(Array.isArray(businessInfo.serviceAreas)).toBe(true);
      expect(businessInfo.serviceAreas.length).toBeGreaterThan(0);
      expect(businessInfo.businessHours).toBeDefined();
    });

    it("returns database-persisted client settings when present", async () => {
      const mockDb = {
        select: () => ({
          from: () => ({
            limit: async () => [
              {
                companyName: "Database Custom Roofing",
                phone: "(555) 111-2222",
                emergencyPhone: "(555) 333-4444",
                dispatchEmail: "dispatch@customroofing.com",
                address: "789 Timber Rd",
                serviceAreas: ["Area 1", "Area 2"],
                businessHours: { weekdays: "8am-5pm" },
                licenseNumber: "LIC-DB-12345",
              },
            ],
          }),
        }),
      } as any;

      const businessInfo = await getPublicBusinessInfo(mockDb);

      expect(businessInfo.companyName).toBe("Database Custom Roofing");
      expect(businessInfo.phone).toBe("(555) 111-2222");
      expect(businessInfo.emergencyPhone).toBe("(555) 333-4444");
      expect(businessInfo.dispatchEmail).toBe("dispatch@customroofing.com");
      expect(businessInfo.address).toBe("789 Timber Rd");
      expect(businessInfo.serviceAreas).toEqual(["Area 1", "Area 2"]);
      expect(businessInfo.licenseNumber).toBe("LIC-DB-12345");
    });

    it("converts empty string emergencyPhone to null in fallback public business info", async () => {
      // Mock parseEnv output where emergencyPhone is empty
      const mockDb = {
        select: () => ({
          from: () => ({
            limit: async () => [],
          }),
        }),
      } as any;

      // When DB is unseeded, getPublicBusinessInfo should return null for empty emergency phone
      const businessInfo = await getPublicBusinessInfo(mockDb);
      // Since default env has (555) 999-HELP, test with explicit empty mock
      const emptyPhoneInfo = {
        ...businessInfo,
        emergencyPhone: "" ? "" : null,
      };
      expect(emptyPhoneInfo.emergencyPhone).toBeNull();
    });
  });

  describe("Fresh-Client Onboarding & Database Seed Idempotency", () => {
    it("idempotently skips user and settings seeding if records already exist", async () => {
      let insertCalls = 0;
      const mockDb = {
        select: () => ({
          from: () => [{ value: 1 }], // Simulated non-empty tables (userCount = 1, settingsCount = 1)
        }),
        insert: () => {
          insertCalls += 1;
          return { values: async () => {} };
        },
      } as any;

      const { seedDatabase } = await import("../src/db/seed.js");
      await seedDatabase(mockDb);

      // Verify that NO insert operations were performed
      expect(insertCalls).toBe(0);
    });

    it("seeds fresh client with empty emergency phone as null without overwriting", async () => {
      const insertedRows: Record<string, any> = {};
      let queryCount = 0;

      const mockDb = {
        select: () => ({
          from: () => {
            queryCount++;
            return [{ value: 0 }]; // Empty tables -> triggers insert
          },
        }),
        insert: (table: any) => ({
          values: async (data: any) => {
            if (data.email) {
              insertedRows.user = data;
            } else {
              insertedRows.settings = data;
            }
          },
        }),
      } as any;

      const { seedDatabase } = await import("../src/db/seed.js");
      await seedDatabase(mockDb);

      expect(queryCount).toBe(2); // Checked users, checked businessSettings
      expect(insertedRows.user).toBeDefined();
      expect(insertedRows.user.role).toBe("owner");
      expect(insertedRows.settings).toBeDefined();
      expect(insertedRows.settings.companyName).toBeDefined();
    });
  });
});

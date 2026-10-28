import dotenv from "dotenv";
import { z } from "zod";

// Load environment variables from .env file
dotenv.config();

export const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().default(5000),
    API_PREFIX: z.string().default("/api/v1"),
    CLIENT_ORIGIN: z.string().default("http://localhost:5173"),

    // PostgreSQL
    POSTGRES_HOST: z.string().default("localhost"),
    POSTGRES_PORT: z.coerce.number().default(5432),
    POSTGRES_DB: z.string().default("roofing_leads"),
    POSTGRES_USER: z.string().default("roofing_user"),
    POSTGRES_PASSWORD: z.string().default("postgres_password"),
    DATABASE_URL: z.string().optional(),

    // Session & Security
    SESSION_SECRET: z
      .string()
      .min(16, "SESSION_SECRET must be at least 16 characters in dev")
      .default("development_session_secret_min_32_characters_long_12345"),
    SESSION_NAME: z.string().default("roofing_sid"),
    SESSION_MAX_AGE_HOURS: z.coerce.number().default(24),
    COOKIE_SECURE: z.coerce.boolean().default(false),

    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000), // 15 mins
    RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
    AUTH_RATE_LIMIT_MAX_ATTEMPTS: z.coerce.number().default(10),

    // Initial Seed User & Client Identity
    INITIAL_OWNER_EMAIL: z.string().email().default("owner@example-roofing.com"),
    INITIAL_OWNER_PASSWORD: z.string().min(8).default("TemporaryPassword123!"),
    INITIAL_OWNER_FULL_NAME: z.string().default("Business Owner"),

    // Client Operational Branding & Settings
    COMPANY_NAME: z.string().default("Apex Roofing Solutions"),
    COMPANY_PHONE: z.string().default("(555) 123-4567"),
    COMPANY_EMERGENCY_PHONE: z.string().default("(555) 999-HELP"),
    COMPANY_DISPATCH_EMAIL: z.string().email().optional(),
    COMPANY_ADDRESS: z.string().default("100 Commercial Pkwy, Suite 200, Metro Area"),
    COMPANY_LICENSE: z.string().default("ROOF-LIC-10928"),
    COMPANY_SERVICE_AREAS: z.string().default("Metro Area, North County, South County, East Suburbs, West Suburbs"),

    // n8n Webhook Integration
    N8N_INTERNAL_URL: z.string().url().default("http://localhost:5678"),
    N8N_LEAD_WEBHOOK_PATH: z.string().default("/webhook/roofing-lead-created"),
    N8N_WEBHOOK_SECRET: z.string().default("development_n8n_webhook_secret_key"),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === "production") {
      if (
        data.SESSION_SECRET === "development_session_secret_min_32_characters_long_12345" ||
        data.SESSION_SECRET.length < 32
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["SESSION_SECRET"],
          message: "In production, SESSION_SECRET must be explicitly provided and at least 32 characters long.",
        });
      }
      if (
        data.INITIAL_OWNER_PASSWORD === "TemporaryPassword123!" ||
        data.INITIAL_OWNER_PASSWORD.length < 12
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["INITIAL_OWNER_PASSWORD"],
          message: "In production, INITIAL_OWNER_PASSWORD must be explicitly provided and at least 12 characters long.",
        });
      }
      if (data.N8N_WEBHOOK_SECRET === "development_n8n_webhook_secret_key") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["N8N_WEBHOOK_SECRET"],
          message: "In production, N8N_WEBHOOK_SECRET must be explicitly set and cannot use the development default.",
        });
      }
      if (!data.COOKIE_SECURE) {
        data.COOKIE_SECURE = true;
      }
    }
  });

export function parseEnv(raw: Record<string, unknown> = process.env): z.infer<typeof envSchema> {
  const parsed = envSchema.parse(raw);
  if (!parsed.DATABASE_URL) {
    parsed.DATABASE_URL = `postgresql://${parsed.POSTGRES_USER}:${parsed.POSTGRES_PASSWORD}@${parsed.POSTGRES_HOST}:${parsed.POSTGRES_PORT}/${parsed.POSTGRES_DB}`;
  }
  return parsed;
}

export const env = parseEnv(process.env);
export type Env = z.infer<typeof envSchema>;

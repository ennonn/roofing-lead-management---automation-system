import { z } from "zod";

function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export const updateBusinessSettingsSchema = z
  .object({
    companyName: z
      .string()
      .trim()
      .min(2, "Company name must be at least 2 characters.")
      .max(200, "Company name cannot exceed 200 characters.")
      .optional(),
    phone: z
      .string()
      .trim()
      .min(7, "Phone number must contain at least 7 characters.")
      .max(50, "Phone number cannot exceed 50 characters.")
      .optional(),
    emergencyPhone: z
      .string()
      .trim()
      .max(50, "Emergency phone cannot exceed 50 characters.")
      .nullable()
      .optional(),
    dispatchEmail: z
      .string()
      .trim()
      .toLowerCase()
      .email("A valid dispatch email address is required.")
      .optional(),
    address: z
      .string()
      .trim()
      .max(500, "Address cannot exceed 500 characters.")
      .nullable()
      .optional(),
    serviceAreas: z
      .array(
        z
          .string()
          .trim()
          .min(1, "Service area name cannot be empty.")
          .max(100, "Service area name cannot exceed 100 characters.")
      )
      .max(50, "Cannot specify more than 50 service areas.")
      .optional(),
    businessHours: z
      .record(z.string().trim().max(100, "Hours description cannot exceed 100 characters."))
      .optional(),
    licenseNumber: z
      .string()
      .trim()
      .max(100, "License number cannot exceed 100 characters.")
      .nullable()
      .optional(),
    availabilityStatus: z
      .enum(["available", "temporarily_unavailable", "unavailable_indefinite"], {
        errorMap: () => ({
          message:
            "Availability status must be 'available', 'temporarily_unavailable', or 'unavailable_indefinite'.",
        }),
      })
      .optional(),
    noticeHeadline: z
      .string()
      .trim()
      .max(150, "Notice headline cannot exceed 150 characters.")
      .nullable()
      .optional(),
    noticeBody: z
      .string()
      .trim()
      .max(1000, "Notice body cannot exceed 1000 characters.")
      .nullable()
      .optional(),
    reopenAt: z
      .string()
      .nullable()
      .optional()
      .refine(
        (val) => {
          if (!val) return true;
          const parsed = Date.parse(val);
          return !isNaN(parsed);
        },
        { message: "Reopening time must be a valid ISO-8601 date/time string." }
      ),
    autoResume: z.boolean().optional(),
    acceptQuotesWhenUnavailable: z.boolean().optional(),
    timezone: z
      .string()
      .trim()
      .refine(isValidTimezone, {
        message: "Timezone must be a valid IANA timezone identifier (e.g., 'America/New_York').",
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    // 1. If autoResume is true, availabilityStatus must be temporarily_unavailable
    if (data.autoResume === true) {
      if (data.availabilityStatus === "unavailable_indefinite") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["autoResume"],
          message: "Indefinite closure cannot have auto-resume enabled.",
        });
      }
      if (data.availabilityStatus === "available") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["autoResume"],
          message: "Available state cannot have auto-resume enabled.",
        });
      }
      // ReopenAt must be specified
      if (!data.reopenAt || data.reopenAt.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["reopenAt"],
          message: "A scheduled reopening date/time is required when auto-resume is enabled.",
        });
      }
    }
  });

export type UpdateBusinessSettingsInput = z.infer<typeof updateBusinessSettingsSchema>;

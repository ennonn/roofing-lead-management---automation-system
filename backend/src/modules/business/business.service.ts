import { eq } from "drizzle-orm";
import { getDb, AppDatabase } from "../../db/index.js";
import { businessSettings } from "../../db/schema.js";
import { env } from "../../config/env.js";
import type {
  BusinessSettings,
  PublicBusinessInfo,
  AvailabilityStatus,
} from "@roofing/shared-types";
import type { UpdateBusinessSettingsInput } from "./business.schema.js";

export { PublicBusinessInfo };

/**
 * Retrieves public operational info and active availability status.
 * Evaluates lazy auto-reopen atomically if scheduled return time has arrived.
 */
export async function getPublicBusinessInfo(
  db: AppDatabase = getDb()
): Promise<PublicBusinessInfo> {
  const [settings] = await db.select().from(businessSettings).limit(1);

  if (!settings) {
    return {
      companyName: env.COMPANY_NAME,
      phone: env.COMPANY_PHONE,
      emergencyPhone:
        env.COMPANY_EMERGENCY_PHONE && env.COMPANY_EMERGENCY_PHONE.trim().length > 0
          ? env.COMPANY_EMERGENCY_PHONE.trim()
          : null,
      address: env.COMPANY_ADDRESS,
      serviceAreas: env.COMPANY_SERVICE_AREAS.split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      businessHours: {
        weekdays: "7:00 AM - 6:00 PM",
        saturday: "8:00 AM - 2:00 PM",
        sunday: "Emergency Storm Response Only",
      },
      licenseNumber: env.COMPANY_LICENSE,
      dispatchEmail: env.COMPANY_DISPATCH_EMAIL || env.INITIAL_OWNER_EMAIL,
      availability: {
        status: "available",
        noticeHeadline: null,
        noticeBody: null,
        reopenAt: null,
        autoResume: false,
        acceptQuotesWhenUnavailable: false,
        timezone: "America/New_York",
      },
    };
  }

  // Check and perform concurrency-safe lazy auto-reopen if return time has passed
  if (
    settings.availabilityStatus === "temporarily_unavailable" &&
    settings.autoResume === true &&
    settings.reopenAt &&
    new Date(settings.reopenAt).getTime() <= Date.now()
  ) {
    await db
      .update(businessSettings)
      .set({
        availabilityStatus: "available",
        autoResume: false,
        updatedAt: new Date(),
      })
      .where(eq(businessSettings.id, settings.id));

    settings.availabilityStatus = "available";
    settings.autoResume = false;
  }

  return {
    companyName: settings.companyName,
    phone: settings.phone,
    emergencyPhone: settings.emergencyPhone,
    address: settings.address,
    serviceAreas: (settings.serviceAreas as string[]) || [],
    businessHours: (settings.businessHours as Record<string, string>) || {},
    licenseNumber: settings.licenseNumber,
    dispatchEmail: settings.dispatchEmail,
    availability: {
      status: (settings.availabilityStatus as AvailabilityStatus) || "available",
      noticeHeadline: settings.noticeHeadline,
      noticeBody: settings.noticeBody,
      reopenAt: settings.reopenAt ? settings.reopenAt.toISOString() : null,
      autoResume: settings.autoResume ?? false,
      acceptQuotesWhenUnavailable: settings.acceptQuotesWhenUnavailable ?? false,
      timezone: settings.timezone || "America/New_York",
    },
  };
}

/**
 * Retrieves full persisted business settings for authenticated owner/admin dashboard.
 */
export async function getBusinessSettings(
  db: AppDatabase = getDb()
): Promise<BusinessSettings> {
  const [settings] = await db.select().from(businessSettings).limit(1);

  if (!settings) {
    const serviceAreas = env.COMPANY_SERVICE_AREAS.split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    return {
      id: "unseeded",
      companyName: env.COMPANY_NAME,
      phone: env.COMPANY_PHONE,
      emergencyPhone:
        env.COMPANY_EMERGENCY_PHONE && env.COMPANY_EMERGENCY_PHONE.trim().length > 0
          ? env.COMPANY_EMERGENCY_PHONE.trim()
          : null,
      dispatchEmail: env.COMPANY_DISPATCH_EMAIL || env.INITIAL_OWNER_EMAIL,
      address: env.COMPANY_ADDRESS,
      serviceAreas,
      businessHours: {
        weekdays: "7:00 AM - 6:00 PM",
        saturday: "8:00 AM - 2:00 PM",
        sunday: "Emergency Storm Response Only",
      },
      licenseNumber: env.COMPANY_LICENSE,
      availabilityStatus: "available",
      noticeHeadline: null,
      noticeBody: null,
      reopenAt: null,
      autoResume: false,
      acceptQuotesWhenUnavailable: false,
      timezone: "America/New_York",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  // Check lazy auto-reopen
  if (
    settings.availabilityStatus === "temporarily_unavailable" &&
    settings.autoResume === true &&
    settings.reopenAt &&
    new Date(settings.reopenAt).getTime() <= Date.now()
  ) {
    await db
      .update(businessSettings)
      .set({
        availabilityStatus: "available",
        autoResume: false,
        updatedAt: new Date(),
      })
      .where(eq(businessSettings.id, settings.id));

    settings.availabilityStatus = "available";
    settings.autoResume = false;
  }

  return {
    id: settings.id,
    companyName: settings.companyName,
    phone: settings.phone,
    emergencyPhone: settings.emergencyPhone,
    dispatchEmail: settings.dispatchEmail,
    address: settings.address,
    serviceAreas: (settings.serviceAreas as string[]) || [],
    businessHours: (settings.businessHours as Record<string, string>) || {},
    licenseNumber: settings.licenseNumber,
    availabilityStatus: (settings.availabilityStatus as AvailabilityStatus) || "available",
    noticeHeadline: settings.noticeHeadline,
    noticeBody: settings.noticeBody,
    reopenAt: settings.reopenAt ? settings.reopenAt.toISOString() : null,
    autoResume: settings.autoResume ?? false,
    acceptQuotesWhenUnavailable: settings.acceptQuotesWhenUnavailable ?? false,
    timezone: settings.timezone || "America/New_York",
    createdAt: settings.createdAt.toISOString(),
    updatedAt: settings.updatedAt.toISOString(),
  };
}

/**
 * Updates persisted business settings. Authenticated and CSRF-protected.
 */
export async function updateBusinessSettings(
  input: UpdateBusinessSettingsInput,
  db: AppDatabase = getDb()
): Promise<BusinessSettings> {
  const [existing] = await db.select().from(businessSettings).limit(1);

  const now = new Date();
  const updateData: Record<string, any> = { updatedAt: now };

  if (input.companyName !== undefined) updateData.companyName = input.companyName;
  if (input.phone !== undefined) updateData.phone = input.phone;
  if (input.emergencyPhone !== undefined) updateData.emergencyPhone = input.emergencyPhone;
  if (input.dispatchEmail !== undefined) updateData.dispatchEmail = input.dispatchEmail;
  if (input.address !== undefined) updateData.address = input.address;
  if (input.serviceAreas !== undefined) updateData.serviceAreas = input.serviceAreas;
  if (input.businessHours !== undefined) updateData.businessHours = input.businessHours;
  if (input.licenseNumber !== undefined) updateData.licenseNumber = input.licenseNumber;
  if (input.availabilityStatus !== undefined) updateData.availabilityStatus = input.availabilityStatus;
  if (input.noticeHeadline !== undefined) updateData.noticeHeadline = input.noticeHeadline;
  if (input.noticeBody !== undefined) updateData.noticeBody = input.noticeBody;
  if (input.reopenAt !== undefined) {
    updateData.reopenAt = input.reopenAt ? new Date(input.reopenAt) : null;
  }
  if (input.autoResume !== undefined) updateData.autoResume = input.autoResume;
  if (input.acceptQuotesWhenUnavailable !== undefined) {
    updateData.acceptQuotesWhenUnavailable = input.acceptQuotesWhenUnavailable;
  }
  if (input.timezone !== undefined) updateData.timezone = input.timezone;

  if (existing) {
    const [updated] = await db
      .update(businessSettings)
      .set(updateData)
      .where(eq(businessSettings.id, existing.id))
      .returning();

    return {
      id: updated.id,
      companyName: updated.companyName,
      phone: updated.phone,
      emergencyPhone: updated.emergencyPhone,
      dispatchEmail: updated.dispatchEmail,
      address: updated.address,
      serviceAreas: (updated.serviceAreas as string[]) || [],
      businessHours: (updated.businessHours as Record<string, string>) || {},
      licenseNumber: updated.licenseNumber,
      availabilityStatus: (updated.availabilityStatus as AvailabilityStatus) || "available",
      noticeHeadline: updated.noticeHeadline,
      noticeBody: updated.noticeBody,
      reopenAt: updated.reopenAt ? updated.reopenAt.toISOString() : null,
      autoResume: updated.autoResume ?? false,
      acceptQuotesWhenUnavailable: updated.acceptQuotesWhenUnavailable ?? false,
      timezone: updated.timezone || "America/New_York",
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  // Unseeded: Insert initial record with input values merged with env defaults
  const [created] = await db
    .insert(businessSettings)
    .values({
      companyName: input.companyName || env.COMPANY_NAME,
      phone: input.phone || env.COMPANY_PHONE,
      emergencyPhone: input.emergencyPhone !== undefined ? input.emergencyPhone : env.COMPANY_EMERGENCY_PHONE || null,
      dispatchEmail: input.dispatchEmail || env.COMPANY_DISPATCH_EMAIL || env.INITIAL_OWNER_EMAIL,
      address: input.address !== undefined ? input.address : env.COMPANY_ADDRESS,
      serviceAreas: input.serviceAreas || env.COMPANY_SERVICE_AREAS.split(",").map((s) => s.trim()).filter(Boolean),
      businessHours: input.businessHours || {
        weekdays: "7:00 AM - 6:00 PM",
        saturday: "8:00 AM - 2:00 PM",
        sunday: "Emergency Storm Response Only",
      },
      licenseNumber: input.licenseNumber !== undefined ? input.licenseNumber : env.COMPANY_LICENSE,
      availabilityStatus: input.availabilityStatus || "available",
      noticeHeadline: input.noticeHeadline || null,
      noticeBody: input.noticeBody || null,
      reopenAt: input.reopenAt ? new Date(input.reopenAt) : null,
      autoResume: input.autoResume ?? false,
      acceptQuotesWhenUnavailable: input.acceptQuotesWhenUnavailable ?? false,
      timezone: input.timezone || "America/New_York",
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return {
    id: created.id,
    companyName: created.companyName,
    phone: created.phone,
    emergencyPhone: created.emergencyPhone,
    dispatchEmail: created.dispatchEmail,
    address: created.address,
    serviceAreas: (created.serviceAreas as string[]) || [],
    businessHours: (created.businessHours as Record<string, string>) || {},
    licenseNumber: created.licenseNumber,
    availabilityStatus: (created.availabilityStatus as AvailabilityStatus) || "available",
    noticeHeadline: created.noticeHeadline,
    noticeBody: created.noticeBody,
    reopenAt: created.reopenAt ? created.reopenAt.toISOString() : null,
    autoResume: created.autoResume ?? false,
    acceptQuotesWhenUnavailable: created.acceptQuotesWhenUnavailable ?? false,
    timezone: created.timezone || "America/New_York",
    createdAt: created.createdAt.toISOString(),
    updatedAt: created.updatedAt.toISOString(),
  };
}

/**
 * Checks whether quote requests are currently allowed based on business availability status.
 * Handles lazy reopening transitions atomically.
 */
export async function checkQuoteIntakeAllowed(
  db: AppDatabase = getDb()
): Promise<{ allowed: boolean; reason?: string }> {
  const [settings] = await db.select().from(businessSettings).limit(1);

  if (!settings) {
    return { allowed: true };
  }

  // Check lazy auto-reopen
  if (
    settings.availabilityStatus === "temporarily_unavailable" &&
    settings.autoResume === true &&
    settings.reopenAt &&
    new Date(settings.reopenAt).getTime() <= Date.now()
  ) {
    await db
      .update(businessSettings)
      .set({
        availabilityStatus: "available",
        autoResume: false,
        updatedAt: new Date(),
      })
      .where(eq(businessSettings.id, settings.id));

    return { allowed: true };
  }

  if (
    settings.availabilityStatus !== "available" &&
    settings.acceptQuotesWhenUnavailable === false
  ) {
    const reason =
      settings.noticeBody ||
      "Quote requests are temporarily paused. Please contact our office by phone or check back later.";
    return { allowed: false, reason };
  }

  return { allowed: true };
}

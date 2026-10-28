import { getDb, AppDatabase } from "../../db/index.js";
import { businessSettings } from "../../db/schema.js";
import { env } from "../../config/env.js";

export interface PublicBusinessInfo {
  companyName: string;
  phone: string;
  emergencyPhone: string | null;
  dispatchEmail: string;
  address: string | null;
  serviceAreas: string[];
  businessHours: Record<string, string>;
  licenseNumber: string | null;
}

export async function getPublicBusinessInfo(
  db: AppDatabase = getDb()
): Promise<PublicBusinessInfo> {
  const [settings] = await db.select().from(businessSettings).limit(1);

  if (!settings) {
    return {
      companyName: env.COMPANY_NAME,
      phone: env.COMPANY_PHONE,
      emergencyPhone: env.COMPANY_EMERGENCY_PHONE && env.COMPANY_EMERGENCY_PHONE.trim().length > 0 ? env.COMPANY_EMERGENCY_PHONE.trim() : null,
      dispatchEmail: env.COMPANY_DISPATCH_EMAIL || env.INITIAL_OWNER_EMAIL,
      address: env.COMPANY_ADDRESS,
      serviceAreas: env.COMPANY_SERVICE_AREAS.split(",").map((s) => s.trim()).filter(Boolean),
      businessHours: {
        weekdays: "7:00 AM - 6:00 PM",
        saturday: "8:00 AM - 2:00 PM",
        sunday: "Emergency Calls Only",
      },
      licenseNumber: env.COMPANY_LICENSE,
    };
  }

  return {
    companyName: settings.companyName,
    phone: settings.phone,
    emergencyPhone: settings.emergencyPhone,
    dispatchEmail: settings.dispatchEmail,
    address: settings.address,
    serviceAreas: (settings.serviceAreas as string[]) || [],
    businessHours: (settings.businessHours as Record<string, string>) || {},
    licenseNumber: settings.licenseNumber,
  };
}

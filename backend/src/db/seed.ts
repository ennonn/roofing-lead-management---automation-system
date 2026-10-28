import bcrypt from "bcryptjs";
import { count } from "drizzle-orm";
import { getDb, closeDbConnection, AppDatabase } from "./index.js";
import { users, businessSettings } from "./schema.js";
import { env } from "../config/env.js";

export async function seedDatabase(db: AppDatabase = getDb()): Promise<void> {
  console.log("Checking database seed requirements...");

  // 1. Seed Initial Owner User if users table is empty
  const [userCount] = await db.select({ value: count() }).from(users);
  if (userCount.value === 0) {
    console.log(`No users found. Seeding initial owner: ${env.INITIAL_OWNER_EMAIL}`);
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(env.INITIAL_OWNER_PASSWORD, saltRounds);

    await db.insert(users).values({
      email: env.INITIAL_OWNER_EMAIL.toLowerCase().trim(),
      passwordHash,
      fullName: env.INITIAL_OWNER_FULL_NAME,
      role: "owner",
      isActive: true,
    });
    console.log("Initial owner account provisioned successfully.");
  } else {
    console.log(`Users table already contains ${userCount.value} user(s). Skipping user seed.`);
  }

  // 2. Seed Initial Business Settings if businessSettings table is empty
  const [settingsCount] = await db.select({ value: count() }).from(businessSettings);
  if (settingsCount.value === 0) {
    console.log(`No business settings found. Seeding operational settings for: ${env.COMPANY_NAME}`);
    const serviceAreas = env.COMPANY_SERVICE_AREAS.split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    await db.insert(businessSettings).values({
      companyName: env.COMPANY_NAME,
      phone: env.COMPANY_PHONE,
      emergencyPhone: env.COMPANY_EMERGENCY_PHONE && env.COMPANY_EMERGENCY_PHONE.trim().length > 0 ? env.COMPANY_EMERGENCY_PHONE.trim() : null,
      dispatchEmail: env.COMPANY_DISPATCH_EMAIL || env.INITIAL_OWNER_EMAIL,
      address: env.COMPANY_ADDRESS,
      serviceAreas,
      businessHours: {
        weekdays: "7:00 AM - 6:00 PM",
        saturday: "8:00 AM - 2:00 PM",
        sunday: "Emergency Storm Response Only",
      },
      licenseNumber: env.COMPANY_LICENSE,
    });
    console.log("Client business operational settings created successfully.");
  } else {
    console.log("Business settings already configured. Skipping settings seed.");
  }

  console.log("Database seeding completed.");
}

// Standalone execution check
if (process.argv[1]?.endsWith("seed.ts") || process.argv[1]?.endsWith("seed.js")) {
  seedDatabase()
    .then(async () => {
      await closeDbConnection();
      process.exit(0);
    })
    .catch(async (error) => {
      console.error("Seeding failed:", error);
      await closeDbConnection();
      process.exit(1);
    });
}

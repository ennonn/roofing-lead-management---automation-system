import { migrate } from "drizzle-orm/node-postgres/migrator";
import { getDb, closeDbConnection } from "./index.js";

export async function runMigrations(): Promise<void> {
  console.log("Running pending PostgreSQL migrations...");
  const db = getDb();
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations applied successfully.");
}

// Standalone execution check
if (process.argv[1]?.endsWith("migrate.ts") || process.argv[1]?.endsWith("migrate.js")) {
  runMigrations()
    .then(async () => {
      await closeDbConnection();
      process.exit(0);
    })
    .catch(async (error) => {
      console.error("Migration failed:", error);
      await closeDbConnection();
      process.exit(1);
    });
}

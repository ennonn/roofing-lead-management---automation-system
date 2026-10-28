import pg from "pg";
import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema.js";
import { env } from "../config/env.js";

const { Pool } = pg;

export type AppDatabase = NodePgDatabase<typeof schema>;

let pool: pg.Pool | null = null;
let dbInstance: AppDatabase | null = null;

export function getPool(): pg.Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on("error", (err) => {
      console.error("Unexpected error on idle PostgreSQL client", err);
    });
  }
  return pool;
}

export function getDb(): AppDatabase {
  if (!dbInstance) {
    const currentPool = getPool();
    dbInstance = drizzle(currentPool, { schema });
  }
  return dbInstance;
}

/**
 * Allows overriding database instance (useful for automated testing with pg-mem or test pools)
 */
export function setDb(customDb: AppDatabase | null): void {
  dbInstance = customDb;
}

export async function checkDbHealth(): Promise<boolean> {
  try {
    const activePool = getPool();
    const result = await activePool.query("SELECT 1 AS health");
    return result.rows[0]?.health === 1;
  } catch (error) {
    console.error("Database health check failed:", error);
    return false;
  }
}

export async function closeDbConnection(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    dbInstance = null;
  }
}

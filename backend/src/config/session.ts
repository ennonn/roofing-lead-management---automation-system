import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { RequestHandler } from "express";
import { env } from "./env.js";
import { getPool } from "../db/index.js";
import { AuthUser } from "@roofing/shared-types";

// Extend express-session types to include authenticated user session
declare module "express-session" {
  interface SessionData {
    userId?: string;
    user?: AuthUser;
    csrfToken?: string;
  }
}

const PgSession = connectPgSimple(session);

export interface SessionOptions {
  store?: session.Store;
}

export function createSessionMiddleware(options?: SessionOptions): RequestHandler {
  let sessionStore: session.Store;

  if (env.NODE_ENV === "production") {
    if (
      options?.store instanceof session.MemoryStore ||
      (options?.store && options.store.constructor.name === "MemoryStore")
    ) {
      throw new Error(
        "FATAL: MemoryStore cannot be used in production. A persistent PostgreSQL session store is required."
      );
    }
    sessionStore =
      options?.store ||
      new PgSession({
        pool: getPool(),
        tableName: "sessions",
        createTableIfMissing: false, // Table managed via Drizzle migrations
        pruneSessionInterval: 60 * 15, // Prune expired sessions every 15 minutes
      });
  } else if (options?.store) {
    sessionStore = options.store;
  } else if (env.NODE_ENV === "test") {
    // In-memory store for hermetic testing without live database connection
    sessionStore = new session.MemoryStore();
  } else {
    // Persistent PostgreSQL session store via connect-pg-simple
    sessionStore = new PgSession({
      pool: getPool(),
      tableName: "sessions",
      createTableIfMissing: false, // Table managed via Drizzle migrations
      pruneSessionInterval: 60 * 15, // Prune expired sessions every 15 minutes
    });
  }

  return session({
    store: sessionStore,
    name: env.SESSION_NAME,
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true, // Refresh cookie expiration on user activity
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: env.COOKIE_SECURE || env.NODE_ENV === "production",
      maxAge: env.SESSION_MAX_AGE_HOURS * 60 * 60 * 1000,
      path: "/",
    },
  });
}

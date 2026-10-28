import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { closeDbConnection } from "./db/index.js";
import { startOutboxWorker, stopOutboxWorker } from "./modules/outbox/outbox.worker.js";

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`[Roofing Backend] Server running on port ${env.PORT} in ${env.NODE_ENV} mode.`);
  console.log(`[Roofing Backend] API prefix: ${env.API_PREFIX}`);

  // Start background outbox polling
  startOutboxWorker(5000);
});

// Graceful Shutdown
async function handleShutdown(signal: string) {
  console.log(`\nReceived ${signal}. Gracefully shutting down...`);
  stopOutboxWorker();

  server.close(async () => {
    console.log("HTTP server closed.");
    await closeDbConnection();
    console.log("Database connection pool closed. Process terminated.");
    process.exit(0);
  });

  // Force exit if shutdown hangs beyond 10s
  setTimeout(() => {
    console.error("Graceful shutdown timeout exceeded. Forcing exit.");
    process.exit(1);
  }, 10000);
}

process.on("SIGTERM", () => handleShutdown("SIGTERM"));
process.on("SIGINT", () => handleShutdown("SIGINT"));

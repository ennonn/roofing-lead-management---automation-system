import fs from "node:fs";
import { spawnSync } from "node:child_process";

if (fs.existsSync("./dist/db/migrate.js")) {
  await import("../dist/db/migrate.js");
} else {
  const result = spawnSync("npx", ["tsx", "src/db/migrate.ts"], { stdio: "inherit" });
  process.exit(result.status ?? 0);
}

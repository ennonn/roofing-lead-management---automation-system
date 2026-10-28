import fs from "node:fs";
import { spawnSync } from "node:child_process";

if (fs.existsSync("./dist/db/seed.js")) {
  await import("../dist/db/seed.js");
} else {
  const result = spawnSync("npx", ["tsx", "src/db/seed.ts"], { stdio: "inherit" });
  process.exit(result.status ?? 0);
}

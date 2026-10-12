// Loads .env.local files for scripts: app first, then the NGIG workspace root, then its parent
// (~/code), without overriding variables that are already set.

import { existsSync } from "node:fs";
import { resolve } from "node:path";

for (const file of [".env.local", "../../.env.local", "../../../.env.local"].map((p) => resolve(p))) {
  if (existsSync(file)) process.loadEnvFile(file);
}

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const sourcePath = resolve("backend2/src/realtime/data-update-rules.ts");
const source = readFileSync(sourcePath, "utf8");
const requiredEntities = ["property", "unit", "lease", "payment"];
const failures = [];

for (const entity of requiredEntities) {
  const match = source.match(new RegExp(`\\b${entity}:\\s*{[\\s\\S]*?\\n\\s*},`, "m"));
  if (!match) {
    failures.push(`${entity}: missing mapping`);
    continue;
  }

  const block = match[0];
  if (!/permissions:\s*\[[\s\S]*?["'][^"']+["']/.test(block)) {
    failures.push(`${entity}: missing non-empty permissions`);
  }
  if (!/tags:\s*\[[\s\S]*?["'][^"']+["']/.test(block)) {
    failures.push(`${entity}: missing non-empty tags`);
  }
}

if (failures.length > 0) {
  console.error("Data update rules check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Data update rules check passed.");

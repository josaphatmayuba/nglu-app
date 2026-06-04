// Incrémente la version du monorepo dans le fichier racine `VERSION`.
//
//   node scripts/bump-version.mjs patch   # 3.2.0 -> 3.2.1  (correctifs)
//   node scripts/bump-version.mjs minor   # 3.2.1 -> 3.3.0  (fonctionnalités)
//   node scripts/bump-version.mjs major   # 3.3.0 -> 4.0.0  (rupture)
//
// N'écrit QUE le fichier VERSION (toutes les apps le lisent via scripts/app-version.mjs).
// À committer ensuite ; le +<commit> est ajouté automatiquement au build.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const part = (process.argv[2] || "patch").toLowerCase();
if (!["major", "minor", "patch"].includes(part)) {
  console.error(`Usage: node scripts/bump-version.mjs <major|minor|patch> (reçu: "${part}")`);
  process.exit(1);
}

const versionFile = resolve(dirname(fileURLToPath(import.meta.url)), "..", "VERSION");
const current = readFileSync(versionFile, "utf8").trim().split("+")[0];
let [major, minor, patch] = current.split(".").map((n) => parseInt(n, 10) || 0);

if (part === "major") { major += 1; minor = 0; patch = 0; }
else if (part === "minor") { minor += 1; patch = 0; }
else { patch += 1; }

const next = `${major}.${minor}.${patch}`;
writeFileSync(versionFile, `${next}\n`, "utf8");
console.log(`VERSION: ${current} -> ${next} (${part})`);
console.log("Pensez à mettre a jour CHANGELOG.md puis: git add VERSION CHANGELOG.md && git commit");

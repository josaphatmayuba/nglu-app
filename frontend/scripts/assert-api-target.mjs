import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const mode = process.argv[2];

const targets = {
  development: {
    required: "https://dev.ongdngolu.org/api",
    forbidden: "https://ongdngolu.org/api",
  },
  "development-local": {
    required: "http://localhost:8001",
    forbidden: "https://ongdngolu.org/api",
  },
  production: {
    // Multi-prod : la cible prod n'est plus forcément ongdngolu. Si VITE_APP_API
    // est fourni au build (ex: Avelomi → https://avelomi.com/api), on valide CETTE
    // valeur ; sinon on garde le défaut ongdngolu (comportement historique).
    required: process.env.VITE_APP_API || "https://ongdngolu.org/api",
    forbidden: "https://dev.ongdngolu.org/api",
  },
};

if (!targets[mode]) {
  console.error("Usage: node scripts/assert-api-target.mjs <development|development-local|production>");
  process.exit(2);
}

const distDir = join(process.cwd(), "dist");

if (!existsSync(distDir)) {
  console.error("dist/ not found. Build the frontend before checking API target.");
  process.exit(2);
}

const files = [];
const visit = (dir) => {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      visit(path);
      continue;
    }
    if (/\.(html|js|css)$/.test(entry)) {
      files.push(path);
    }
  }
};

visit(distDir);

const bundle = files.map((path) => readFileSync(path, "utf8")).join("\n");
const { required, forbidden } = targets[mode];

if (!bundle.includes(required)) {
  console.error(`Expected ${required} in frontend build for ${mode}.`);
  process.exit(1);
}

if (bundle.includes(forbidden)) {
  console.error(`Forbidden ${forbidden} found in frontend build for ${mode}.`);
  process.exit(1);
}

console.log(`API target OK for ${mode}: ${required}`);

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { relative, resolve } from "node:path";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));

const checks = [
  {
    file: "PRODUCTION_ROUTING.md",
    patterns: [
      "https://ongdngolu.org/",
      "https://ongdngolu.org/crm",
      "nginx/nginx.frontend.conf",
      "docker-compose.prod.yml",
      "DEPLOY.md",
      "marketing-site/README.md",
    ],
  },
  {
    file: "DEPLOY.md",
    patterns: [
      "https://ongdngolu.org/",
      "https://ongdngolu.org/crm",
      "Do not move the CRM back to the production domain root",
      "DEPLOYMENT_SMOKE_CHECKLIST.md",
    ],
  },
  {
    file: "nginx/nginx.frontend.conf",
    patterns: [
      "Routing contract",
      "https://ongdngolu.org/",
      "https://ongdngolu.org/crm",
      "PRODUCTION_ROUTING.md",
      "marketing-site/README.md",
    ],
  },
  {
    file: "docker-compose.prod.yml",
    patterns: [
      "Production routing contract",
      "marketing lives at /",
      "CRM entrypoint is /crm",
      "PRODUCTION_ROUTING.md",
    ],
  },
  {
    file: "marketing-site/README.md",
    patterns: [
      "https://ongdngolu.org/",
      "https://ongdngolu.org/crm",
      "Do not move the CRM back to `/`",
      "nginx/nginx.frontend.conf",
      "docker-compose.prod.yml",
      "DEPLOY.md",
      "PRODUCTION_ROUTING.md",
    ],
  },
];

const failures = [];

for (const check of checks) {
  const path = resolve(root, check.file);
  const content = readFileSync(path, "utf8");

  for (const pattern of check.patterns) {
    if (!content.includes(pattern)) {
      failures.push(`${relative(root, path)} missing: ${pattern}`);
    }
  }
}

if (failures.length) {
  console.error("Routing contract check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Routing contract check passed.");

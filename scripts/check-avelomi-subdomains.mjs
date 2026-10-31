import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const read = (f) => readFileSync(resolve(root, f), "utf8");
const cfg = JSON.parse(read("scripts/ci/avelomi-domains.json"));
const errors = [];
const fail = (m) => errors.push(m);

const nginx = read("nginx/nginx.avelomi.conf");
const dockerfile = read("frontend/Dockerfile.prod");
const compose = read("docker-compose.prod.yml");
const deployProd = read(".github/workflows/deploy-prod.yml");

const serverNames = new Set();
for (const m of nginx.matchAll(/server_name\s+([^;]+);/g))
  for (const h of m[1].trim().split(/\s+/)) serverNames.add(h);

// 1. package.json avec build:avelomi <-> apps
const withBuild = readdirSync(root, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(resolve(root, d.name, "package.json")))
  .filter((d) => JSON.parse(read(`${d.name}/package.json`)).scripts?.["build:avelomi"])
  .map((d) => d.name);
const declared = cfg.apps.map((a) => a.dir);
for (const d of withBuild) if (!declared.includes(d)) fail(`${d}/package.json a build:avelomi mais absent de avelomi-domains.json`);
for (const d of declared) if (!withBuild.includes(d)) fail(`${d} declare dans avelomi-domains.json sans script build:avelomi`);

// 2. par app
for (const { dir, sub } of cfg.apps) {
  for (const host of [`${sub}.avelomi.com`, `${sub}.dev.avelomi.com`]) {
    if (!serverNames.has(host)) fail(`nginx/nginx.avelomi.conf: server_name ${host}; manquant`);
  }
  if (!dockerfile.includes(`COPY ${dir}/dist-avelomi/`)) fail(`frontend/Dockerfile.prod: COPY ${dir}/dist-avelomi/ manquant`);
  if (!compose.includes(`${dir}/dist-avelomi:`)) fail(`docker-compose.prod.yml: ${dir}/dist-avelomi: manquant`);
  if (!deployProd.split(" ").join("").includes(`"app":"${dir}"`)) fail(`.github/workflows/deploy-prod.yml: ${dir} absent de la matrice statique`);
}
for (const { sub, to } of cfg.aliases) {
  if (!cfg.apps.some((a) => a.sub === to)) fail(`alias ${sub} -> ${to}: cible inconnue`);
  if (!nginx.includes(`server_name ${sub}.avelomi.com;`)) fail(`nginx: alias ${sub}.avelomi.com manquant`);
}

// 3. couverture certificats
const covered = new Set(Object.values(cfg.certs).flat());
const hosts = new Set();
for (const m of nginx.matchAll(/server_name\s+([^;]+);/g))
  for (const h of m[1].trim().split(/\s+/)) if (h.endsWith("avelomi.com")) hosts.add(h);
for (const h of hosts) if (!covered.has(h)) fail(`nginx: ${h} non couvert par un certificat declare (certs)`);

if (errors.length) {
  console.error("Avelomi subdomains contract FAILED:");
  for (const e of errors) console.error(` - ${e}`);
  process.exit(1);
}
console.log(`Avelomi subdomains contract OK (${declared.length} apps, ${hosts.size} hosts)`);

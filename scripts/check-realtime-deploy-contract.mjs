import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { relative, resolve } from "node:path";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));

function read(path) {
  return readFileSync(resolve(root, path), "utf8");
}

const files = {
  localCompose: read("docker-compose.yml"),
  devCompose: read("docker-compose.dev.yml"),
  prodCompose: read("docker-compose.prod.yml"),
  nginx: read("nginx/nginx.frontend.conf"),
  realtimeClient: read("frontend/src/realtime/realtimeClient.js"),
  permissionsContract: read("REALTIME_PERMISSIONS_CONTRACT.md"),
  sharedDataContract: read("REALTIME_SHARED_DATA_CONTRACT.md"),
  routingContract: read("PRODUCTION_ROUTING.md"),
};

const checks = [
  ["docker-compose.yml", files.localCompose, "redis:"],
  ["docker-compose.yml", files.localCompose, "image: redis:7-alpine"],
  ["docker-compose.yml", files.localCompose, "REDIS_HOST: ${REDIS_HOST:-redis}"],
  ["docker-compose.yml", files.localCompose, "REDIS_CHANNEL_DATA_UPDATES: ${REDIS_CHANNEL_DATA_UPDATES:-data-updates}"],
  ["docker-compose.yml", files.localCompose, "- redis"],

  ["docker-compose.dev.yml", files.devCompose, "container_name: nglu_dev_redis"],
  ["docker-compose.dev.yml", files.devCompose, "REDIS_ENABLED: ${REDIS_ENABLED:-true}"],
  ["docker-compose.dev.yml", files.devCompose, "REDIS_HOST: ${REDIS_HOST:-redis}"],
  ["docker-compose.dev.yml", files.devCompose, "REDIS_CHANNEL_DATA_UPDATES: ${REDIS_CHANNEL_DATA_UPDATES:-data-updates}"],
  ["docker-compose.dev.yml", files.devCompose, "condition: service_healthy"],

  ["docker-compose.prod.yml", files.prodCompose, "container_name: nglu_prod_redis"],
  ["docker-compose.prod.yml", files.prodCompose, "REDIS_ENABLED: ${REDIS_ENABLED:-true}"],
  ["docker-compose.prod.yml", files.prodCompose, "REDIS_HOST: ${REDIS_HOST:-redis}"],
  ["docker-compose.prod.yml", files.prodCompose, "REDIS_CHANNEL_DATA_UPDATES: ${REDIS_CHANNEL_DATA_UPDATES:-data-updates}"],
  ["docker-compose.prod.yml", files.prodCompose, "condition: service_healthy"],

  ["nginx/nginx.frontend.conf", files.nginx, "set $backend http://nglu_prod_middleware:3001;"],
  ["nginx/nginx.frontend.conf", files.nginx, "set $backend http://nglu_dev_middleware:3001;"],
  ["nginx/nginx.frontend.conf", files.nginx, "location /api/events/"],
  ["nginx/nginx.frontend.conf", files.nginx, "rewrite ^/api/(.*) /$1 break;"],
  ["nginx/nginx.frontend.conf", files.nginx, "proxy_buffering off;"],
  ["nginx/nginx.frontend.conf", files.nginx, "proxy_cache off;"],
  ["nginx/nginx.frontend.conf", files.nginx, "proxy_read_timeout 1h;"],
  ["nginx/nginx.frontend.conf", files.nginx, "location = /crm"],
  ["nginx/nginx.frontend.conf", files.nginx, "root /usr/share/nginx/html-marketing-prod;"],

  ["frontend/src/realtime/realtimeClient.js", files.realtimeClient, 'const SSE_PATH = "/api/events/me";'],
  ["REALTIME_PERMISSIONS_CONTRACT.md", files.permissionsContract, "Nginx routes SSE through `/api/events/`"],
  ["REALTIME_SHARED_DATA_CONTRACT.md", files.sharedDataContract, "Redis channel:"],
  ["REALTIME_SHARED_DATA_CONTRACT.md", files.sharedDataContract, "data-updates"],
  ["PRODUCTION_ROUTING.md", files.routingContract, "https://ongdngolu.org/"],
  ["PRODUCTION_ROUTING.md", files.routingContract, "https://ongdngolu.org/crm"],
  ["PRODUCTION_ROUTING.md", files.routingContract, "https://ongdngolu.org/api/*"],
];

const failures = checks
  .filter(([, content, pattern]) => !content.includes(pattern))
  .map(([file, , pattern]) => `${relative(root, resolve(root, file))} missing: ${pattern}`);

const sseBlocks = [...files.nginx.matchAll(/location \/api\/events\/ \{[\s\S]*?\n    \}/g)];
if (sseBlocks.length !== 2) {
  failures.push(`nginx/nginx.frontend.conf expected 2 /api/events/ blocks, found ${sseBlocks.length}`);
}

for (const [index, block] of sseBlocks.entries()) {
  for (const pattern of ["proxy_http_version 1.1;", "proxy_set_header Connection \"\";", "proxy_buffering off;", "proxy_read_timeout 1h;"]) {
    if (!block[0].includes(pattern)) {
      failures.push(`nginx/nginx.frontend.conf /api/events/ block ${index + 1} missing: ${pattern}`);
    }
  }
}

if (failures.length > 0) {
  console.error("Realtime deploy contract check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Realtime deploy contract check passed.");

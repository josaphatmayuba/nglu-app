import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const files = {
  sse: readFileSync(resolve("backend2/src/realtime/sse.controller.ts"), "utf8"),
  permissionsHandler: readFileSync(resolve("frontend/src/realtime/permissionsUpdateHandlers.js"), "utf8"),
  realtimeClient: readFileSync(resolve("frontend/src/realtime/realtimeClient.js"), "utf8"),
  adminLayout: readFileSync(resolve("frontend/src/layouts/AdminLayout.jsx"), "utf8"),
  permissionsPublisher: readFileSync(resolve("backend2/src/realtime/realtime-permissions-publisher.service.ts"), "utf8"),
  dataPublisher: readFileSync(resolve("backend2/src/realtime/realtime-data-publisher.service.ts"), "utf8"),
};

const requirements = [
  ["sse", "activeClients"],
  ["sse", "SSE client connected"],
  ["sse", "SSE client disconnected"],
  ["sse", "roleId"],
  ["sse", "destroyed$.complete()"],
  ["permissionsHandler", "loadPermissionById(nextRoleId)"],
  ["permissionsHandler", 'localStorage.setItem("roleId", String(nextRoleId))'],
  ["permissionsHandler", "data?.permissions"],
  ["permissionsHandler", "lastHandledVersion"],
  ["realtimeClient", 'new EventSource(`${SSE_PATH}?token=${encodeURIComponent(t)}`)'],
  ["realtimeClient", "source?.close()"],
  ["adminLayout", 'onRealtimeEvent("permissions.updated"'],
  ["adminLayout", "PERMISSIONS_POLL_INTERVAL_MS = 60_000"],
  ["permissionsPublisher", "Redis publish failed for permissions.updated"],
  ["dataPublisher", "Redis publish failed for data.updated"],
];

const failures = requirements
  .filter(([file, pattern]) => !files[file].includes(pattern))
  .map(([file, pattern]) => `${file} missing: ${pattern}`);

if (failures.length > 0) {
  console.error("Realtime observability check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Realtime observability check passed.");

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const files = {
  guard: readFileSync(resolve("backend2/src/auth/guards/jwt-auth.guard.ts"), "utf8"),
  authService: readFileSync(resolve("backend2/src/auth/auth.service.ts"), "utf8"),
  index: readFileSync(resolve("frontend/src/index.jsx"), "utf8"),
  permissionsHandler: readFileSync(resolve("frontend/src/realtime/permissionsUpdateHandlers.js"), "utf8"),
};

const requirements = [
  ["guard", "assertCurrentAuthContext"],
  ["guard", "users.roleId"],
  ["guard", "users.isLogin"],
  ["guard", "users.status"],
  ["guard", "AUTH_CONTEXT_STALE"],
  ["authService", "return { token: accessToken, roleId: role?.id, role: role?.name ?? null }"],
  ["index", 'localStorage.setItem("roleId", data.roleId)'],
  ["permissionsHandler", 'event?.reason === "user-role-updated"'],
  ["permissionsHandler", 'localStorage.setItem("roleId", String(nextRoleId))'],
  ["permissionsHandler", "loadPermissionById(nextRoleId)"],
];

const failures = requirements
  .filter(([file, pattern]) => !files[file].includes(pattern))
  .map(([file, pattern]) => `${file} missing: ${pattern}`);

if (failures.length > 0) {
  console.error("Stale auth context check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Stale auth context check passed.");

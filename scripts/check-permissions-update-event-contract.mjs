import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const eventSource = readFileSync(resolve("backend2/src/realtime/permissions-update-event.ts"), "utf8");
const docSource = readFileSync(resolve("REALTIME_PERMISSIONS_CONTRACT.md"), "utf8");

const eventRequirements = [
  'PERMISSIONS_UPDATE_CHANNEL = "permissions-updates"',
  'PERMISSIONS_UPDATED_EVENT_TYPE = "permissions.updated"',
  "export type PermissionsUpdatedEvent",
  "roleId: number",
  "userIds: number[]",
  "version: number",
  "reason: PermissionsUpdateReason",
  "buildPermissionsUpdatedEvent",
  "validatePermissionsUpdatedEvent",
];

const docRequirements = [
  "`users`",
  "`roles`",
  "`permissions`",
  "`rolePermissions`",
  "loadPermissionById(roleId)",
  "GET /role-permission/permission?roleId=...",
  "Do not send the full permission list",
];

const failures = [
  ...eventRequirements
    .filter((pattern) => !eventSource.includes(pattern))
    .map((pattern) => `event missing: ${pattern}`),
  ...docRequirements
    .filter((pattern) => !docSource.includes(pattern))
    .map((pattern) => `doc missing: ${pattern}`),
];

if (failures.length > 0) {
  console.error("Permissions update event contract check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Permissions update event contract check passed.");

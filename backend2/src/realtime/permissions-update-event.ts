export const PERMISSIONS_UPDATE_CHANNEL = "permissions-updates";
export const PERMISSIONS_UPDATED_EVENT_TYPE = "permissions.updated";

export type PermissionsUpdateReason =
  | "role-permission-updated"
  | "role-updated"
  | "user-role-updated"
  | "role-deleted"
  | "permission-deleted";

export type PermissionsUpdatedEvent = {
  type: typeof PERMISSIONS_UPDATED_EVENT_TYPE;
  roleId: number;
  userIds: number[];
  version: number;
  reason: PermissionsUpdateReason;
  actorUserId?: number | null;
};

export type BuildPermissionsUpdatedEventInput = {
  roleId: number;
  userIds?: number[];
  version?: number;
  reason?: PermissionsUpdateReason;
  actorUserId?: number | null;
};

export function buildPermissionsUpdatedEvent(
  input: BuildPermissionsUpdatedEventInput,
): PermissionsUpdatedEvent {
  return {
    type: PERMISSIONS_UPDATED_EVENT_TYPE,
    roleId: input.roleId,
    userIds: dedupeNumbers(input.userIds ?? []),
    version: input.version ?? Date.now(),
    reason: input.reason ?? "role-permission-updated",
    actorUserId: input.actorUserId ?? null,
  };
}

export function validatePermissionsUpdatedEvent(event: PermissionsUpdatedEvent): string[] {
  const failures: string[] = [];

  if (event.type !== PERMISSIONS_UPDATED_EVENT_TYPE) failures.push("type must be permissions.updated");
  if (!Number.isInteger(event.roleId) || event.roleId <= 0) failures.push("roleId must be a positive integer");
  if (!Array.isArray(event.userIds)) failures.push("userIds must be an array");
  if (!Number.isFinite(event.version) || event.version <= 0) failures.push("version must be a positive timestamp");
  if (!event.reason) failures.push("reason is required");

  return failures;
}

function dedupeNumbers(values: number[]) {
  return Array.from(new Set(values.filter((value) => Number.isInteger(value) && value > 0)));
}

import type { DataUpdateScope } from "./data-update-event";

/**
 * Scope types for realtime events.
 *
 * global        — visible to anyone with the required permission
 * per_property  — restricted to users authorized on the specific property
 *                 (fine-grained check: add when property-user assignment table exists)
 * per_account   — restricted to users authorized on the specific account/caisse
 *                 (fine-grained check: add when account-user assignment table exists)
 * per_department — restricted to users in the relevant department (HR module)
 *                 (fine-grained check: add when department-user assignment table exists)
 *
 * V1: all scope types fall back to permission-based filtering only.
 * Upgrade each type to fine-grained once the corresponding assignment table is in place.
 */
export type RealtimeScopeType = "global" | "per_property" | "per_account" | "per_department";

export type UserScopeContext = {
  userId: number;
  roleId: number;
  permissions: Set<string>;
};

/**
 * Returns true if the given scope allows the user to receive a realtime event.
 *
 * V1 strategy: check required permissions only (role-based).
 * Each scope type documents where to add the fine-grained check once
 * the relevant assignment table is available.
 */
export function scopeAllowsUser(
  scope: DataUpdateScope,
  requiredPermissions: string[],
  user: UserScopeContext,
): boolean {
  const hasPermission = requiredPermissions.some((p) => user.permissions.has(p));
  if (!hasPermission) return false;

  // Scope type is inferred from the most specific field present.
  // V1: permission check above is sufficient for all types.
  // Future: uncomment each block when the matching assignment table is ready.

  if (scope.propertyId != null) {
    // per_property scope
    // TODO (fine-grained): check that user is assigned to scope.propertyId
    // via a future `propertyUsers` or `userPropertyAccess` table.
    return true;
  }

  // per_account (caisse): scope field not yet in DataUpdateScope.
  // TODO: add `caisseId` to DataUpdateScope and check user-caisse assignment here.

  // per_department (RH): scope field not yet in DataUpdateScope.
  // TODO: add `departmentId` to DataUpdateScope and check user-department membership here.

  // global scope — permission check is sufficient
  return true;
}

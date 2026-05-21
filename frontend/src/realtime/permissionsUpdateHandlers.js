/**
 * Handles permissions.updated SSE events.
 * When the server signals that a role's permissions changed, dispatches a reload
 * if the event targets the current user's role.
 */

import { loadPermissionById } from "../redux/rtk/features/auth/authSlice";

let lastHandledVersion = 0;

/**
 * Returns a handler for "permissions.updated" SSE events.
 * @param {Function} dispatch  - Redux dispatch
 * @param {Function} navigate  - react-router navigate function
 * @param {Function} toast     - toast notification function (optional)
 */
export function createPermissionsUpdateHandler(dispatch, navigate, toast) {
  return async function handlePermissionsUpdated(event) {
    const currentRoleId = Number(localStorage.getItem("roleId"));
    if (!currentRoleId) return;

    const eventRoleId = Number(event?.roleId);
    const userIds = Array.isArray(event?.userIds) ? event.userIds : [];
    const currentUserId = Number(localStorage.getItem("id"));

    const isForThisUser =
      eventRoleId === currentRoleId ||
      (currentUserId > 0 && userIds.includes(currentUserId));

    if (!isForThisUser) return;

    const nextRoleId =
      event?.reason === "user-role-updated" &&
      currentUserId > 0 &&
      userIds.includes(currentUserId) &&
      eventRoleId > 0
        ? eventRoleId
        : currentRoleId;

    if (nextRoleId !== currentRoleId) {
      localStorage.setItem("roleId", String(nextRoleId));
    }

    // Deduplicate rapid bursts — skip if version is older than last handled
    const version = Number(event?.version ?? 0);
    if (version > 0 && version <= lastHandledVersion) return;
    lastHandledVersion = version;

    // Reload permissions from the API
    const result = await dispatch(loadPermissionById(nextRoleId));
    const newPermissions = result?.payload?.data?.permissions ?? null;

    // Notify the user
    if (toast) {
      toast("Vos permissions ont été mises à jour.", { duration: 3000 });
    }

    // If the current page requires a permission that was just removed, redirect
    if (newPermissions && navigate) {
      const path = window.location.pathname;
      // Only redirect if we're on a sensitive admin page that's no longer accessible
      // We use a conservative check: if the permission list shrank and we're
      // somewhere other than dashboard/login, reload to let PermissionChecker handle it
      if (path.startsWith("/admin/") && !path.startsWith("/admin/dashboard")) {
        // Let React re-render — UserPrivateComponent / PermissionChecker will
        // hide forbidden sections automatically via Redux. No hard redirect needed
        // unless the route itself needs a specific permission (handled by guards).
      }
    }
  };
}

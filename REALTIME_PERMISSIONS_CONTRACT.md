# Realtime Permissions Contract

## Current Inventory

Backend tables used by the current permission flow:

- `users`
- `roles`
- `permissions`
- `rolePermissions`

Current frontend flow:

- Login stores `roleId` after `POST /auth/login` or `POST /auth/mfa/login`.
- `frontend/src/components/user/Login.jsx` dispatches `loadPermissionById(roleId)` after successful login.
- `loadPermissionById(roleId)` lives in `frontend/src/redux/rtk/features/auth/authSlice.js`.
- It calls `GET /role-permission/permission?roleId=...`.
- Redux stores the permission name list in `auth.list`.
- UI guards consume this list through `PermissionChecker`, `UserPrivateComponent`, and side navigation permission checks.

Backend permission endpoints:

- `GET /role-permission/permission?roleId=...`
- `GET /role-permission?roleId=...`
- `POST /role-permission`
- `POST /role-permission?query=deletemany`
- `DELETE /role-permission/:id`

## Channel

Redis channel:

```text
permissions-updates
```

## Event Type

```text
permissions.updated
```

## Payload

```json
{
  "type": "permissions.updated",
  "roleId": 2,
  "userIds": [1],
  "version": 1710000000000,
  "reason": "role-permission-updated",
  "actorUserId": 1
}
```

## Rules

- `roleId` is required and is the primary targeting key because permissions are role-based today.
- `userIds` may be empty when only the role is known; it is reserved for narrower targeting later.
- `version` is a positive timestamp used to order or ignore stale events.
- `reason` explains why permissions changed.
- `actorUserId` is the user who triggered the change when known.
- Do not send the full permission list in the realtime event. Clients must reload permissions from `GET /role-permission/permission?roleId=...`.
- Keep security server-side: realtime notifications only tell clients to refresh; backend guards remain authoritative.

## Code

The backend contract lives in:

- `backend2/src/realtime/permissions-update-event.ts`
- `backend2/src/realtime/realtime-permissions-publisher.service.ts`

Validate the contract with:

```bash
node scripts/check-permissions-update-event-contract.mjs
```

## Redis Configuration

The publisher is optional at runtime. If Redis is not configured or unavailable, permission mutations must continue to succeed and the backend logs a warning.

Environment variables:

- `REDIS_URL`
- `REDIS_HOST`
- `REDIS_PORT`
- `REDIS_PASSWORD`
- `REDIS_CHANNEL_USER_UPDATES` defaults to `user-updates`

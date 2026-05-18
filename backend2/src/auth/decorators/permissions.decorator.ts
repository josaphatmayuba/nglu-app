import { SetMetadata } from "@nestjs/common";

export const PERMISSIONS_KEY = "permissions";

/**
 * Mark a route as requiring at least ONE of the given permission names.
 * Use together with @UseGuards(JwtAuthGuard, PermissionsGuard).
 *
 * @example
 *   @Permissions('readAll-contractTemplate')
 *   @Get()
 *   list() { ... }
 */
export const Permissions = (...permissionNames: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissionNames);

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { eq } from "drizzle-orm";
import { DRIZZLE } from "../../database/database.constants";
import { permissions, rolePermissions, roles } from "../../database/schema";
import type { Database } from "../../database/types";
import { PERMISSIONS_KEY } from "../decorators/permissions.decorator";

const CACHE_TTL_MS = Number(process.env.PERMISSIONS_GUARD_CACHE_TTL_MS || 0);

type AuthedUser = { sub?: number; roleId?: number; role?: string };

type RoleCache = { perms: Set<string>; isSystem: boolean; expiresAt: number };

/**
 * Loads the current role permission set from the database by default.
 * A short process-local cache can be enabled with PERMISSIONS_GUARD_CACHE_TTL_MS,
 * but production keeps this at 0 so permission revocations are enforced
 * immediately, even when the caller keeps using the same JWT.
 */
const cache = new Map<number, RoleCache>();

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(DRIZZLE) private readonly db: Database,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @Permissions() on this route → no extra check beyond auth.
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<{ user?: AuthedUser }>();
    const user = request.user;
    if (!user?.sub || !user.roleId) {
      throw new UnauthorizedException("Authenticated user missing on request.");
    }

    const { isSystem, perms: granted } = await this.roleData(user.roleId);

    // System roles (super-admin seeded via DB) bypass permission checks.
    if (isSystem) return true;

    const hasOne = required.some((perm) => granted.has(perm));
    if (!hasOne) {
      throw new ForbiddenException(
        `Missing permission. One of: ${required.join(", ")}.`,
      );
    }

    return true;
  }

  private async roleData(roleId: number): Promise<{ isSystem: boolean; perms: Set<string> }> {
    const cached = cache.get(roleId);
    if (CACHE_TTL_MS > 0 && cached && cached.expiresAt > Date.now()) {
      return { isSystem: cached.isSystem, perms: cached.perms };
    }

    const [roleRow, permRows] = await Promise.all([
      this.db
        .select({ isSystem: roles.isSystem })
        .from(roles)
        .where(eq(roles.id, roleId))
        .then((rows) => rows[0] ?? null),
      this.db
        .select({ name: permissions.name })
        .from(rolePermissions)
        .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
        .where(eq(rolePermissions.roleId, roleId)),
    ]);

    const isSystem = roleRow?.isSystem === 1;
    const perms = new Set(permRows.map((r) => r.name));
    if (CACHE_TTL_MS > 0) {
      cache.set(roleId, { isSystem, perms, expiresAt: Date.now() + CACHE_TTL_MS });
    }
    return { isSystem, perms };
  }

  /** Test helper — clears the in-memory cache. */
  static clearCache() {
    cache.clear();
  }
}

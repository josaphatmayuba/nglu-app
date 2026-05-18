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
import { permissions, rolePermissions } from "../../database/schema";
import type { Database } from "../../database/types";
import { PERMISSIONS_KEY } from "../decorators/permissions.decorator";

const SUPER_ADMIN_ROLE = "super-admin";
const CACHE_TTL_MS = 30_000; // 30s — short enough to pick up grant changes quickly, long enough to dampen DB load

type AuthedUser = { sub?: number; roleId?: number; role?: string };

/**
 * Caches the set of permission names granted to each role. Invalidated by TTL.
 * Process-local (no shared cache between instances). For multi-instance setups,
 * swap for Redis.
 */
const cache = new Map<number, { perms: Set<string>; expiresAt: number }>();

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

    // Super-admin always passes.
    if (user.role === SUPER_ADMIN_ROLE) return true;

    const granted = await this.permissionsForRole(user.roleId);
    const hasOne = required.some((perm) => granted.has(perm));
    if (!hasOne) {
      throw new ForbiddenException(
        `Missing permission. One of: ${required.join(", ")}.`,
      );
    }

    return true;
  }

  private async permissionsForRole(roleId: number): Promise<Set<string>> {
    const cached = cache.get(roleId);
    if (cached && cached.expiresAt > Date.now()) return cached.perms;

    const rows = await this.db
      .select({ name: permissions.name })
      .from(rolePermissions)
      .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
      .where(eq(rolePermissions.roleId, roleId));

    const perms = new Set(rows.map((r) => r.name));
    cache.set(roleId, { perms, expiresAt: Date.now() + CACHE_TTL_MS });
    return perms;
  }

  /** Test helper — clears the in-memory cache. */
  static clearCache() {
    cache.clear();
  }
}

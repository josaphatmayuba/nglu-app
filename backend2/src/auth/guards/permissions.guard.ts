import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  OnModuleDestroy,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { eq } from "drizzle-orm";
import Redis from "ioredis";
import { env } from "../../config/env";
import { DRIZZLE } from "../../database/database.constants";
import { permissions, rolePermissions, roles } from "../../database/schema";
import type { Database } from "../../database/types";
import { PERMISSIONS_KEY } from "../decorators/permissions.decorator";

const CACHE_TTL_MS = Number(process.env.PERMISSIONS_GUARD_CACHE_TTL_MS || 0);

type AuthedUser = { sub?: number; roleId?: number; role?: string };
type RoleCache = { perms: Set<string>; isSystem: boolean; expiresAt: number };

/**
 * Fallback in-memory cache used when Redis is unavailable and TTL > 0.
 * Single-instance only — not coherent across pods. Use Redis for multi-instance.
 */
const localCache = new Map<number, RoleCache>();

@Injectable()
export class PermissionsGuard implements CanActivate, OnModuleDestroy {
  private redis: Redis | null = null;

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

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit().catch(() => undefined);
      this.redis = null;
    }
  }

  private redisClient(): Redis | null {
    const r = env.redis;
    if (!r.enabled || (!r.url && !r.host)) return null;
    if (this.redis) return this.redis;

    this.redis = r.url
      ? new Redis(r.url, { enableOfflineQueue: false, lazyConnect: true, maxRetriesPerRequest: 1 })
      : new Redis({
          host: r.host,
          port: r.port,
          password: r.password || undefined,
          enableOfflineQueue: false,
          lazyConnect: true,
          maxRetriesPerRequest: 1,
        });

    // Suppress unhandled errors; callers handle null returns.
    this.redis.on("error", () => undefined);
    return this.redis;
  }

  private async roleData(roleId: number): Promise<{ isSystem: boolean; perms: Set<string> }> {
    if (CACHE_TTL_MS > 0) {
      const redis = this.redisClient();

      if (redis) {
        const hit = await redis.get(`perm:role:${roleId}`).catch(() => null);
        if (hit) {
          const { isSystem, perms } = JSON.parse(hit) as { isSystem: boolean; perms: string[] };
          return { isSystem, perms: new Set(perms) };
        }
      } else {
        const cached = localCache.get(roleId);
        if (cached && cached.expiresAt > Date.now()) {
          return { isSystem: cached.isSystem, perms: cached.perms };
        }
      }
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
      const redis = this.redisClient();
      if (redis) {
        await redis
          .set(`perm:role:${roleId}`, JSON.stringify({ isSystem, perms: [...perms] }), "PX", CACHE_TTL_MS)
          .catch(() => undefined);
      } else {
        localCache.set(roleId, { isSystem, perms, expiresAt: Date.now() + CACHE_TTL_MS });
      }
    }

    return { isSystem, perms };
  }

  /** Test helper — clears the local fallback cache. */
  static clearCache() {
    localCache.clear();
  }
}

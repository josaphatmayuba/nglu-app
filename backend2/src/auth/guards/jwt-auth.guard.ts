import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { and, eq, gt } from "drizzle-orm";
import { env } from "../../config/env";
import { DRIZZLE } from "../../database/database.constants";
import { organizations, roles, sessions, users } from "../../database/schema";
import type { Database } from "../../database/types";

// P1 multi-tenant : seul ce role peut basculer d organisation via X-Active-Org.
const SUPER_OWNER_ROLE = "super_owner";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(DRIZZLE) private readonly db: Database,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers["authorization"];

    // EventSource (SSE) cannot set headers — allow token via ?token= query param as fallback
    const queryToken: string | undefined = (request.query as Record<string, string>)["token"];

    let token: string;
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    } else if (queryToken) {
      token = queryToken;
    } else {
      throw new UnauthorizedException("Missing or invalid Authorization header");
    }

    let payload: { sub?: number; roleId?: number; role?: string; organizationId?: number; jti?: string };
    try {
      payload = this.jwtService.verify(token, { secret: env.jwtSecret, algorithms: ["HS256"] }) as typeof payload;
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }

    // SCRUM-109: validate JTI session — blocks forged tokens even if JWT_SECRET leaks
    if (payload.jti) {
      const [session] = await this.db
        .select({ jti: sessions.jti })
        .from(sessions)
        .where(
          and(
            eq(sessions.jti, payload.jti),
            eq(sessions.revoked, 0),
            gt(sessions.expiresAt, new Date()),
          ),
        )
        .limit(1);
      if (!session) {
        throw new UnauthorizedException("Session invalide ou révoquée");
      }
    }

    const current = await this.assertCurrentAuthContext(payload, request);
    payload.organizationId = current.organizationId;
    // Exposes pour les guards/decorateurs en aval (ex: console super-owner).
    (payload as Record<string, unknown>).isSuperOwner = current.isSuperOwner;
    request.user = payload;
    return true;
  }

  private async assertCurrentAuthContext(
    payload: { sub?: number; roleId?: number; organizationId?: number },
    request: { headers: Record<string, string | string[] | undefined> },
  ) {
    if (!payload.sub || !payload.roleId) {
      throw new UnauthorizedException("Invalid token payload");
    }

    // Jointure role : recalcule le nom du role en DB (jamais depuis le token)
    // pour determiner isSuperOwner. Le token ne peut donc pas s auto-promouvoir.
    const [user] = await this.db
      .select({
        id: users.id,
        roleId: users.roleId,
        roleName: roles.name,
        organizationId: users.organizationId,
        isLogin: users.isLogin,
        status: users.status,
      })
      .from(users)
      .leftJoin(roles, eq(roles.id, users.roleId))
      .where(eq(users.id, payload.sub))
      .limit(1);

    if (!user || user.status !== "true" || user.isLogin !== "true") {
      throw new UnauthorizedException("Invalid auth context");
    }

    if (user.roleId !== payload.roleId) {
      throw new UnauthorizedException("AUTH_CONTEXT_STALE");
    }

    if (payload.organizationId && user.organizationId !== payload.organizationId) {
      throw new UnauthorizedException("AUTH_CONTEXT_STALE");
    }

    const isSuperOwner = user.roleName === SUPER_OWNER_ROLE;

    // Org effective = celle du user en DB. Le super_owner peut la surcharger via
    // X-Active-Org (support / monitoring). Pour tout autre role, l en-tete est
    // IGNORE : un client reste enferme dans son organisation.
    let organizationId = user.organizationId;
    if (isSuperOwner) {
      const raw = request.headers["x-active-org"];
      const headerValue = Array.isArray(raw) ? raw[0] : raw;
      const requestedOrg = headerValue ? Number(headerValue) : NaN;
      if (Number.isInteger(requestedOrg) && requestedOrg > 0 && requestedOrg !== organizationId) {
        const [org] = await this.db
          .select({ id: organizations.id })
          .from(organizations)
          .where(eq(organizations.id, requestedOrg))
          .limit(1);
        if (!org) {
          throw new UnauthorizedException("Organisation active inconnue");
        }
        organizationId = org.id;
      }
    }

    return { organizationId, isSuperOwner };
  }
}

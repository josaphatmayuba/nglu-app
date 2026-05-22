import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { and, eq, gt } from "drizzle-orm";
import { env } from "../../config/env";
import { DRIZZLE } from "../../database/database.constants";
import { sessions, users } from "../../database/schema";
import type { Database } from "../../database/types";

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

    let payload: { sub?: number; roleId?: number; role?: string; jti?: string };
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

    await this.assertCurrentAuthContext(payload);
    request.user = payload;
    return true;
  }

  private async assertCurrentAuthContext(payload: { sub?: number; roleId?: number }) {
    if (!payload.sub || !payload.roleId) {
      throw new UnauthorizedException("Invalid token payload");
    }

    const [user] = await this.db
      .select({
        id: users.id,
        roleId: users.roleId,
        isLogin: users.isLogin,
        status: users.status,
      })
      .from(users)
      .where(eq(users.id, payload.sub))
      .limit(1);

    if (!user || user.status !== "true" || user.isLogin !== "true") {
      throw new UnauthorizedException("Invalid auth context");
    }

    if (user.roleId !== payload.roleId) {
      throw new UnauthorizedException("AUTH_CONTEXT_STALE");
    }
  }
}

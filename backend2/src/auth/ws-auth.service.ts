import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { and, eq, gt } from "drizzle-orm";
import type { Socket } from "socket.io";
import { env } from "../config/env";
import { DRIZZLE } from "../database/database.constants";
import { sessions, users } from "../database/schema";
import type { Database } from "../database/types";
import { Inject } from "@nestjs/common";

export type WsAuthContext = {
  userId: number;
  roleId: number;
  role?: string;
  organizationId: number;
};

@Injectable()
export class WsAuthService {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(DRIZZLE) private readonly db: Database,
  ) {}

  async authenticate(client: Socket): Promise<WsAuthContext> {
    const token = this.tokenFromHandshake(client);
    if (!token) throw new UnauthorizedException("Token manquant.");

    let payload: { sub?: number; roleId?: number; role?: string; organizationId?: number; jti?: string };
    try {
      payload = this.jwtService.verify(token, { secret: env.jwtSecret, algorithms: ["HS256"] }) as typeof payload;
    } catch {
      throw new UnauthorizedException("Token invalide ou expire.");
    }

    if (!payload.sub || !payload.roleId || !payload.jti) {
      throw new UnauthorizedException("Token invalide.");
    }

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
    if (!session) throw new UnauthorizedException("Session invalide ou revoquee.");

    const [user] = await this.db
      .select({
        id: users.id,
        roleId: users.roleId,
        organizationId: users.organizationId,
        status: users.status,
        isLogin: users.isLogin,
      })
      .from(users)
      .where(eq(users.id, payload.sub))
      .limit(1);

    if (!user || user.status !== "true" || user.isLogin !== "true") {
      throw new UnauthorizedException("Contexte auth invalide.");
    }
    if (user.roleId !== payload.roleId) {
      throw new UnauthorizedException("Contexte auth obsolete.");
    }
    if (payload.organizationId && user.organizationId !== payload.organizationId) {
      throw new UnauthorizedException("Contexte auth obsolete.");
    }

    return {
      userId: user.id,
      roleId: user.roleId,
      role: payload.role,
      organizationId: user.organizationId,
    };
  }

  private tokenFromHandshake(client: Socket) {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === "string" && authToken.trim()) return authToken.trim();

    const header = client.handshake.headers.authorization;
    if (typeof header === "string" && header.startsWith("Bearer ")) {
      return header.slice(7).trim();
    }

    return null;
  }
}

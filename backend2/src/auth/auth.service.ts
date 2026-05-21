import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { AuditService, type AuditContext } from "../audit/audit.service";
import { env } from "../config/env";
import { DRIZZLE } from "../database/database.constants";
import { roles, users } from "../database/schema";
import type { Database } from "../database/types";
import { LoginDto } from "./dto/login.dto";

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly jwtService: JwtService,
    private readonly audit: AuditService,
  ) {}

  async login(dto: LoginDto, ctx: AuditContext = {}) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.username, dto.username))
      .limit(1);

    if (!user) {
      await this.audit.log("auth.login.fail", dto.username, ctx, { reason: "user_not_found" });
      throw new UnauthorizedException("username or password is incorrect");
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) {
      await this.audit.log("auth.login.fail", dto.username, { ...ctx, userId: user.id }, { reason: "wrong_password" });
      throw new UnauthorizedException("username or password is incorrect");
    }

    const [role] = await this.db
      .select({ id: roles.id, name: roles.name })
      .from(roles)
      .where(eq(roles.id, user.roleId))
      .limit(1);

    const accessToken = this.jwtService.sign(
      { sub: user.id, roleId: role?.id, role: role?.name },
      { secret: env.jwtSecret, expiresIn: "15m", algorithm: "HS256" },
    );

    const refreshToken = this.jwtService.sign(
      { sub: user.id, role: role?.name },
      { secret: env.refreshSecret, expiresIn: "7d", algorithm: "HS256" },
    );

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await this.db
      .update(users)
      .set({ refreshToken: refreshTokenHash, isLogin: "true", updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(users.id, user.id));

    await this.audit.log("auth.login.ok", `user:${user.id}`, { ...ctx, userId: user.id }, { role: role?.name });

    const { password: _, refreshToken: __, isLogin: ___, ...safe } = user;
    return { user: safe, role: role?.name ?? null, token: accessToken, refreshToken };
  }

  async logout(userId: number, ctx: AuditContext = {}) {
    await this.db
      .update(users)
      .set({ isLogin: "false", refreshToken: null, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(users.id, userId));

    await this.audit.log("auth.logout", `user:${userId}`, { ...ctx, userId });

    return { message: "Logout successfully" };
  }

  async refreshAccessToken(refreshToken: string, ctx: AuditContext = {}) {
    let payload: { sub: number; role: string };

    try {
      payload = this.jwtService.verify(refreshToken, { secret: env.refreshSecret, algorithms: ["HS256"] });
    } catch {
      await this.audit.log("auth.refresh.fail", null, ctx, { reason: "invalid_signature" });
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    const [user] = await this.db
      .select({ id: users.id, roleId: users.roleId, refreshToken: users.refreshToken })
      .from(users)
      .where(eq(users.id, payload.sub))
      .limit(1);

    const tokenValid = user?.refreshToken
      ? await bcrypt.compare(refreshToken, user.refreshToken)
      : false;

    if (!user || !tokenValid) {
      await this.audit.log("auth.refresh.fail", `user:${payload.sub}`, { ...ctx, userId: payload.sub }, { reason: "token_mismatch" });
      throw new UnauthorizedException("Invalid refresh token");
    }

    const [role] = await this.db
      .select({ id: roles.id, name: roles.name })
      .from(roles)
      .where(eq(roles.id, user.roleId))
      .limit(1);

    const accessToken = this.jwtService.sign(
      { sub: user.id, roleId: role?.id, role: role?.name },
      { secret: env.jwtSecret, expiresIn: "15m", algorithm: "HS256" },
    );

    return { token: accessToken };
  }
}

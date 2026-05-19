import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
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
  ) {}

  async login(dto: LoginDto) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.username, dto.username))
      .limit(1);

    if (!user) throw new UnauthorizedException("username or password is incorrect");

    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) throw new UnauthorizedException("username or password is incorrect");

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

    await this.db
      .update(users)
      .set({ refreshToken, isLogin: "true", updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(users.id, user.id));

    const { password: _, refreshToken: __, isLogin: ___, ...safe } = user;

    return { user: safe, role: role?.name ?? null, token: accessToken, refreshToken };
  }

  async logout(userId: number) {
    await this.db
      .update(users)
      .set({ isLogin: "false", updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(users.id, userId));

    return { message: "Logout successfully" };
  }

  async refreshAccessToken(refreshToken: string) {
    let payload: { sub: number; role: string };

    try {
      payload = this.jwtService.verify(refreshToken, { secret: env.refreshSecret, algorithms: ["HS256"] });
    } catch {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    const [user] = await this.db
      .select({ id: users.id, roleId: users.roleId, refreshToken: users.refreshToken })
      .from(users)
      .where(eq(users.id, payload.sub))
      .limit(1);

    if (!user || user.refreshToken !== refreshToken) {
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

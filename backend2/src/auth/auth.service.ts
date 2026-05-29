import { randomUUID } from "crypto";
import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { and, eq, lt, sql } from "drizzle-orm";
import { AuditService, type AuditContext } from "../audit/audit.service";
import { env } from "../config/env";
import { DRIZZLE } from "../database/database.constants";
import { roles, sessions, users } from "../database/schema";
import type { Database } from "../database/types";
import { LoginDto } from "./dto/login.dto";

const ACCESS_TTL_MS = 15 * 60 * 1000; // 15 min — must match expiresIn
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000; // 15 min lockout after MAX_ATTEMPTS failures

export const MFA_TOKEN_SECRET_SUFFIX = "_mfa";

@Injectable()
export class AuthService {
  // In-memory tracker — resets on restart, acceptable for single-instance deployment.
  // Use Redis (INCR + EXPIRE) if multi-instance is needed in the future.
  private readonly loginFailures = new Map<string, { count: number; lockedUntil: number }>();

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly jwtService: JwtService,
    private readonly audit: AuditService,
  ) {}

  private checkLockout(username: string): void {
    const entry = this.loginFailures.get(username);
    if (entry && Date.now() < entry.lockedUntil) {
      const remaining = Math.ceil((entry.lockedUntil - Date.now()) / 60_000);
      throw new UnauthorizedException(
        `Compte temporairement verrouillé après ${LOGIN_MAX_ATTEMPTS} tentatives. Réessayez dans ${remaining} min.`,
      );
    }
  }

  private recordFailure(username: string): void {
    const entry = this.loginFailures.get(username) ?? { count: 0, lockedUntil: 0 };
    entry.count += 1;
    if (entry.count >= LOGIN_MAX_ATTEMPTS) {
      entry.lockedUntil = Date.now() + LOGIN_LOCKOUT_MS;
    }
    this.loginFailures.set(username, entry);
  }

  private resetFailures(username: string): void {
    this.loginFailures.delete(username);
  }

  // ── Private helper: sign access token + persist session ─────────────────
  private async issueAccessToken(
    userId: number,
    roleId: number | undefined,
    roleName: string | undefined,
    organizationId: number | undefined,
    ctx: AuditContext,
  ): Promise<{ accessToken: string; jti: string }> {
    const jti = randomUUID();
    const accessToken = this.jwtService.sign(
      { sub: userId, roleId, role: roleName, organizationId: organizationId ?? 1, jti },
      { secret: env.jwtSecret, expiresIn: "15m", algorithm: "HS256" },
    );
    const expiresAt = new Date(Date.now() + ACCESS_TTL_MS);
    await this.db.insert(sessions).values({
      jti,
      userId,
      roleId: roleId ?? 0,
      organizationId: organizationId ?? 1,
      ip: ctx.ip ?? null,
      userAgent: ctx.userAgent ?? null,
      expiresAt,
    });
    return { accessToken, jti };
  }

  // ── Periodic cleanup: remove old revoked/expired sessions ─────────────────
  async cleanupSessions() {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    await this.db.delete(sessions).where(lt(sessions.expiresAt, cutoff));
  }

  async login(dto: LoginDto, ctx: AuditContext = {}) {
    // SCRUM-112: block locked-out usernames before hitting the DB
    this.checkLockout(dto.username);

    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.username, dto.username))
      .limit(1);

    if (!user) {
      this.recordFailure(dto.username);
      await this.audit.log("auth.login.fail", dto.username, ctx, { reason: "user_not_found" });
      throw new UnauthorizedException("username or password is incorrect");
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatch) {
      this.recordFailure(dto.username);
      const entry = this.loginFailures.get(dto.username);
      if (entry && entry.lockedUntil > 0) {
        await this.audit.log("auth.login.locked", dto.username, { ...ctx, userId: user.id }, {
          attempts: entry.count,
          lockedUntilIso: new Date(entry.lockedUntil).toISOString(),
        });
      }
      await this.audit.log("auth.login.fail", dto.username, { ...ctx, userId: user.id }, { reason: "wrong_password" });
      throw new UnauthorizedException("username or password is incorrect");
    }

    // Successful auth — clear failure counter
    this.resetFailures(dto.username);

    // Disabled accounts (status "false", e.g. closed via HR) cannot sign in.
    if (user.status !== "true") {
      await this.audit.log("auth.login.fail", dto.username, { ...ctx, userId: user.id }, { reason: "account_disabled" });
      throw new UnauthorizedException("Ce compte est désactivé. Contactez un administrateur.");
    }

    // If MFA is enabled, return a short-lived mfaToken instead of full tokens
    if (user.totpEnabled) {
      const mfaToken = this.jwtService.sign(
        { sub: user.id, mfa: true },
        { secret: env.jwtSecret + MFA_TOKEN_SECRET_SUFFIX, expiresIn: "5m", algorithm: "HS256" },
      );
      await this.audit.log("auth.login.mfa_required", `user:${user.id}`, { ...ctx, userId: user.id });
      return { requireMfa: true, mfaToken } as { requireMfa: true; mfaToken: string };
    }

    const [role] = await this.db
      .select({ id: roles.id, name: roles.name })
      .from(roles)
      .where(eq(roles.id, user.roleId))
      .limit(1);

    const { accessToken } = await this.issueAccessToken(user.id, role?.id, role?.name, user.organizationId, ctx);

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

    const { password: _, refreshToken: __, isLogin: ___, totpSecret: ____, ...safe } = user;
    return { user: safe, role: role?.name ?? null, token: accessToken, refreshToken };
  }

  /** Complete MFA login after TOTP/recovery verification. Exchanges mfaToken for full tokens. */
  verifyMfaToken(mfaToken: string): { sub: number; mfa: boolean } {
    let payload: { sub: number; mfa: boolean };
    try {
      payload = this.jwtService.verify(mfaToken, {
        secret: env.jwtSecret + MFA_TOKEN_SECRET_SUFFIX,
        algorithms: ["HS256"],
      });
    } catch {
      throw new UnauthorizedException("MFA token invalide ou expiré.");
    }
    if (!payload?.mfa) throw new UnauthorizedException("MFA token invalide.");
    return payload;
  }

  /** Complete MFA login after TOTP/recovery verification. Exchanges mfaToken for full tokens. */
  async completeMfaLogin(mfaToken: string, ctx: AuditContext = {}) {
    const payload = this.verifyMfaToken(mfaToken);

    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, payload.sub))
      .limit(1);

    if (!user) throw new UnauthorizedException();

    const [role] = await this.db
      .select({ id: roles.id, name: roles.name })
      .from(roles)
      .where(eq(roles.id, user.roleId))
      .limit(1);

    const { accessToken } = await this.issueAccessToken(user.id, role?.id, role?.name, user.organizationId, ctx);

    const refreshToken = this.jwtService.sign(
      { sub: user.id, role: role?.name },
      { secret: env.refreshSecret, expiresIn: "7d", algorithm: "HS256" },
    );

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await this.db
      .update(users)
      .set({ refreshToken: refreshTokenHash, isLogin: "true", updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(users.id, user.id));

    await this.audit.log("auth.login.ok", `user:${user.id}`, { ...ctx, userId: user.id }, { role: role?.name, mfa: true });

    const { password: _, refreshToken: __, isLogin: ___, totpSecret: ____, ...safe } = user;
    return { user: safe, role: role?.name ?? null, token: accessToken, refreshToken };
  }

  async logout(userId: number, ctx: AuditContext = {}) {
    await this.db
      .update(users)
      .set({ isLogin: "false", refreshToken: null, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(users.id, userId));

    // Revoke all active sessions for this user
    await this.db
      .update(sessions)
      .set({ revoked: 1 })
      .where(and(eq(sessions.userId, userId), eq(sessions.revoked, 0)));

    await this.audit.log("auth.logout", `user:${userId}`, { ...ctx, userId });

    return { message: "Logout successfully" };
  }

  async refreshAccessToken(refreshToken: string, ctx: AuditContext = {}) {
    let payload: { sub: number; role?: string; roleId?: number };

    try {
      payload = this.jwtService.verify(refreshToken, { secret: env.refreshSecret, algorithms: ["HS256"] });
    } catch {
      await this.audit.log("auth.refresh.fail", null, ctx, { reason: "invalid_signature" });
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    const [user] = await this.db
      .select({ id: users.id, roleId: users.roleId, organizationId: users.organizationId, refreshToken: users.refreshToken, status: users.status })
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

    if (user.status !== "true") {
      await this.audit.log("auth.refresh.fail", `user:${user.id}`, { ...ctx, userId: user.id }, { reason: "account_disabled" });
      throw new UnauthorizedException("Ce compte est désactivé.");
    }

    const [role] = await this.db
      .select({ id: roles.id, name: roles.name })
      .from(roles)
      .where(eq(roles.id, user.roleId))
      .limit(1);

    const { accessToken } = await this.issueAccessToken(user.id, role?.id, role?.name, user.organizationId, ctx);

    return { token: accessToken, roleId: role?.id, role: role?.name ?? null, organizationId: user.organizationId };
  }
}

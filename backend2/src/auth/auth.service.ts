import { randomBytes, randomUUID } from "crypto";
import { BadRequestException, ConflictException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { and, desc, eq, gt, isNull, lt, sql } from "drizzle-orm";
import { AuditService, type AuditContext } from "../audit/audit.service";
import { env } from "../config/env";
import { DRIZZLE } from "../database/database.constants";
import { provisionOrgChartOfAccounts } from "../database/provisioning/chart-of-accounts";
import { organizations, refreshTokens, roles, sessions, users } from "../database/schema";
import type { Database } from "../database/types";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

const ACCESS_TTL_MS = 15 * 60 * 1000; // 15 min — must match expiresIn
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 d — must match expiresIn
// SCRUM-121: grace window for concurrent refreshes (multi-tab). A token that was
// already rotated is still accepted within this window without triggering reuse
// detection, so simultaneous tab refreshes don't log the user out.
const REFRESH_GRACE_MS = 20 * 1000; // 20 s
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
  // SCRUM-121: familyId ties this access session to its refresh-token family so
  // revoking a device also revokes its outstanding access token.
  private async issueAccessToken(
    userId: number,
    roleId: number | undefined,
    roleName: string | undefined,
    organizationId: number | undefined,
    ctx: AuditContext,
    familyId: string | null = null,
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
      familyId,
      ip: ctx.ip ?? null,
      userAgent: ctx.userAgent ?? null,
      expiresAt,
    });
    return { accessToken, jti };
  }

  // ── SCRUM-121: sign a refresh token and persist its row in the family ──────
  private async issueRefreshToken(
    userId: number,
    roleName: string | undefined,
    familyId: string,
    ctx: AuditContext,
  ): Promise<{ token: string; jti: string }> {
    const jti = randomUUID();
    const token = this.jwtService.sign(
      { sub: userId, role: roleName, jti, family: familyId },
      { secret: env.refreshSecret, expiresIn: "7d", algorithm: "HS256" },
    );
    const tokenHash = await bcrypt.hash(token, 10);
    await this.db.insert(refreshTokens).values({
      jti,
      familyId,
      userId,
      tokenHash,
      userAgent: ctx.userAgent ?? null,
      ip: ctx.ip ?? null,
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    });
    return { token, jti };
  }

  // ── SCRUM-121: revoke an entire refresh-token family + its access sessions ──
  private async revokeFamily(familyId: string, reason: string) {
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: sql`CURRENT_TIMESTAMP`, revokedReason: reason })
      .where(and(eq(refreshTokens.familyId, familyId), isNull(refreshTokens.revokedAt)));
    // Kill outstanding access tokens issued under this family.
    await this.db
      .update(sessions)
      .set({ revoked: 1 })
      .where(and(eq(sessions.familyId, familyId), eq(sessions.revoked, 0)));
  }

  // ── Periodic cleanup: remove old revoked/expired sessions ─────────────────
  async cleanupSessions() {
    const cutoff = new Date(Date.now() - REFRESH_TTL_MS);
    await this.db.delete(sessions).where(lt(sessions.expiresAt, cutoff));
    await this.db.delete(refreshTokens).where(lt(refreshTokens.expiresAt, cutoff));
  }

  async login(dto: LoginDto, ctx: AuditContext = {}) {
    // SCRUM-112: block locked-out usernames before hitting the DB
    this.checkLockout(dto.username);

    const [user] = await this.db
      .select({
        id: users.id,
        organizationId: users.organizationId,
        username: users.username,
        password: users.password,
        roleId: users.roleId,
        status: users.status,
        isLogin: users.isLogin,
        totpEnabled: users.totpEnabled,
        totpSecret: users.totpSecret,
        refreshToken: users.refreshToken,
        email: users.email,
      })
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

    // SCRUM-121: each login opens a new refresh-token family (device session).
    const familyId = randomUUID();
    const { accessToken } = await this.issueAccessToken(user.id, role?.id, role?.name, user.organizationId, ctx, familyId);
    const { token: refreshToken } = await this.issueRefreshToken(user.id, role?.name, familyId, ctx);

    await this.db
      .update(users)
      .set({ isLogin: "true", updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(users.id, user.id));

    await this.audit.log("auth.login.ok", `user:${user.id}`, { ...ctx, userId: user.id }, { role: role?.name });

    const { password: _, refreshToken: __, isLogin: ___, totpSecret: ____, ...safe } = user;
    return { user: safe, role: role?.name ?? null, token: accessToken, refreshToken };
  }

  // ── P3 multi-tenant : inscription self-service d un client ────────────────
  // Cree une organisation (status 'trial') + son 1er admin + seed le plan
  // comptable canonique de l org, le tout dans UNE transaction atomique, puis
  // connecte l utilisateur (JWT + refresh). Solo = org a 1 user (orgName = nom).
  async register(dto: RegisterDto, ctx: AuditContext = {}) {
    if (!dto.acceptedTerms) {
      throw new BadRequestException("Vous devez accepter les conditions d utilisation.");
    }

    const email = dto.email.trim().toLowerCase();
    const slug = dto.slug.trim().toLowerCase();
    const orgName = dto.accountType === "org"
      ? (dto.orgName?.trim() || "")
      : `${dto.firstName} ${dto.lastName}`.trim();
    if (dto.accountType === "org" && !orgName) {
      throw new BadRequestException("Le nom de l organisation est requis.");
    }

    // Unicite email (= username de connexion) et slug, hors transaction (lecture).
    const [emailTaken] = await this.db.select({ id: users.id }).from(users).where(eq(users.username, email)).limit(1);
    if (emailTaken) throw new ConflictException("Un compte existe deja avec cet email.");
    const [slugTaken] = await this.db.select({ id: organizations.id }).from(organizations).where(eq(organizations.slug, slug)).limit(1);
    if (slugTaken) throw new ConflictException("Cette adresse est deja utilisee.");

    // Role 'admin' = administrateur de SA propre organisation (pas plateforme).
    const [adminRole] = await this.db.select({ id: roles.id }).from(roles).where(eq(roles.name, "admin")).limit(1);
    if (!adminRole) throw new BadRequestException("Role admin introuvable (seed manquant).");

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const publicId = `org_${randomBytes(6).toString("hex")}`; // 12 hexa opaques

    // Transaction atomique : org + user + plan comptable. Tout ou rien.
    const created = await this.db.transaction(async (tx) => {
      const [orgRes] = await tx.insert(organizations).values({
        publicId,
        name: orgName,
        slug,
        status: "trial",
        plan: dto.plan ?? "free",
        createdAt: sql`CURRENT_TIMESTAMP`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      } as any);
      const orgId = Number((orgRes as any).insertId);

      const [userRes] = await tx.insert(users).values({
        organizationId: orgId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        username: email,
        email,
        phone: dto.phone ?? null,
        password: passwordHash,
        roleId: adminRole.id,
        status: "true",
        isLogin: "true",
        createdAt: sql`CURRENT_TIMESTAMP`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      } as any);
      const userId = Number((userRes as any).insertId);

      // Plan comptable canonique isole pour cette nouvelle org (memes IDs resolus
      // par nom). Le handle tx garantit l atomicite avec l org + user.
      await provisionOrgChartOfAccounts(tx as unknown as Database, orgId);

      return { orgId, userId };
    });

    await this.audit.log("auth.register.ok", `org:${created.orgId}`, { ...ctx, userId: created.userId }, {
      slug, publicId, accountType: dto.accountType,
    });

    // Connexion immediate : JWT + refresh (nouvelle famille = 1er device).
    const familyId = randomUUID();
    const { accessToken } = await this.issueAccessToken(created.userId, adminRole.id, "admin", created.orgId, ctx, familyId);
    const { token: refreshToken } = await this.issueRefreshToken(created.userId, "admin", familyId, ctx);

    return {
      token: accessToken,
      refreshToken,
      role: "admin",
      user: { id: created.userId, firstName: dto.firstName, lastName: dto.lastName, email, organizationId: created.orgId },
      organization: { id: created.orgId, publicId, name: orgName, slug, status: "trial", plan: dto.plan ?? "free" },
    };
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
      .select({
        id: users.id,
        organizationId: users.organizationId,
        roleId: users.roleId,
        status: users.status,
        password: users.password,
        refreshToken: users.refreshToken,
        isLogin: users.isLogin,
        totpEnabled: users.totpEnabled,
        totpSecret: users.totpSecret,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, payload.sub))
      .limit(1);

    if (!user) throw new UnauthorizedException();

    const [role] = await this.db
      .select({ id: roles.id, name: roles.name })
      .from(roles)
      .where(eq(roles.id, user.roleId))
      .limit(1);

    // SCRUM-121: each login opens a new refresh-token family (device session).
    const familyId = randomUUID();
    const { accessToken } = await this.issueAccessToken(user.id, role?.id, role?.name, user.organizationId, ctx, familyId);
    const { token: refreshToken } = await this.issueRefreshToken(user.id, role?.name, familyId, ctx);

    await this.db
      .update(users)
      .set({ isLogin: "true", updatedAt: sql`CURRENT_TIMESTAMP` })
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

    // Revoke all active access sessions for this user
    await this.db
      .update(sessions)
      .set({ revoked: 1 })
      .where(and(eq(sessions.userId, userId), eq(sessions.revoked, 0)));

    // SCRUM-121: revoke all refresh-token families too (every device).
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: sql`CURRENT_TIMESTAMP`, revokedReason: "logout" })
      .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));

    await this.audit.log("auth.logout", `user:${userId}`, { ...ctx, userId });

    return { message: "Logout successfully" };
  }

  // SCRUM-121: rotating refresh with reuse detection.
  // Returns a NEW refresh token (the caller sets it as the cookie) alongside the
  // new access token. Reuse of a rotated (beyond grace) or revoked token revokes
  // the whole family and audits the event.
  async refreshAccessToken(refreshToken: string, ctx: AuditContext = {}) {
    let payload: { sub: number; role?: string; jti?: string; family?: string };

    try {
      payload = this.jwtService.verify(refreshToken, { secret: env.refreshSecret, algorithms: ["HS256"] });
    } catch {
      await this.audit.log("auth.refresh.fail", null, ctx, { reason: "invalid_signature" });
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    // Legacy refresh tokens (pre-SCRUM-121, no jti) are no longer accepted — the
    // user simply re-authenticates. Avoids an unverifiable token bypassing rotation.
    if (!payload.jti || !payload.family) {
      await this.audit.log("auth.refresh.fail", `user:${payload.sub}`, { ...ctx, userId: payload.sub }, { reason: "legacy_token" });
      throw new UnauthorizedException("Invalid refresh token");
    }

    const [row] = await this.db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.jti, payload.jti))
      .limit(1);

    // Unknown jti but a family is claimed → treat as theft and burn the family.
    if (!row) {
      await this.revokeFamily(payload.family, "reuse_unknown_jti");
      await this.audit.log("auth.refresh.reuse", `user:${payload.sub}`, { ...ctx, userId: payload.sub }, { family: payload.family, reason: "unknown_jti" });
      throw new UnauthorizedException("Invalid refresh token");
    }

    // Hash mismatch (jti guessed / tampered) → burn the family.
    const hashOk = await bcrypt.compare(refreshToken, row.tokenHash);
    if (!hashOk) {
      await this.revokeFamily(row.familyId, "hash_mismatch");
      await this.audit.log("auth.refresh.reuse", `user:${row.userId}`, { ...ctx, userId: row.userId }, { family: row.familyId, reason: "hash_mismatch" });
      throw new UnauthorizedException("Invalid refresh token");
    }

    // Already revoked (family burned earlier, or logged out) → reject.
    if (row.revokedAt) {
      await this.revokeFamily(row.familyId, "reuse_revoked");
      await this.audit.log("auth.refresh.reuse", `user:${row.userId}`, { ...ctx, userId: row.userId }, { family: row.familyId, reason: "revoked" });
      throw new UnauthorizedException("Invalid refresh token");
    }

    // Expired token → reject (no family burn; legitimate expiry).
    if (row.expiresAt.getTime() < Date.now()) {
      await this.audit.log("auth.refresh.fail", `user:${row.userId}`, { ...ctx, userId: row.userId }, { reason: "expired" });
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    // Reuse of an already-rotated token beyond the grace window → theft signal.
    if (row.rotatedAt && Date.now() - row.rotatedAt.getTime() > REFRESH_GRACE_MS) {
      await this.revokeFamily(row.familyId, "reuse_rotated");
      await this.audit.log("auth.refresh.reuse", `user:${row.userId}`, { ...ctx, userId: row.userId }, { family: row.familyId, reason: "rotated_beyond_grace" });
      throw new UnauthorizedException("Invalid refresh token");
    }

    // ── Valid (active, or rotated within grace = concurrent tab). Load user. ──
    const [user] = await this.db
      .select({ id: users.id, roleId: users.roleId, organizationId: users.organizationId, status: users.status, firstName: users.firstName, lastName: users.lastName, username: users.username, email: users.email })
      .from(users)
      .where(eq(users.id, row.userId))
      .limit(1);

    if (!user) {
      await this.audit.log("auth.refresh.fail", `user:${row.userId}`, { ...ctx, userId: row.userId }, { reason: "user_not_found" });
      throw new UnauthorizedException("Invalid refresh token");
    }
    if (user.status !== "true") {
      await this.revokeFamily(row.familyId, "account_disabled");
      await this.audit.log("auth.refresh.fail", `user:${user.id}`, { ...ctx, userId: user.id }, { reason: "account_disabled" });
      throw new UnauthorizedException("Ce compte est désactivé.");
    }

    const [role] = await this.db
      .select({ id: roles.id, name: roles.name })
      .from(roles)
      .where(eq(roles.id, user.roleId))
      .limit(1);

    // Rotate: mint a new leaf in the same family + a new access token.
    const { token: newRefreshToken, jti: newJti } = await this.issueRefreshToken(user.id, role?.name, row.familyId, ctx);
    // Mark the presented token as rotated (only the first rotation records rotatedAt).
    await this.db
      .update(refreshTokens)
      .set({
        rotatedAt: row.rotatedAt ?? sql`CURRENT_TIMESTAMP`,
        replacedByJti: newJti,
      })
      .where(eq(refreshTokens.jti, row.jti));

    const { accessToken } = await this.issueAccessToken(user.id, role?.id, role?.name, user.organizationId, ctx, row.familyId);

    return {
      token: accessToken,
      refreshToken: newRefreshToken,
      roleId: role?.id,
      role: role?.name ?? null,
      organizationId: user.organizationId,
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      email: user.email,
    };
  }

  // ── SCRUM-121: list a user's active sessions (one per refresh-token family) ──
  async listSessions(userId: number, currentFamilyId: string | null) {
    const rows = await this.db
      .select()
      .from(refreshTokens)
      .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt), gt(refreshTokens.expiresAt, new Date())))
      .orderBy(desc(refreshTokens.createdAt));

    // Collapse to one entry per family; the family root row carries device info.
    const byFamily = new Map<string, typeof rows[number]>();
    for (const r of rows) {
      const existing = byFamily.get(r.familyId);
      // Keep the earliest createdAt as the family origin, track latest activity separately.
      if (!existing || r.createdAt.getTime() < existing.createdAt.getTime()) {
        byFamily.set(r.familyId, r);
      }
    }
    const lastUsed = new Map<string, Date>();
    for (const r of rows) {
      const t = (r.rotatedAt ?? r.createdAt).getTime();
      const prev = lastUsed.get(r.familyId);
      if (!prev || t > prev.getTime()) lastUsed.set(r.familyId, r.rotatedAt ?? r.createdAt);
    }

    return Array.from(byFamily.values()).map((r) => ({
      id: r.familyId,
      userAgent: r.userAgent,
      ip: r.ip,
      createdAt: r.createdAt,
      lastUsedAt: lastUsed.get(r.familyId) ?? r.createdAt,
      current: currentFamilyId != null && r.familyId === currentFamilyId,
    }));
  }

  // ── SCRUM-121: revoke one session/device (must belong to the caller) ──
  async revokeSession(userId: number, familyId: string, ctx: AuditContext = {}) {
    const [row] = await this.db
      .select({ jti: refreshTokens.jti })
      .from(refreshTokens)
      .where(and(eq(refreshTokens.familyId, familyId), eq(refreshTokens.userId, userId)))
      .limit(1);
    if (!row) {
      throw new UnauthorizedException("Session introuvable");
    }
    await this.revokeFamily(familyId, "user_revoked");
    await this.audit.log("auth.session.revoke", `user:${userId}`, { ...ctx, userId }, { family: familyId });
    return { message: "Session révoquée" };
  }

  /** Decode the family id from a refresh-token cookie, if present and valid. */
  familyFromRefreshToken(refreshToken: string | undefined): string | null {
    if (!refreshToken) return null;
    try {
      const payload = this.jwtService.verify(refreshToken, { secret: env.refreshSecret, algorithms: ["HS256"] }) as { family?: string };
      return payload.family ?? null;
    } catch {
      return null;
    }
  }
}

import { GoneException, Inject, Injectable, Logger } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { createHash, randomUUID } from "crypto";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { AuditService } from "../audit/audit.service";
import { env } from "../config/env";
import { DRIZZLE } from "../database/database.constants";
import { passwordResetTokens, refreshTokens, sessions, users } from "../database/schema";
import type { Database } from "../database/types";
import { SystemEmailService } from "../system-email/system-email.service";

const TOKEN_TTL_MINUTES = 15;

// Lien de reset : une demande venant d un site Avelomi (vitrine ou app en
// sous-domaine) renvoie vers la page Avelomi ; sinon, ecran historique du CRM.
export function resetUrlFor(origin: string | undefined, token: string): string {
  const host = /^https:\/\/([a-z0-9.-]+)$/i.exec(origin ?? "")?.[1]?.toLowerCase() ?? "";
  if (host === "dev.avelomi.com" || host.endsWith(".dev.avelomi.com")) return `https://dev.avelomi.com/#/reset?token=${token}`;
  if (host === "avelomi.com" || host.endsWith(".avelomi.com")) return `https://avelomi.com/#/reset?token=${token}`;
  return `${env.appUrl}/admin/auth/reset-password?token=${token}`;
}

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly audit: AuditService,
    private readonly emails: SystemEmailService,
  ) {}

  /** POST /auth/forgot-password - always returns 200 regardless of whether email exists. */
  async forgotPassword(email: string, ctx: { ip?: string; userAgent?: string } = {}, origin?: string): Promise<void> {
    const [user] = await this.db
      .select({ id: users.id, email: users.email, username: users.username })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    await this.audit.log("auth.forgot_password", email, ctx, { found: !!user });

    if (!user) return; // Anti-enumeration: silently do nothing

    const token = randomUUID(); // cryptographically random, URL-safe
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000);

    await this.db.insert(passwordResetTokens).values({
      tokenHash,
      identityId: user.id,
      identityType: "user",
      expiresAt,
    });

    const resetUrl = resetUrlFor(origin, token);

    await this.sendResetEmail(user.email ?? email, user.username, resetUrl).catch((err) => {
      this.logger.error(`Failed to send reset email to ${email}: ${String(err)}`);
    });
  }

  /** POST /auth/reset-password - verifies token, changes password, revokes all sessions. */
  async resetPassword(token: string, newPassword: string, ctx: { ip?: string; userAgent?: string } = {}): Promise<void> {
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const now = new Date();

    const [record] = await this.db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.tokenHash, tokenHash),
          gt(passwordResetTokens.expiresAt, now),
          isNull(passwordResetTokens.usedAt),
        ),
      )
      .limit(1);

    if (!record) {
      await this.audit.log("auth.reset_password.fail", null, ctx, { reason: "invalid_or_expired" });
      throw new GoneException("Token invalide, expire ou deja utilise.");
    }

    await this.db
      .update(passwordResetTokens)
      .set({ usedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(passwordResetTokens.id, record.id));

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.db
      .update(users)
      .set({
        password: passwordHash,
        refreshToken: null,
        isLogin: "false",
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(users.id, record.identityId));

    // Coupe toutes les sessions et familles refresh (comme logout) : un voleur
    // de session ne garde pas l acces apres le reset.
    await this.db
      .update(sessions)
      .set({ revoked: 1 })
      .where(and(eq(sessions.userId, record.identityId), eq(sessions.revoked, 0)));
    await this.db
      .update(refreshTokens)
      .set({ revokedAt: sql`CURRENT_TIMESTAMP`, revokedReason: "password_reset" })
      .where(and(eq(refreshTokens.userId, record.identityId), isNull(refreshTokens.revokedAt)));

    await this.audit.log("auth.reset_password.ok", `user:${record.identityId}`, { ...ctx, userId: record.identityId });
  }

  private async sendResetEmail(to: string, username: string, resetUrl: string): Promise<void> {
    await this.emails.sendTemplate({
      to,
      type: "password_reset",
      variables: { username, resetUrl, ttlMinutes: TOKEN_TTL_MINUTES },
      relatedType: "password-reset",
      relatedId: username,
    });
  }
}

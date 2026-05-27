import { BadRequestException, GoneException, Inject, Injectable, Logger } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { createHash, randomUUID } from "crypto";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import * as nodemailer from "nodemailer";
import { AuditService } from "../audit/audit.service";
import { env } from "../config/env";
import { smtpTransportOptions } from "../config/smtp";
import { DRIZZLE } from "../database/database.constants";
import { passwordResetTokens, users } from "../database/schema";
import type { Database } from "../database/types";

const TOKEN_TTL_MINUTES = 15;

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly audit: AuditService,
  ) {}

  /** POST /auth/forgot-password — always returns 200 regardless of whether email exists. */
  async forgotPassword(email: string, ctx: { ip?: string; userAgent?: string } = {}): Promise<void> {
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

    const resetUrl = `${env.appUrl}/admin/auth/reset-password?token=${token}`;

    await this.sendResetEmail(user.email ?? email, user.username, resetUrl).catch((err) => {
      this.logger.error(`Failed to send reset email to ${email}: ${String(err)}`);
    });
  }

  /** POST /auth/reset-password — verifies token, changes password, revokes all sessions. */
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
      throw new GoneException("Token invalide, expiré ou déjà utilisé.");
    }

    // Mark token as used immediately (one-shot)
    await this.db
      .update(passwordResetTokens)
      .set({ usedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(passwordResetTokens.id, record.id));

    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Change password + revoke all sessions (set refreshToken=null)
    await this.db
      .update(users)
      .set({
        password: passwordHash,
        refreshToken: null,
        isLogin: "false",
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(users.id, record.identityId));

    await this.audit.log("auth.reset_password.ok", `user:${record.identityId}`, { ...ctx, userId: record.identityId });
  }

  private async sendResetEmail(to: string, username: string, resetUrl: string): Promise<void> {
    if (!env.smtp.user || !env.smtp.pass) {
      this.logger.warn(`SMTP not configured — reset URL for ${username}: ${resetUrl}`);
      return;
    }

    const transporter = nodemailer.createTransport(smtpTransportOptions());

    await transporter.sendMail({
      from: env.smtp.from,
      to,
      subject: "Réinitialisation de mot de passe — NgoluApp",
      html: `
        <p>Bonjour ${username},</p>
        <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
        <p><a href="${resetUrl}">Cliquez ici pour définir un nouveau mot de passe</a></p>
        <p>Ce lien expire dans ${TOKEN_TTL_MINUTES} minutes.</p>
        <p>Si vous n'avez pas effectué cette demande, ignorez cet email.</p>
      `,
    });
  }
}

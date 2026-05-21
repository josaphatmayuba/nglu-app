import {
  BadRequestException,
  GoneException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { and, eq, isNull } from "drizzle-orm";
import { generateSecret, generateURI, verify } from "otplib";
import * as qrcode from "qrcode";
import { AuditService } from "../audit/audit.service";
import { DRIZZLE } from "../database/database.constants";
import { mfaRecoveryCodes, users } from "../database/schema";
import type { Database } from "../database/types";

const APP_NAME = "NgoluApp";
const RECOVERY_CODE_COUNT = 10;

@Injectable()
export class MfaService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly audit: AuditService,
  ) {}

  /** Generate a new TOTP secret + QR code + 10 recovery codes. Does NOT activate MFA yet. */
  async setupMfa(userId: number, ctx: { ip?: string; userAgent?: string } = {}) {
    const [user] = await this.db
      .select({ username: users.username, email: users.email, totpEnabled: users.totpEnabled })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) throw new UnauthorizedException();
    if (user.totpEnabled) throw new BadRequestException("MFA is already enabled.");

    const secret = generateSecret();
    const otpauth = generateURI({ issuer: APP_NAME, label: user.email ?? user.username, secret });
    const qrDataUrl = await qrcode.toDataURL(otpauth);

    // Store secret (not yet enabled — user must verify first)
    await this.db.update(users).set({ totpSecret: secret }).where(eq(users.id, userId));

    const { plainCodes } = await this.generateRecoveryCodes(userId);

    await this.audit.log("auth.mfa.setup_started", `user:${userId}`, { ...ctx, userId });
    return { qrDataUrl, secret, recoveryCodes: plainCodes };
  }

  /** Verify a TOTP code to activate MFA (confirm setup). */
  async verifyAndEnable(userId: number, code: string, ctx: { ip?: string; userAgent?: string } = {}) {
    const [user] = await this.db
      .select({ totpSecret: users.totpSecret, totpEnabled: users.totpEnabled })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user?.totpSecret) throw new BadRequestException("MFA setup not started. Call /auth/mfa/setup first.");
    if (user.totpEnabled) throw new BadRequestException("MFA is already enabled.");

    if (!verify({ token: code, secret: user.totpSecret })) {
      await this.audit.log("auth.mfa.verify.fail", `user:${userId}`, { ...ctx, userId });
      throw new UnauthorizedException("Invalid TOTP code.");
    }

    await this.db.update(users).set({ totpEnabled: 1 }).where(eq(users.id, userId));
    await this.audit.log("auth.mfa.enabled", `user:${userId}`, { ...ctx, userId });
    return { message: "MFA activé avec succès." };
  }

  /** Disable MFA — requires current password and a valid TOTP or recovery code. */
  async disableMfa(userId: number, password: string, code: string, ctx: { ip?: string; userAgent?: string } = {}) {
    const [user] = await this.db
      .select({ password: users.password, totpSecret: users.totpSecret, totpEnabled: users.totpEnabled })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) throw new UnauthorizedException();
    if (!user.totpEnabled) throw new BadRequestException("MFA is not enabled.");

    const passwordOk = await bcrypt.compare(password, user.password);
    if (!passwordOk) {
      await this.audit.log("auth.mfa.disable.fail", `user:${userId}`, { ...ctx, userId }, { reason: "bad_password" });
      throw new UnauthorizedException("Mot de passe incorrect.");
    }

    const totpOk = user.totpSecret ? verify({ token: code, secret: user.totpSecret }) : false;
    if (!totpOk) {
      // Try recovery code
      const consumed = await this.consumeRecoveryCode(userId, code);
      if (!consumed) {
        await this.audit.log("auth.mfa.disable.fail", `user:${userId}`, { ...ctx, userId }, { reason: "bad_code" });
        throw new UnauthorizedException("Code TOTP ou code de récupération invalide.");
      }
    }

    await this.db
      .update(users)
      .set({ totpEnabled: 0, totpSecret: null })
      .where(eq(users.id, userId));

    // Purge all recovery codes
    await this.db.delete(mfaRecoveryCodes).where(eq(mfaRecoveryCodes.userId, userId));

    await this.audit.log("auth.mfa.disabled", `user:${userId}`, { ...ctx, userId });
    return { message: "MFA désactivé." };
  }

  /** Verify a TOTP code (login step 2). Throws on failure. */
  async verifyTotpCode(userId: number, code: string, ctx: { ip?: string; userAgent?: string } = {}) {
    const [user] = await this.db
      .select({ totpSecret: users.totpSecret })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user?.totpSecret) throw new UnauthorizedException("MFA not configured.");

    const ok = verify({ token: code, secret: user.totpSecret });
    if (!ok) {
      await this.audit.log("auth.mfa.login.fail", `user:${userId}`, { ...ctx, userId }, { reason: "bad_totp" });
      throw new UnauthorizedException("Code TOTP invalide.");
    }
    await this.audit.log("auth.mfa.login.ok", `user:${userId}`, { ...ctx, userId });
  }

  /** Verify a recovery code (one-shot). Throws on failure. */
  async verifyRecoveryCode(userId: number, code: string, ctx: { ip?: string; userAgent?: string } = {}) {
    const consumed = await this.consumeRecoveryCode(userId, code);
    if (!consumed) {
      await this.audit.log("auth.mfa.login.fail", `user:${userId}`, { ...ctx, userId }, { reason: "bad_recovery" });
      throw new GoneException("Code de récupération invalide ou déjà utilisé.");
    }
    await this.audit.log("auth.mfa.recovery.used", `user:${userId}`, { ...ctx, userId });
  }

  private async generateRecoveryCodes(userId: number): Promise<{ plainCodes: string[] }> {
    // Delete any previous unused codes for this user
    await this.db.delete(mfaRecoveryCodes).where(eq(mfaRecoveryCodes.userId, userId));

    const plainCodes: string[] = [];
    const rows = [];
    for (let i = 0; i < RECOVERY_CODE_COUNT; i++) {
      // Format: XXXX-XXXX (8 hex chars grouped)
      const raw = randomBytes(4).toString("hex").toUpperCase();
      const plain = `${raw.slice(0, 4)}-${raw.slice(4)}`;
      plainCodes.push(plain);
      rows.push({ userId, codeHash: createHash("sha256").update(plain).digest("hex") });
    }
    await this.db.insert(mfaRecoveryCodes).values(rows);
    return { plainCodes };
  }

  private async consumeRecoveryCode(userId: number, code: string): Promise<boolean> {
    const hash = createHash("sha256").update(code.toUpperCase()).digest("hex");
    const [record] = await this.db
      .select({ id: mfaRecoveryCodes.id })
      .from(mfaRecoveryCodes)
      .where(
        and(
          eq(mfaRecoveryCodes.userId, userId),
          eq(mfaRecoveryCodes.codeHash, hash),
          isNull(mfaRecoveryCodes.usedAt),
        ),
      )
      .limit(1);

    if (!record) return false;

    await this.db
      .update(mfaRecoveryCodes)
      .set({ usedAt: new Date() })
      .where(eq(mfaRecoveryCodes.id, record.id));

    return true;
  }
}

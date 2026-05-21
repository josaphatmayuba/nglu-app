import { Inject, Injectable, Logger } from "@nestjs/common";
import { DRIZZLE } from "../database/database.constants";
import { auditLog } from "../database/schema";
import type { Database } from "../database/types";

/** Fields whose values are always replaced with [REDACTED] in audit metadata. */
const SENSITIVE_KEYS = new Set([
  "password",
  "token",
  "refreshToken",
  "refresh_token",
  "secret",
  "authorization",
  "creditCard",
  "totpSecret",
  "totp_secret",
  "apiKey",
  "api_key",
]);

function redact(obj: unknown, depth = 0): unknown {
  if (depth > 5 || obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map((v) => redact(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    out[k] = SENSITIVE_KEYS.has(k) ? "[REDACTED]" : redact(v, depth + 1);
  }
  return out;
}

export interface AuditContext {
  userId?: number;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async log(
    action: string,
    target: string | null,
    ctx: AuditContext,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const safeMetadata = metadata ? redact(metadata) : null;
    try {
      await this.db.insert(auditLog).values({
        userId: ctx.userId ?? null,
        action,
        target: target ?? null,
        ip: ctx.ip ?? null,
        userAgent: ctx.userAgent ? ctx.userAgent.substring(0, 512) : null,
        metadata: safeMetadata as Record<string, unknown> | null,
      });
    } catch (err) {
      // Audit failures must never break the main request flow.
      this.logger.error(`Failed to write audit log [${action}]: ${String(err)}`);
    }
  }
}

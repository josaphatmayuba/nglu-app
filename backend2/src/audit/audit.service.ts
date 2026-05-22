import { Inject, Injectable, Logger } from "@nestjs/common";
import { desc, gte, like, sql } from "drizzle-orm";
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

  async getLogs(opts: { page?: number; limit?: number; action?: string; startDate?: string } = {}) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, opts.limit ?? 50);
    const offset = (page - 1) * limit;

    const conditions: ReturnType<typeof like>[] = [];
    if (opts.action) conditions.push(like(auditLog.action, `%${opts.action}%`));
    if (opts.startDate) conditions.push(gte(auditLog.createdAt, new Date(opts.startDate)));

    const where = conditions.length > 0
      ? (conditions.length === 1 ? conditions[0] : sql`${conditions[0]} AND ${conditions[1]}`)
      : undefined;

    const [rows, [{ total }]] = await Promise.all([
      this.db.select().from(auditLog).where(where).orderBy(desc(auditLog.createdAt)).limit(limit).offset(offset),
      this.db.select({ total: sql<number>`COUNT(*)` }).from(auditLog).where(where),
    ]);

    return { data: rows, total: Number(total), page, limit };
  }
}

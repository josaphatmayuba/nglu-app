import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq, sql } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import { emailTemplates } from "../database/schema";
import type { Database } from "../database/types";

@Injectable()
export class EmailTemplatesService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  findAll() {
    return this.db.select().from(emailTemplates).where(eq(emailTemplates.status, "true")).orderBy(emailTemplates.name);
  }

  async findOne(id: number) {
    const rows = await this.db.select().from(emailTemplates).where(eq(emailTemplates.id, id)).limit(1);
    if (!rows.length) throw new NotFoundException("Email template not found");
    return rows[0];
  }

  async create(data: { name: string; subject: string; body: string; eventType?: string }) {
    const [result] = await this.db.insert(emailTemplates).values({ name: data.name, subject: data.subject, body: data.body, eventType: data.eventType ?? null, status: "true" });
    return this.findOne((result as any).insertId);
  }

  async update(id: number, data: { name?: string; subject?: string; body?: string; eventType?: string }) {
    await this.db.update(emailTemplates).set({ ...data, updatedAt: sql`CURRENT_TIMESTAMP` }).where(eq(emailTemplates.id, id));
    return this.findOne(id);
  }

  async remove(id: number) {
    await this.db.update(emailTemplates).set({ status: "false", updatedAt: sql`CURRENT_TIMESTAMP` }).where(eq(emailTemplates.id, id));
    return { message: "success" };
  }
}

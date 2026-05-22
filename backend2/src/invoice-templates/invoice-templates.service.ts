import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq, sql } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import { invoiceTemplates } from "../database/schema";
import type { Database } from "../database/types";

@Injectable()
export class InvoiceTemplatesService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  findAll() {
    return this.db.select().from(invoiceTemplates).where(eq(invoiceTemplates.status, "true")).orderBy(invoiceTemplates.name);
  }

  async findOne(id: number) {
    const rows = await this.db.select().from(invoiceTemplates).where(eq(invoiceTemplates.id, id)).limit(1);
    if (!rows.length) throw new NotFoundException("Invoice template not found");
    return rows[0];
  }

  async create(data: Record<string, unknown>) {
    const [result] = await this.db.insert(invoiceTemplates).values({ name: data.name as string, description: (data.description as string) ?? null, headerText: (data.headerText as string) ?? null, footerText: (data.footerText as string) ?? null, showLogo: data.showLogo !== false ? 1 : 0, showSignature: data.showSignature ? 1 : 0, colorScheme: (data.colorScheme as string) ?? "brand", status: "true" });
    return this.findOne((result as any).insertId);
  }

  async update(id: number, data: Record<string, unknown>) {
    const patch: Record<string, unknown> = { updatedAt: sql`CURRENT_TIMESTAMP` };
    const allowed = ["name", "description", "headerText", "footerText", "showLogo", "showSignature", "colorScheme"];
    for (const k of allowed) { if (k in data) patch[k] = data[k]; }
    await this.db.update(invoiceTemplates).set(patch as any).where(eq(invoiceTemplates.id, id));
    return this.findOne(id);
  }

  async remove(id: number) {
    await this.db.update(invoiceTemplates).set({ status: "false", updatedAt: sql`CURRENT_TIMESTAMP` }).where(eq(invoiceTemplates.id, id));
    return { message: "success" };
  }
}

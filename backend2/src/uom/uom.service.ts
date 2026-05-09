import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { count, desc, eq, sql } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import { uoms } from "../database/schema";
import type { Database } from "../database/types";
import { CreateUomDto, UpdateUomDto } from "./dto/uom.dto";

@Injectable()
export class UomService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findAll(query: Record<string, string>) {
    if (query["query"] === "all") {
      return this.db
        .select()
        .from(uoms)
        .where(eq(uoms.status, "true"))
        .orderBy(desc(uoms.id));
    }

    const { skip, limit } = this.pagination(query);
    const where = query["status"] ? eq(uoms.status, query["status"]) : undefined;

    const rows = await this.db
      .select()
      .from(uoms)
      .where(where)
      .orderBy(desc(uoms.id))
      .limit(limit)
      .offset(skip);

    const [{ total }] = await this.db
      .select({ total: count(uoms.id) })
      .from(uoms)
      .where(where);

    return { getAllUom: rows, totalUom: Number(total ?? 0) };
  }

  async findOne(id: number) {
    const rows = await this.db
      .select()
      .from(uoms)
      .where(eq(uoms.id, id))
      .limit(1);

    if (!rows.length) {
      throw new NotFoundException("UOM not found.");
    }

    return rows[0];
  }

  async create(input: CreateUomDto) {
    const [result] = await this.db.insert(uoms).values({
      name: input.name,
      status: "true",
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });

    return this.findOne(Number(result.insertId));
  }

  async update(id: number, input: UpdateUomDto) {
    await this.ensureExists(id);

    await this.db
      .update(uoms)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(uoms.id, id));

    return this.findOne(id);
  }

  async updateStatus(id: number, status: string) {
    await this.ensureExists(id);

    await this.db
      .update(uoms)
      .set({ status, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(uoms.id, id));

    return { message: "UOM status updated." };
  }

  private async ensureExists(id: number) {
    const rows = await this.db
      .select({ id: uoms.id })
      .from(uoms)
      .where(eq(uoms.id, id))
      .limit(1);

    if (!rows.length) {
      throw new NotFoundException("UOM not found.");
    }
  }

  private pagination(q: Record<string, string>) {
    const page = Number(q["page"] ?? 1);
    const cnt = Number(q["count"] ?? 10);
    return { skip: (page - 1) * cnt, limit: cnt };
  }
}

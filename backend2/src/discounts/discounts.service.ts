import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { count, desc, eq, sql } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import { discounts } from "../database/schema";
import type { Database } from "../database/types";
import { CreateDiscountDto, DiscountQueryDto, UpdateDiscountDto } from "./dto/discount.dto";

@Injectable()
export class DiscountsService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async create(input: CreateDiscountDto) {
    const [result] = await this.db.insert(discounts).values({
      value: input.value,
      type: input.type,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
      status: "true",
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });

    return this.findOne(Number(result.insertId));
  }

  async findAll(query: DiscountQueryDto) {
    if (query.query === "all") {
      return this.db.select().from(discounts).where(eq(discounts.status, "true")).orderBy(desc(discounts.id));
    }

    return this.paginated(query);
  }

  async findOne(id: number) {
    const rows = await this.db.select().from(discounts).where(eq(discounts.id, id)).limit(1);
    if (!rows.length) {
      throw new NotFoundException("Discount not found.");
    }
    return rows[0];
  }

  async update(id: number, input: UpdateDiscountDto) {
    await this.ensureDiscountExists(id);

    await this.db
      .update(discounts)
      .set({
        ...(input.value !== undefined ? { value: input.value } : {}),
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.startDate !== undefined ? { startDate: new Date(input.startDate) } : {}),
        ...(input.endDate !== undefined ? { endDate: new Date(input.endDate) } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(discounts.id, id));

    return this.findOne(id);
  }

  async updateStatus(id: number, status: string) {
    await this.ensureDiscountExists(id);

    await this.db
      .update(discounts)
      .set({ status, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(discounts.id, id));

    return { message: "Discount has been hided successfully." };
  }

  private async paginated(query: DiscountQueryDto) {
    const pagination = this.pagination(query);
    const status = query.status ?? "true";
    const rows = await this.db
      .select()
      .from(discounts)
      .where(eq(discounts.status, status))
      .orderBy(desc(discounts.id))
      .limit(pagination.limit)
      .offset(pagination.skip);
    const [total] = await this.db
      .select({ total: count(discounts.id) })
      .from(discounts)
      .where(eq(discounts.status, status));

    return {
      getAllDiscount: rows,
      totalDiscount: Number(total.total ?? 0),
    };
  }

  private async ensureDiscountExists(id: number) {
    const rows = await this.db.select({ id: discounts.id }).from(discounts).where(eq(discounts.id, id)).limit(1);
    if (!rows.length) {
      throw new NotFoundException("Discount not found.");
    }
  }

  private pagination(query: DiscountQueryDto) {
    const limit = Math.max(1, Number(query.limit || 10));
    const page = Math.max(1, Number(query.page || 1));
    return { limit, skip: (page - 1) * limit };
  }
}

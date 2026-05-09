import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, count, desc, eq, inArray, like, sql, sum } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import { productVats, transactions } from "../database/schema";
import type { Database } from "../database/types";
import { CreateProductVatDto, UpdateProductVatDto } from "./dto/product-vat.dto";

@Injectable()
export class ProductVatsService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findAll(query: Record<string, string>) {
    if (query["query"] === "all") {
      return this.db
        .select()
        .from(productVats)
        .orderBy(desc(productVats.id));
    }

    if (query["query"] === "info") {
      const [row] = await this.db
        .select({ total: count(productVats.id) })
        .from(productVats)
        .where(eq(productVats.status, "true"));
      return { _count: { id: Number(row.total ?? 0) } };
    }

    if (query["query"] === "search") {
      const key = `%${query["key"] ?? ""}%`;
      const { skip, limit } = this.pagination(query);
      const where = like(productVats.title, key);

      const rows = await this.db
        .select()
        .from(productVats)
        .where(where)
        .orderBy(desc(productVats.id))
        .limit(limit)
        .offset(skip);

      const [{ total }] = await this.db
        .select({ total: count(productVats.id) })
        .from(productVats)
        .where(where);

      return { getAllProductVat: rows, totalProductVat: Number(total ?? 0) };
    }

    const { skip, limit } = this.pagination(query);
    const where = query["status"] ? eq(productVats.status, query["status"]) : undefined;

    const rows = await this.db
      .select()
      .from(productVats)
      .where(where)
      .orderBy(desc(productVats.id))
      .limit(limit)
      .offset(skip);

    const [{ total }] = await this.db
      .select({ total: count(productVats.id) })
      .from(productVats)
      .where(where);

    return { getAllProductVat: rows, totalProductVat: Number(total ?? 0) };
  }

  async getStatement() {
    // VAT given: debitId=16, creditId=1
    const [given] = await this.db
      .select({ total: sum(transactions.amount) })
      .from(transactions)
      .where(
        and(
          inArray(transactions.debitId, [16]),
          inArray(transactions.creditId, [1]),
        ),
      );

    // VAT received: debitId=1, creditId=15
    const [received] = await this.db
      .select({ total: sum(transactions.amount) })
      .from(transactions)
      .where(
        and(
          inArray(transactions.debitId, [1]),
          inArray(transactions.creditId, [15]),
        ),
      );

    const totalVatGiven = Number(given.total ?? 0);
    const totalVatReceived = Number(received.total ?? 0);

    return {
      totalVatGiven,
      totalVatReceived,
      totalVat: totalVatGiven - totalVatReceived,
    };
  }

  async findOne(id: number) {
    const rows = await this.db
      .select()
      .from(productVats)
      .where(eq(productVats.id, id))
      .limit(1);

    if (!rows.length) {
      throw new NotFoundException("Product VAT not found.");
    }

    return rows[0];
  }

  async create(input: CreateProductVatDto) {
    const [result] = await this.db.insert(productVats).values({
      title: input.title,
      percentage: input.percentage,
      status: "true",
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });

    return this.findOne(Number(result.insertId));
  }

  async createMany(items: CreateProductVatDto[]) {
    await this.db.insert(productVats).values(
      items.map((item) => ({
        title: item.title,
        percentage: item.percentage,
        status: "true",
        createdAt: sql`CURRENT_TIMESTAMP`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })),
    );
    return { message: "Product VATs created successfully." };
  }

  async deleteMany(ids: number[]) {
    for (const id of ids) {
      await this.db.delete(productVats).where(eq(productVats.id, id));
    }
    return { message: "Product VATs deleted successfully." };
  }

  async update(id: number, input: UpdateProductVatDto) {
    await this.ensureExists(id);

    await this.db
      .update(productVats)
      .set({
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.percentage !== undefined ? { percentage: input.percentage } : {}),
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(productVats.id, id));

    return this.findOne(id);
  }

  async updateStatus(id: number, status: string) {
    await this.ensureExists(id);

    await this.db
      .update(productVats)
      .set({ status, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(productVats.id, id));

    return { message: "Product VAT status updated." };
  }

  private async ensureExists(id: number) {
    const rows = await this.db
      .select({ id: productVats.id })
      .from(productVats)
      .where(eq(productVats.id, id))
      .limit(1);

    if (!rows.length) {
      throw new NotFoundException("Product VAT not found.");
    }
  }

  private pagination(q: Record<string, string>) {
    const page = Number(q["page"] ?? 1);
    const cnt = Number(q["count"] ?? 10);
    return { skip: (page - 1) * cnt, limit: cnt };
  }
}

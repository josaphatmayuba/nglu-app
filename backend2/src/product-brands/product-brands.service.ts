import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { count, desc, eq, like, sql } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import { productBrands } from "../database/schema";
import type { Database } from "../database/types";
import { CreateProductBrandDto, UpdateProductBrandDto } from "./dto/product-brand.dto";

@Injectable()
export class ProductBrandsService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findPublic() {
    return this.db
      .select()
      .from(productBrands)
      .where(eq(productBrands.status, "true"))
      .orderBy(desc(productBrands.id));
  }

  async findAll(query: Record<string, string>) {
    if (query["query"] === "all") {
      return this.db
        .select()
        .from(productBrands)
        .orderBy(desc(productBrands.id));
    }

    if (query["query"] === "search") {
      const key = `%${query["key"] ?? ""}%`;
      const { skip, limit } = this.pagination(query);
      const where = like(productBrands.name, key);

      const rows = await this.db
        .select()
        .from(productBrands)
        .where(where)
        .orderBy(desc(productBrands.id))
        .limit(limit)
        .offset(skip);

      const [{ total }] = await this.db
        .select({ total: count(productBrands.id) })
        .from(productBrands)
        .where(where);

      return { getAllProductBrand: rows, totalProductBrand: Number(total ?? 0) };
    }

    const { skip, limit } = this.pagination(query);
    const where = query["status"] ? eq(productBrands.status, query["status"]) : undefined;

    const rows = await this.db
      .select()
      .from(productBrands)
      .where(where)
      .orderBy(desc(productBrands.id))
      .limit(limit)
      .offset(skip);

    const [{ total }] = await this.db
      .select({ total: count(productBrands.id) })
      .from(productBrands)
      .where(where);

    return { getAllProductBrand: rows, totalProductBrand: Number(total ?? 0) };
  }

  async findOne(id: number) {
    const rows = await this.db
      .select()
      .from(productBrands)
      .where(eq(productBrands.id, id))
      .limit(1);

    if (!rows.length) {
      throw new NotFoundException("Product brand not found.");
    }

    return rows[0];
  }

  async create(input: CreateProductBrandDto) {
    const [result] = await this.db.insert(productBrands).values({
      name: input.name,
      status: "true",
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });

    return this.findOne(Number(result.insertId));
  }

  async update(id: number, input: UpdateProductBrandDto) {
    await this.ensureExists(id);

    await this.db
      .update(productBrands)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(productBrands.id, id));

    return this.findOne(id);
  }

  async updateStatus(id: number, status: string) {
    await this.ensureExists(id);

    await this.db
      .update(productBrands)
      .set({ status, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(productBrands.id, id));

    return { message: "Product brand status updated." };
  }

  private async ensureExists(id: number) {
    const rows = await this.db
      .select({ id: productBrands.id })
      .from(productBrands)
      .where(eq(productBrands.id, id))
      .limit(1);

    if (!rows.length) {
      throw new NotFoundException("Product brand not found.");
    }
  }

  private pagination(q: Record<string, string>) {
    const page = Number(q["page"] ?? 1);
    const cnt = Number(q["count"] ?? 10);
    return { skip: (page - 1) * cnt, limit: cnt };
  }
}

import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { count, desc, eq, like, sql } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import { productCategories, productSubCategories } from "../database/schema";
import type { Database } from "../database/types";
import { CreateProductCategoryDto, UpdateProductCategoryDto } from "./dto/product-category.dto";

@Injectable()
export class ProductCategoriesService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findPublic() {
    const cats = await this.db
      .select()
      .from(productCategories)
      .orderBy(desc(productCategories.id));

    const subCats = await this.db
      .select()
      .from(productSubCategories)
      .where(eq(productSubCategories.status, "true"));

    return cats.map((cat) => ({
      ...cat,
      subCategories: subCats.filter((sc) => sc.productCategoryId === cat.id),
    }));
  }

  async findAll(query: Record<string, string>) {
    if (query["query"] === "all") {
      return this.db
        .select()
        .from(productCategories)
        .orderBy(desc(productCategories.id));
    }

    if (query["query"] === "search") {
      const key = `%${query["key"] ?? ""}%`;
      const { skip, limit } = this.pagination(query);
      const where = like(productCategories.name, key);

      const rows = await this.db
        .select()
        .from(productCategories)
        .where(where)
        .orderBy(desc(productCategories.id))
        .limit(limit)
        .offset(skip);

      const [{ total }] = await this.db
        .select({ total: count(productCategories.id) })
        .from(productCategories)
        .where(where);

      return { getAllProductCategory: rows, totalProductCategory: Number(total ?? 0) };
    }

    const { skip, limit } = this.pagination(query);
    const where = undefined;

    const rows = await this.db
      .select()
      .from(productCategories)
      .where(where)
      .orderBy(desc(productCategories.id))
      .limit(limit)
      .offset(skip);

    const [{ total }] = await this.db
      .select({ total: count(productCategories.id) })
      .from(productCategories)
      .where(where);

    return { getAllProductCategory: rows, totalProductCategory: Number(total ?? 0) };
  }

  async findOne(id: number) {
    const rows = await this.db
      .select()
      .from(productCategories)
      .where(eq(productCategories.id, id))
      .limit(1);

    if (!rows.length) {
      throw new NotFoundException("Product category not found.");
    }

    return rows[0];
  }

  async create(input: CreateProductCategoryDto) {
    const [result] = await this.db.insert(productCategories).values({
      name: input.name,
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });

    return this.findOne(Number(result.insertId));
  }

  async createMany(items: CreateProductCategoryDto[]) {
    await this.db.insert(productCategories).values(
      items.map((item) => ({
        name: item.name,
        createdAt: sql`CURRENT_TIMESTAMP`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })),
    );
    return { message: "Product categories created successfully." };
  }

  async deleteMany(ids: number[]) {
    for (const id of ids) {
      await this.db.delete(productCategories).where(eq(productCategories.id, id));
    }
    return { message: "Product categories deleted successfully." };
  }

  async update(id: number, input: UpdateProductCategoryDto) {
    await this.ensureExists(id);

    await this.db
      .update(productCategories)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(productCategories.id, id));

    return this.findOne(id);
  }

  async updateStatus(id: number, _status: string) {
    await this.ensureExists(id);

    await this.db
      .update(productCategories)
      .set({ updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(productCategories.id, id));

    return { message: "Product category status updated." };
  }

  private async ensureExists(id: number) {
    const rows = await this.db
      .select({ id: productCategories.id })
      .from(productCategories)
      .where(eq(productCategories.id, id))
      .limit(1);

    if (!rows.length) {
      throw new NotFoundException("Product category not found.");
    }
  }

  private pagination(q: Record<string, string>) {
    const page = Number(q["page"] ?? 1);
    const cnt = Number(q["count"] ?? 10);
    return { skip: (page - 1) * cnt, limit: cnt };
  }
}

import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { count, desc, eq, like, sql } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import { productCategories, productSubCategories } from "../database/schema";
import type { Database } from "../database/types";
import {
  CreateProductSubCategoryDto,
  UpdateProductSubCategoryDto,
} from "./dto/product-sub-category.dto";

@Injectable()
export class ProductSubCategoriesService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findPublic() {
    return this.db
      .select({
        id: productSubCategories.id,
        name: productSubCategories.name,
        productCategoryId: productSubCategories.productCategoryId,
        status: productSubCategories.status,
        createdAt: productSubCategories.createdAt,
        updatedAt: productSubCategories.updatedAt,
        categoryName: productCategories.name,
      })
      .from(productSubCategories)
      .leftJoin(
        productCategories,
        eq(productCategories.id, productSubCategories.productCategoryId),
      )
      .where(eq(productSubCategories.status, "true"))
      .orderBy(desc(productSubCategories.id));
  }

  async findAll(query: Record<string, string>) {
    if (query["query"] === "all") {
      return this.baseQuery().orderBy(desc(productSubCategories.id));
    }

    if (query["query"] === "search") {
      const key = `%${query["key"] ?? ""}%`;
      const { skip, limit } = this.pagination(query);
      const where = like(productSubCategories.name, key);

      const rows = await this.baseQuery()
        .where(where)
        .orderBy(desc(productSubCategories.id))
        .limit(limit)
        .offset(skip);

      const [{ total }] = await this.db
        .select({ total: count(productSubCategories.id) })
        .from(productSubCategories)
        .where(where);

      return {
        getAllProductSubCategory: rows,
        totalProductSubCategory: Number(total ?? 0),
      };
    }

    const { skip, limit } = this.pagination(query);
    const where = query["status"] ? eq(productSubCategories.status, query["status"]) : undefined;

    const rows = await this.baseQuery()
      .where(where)
      .orderBy(desc(productSubCategories.id))
      .limit(limit)
      .offset(skip);

    const [{ total }] = await this.db
      .select({ total: count(productSubCategories.id) })
      .from(productSubCategories)
      .where(where);

    return {
      getAllProductSubCategory: rows,
      totalProductSubCategory: Number(total ?? 0),
    };
  }

  async findOne(id: number) {
    const rows = await this.baseQuery()
      .where(eq(productSubCategories.id, id))
      .limit(1);

    if (!rows.length) {
      throw new NotFoundException("Product sub-category not found.");
    }

    return rows[0];
  }

  async create(input: CreateProductSubCategoryDto) {
    const [result] = await this.db.insert(productSubCategories).values({
      name: input.name,
      productCategoryId: input.productCategoryId,
      status: "true",
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });

    return this.findOne(Number(result.insertId));
  }

  async update(id: number, input: UpdateProductSubCategoryDto) {
    await this.ensureExists(id);

    await this.db
      .update(productSubCategories)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.productCategoryId !== undefined
          ? { productCategoryId: input.productCategoryId }
          : {}),
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(productSubCategories.id, id));

    return this.findOne(id);
  }

  async updateStatus(id: number, status: string) {
    await this.ensureExists(id);

    await this.db
      .update(productSubCategories)
      .set({ status, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(productSubCategories.id, id));

    return { message: "Product sub-category status updated." };
  }

  private baseQuery() {
    return this.db
      .select({
        id: productSubCategories.id,
        name: productSubCategories.name,
        productCategoryId: productSubCategories.productCategoryId,
        status: productSubCategories.status,
        createdAt: productSubCategories.createdAt,
        updatedAt: productSubCategories.updatedAt,
        categoryName: productCategories.name,
      })
      .from(productSubCategories)
      .leftJoin(
        productCategories,
        eq(productCategories.id, productSubCategories.productCategoryId),
      );
  }

  private async ensureExists(id: number) {
    const rows = await this.db
      .select({ id: productSubCategories.id })
      .from(productSubCategories)
      .where(eq(productSubCategories.id, id))
      .limit(1);

    if (!rows.length) {
      throw new NotFoundException("Product sub-category not found.");
    }
  }

  private pagination(q: Record<string, string>) {
    const page = Number(q["page"] ?? 1);
    const cnt = Number(q["count"] ?? 10);
    return { skip: (page - 1) * cnt, limit: cnt };
  }
}

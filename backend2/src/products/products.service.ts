import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, count, desc, eq, inArray, like, or, sql } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import {
  productBrands,
  productSubCategories,
  productVats,
  products,
  uoms,
} from "../database/schema";
import type { Database } from "../database/types";
import { CreateProductDto, UpdateProductDto } from "./dto/product.dto";

@Injectable()
export class ProductsService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findPublic() {
    return this.publicQuery().where(eq(products.status, "true")).orderBy(desc(products.id));
  }

  async findPublicOne(id: number) {
    const rows = await this.publicQuery().where(eq(products.id, id)).limit(1);

    if (!rows.length) {
      throw new NotFoundException("Product not found.");
    }

    return rows[0];
  }

  async findAll(query: Record<string, string>) {
    if (query["query"] === "all") {
      return this.baseQuery().orderBy(desc(products.id));
    }

    if (query["query"] === "sku") {
      const [product] = await this.db
        .select({ id: products.id })
        .from(products)
        .where(eq(products.sku, query["key"] ?? ""))
        .limit(1);

      return { status: product ? "true" : "false" };
    }

    if (query["query"] === "name") {
      const [product] = await this.db
        .select({ id: products.id })
        .from(products)
        .where(eq(products.name, query["key"] ?? ""))
        .limit(1);

      return { status: product ? "true" : "false" };
    }

    if (query["query"] === "info") {
      const [{ total }] = await this.db
        .select({ total: count(products.id) })
        .from(products)
        .where(eq(products.status, "true"));

      return { _count: { id: Number(total ?? 0) } };
    }

    if (query["query"] === "card") {
      const [card] = await this.db
        .select({
          totalProductCount: count(products.id),
          uniqueProduct: sql<number>`SUM(CASE WHEN ${products.productQuantity} > 0 THEN 1 ELSE 0 END)`,
          inventorySalesValue: sql<number>`COALESCE(SUM(${products.productSalePrice}), 0)`,
          inventoryPurchaseValue: sql<number>`COALESCE(SUM(${products.productPurchasePrice}), 0)`,
          shortProductCount: sql<number>`SUM(CASE WHEN ${products.productQuantity} <= ${products.reorderQuantity} THEN 1 ELSE 0 END)`,
        })
        .from(products)
        .where(eq(products.status, "true"));

      return {
        uniqueProduct: Number(card?.uniqueProduct ?? 0),
        totalProductCount: Number(card?.totalProductCount ?? 0),
        inventorySalesValue: Number(card?.inventorySalesValue ?? 0),
        inventoryPurchaseValue: Number(card?.inventoryPurchaseValue ?? 0),
        shortProductCount: Number(card?.shortProductCount ?? 0),
      };
    }

    if (query["query"] === "search") {
      const key = `%${query["key"] ?? ""}%`;
      const { skip, limit } = this.pagination(query);
      const where = or(like(products.name, key), like(products.sku, key));

      const rows = await this.baseQuery()
        .where(where)
        .orderBy(desc(products.id))
        .limit(limit)
        .offset(skip);

      const [{ total }] = await this.db
        .select({ total: count(products.id) })
        .from(products)
        .where(where);

      return { getAllProduct: rows, totalProduct: Number(total ?? 0) };
    }

    if (query["query"] === "report") {
      const rows = await this.baseQuery()
        .where(eq(products.status, "true"))
        .orderBy(desc(products.id));

      const getAllProduct = rows.map((product) => ({
        ...product,
        totalSalePrice: Number(product.productQuantity ?? 0) * Number(product.productSalePrice ?? 0),
        totalPurchasePrice:
          Number(product.productQuantity ?? 0) * Number(product.productPurchasePrice ?? 0),
      }));

      return {
        aggregations: {
          _count: { id: getAllProduct.length },
          _sum: {
            totalProductQuantity: getAllProduct.reduce(
              (sum, product) => sum + Number(product.productQuantity ?? 0),
              0,
            ),
            totalSalePrice: getAllProduct.reduce(
              (sum, product) => sum + product.totalSalePrice,
              0,
            ),
            totalPurchasePrice: getAllProduct.reduce(
              (sum, product) => sum + product.totalPurchasePrice,
              0,
            ),
          },
        },
        getAllProduct,
      };
    }

    const { skip, limit } = this.pagination(query);
    const where = this.listWhere(query);

    const rows = await this.baseQuery()
      .where(where)
      .orderBy(desc(products.id))
      .limit(limit)
      .offset(skip);

    const [{ total }] = await this.db
      .select({ total: count(products.id) })
      .from(products)
      .where(where);

    return { getAllProduct: rows, totalProduct: Number(total ?? 0) };
  }

  async findOne(id: number) {
    const rows = await this.baseQuery().where(eq(products.id, id)).limit(1);

    if (!rows.length) {
      throw new NotFoundException("Product not found.");
    }

    return rows[0];
  }

  async create(input: CreateProductDto) {
    const [result] = await this.db.insert(products).values({
      name: input.name,
      productSubCategoryId: input.productSubCategoryId ?? null,
      productBrandId: input.productBrandId ?? null,
      description: input.description ?? null,
      sku: input.sku ?? null,
      productQuantity: input.productQuantity ?? 0,
      productSalePrice: input.productSalePrice ?? 0,
      productPurchasePrice: input.productPurchasePrice ?? 0,
      uomId: input.uomId ?? null,
      uomValue: input.uomValue ?? null,
      reorderQuantity: input.reorderQuantity ?? 0,
      productVatId: input.productVatId ?? null,
      discountId: input.discountId ?? null,
      productThumbnailImage: input.productThumbnailImage ?? null,
      status: "true",
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });

    return this.findOne(Number(result.insertId));
  }

  async createMany(items: CreateProductDto[]) {
    await this.db.insert(products).values(
      items.map((item) => ({
        name: item.name,
        productSubCategoryId: item.productSubCategoryId ?? null,
        productBrandId: item.productBrandId ?? null,
        description: item.description ?? null,
        sku: item.sku ?? null,
        productQuantity: item.productQuantity ?? 0,
        productSalePrice: item.productSalePrice ?? 0,
        productPurchasePrice: item.productPurchasePrice ?? 0,
        uomId: item.uomId ?? null,
        uomValue: item.uomValue ?? null,
        reorderQuantity: item.reorderQuantity ?? 0,
        productVatId: item.productVatId ?? null,
        discountId: item.discountId ?? null,
        productThumbnailImage: item.productThumbnailImage ?? null,
        status: "true",
        createdAt: sql`CURRENT_TIMESTAMP`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })),
    );
    return { message: "Products created successfully." };
  }

  async deleteMany(ids: number[]) {
    await this.db
      .update(products)
      .set({ status: "false", updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(inArray(products.id, ids));
    return { message: "Products deleted successfully." };
  }

  async update(id: number, input: UpdateProductDto) {
    await this.ensureExists(id);

    const updateData: Record<string, unknown> = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.productSubCategoryId !== undefined) updateData.productSubCategoryId = input.productSubCategoryId;
    if (input.productBrandId !== undefined) updateData.productBrandId = input.productBrandId;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.sku !== undefined) updateData.sku = input.sku;
    if (input.productQuantity !== undefined) updateData.productQuantity = input.productQuantity;
    if (input.productSalePrice !== undefined) updateData.productSalePrice = input.productSalePrice;
    if (input.productPurchasePrice !== undefined) updateData.productPurchasePrice = input.productPurchasePrice;
    if (input.uomId !== undefined) updateData.uomId = input.uomId;
    if (input.uomValue !== undefined) updateData.uomValue = input.uomValue;
    if (input.reorderQuantity !== undefined) updateData.reorderQuantity = input.reorderQuantity;
    if (input.productVatId !== undefined) updateData.productVatId = input.productVatId;
    if (input.discountId !== undefined) updateData.discountId = input.discountId;
    if (input.productThumbnailImage !== undefined) updateData.productThumbnailImage = input.productThumbnailImage;
    updateData.updatedAt = sql`CURRENT_TIMESTAMP`;

    await this.db.update(products).set(updateData).where(eq(products.id, id));

    return this.findOne(id);
  }

  async updateStatus(id: number, status: string) {
    await this.ensureExists(id);

    await this.db
      .update(products)
      .set({ status, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(products.id, id));

    return { message: "Product status updated." };
  }

  async getProductOrThrow(id: number) {
    const rows = await this.db
      .select({
        id: products.id,
        productQuantity: products.productQuantity,
        productPurchasePrice: products.productPurchasePrice,
        productSalePrice: products.productSalePrice,
      })
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    if (!rows.length) {
      throw new BadRequestException(`Product with id ${id} not found.`);
    }

    return rows[0];
  }

  async decreaseStock(id: number, quantity: number) {
    const product = await this.getProductOrThrow(id);
    const newQty = (product.productQuantity ?? 0) - quantity;

    if (newQty < 0) {
      throw new BadRequestException(
        `Insufficient stock for product ${id}. Available: ${product.productQuantity}, Requested: ${quantity}`,
      );
    }

    await this.db
      .update(products)
      .set({ productQuantity: newQty, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(products.id, id));
  }

  async increaseStock(id: number, quantity: number, newPurchasePrice: number) {
    const product = await this.getProductOrThrow(id);
    const currentQty = product.productQuantity ?? 0;
    const currentPrice = product.productPurchasePrice ?? 0;

    const totalQty = currentQty + quantity;
    const newAvgPrice =
      totalQty > 0
        ? (currentQty * currentPrice + quantity * newPurchasePrice) / totalQty
        : newPurchasePrice;

    await this.db
      .update(products)
      .set({
        productQuantity: totalQty,
        productPurchasePrice: newAvgPrice,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(products.id, id));
  }

  private publicQuery() {
    return this.db
      .select({
        id: products.id,
        name: products.name,
        productThumbnailImage: products.productThumbnailImage,
        productSubCategoryId: products.productSubCategoryId,
        productBrandId: products.productBrandId,
        description: products.description,
        sku: products.sku,
        productQuantity: products.productQuantity,
        productSalePrice: products.productSalePrice,
        productPurchasePrice: products.productPurchasePrice,
        uomId: products.uomId,
        uomValue: products.uomValue,
        reorderQuantity: products.reorderQuantity,
        productVatId: products.productVatId,
        discountId: products.discountId,
        status: products.status,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        subCategoryName: productSubCategories.name,
        brandName: productBrands.name,
      })
      .from(products)
      .leftJoin(
        productSubCategories,
        eq(productSubCategories.id, products.productSubCategoryId),
      )
      .leftJoin(productBrands, eq(productBrands.id, products.productBrandId));
  }

  private baseQuery() {
    return this.db
      .select({
        id: products.id,
        name: products.name,
        productThumbnailImage: products.productThumbnailImage,
        productSubCategoryId: products.productSubCategoryId,
        productBrandId: products.productBrandId,
        description: products.description,
        sku: products.sku,
        productQuantity: products.productQuantity,
        productSalePrice: products.productSalePrice,
        productPurchasePrice: products.productPurchasePrice,
        uomId: products.uomId,
        uomValue: products.uomValue,
        reorderQuantity: products.reorderQuantity,
        productVatId: products.productVatId,
        discountId: products.discountId,
        status: products.status,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        subCategoryName: productSubCategories.name,
        brandName: productBrands.name,
        vatTitle: productVats.title,
        uomName: uoms.name,
      })
      .from(products)
      .leftJoin(
        productSubCategories,
        eq(productSubCategories.id, products.productSubCategoryId),
      )
      .leftJoin(productBrands, eq(productBrands.id, products.productBrandId))
      .leftJoin(productVats, eq(productVats.id, products.productVatId))
      .leftJoin(uoms, eq(uoms.id, products.uomId));
  }

  private async ensureExists(id: number) {
    const rows = await this.db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    if (!rows.length) {
      throw new NotFoundException("Product not found.");
    }
  }

  private pagination(q: Record<string, string>) {
    const page = Number(q["page"] ?? 1);
    const cnt = Number(q["count"] ?? 10);
    return { skip: (page - 1) * cnt, limit: cnt };
  }

  private listWhere(query: Record<string, string>) {
    const conditions = [
      this.csvCondition(query["productSubCategoryId"], products.productSubCategoryId),
      this.csvCondition(query["productBrandId"], products.productBrandId),
      this.csvCondition(query["uomId"], products.uomId),
      this.csvCondition(query["status"], products.status),
    ].filter((condition): condition is NonNullable<typeof condition> => Boolean(condition));

    return conditions.length ? and(...conditions) : undefined;
  }

  private csvCondition(value: string | undefined, column: unknown) {
    if (!value) {
      return undefined;
    }

    const values = value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (!values.length) {
      return undefined;
    }

    if (values.length === 1) {
      return eq(column as never, values[0] as never);
    }

    return inArray(column as never, values as never[]);
  }
}

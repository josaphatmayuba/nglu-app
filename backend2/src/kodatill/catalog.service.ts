import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, desc, eq, like, ne, or, sql } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import { ktCategories, ktProducts } from "../database/schema";
import type { Database } from "../database/types";
import { CreateCategoryDto, CreateProductDto, UpdateCategoryDto, UpdateProductDto } from "./dto/catalog.dto";

@Injectable()
export class CatalogService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  // ─── Categories ──────────────────────────────────────────────────────────

  async listCategories(orgId: number) {
    return this.db
      .select()
      .from(ktCategories)
      .where(and(eq(ktCategories.organizationId, orgId), eq(ktCategories.status, "true")))
      .orderBy(asc(ktCategories.sortOrder), desc(ktCategories.id));
  }

  async findCategory(id: number, orgId: number) {
    const rows = await this.db
      .select()
      .from(ktCategories)
      .where(and(eq(ktCategories.id, id), eq(ktCategories.organizationId, orgId)))
      .limit(1);
    if (!rows.length) throw new NotFoundException("Categorie introuvable.");
    return rows[0];
  }

  async createCategory(input: CreateCategoryDto, orgId: number) {
    const [result] = await this.db.insert(ktCategories).values({
      organizationId: orgId,
      name: input.name,
      icon: input.icon,
      colorClass: input.colorClass,
      sortOrder: input.sortOrder ?? 0,
      parentId: input.parentId,
    });
    return this.findCategory(Number(result.insertId), orgId);
  }

  async updateCategory(id: number, input: UpdateCategoryDto, orgId: number) {
    await this.findCategory(id, orgId);

    await this.db
      .update(ktCategories)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.icon !== undefined ? { icon: input.icon } : {}),
        ...(input.colorClass !== undefined ? { colorClass: input.colorClass } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
        ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
      })
      .where(and(eq(ktCategories.id, id), eq(ktCategories.organizationId, orgId)));

    return this.findCategory(id, orgId);
  }

  async removeCategory(id: number, orgId: number) {
    await this.findCategory(id, orgId);
    await this.db
      .update(ktCategories)
      .set({ status: "false" })
      .where(and(eq(ktCategories.id, id), eq(ktCategories.organizationId, orgId)));
    return { message: "Categorie desactivee." };
  }

  // ─── Products ────────────────────────────────────────────────────────────

  async listProducts(orgId: number, filter: { categoryId?: string; search?: string }) {
    const conditions = [eq(ktProducts.organizationId, orgId), eq(ktProducts.status, "true")];

    if (filter.categoryId) {
      const catId = Number(filter.categoryId);
      if (Number.isInteger(catId)) conditions.push(eq(ktProducts.categoryId, catId));
    }

    if (filter.search) {
      const like_ = `%${filter.search}%`;
      conditions.push(
        or(
          like(ktProducts.name, like_),
          like(ktProducts.sku, like_),
          like(ktProducts.barcode, like_),
        )!,
      );
    }

    return this.db
      .select()
      .from(ktProducts)
      .where(and(...conditions))
      .orderBy(desc(ktProducts.id));
  }

  async findProduct(id: number, orgId: number) {
    const rows = await this.db
      .select()
      .from(ktProducts)
      .where(and(eq(ktProducts.id, id), eq(ktProducts.organizationId, orgId)))
      .limit(1);
    if (!rows.length) throw new NotFoundException("Produit introuvable.");
    return rows[0];
  }

  async findByBarcode(code: string, orgId: number) {
    const rows = await this.db
      .select()
      .from(ktProducts)
      .where(
        and(
          eq(ktProducts.organizationId, orgId),
          eq(ktProducts.barcode, code),
          eq(ktProducts.status, "true"),
        ),
      )
      .limit(1);
    if (!rows.length) throw new NotFoundException("Aucun produit pour ce code-barres.");
    return rows[0];
  }

  /**
   * Unicite du barcode par organisation, verifiee cote service (pas de contrainte
   * UNIQUE en DB — choix fait en migration 0237 pour eviter un crash sur doublons
   * existants). excludeId permet d'ignorer le produit courant lors d'un update.
   */
  private async assertBarcodeAvailable(barcode: string | undefined, orgId: number, excludeId?: number) {
    if (!barcode) return;

    const conditions = [
      eq(ktProducts.organizationId, orgId),
      eq(ktProducts.barcode, barcode),
      eq(ktProducts.status, "true"),
    ];
    if (excludeId !== undefined) conditions.push(ne(ktProducts.id, excludeId));

    const rows = await this.db
      .select({ id: ktProducts.id })
      .from(ktProducts)
      .where(and(...conditions))
      .limit(1);

    if (rows.length) {
      throw new ConflictException(`Le code-barres "${barcode}" est deja utilise par un autre produit.`);
    }
  }

  async createProduct(input: CreateProductDto, orgId: number) {
    await this.assertBarcodeAvailable(input.barcode, orgId);

    const [result] = await this.db.insert(ktProducts).values({
      organizationId: orgId,
      categoryId: input.categoryId,
      name: input.name,
      description: input.description,
      sku: input.sku,
      barcode: input.barcode,
      photoUrl: input.photoUrl,
      emojiFallback: input.emojiFallback,
      salePrice: input.salePrice.toFixed(2),
      purchaseCost: input.purchaseCost !== undefined ? input.purchaseCost.toFixed(2) : undefined,
      currencyCode: input.currencyCode,
      costMode: input.costMode,
      isAvailable: input.isAvailable === false ? 0 : 1,
      trackStock: input.trackStock ? 1 : 0,
    });

    return this.findProduct(Number(result.insertId), orgId);
  }

  async updateProduct(id: number, input: UpdateProductDto, orgId: number) {
    await this.findProduct(id, orgId);

    if (input.barcode !== undefined) {
      await this.assertBarcodeAvailable(input.barcode, orgId, id);
    }

    await this.db
      .update(ktProducts)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
        ...(input.sku !== undefined ? { sku: input.sku } : {}),
        ...(input.barcode !== undefined ? { barcode: input.barcode } : {}),
        ...(input.photoUrl !== undefined ? { photoUrl: input.photoUrl } : {}),
        ...(input.emojiFallback !== undefined ? { emojiFallback: input.emojiFallback } : {}),
        ...(input.salePrice !== undefined ? { salePrice: input.salePrice.toFixed(2) } : {}),
        ...(input.purchaseCost !== undefined ? { purchaseCost: input.purchaseCost.toFixed(2) } : {}),
        ...(input.currencyCode !== undefined ? { currencyCode: input.currencyCode } : {}),
        ...(input.costMode !== undefined ? { costMode: input.costMode } : {}),
        ...(input.isAvailable !== undefined ? { isAvailable: input.isAvailable ? 1 : 0 } : {}),
        ...(input.trackStock !== undefined ? { trackStock: input.trackStock ? 1 : 0 } : {}),
      })
      .where(and(eq(ktProducts.id, id), eq(ktProducts.organizationId, orgId)));

    return this.findProduct(id, orgId);
  }

  async removeProduct(id: number, orgId: number) {
    await this.findProduct(id, orgId);
    await this.db
      .update(ktProducts)
      .set({ status: "false" })
      .where(and(eq(ktProducts.id, id), eq(ktProducts.organizationId, orgId)));
    return { message: "Produit desactive." };
  }
}

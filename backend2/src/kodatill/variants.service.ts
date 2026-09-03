import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq, inArray } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import {
  ktModifierGroups,
  ktModifiers,
  ktProductModifierGroups,
  ktProducts,
  ktProductVariants,
} from "../database/schema";
import type { Database } from "../database/types";
import {
  CreateModifierDto,
  CreateModifierGroupDto,
  CreateVariantDto,
  SetProductModifierGroupsDto,
  UpdateModifierDto,
  UpdateModifierGroupDto,
  UpdateVariantDto,
} from "./dto/variants.dto";

@Injectable()
export class VariantsService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  private async assertProduct(productId: number, orgId: number) {
    const rows = await this.db
      .select({ id: ktProducts.id })
      .from(ktProducts)
      .where(and(eq(ktProducts.id, productId), eq(ktProducts.organizationId, orgId)))
      .limit(1);
    if (!rows.length) throw new NotFoundException("Produit introuvable.");
  }

  // ─── Variants ────────────────────────────────────────────────────────────

  async listVariants(productId: number, orgId: number) {
    await this.assertProduct(productId, orgId);
    return this.db
      .select()
      .from(ktProductVariants)
      .where(
        and(
          eq(ktProductVariants.productId, productId),
          eq(ktProductVariants.organizationId, orgId),
          eq(ktProductVariants.status, "true"),
        ),
      )
      .orderBy(ktProductVariants.id);
  }

  private async findVariant(id: number, orgId: number) {
    const rows = await this.db
      .select()
      .from(ktProductVariants)
      .where(and(eq(ktProductVariants.id, id), eq(ktProductVariants.organizationId, orgId)))
      .limit(1);
    if (!rows.length) throw new NotFoundException("Variante introuvable.");
    return rows[0];
  }

  async createVariant(productId: number, input: CreateVariantDto, orgId: number) {
    await this.assertProduct(productId, orgId);

    const [result] = await this.db.insert(ktProductVariants).values({
      organizationId: orgId,
      productId,
      name: input.name,
      priceDelta: input.priceDelta !== undefined ? input.priceDelta.toFixed(2) : undefined,
      sku: input.sku,
      barcode: input.barcode,
    });

    return this.findVariant(Number(result.insertId), orgId);
  }

  async updateVariant(id: number, input: UpdateVariantDto, orgId: number) {
    await this.findVariant(id, orgId);

    await this.db
      .update(ktProductVariants)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.priceDelta !== undefined ? { priceDelta: input.priceDelta.toFixed(2) } : {}),
        ...(input.sku !== undefined ? { sku: input.sku } : {}),
        ...(input.barcode !== undefined ? { barcode: input.barcode } : {}),
      })
      .where(and(eq(ktProductVariants.id, id), eq(ktProductVariants.organizationId, orgId)));

    return this.findVariant(id, orgId);
  }

  async removeVariant(id: number, orgId: number) {
    await this.findVariant(id, orgId);
    await this.db
      .update(ktProductVariants)
      .set({ status: "false" })
      .where(and(eq(ktProductVariants.id, id), eq(ktProductVariants.organizationId, orgId)));
    return { message: "Variante desactivee." };
  }

  // ─── Modifier groups ─────────────────────────────────────────────────────

  async listModifierGroups(orgId: number) {
    const groups = await this.db
      .select()
      .from(ktModifierGroups)
      .where(and(eq(ktModifierGroups.organizationId, orgId), eq(ktModifierGroups.status, "true")))
      .orderBy(ktModifierGroups.id);

    if (!groups.length) return [];

    const groupIds = groups.map((g) => g.id);
    const modifiers = await this.db
      .select()
      .from(ktModifiers)
      .where(
        and(
          eq(ktModifiers.organizationId, orgId),
          eq(ktModifiers.status, "true"),
          inArray(ktModifiers.groupId, groupIds),
        ),
      )
      .orderBy(ktModifiers.id);

    return groups.map((group) => ({
      ...group,
      modifiers: modifiers.filter((m) => m.groupId === group.id),
    }));
  }

  private async findModifierGroup(id: number, orgId: number) {
    const rows = await this.db
      .select()
      .from(ktModifierGroups)
      .where(and(eq(ktModifierGroups.id, id), eq(ktModifierGroups.organizationId, orgId)))
      .limit(1);
    if (!rows.length) throw new NotFoundException("Groupe de modificateurs introuvable.");
    return rows[0];
  }

  async createModifierGroup(input: CreateModifierGroupDto, orgId: number) {
    const [result] = await this.db.insert(ktModifierGroups).values({
      organizationId: orgId,
      name: input.name,
      minSelect: input.minSelect ?? 0,
      maxSelect: input.maxSelect ?? 1,
    });
    return this.findModifierGroup(Number(result.insertId), orgId);
  }

  async updateModifierGroup(id: number, input: UpdateModifierGroupDto, orgId: number) {
    await this.findModifierGroup(id, orgId);

    await this.db
      .update(ktModifierGroups)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.minSelect !== undefined ? { minSelect: input.minSelect } : {}),
        ...(input.maxSelect !== undefined ? { maxSelect: input.maxSelect } : {}),
      })
      .where(and(eq(ktModifierGroups.id, id), eq(ktModifierGroups.organizationId, orgId)));

    return this.findModifierGroup(id, orgId);
  }

  async removeModifierGroup(id: number, orgId: number) {
    await this.findModifierGroup(id, orgId);
    await this.db
      .update(ktModifierGroups)
      .set({ status: "false" })
      .where(and(eq(ktModifierGroups.id, id), eq(ktModifierGroups.organizationId, orgId)));
    return { message: "Groupe de modificateurs desactive." };
  }

  // ─── Modifiers ───────────────────────────────────────────────────────────

  private async findModifier(id: number, orgId: number) {
    const rows = await this.db
      .select()
      .from(ktModifiers)
      .where(and(eq(ktModifiers.id, id), eq(ktModifiers.organizationId, orgId)))
      .limit(1);
    if (!rows.length) throw new NotFoundException("Modificateur introuvable.");
    return rows[0];
  }

  async createModifier(groupId: number, input: CreateModifierDto, orgId: number) {
    await this.findModifierGroup(groupId, orgId);

    const [result] = await this.db.insert(ktModifiers).values({
      organizationId: orgId,
      groupId,
      name: input.name,
      priceDelta: input.priceDelta !== undefined ? input.priceDelta.toFixed(2) : undefined,
    });

    return this.findModifier(Number(result.insertId), orgId);
  }

  async updateModifier(id: number, input: UpdateModifierDto, orgId: number) {
    await this.findModifier(id, orgId);

    await this.db
      .update(ktModifiers)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.priceDelta !== undefined ? { priceDelta: input.priceDelta.toFixed(2) } : {}),
      })
      .where(and(eq(ktModifiers.id, id), eq(ktModifiers.organizationId, orgId)));

    return this.findModifier(id, orgId);
  }

  async removeModifier(id: number, orgId: number) {
    await this.findModifier(id, orgId);
    await this.db
      .update(ktModifiers)
      .set({ status: "false" })
      .where(and(eq(ktModifiers.id, id), eq(ktModifiers.organizationId, orgId)));
    return { message: "Modificateur desactive." };
  }

  // ─── Product <-> modifier groups association ────────────────────────────

  /**
   * Remplace entierement la liste des groupes de modificateurs associes a un
   * produit (delete + insert dans une transaction), meme pattern que
   * RecipesService.upsertRecipe. La table de jointure n'a pas d'organizationId
   * propre : on verifie que chaque groupId appartient bien a l'organisation
   * avant insertion.
   */
  async setProductModifierGroups(productId: number, input: SetProductModifierGroupsDto, orgId: number) {
    await this.assertProduct(productId, orgId);

    const groupIds = [...new Set(input.groupIds)];

    if (groupIds.length) {
      const groups = await this.db
        .select({ id: ktModifierGroups.id })
        .from(ktModifierGroups)
        .where(
          and(
            eq(ktModifierGroups.organizationId, orgId),
            eq(ktModifierGroups.status, "true"),
            inArray(ktModifierGroups.id, groupIds),
          ),
        );
      if (groups.length !== groupIds.length) {
        throw new NotFoundException("Un ou plusieurs groupes de modificateurs sont introuvables.");
      }
    }

    return this.db.transaction(async (tx) => {
      await tx.delete(ktProductModifierGroups).where(eq(ktProductModifierGroups.productId, productId));

      if (groupIds.length) {
        await tx.insert(ktProductModifierGroups).values(
          groupIds.map((groupId) => ({ productId, groupId })),
        );
      }

      return { productId, groupIds };
    });
  }

  // ─── Sale options (lecture agregee pour la caisse) ───────────────────────

  /**
   * Un seul appel pour la caisse : variantes actives + groupes de
   * modificateurs actifs (avec leurs modificateurs actifs) associes a ce
   * produit. Evite plusieurs allers-retours a chaque ajout au ticket.
   */
  async getSaleOptions(productId: number, orgId: number) {
    await this.assertProduct(productId, orgId);

    const variants = await this.db
      .select()
      .from(ktProductVariants)
      .where(
        and(
          eq(ktProductVariants.productId, productId),
          eq(ktProductVariants.organizationId, orgId),
          eq(ktProductVariants.status, "true"),
        ),
      )
      .orderBy(ktProductVariants.id);

    const groupLinks = await this.db
      .select({ groupId: ktProductModifierGroups.groupId })
      .from(ktProductModifierGroups)
      .where(eq(ktProductModifierGroups.productId, productId));

    let modifierGroups: Array<
      typeof ktModifierGroups.$inferSelect & { modifiers: (typeof ktModifiers.$inferSelect)[] }
    > = [];

    if (groupLinks.length) {
      const groupIds = groupLinks.map((g) => g.groupId);
      const groups = await this.db
        .select()
        .from(ktModifierGroups)
        .where(
          and(
            eq(ktModifierGroups.organizationId, orgId),
            eq(ktModifierGroups.status, "true"),
            inArray(ktModifierGroups.id, groupIds),
          ),
        )
        .orderBy(ktModifierGroups.id);

      if (groups.length) {
        const modifiers = await this.db
          .select()
          .from(ktModifiers)
          .where(
            and(
              eq(ktModifiers.organizationId, orgId),
              eq(ktModifiers.status, "true"),
              inArray(
                ktModifiers.groupId,
                groups.map((g) => g.id),
              ),
            ),
          )
          .orderBy(ktModifiers.id);

        modifierGroups = groups.map((group) => ({
          ...group,
          modifiers: modifiers.filter((m) => m.groupId === group.id),
        }));
      }
    }

    return { variants, modifierGroups };
  }
}

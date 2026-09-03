import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import { ktIngredients, ktProducts, ktRecipeLines, ktRecipes } from "../database/schema";
import type { Database } from "../database/types";
import { UpsertRecipeDto } from "./dto/recipes.dto";

@Injectable()
export class RecipesService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  private async assertProduct(productId: number, orgId: number) {
    const rows = await this.db
      .select({ id: ktProducts.id })
      .from(ktProducts)
      .where(and(eq(ktProducts.id, productId), eq(ktProducts.organizationId, orgId)))
      .limit(1);
    if (!rows.length) throw new NotFoundException("Produit introuvable.");
  }

  /**
   * Cout de revient d'une recette (source de verite unique, ne pas dupliquer
   * cote frontend) :
   *
   *   computedCost = Σ( ingredient.purchasePrice / ingredient.unitFactor × ligne.qtyBase )
   *                  × (1 + wastePct/100)
   *                  × (1 + consumablePct/100)
   *
   * - purchasePrice / unitFactor = cout unitaire de l'ingredient exprime dans sa
   *   baseUnit (ex: prix au kg / 1000 = prix au gramme).
   * - qtyBase = quantite de la ligne, deja exprimee dans la baseUnit de
   *   l'ingredient (pas de conversion supplementaire au calcul).
   * - wastePct = perte matiere (decoupe, cuisson...) appliquee au cout matiere.
   * - consumablePct = emballage/consommables, applique apres la perte.
   */
  private computeCost(
    lines: { qtyBase: number; ingredient: { purchasePrice: string; unitFactor: string } }[],
    wastePct: number,
    consumablePct: number,
  ): number {
    const materialCost = lines.reduce((sum, line) => {
      const unitCost = Number(line.ingredient.purchasePrice) / Number(line.ingredient.unitFactor);
      return sum + unitCost * line.qtyBase;
    }, 0);

    return materialCost * (1 + wastePct / 100) * (1 + consumablePct / 100);
  }

  async getRecipe(productId: number, orgId: number) {
    await this.assertProduct(productId, orgId);

    const [recipe] = await this.db
      .select()
      .from(ktRecipes)
      .where(
        and(
          eq(ktRecipes.productId, productId),
          eq(ktRecipes.organizationId, orgId),
          eq(ktRecipes.status, "true"),
        ),
      )
      .limit(1);

    if (!recipe) throw new NotFoundException("Aucune recette pour ce produit.");

    const lines = await this.db
      .select({
        id: ktRecipeLines.id,
        ingredientId: ktRecipeLines.ingredientId,
        qtyBase: ktRecipeLines.qtyBase,
        ingredientName: ktIngredients.name,
        purchasePrice: ktIngredients.purchasePrice,
        unitFactor: ktIngredients.unitFactor,
        baseUnit: ktIngredients.baseUnit,
        currencyCode: ktIngredients.currencyCode,
      })
      .from(ktRecipeLines)
      .innerJoin(ktIngredients, eq(ktRecipeLines.ingredientId, ktIngredients.id))
      .where(eq(ktRecipeLines.recipeId, recipe.id));

    return { ...recipe, lines };
  }

  /**
   * Upsert de la recette : remplace entierement les lignes (delete + insert)
   * dans une transaction, puis recalcule et persiste computedCost. Le remplacement
   * total est plus simple/sur qu'un diff ligne-a-ligne pour ce volume de donnees.
   */
  async upsertRecipe(productId: number, input: UpsertRecipeDto, orgId: number) {
    await this.assertProduct(productId, orgId);

    return this.db.transaction(async (tx) => {
      const wastePct = input.wastePct ?? 0;
      const consumablePct = input.consumablePct ?? 0;

      const ingredientIds = [...new Set(input.lines.map((l) => l.ingredientId))];
      const ingredients = ingredientIds.length
        ? await tx
            .select()
            .from(ktIngredients)
            .where(
              and(
                eq(ktIngredients.organizationId, orgId),
                eq(ktIngredients.status, "true"),
              ),
            )
        : [];
      const ingredientMap = new Map(ingredients.map((i) => [i.id, i]));

      for (const line of input.lines) {
        if (!ingredientMap.has(line.ingredientId)) {
          throw new NotFoundException(`Ingredient ${line.ingredientId} introuvable.`);
        }
      }

      const computedCost = this.computeCost(
        input.lines.map((l) => ({ qtyBase: l.qtyBase, ingredient: ingredientMap.get(l.ingredientId)! })),
        wastePct,
        consumablePct,
      );

      const [existing] = await tx
        .select({ id: ktRecipes.id })
        .from(ktRecipes)
        .where(and(eq(ktRecipes.productId, productId), eq(ktRecipes.organizationId, orgId)))
        .limit(1);

      let recipeId: number;
      if (existing) {
        recipeId = existing.id;
        await tx
          .update(ktRecipes)
          .set({
            wastePct: wastePct.toFixed(2),
            consumablePct: consumablePct.toFixed(2),
            computedCost: computedCost.toFixed(2),
            status: "true",
          })
          .where(eq(ktRecipes.id, recipeId));

        await tx.delete(ktRecipeLines).where(eq(ktRecipeLines.recipeId, recipeId));
      } else {
        const [result] = await tx.insert(ktRecipes).values({
          organizationId: orgId,
          productId,
          wastePct: wastePct.toFixed(2),
          consumablePct: consumablePct.toFixed(2),
          computedCost: computedCost.toFixed(2),
        });
        recipeId = Number(result.insertId);
      }

      if (input.lines.length) {
        await tx.insert(ktRecipeLines).values(
          input.lines.map((l) => ({
            organizationId: orgId,
            recipeId,
            ingredientId: l.ingredientId,
            qtyBase: l.qtyBase.toFixed(4),
          })),
        );
      }

      return this.getRecipeInternal(tx, recipeId, orgId);
    });
  }

  private async getRecipeInternal(tx: Database, recipeId: number, orgId: number) {
    const [recipe] = await tx
      .select()
      .from(ktRecipes)
      .where(and(eq(ktRecipes.id, recipeId), eq(ktRecipes.organizationId, orgId)))
      .limit(1);
    if (!recipe) throw new NotFoundException("Recette introuvable.");

    const lines = await tx
      .select({
        id: ktRecipeLines.id,
        ingredientId: ktRecipeLines.ingredientId,
        qtyBase: ktRecipeLines.qtyBase,
        ingredientName: ktIngredients.name,
        purchasePrice: ktIngredients.purchasePrice,
        unitFactor: ktIngredients.unitFactor,
        baseUnit: ktIngredients.baseUnit,
        currencyCode: ktIngredients.currencyCode,
      })
      .from(ktRecipeLines)
      .innerJoin(ktIngredients, eq(ktRecipeLines.ingredientId, ktIngredients.id))
      .where(eq(ktRecipeLines.recipeId, recipeId));

    return { ...recipe, lines };
  }

  /**
   * Soft delete de la recette. Decision : NE modifie PAS kt_products.costMode
   * automatiquement. En Phase 1, costMode est un choix explicite de
   * l'utilisateur sur le produit (manuel vs recette) ; le repasser en "manual"
   * ici serait une action a distance sur une autre table/domaine (le catalogue,
   * proprio de SCRUM-288 en parallele) et masquerait un prix de vente sans
   * confirmation. Le frontend doit inviter l'utilisateur a repasser le produit
   * en costMode='manual' explicitement s'il supprime la recette.
   */
  async removeRecipe(productId: number, orgId: number) {
    await this.assertProduct(productId, orgId);

    const [existing] = await this.db
      .select({ id: ktRecipes.id })
      .from(ktRecipes)
      .where(
        and(
          eq(ktRecipes.productId, productId),
          eq(ktRecipes.organizationId, orgId),
          eq(ktRecipes.status, "true"),
        ),
      )
      .limit(1);

    if (!existing) throw new NotFoundException("Aucune recette pour ce produit.");

    await this.db.update(ktRecipes).set({ status: "false" }).where(eq(ktRecipes.id, existing.id));
    return { message: "Recette desactivee." };
  }
}

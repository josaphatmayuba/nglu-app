import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, eq, like } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import { ktIngredients } from "../database/schema";
import type { Database } from "../database/types";
import { CreateIngredientDto, UpdateIngredientDto } from "./dto/ingredients.dto";

@Injectable()
export class IngredientsService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async list(orgId: number, search?: string) {
    const conditions = [eq(ktIngredients.organizationId, orgId), eq(ktIngredients.status, "true")];
    if (search) {
      conditions.push(like(ktIngredients.name, `%${search}%`));
    }
    return this.db
      .select()
      .from(ktIngredients)
      .where(and(...conditions))
      .orderBy(asc(ktIngredients.name));
  }

  async findOne(id: number, orgId: number) {
    const rows = await this.db
      .select()
      .from(ktIngredients)
      .where(and(eq(ktIngredients.id, id), eq(ktIngredients.organizationId, orgId)))
      .limit(1);
    if (!rows.length) throw new NotFoundException("Ingredient introuvable.");
    return rows[0];
  }

  async create(input: CreateIngredientDto, orgId: number) {
    const [result] = await this.db.insert(ktIngredients).values({
      organizationId: orgId,
      name: input.name,
      purchaseUnit: input.purchaseUnit,
      baseUnit: input.baseUnit,
      unitFactor: input.unitFactor !== undefined ? input.unitFactor.toFixed(4) : undefined,
      purchasePrice: input.purchasePrice !== undefined ? input.purchasePrice.toFixed(2) : undefined,
      currencyCode: input.currencyCode,
      currentQty: input.currentQty !== undefined ? input.currentQty.toFixed(3) : undefined,
    });
    return this.findOne(Number(result.insertId), orgId);
  }

  async update(id: number, input: UpdateIngredientDto, orgId: number) {
    await this.findOne(id, orgId);

    await this.db
      .update(ktIngredients)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.purchaseUnit !== undefined ? { purchaseUnit: input.purchaseUnit } : {}),
        ...(input.baseUnit !== undefined ? { baseUnit: input.baseUnit } : {}),
        ...(input.unitFactor !== undefined ? { unitFactor: input.unitFactor.toFixed(4) } : {}),
        ...(input.purchasePrice !== undefined ? { purchasePrice: input.purchasePrice.toFixed(2) } : {}),
        ...(input.currencyCode !== undefined ? { currencyCode: input.currencyCode } : {}),
        ...(input.currentQty !== undefined ? { currentQty: input.currentQty.toFixed(3) } : {}),
      })
      .where(and(eq(ktIngredients.id, id), eq(ktIngredients.organizationId, orgId)));

    return this.findOne(id, orgId);
  }

  async remove(id: number, orgId: number) {
    await this.findOne(id, orgId);
    await this.db
      .update(ktIngredients)
      .set({ status: "false" })
      .where(and(eq(ktIngredients.id, id), eq(ktIngredients.organizationId, orgId)));
    return { message: "Ingredient desactive." };
  }
}

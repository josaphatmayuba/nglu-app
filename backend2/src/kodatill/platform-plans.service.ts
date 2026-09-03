import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { asc, eq } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import { ktPlans } from "../database/schema";
import type { Database } from "../database/types";
import { CreatePlatformPlanDto, UpdatePlatformPlanDto } from "./dto/platform-plans.dto";

@Injectable()
export class PlatformPlansService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  // Plans globaux a la plateforme (pas de organizationId) : visibles par tout
  // utilisateur authentifie, un client doit pouvoir consulter les offres.
  async list() {
    return this.db
      .select()
      .from(ktPlans)
      .where(eq(ktPlans.status, "true"))
      .orderBy(asc(ktPlans.monthlyPrice), asc(ktPlans.id));
  }

  async findOne(id: number) {
    const rows = await this.db.select().from(ktPlans).where(eq(ktPlans.id, id)).limit(1);
    if (!rows.length) throw new NotFoundException("Plan introuvable.");
    return rows[0];
  }

  async findByCode(code: string) {
    const rows = await this.db.select().from(ktPlans).where(eq(ktPlans.code, code)).limit(1);
    return rows[0] ?? null;
  }

  async create(input: CreatePlatformPlanDto) {
    const existing = await this.findByCode(input.code);
    if (existing) {
      throw new ConflictException(`Un plan avec le code "${input.code}" existe deja.`);
    }

    const [result] = await this.db.insert(ktPlans).values({
      code: input.code,
      name: input.name,
      monthlyPrice: (input.monthlyPrice ?? 0).toFixed(2),
      currencyCode: input.currencyCode ?? "USD",
      commissionRate: (input.commissionRate ?? 0).toFixed(2),
      limits: input.limits ?? null,
      isActive: input.isActive ?? true,
    });
    return this.findOne(Number(result.insertId));
  }

  async update(id: number, input: UpdatePlatformPlanDto) {
    await this.findOne(id);

    await this.db
      .update(ktPlans)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.monthlyPrice !== undefined ? { monthlyPrice: input.monthlyPrice.toFixed(2) } : {}),
        ...(input.currencyCode !== undefined ? { currencyCode: input.currencyCode } : {}),
        ...(input.commissionRate !== undefined ? { commissionRate: input.commissionRate.toFixed(2) } : {}),
        ...(input.limits !== undefined ? { limits: input.limits } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      })
      .where(eq(ktPlans.id, id));

    return this.findOne(id);
  }

  // Soft delete : jamais de DELETE physique (regle projet). status=false masque
  // le plan de la liste publique sans casser les souscriptions qui le referencent
  // par planCode (FK fonctionnelle, pas de contrainte SQL bloquante).
  async remove(id: number) {
    await this.findOne(id);
    await this.db.update(ktPlans).set({ status: "false" }).where(eq(ktPlans.id, id));
    return { message: "Plan desactive." };
  }
}

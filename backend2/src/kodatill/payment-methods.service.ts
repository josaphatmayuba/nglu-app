import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, eq } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import { ktPaymentMethods } from "../database/schema";
import type { Database } from "../database/types";
import { CreatePaymentMethodDto, UpdatePaymentMethodDto } from "./dto/payment-methods.dto";

@Injectable()
export class PaymentMethodsService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  // Pas d'auto-seed (regle projet : aucune donnee de demonstration inseree
  // automatiquement) — une organisation sans methode configuree recoit une
  // liste vide, a l'admin de les creer via le CRUD ci-dessous.
  async list(orgId: number) {
    return this.db
      .select()
      .from(ktPaymentMethods)
      .where(and(eq(ktPaymentMethods.organizationId, orgId), eq(ktPaymentMethods.status, "true")))
      .orderBy(asc(ktPaymentMethods.sortOrder), asc(ktPaymentMethods.id));
  }

  async findOne(id: number, orgId: number) {
    const rows = await this.db
      .select()
      .from(ktPaymentMethods)
      .where(and(eq(ktPaymentMethods.id, id), eq(ktPaymentMethods.organizationId, orgId)))
      .limit(1);
    if (!rows.length) throw new NotFoundException("Methode de paiement introuvable.");
    return rows[0];
  }

  async create(input: CreatePaymentMethodDto, orgId: number) {
    const [result] = await this.db.insert(ktPaymentMethods).values({
      organizationId: orgId,
      name: input.name,
      kind: input.kind ?? "cash",
      gatewayCode: input.gatewayCode,
      requiresReference: input.requiresReference ? 1 : 0,
      sortOrder: input.sortOrder ?? 0,
    });
    return this.findOne(Number(result.insertId), orgId);
  }

  async update(id: number, input: UpdatePaymentMethodDto, orgId: number) {
    await this.findOne(id, orgId);

    await this.db
      .update(ktPaymentMethods)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.kind !== undefined ? { kind: input.kind } : {}),
        ...(input.gatewayCode !== undefined ? { gatewayCode: input.gatewayCode } : {}),
        ...(input.requiresReference !== undefined ? { requiresReference: input.requiresReference ? 1 : 0 } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      })
      .where(and(eq(ktPaymentMethods.id, id), eq(ktPaymentMethods.organizationId, orgId)));

    return this.findOne(id, orgId);
  }

  async remove(id: number, orgId: number) {
    await this.findOne(id, orgId);
    await this.db
      .update(ktPaymentMethods)
      .set({ status: "false" })
      .where(and(eq(ktPaymentMethods.id, id), eq(ktPaymentMethods.organizationId, orgId)));
    return { message: "Methode de paiement desactivee." };
  }
}

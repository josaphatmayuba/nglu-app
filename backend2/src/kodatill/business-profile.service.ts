import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import { ktBusinessProfiles } from "../database/schema";
import type { Database } from "../database/types";
import { UpdateBusinessProfileDto } from "./dto/business-profile.dto";

// Modules par defaut selon l'activite (repris du mapping frontend). Utilise
// uniquement pour le defaut non-persiste retourne quand aucun profil n'existe
// encore — l'utilisateur peut toujours les modifier avant de sauvegarder.
const DEFAULT_MODULES_BY_ACTIVITY: Record<string, string[]> = {
  restaurant: ["dashboard", "commandes", "produits", "ingredients", "caisse"],
  supermarket: ["dashboard", "commandes", "produits", "stock", "caisse"],
  pharmacy: ["dashboard", "commandes", "produits", "stock", "caisse"],
  hardware: ["dashboard", "commandes", "produits", "stock", "caisse"],
  shop: ["dashboard", "commandes", "produits", "caisse"],
};

@Injectable()
export class BusinessProfileService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  private async findRow(orgId: number) {
    const rows = await this.db
      .select()
      .from(ktBusinessProfiles)
      .where(eq(ktBusinessProfiles.organizationId, orgId))
      .limit(1);
    return rows[0] ?? null;
  }

  /**
   * Retourne le profil de l'organisation. Si aucune ligne n'existe encore en
   * base (premiere utilisation), on NE fait PAS d'auto-seed (regle projet :
   * pas de seed data) — on retourne un objet par defaut raisonnable non
   * persiste (isDefault=true) tant que l'utilisateur n'a pas sauvegarde via
   * PUT /business-profile.
   */
  async get(orgId: number) {
    const row = await this.findRow(orgId);
    if (row) return { ...row, isDefault: false };

    const activityType = "shop" as const;
    return {
      id: null,
      organizationId: orgId,
      activityType,
      enabledModules: DEFAULT_MODULES_BY_ACTIVITY[activityType],
      defaultCurrencyCode: "USD",
      taxMode: "exclusive",
      receiptFooter: null,
      serviceChargeRate: "0.00",
      status: "true",
      createdAt: null,
      updatedAt: null,
      // Signale au frontend que ce profil est un defaut calcule, pas encore
      // enregistre en base — tant que PUT n'a pas ete appele.
      isDefault: true,
    };
  }

  async update(input: UpdateBusinessProfileDto, orgId: number) {
    const existing = await this.findRow(orgId);

    const values = {
      ...(input.activityType !== undefined ? { activityType: input.activityType } : {}),
      ...(input.enabledModules !== undefined ? { enabledModules: input.enabledModules } : {}),
      ...(input.defaultCurrencyCode !== undefined ? { defaultCurrencyCode: input.defaultCurrencyCode } : {}),
      ...(input.taxMode !== undefined ? { taxMode: input.taxMode } : {}),
      ...(input.receiptFooter !== undefined ? { receiptFooter: input.receiptFooter } : {}),
      ...(input.serviceChargeRate !== undefined ? { serviceChargeRate: input.serviceChargeRate } : {}),
    };

    if (!existing) {
      await this.db.insert(ktBusinessProfiles).values({
        organizationId: orgId,
        activityType: input.activityType ?? "shop",
        enabledModules: input.enabledModules ?? DEFAULT_MODULES_BY_ACTIVITY[input.activityType ?? "shop"],
        defaultCurrencyCode: input.defaultCurrencyCode ?? "USD",
        taxMode: input.taxMode ?? "exclusive",
        receiptFooter: input.receiptFooter,
        serviceChargeRate: input.serviceChargeRate ?? "0.00",
      });
    } else {
      await this.db.update(ktBusinessProfiles).set(values).where(eq(ktBusinessProfiles.organizationId, orgId));
    }

    const row = await this.findRow(orgId);
    return { ...row, isDefault: false };
  }
}

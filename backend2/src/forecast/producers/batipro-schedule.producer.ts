import { Inject, Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { DRIZZLE } from "../../database/database.constants";
import { batiproProjects, currencies } from "../../database/schema";
import type { Database } from "../../database/types";
import type { ForecastLine, ForecastProducer } from "../forecast.types";
import { addMonths, monthKey } from "../forecast.util";

/**
 * Niveau 1 — echeancier de chantier BatiPro. Chaque projet actif genere, etale
 * du mois courant jusqu a sa date d echeance (due_date), DEUX flux par devise :
 *  - SORTIE : cout restant = budget - spent (depenses chantier a venir) ;
 *  - ENTREE : a facturer = contract_amount - billed_amount (encaissements client).
 * Etalement lineaire (montant / nb de mois restants). Pas de due_date OU
 * echeance passee => place au mois courant (du a regler/encaisser maintenant).
 */
@Injectable()
export class BatiproScheduleProducer implements ForecastProducer {
  readonly scope = "batipro" as const;

  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async produce(orgId: number, horizonMonths: number): Promise<ForecastLine[]> {
    const projects = await this.db
      .select({
        id: batiproProjects.id,
        name: batiproProjects.name,
        budget: batiproProjects.budget,
        spent: batiproProjects.spent,
        contractAmount: batiproProjects.contractAmount,
        billedAmount: batiproProjects.billedAmount,
        dueDate: batiproProjects.dueDate,
        currencyId: batiproProjects.currencyId,
        currencyCode: currencies.currencyCode,
        currencySymbol: currencies.currencySymbol,
      })
      .from(batiproProjects)
      .leftJoin(currencies, eq(currencies.id, batiproProjects.currencyId))
      .where(and(eq(batiproProjects.organizationId, orgId), eq(batiproProjects.isActive, 1)));

    const now = new Date();
    const nowKey = monthKey(now);
    const lines: ForecastLine[] = [];

    // Nb de mois (>=1) du mois courant jusqu au mois d echeance, borne a l horizon.
    const monthsUntil = (dueStr: string | null): number => {
      if (!dueStr) return 1;
      const due = new Date(`${dueStr}T00:00:00`);
      const dueKey = monthKey(due);
      if (dueKey <= nowKey) return 1;
      let n = 0;
      for (let i = 0; i < horizonMonths; i++) {
        if (monthKey(addMonths(now, i)) <= dueKey) n++;
        else break;
      }
      return Math.max(1, n);
    };

    const pushSpread = (
      total: number,
      sign: 1 | -1,
      months: number,
      p: (typeof projects)[number],
      source: string,
      basis: string,
    ) => {
      if (!Number.isFinite(total) || total <= 0) return;
      const per = total / months;
      for (let i = 0; i < months; i++) {
        lines.push({
          month: monthKey(addMonths(now, i)),
          amount: sign * per,
          currencyId: p.currencyId ?? null,
          currencyCode: p.currencyCode ?? null,
          currencySymbol: p.currencySymbol ?? null,
          layer: 1,
          confidence: "certain",
          scope: "batipro",
          source,
          basis,
        });
      }
    };

    for (const p of projects) {
      const months = monthsUntil(p.dueDate);
      const remainingCost = Number(p.budget || 0) - Number(p.spent || 0);
      const remainingBill = Number(p.contractAmount || 0) - Number(p.billedAmount || 0);
      pushSpread(remainingCost, -1, months, p, `Chantier ${p.name} — coût restant`, "budget − dépensé (étalé jusqu'à échéance)");
      pushSpread(remainingBill, 1, months, p, `Chantier ${p.name} — à facturer`, "contrat − déjà facturé (étalé jusqu'à échéance)");
    }

    return lines;
  }
}

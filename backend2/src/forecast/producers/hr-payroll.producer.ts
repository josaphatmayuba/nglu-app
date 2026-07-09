import { Inject, Injectable } from "@nestjs/common";
import { and, eq, notInArray } from "drizzle-orm";
import { DRIZZLE } from "../../database/database.constants";
import { currencies, hrContracts } from "../../database/schema";
import type { Database } from "../../database/types";
import type { ForecastLine, ForecastProducer } from "../forecast.types";
import { addMonths, monthKey, round2 } from "../forecast.util";

// Statuts non actifs : on ne projette pas leur salaire.
const INACTIVE_STATUSES = ["terminated", "draft", "false", "cancelled"];

/**
 * Niveau 1 — masse salariale CERTAINE : chaque contrat actif genere une SORTIE
 * mensuelle (base + primes transport/logement) sur l'horizon, dans la devise du
 * contrat. Aucune conversion : une ligne par devise. Cycle mensuel par defaut.
 */
@Injectable()
export class HrPayrollProducer implements ForecastProducer {
  readonly scope = "hr" as const;

  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async produce(orgId: number, horizonMonths: number): Promise<ForecastLine[]> {
    const contracts = await this.db
      .select({
        id: hrContracts.id,
        reference: hrContracts.reference,
        baseSalary: hrContracts.baseSalary,
        transportAllowance: hrContracts.transportAllowance,
        housingAllowance: hrContracts.housingAllowance,
        endDate: hrContracts.endDate,
        currencyId: hrContracts.currencyId,
        currencyCode: currencies.currencyCode,
        currencySymbol: currencies.currencySymbol,
      })
      .from(hrContracts)
      .leftJoin(currencies, eq(currencies.id, hrContracts.currencyId))
      .where(
        and(
          eq(hrContracts.organizationId, orgId),
          notInArray(hrContracts.status, INACTIVE_STATUSES),
        ),
      );

    const now = new Date();
    const lines: ForecastLine[] = [];

    for (const c of contracts) {
      const monthly = round2(
        Number(c.baseSalary || 0) + Number(c.transportAllowance || 0) + Number(c.housingAllowance || 0),
      );
      if (monthly <= 0) continue;
      const end = c.endDate ? new Date(`${c.endDate}T00:00:00`) : null;

      for (let i = 0; i < horizonMonths; i++) {
        const due = addMonths(now, i);
        // Jusqu'a la fin du contrat = engage certain (couche 1). Au-dela, on
        // suppose la reconduction du poste = tendance (couche 2, visible en
        // mode Realiste seulement). Un contrat sans endDate (CDI) reste couche 1.
        const beyondEnd = end != null && due > end;
        lines.push({
          month: monthKey(due),
          amount: -monthly, // sortie
          currencyId: c.currencyId ?? null,
          currencyCode: c.currencyCode ?? null,
          currencySymbol: c.currencySymbol ?? null,
          layer: beyondEnd ? 2 : 1,
          confidence: beyondEnd ? "estimated" : "certain",
          scope: "hr",
          source: `Salaire ${c.reference || `contrat #${c.id}`}`,
          basis: beyondEnd ? "reconduction supposee du poste" : "contrat actif (base + primes)",
        });
      }
    }

    return lines;
  }
}

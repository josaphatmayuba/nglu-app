import { Inject, Injectable } from "@nestjs/common";
import { and, eq, isNotNull } from "drizzle-orm";
import { DRIZZLE } from "../../database/database.constants";
import { currencies, realEstateLeases } from "../../database/schema";
import type { Database } from "../../database/types";
import type { ForecastLine, ForecastProducer } from "../forecast.types";
import { addMonths, monthKey } from "../forecast.util";

/**
 * Niveau 1 — loyers futurs CERTAINS : chaque bail actif genere une entree par
 * mois sur l'horizon (a partir de next_invoice_date), au montant du loyer, dans
 * la devise du bail. Aucune conversion : une ligne par devise.
 * Ne gere que le cycle "monthly" en v1 (les autres cycles arriveront ensuite).
 */
@Injectable()
export class DomusRentProducer implements ForecastProducer {
  readonly scope = "domus" as const;

  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async produce(orgId: number, horizonMonths: number): Promise<ForecastLine[]> {
    const leases = await this.db
      .select({
        id: realEstateLeases.id,
        reference: realEstateLeases.reference,
        rentAmount: realEstateLeases.rentAmount,
        nextInvoiceDate: realEstateLeases.nextInvoiceDate,
        billingCycle: realEstateLeases.billingCycle,
        endDate: realEstateLeases.endDate,
        currencyId: realEstateLeases.currencyId,
        currencyCode: currencies.currencyCode,
        currencySymbol: currencies.currencySymbol,
      })
      .from(realEstateLeases)
      .leftJoin(currencies, eq(currencies.id, realEstateLeases.currencyId))
      .where(
        and(
          eq(realEstateLeases.organizationId, orgId),
          eq(realEstateLeases.status, "active"),
          isNotNull(realEstateLeases.nextInvoiceDate),
        ),
      );

    const now = new Date();
    const lines: ForecastLine[] = [];

    for (const lease of leases) {
      // v1 : seul le cycle mensuel est projete proprement.
      if (lease.billingCycle !== "monthly") continue;
      const rent = Number(lease.rentAmount);
      if (!Number.isFinite(rent) || rent <= 0) continue;

      const start = new Date(`${lease.nextInvoiceDate}T00:00:00`);
      const end = lease.endDate ? new Date(`${lease.endDate}T00:00:00`) : null;

      for (let i = 0; i < horizonMonths; i++) {
        const due = addMonths(start, i);
        // On ne projette pas avant aujourd'hui.
        if (monthKey(due) < monthKey(now)) continue;
        // Jusqu'a la fin du bail = loyer certain (couche 1). Au-dela, on suppose
        // le renouvellement = tendance (couche 2, visible en mode Realiste).
        // Un bail sans endDate reste couche 1 sur tout l'horizon.
        const beyondEnd = end != null && due > end;

        lines.push({
          month: monthKey(due),
          amount: rent, // entree
          currencyId: lease.currencyId ?? null,
          currencyCode: lease.currencyCode ?? null,
          currencySymbol: lease.currencySymbol ?? null,
          layer: beyondEnd ? 2 : 1,
          confidence: beyondEnd ? "estimated" : "certain",
          scope: "domus",
          source: `Loyer bail ${lease.reference}`,
          basis: beyondEnd ? "renouvellement suppose du bail" : "bail actif (cycle mensuel)",
        });
      }
    }

    return lines;
  }
}

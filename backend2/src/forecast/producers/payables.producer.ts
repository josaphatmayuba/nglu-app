import { Inject, Injectable } from "@nestjs/common";
import { and, eq, gt } from "drizzle-orm";
import { DRIZZLE } from "../../database/database.constants";
import { currencies, purchaseInvoices } from "../../database/schema";
import type { Database } from "../../database/types";
import type { ForecastLine, ForecastProducer } from "../forecast.types";
import { monthKey } from "../forecast.util";

/**
 * Niveau 1 — dettes fournisseurs CERTAINES : le reste a payer (dueAmount) de
 * chaque facture fournisseur ouverte = une SORTIE, par devise. Faute de date
 * d'echeance dans le schema, on la place au mois courant (dette a regler des
 * maintenant — hypothese comptable prudente). Aucune conversion.
 */
@Injectable()
export class PayablesProducer implements ForecastProducer {
  readonly scope = "compta" as const;

  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async produce(orgId: number): Promise<ForecastLine[]> {
    const invoices = await this.db
      .select({
        id: purchaseInvoices.id,
        memo: purchaseInvoices.invoiceMemoNo,
        dueAmount: purchaseInvoices.dueAmount,
        currencyId: purchaseInvoices.currencyId,
        currencyCode: currencies.currencyCode,
        currencySymbol: currencies.currencySymbol,
      })
      .from(purchaseInvoices)
      .leftJoin(currencies, eq(currencies.id, purchaseInvoices.currencyId))
      .where(
        and(
          eq(purchaseInvoices.organizationId, orgId),
          eq(purchaseInvoices.status, "true"),
          gt(purchaseInvoices.dueAmount, 0),
        ),
      );

    const month = monthKey(new Date());
    return invoices.map((inv) => ({
      month,
      amount: -Number(inv.dueAmount || 0), // sortie
      currencyId: inv.currencyId ?? null,
      currencyCode: inv.currencyCode ?? null,
      currencySymbol: inv.currencySymbol ?? null,
      layer: 1,
      confidence: "certain",
      scope: "compta",
      source: `Facture fourn. ${inv.memo || inv.id}`,
      basis: "reste à payer (facture ouverte)",
    }));
  }
}

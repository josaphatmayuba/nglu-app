import { Injectable } from "@nestjs/common";
import { LedgerService } from "../../ledger/ledger.service";
import type { ForecastLine, ForecastProducer } from "../forecast.types";
import { monthKey } from "../forecast.util";

const TREASURY_KEYWORDS = ["banque", "bank", "caisse", "cash", "tresorerie", "trésorerie"];

const norm = (s: string | null | undefined) =>
  String(s || "").toLowerCase();

/** Un compte est "tresorerie" si son nom contient un mot-cle (meme heuristique que l'UI compta). */
function isTreasury(accountName: string | null, subAccountName: string | null): boolean {
  const hay = `${norm(accountName)} ${norm(subAccountName)}`;
  return TREASURY_KEYWORDS.some((k) => hay.includes(k));
}

/**
 * Niveau 1 — solde de tresorerie de DEPART : pose le point de depart de la
 * projection au mois courant (une ligne par devise), a partir du grand livre.
 * Ce n'est pas un flux futur, c'est le solde reel d'aujourd'hui d'ou part la courbe.
 */
@Injectable()
export class LedgerOpeningProducer implements ForecastProducer {
  readonly scope = "compta" as const;

  constructor(private readonly ledger: LedgerService) {}

  async produce(orgId: number): Promise<ForecastLine[]> {
    const balances = await this.ledger.subAccountBalances(orgId);
    const month = monthKey(new Date());
    const lines: ForecastLine[] = [];

    for (const b of balances) {
      if (!isTreasury(b.account, b.subAccount)) continue;
      if (b.balance === 0) continue;
      lines.push({
        month,
        amount: b.balance, // solde reel (peut etre +/-)
        currencyId: b.currencyId,
        currencyCode: b.currencyCode,
        currencySymbol: b.currencySymbol,
        layer: 1,
        confidence: "certain",
        scope: "compta",
        source: `Solde ${b.subAccount ?? b.account ?? "trésorerie"}`,
        basis: "solde réel du grand livre",
        opening: true,
      });
    }

    return lines;
  }
}

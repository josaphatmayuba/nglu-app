import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { and, eq, gte, inArray, lt } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import { ktCommissionEntries, ktPayments, ktPlans, ktSubscriptions, organizations } from "../database/schema";
import type { Database } from "../database/types";
import { ComputeCommissionsDto } from "./dto/platform-commissions.dto";

@Injectable()
export class PlatformCommissionsService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  private round2(n: number): number {
    return Math.round(n * 100) / 100;
  }

  /** Bornes [debut, fin) du mois calendaire "2026-08" en dates locales serveur. */
  private periodBounds(period: string): { start: Date; end: Date } {
    const [yearStr, monthStr] = period.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
      throw new BadRequestException("period invalide, attendu YYYY-MM.");
    }
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    return { start, end };
  }

  /**
   * Calcule et insere les commissions dues pour une periode calendaire.
   *
   * Regle : pour chaque kt_payments confirme (status='true') dont receivedAt
   * tombe dans [debut, fin) du mois, dont l'organisation a une kt_subscriptions
   * active a l'INSTANT DU CALCUL (pas au moment du paiement — on n'a pas
   * d'historique des changements de plan, on utilise l'etat courant, comme
   * documente au ticket), on cree une kt_commission_entries avec :
   *   baseAmount = payment.amount
   *   rate = ktPlans.commissionRate du plan de la souscription (snapshot fige)
   *   commissionAmount = baseAmount * rate / 100
   *   currencyCode = payment.currencyCode
   * Idempotent : un paymentId deja present dans kt_commission_entries (peu
   * importe la periode) n'est jamais recalcule une seconde fois.
   */
  async compute(input: ComputeCommissionsDto) {
    const { period } = input;
    const { start, end } = this.periodBounds(period);

    const payments = await this.db
      .select({
        id: ktPayments.id,
        orderId: ktPayments.orderId,
        organizationId: ktPayments.organizationId,
        amount: ktPayments.amount,
        currencyCode: ktPayments.currencyCode,
      })
      .from(ktPayments)
      .where(
        and(
          eq(ktPayments.status, "true"),
          gte(ktPayments.receivedAt, start),
          lt(ktPayments.receivedAt, end),
        ),
      );

    const summary: { entriesCreated: number; totalCommission: Record<string, number> } = {
      entriesCreated: 0,
      totalCommission: {},
    };

    if (!payments.length) {
      return summary;
    }

    // Deja calcules : filtre idempotent en un aller-retour DB plutot qu'une
    // verification par paiement.
    const paymentIds = payments.map((p) => p.id);
    const alreadyDone = await this.db
      .select({ paymentId: ktCommissionEntries.paymentId })
      .from(ktCommissionEntries)
      .where(inArray(ktCommissionEntries.paymentId, paymentIds));
    const doneSet = new Set(alreadyDone.map((r) => r.paymentId));

    // Souscriptions actives par organisation, jointes au taux du plan.
    const orgIds = [...new Set(payments.map((p) => p.organizationId))];
    const subs = await this.db
      .select({
        organizationId: ktSubscriptions.organizationId,
        subStatus: ktSubscriptions.subStatus,
        commissionRate: ktPlans.commissionRate,
      })
      .from(ktSubscriptions)
      .innerJoin(ktPlans, eq(ktPlans.code, ktSubscriptions.planCode))
      .where(
        and(
          inArray(ktSubscriptions.organizationId, orgIds),
          eq(ktSubscriptions.status, "true"),
          inArray(ktSubscriptions.subStatus, ["trial", "active", "past_due"]),
        ),
      );
    const rateByOrg = new Map(subs.map((s) => [s.organizationId, Number(s.commissionRate)]));

    for (const payment of payments) {
      if (doneSet.has(payment.id)) continue;

      const rate = rateByOrg.get(payment.organizationId);
      if (rate === undefined) continue; // pas d'abonnement actif : pas de commission.

      const baseAmount = Number(payment.amount);
      const commissionAmount = this.round2((baseAmount * rate) / 100);

      await this.db.insert(ktCommissionEntries).values({
        organizationId: payment.organizationId,
        orderId: payment.orderId,
        paymentId: payment.id,
        baseAmount: baseAmount.toFixed(2),
        rate: rate.toFixed(2),
        commissionAmount: commissionAmount.toFixed(2),
        currencyCode: payment.currencyCode,
        periodMonth: period,
      });

      summary.entriesCreated += 1;
      summary.totalCommission[payment.currencyCode] =
        this.round2((summary.totalCommission[payment.currencyCode] ?? 0) + commissionAmount);
    }

    return summary;
  }

  async listByPeriod(period: string) {
    const entries = await this.db
      .select({
        id: ktCommissionEntries.id,
        organizationId: ktCommissionEntries.organizationId,
        orderId: ktCommissionEntries.orderId,
        paymentId: ktCommissionEntries.paymentId,
        baseAmount: ktCommissionEntries.baseAmount,
        rate: ktCommissionEntries.rate,
        commissionAmount: ktCommissionEntries.commissionAmount,
        currencyCode: ktCommissionEntries.currencyCode,
        periodMonth: ktCommissionEntries.periodMonth,
        settledAt: ktCommissionEntries.settledAt,
        createdAt: ktCommissionEntries.createdAt,
        organizationName: organizations.name,
      })
      .from(ktCommissionEntries)
      .leftJoin(organizations, eq(organizations.id, ktCommissionEntries.organizationId))
      .where(and(eq(ktCommissionEntries.periodMonth, period), eq(ktCommissionEntries.status, "true")));

    return entries;
  }
}

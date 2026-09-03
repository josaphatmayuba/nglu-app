import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, eq, sql } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import { ktCashMovements, ktCashSessions, ktPayments, ktPaymentMethods } from "../database/schema";
import type { Database } from "../database/types";
import { CloseCashSessionDto, CreateCashMovementDto, OpenCashSessionDto } from "./dto/cash-sessions.dto";
import { KodatillAccountingService } from "./accounting.service";

@Injectable()
export class CashSessionsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly accounting: KodatillAccountingService,
  ) {}

  private round2(n: number): number {
    return Math.round(n * 100) / 100;
  }

  async open(input: OpenCashSessionDto, orgId: number, userId: number) {
    return this.db.transaction(async (tx) => {
      const conditions = [
        eq(ktCashSessions.organizationId, orgId),
        eq(ktCashSessions.userId, userId),
        eq(ktCashSessions.cashStatus, "open"),
      ];
      if (input.registerId !== undefined) conditions.push(eq(ktCashSessions.registerId, input.registerId));

      const existing = await tx
        .select({ id: ktCashSessions.id })
        .from(ktCashSessions)
        .where(and(...conditions))
        .limit(1);

      if (existing.length) {
        throw new BadRequestException(
          "Une session de caisse est deja ouverte pour cet utilisateur/register. Fermez-la avant d'en ouvrir une nouvelle.",
        );
      }

      const [result] = await tx.insert(ktCashSessions).values({
        organizationId: orgId,
        branchId: input.branchId,
        registerId: input.registerId,
        userId,
        openedAt: new Date(),
        openingFloat: input.openingFloat.toFixed(2),
        currencyCode: input.currencyCode ?? "USD",
        cashStatus: "open",
      });

      return this.findOneInternal(tx, Number(result.insertId), orgId);
    });
  }

  private async findOneInternal(tx: Database, id: number, orgId: number) {
    const rows = await tx
      .select()
      .from(ktCashSessions)
      .where(and(eq(ktCashSessions.id, id), eq(ktCashSessions.organizationId, orgId)))
      .limit(1);
    if (!rows.length) throw new NotFoundException("Session de caisse introuvable.");
    return rows[0];
  }

  async findOne(id: number, orgId: number) {
    return this.findOneInternal(this.db, id, orgId);
  }

  async current(orgId: number, userId: number, registerId?: number) {
    const conditions = [
      eq(ktCashSessions.organizationId, orgId),
      eq(ktCashSessions.userId, userId),
      eq(ktCashSessions.cashStatus, "open"),
    ];
    if (registerId !== undefined) conditions.push(eq(ktCashSessions.registerId, registerId));

    const rows = await this.db.select().from(ktCashSessions).where(and(...conditions)).limit(1);
    if (!rows.length) throw new NotFoundException("Aucune session de caisse ouverte.");
    return rows[0];
  }

  /** Somme des paiements cash de la session (jointure via l'organisation + methode 'cash'). */
  private async cashPaymentsTotal(tx: Database, sessionId: number, orgId: number): Promise<number> {
    // Les paiements ne referencent pas directement la session de caisse (ils
    // referencent la commande) ; on additionne les paiements dont la methode
    // est de type cash et qui datent d'apres l'ouverture de la session, via
    // une jointure sur kt_payment_methods.kind = 'cash'.
    const [session] = await tx
      .select({ openedAt: ktCashSessions.openedAt, closedAt: ktCashSessions.closedAt })
      .from(ktCashSessions)
      .where(and(eq(ktCashSessions.id, sessionId), eq(ktCashSessions.organizationId, orgId)))
      .limit(1);

    if (!session?.openedAt) return 0;

    const rows = await tx
      .select({ total: sql<string>`coalesce(sum(${ktPayments.amount}), 0)` })
      .from(ktPayments)
      .innerJoin(ktPaymentMethods, eq(ktPaymentMethods.id, ktPayments.methodId))
      .where(
        and(
          eq(ktPayments.organizationId, orgId),
          eq(ktPaymentMethods.kind, "cash"),
          sql`${ktPayments.receivedAt} >= ${session.openedAt}`,
        ),
      );

    return Number(rows[0]?.total ?? 0);
  }

  private async movementsTotals(tx: Database, sessionId: number, orgId: number) {
    const rows = await tx
      .select({ type: ktCashMovements.type, total: sql<string>`coalesce(sum(${ktCashMovements.amount}), 0)` })
      .from(ktCashMovements)
      .where(
        and(
          eq(ktCashMovements.sessionId, sessionId),
          eq(ktCashMovements.organizationId, orgId),
          eq(ktCashMovements.status, "true"),
        ),
      )
      .groupBy(ktCashMovements.type);

    let cashIn = 0;
    let cashOut = 0;
    for (const r of rows) {
      if (r.type === "in") cashIn = Number(r.total);
      if (r.type === "out") cashOut = Number(r.total);
    }
    return { cashIn, cashOut };
  }

  async close(id: number, input: CloseCashSessionDto, orgId: number, userId?: number) {
    const closed = await this.db.transaction(async (tx) => {
      const session = await this.findOneInternal(tx, id, orgId);

      if (session.cashStatus !== "open") {
        throw new BadRequestException("Cette session de caisse est deja fermee.");
      }

      const cashPayments = await this.cashPaymentsTotal(tx, id, orgId);
      const { cashIn, cashOut } = await this.movementsTotals(tx, id, orgId);

      const expectedCash = this.round2(Number(session.openingFloat) + cashPayments + cashIn - cashOut);
      const variance = this.round2(input.countedCash - expectedCash);

      await tx
        .update(ktCashSessions)
        .set({
          closedAt: new Date(),
          expectedCash: expectedCash.toFixed(2),
          countedCash: input.countedCash.toFixed(2),
          variance: variance.toFixed(2),
          cashStatus: "closed",
        })
        .where(and(eq(ktCashSessions.id, id), eq(ktCashSessions.organizationId, orgId)));

      return this.findOneInternal(tx, id, orgId);
    });

    // SCRUM-307 : effet de bord comptable APRES commit de la transaction metier
    // (le ledger a sa propre transaction et doit lire une session reellement
    // fermee). Ne jette jamais : une caisse fermee le reste meme si la compta
    // echoue, et l'ecriture reste rejouable (idempotence par ledgerEntryId).
    // UNE seule ecriture agregee par session, jamais une par ticket.
    await this.accounting.postCashSessionClosure(id, orgId, userId);

    // Relit pour renvoyer ledgerEntryId a jour ; en cas d'echec de la relecture
    // on retombe sur l'objet deja calcule (contrat de retour inchange).
    try {
      return await this.findOneInternal(this.db, id, orgId);
    } catch {
      return closed;
    }
  }

  /** Liste les mouvements (in/out) d'une session, tries par date de creation croissante. */
  async listMovements(id: number, orgId: number) {
    await this.findOneInternal(this.db, id, orgId);

    return this.db
      .select()
      .from(ktCashMovements)
      .where(and(eq(ktCashMovements.sessionId, id), eq(ktCashMovements.organizationId, orgId)))
      .orderBy(asc(ktCashMovements.createdAt));
  }

  async addMovement(id: number, input: CreateCashMovementDto, orgId: number, userId: number) {
    return this.db.transaction(async (tx) => {
      const session = await this.findOneInternal(tx, id, orgId);

      if (session.cashStatus !== "open") {
        throw new BadRequestException("Impossible d'ajouter un mouvement : session de caisse fermee.");
      }

      const [result] = await tx.insert(ktCashMovements).values({
        organizationId: orgId,
        sessionId: id,
        type: input.type,
        amount: input.amount.toFixed(2),
        reason: input.reason,
        userId,
      });

      const rows = await tx
        .select()
        .from(ktCashMovements)
        .where(eq(ktCashMovements.id, Number(result.insertId)))
        .limit(1);

      return rows[0];
    });
  }
}

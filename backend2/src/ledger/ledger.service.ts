import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, desc, eq, sql } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import {
  accountingPeriods,
  journalEntries,
  journalEntryLines,
} from "../database/schema";
import type { Database } from "../database/types";

export type LedgerSide = "DEBIT" | "CREDIT";

export interface LedgerLineInput {
  accountId: number;
  side: LedgerSide;
  amount: number;
  description?: string;
  siteId?: number;
  departmentId?: number;
  projectId?: number;
  activityId?: number;
}

export interface PostEntryInput {
  date?: Date | string;
  reference?: string;
  particulars: string;
  sourceModule?: string;
  relatedId?: string;
  currencyId?: number;
  exchangeRate?: number;
  /** Cle d'idempotence metier (ex: "sale:1042"). Une ecriture au plus par (org, cle). */
  idempotencyKey?: string;
  lines: LedgerLineInput[];
}

@Injectable()
export class LedgerService {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /** Convertit en centimes entiers pour comparer sans erreur de flottant. */
  private cents(n: number): number {
    return Math.round(n * 100);
  }

  /**
   * Comptabilise une ecriture en partie double.
   * Valide Somme(debit) = Somme(credit) et >= 2 lignes, le tout dans une transaction DB.
   * Idempotent si idempotencyKey est fourni.
   */
  async post(input: PostEntryInput, orgId: number, userId?: number) {
    if (!input.lines || input.lines.length < 2) {
      throw new BadRequestException("Une ecriture exige au moins 2 lignes.");
    }

    let totalDebit = 0;
    let totalCredit = 0;
    for (const l of input.lines) {
      if (l.side !== "DEBIT" && l.side !== "CREDIT") {
        throw new BadRequestException(`Sens invalide: ${l.side} (attendu DEBIT|CREDIT).`);
      }
      if (!(l.amount > 0)) {
        throw new BadRequestException("Chaque ligne doit avoir un montant strictement positif.");
      }
      if (l.side === "DEBIT") totalDebit += this.cents(l.amount);
      else totalCredit += this.cents(l.amount);
    }
    if (totalDebit !== totalCredit) {
      throw new BadRequestException(
        `Ecriture desequilibree: debit ${totalDebit / 100} != credit ${totalCredit / 100}.`,
      );
    }

    const entryDate = input.date ? new Date(input.date) : new Date();

    return this.db.transaction(async (tx) => {
      // Idempotence : renvoie l'ecriture existante au lieu d'en creer une seconde.
      if (input.idempotencyKey) {
        const existing = await tx
          .select({ id: journalEntries.id })
          .from(journalEntries)
          .where(
            and(
              eq(journalEntries.organizationId, orgId),
              eq(journalEntries.idempotencyKey, input.idempotencyKey),
            ),
          )
          .limit(1);
        if (existing.length) return { id: existing[0].id, idempotent: true };
      }

      const periodId = await this.resolveOpenPeriod(tx, orgId, entryDate);

      const [entry] = await tx
        .insert(journalEntries)
        .values({
          organizationId: orgId,
          date: entryDate,
          reference: input.reference,
          particulars: input.particulars,
          sourceModule: input.sourceModule,
          relatedId: input.relatedId,
          status: "posted",
          currencyId: input.currencyId,
          exchangeRate: input.exchangeRate?.toString(),
          periodId: periodId ?? undefined,
          idempotencyKey: input.idempotencyKey,
          totalDebit: (totalDebit / 100).toFixed(2),
          totalCredit: (totalCredit / 100).toFixed(2),
          createdBy: userId,
        })
        .$returningId();

      await tx.insert(journalEntryLines).values(
        input.lines.map((l) => ({
          entryId: entry.id,
          organizationId: orgId,
          accountId: l.accountId,
          side: l.side,
          amount: l.amount.toFixed(2),
          siteId: l.siteId,
          departmentId: l.departmentId,
          projectId: l.projectId,
          activityId: l.activityId,
          description: l.description,
        })),
      );

      return { id: entry.id, idempotent: false };
    });
  }

  /**
   * Contre-passation : cree une ecriture inverse liee a l'originale. Aucun DELETE.
   */
  async reverse(entryId: number, reason: string, orgId: number, userId?: number) {
    const original = await this.findOne(entryId, orgId);
    if (original.entry.reversedById) {
      throw new ConflictException("Cette ecriture a deja ete contre-passee.");
    }
    if (original.entry.status === "reversed") {
      throw new ConflictException("Cette ecriture est deja contre-passee.");
    }
    if (!reason || !reason.trim()) {
      throw new BadRequestException("Un motif de contre-passation est obligatoire.");
    }

    const reversal = await this.post(
      {
        particulars: `Contre-passation de #${entryId} - ${reason}`,
        sourceModule: original.entry.sourceModule ?? undefined,
        relatedId: original.entry.relatedId ?? undefined,
        currencyId: original.entry.currencyId ?? undefined,
        lines: original.lines.map((l) => ({
          accountId: l.accountId,
          side: (l.side === "DEBIT" ? "CREDIT" : "DEBIT") as LedgerSide,
          amount: Number(l.amount),
          description: `Extourne - ${l.description ?? ""}`.trim(),
          siteId: l.siteId ?? undefined,
          departmentId: l.departmentId ?? undefined,
          projectId: l.projectId ?? undefined,
          activityId: l.activityId ?? undefined,
        })),
      },
      orgId,
      userId,
    );

    await this.db
      .update(journalEntries)
      .set({ status: "reversed", reversedById: reversal.id, reason })
      .where(and(eq(journalEntries.id, entryId), eq(journalEntries.organizationId, orgId)));

    await this.db
      .update(journalEntries)
      .set({ reversalOfId: entryId })
      .where(eq(journalEntries.id, reversal.id));

    return { reversedEntryId: entryId, reversalEntryId: reversal.id };
  }

  /** Une ecriture + ses lignes. */
  async findOne(entryId: number, orgId: number) {
    const [entry] = await this.db
      .select()
      .from(journalEntries)
      .where(and(eq(journalEntries.id, entryId), eq(journalEntries.organizationId, orgId)))
      .limit(1);
    if (!entry) throw new NotFoundException(`Ecriture #${entryId} introuvable.`);

    const lines = await this.db
      .select()
      .from(journalEntryLines)
      .where(eq(journalEntryLines.entryId, entryId));

    return { entry, lines };
  }

  /** Liste paginee des ecritures de l'organisation. */
  async findAll(orgId: number, limit = 50, offset = 0) {
    return this.db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.organizationId, orgId))
      .orderBy(desc(journalEntries.date), desc(journalEntries.id))
      .limit(limit)
      .offset(offset);
  }

  /**
   * Grand livre d'un compte : toutes ses lignes + solde courant (debit - credit cumule).
   */
  async ledgerForAccount(accountId: number, orgId: number) {
    const rows = await this.db
      .select({
        entryId: journalEntryLines.entryId,
        date: journalEntries.date,
        reference: journalEntries.reference,
        particulars: journalEntries.particulars,
        side: journalEntryLines.side,
        amount: journalEntryLines.amount,
        status: journalEntries.status,
      })
      .from(journalEntryLines)
      .innerJoin(journalEntries, eq(journalEntries.id, journalEntryLines.entryId))
      .where(
        and(
          eq(journalEntryLines.accountId, accountId),
          eq(journalEntryLines.organizationId, orgId),
        ),
      )
      .orderBy(journalEntries.date, journalEntryLines.id);

    let balanceCents = 0;
    const lines = rows.map((r) => {
      const amt = this.cents(Number(r.amount));
      balanceCents += r.side === "DEBIT" ? amt : -amt;
      return { ...r, balance: balanceCents / 100 };
    });
    return { accountId, balance: balanceCents / 100, lines };
  }

  /** Trouve la periode ouverte couvrant la date (ou null si aucune). */
  private async resolveOpenPeriod(
    tx: Database,
    orgId: number,
    date: Date,
  ): Promise<number | null> {
    const day = date.toISOString().slice(0, 10);
    const [period] = await tx
      .select({ id: accountingPeriods.id })
      .from(accountingPeriods)
      .where(
        and(
          eq(accountingPeriods.organizationId, orgId),
          eq(accountingPeriods.status, "open"),
          sql`${accountingPeriods.startDate} <= ${day}`,
          sql`${accountingPeriods.endDate} >= ${day}`,
        ),
      )
      .limit(1);
    return period?.id ?? null;
  }
}

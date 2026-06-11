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
  accounts,
  journalEntries,
  journalEntryLines,
  subAccounts,
  transactionTypeRules,
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
   * Comptabilise via des regles parametrables (transaction_type_rules).
   * Pour un `type` donne, chaque `role` fourni dans amountsByRole est resolu en
   * compte + sens depuis la table de regles. Les montants <= 0 sont ignores.
   * Ainsi les modules n'ont plus de comptes en dur : ils nomment des roles metier.
   */
  async postByRules(
    input: {
      type: string;
      amountsByRole: Record<string, number>;
      date?: Date | string;
      reference?: string;
      particulars: string;
      sourceModule?: string;
      relatedId?: string;
      currencyId?: number;
      idempotencyKey?: string;
      dimensions?: Pick<LedgerLineInput, "siteId" | "departmentId" | "projectId" | "activityId">;
    },
    orgId: number,
    userId?: number,
  ) {
    const rules = await this.db
      .select()
      .from(transactionTypeRules)
      .where(
        and(
          eq(transactionTypeRules.organizationId, orgId),
          eq(transactionTypeRules.type, input.type),
          eq(transactionTypeRules.isActive, 1),
        ),
      );
    if (!rules.length) {
      throw new BadRequestException(
        `Aucune regle comptable pour le type "${input.type}" (org ${orgId}).`,
      );
    }

    if (!input.amountsByRole || typeof input.amountsByRole !== "object") {
      throw new BadRequestException("amountsByRole est requis (objet role -> montant).");
    }
    const lines: LedgerLineInput[] = [];
    for (const role of Object.keys(input.amountsByRole)) {
      const amount = input.amountsByRole[role];
      if (!amount || amount <= 0) continue;
      const rule = rules.find((r) => r.role === role);
      if (!rule) {
        throw new BadRequestException(
          `Role "${role}" sans regle pour le type "${input.type}".`,
        );
      }
      lines.push({
        accountId: rule.accountId,
        side: rule.side as LedgerSide,
        amount,
        description: `${input.type}:${role}`,
        ...input.dimensions,
      });
    }

    return this.post(
      {
        date: input.date,
        reference: input.reference,
        particulars: input.particulars,
        sourceModule: input.sourceModule ?? input.type,
        relatedId: input.relatedId,
        currencyId: input.currencyId,
        idempotencyKey: input.idempotencyKey,
        lines,
      },
      orgId,
      userId,
    );
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

  /**
   * Soldes par sous-compte calcules depuis le grand livre moderne (journal_entry_lines).
   * Equivalent moderne de accounts.subAccountBalances() (table plate) — sert de base
   * a la bascule des rapports (Phase 4). balance = somme(debit) - somme(credit).
   */
  async subAccountBalances(orgId: number) {
    const rows = await this.db
      .select({
        id: subAccounts.id,
        account: accounts.name,
        accountType: accounts.type,
        subAccount: subAccounts.name,
        totalDebit: sql<string>`coalesce(sum(case when ${journalEntryLines.side} = 'DEBIT' then ${journalEntryLines.amount} else 0 end), 0)`,
        totalCredit: sql<string>`coalesce(sum(case when ${journalEntryLines.side} = 'CREDIT' then ${journalEntryLines.amount} else 0 end), 0)`,
      })
      .from(subAccounts)
      .leftJoin(accounts, eq(accounts.id, subAccounts.accountId))
      .leftJoin(
        journalEntryLines,
        and(
          eq(journalEntryLines.accountId, subAccounts.id),
          eq(journalEntryLines.organizationId, orgId),
        ),
      )
      .groupBy(subAccounts.id)
      .orderBy(desc(subAccounts.id));

    return rows.map((row) => {
      const totalDebit = Math.round(Number(row.totalDebit) * 100) / 100;
      const totalCredit = Math.round(Number(row.totalCredit) * 100) / 100;
      return {
        id: row.id,
        account: row.account,
        accountType: row.accountType,
        subAccount: row.subAccount,
        totalDebit,
        totalCredit,
        balance: Math.round((totalDebit - totalCredit) * 100) / 100,
      };
    });
  }

  /**
   * Balance generale (trial balance) moderne : debits/credits par sous-compte
   * a partir du grand livre. match = true si total debit == total credit.
   */
  async trialBalance(orgId: number) {
    const items = await this.subAccountBalances(orgId);
    const debits = items.filter((i) => i.balance > 0);
    const credits = items.filter((i) => i.balance < 0);
    const totalDebit = Math.round(debits.reduce((t, i) => t + i.balance, 0) * 100) / 100;
    const totalCredit = Math.round(credits.reduce((t, i) => t + i.balance, 0) * 100) / 100;
    return { match: -totalDebit === totalCredit, totalDebit, totalCredit, debits, credits };
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

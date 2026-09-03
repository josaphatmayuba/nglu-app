import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, count, desc, eq, gte, inArray, like, lte, or, sql, sum } from "drizzle-orm";
import { alias } from "drizzle-orm/mysql-core";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { DRIZZLE } from "../database/database.constants";
import { LedgerService } from "../ledger/ledger.service";
import { currencies, subAccounts, transactionAttachments, transactions } from "../database/schema";
import type { Database } from "../database/types";

interface UploadedFile {
  buffer: Buffer;
  mimetype: string;
  originalname?: string;
  size?: number;
}
import {
  CreateTransactionDto,
  TransactionQueryDto,
  UpdateTransactionDto,
} from "./dto/transaction.dto";

const debitAccount = alias(subAccounts, "debitAccount");
const creditAccount = alias(subAccounts, "creditAccount");

@Injectable()
export class TransactionsService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly ledger: LedgerService,
  ) {}

  async create(input: CreateTransactionDto, orgId: number) {
    await this.ensureAccountsExist([input.debitId, input.creditId], orgId);

    const [result] = await this.db.insert(transactions).values({
      organizationId: orgId,
      date: new Date(input.date),
      debitId: input.debitId,
      creditId: input.creditId,
      particulars: input.particulars,
      amount: input.amount,
      currencyId: input.currencyId ?? null,
      type: input.type ?? "transaction",
      relatedId: input.relatedId ?? "0",
      status: input.status ?? "true",
      createdAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
    });

    const transactionId = Number(result.insertId);

    // Toute saisie manuelle est AUSSI comptabilisee au grand livre (partie double),
    // sinon elle n'apparait dans aucun menu compta (Grand livre, Tresorerie, Tiers,
    // Analytique...) qui lisent tous uniquement le ledger. Le project_id (optionnel)
    // est porte sur les lignes pour le rapport Analytique projet. Idempotent
    // (manual_transaction:<id>). L'erreur ledger (periode fermee, compte invalide)
    // remonte volontairement : mieux vaut un echec clair qu'une ecriture fantome.
    await this.postToLedger(transactionId, input, orgId);

    return this.findOne(transactionId, orgId);
  }

  /**
   * Rattrapage : rejoue au grand livre toutes les transactions actives de l'org qui
   * n'y ont jamais ete postees (saisies avant le fix qui ne postait qu'avec projet).
   * Idempotent grace a la cle manual_transaction:<id> ; relancer est sans danger.
   */
  async backfillLedger(orgId: number) {
    const rows = await this.db
      .select({
        id: transactions.id,
        date: transactions.date,
        debitId: transactions.debitId,
        creditId: transactions.creditId,
        particulars: transactions.particulars,
        amount: transactions.amount,
        currencyId: transactions.currencyId,
      })
      .from(transactions)
      .where(and(eq(transactions.organizationId, orgId), eq(transactions.status, "true")));

    let posted = 0;
    let skipped = 0;
    const errors: { id: number; message: string }[] = [];
    for (const r of rows) {
      try {
        const res = await this.ledger.post(
          {
            date: new Date(r.date),
            particulars: r.particulars,
            sourceModule: "manual_transaction",
            relatedId: String(r.id),
            currencyId: r.currencyId ?? undefined,
            idempotencyKey: `manual_transaction:${r.id}`,
            skipApprovalGate: true,
            lines: [
              { accountId: r.debitId, side: "DEBIT", amount: r.amount, description: r.particulars },
              { accountId: r.creditId, side: "CREDIT", amount: r.amount, description: r.particulars },
            ],
          },
          orgId,
        );
        if ((res as any)?.idempotent) skipped++;
        else posted++;
      } catch (e) {
        errors.push({ id: r.id, message: (e as Error).message });
      }
    }
    return { total: rows.length, posted, skipped, errors };
  }

  /** Comptabilise une transaction manuelle au grand livre (dimension projet si fournie). */
  private async postToLedger(
    transactionId: number,
    input: CreateTransactionDto,
    orgId: number,
  ) {
    await this.ledger.post(
      {
        date: new Date(input.date),
        particulars: input.particulars,
        sourceModule: "manual_transaction",
        relatedId: String(transactionId),
        currencyId: input.currencyId ?? undefined,
        idempotencyKey: `manual_transaction:${transactionId}`,
        skipApprovalGate: true,
        lines: [
          { accountId: input.debitId, side: "DEBIT", amount: input.amount, projectId: input.projectId ?? undefined, description: input.particulars },
          { accountId: input.creditId, side: "CREDIT", amount: input.amount, projectId: input.projectId ?? undefined, description: input.particulars },
        ],
      },
      orgId,
    );
  }

  async findAll(query: TransactionQueryDto, orgId: number) {
    if (query.query === "info") {
      const [row] = await this.db
        .select({
          totalCount: count(transactions.id),
          totalAmount: sum(transactions.amount),
        })
        .from(transactions)
        .where(and(eq(transactions.status, "true"), eq(transactions.organizationId, orgId)));

      return {
        _count: { id: Number(row.totalCount ?? 0) },
        _sum: { amount: row.totalAmount ?? null },
      };
    }

    if (query.query === "all") {
      return this.baseQuery()
        .where(and(eq(transactions.organizationId, orgId), eq(transactions.status, "true")))
        .orderBy(desc(transactions.id));
    }

    if (query.query === "search") {
      return this.search(query, orgId);
    }

    const status = query.query === "inactive" ? "false" : query.status;
    return this.paginated(query, orgId, status);
  }

  async findOne(id: number, orgId: number) {
    const rows = await this.baseQuery()
      .where(and(eq(transactions.id, id), eq(transactions.organizationId, orgId)))
      .limit(1);

    if (!rows.length) {
      throw new NotFoundException("Transaction not found.");
    }

    return rows[0];
  }

  async update(id: number, input: UpdateTransactionDto, orgId: number) {
    await this.ensureTransactionExists(id, orgId);

    const accountIds = [input.debitId, input.creditId].filter(
      (accountId): accountId is number => typeof accountId === "number",
    );
    await this.ensureAccountsExist(accountIds, orgId);

    await this.db
      .update(transactions)
      .set({
        ...(input.date !== undefined ? { date: new Date(input.date) } : {}),
        ...(input.debitId !== undefined ? { debitId: input.debitId } : {}),
        ...(input.creditId !== undefined ? { creditId: input.creditId } : {}),
        ...(input.particulars !== undefined ? { particulars: input.particulars } : {}),
        ...(input.amount !== undefined ? { amount: input.amount } : {}),
        ...(input.currencyId !== undefined ? { currencyId: input.currencyId } : {}),
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.relatedId !== undefined ? { relatedId: input.relatedId } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(and(eq(transactions.id, id), eq(transactions.organizationId, orgId)));

    return this.findOne(id, orgId);
  }

  async updateStatus(id: number, status: string, orgId: number) {
    await this.ensureTransactionExists(id, orgId);

    await this.db
      .update(transactions)
      .set({ status, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(transactions.id, id), eq(transactions.organizationId, orgId)));

    return { message: "Transaction deleted successfully" };
  }

  private async search(query: TransactionQueryDto, orgId: number) {
    const key = `%${query.key?.trim() || ""}%`;
    const pagination = this.pagination(query);
    const where = or(
      like(sql`cast(${transactions.id} as char)`, key),
      like(transactions.type, key),
      like(transactions.particulars, key),
      like(debitAccount.name, key),
      like(creditAccount.name, key),
    );

    const orgFilter = and(eq(transactions.organizationId, orgId), eq(transactions.status, "true"));
    const rows = await this.baseQuery()
      .where(and(orgFilter, where))
      .orderBy(desc(transactions.id))
      .limit(pagination.limit)
      .offset(pagination.skip);
    const [total] = await this.db
      .select({ total: count(transactions.id) })
      .from(transactions)
      .leftJoin(debitAccount, eq(debitAccount.id, transactions.debitId))
      .leftJoin(creditAccount, eq(creditAccount.id, transactions.creditId))
      .where(and(orgFilter, where));

    return {
      getAllTransaction: rows,
      totalTransaction: Number(total.total ?? 0),
    };
  }

  private async paginated(query: TransactionQueryDto, orgId: number, forcedStatus?: string) {
    const pagination = this.pagination(query);
    const conditions = this.filterConditions(query, orgId, forcedStatus);
    const where = conditions.length ? and(...conditions) : undefined;

    const [aggregate] = await this.db
      .select({
        totalCount: count(transactions.id),
        totalAmount: sum(transactions.amount),
      })
      .from(transactions)
      .where(where);

    const rows = await this.baseQuery()
      .where(where)
      .orderBy(desc(transactions.id))
      .limit(pagination.limit)
      .offset(pagination.skip);

    return {
      aggregations: {
        _count: { id: Number(aggregate.totalCount ?? 0) },
        _sum: { amount: aggregate.totalAmount ?? null },
      },
      getAllTransaction: rows,
      totalTransaction: Number(aggregate.totalCount ?? 0),
    };
  }

  private filterConditions(query: TransactionQueryDto, orgId: number, forcedStatus?: string) {
    const conditions = [eq(transactions.organizationId, orgId)];
    const startDate = query.startDate ? new Date(query.startDate) : null;
    const endDate = query.endDate ? new Date(query.endDate) : null;

    if (startDate) conditions.push(gte(transactions.date, startDate));
    if (endDate) conditions.push(lte(transactions.date, endDate));

    const statuses = this.csv(forcedStatus ?? query.status);
    if (statuses.length) conditions.push(inArray(transactions.status, statuses));

    const debitIds = this.csvNumber(query.debitId);
    if (debitIds.length) conditions.push(inArray(transactions.debitId, debitIds));

    const creditIds = this.csvNumber(query.creditId);
    if (creditIds.length) conditions.push(inArray(transactions.creditId, creditIds));

    return conditions;
  }

  private baseQuery() {
    return this.db
      .select({
        id: transactions.id,
        date: transactions.date,
        debitId: transactions.debitId,
        creditId: transactions.creditId,
        particulars: transactions.particulars,
        amount: transactions.amount,
        currencyId: transactions.currencyId,
        currencySymbol: currencies.currencySymbol,
        currencyName: currencies.currencyName,
        type: transactions.type,
        relatedId: transactions.relatedId,
        status: transactions.status,
        createdAt: transactions.createdAt,
        updatedAt: transactions.updatedAt,
        debit: {
          id: debitAccount.id,
          name: debitAccount.name,
        },
        credit: {
          id: creditAccount.id,
          name: creditAccount.name,
        },
      })
      .from(transactions)
      .leftJoin(debitAccount, eq(debitAccount.id, transactions.debitId))
      .leftJoin(creditAccount, eq(creditAccount.id, transactions.creditId))
      .leftJoin(currencies, eq(currencies.id, transactions.currencyId));
  }

  private async ensureTransactionExists(id: number, orgId: number) {
    const rows = await this.db
      .select({ id: transactions.id })
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.organizationId, orgId)))
      .limit(1);
    if (!rows.length) {
      throw new NotFoundException("Transaction not found.");
    }
  }

  private async ensureAccountsExist(accountIds: number[], orgId: number) {
    const uniqueAccountIds = [...new Set(accountIds)];
    if (!uniqueAccountIds.length) return;

    // Les sous-comptes debites/credites doivent appartenir a l org (anti-fuite :
    // pas d ecriture sur le compte d une autre organisation).
    const rows = await this.db
      .select({ id: subAccounts.id })
      .from(subAccounts)
      .where(and(inArray(subAccounts.id, uniqueAccountIds), eq(subAccounts.organizationId, orgId)));

    if (rows.length !== uniqueAccountIds.length) {
      throw new BadRequestException("Debit or credit account does not exist.");
    }
  }

  private pagination(query: TransactionQueryDto) {
    const limit = Math.max(1, Number(query.limit || 10));
    const page = Math.max(1, Number(query.page || 1));
    return {
      limit,
      skip: (page - 1) * limit,
    };
  }

  private csv(value?: string) {
    return value
      ? value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : [];
  }

  private csvNumber(value?: string) {
    return this.csv(value)
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item));
  }

  // ─────────────── Justificatifs (recus/factures) ───────────────

  private readonly uploadDir = join(process.cwd(), "storage", "app", "uploads");

  private validateMagicBytes(buffer: Buffer, mimetype: string): boolean {
    const s = buffer.subarray(0, 12);
    switch (mimetype) {
      case "image/jpeg": return s[0] === 0xff && s[1] === 0xd8 && s[2] === 0xff;
      case "image/png":  return s.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
      case "image/webp": return s.subarray(0, 4).toString("ascii") === "RIFF" && s.subarray(8, 12).toString("ascii") === "WEBP";
      case "application/pdf": return s.subarray(0, 4).toString("ascii") === "%PDF";
      default: return false;
    }
  }

  private saveFile(file: UploadedFile): { name: string; path: string } {
    if (!this.validateMagicBytes(file.buffer, file.mimetype)) {
      throw new BadRequestException("Le contenu du fichier ne correspond pas au type declare (jpg/png/webp/pdf).");
    }
    if (!existsSync(this.uploadDir)) mkdirSync(this.uploadDir, { recursive: true });
    const mimeToExt: Record<string, string> = {
      "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf",
    };
    const ext = mimeToExt[file.mimetype] || "bin";
    const name = `${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;
    writeFileSync(join(this.uploadDir, name), file.buffer);
    return { name, path: `/files/${name}` };
  }

  /** Attache un justificatif a une transaction (apres validation d'existence). */
  async addAttachment(transactionId: number, file: UploadedFile, orgId: number, userId?: number) {
    if (!file) throw new BadRequestException("Aucun fichier recu.");
    await this.ensureTransactionExists(transactionId, orgId);
    const { path } = this.saveFile(file);
    const [result] = await this.db.insert(transactionAttachments).values({
      organizationId: orgId,
      transactionId,
      url: path,
      filename: file.originalname ?? null,
      mimetype: file.mimetype,
      sizeBytes: file.size ?? null,
      createdBy: userId,
    });
    return { id: Number(result.insertId), url: path };
  }

  /** Liste les justificatifs actifs d'une transaction. */
  async listAttachments(transactionId: number, orgId: number) {
    return this.db
      .select()
      .from(transactionAttachments)
      .where(
        and(
          eq(transactionAttachments.transactionId, transactionId),
          eq(transactionAttachments.organizationId, orgId),
          eq(transactionAttachments.status, "true"),
        ),
      )
      .orderBy(desc(transactionAttachments.id));
  }

  /** Soft-delete d'un justificatif (status='false'). */
  async removeAttachment(attachmentId: number, orgId: number) {
    await this.db
      .update(transactionAttachments)
      .set({ status: "false", updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(
        and(
          eq(transactionAttachments.id, attachmentId),
          eq(transactionAttachments.organizationId, orgId),
        ),
      );
    return { message: "Attachment deleted" };
  }
}

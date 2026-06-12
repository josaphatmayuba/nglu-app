import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { and, desc, eq } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import { currencies, currencyExchanges } from "../database/schema";
import type { Database } from "../database/types";
import { LedgerService } from "./ledger.service";

export interface CreateExchangeInput {
  date?: Date | string;
  reference?: string;
  note?: string;
  /** Devise vendue (qui sort de la caisse/banque). */
  fromCurrencyId: number;
  /** Sous-compte source debite (la caisse/banque dans la devise source). */
  fromAccountId: number;
  /** Montant reel sorti dans la devise source. */
  fromAmount: number;
  /** Devise achetee (qui entre). */
  toCurrencyId: number;
  /** Sous-compte cible credite (la caisse/banque dans la devise cible). */
  toAccountId: number;
  /**
   * Saisie flexible : fournir SOIT toAmount (montant reel recu) SOIT rate (taux
   * applique). Le 3e champ est deduit. Si les deux sont fournis, toAmount prime
   * et le taux est recalcule pour rester fidele aux VRAIS chiffres.
   */
  toAmount?: number;
  rate?: number;
  /** Frais de change optionnels (commission). 0 ou absent = pas de frais. */
  feeAmount?: number;
  /** Sous-compte de charge "Frais de change" (requis si feeAmount > 0). */
  feeAccountId?: number;
  /** Devise des frais (defaut = devise source). */
  feeCurrencyId?: number;
  /** Sous-compte de change (pont) pour la devise source. */
  fromExchangeAccountId: number;
  /** Sous-compte de change (pont) pour la devise cible. */
  toExchangeAccountId: number;
  idempotencyKey?: string;
}

@Injectable()
export class ExchangeService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly ledger: LedgerService,
  ) {}

  /** Arrondi 2 decimales. */
  private round2(n: number): number {
    return Math.round(n * 100) / 100;
  }

  /**
   * Enregistre un echange de devise facon banque : on stocke les VRAIS montants
   * des deux cotes et le taux reel, puis on pose 2 (ou 3) ecritures comptables
   * liees, chacune equilibree dans SA devise via un sous-compte de change.
   *
   *   Ecriture source (devise A) : DEBIT compte_change_A / CREDIT caisse_A   = fromAmount
   *   Ecriture cible  (devise B) : DEBIT caisse_B / CREDIT compte_change_B   = toAmount
   *   Ecriture frais  (si frais) : DEBIT frais_change / CREDIT caisse_frais  = feeAmount
   *
   * Aucune valeur n'est estimee : le pont "compte de change" porte l'ecart reel.
   */
  async create(input: CreateExchangeInput, orgId: number, userId?: number) {
    if (input.fromCurrencyId === input.toCurrencyId) {
      throw new BadRequestException("Les devises source et cible doivent etre differentes.");
    }
    if (!(input.fromAmount > 0)) {
      throw new BadRequestException("Le montant source doit etre strictement positif.");
    }

    // Saisie flexible : deduire toAmount ou rate selon ce qui est fourni.
    let toAmount = input.toAmount;
    let rate = input.rate;
    if (toAmount != null && toAmount > 0) {
      // Montants reels prioritaires : le taux est deduit (rate = recu / vendu).
      rate = this.round6(toAmount / input.fromAmount);
    } else if (rate != null && rate > 0) {
      toAmount = this.round2(input.fromAmount * rate);
    } else {
      throw new BadRequestException("Fournir le montant recu (toAmount) ou le taux (rate).");
    }
    if (!(toAmount! > 0)) {
      throw new BadRequestException("Le montant cible doit etre strictement positif.");
    }

    const feeAmount = this.round2(input.feeAmount ?? 0);
    if (feeAmount > 0 && !input.feeAccountId) {
      throw new BadRequestException("Un compte de frais est requis lorsque des frais sont saisis.");
    }
    const feeCurrencyId = input.feeCurrencyId ?? input.fromCurrencyId;

    const key = input.idempotencyKey;
    if (key) {
      const [existing] = await this.db
        .select({ id: currencyExchanges.id })
        .from(currencyExchanges)
        .where(and(eq(currencyExchanges.organizationId, orgId), eq(currencyExchanges.idempotencyKey, key)))
        .limit(1);
      if (existing) return { id: existing.id, idempotent: true };
    }

    const date = input.date ? new Date(input.date) : new Date();
    const ref = input.reference;
    const note = input.note ?? "Echange de devise";

    // Les trois ecritures partagent la meme cle d'idempotence (suffixee) pour un
    // rejeu propre, et chacune reste equilibree dans sa propre devise.
    const fromEntry = await this.ledger.post(
      {
        date,
        reference: ref,
        particulars: `${note} (sortie ${input.fromAmount})`,
        sourceModule: "currency_exchange",
        currencyId: input.fromCurrencyId,
        skipApprovalGate: true,
        idempotencyKey: key ? `${key}:from` : undefined,
        lines: [
          { accountId: input.fromExchangeAccountId, side: "DEBIT", amount: input.fromAmount, description: "Compte de change" },
          { accountId: input.fromAccountId, side: "CREDIT", amount: input.fromAmount, description: "Sortie devise source" },
        ],
      },
      orgId,
      userId,
    );

    const toEntry = await this.ledger.post(
      {
        date,
        reference: ref,
        particulars: `${note} (entree ${toAmount})`,
        sourceModule: "currency_exchange",
        currencyId: input.toCurrencyId,
        exchangeRate: rate,
        skipApprovalGate: true,
        idempotencyKey: key ? `${key}:to` : undefined,
        lines: [
          { accountId: input.toAccountId, side: "DEBIT", amount: toAmount!, description: "Entree devise cible" },
          { accountId: input.toExchangeAccountId, side: "CREDIT", amount: toAmount!, description: "Compte de change" },
        ],
      },
      orgId,
      userId,
    );

    let feeEntryId: number | undefined;
    if (feeAmount > 0) {
      const feeEntry = await this.ledger.post(
        {
          date,
          reference: ref,
          particulars: `${note} - frais de change (${feeAmount})`,
          sourceModule: "currency_exchange",
          currencyId: feeCurrencyId,
          skipApprovalGate: true,
          idempotencyKey: key ? `${key}:fee` : undefined,
          lines: [
            { accountId: input.feeAccountId!, side: "DEBIT", amount: feeAmount, description: "Frais de change" },
            { accountId: input.fromAccountId, side: "CREDIT", amount: feeAmount, description: "Frais preleves" },
          ],
        },
        orgId,
        userId,
      );
      feeEntryId = feeEntry.id;
    }

    const [row] = await this.db
      .insert(currencyExchanges)
      .values({
        organizationId: orgId,
        date,
        reference: ref,
        note,
        fromCurrencyId: input.fromCurrencyId,
        fromAccountId: input.fromAccountId,
        fromAmount: input.fromAmount.toFixed(2),
        toCurrencyId: input.toCurrencyId,
        toAccountId: input.toAccountId,
        toAmount: toAmount!.toFixed(2),
        rate: rate!.toFixed(6),
        feeAmount: feeAmount.toFixed(2),
        feeCurrencyId: feeAmount > 0 ? feeCurrencyId : null,
        feeAccountId: feeAmount > 0 ? input.feeAccountId : null,
        fromEntryId: fromEntry.id,
        toEntryId: toEntry.id,
        feeEntryId,
        idempotencyKey: key,
        status: "posted",
        createdBy: userId,
      })
      .$returningId();

    return {
      id: row.id,
      fromAmount: input.fromAmount,
      toAmount,
      rate,
      feeAmount,
      fromEntryId: fromEntry.id,
      toEntryId: toEntry.id,
      feeEntryId,
    };
  }

  /** Arrondi 6 decimales pour le taux. */
  private round6(n: number): number {
    return Math.round(n * 1e6) / 1e6;
  }

  /** Liste paginee des echanges (avec codes devises lisibles). */
  async findAll(orgId: number, limit = 50, offset = 0) {
    const fromCur = currencies;
    return this.db
      .select({
        id: currencyExchanges.id,
        date: currencyExchanges.date,
        reference: currencyExchanges.reference,
        note: currencyExchanges.note,
        fromCurrencyId: currencyExchanges.fromCurrencyId,
        fromAmount: currencyExchanges.fromAmount,
        toCurrencyId: currencyExchanges.toCurrencyId,
        toAmount: currencyExchanges.toAmount,
        rate: currencyExchanges.rate,
        feeAmount: currencyExchanges.feeAmount,
        status: currencyExchanges.status,
        createdAt: currencyExchanges.createdAt,
      })
      .from(currencyExchanges)
      .where(eq(currencyExchanges.organizationId, orgId))
      .orderBy(desc(currencyExchanges.date), desc(currencyExchanges.id))
      .limit(limit)
      .offset(offset);
  }

  /** Detail d'un echange. */
  async findOne(id: number, orgId: number) {
    const [row] = await this.db
      .select()
      .from(currencyExchanges)
      .where(and(eq(currencyExchanges.id, id), eq(currencyExchanges.organizationId, orgId)))
      .limit(1);
    if (!row) throw new NotFoundException(`Echange #${id} introuvable.`);
    return row;
  }

  /**
   * Annule un echange : contre-passe les ecritures liees (aucun DELETE) et marque
   * l'echange status=reversed.
   */
  async reverse(id: number, reason: string, orgId: number, userId?: number) {
    const ex = await this.findOne(id, orgId);
    if (ex.status === "reversed") {
      throw new ConflictException("Cet echange est deja annule.");
    }
    if (!reason || !reason.trim()) {
      throw new BadRequestException("Un motif d'annulation est obligatoire.");
    }
    if (ex.fromEntryId) await this.ledger.reverse(ex.fromEntryId, reason, orgId, userId);
    if (ex.toEntryId) await this.ledger.reverse(ex.toEntryId, reason, orgId, userId);
    if (ex.feeEntryId) await this.ledger.reverse(ex.feeEntryId, reason, orgId, userId);

    await this.db
      .update(currencyExchanges)
      .set({ status: "reversed" })
      .where(and(eq(currencyExchanges.id, id), eq(currencyExchanges.organizationId, orgId)));
    return { id, status: "reversed" };
  }
}

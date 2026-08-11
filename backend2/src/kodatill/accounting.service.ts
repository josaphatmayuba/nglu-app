import { Inject, Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { DRIZZLE } from "../database/database.constants";
import { currencies, ktCashSessions, ktExpenses, subAccounts } from "../database/schema";
import type { Database } from "../database/types";
import { LedgerService } from "../ledger/ledger.service";

/**
 * Branchement comptable de KodaTill vers le grand livre ERP/SIFA (SCRUM-307, Phase 5).
 *
 * PRINCIPES (module comptable EN PRODUCTION, prudence maximale) :
 *  - Effet de bord UNIQUEMENT : jamais d'exception propagee vers l'appelant metier.
 *    Une caisse doit pouvoir se fermer et une depense s'enregistrer meme si la
 *    comptabilisation echoue (compte absent, periode cloturee, gate d'approbation).
 *    L'echec est trace en warn et rejouable (idempotence par cle metier).
 *  - Aucune ecriture par ticket : la cloture de caisse produit UNE ecriture agregee.
 *  - Aucun id de compte en dur : resolution par NOM, scopee a l'organisation
 *    (meme pattern que property-management.service.ts / batipro.service.ts).
 *  - Aucune creation de compte : si le compte canonique n'existe pas pour l'org,
 *    on ne comptabilise pas (le plan comptable reste du ressort de la compta).
 *  - Aucune conversion de devise inventee : le ledger tient un sous-livre par
 *    devise (currencyId porte par l'en-tete journal_entries, cf. ledger.service
 *    subAccountBalances/totalsByCurrency). On resout donc le code devise KodaTill
 *    (kt_*.currency_code, ex "USD") vers currency.id et on le transmet tel quel.
 *    ExchangeService ne sert PAS a convertir : il enregistre une operation de
 *    change reelle (achat/vente de devise) avec ses vrais montants ; l'appeler ici
 *    inventerait une operation de change qui n'a pas eu lieu.
 */
@Injectable()
export class KodatillAccountingService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly ledger: LedgerService,
  ) {}

  /**
   * Comptes canoniques du plan comptable partage (chart-of-accounts.ts + migration 0149).
   * `Cash` et `Sales` sont provisionnes pour toute organisation.
   * `Frais de bureau et divers` est le compte de charge GENERIQUE issu de la
   * migration 0149 (regroupement des charges par nature).
   *
   * A VALIDER AVEC LA COMPTA : le mapping fin categorie KodaTill -> compte de
   * charge par nature (ex "Carburant" -> "Carburant et energie") n'est pas
   * tranche ici volontairement. Tant qu'aucune table de correspondance
   * kt_expense_categories -> subAccount n'existe, toutes les depenses KodaTill
   * vont sur le compte generique ci-dessous, le detail restant lisible dans
   * particulars / description de la ligne.
   */
  private static readonly ACCOUNT_CASH = "Cash";
  private static readonly ACCOUNT_SALES = "Sales";
  private static readonly ACCOUNT_EXPENSE_GENERIC = "Frais de bureau et divers";
  /** Repli si l'org n'a pas encore les comptes canoniques de la migration 0149. */
  private static readonly ACCOUNT_EXPENSE_FALLBACK = "Cost of Sales";

  /** Resout un sous-compte par nom pour CETTE organisation. Ne cree jamais rien. */
  private async findSubAccountId(name: string, orgId: number): Promise<number | null> {
    const [row] = await this.db
      .select({ id: subAccounts.id })
      .from(subAccounts)
      .where(
        and(
          eq(subAccounts.name, name),
          eq(subAccounts.organizationId, orgId),
          eq(subAccounts.status, "true"),
        ),
      )
      .limit(1);
    return row?.id ?? null;
  }

  /**
   * Resout un code devise KodaTill ("USD") vers currency.id.
   * `currency` est une table globale (pas d'organizationId) et currencyCode peut
   * etre NULL sur des lignes historiques (cf. migration 0148) : on ignore ces
   * lignes en comparant sur le code exact, actif uniquement.
   */
  private async findCurrencyId(code?: string | null): Promise<number | null> {
    if (!code) return null;
    const [row] = await this.db
      .select({ id: currencies.id })
      .from(currencies)
      .where(and(eq(currencies.currencyCode, code), eq(currencies.status, "true")))
      .limit(1);
    return row?.id ?? null;
  }

  /**
   * Cloture de caisse -> UNE ecriture agregee (jamais une par ticket).
   *
   *   DEBIT  Cash   = total encaisse de la session
   *   CREDIT Sales  = total encaisse de la session
   *
   * Base retenue = countedCash - openingFloat, soit l'encaisse REELLEMENT
   * generee par la session (le fond de caisse initial est deja en comptabilite,
   * le recomptabiliser gonflerait les ventes a chaque ouverture/fermeture).
   * On part du compte REEL (countedCash) et non de l'attendu : l'ecart de caisse
   * (variance) est donc intrinsequement absorbe, sans compte d'ecart dedie.
   *
   * A VALIDER AVEC LA COMPTA : traiter la variance sur un compte d'ecart de
   * caisse distinct (ex "Ecart de caisse") plutot que de l'absorber dans Sales.
   * Ce compte n'existe pas au plan comptable actuel : je ne l'invente pas ici.
   *
   * IDEMPOTENCE (double barriere) :
   *  1. session.ledgerEntryId deja non-null -> on ne fait rien ;
   *  2. idempotencyKey "kodatill_cash_session:<id>" cote ledger -> meme en cas de
   *     course, ledger.post renvoie l'ecriture existante au lieu d'en creer une 2e.
   *
   * @returns l'id de l'ecriture, ou null si rien n'a ete comptabilise.
   */
  async postCashSessionClosure(sessionId: number, orgId: number, userId?: number): Promise<number | null> {
    try {
      const [session] = await this.db
        .select()
        .from(ktCashSessions)
        .where(and(eq(ktCashSessions.id, sessionId), eq(ktCashSessions.organizationId, orgId)))
        .limit(1);
      if (!session) return null;

      // Barriere 1 : deja comptabilisee.
      if (session.ledgerEntryId != null) return session.ledgerEntryId;
      if (session.cashStatus !== "closed") return null;

      const openingFloat = Number(session.openingFloat ?? 0);
      const countedCash = Number(session.countedCash ?? 0);
      const amount = Math.round((countedCash - openingFloat) * 100) / 100;
      // Session sans encaissement net (ou caisse deficitaire) : aucune ecriture.
      // Un montant negatif exigerait un sens inverse, donc une decision comptable
      // (avoir ? ecart de caisse ?) qui n'est pas tranchee : on s'abstient.
      if (!(amount > 0)) return null;

      const cashAccountId = await this.findSubAccountId(KodatillAccountingService.ACCOUNT_CASH, orgId);
      const salesAccountId = await this.findSubAccountId(KodatillAccountingService.ACCOUNT_SALES, orgId);
      if (!cashAccountId || !salesAccountId) {
        console.warn(
          `[KodaTill] Cloture caisse #${sessionId} non comptabilisee : compte "Cash" ou "Sales" absent du plan comptable de l'org ${orgId}.`,
        );
        return null;
      }

      const currencyId = await this.findCurrencyId(session.currencyCode);
      const particulars =
        `Cloture caisse KodaTill #${sessionId} - encaissements du jour (agrege)`.slice(0, 250);

      // Barriere 2 : idempotence cote ledger.
      const entry = await this.ledger.post(
        {
          date: session.closedAt ? new Date(session.closedAt) : undefined,
          reference: `KTCASH-${sessionId}`,
          particulars,
          sourceModule: "kodatill_cash_session",
          relatedId: String(sessionId),
          currencyId: currencyId ?? undefined,
          idempotencyKey: `kodatill_cash_session:${sessionId}`,
          lines: [
            { accountId: cashAccountId, side: "DEBIT", amount, description: "Encaissements caisse KodaTill" },
            { accountId: salesAccountId, side: "CREDIT", amount, description: "Ventes KodaTill" },
          ],
        },
        orgId,
        userId,
      );

      // deferred = ecriture mise en attente d'approbation (id 0) : on ne lie pas.
      if (!entry?.id) return null;

      await this.db
        .update(ktCashSessions)
        .set({ ledgerEntryId: entry.id })
        .where(and(eq(ktCashSessions.id, sessionId), eq(ktCashSessions.organizationId, orgId)));

      return entry.id;
    } catch (err) {
      // Effet de bord : la cloture metier reste valide meme si la compta echoue.
      console.warn(`[KodaTill] postCashSessionClosure(#${sessionId}) echoue :`, (err as Error).message);
      return null;
    }
  }

  /**
   * Depense KodaTill -> une ecriture.
   *
   *   DEBIT  charge (compte generique, cf. ACCOUNT_EXPENSE_GENERIC)
   *   CREDIT Cash
   *
   * Il n'existe aujourd'hui aucun workflow de confirmation sur kt_expenses
   * (pas de colonne d'etat autre que status soft-delete) : la comptabilisation
   * a donc lieu a la creation. Si le module "kodatill_expense" est ajoute aux
   * gates d'approbation (ledger_approval_requirements), ledger.post differera
   * automatiquement l'ecriture (ledger_pending_entries) et renverra id 0 : dans
   * ce cas ledgerEntryId reste NULL jusqu'a approveAndPost.
   *
   * IDEMPOTENCE : meme double barriere que la cloture de caisse
   * (ledgerEntryId non-null + idempotencyKey "kodatill_expense:<id>").
   */
  async postExpense(expenseId: number, orgId: number, userId?: number): Promise<number | null> {
    try {
      const [expense] = await this.db
        .select()
        .from(ktExpenses)
        .where(and(eq(ktExpenses.id, expenseId), eq(ktExpenses.organizationId, orgId)))
        .limit(1);
      if (!expense) return null;

      // Barriere 1 : deja comptabilisee.
      if (expense.ledgerEntryId != null) return expense.ledgerEntryId;
      if (expense.status !== "true") return null;

      const amount = Math.round(Number(expense.amount ?? 0) * 100) / 100;
      if (!(amount > 0)) return null;

      const expenseAccountId =
        (await this.findSubAccountId(KodatillAccountingService.ACCOUNT_EXPENSE_GENERIC, orgId)) ??
        (await this.findSubAccountId(KodatillAccountingService.ACCOUNT_EXPENSE_FALLBACK, orgId));
      const cashAccountId = await this.findSubAccountId(KodatillAccountingService.ACCOUNT_CASH, orgId);
      if (!expenseAccountId || !cashAccountId) {
        console.warn(
          `[KodaTill] Depense #${expenseId} non comptabilisee : compte de charge generique ou "Cash" absent du plan comptable de l'org ${orgId}.`,
        );
        return null;
      }

      const currencyId = await this.findCurrencyId(expense.currencyCode);
      const particulars = `Depense KodaTill - ${expense.label}`.slice(0, 250);

      // Barriere 2 : idempotence cote ledger.
      const entry = await this.ledger.post(
        {
          date: expense.expenseDate ? new Date(expense.expenseDate) : undefined,
          reference: `KTEXP-${expenseId}`,
          particulars,
          sourceModule: "kodatill_expense",
          relatedId: String(expenseId),
          currencyId: currencyId ?? undefined,
          idempotencyKey: `kodatill_expense:${expenseId}`,
          lines: [
            { accountId: expenseAccountId, side: "DEBIT", amount, description: particulars },
            { accountId: cashAccountId, side: "CREDIT", amount, description: "Reglement caisse KodaTill" },
          ],
        },
        orgId,
        userId,
      );

      // deferred (gate d'approbation) : id 0, on ne lie pas.
      if (!entry?.id) return null;

      await this.db
        .update(ktExpenses)
        .set({ ledgerEntryId: entry.id })
        .where(and(eq(ktExpenses.id, expenseId), eq(ktExpenses.organizationId, orgId)));

      return entry.id;
    } catch (err) {
      // Effet de bord : la depense reste enregistree meme si la compta echoue.
      console.warn(`[KodaTill] postExpense(#${expenseId}) echoue :`, (err as Error).message);
      return null;
    }
  }
}

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
   * TRANCHE AVEC LA COMPTA (SCRUM-307) : le mapping fin categorie KodaTill ->
   * compte de charge par nature n'est PAS fait, volontairement. Toutes les
   * depenses KodaTill restent sur le compte generique ci-dessous : le detail par
   * categorie est deja consultable cote KodaTill, l'eclater en comptabilite
   * n'apporte rien pour l'instant. Le libelle de la depense reste lisible dans
   * particulars / description de la ligne.
   *
   * TRANCHE AUSSI : aucune dimension succursale (branchId -> siteId/departmentId)
   * n'est portee sur les lignes, meme si LedgerLineInput le permettrait. Hors
   * scope tant que le besoin d'analytique multi-succursale en compta n'est pas
   * confirme.
   */
  private static readonly ACCOUNT_CASH = "Cash";
  private static readonly ACCOUNT_SALES = "Sales";
  private static readonly ACCOUNT_EXPENSE_GENERIC = "Frais de bureau et divers";
  /** Repli si l'org n'a pas encore les comptes canoniques de la migration 0149. */
  private static readonly ACCOUNT_EXPENSE_FALLBACK = "Cost of Sales";
  /**
   * Compte d'ecart de caisse (excedent ou manquant constate au comptage).
   *
   * PRE-REQUIS OPERATIONNEL : ce compte n'est PAS encore au plan comptable
   * canonique (provisioning/chart-of-accounts.ts, migration 0149). Il doit y etre
   * ajoute (migration ou saisie manuelle par la compta) AVANT que la
   * comptabilisation des clotures de caisse fonctionne en production. Conformement
   * a la regle du fichier, ce service ne cree jamais de compte : tant qu'il est
   * absent pour l'org, la cloture n'est simplement pas comptabilisee (warn), au
   * lieu de fabriquer un compte ou de produire une ecriture desequilibree.
   */
  private static readonly ACCOUNT_CASH_VARIANCE = "Ecart de caisse";

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
   * Construit une ligne d'ecriture a partir d'un montant SIGNE.
   *
   * Convention unique de tout le bloc cloture de caisse : on raisonne en montants
   * signes "sens naturel du compte", puis on traduit le signe en DEBIT/CREDIT.
   *  - `positiveSide` = le sens applique quand le montant signe est positif ;
   *  - montant negatif -> sens inverse, montant pris en valeur absolue.
   * Un montant nul ne produit AUCUNE ligne (ledger.post exige amount > 0 strict).
   */
  private buildLine(
    accountId: number,
    signedAmount: number,
    positiveSide: "DEBIT" | "CREDIT",
    description: string,
  ): Array<{ accountId: number; side: "DEBIT" | "CREDIT"; amount: number; description: string }> {
    const amount = Math.round(Math.abs(signedAmount) * 100) / 100;
    if (!(amount > 0)) return [];
    const inverse = positiveSide === "DEBIT" ? "CREDIT" : "DEBIT";
    return [
      {
        accountId,
        side: signedAmount > 0 ? positiveSide : inverse,
        amount,
        description,
      },
    ];
  }

  /**
   * Cloture de caisse -> UNE ecriture agregee (jamais une par ticket).
   *
   * TROIS branches possibles (ledger.post accepte N lignes, il exige seulement
   * >= 2 lignes, chaque montant > 0, et Sigma DEBIT == Sigma CREDIT aux centimes) :
   *
   *   DEBIT  Cash            = encaisse REELLE nette   (countedCash  - openingFloat)
   *   CREDIT Sales           = encaisse ATTENDUE nette (expectedCash - openingFloat)
   *   Ecart de caisse        = variance                (countedCash  - expectedCash)
   *                            CREDIT si excedent, DEBIT si manquant.
   *
   * Le fond de caisse (openingFloat) est retire des deux cotes : il est deja en
   * comptabilite, le recomptabiliser gonflerait les ventes a chaque ouverture.
   * Par construction cash = sales + variance, donc l'ecriture est equilibree.
   *
   * TRANCHE AVEC LA COMPTA (SCRUM-307) : la variance ne doit plus etre absorbee
   * par Sales. Sales porte le montant ATTENDU (la vraie recette theorique du
   * jour), l'excedent/manquant de comptage va sur un compte d'ecart dedie.
   *
   * LOGIQUE DE SIGNE (point 4, cloture a solde net negatif) : chacune des trois
   * grandeurs est un montant SIGNE ; buildLine() convertit le signe en sens
   * DEBIT/CREDIT et prend la valeur absolue. Une session a solde net negatif
   * (remboursements/sorties de caisse superieurs aux encaissements) produit donc
   * l'ecriture INVERSE (CREDIT Cash / DEBIT Sales) au lieu de n'etre pas
   * comptabilisee du tout. Une grandeur nulle ne genere pas de ligne : si les
   * trois sont nulles (ou une seule non nulle, cas impossible car cash =
   * sales + variance), on s'abstient plutot que de poster < 2 lignes.
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

      const round2 = (n: number) => Math.round(n * 100) / 100;
      const openingFloat = Number(session.openingFloat ?? 0);
      const countedCash = Number(session.countedCash ?? 0);
      // expectedCash peut etre NULL sur une session historique : on retombe alors
      // sur countedCash (variance nulle), ce qui reproduit l'ancien comportement.
      const expectedCash = session.expectedCash != null ? Number(session.expectedCash) : countedCash;
      // variance est calculee et stockee a la cloture (cash-sessions.service) ;
      // repli sur counted - expected pour rester coherent si la colonne est NULL.
      const variance = round2(
        session.variance != null ? Number(session.variance) : countedCash - expectedCash,
      );
      // Montants SIGNES (cf. buildLine) : cashSigned = salesSigned + variance.
      const cashSigned = round2(countedCash - openingFloat);
      const salesSigned = round2(expectedCash - openingFloat);
      // Garde-fou : si variance stockee et (counted - expected) divergent (donnee
      // historique incoherente), l'ecriture serait desequilibree. On s'abstient
      // avec un message explicite plutot que de laisser ledger.post rejeter.
      if (round2(salesSigned + variance) !== cashSigned) {
        console.warn(
          `[KodaTill] Cloture caisse #${sessionId} non comptabilisee : donnees incoherentes ` +
            `(counted=${countedCash}, expected=${expectedCash}, variance=${variance}, float=${openingFloat}).`,
        );
        return null;
      }

      // Rien a comptabiliser du tout (session neutre : ni encaissement, ni ecart).
      if (cashSigned === 0 && salesSigned === 0 && variance === 0) return null;

      const cashAccountId = await this.findSubAccountId(KodatillAccountingService.ACCOUNT_CASH, orgId);
      const salesAccountId = await this.findSubAccountId(KodatillAccountingService.ACCOUNT_SALES, orgId);
      if (!cashAccountId || !salesAccountId) {
        console.warn(
          `[KodaTill] Cloture caisse #${sessionId} non comptabilisee : compte "Cash" ou "Sales" absent du plan comptable de l'org ${orgId}.`,
        );
        return null;
      }

      // Compte d'ecart obligatoire DES QU'IL Y A une variance : sans lui, l'ecriture
      // serait desequilibree (cash != sales). On ne cree jamais de compte ici :
      // on s'abstient de comptabiliser et on trace le pre-requis.
      let varianceAccountId: number | null = null;
      if (variance !== 0) {
        varianceAccountId = await this.findSubAccountId(
          KodatillAccountingService.ACCOUNT_CASH_VARIANCE,
          orgId,
        );
        if (!varianceAccountId) {
          console.warn(
            `[KodaTill] Cloture caisse #${sessionId} non comptabilisee : ecart de caisse de ${variance} ` +
              `mais le compte "${KodatillAccountingService.ACCOUNT_CASH_VARIANCE}" est absent du plan comptable de l'org ${orgId}. ` +
              `Ajouter ce compte au plan comptable (pre-requis operationnel SCRUM-307).`,
          );
          return null;
        }
      }

      // Sens naturels : Cash debiteur, Sales crediteur ; l'ecart suit le sens de
      // Sales (excedent = produit -> CREDIT, manquant = charge -> DEBIT).
      const lines = [
        ...this.buildLine(cashAccountId, cashSigned, "DEBIT", "Encaissements caisse KodaTill"),
        ...this.buildLine(salesAccountId, salesSigned, "CREDIT", "Ventes KodaTill (montant attendu)"),
        ...(varianceAccountId
          ? this.buildLine(
              varianceAccountId,
              variance,
              "CREDIT",
              variance > 0 ? "Excedent de caisse constate" : "Manquant de caisse constate",
            )
          : []),
      ];
      // ledger.post exige au moins 2 lignes : un cas a une seule ligne non nulle
      // serait forcement desequilibre, donc on s'abstient (filet de securite).
      if (lines.length < 2) {
        console.warn(
          `[KodaTill] Cloture caisse #${sessionId} non comptabilisee : ecriture a moins de 2 lignes ` +
            `(cash=${cashSigned}, sales=${salesSigned}, ecart=${variance}).`,
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
          lines,
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

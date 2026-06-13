# Note de reprise — Bascule prod ERP/SIFA (à continuer bientôt)

> Statut au 11 juin 2026. À reprendre dès que le déploiement / la dispo le permettent.

## ✅ Ce qui est FAIT en prod
- PR #7 develop→master mergée (master = `6ea14f64`, VERSION 3.43.0).
- Backend prod déployé, **migrations 0105→0114 appliquées** au boot.
  - Routes live (HTTPS prod) : `/ledger/*`, `/procurement/*`, `/documents/*` (pas de 404, pas de 403 → middleware OK).
- **Gates d'approbation ACTIVÉS** (via `POST /ledger/approval-requirements`) sur 4 modules de dépense :
  `farmos_expense` (id 1), `payroll` (id 2), `purchase` (id 3), `maintenance` (id 4) — tous `isActive:1`.
- Mode **ledger à neuf** (dual-write, pas de migration historique).

## 🔴 PROBLÈME trouvé par la validation E2E (dépense FarmOS)
Le flux se déroule mais **ne se comptabilise pas** en prod, car 2 configs manquent (données hors migration Drizzle, jamais créées en prod) :

1. **Workflow `exp_approval` absent** → `createExpense` → `submitExpenseForApproval` échoue en silence (try/catch) → pas d'instance → `approveExpense` renvoie 404.
   - (Créé manuellement pendant le test : workflow id 1, 1 étape « Validation responsable ». À refaire proprement / pour les 4 modules.)
2. **Transaction-type « FarmOS Expense » ABSENT en prod** (seuls les types de *vente* sont seedés).
   → `postExpenseLedgerApproved` → `findTransactionType("FarmOS Expense")` = null → `return null` **sans poster** → **aucune écriture comptable** même après approbation.

### Effet de bord avec gates actifs
Une dépense créée est **différée par le gate** (écriture en `ledger_pending_entries`) et, faute de type, **ne peut pas être comptabilisée** → les dépenses prod restent bloquées.

## ⚠️ Gates : DÉCISION = LAISSÉS ACTIFS (choix utilisateur 11 juin)
Les 4 gates restent `isActive:1`. Conséquence assumée : les dépenses prod (farmos_expense, payroll, purchase, maintenance) sont **différées/bloquées** jusqu'à la config ci-dessous. OK tant que personne ne crée de dépense d'ici la reprise.
Pour débloquer en urgence si besoin : `POST /api/ledger/approval-requirements {"sourceModule":"...","isActive":false}`.

## ✅ DÉCISIONS DE CONFIG (déjà validées — appliquer telles quelles à la reprise)
- Type **« FarmOS Expense »** : **Débit = nouveau sous-compte « Farm Expenses »** (sous tête Expense id 6) / **Crédit = Cash (sub-account id 1)**. Schéma Charge dédiée → Cash.

## ▶️ À FAIRE à la reprise (décisions déjà prises)
1. **Créer sous-compte de charge** « Farm Expenses » sous la tête `Expense` (account head id 6).
2. **Créer transaction-type « FarmOS Expense »** : **Débit** = Farm Expenses (nouveau sub-account), **Crédit** = **Cash** (sub-account id **1**). (Décision validée : Charge → Cash.)
3. **Créer les workflows d'approbation** : `exp_approval` (FarmOS) + équivalents pour payroll / purchase / maintenance.
4. **Re-valider le flux E2E** : créer dépense → différée → soumise au workflow → approuvée → **écriture ledger équilibrée 250/250**.
5. (Optionnel) Idem config compta + workflows pour payroll, purchase, maintenance avant de compter sur leurs gates.

## Réf. techniques
- Comptes prod : Cash=sub 1, Bank=sub 2 ; charges (head Expense id6) : Cost of Sales(9), Salary(10), Rent(11), Utilities(12), Maintenance(18).
- Modèle de type existant : « FarmOS Production Sale » → debitAccountId 1 (Cash), creditAccountId 8 (Sales).
- Code clé : `farmos.service.ts` createExpense:896, submitExpenseForApproval:2301, approveExpense:2315, postExpenseLedgerApproved:2271, findTransactionType:1257.
- Endpoints : `POST /workflow {key,name,steps}`, `POST /farmos/expenses`, `POST /farmos/expenses/:id/approve`, `POST /ledger/approval-requirements {sourceModule,isActive}`.
- Login prod test : `demo` (org 1). Rate-limit login 5/min.
- Push direct master INTERDIT (branche protégée) → déploiement = **PR Bitbucket** develop→master.
- Dépense de test créée pendant la validation : `farmos_expense` id **1** (250, supplier « Test E2E gate ») — restée non comptabilisée.

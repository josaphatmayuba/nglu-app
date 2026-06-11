# Comparaison — POC pont transitoire vs Modèle comptable moderne

> Date : 2026-06-10 · Skill : ERP/SIFA Architect
> Question : la méthode proposée est-elle « moderne » ? Comparaison concrète des 2 modèles pour trancher.

---

## TL;DR

| | **A — POC pont** | **B — Moderne pur** |
|---|---|---|
| Modèle ligne | `debitId` + `creditId` sur la même ligne | **1 compte + 1 sens** (débit OU crédit) par ligne |
| Montants | `double` (hérité) | `decimal(18,2)` / centimes entiers |
| Comptes | en dur dans le code | **règles paramétrables** |
| Dimensions analytiques | non | site / projet / activité / centre de coût |
| Casse la prod ? | Non (table plate intacte) | Oui si bascule directe (à isoler) |
| Effort initial | Faible | Élevé |
| Dette à reprendre ensuite | Oui (étape 2) | Non |
| Vendable / auditable « entreprise » | Pas encore | Oui |
| **C'est le standard du marché ?** | Partiellement | **Oui (SAP/Odoo/Oracle/Sage)** |

---

## 1. Le modèle de LIGNE — la vraie différence

### A — POC pont (2 comptes par ligne)
```
transaction:  id | entry_id | debitId | creditId | amount
              ───┼──────────┼─────────┼──────────┼────────
              1  |   500    |   4     |    8     | 116.00     ← "débite 4, crédite 8"
```
- 1 ligne encode un mouvement complet (origine + destination).
- ✅ Simple, et c'est **déjà** ton modèle actuel → zéro réécriture des montants.
- ❌ Impossible d'avoir 3 comptes dans une même opération sans multiplier les lignes artificiellement.
- ❌ Pas de place pour des dimensions (quel projet ? quel site ?).

### B — Moderne pur (1 compte + 1 sens par ligne)
```
journal_entry_lines:  id | entry_id | account_id | side  | amount   | project_id | site_id
                      ───┼──────────┼────────────┼───────┼──────────┼────────────┼────────
                      1  |   500    |    4       | DEBIT | 116.00   |    12      |   3
                      2  |   500    |    8       | CREDIT| 100.00   |    12      |   3
                      3  |   500    |   16       | CREDIT|  16.00   |    12      |   3
```
- 1 ligne = 1 compte, 1 sens, 1 montant, + **dimensions**.
- ✅ N comptes par écriture (TVA, remises, multi-taux… naturels).
- ✅ **Comptabilité analytique** : on filtre par projet/site/activité (= ta Règle 6 multi-org, et indispensable pour rapports bailleurs ONG).
- ✅ C'est **exactement** le modèle SAP/Oracle/Odoo.
- ❌ Demande de **réécrire** la façon dont chaque service produit ses lignes.

> **Note clé** : ton existant fait déjà, de fait, du B éclaté (3 lignes par facture). Le passage A→B n'est donc pas un saut conceptuel énorme — c'est surtout normaliser le format.

---

## 2. Les montants — `double` vs `decimal`

```
A : amount double         → 0.1 + 0.2 = 0.30000000000000004  ❌ erreurs d'arrondi cumulées
B : amount decimal(18,2)  → arithmétique exacte               ✅ standard compta obligatoire
```
En finance, le flottant est une **faute**. Tout ERP moderne utilise decimal ou des entiers (centimes).
→ Migrer `amount` en decimal est **indispensable** quelle que soit l'option (peut se faire tôt).

---

## 3. Les comptes — en dur vs paramétrables

### A — en dur (état actuel + POC)
```ts
// sale-invoices.service.ts
{ debitId: 9, creditId: 3, amount: cost }   // que signifie 9 ? 3 ? → connu du seul dev
```
❌ Changer un compte = modifier le code + redéployer. Impossible pour un client SaaS multi-org.

### B — règles paramétrables (`transaction_type_rules`)
```
transaction_type_rules:  type      | role           | account_id | side
                         ──────────┼────────────────┼────────────┼──────
                         'sale'    | 'receivable'   |    4       | DEBIT
                         'sale'    | 'revenue'      |    8       | CREDIT
                         'sale'    | 'vat_output'   |   16       | CREDIT
```
✅ Chaque organisation configure ses comptes **sans toucher au code** (= cœur du SaaS multi-tenant, Règle 6).
✅ C'est ce qui rend le produit **vendable** (un client = sa propre config comptable).

---

## 4. Schéma cible « moderne » (option B)

```sql
-- Header
journal_entries(
  id, organization_id, date, reference, particulars,
  source_module, related_id,
  status,             -- draft|posted|reversed
  reversal_of_id, reversed_by_id, reason,
  currency_id, exchange_rate,      -- multi-devise
  period_id,          -- → accounting_periods (clôture)
  created_by, created_at
)
-- Lignes (1 compte + 1 sens)
journal_entry_lines(
  id, entry_id, account_id,
  side ENUM('DEBIT','CREDIT'),
  amount DECIMAL(18,2),
  -- dimensions analytiques
  organization_id, site_id, department_id, project_id, activity_id,
  description
)
-- Règles de génération métier→écriture
transaction_type_rules(
  id, organization_id, type, role, account_id, side, formula
)
-- Périodes comptables
accounting_periods(
  id, organization_id, name, start_date, end_date, status  -- open|closed
)
```

---

## 5. Coût / bénéfice

### Option A — POC pont
- **Coût** : 1 table + 1 colonne + 1 service + migrer 1 module. ~2-3 jours.
- **Bénéfice** : prouve la faisabilité, prod intacte, header + équilibre + reversal opérationnels.
- **Limite** : pas de dimensions, pas de decimal, comptes en dur → **reste à moderniser** (étape 2).
- **À reprendre plus tard** : conversion lignes mono-compte, decimal, règles, dimensions.

### Option B — Moderne pur
- **Coût** : nouveau schéma complet + service ledger + **réécrire la génération de lignes des 12 services** + migration des comptes en dur vers règles. ~2-4 semaines.
- **Bénéfice** : dette nulle, analytique, decimal, paramétrable, **directement vendable/auditable**.
- **Risque** : surface de changement large → à faire **module par module en parallèle de l'ancien** (strangler), pas en bascule sèche.

---

## 6. Recommandation honnête

Les deux mènent au même endroit ; la différence est **quand** on paie le coût.

- **Si l'objectif court terme = prouver/démontrer** (démo investisseur, valider que c'est faisable) → **A** d'abord.
- **Si l'objectif = produit SaaS multi-org vendable** (la cible du skill ERP/SIFA) → la partie qui compte vraiment, c'est **B** : *1 compte/ligne + decimal + règles + dimensions*. Le « 2 comptes/ligne » du POC est le seul vrai compromis à ne pas garder longtemps.

**Voie médiane recommandée** : construire **directement en format B** (lignes mono-compte + decimal + dimensions), mais **en strangler** comme le POC (nouvelle table à côté, table plate gardée en vue de compat, migration 1 service à la fois). On obtient le standard moderne **sans** big-bang et **sans** dette à reprendre.

→ C'est-à-dire : garder la **stratégie de migration** du POC (sûre), mais avec le **modèle de données B** (moderne). Meilleur des deux.

---

## 7. Décision à prendre

1. Modèle de ligne : **2-comptes (A)** ou **mono-compte (B)** ? → recommandé **B**
2. Montants : `double` ou `decimal` ? → **decimal** (non négociable)
3. Comptes : en dur ou règles ? → **règles** si SaaS multi-org
4. Dimensions analytiques dès le départ ? → **oui** si rapports par projet/site/bailleur
5. Stratégie : big-bang ou strangler ? → **strangler** (sûr)

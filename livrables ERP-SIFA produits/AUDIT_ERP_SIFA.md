# Audit ERP/SIFA — nglu-app

> Date : 2026-06-10 · Skill : ERP/SIFA Architect · Branche : `develop`
> Objectif : déterminer si la base existante peut devenir un **ERP/SIFA Enterprise** (Système Intégré de Finance et d'Approvisionnement) mature, commercialisable et auditable.

---

## Verdict

**OUI, faisable.** La base est une vraie plateforme multi-app cohérente (pas un POC) : ~70 % des modules cibles ERP/SIFA existent déjà.
**MAIS** le cœur transactionnel (comptabilité, P0) n'est pas de niveau ERP et doit être **refondé avant** d'ajouter de nouveaux modules.

---

## 1. Cartographie de l'existant

### Apps (10)
- **backend2** — NestJS + Drizzle (le seul backend ; `backend/` legacy abandonné)
- **middleware** — proxy /api à whitelist (hors CI)
- **pdf-service** — microservice PDF centralisé
- **frontend** (CRM), **hr-app**, **domus-app**, **batipro-app**, **comptabilite-app**, **farmos-app**, **marketing-site**

### Backend2 — 43 modules
Auth, Users, Roles, Permissions, Role-Permissions, Audit, Dashboard, Database, Realtime, Health,
Accounts, Sub-Accounts, Transactions, Transaction-Types, Currencies, Discounts, Payment-Methods,
Customers, Suppliers, Products (+ Brands, Categories, Sub-Categories, VATs, UoM, Manufacturers),
Purchase-Invoices, Sale-Invoices, Invoice-Templates,
HR, Property-Management (Domus), Batipro, FarmOS,
Messages, Notification-Preferences, Mail-Accounts, Email-Templates, System-Email,
App-Settings, Front-Modules, Legacy-Modules, Compat.

### Base de données
- **113 migrations Drizzle** (dernière : `0103_farmos_mortality_enrich.sql`)
- Multi-tenant amorcé : table `tenant` + `organizations` (migration `0042`), colonne `organization_id` propagée sur ~30 tables.

---

## 2. État du cœur transactionnel (P0)

### Table `transaction` actuelle (plate)
```
id, date, debitId, creditId, particulars, amount, type, relatedId, status, organization_id
```
→ **1 ligne = 1 débit + 1 crédit + 1 montant.** Pas de partie double multi-lignes.

### Table `transaction_types` actuelle
```
id, name, debit_account_id, credit_account_id, description, is_active
```
→ Un type = **un seul** couple débit/crédit fixe. Pas de règles paramétrables.

### Service `transactions.service.ts`
→ Travaille directement avec `debitId` / `creditId` (confirmé). Logique alignée sur le modèle plat.

---

## 3. Gaps critiques — P0 (bloquants ERP/SIFA)

| # | Gap | Preuve | Impact |
|---|-----|--------|--------|
| 1 | Pas de comptabilité en **partie double réelle** (table plate debit/credit/amount) | `0000_*.sql:450` | Impossible : écritures multi-lignes, TVA décomposée, répartitions analytiques, équilibre Σdébit=Σcrédit, contre-passation propre. **Blocage principal.** |
| 2 | Pas de `journal_entries` / `journal_entry_lines` | Grep → absentes | Architecture cible ERP/SIFA absente |
| 3 | `transaction_types` = 1 débit + 1 crédit fixes, pas de `transaction_type_rules` | `0000_*.sql:438` | Impossible de masquer débit/crédit aux non-comptables (Règle 5) ni de générer une écriture composée |
| 4 | Pas de **périodes comptables** / clôture | Aucune table | Pas de verrouillage d'exercice, intégrité comptable non garantie |

---

## 4. Gaps importants — P1

- **Workflow** : aucune table (`workflows`, `workflow_instances`) → pas d'approbations transverses paramétrables.
- **Budget** : aucune table (`budgets`, `budget_lines`, `budget_consumptions`) → critique pour projets ONG / rapports bailleurs.
- **Stock professionnel** : pas de `warehouses` / `stock_movements` → stock implicite par module, mouvements non tracés.
- **Procurement** : pas de `purchase_order` / `goods_receipt` → chaîne achat incomplète (commande → réception → facture → paiement).
- **Documents** : pas de `documents` / `document_links` centralisés.

---

## 5. Points forts à RÉUTILISER (Règle 2 — ne pas recommencer)

- ✅ `audit_log` existe déjà (`0029`) → **étendre**, ne pas recréer.
- ✅ `organizations` + `organization_id` propagé (`0042`) → fondation multi-org **déjà là** ; à compléter avec siteId / departmentId / projectId / activityId.
- ✅ Permissions / roles granulaires opérationnels.
- ✅ Modules métier (Domus, Batipro, FarmOS, HR, Invoices) = les « actions métier » de la Règle 4 → il manque seulement **le pont métier → écriture comptable**.
- ✅ Multi-devise déjà présente (`currency` sur transactions/types).

---

## 6. Roadmap recommandée

> Règle : **ne pas ajouter de modules avant d'avoir refondé le cœur comptable** (sinon la dette s'aggrave).

### P0 — Cœur transactionnel (fondation non négociable)
1. Nouvelles tables `journal_entries` + `journal_entry_lines` (multi-lignes, équilibre validé) + `accounting_periods`.
2. `transaction_type_rules` : un type métier → N lignes d'écriture paramétrées.
3. Service de génération automatique **métier → écriture** (Règle 4) : validation Σdébit=Σcrédit, contre-passation.
4. **Migration de compatibilité** : table `transaction` plate existante → vue / adaptateur vers le nouveau modèle.
   ⚠️ Données live + 113 migrations à préserver — touche **prod/compta → modèle fort (Opus) obligatoire**.

### P1 — Connexion des flux
Workflow → Budget → Stock / Procurement → Documents centralisés.

### P2 — Maturité produit
UX frontend, multi-site (siteId/departmentId), exports & rapports financiers, DevOps, tests, données démo.

### P3 — Futur
IA / analytics décisionnel, offline avancé, mobile money complet, banque API, signature électronique, connecteurs externes.

---

## 7. Principe central à viser (connexion des modules)

```
Achat fournisseur → workflow → bon commande → réception → stock
                  → facture fournisseur → paiement → comptabilité → budget → documents → rapport

Paiement loyer (Domus)      → paiement → comptabilité → reçu → rapport
Traitement animal (FarmOS)  → stock médicament → coût élevage → rapport sanitaire
Dépense projet ONG          → budget → workflow → finance → justificatif → rapport bailleur
```

---

## 8. Prochaines étapes proposées

- [ ] **Prompt 2** — audit backend détaillé (endpoints / services / sécurité, table par table)
- [ ] **Prompt 3 / Roadmap P0** — plan d'exécution technique du cœur transactionnel (migrations Drizzle + services + tickets)
- [ ] **Backlog Jira (SCRUM)** — créer les tickets P0 une fois la direction validée

---

## Annexe — Périmètre de l'audit

**Lu** : liste modules backend2, comptage/derniers fichiers migrations, schéma `transaction` + `transaction_types` (`0000`), extrait `transactions.service.ts`, tables créées par `0042`, grep workflow/budget/stock/journal/audit.
**Non couvert** (à faire pour un plan d'exécution) : détail complet des services compta, `0042` en entier, état réel dev vs prod des tables hors-journal, sécurité endpoint par endpoint.

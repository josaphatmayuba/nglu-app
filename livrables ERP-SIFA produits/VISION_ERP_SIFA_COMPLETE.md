# Vision ERP/SIFA complète — nglu-app

> Date : 2026-06-10 · Skill : ERP/SIFA Architect
> Recadrage : le moteur transactionnel est la **fondation**, pas le tout. Voici l'ERP/SIFA **complet** — où en est chaque module et comment ils se connectent.

SIFA = Système Intégré de Finance et d'Approvisionnement → plateforme ERP couvrant :
Finance · Approvisionnement · Stock · Ventes · RH · Immobilier · Construction · Agriculture · Élevage · Projets ONG · Logistique · Documents · Workflow · Budget · Audit · Rapports · SaaS multi-org.

---

## 1. État des 20 modules cibles (cartographie)

Légende : ✅ existe · 🟡 partiel · ❌ absent · 🔌 à connecter au cœur transactionnel

| # | Module | État | Détail |
|---|--------|------|--------|
| 1 | **Auth / Users / Roles / Permissions** | ✅ | JWT mémoire + refresh rotation, RBAC granulaire |
| 2 | **MFA** | ❌ | À ajouter (P3 sécurité) |
| 3 | **Audit** | 🟡 | `audit_log` existe (0029) → étendre aux actions sensibles (Règle 7) |
| 4 | **Dashboard** | 🟡 | existe, lit la table plate → à recâbler sur le grand livre |
| 5 | **Finance / Comptabilité (CŒUR)** | 🟡→🔧 | table plate à refondre en journal_entries (cf. PLAN_CŒUR_COMPTABLE_MODERNE.md) |
| 6 | **Accounts / Plan de comptes** | 🟡 | `account` minimal (id,name,type) → enrichir code/normal_side/parent (OHADA) |
| 7 | **Transaction Types** | 🟡 | 1 débit/crédit fixe → `transaction_type_rules` paramétrables |
| 8 | **Customers / Suppliers** | ✅ | opérationnels, génèrent déjà des écritures 🔌 |
| 9 | **Products / Stock** | 🟡 | produits ✅ ; stock pro ❌ (pas de warehouses/stock_movements) |
| 10 | **Sales / Purchase Invoices** | ✅ | opérationnels 🔌 (à router vers LedgerService) |
| 11 | **Payments** | ✅ | méthodes de paiement ✅ 🔌 |
| 12 | **Procurement / Approvisionnement** | ❌ | pas de purchase_order / goods_receipt (le « A » de SIFA !) |
| 13 | **HR / Payroll** | ✅ | riche (paie, congés, recrutement, présences) 🔌 |
| 14 | **Property Management (Domus)** | ✅ | baux, loyers, cautions, taxes 🔌 |
| 15 | **Construction (Batipro)** | ✅ | tables dédiées (0069) 🔌 |
| 16 | **Agriculture / Élevage (FarmOS)** | ✅ | très riche (vét, mortalité, lignée, prix) 🔌 |
| 17 | **NGO Projects** | ❌ | pas de module projet/bailleur (budget + rapport bailleur) |
| 18 | **Logistics** | ❌ | absent |
| 19 | **Documents** | 🟡 | docs FarmOS/HR épars → pas de hub `documents`/`document_links` |
| 20 | **Workflow** | ❌ | aucune table → pas d'approbations transverses |
| 21 | **Budget** | ❌ | aucune table (budgets/budget_lines/consumptions) |
| 22 | **Reports** | 🟡 | rapports par module → pas de moteur de rapports financiers unifié |
| 23 | **Notifications** | ✅ | preferences + realtime + email |
| 24 | **Settings / Multi-org** | 🟡 | organizations (0042) + department ✅ ; site/project/activity ❌ |

**Bilan** : ~12 modules ✅ · ~7 partiels · ~6 absents. La base métier est **riche** ; il manque surtout les **modules de liaison transverses** (workflow, budget, procurement, documents) et le **cœur comptable moderne**.

---

## 2. Les 4 chantiers transverses qui font « l'ERP » (au-delà de la compta)

Ce sont eux qui transforment des modules juxtaposés en **système intégré** :

### A. Cœur transactionnel (P0) — *en cours de plan*
journal_entries + lines + rules + périodes. **Tout s'y connecte.** Déjà détaillé.

### B. Workflow (P1) — l'approbation transverse
```
workflows(id, org_id, type, steps_json)
workflow_instances(id, workflow_id, entity_type, entity_id, current_step, status)
workflow_approvals(id, instance_id, step, approver_id, decision, comment, date)
```
→ Un achat, une dépense projet, une paie passent par un **circuit d'approbation paramétrable** avant comptabilisation. Réutilise le workflow signature déjà amorcé côté HR.

### C. Budget (P1) — le contrôle d'engagement
```
budgets(id, org_id, project_id, period_id, name, status)
budget_lines(id, budget_id, account_id, dimension..., planned_amount)
budget_consumptions(id, budget_line_id, journal_entry_id, amount)
```
→ Chaque écriture **consomme** un budget ; alerte si dépassement. **Indispensable pour projets ONG / rapports bailleurs.**

### D. Procurement + Stock (P1) — le « A » de SIFA (Approvisionnement)
```
warehouses, stock_movements (in/out/transfer, valorisation)
purchase_orders, purchase_order_lines, goods_receipts
```
→ Chaîne complète : **demande → bon de commande → réception → stock → facture → paiement → compta → budget**. C'est le flux signature de SIFA, aujourd'hui absent.

### E. Documents (P1/P2) — la pièce justificative
```
documents(id, org_id, type, file, hash, uploaded_by)
document_links(id, document_id, entity_type, entity_id)
```
→ Toute opération sensible porte sa **justification** (facture scannée, contrat, reçu). Centralise les docs épars (FarmOS/HR).

---

## 3. Le principe central : connecter les modules

Tous les modules métier existants deviennent des **générateurs d'événements** qui retombent dans le cœur :

```
ACHAT (Procurement)
  demande → workflow(approbation) → bon commande → réception(stock) →
  facture fournisseur → paiement → JOURNAL ENTRY → consommation BUDGET → document(justif) → rapport

LOYER (Domus)               → paiement → JOURNAL ENTRY → reçu(document) → rapport
TRAITEMENT ANIMAL (FarmOS)  → sortie STOCK médicament → coût élevage → JOURNAL ENTRY → rapport sanitaire
PAIE (HR)                   → workflow → JOURNAL ENTRY → consommation BUDGET → bulletin(document)
DÉPENSE PROJET (ONG)        → BUDGET → workflow → JOURNAL ENTRY → justificatif → rapport bailleur
VENTE (Sales)               → facture → STOCK(sortie) → paiement → JOURNAL ENTRY → rapport
```

→ **Tous les chemins passent par JOURNAL ENTRY.** D'où le cœur transactionnel en P0. Mais workflow / budget / stock / documents sont ce qui rend les flux **complets et auditables**.

---

## 4. Roadmap ERP/SIFA complète (priorisée)

### P0 — Fondation (non négociable)
Cœur comptable moderne : journal_entries/lines, rules, périodes, plan de comptes OHADA. → *PLAN_CŒUR_COMPTABLE_MODERNE.md*

### P1 — Intégration (ce qui fait « l'ERP »)
1. **Workflow** (approbations transverses)
2. **Budget** (engagement + alertes + rapports bailleurs)
3. **Procurement + Stock** (chaîne appro complète = le « A » de SIFA)
4. **Documents** (justificatifs centralisés)
5. **Connecter** les 8 modules écrivains au cœur via LedgerService

### P2 — Maturité produit
- Moteur de **rapports financiers** unifié (balance, grand livre, bilan, compte de résultat, exports)
- **Multi-org complet** : sites / projects / activities + comptabilité analytique par dimension
- **NGO Projects** (projets + bailleurs)
- UX cohérente cross-app, DevOps, tests, données démo
- Audit étendu (Règle 7 sur toutes les actions sensibles)

### P3 — Différenciation
IA / analytics décisionnel · offline avancé · mobile money · banque API · signature électronique · MFA · logistique · connecteurs externes

---

## 5. Livrables ERP/SIFA produits / à produire

| Livrable | État |
|----------|------|
| Audit technique | ✅ AUDIT_ERP_SIFA.md |
| Comparaison modèle comptable | ✅ COMPARAISON_MODELE_COMPTABLE.md |
| Plan cœur transactionnel | ✅ PLAN_CŒUR_COMPTABLE_MODERNE.md |
| **Vision ERP complète** | ✅ ce fichier |
| Backlog / tickets Jira (épic SCRUM) | ⬜ à créer |
| Cahier des charges | ⬜ (prompt 11) |
| Architecture SaaS multitenant | ⬜ (prompt 12) |
| Roadmap 24 mois MVP | ⬜ (prompt 10) |
| Données démo / scénarios | ⬜ (prompt 8) |
| Proposition commerciale / pricing | ⬜ (prompt 19) |

---

## 6. Prochaine étape

Ne pas se limiter au cœur compta. Séquence ERP/SIFA recommandée :
1. **P0 cœur** (fondation) — démarrer Phase 0
2. En parallèle conceptuel : cadrer **Workflow + Budget + Procurement** (P1) car ils dictent des colonnes du cœur (period_id, project_id, workflow_instance_id)
3. Créer l'**épic Jira ERP/SIFA** + stories par module pour piloter le tout

> Le but (Règle finale) : pas seulement ajouter des fonctionnalités, mais bâtir un ERP/SIFA **fiable, contrôlable, vendable et évolutif**.

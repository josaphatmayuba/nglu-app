# PROMPT 3 — PLAN D’EXÉCUTION TECHNIQUE POUR TRANSFORMER LE BACKEND ERP/SIFA

## Objectif de ce prompt

Ce prompt doit être utilisé après l’audit réel du backend ERP/SIFA.

L’objectif est maintenant de transformer les conclusions de l’audit en un **plan d’exécution technique clair**, étape par étape, sans casser l’existant.

Le but n’est pas seulement de dire ce qui manque.

Le but est de produire :

- les modules à créer
- les tables à créer
- les tables à modifier
- les services backend à développer
- les endpoints API à ajouter
- les règles métier à appliquer
- les migrations de base de données
- les tests à écrire
- les tickets techniques prêts à exécuter
- l’ordre exact de développement

---

# 1. Contexte

Le projet ERP/SIFA existe déjà.

Il contient déjà :

- Authentification
- MFA
- Utilisateurs
- Rôles
- Permissions
- Audit
- Dashboard
- Comptabilité
- Accounts
- Sub-Accounts
- Transactions
- Transaction Types
- Clients
- Fournisseurs
- Produits
- Devises
- Méthodes de paiement
- Factures d’achat
- Factures de vente
- Paiements
- RH
- Immobilier
- Construction / BTP
- Agriculture / FarmOS
- Notifications
- Messagerie
- Paramètres système

Tous les modules utilisent déjà le même backend et la même base de données.

Le projet ne doit pas être recommencé.

---

# 2. Mission principale

Tu dois préparer un plan de développement technique pour rendre le backend ERP/SIFA mature.

Le plan doit être directement utilisable par :

- un développeur backend
- un agent IA de code
- un architecte logiciel
- une équipe technique

Tu dois écrire les tâches dans un ordre logique pour éviter de casser l’existant.

---

# 3. Règle absolue

Ne pas supprimer brutalement l’ancien système.

Ne pas casser les endpoints existants.

Ne pas remplacer tout d’un coup.

Il faut faire une migration progressive.

Approche obligatoire :

```text
1. Ajouter les nouvelles structures
2. Créer les services de compatibilité
3. Connecter progressivement les anciens modules
4. Migrer les données existantes
5. Tester
6. Déprécier l’ancien modèle seulement après validation
```

---

# 4. Priorité technique globale

L’ordre de développement recommandé est :

```text
1. Moteur transactionnel ERP
2. Journal comptable multi-lignes
3. Transaction Type Rules
4. Périodes comptables
5. Numérotation automatique
6. Workflow d’approbation
7. Budget et centres de coûts
8. Stock professionnel
9. Approvisionnement avancé
10. Documents et pièces jointes
11. Audit avancé
12. Permissions fines
13. Rapports financiers
14. Modules spécialisés
```

---

# 5. Phase 1 — Moteur transactionnel ERP

## 5.1 Objectif

Transformer la transaction simple actuelle en moteur comptable central.

Le système actuel utilise probablement :

```text
transactions
- debitId
- creditId
- amount
```

Ce modèle doit rester compatible, mais il faut ajouter une architecture mature :

```text
business_transactions
journal_entries
journal_entry_lines
transaction_type_rules
```

---

## 5.2 Tables à créer

### Table : business_transactions

Créer une table représentant l’opération métier.

Champs recommandés :

```text
id
organizationId
siteId
departmentId
projectId
activityId
transactionTypeId
module
reference
relatedEntityType
relatedEntityId
amount
currencyId
status
description
createdBy
approvedBy
postedBy
createdAt
approvedAt
postedAt
cancelledAt
cancelledBy
cancellationReason
metadata
```

Statuts :

```text
DRAFT
PENDING_APPROVAL
APPROVED
POSTED
CANCELLED
REVERSED
```

---

### Table : journal_entries

Créer une table représentant l’écriture comptable officielle.

```text
id
organizationId
businessTransactionId
journalNumber
date
status
description
createdBy
postedBy
postedAt
reversedEntryId
reversalReason
reversedBy
reversedAt
createdAt
updatedAt
```

Statuts :

```text
DRAFT
POSTED
REVERSED
CANCELLED
```

---

### Table : journal_entry_lines

Créer une table représentant les lignes débit/crédit.

```text
id
journalEntryId
accountId
debitAmount
creditAmount
currencyId
exchangeRate
debitAmountBase
creditAmountBase
costCenterId
projectId
departmentId
siteId
description
createdAt
```

Règle obligatoire :

```text
SUM(debitAmount) = SUM(creditAmount)
```

---

## 5.3 Services à créer

Créer un service central :

```text
AccountingEngineService
```

Responsabilités :

- recevoir une opération métier
- lire le transaction type
- appliquer les règles de comptabilisation
- générer le journal entry
- générer les journal entry lines
- vérifier total débit = total crédit
- publier l’écriture
- bloquer si période fermée
- bloquer si compte inactif
- bloquer si budget insuffisant selon configuration
- créer l’audit
- retourner la prévisualisation comptable

Méthodes recommandées :

```text
previewEntry(input)
createBusinessTransaction(input)
generateJournalEntry(businessTransactionId)
postJournalEntry(journalEntryId)
reverseJournalEntry(journalEntryId, reason)
validateJournalEntry(journalEntryId)
```

---

## 5.4 Endpoints API à créer

```text
POST /accounting/business-transactions
GET /accounting/business-transactions
GET /accounting/business-transactions/:id
POST /accounting/business-transactions/:id/preview
POST /accounting/business-transactions/:id/post
POST /accounting/business-transactions/:id/reverse

GET /accounting/journal-entries
GET /accounting/journal-entries/:id
POST /accounting/journal-entries/:id/post
POST /accounting/journal-entries/:id/reverse
```

---

## 5.5 Critères d’acceptation

- Une facture d’achat peut générer une écriture comptable multi-lignes.
- Une écriture avec taxe peut générer deux débits et un crédit.
- Une écriture déséquilibrée est bloquée.
- Une écriture publiée ne peut plus être modifiée directement.
- Une écriture publiée peut seulement être annulée par contre-passation.
- Chaque écriture est liée à son opération métier.
- Chaque écriture est auditée.

---

# 6. Phase 2 — Transaction Type Rules

## 6.1 Objectif

Transformer les `transaction-types` en moteur de règles comptables.

L’utilisateur ne doit pas choisir manuellement débit/crédit chaque fois.

Il choisit une action métier :

```text
Paiement fournisseur
Paiement client
Paiement salaire
Paiement loyer
Achat stock
Vente produit
Dépense carburant
```

Le système génère automatiquement les écritures.

---

## 6.2 Modifier transaction_types

Ajouter les champs :

```text
code
module
category
requiresApproval
affectsStock
affectsCash
affectsBudget
affectsProject
affectsCustomerBalance
affectsSupplierBalance
affectsPayroll
affectsAssets
defaultCurrencyId
workflowId
isSystem
metadata
```

---

## 6.3 Créer transaction_type_rules

```text
id
transactionTypeId
lineOrder
accountSource
fixedAccountId
debitOrCredit
amountFormula
descriptionTemplate
required
isActive
createdAt
updatedAt
```

Exemples de accountSource :

```text
FIXED_ACCOUNT
CUSTOMER_RECEIVABLE_ACCOUNT
SUPPLIER_PAYABLE_ACCOUNT
CASH_ACCOUNT
BANK_ACCOUNT
PRODUCT_STOCK_ACCOUNT
PRODUCT_REVENUE_ACCOUNT
PRODUCT_EXPENSE_ACCOUNT
SALARY_EXPENSE_ACCOUNT
TAX_ACCOUNT
PROJECT_EXPENSE_ACCOUNT
```

Exemples de amountFormula :

```text
amount
totalAmount
amountWithoutTax
taxAmount
grossSalary
netSalary
deductions
quantity * unitPrice
```

---

## 6.4 Seeds recommandés

Créer les transaction types système :

```text
PURCHASE_INVOICE
SUPPLIER_PAYMENT
SALE_INVOICE
CUSTOMER_PAYMENT
SALARY_PAYMENT
RENT_PAYMENT_RECEIVED
STOCK_ADJUSTMENT
STOCK_TRANSFER
FUEL_EXPENSE
PROJECT_EXPENSE
AGRICULTURE_INPUT_PURCHASE
LIVESTOCK_MEDICINE_USAGE
CONSTRUCTION_MATERIAL_PURCHASE
```

---

## 6.5 Critères d’acceptation

- Un transaction type peut générer plusieurs lignes comptables.
- Un transaction type peut être lié à un module.
- Un transaction type peut exiger une approbation.
- Un transaction type peut affecter le stock.
- Un transaction type peut affecter le budget.
- Un transaction type peut être désactivé sans supprimer l’historique.

---

# 7. Phase 3 — Périodes comptables

## 7.1 Objectif

Empêcher la modification des transactions dans des périodes déjà fermées.

---

## 7.2 Table à créer

```text
accounting_periods
- id
- organizationId
- name
- startDate
- endDate
- status
- closedBy
- closedAt
- lockedBy
- lockedAt
- reopenedBy
- reopenedAt
- reopenReason
```

Statuts :

```text
OPEN
LOCKED
CLOSED
```

---

## 7.3 Règles métier

- On peut publier seulement dans une période ouverte.
- Une période verrouillée bloque les modifications normales.
- Une période fermée bloque toute nouvelle écriture.
- Une réouverture exige une permission spéciale.
- Toute fermeture, réouverture ou modification est auditée.

---

## 7.4 Endpoints

```text
POST /accounting/periods
GET /accounting/periods
PATCH /accounting/periods/:id/lock
PATCH /accounting/periods/:id/close
PATCH /accounting/periods/:id/reopen
```

---

# 8. Phase 4 — Numérotation automatique

## 8.1 Objectif

Avoir des références propres pour tous les documents ERP.

Exemples :

```text
TRX-2026-0001
JE-2026-0001
INV-2026-0001
PO-2026-0001
REQ-2026-0001
PAY-2026-0001
STK-2026-0001
HR-2026-0001
DOC-2026-0001
```

---

## 8.2 Table à créer

```text
number_sequences
- id
- organizationId
- module
- documentType
- prefix
- year
- currentNumber
- padding
- resetPolicy
- isActive
```

resetPolicy :

```text
NEVER
YEARLY
MONTHLY
DAILY
```

---

## 8.3 Service à créer

```text
NumberSequenceService
```

Méthodes :

```text
generate(module, documentType, organizationId)
preview(module, documentType, organizationId)
reset(sequenceId)
```

---

# 9. Phase 5 — Workflow d’approbation

## 9.1 Objectif

Créer un moteur de workflow configurable utilisable par tous les modules.

---

## 9.2 Tables à créer

```text
workflows
workflow_steps
workflow_rules
workflow_instances
workflow_instance_steps
workflow_actions
```

### workflows

```text
id
organizationId
name
module
transactionTypeId
isActive
createdAt
updatedAt
```

### workflow_steps

```text
id
workflowId
stepOrder
name
approverRoleId
approverUserId
approvalType
requiredApprovals
canReject
canReturn
```

### workflow_rules

```text
id
workflowId
field
operator
value
currencyId
priority
```

### workflow_instances

```text
id
workflowId
entityType
entityId
status
startedBy
startedAt
completedAt
```

### workflow_actions

```text
id
workflowInstanceId
stepId
action
comment
actedBy
actedAt
```

---

## 9.3 Règles métier

- Un workflow peut dépendre du montant.
- Un workflow peut dépendre du module.
- Un workflow peut dépendre du site.
- Un workflow peut dépendre du département.
- Un workflow peut dépendre du projet.
- Une transaction qui exige approbation ne peut pas être publiée avant approbation.
- Tout rejet doit être motivé.
- Toute approbation est auditée.

---

## 9.4 Endpoints

```text
POST /workflows
GET /workflows
PATCH /workflows/:id
POST /workflows/:id/steps
POST /workflows/:id/rules

POST /workflow-instances
GET /workflow-instances
POST /workflow-instances/:id/approve
POST /workflow-instances/:id/reject
POST /workflow-instances/:id/return
```

---

# 10. Phase 6 — Budget et centres de coûts

## 10.1 Objectif

Relier les dépenses aux budgets, projets, départements, sites et activités.

---

## 10.2 Tables à créer

```text
budgets
budget_lines
budget_allocations
budget_consumptions
budget_revisions
cost_centers
```

### budgets

```text
id
organizationId
name
fiscalYear
projectId
departmentId
siteId
status
createdBy
approvedBy
approvedAt
```

### budget_lines

```text
id
budgetId
accountId
category
description
plannedAmount
currencyId
```

### budget_consumptions

```text
id
budgetLineId
businessTransactionId
amount
currencyId
consumptionType
createdAt
```

consumptionType :

```text
COMMITTED
SPENT
REVERSED
```

---

## 10.3 Règles métier

- Une dépense peut être liée à une ligne budgétaire.
- Le système calcule le budget prévu, engagé, dépensé et disponible.
- Le système peut alerter si dépassement.
- Le système peut bloquer si dépassement selon configuration.
- Les rapports budget vs réel doivent être disponibles.

---

# 11. Phase 7 — Stock professionnel

## 11.1 Objectif

Passer d’un simple catalogue produits à une gestion de stock ERP.

---

## 11.2 Tables à créer ou renforcer

```text
warehouses
stock_items
stock_movements
stock_adjustments
stock_transfers
inventory_counts
inventory_count_lines
stock_lots
serial_numbers
stock_reservations
stock_valuations
```

---

## 11.3 Types de mouvements

```text
PURCHASE_RECEIPT
SALE_DELIVERY
INTERNAL_TRANSFER
ADJUSTMENT_IN
ADJUSTMENT_OUT
LOSS
CONSUMPTION
RETURN_IN
RETURN_OUT
PRODUCTION_IN
```

---

## 11.4 Règles métier

- Chaque entrée augmente le stock.
- Chaque sortie diminue le stock.
- Une sortie ne peut pas rendre le stock négatif sauf permission spéciale.
- Les lots doivent gérer les dates d’expiration.
- Les médicaments, aliments, semences, matériaux doivent pouvoir être suivis.
- Le stock doit pouvoir être lié à finance.
- Le stock doit pouvoir être lié à agriculture, élevage et construction.

---

## 11.5 Endpoints

```text
POST /warehouses
GET /warehouses

POST /stock/movements
GET /stock/movements

POST /stock/transfers
POST /stock/adjustments

POST /inventory-counts
GET /inventory-counts
POST /inventory-counts/:id/validate
```

---

# 12. Phase 8 — Approvisionnement avancé

## 12.1 Objectif

Créer un cycle d’achat complet.

---

## 12.2 Tables à créer ou renforcer

```text
purchase_requisitions
purchase_requisition_items
supplier_quotations
supplier_quotation_items
supplier_comparisons
purchase_orders
purchase_order_items
goods_receipts
goods_receipt_items
supplier_invoices
supplier_invoice_items
supplier_payments
supplier_contracts
```

---

## 12.3 Processus cible

```text
Demande d’achat
↓
Workflow d’approbation
↓
Demande de prix
↓
Comparaison fournisseurs
↓
Bon de commande
↓
Réception
↓
Facture fournisseur
↓
Paiement
↓
Comptabilisation
```

---

## 12.4 Règles métier

- Une demande d’achat approuvée peut générer un bon de commande.
- Un bon de commande peut générer une réception.
- Une réception augmente le stock.
- Une facture fournisseur génère une écriture comptable.
- Un paiement fournisseur génère une écriture comptable.
- Les écarts entre commande, réception et facture doivent être détectés.

---

# 13. Phase 9 — Gestion documentaire

## 13.1 Objectif

Permettre de lier des documents à toutes les opérations importantes.

---

## 13.2 Tables à créer

```text
documents
document_versions
document_links
document_categories
document_approvals
document_audit_logs
```

### documents

```text
id
organizationId
title
categoryId
fileName
mimeType
fileSize
storagePath
uploadedBy
createdAt
```

### document_links

```text
id
documentId
entityType
entityId
module
createdAt
```

---

## 13.3 Entités à supporter

```text
transaction
journal_entry
invoice
payment
supplier
customer
employee
contract
project
site
activity
property
animal
field
vehicle
construction_site
purchase_order
goods_receipt
```

---

# 14. Phase 10 — Audit avancé

## 14.1 Objectif

Tracer toutes les actions sensibles.

---

## 14.2 Renforcer audit_logs

Champs recommandés :

```text
id
organizationId
userId
module
entityType
entityId
action
oldValue
newValue
ipAddress
userAgent
device
requestId
createdAt
```

---

## 14.3 Actions à auditer

```text
CREATE
UPDATE
DELETE
APPROVE
REJECT
POST
REVERSE
LOGIN
LOGIN_FAILED
EXPORT
ROLE_CHANGED
PERMISSION_CHANGED
DOCUMENT_UPLOADED
PERIOD_CLOSED
PERIOD_REOPENED
```

---

# 15. Phase 11 — Permissions fines

## 15.1 Objectif

Créer des permissions granulaires.

Exemples :

```text
invoice.create
invoice.read
invoice.update
invoice.delete
invoice.approve
invoice.export

transaction.create
transaction.read
transaction.post
transaction.reverse

journal.read
journal.post
journal.reverse

salary.read
salary.approve

report.finance.read
report.finance.export

workflow.approve
workflow.configure

budget.create
budget.approve
budget.override
```

---

## 15.2 Règles

- Les permissions doivent être appliquées sur tous les endpoints critiques.
- Les permissions doivent pouvoir dépendre de l’organisation.
- Les permissions doivent pouvoir dépendre du site.
- Les permissions doivent pouvoir dépendre du projet.
- Les actions sensibles doivent être auditées.

---

# 16. Phase 12 — Rapports financiers

## 16.1 Objectif

Créer des rapports ERP officiels.

---

## 16.2 Rapports à créer

```text
Grand livre
Journal général
Balance générale
Bilan
Compte de résultat
Flux de trésorerie
Dettes fournisseurs
Créances clients
Budget vs réel
Dépenses par projet
Dépenses par département
Dépenses par site
Rapport de stock
Rapport d’audit
Rapport de taxes
```

---

## 16.3 Exports

```text
PDF
Excel
CSV
```

---

# 17. Tests obligatoires

Pour chaque phase, écrire :

## Tests unitaires

- services
- règles métier
- validations
- calculs

## Tests d’intégration

- endpoints API
- base de données
- workflow
- transaction
- audit

## Tests métier

- facture achat avec taxe
- paiement fournisseur
- paiement client
- salaire
- loyer
- sortie stock
- consommation médicament
- dépense projet
- annulation transaction

---

# 18. Format des tickets à produire

Pour chaque ticket, utiliser ce format :

```text
Titre :
Priorité :
Complexité :
Module :
Contexte :
Objectif :
Tables concernées :
Fichiers concernés :
Endpoints concernés :
Travail à faire :
Règles métier :
Critères d’acceptation :
Tests à faire :
Risques :
Dépendances :
```

---

# 19. Tickets minimum à générer

Générer au minimum ces tickets :

```text
1. Créer business_transactions
2. Créer journal_entries
3. Créer journal_entry_lines
4. Créer AccountingEngineService
5. Ajouter validation total débit = total crédit
6. Ajouter contre-passation
7. Renforcer transaction_types
8. Créer transaction_type_rules
9. Seeder les transaction types système
10. Créer accounting_periods
11. Créer number_sequences
12. Créer workflow engine
13. Créer budget module
14. Créer stock movements
15. Créer warehouses
16. Créer inventory counts
17. Créer purchase requisitions
18. Créer purchase orders
19. Créer goods receipts
20. Créer document module
21. Renforcer audit logs
22. Ajouter permissions fines
23. Créer rapports financiers de base
24. Connecter achat → stock → finance
25. Connecter vente → stock → finance
26. Connecter RH/paie → finance
27. Connecter immobilier/loyer → finance
28. Connecter agriculture → stock → finance
29. Connecter élevage → stock → finance
30. Connecter construction → stock → finance
```

---

# 20. Résultat final attendu

À la fin, produire :

1. Plan d’exécution complet.
2. Ordre exact des phases.
3. Tables à créer.
4. Tables à modifier.
5. Services à créer.
6. Endpoints à créer.
7. Règles métier.
8. Tickets techniques.
9. Tests.
10. Risques.
11. Stratégie de migration progressive.
12. Recommandations pour éviter de casser l’existant.

---

# 21. Conclusion

Le but final est de faire évoluer le backend actuel vers un vrai ERP/SIFA Enterprise.

Le résultat doit permettre :

```text
Une action métier
→ déclenche workflow
→ vérifie budget
→ met à jour stock si nécessaire
→ génère écritures comptables
→ attache documents
→ écrit audit
→ met à jour rapports
```

Exemple :

```text
Achat aliment porc
→ demande d’achat
→ approbation
→ bon de commande
→ réception stock
→ facture fournisseur
→ transaction comptable
→ budget élevage mis à jour
→ rapport direction mis à jour
```

Le projet doit rester évolutif, commercialisable et capable de devenir une solution ERP/SIFA régionale.

# PROMPT COMPLET — AUDIT ET TRANSFORMATION DU PROJET EXISTANT EN ERP/SIFA ENTERPRISE MATURE

## 0. Contexte général

J’ai déjà développé un projet ERP/SIFA avec un backend existant.  
Le projet ne doit **pas être recommencé à zéro**.

Le système actuel utilise déjà une architecture commune avec :

- même backend
- même base de données
- mêmes utilisateurs
- mêmes rôles
- mêmes permissions
- mêmes paramètres de base

Le backend contient déjà plusieurs modules importants, notamment :

- Authentification
- MFA
- Utilisateurs
- Rôles
- Permissions
- Audit
- Dashboard
- Comptabilité
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

L’objectif n’est **pas** d’ajouter des modules au hasard.  
L’objectif est de faire une analyse profonde du projet existant et de le transformer progressivement en un vrai :

> **ERP/SIFA Enterprise mature, commercialisable, fiable et capable de rivaliser avec des solutions régionales.**

Le système doit pouvoir être utilisé par :

- PME
- ONG
- Coopératives agricoles
- Sociétés immobilières
- Entreprises de construction
- Institutions publiques
- Municipalités
- Provinces
- Ministères
- Gouvernements

---

# PARTIE 1 — AUDIT COMPLET DU PROJET EXISTANT

## 1. Mission principale de l’audit

Analyser le projet existant **dans le fond**.

Il faut d’abord comprendre ce qui est déjà développé avant de proposer des améliorations.

Pour chaque module, il faut déterminer :

- ce qui existe déjà
- ce qui fonctionne bien
- ce qui est incomplet
- ce qui est mal relié aux autres modules
- ce qui manque
- ce qui doit être corrigé
- ce qui doit être renforcé
- le niveau de maturité actuel
- les risques techniques
- les risques métier
- la priorité d’amélioration

Ne pas proposer directement une nouvelle architecture sans analyser l’existant.

---

## 2. Modules à analyser dans le backend actuel

Analyser tous les modules existants, notamment :

```text
Auth
Users
Roles
Permissions
Audit
Dashboard
Accounts
Sub-Accounts
Transactions
Transaction Types
Customers
Suppliers
Products
Product Categories
Purchase Invoices
Sale Invoices
Payments
Payment Methods
Currencies
HR
Property Management
Construction / BTP
Agriculture / FarmOS
Notifications
Messages
Email Templates
Invoice Templates
System Settings
```

Pour chaque module, produire :

```text
Module :
- Existe : oui / non
- Niveau actuel : faible / moyen / avancé
- Tables détectées :
- Services détectés :
- Endpoints détectés :
- Relations avec autres modules :
- Forces :
- Faiblesses :
- Manques :
- Risques :
- Améliorations recommandées :
- Priorité :
```

---

## 3. Analyse de l’architecture actuelle

Analyser :

- structure du backend
- séparation des modules
- services
- controllers
- DTO
- validations
- guards
- permissions
- audit
- logique métier
- base de données
- relations entre tables
- conventions de nommage
- gestion des erreurs
- sécurité API
- qualité du code
- duplication
- cohérence globale

Répondre clairement :

1. Le backend est-il bien structuré ?
2. Les modules sont-ils bien séparés ?
3. Les modules communiquent-ils correctement ?
4. Le système peut-il supporter plusieurs organisations ?
5. Le système peut-il supporter plusieurs sites ?
6. Le système peut-il supporter plusieurs projets ?
7. Le système peut-il évoluer vers un ERP mature ?
8. Quelles parties doivent être refactorisées ?
9. Quelles parties doivent être conservées ?
10. Quelles parties sont critiques à corriger ?

---

## 4. Analyse de la base de données

Analyser la structure actuelle :

- tables existantes
- relations entre tables
- clés étrangères
- index
- contraintes
- champs manquants
- champs incohérents
- données sensibles
- multi-organisation
- audit
- timestamps
- soft delete
- statuts
- devises
- organisationId
- siteId
- departmentId
- projectId

Vérifier si les tables critiques possèdent bien :

```text
id
organizationId
createdBy
updatedBy
createdAt
updatedAt
deletedAt si soft delete
status
```

Identifier les tables qui doivent être reliées à :

```text
organizationId
siteId
departmentId
projectId
activityId
```

---

## 5. Analyse de la sécurité actuelle

Analyser :

- authentification
- JWT
- MFA
- rôles
- permissions
- guards
- audit de connexion
- audit d’action
- protection contre accès non autorisé
- séparation des données par organisation
- séparation des données par site
- séparation des données par projet
- accès aux données sensibles
- export de données
- sécurité des fichiers
- sécurité des endpoints
- rate limiting
- validation des entrées

Produire une note de maturité sécurité sur 100.

---

## 6. Analyse de la gestion des transactions existante

Le projet possède déjà une gestion des transactions avec probablement :

```text
transaction
- debitId
- creditId
- amount
- date
- particulars
- type
- relatedId
- currencyId
- organizationId
- status
```

Le projet possède aussi un module :

```text
transaction-types
```

qui permet de définir :

```text
name
debitAccountId
creditAccountId
description
isActive
```

Cette idée est très importante et doit être analysée en priorité.

Analyser :

1. Comment les transactions sont créées.
2. Comment débit et crédit sont gérés.
3. Comment les transaction types sont utilisés.
4. Quels modules créent déjà automatiquement des transactions.
5. Si les factures d’achat créent des transactions.
6. Si les factures de vente créent des transactions.
7. Si les paiements fournisseurs créent des transactions.
8. Si les paiements clients créent des transactions.
9. Si les loyers créent des transactions.
10. Si les salaires créent des transactions.
11. Si les transactions sont reliées aux comptes.
12. Si les transactions sont reliées aux devises.
13. Si les transactions sont reliées à l’organisation.
14. Si les transactions sont reliées aux projets, sites ou départements.
15. Si les transactions sont auditées.
16. Si les transactions peuvent être supprimées.
17. Si les transactions peuvent être modifiées après validation.
18. Si le système vérifie que débit = crédit.

Donner une note de maturité de la gestion transactionnelle actuelle sur 100.

---

## 7. Analyse Finance actuelle

Analyser si le système contient :

- plan comptable
- comptes
- sous-comptes
- transactions
- grand livre
- journal général
- balance générale
- bilan
- compte de résultat
- flux de trésorerie
- comptes fournisseurs
- comptes clients
- paiements
- caisse
- banque
- rapprochement bancaire
- budget
- taxes
- devises
- taux de change
- périodes comptables
- immobilisations
- amortissements

Identifier ce qui existe, ce qui est partiel et ce qui manque.

---

## 8. Analyse Approvisionnement actuel

Analyser si le système contient :

- fournisseurs
- produits
- demandes d’achat
- approbations
- bons de commande
- appels d’offres
- comparaison fournisseurs
- réceptions
- factures fournisseurs
- paiements fournisseurs
- contrats fournisseurs
- documents liés
- intégration avec stock
- intégration avec finance

Identifier le niveau de maturité.

---

## 9. Analyse Stock actuel

Analyser si le système contient :

- produits
- catégories
- entrepôts
- mouvements de stock
- entrées
- sorties
- transferts
- inventaires physiques
- lots
- numéros de série
- dates d’expiration
- stock minimum
- alertes de rupture
- valorisation FIFO
- valorisation LIFO
- coût moyen pondéré

Identifier ce qui manque pour un vrai stock ERP.

---

## 10. Analyse Vente actuelle

Analyser si le système contient :

- clients
- devis
- factures de vente
- paiements clients
- livraisons
- retours
- créances clients
- reçus
- rapports de vente
- intégration finance
- intégration stock

---

## 11. Analyse RH actuelle

Analyser si le système contient :

- employés
- contrats
- postes
- départements
- présences
- congés
- horaires
- shifts
- salaires
- historique salarial
- primes
- déductions
- paie
- évaluations
- formations
- organigramme
- documents employés
- intégration finance

---

## 12. Analyse Immobilier actuelle

Analyser si le système contient :

- propriétés
- bâtiments
- unités locatives
- locataires
- contrats de location
- loyers
- paiements
- dépôts de garantie
- maintenance
- documents
- échéances
- renouvellements
- intégration finance

---

## 13. Analyse Construction / BTP actuelle

Analyser si le système contient :

- projets de construction
- chantiers
- matériaux
- fournisseurs
- main-d’œuvre
- coûts
- budget chantier
- avancement
- documents
- dépenses
- intégration stock
- intégration finance

---

## 14. Analyse Agriculture actuelle

Analyser si le système contient :

- champs
- cultures
- saisons agricoles
- semis
- récoltes
- intrants
- rendement
- coûts par champ
- coûts par culture
- calendrier agricole
- stock agricole
- ventes agricoles
- intégration finance
- intégration stock

---

## 15. Analyse Élevage actuelle

Analyser si le système contient :

- bovins
- porcs
- chèvres
- moutons
- volailles

Pour chaque espèce, vérifier :

- identification
- sexe
- race
- naissance
- achat
- vente
- reproduction
- gestation
- mise bas
- vaccination
- traitement
- médicaments
- mortalité
- alimentation
- croissance
- poids
- historique sanitaire
- coût par animal
- coût par lot
- production
- intégration stock
- intégration finance

---

## 16. Analyse Gestion documentaire actuelle

Analyser si le système contient :

- documents
- upload
- classement
- pièces jointes
- lien avec facture
- lien avec transaction
- lien avec fournisseur
- lien avec client
- lien avec employé
- lien avec projet
- versionnage
- validation
- signature
- OCR
- archivage

---

## 17. Analyse Reporting actuel

Analyser si le système contient :

- dashboard global
- KPI
- rapports PDF
- rapports Excel
- rapports financiers
- rapports RH
- rapports stock
- rapports vente
- rapports achat
- rapports immobilier
- rapports agriculture
- rapports élevage
- rapports audit
- filtres par organisation
- filtres par site
- filtres par projet
- filtres par période

---

# PARTIE 2 — TRANSFORMATION EN ERP/SIFA MATURE

## 18. Vision cible

Transformer le projet existant en un ERP/SIFA mature où tous les modules communiquent.

Vision finale :

```text
Achat → Stock → Finance → Budget → Projet → Rapport
RH → Paie → Finance → Rapport
Immobilier → Loyer → Finance → Trésorerie
Agriculture → Stock → Coût → Récolte → Vente → Finance
Élevage → Santé → Stock médicament → Coût animal → Vente → Finance
Projet ONG → Budget → Activités → Dépenses → Rapport bailleur
Construction → Matériaux → Stock → Chantier → Coût → Finance
Logistique → Carburant → Mission → Coût → Finance
```

L’utilisateur ne doit pas saisir la même information plusieurs fois.

Une seule action métier doit mettre à jour automatiquement tous les modules concernés.

---

## 19. Principe moderne débit/crédit

Le principe débit/crédit est toujours utilisé dans le monde moderne.

Les grands ERP utilisent encore la comptabilité en partie double.

Mais l’utilisateur simple ne doit pas toujours choisir manuellement :

```text
débit
crédit
```

L’utilisateur doit plutôt choisir une action métier :

```text
Payer fournisseur
Recevoir paiement client
Payer salaire
Recevoir loyer
Acheter stock
Vendre produit
Enregistrer dépense
Enregistrer revenu
```

Puis le système génère automatiquement les écritures comptables.

---

## 20. Renforcement du moteur transactionnel

Faire évoluer la transaction simple vers un vrai moteur comptable central.

Aujourd’hui, le système semble avoir :

```text
transaction
- debitId
- creditId
- amount
```

C’est bon pour commencer, mais limité.

Il faut évoluer vers :

```text
business_transactions
journal_entries
journal_entry_lines
transaction_type_rules
```

---

## 21. Table business_transactions

Cette table représente l’opération métier.

Exemples :

- facture fournisseur
- paiement fournisseur
- facture client
- paiement client
- salaire
- paiement de loyer
- achat stock
- sortie de stock
- dépense carburant
- dépense projet
- achat intrants agricoles
- traitement vétérinaire
- achat matériaux chantier

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
```

Statuts recommandés :

```text
DRAFT
PENDING_APPROVAL
APPROVED
POSTED
CANCELLED
REVERSED
```

---

## 22. Table journal_entries

Cette table représente l’écriture comptable officielle.

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

---

## 23. Table journal_entry_lines

Cette table représente les lignes comptables.

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
Total débit = Total crédit
```

Si ce n’est pas équilibré, le système doit bloquer la publication.

---

## 24. Renforcer Transaction Types

Le module `transaction-types` doit devenir un moteur de règles comptables.

Champs recommandés :

```text
code
name
module
category
description
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
isActive
createdAt
updatedAt
```

Exemples de modules :

```text
FINANCE
PURCHASE
SALE
HR
PROPERTY
AGRICULTURE
LIVESTOCK
LOGISTICS
PROJECT
STOCK
CONSTRUCTION
```

---

## 25. Ajouter transaction_type_rules

Créer une table qui définit comment chaque type de transaction génère les écritures comptables.

```text
transaction_type_rules
- id
- transactionTypeId
- lineOrder
- accountSource
- fixedAccountId
- debitOrCredit
- amountFormula
- descriptionTemplate
- required
- isActive
```

Exemple achat fournisseur :

```text
Type : PURCHASE_INVOICE

Règles :
Débit  : Stock ou charge        amountWithoutTax
Débit  : Taxe récupérable       taxAmount
Crédit : Fournisseur            totalAmount
```

Exemple paiement fournisseur :

```text
Type : SUPPLIER_PAYMENT

Règles :
Débit  : Fournisseur            amount
Crédit : Banque ou caisse       amount
```

Exemple paiement client :

```text
Type : CUSTOMER_PAYMENT

Règles :
Débit  : Banque ou caisse       amount
Crédit : Client                 amount
```

Exemple salaire :

```text
Type : SALARY_PAYMENT

Règles :
Débit  : Charge salariale       grossSalary
Crédit : Dettes sociales        deductions
Crédit : Banque ou caisse       netSalary
```

Exemple loyer reçu :

```text
Type : RENT_PAYMENT_RECEIVED

Règles :
Débit  : Banque ou caisse       amount
Crédit : Revenu locatif         amount
```

---

## 26. UX moderne pour transactions

L’interface utilisateur doit être simple.

L’utilisateur normal voit :

```text
Type de transaction : Paiement fournisseur
Fournisseur : ABC
Montant : 1 000 $
Compte de paiement : Banque
Projet : Agriculture 2026
Pièce jointe : facture.pdf
```

Le système affiche ensuite une prévisualisation comptable :

```text
Débit  : Fournisseur ABC      1 000 $
Crédit : Banque               1 000 $
```

La prévisualisation comptable peut être visible seulement pour :

- comptable
- auditeur
- admin finance
- direction

---

## 27. Ne jamais supprimer une transaction publiée

Une transaction comptable publiée ne doit pas être supprimée.

Il faut faire une contre-passation.

Transaction originale :

```text
Débit  : Stock        1 000 $
Crédit : Fournisseur  1 000 $
```

Annulation :

```text
Débit  : Fournisseur  1 000 $
Crédit : Stock        1 000 $
```

Ajouter :

```text
reversedEntryId
reversalReason
reversedBy
reversedAt
```

---

## 28. Validation comptable stricte

Avant de publier une écriture, vérifier :

```text
totalDebit == totalCredit
amount > 0
currencyId existe
organizationId existe
accountId existe
transactionTypeId existe
période comptable ouverte
budget disponible
utilisateur autorisé
transaction pas déjà publiée
compte actif
débit et crédit non vides
```

Bloquer la transaction si une règle échoue.

---

## 29. Workflow d’approbation global

Créer un moteur de workflow configurable.

Il doit pouvoir gérer :

- demande d’achat
- bon de commande
- facture fournisseur
- paiement fournisseur
- paiement salaire
- dépense
- vente
- sortie de stock
- mouvement de stock
- contrat
- loyer
- budget
- projet
- document
- chantier

Exemple :

```text
Demande d’achat
↓
Chef de département
↓
Finance
↓
Direction
↓
Approvisionnement
↓
Réception
↓
Facture
↓
Paiement
↓
Comptabilisation
```

Le workflow doit être configurable selon :

```text
organisation
module
montant
devise
département
site
projet
rôle
type de transaction
```

Exemple :

```text
0 à 500 $       → Superviseur
501 à 5 000 $   → Finance
5 001 $ et plus → Direction
```

---

## 30. Gestion des budgets

Ajouter ou renforcer un module budget.

Chaque transaction doit pouvoir être rattachée à :

- budget
- ligne budgétaire
- projet
- département
- site
- activité
- centre de coût

Exemple :

```text
Projet : Ferme Kasangulu
Activité : Élevage porcin
Ligne budgétaire : Aliment porc
Budget prévu : 10 000 $
Dépensé : 6 500 $
Solde : 3 500 $
```

Le système doit :

- vérifier le budget disponible
- alerter en cas de dépassement
- bloquer selon configuration
- produire budget vs réalisé
- produire budget par projet
- produire budget par département
- produire budget par site

---

## 31. Multi-organisation / multi-site / multi-projet

Le système doit gérer :

```text
Organisation
├── Département
├── Site
├── Projet
├── Activité
├── Entrepôt
└── Utilisateurs
```

Chaque donnée importante doit être rattachée à :

```text
organizationId
siteId
departmentId
projectId
activityId
createdBy
```

À appliquer sur :

- transactions
- factures
- paiements
- produits
- stocks
- employés
- salaires
- contrats
- documents
- projets
- budgets
- achats
- ventes
- activités agricoles
- activités d’élevage
- chantiers
- véhicules

---

## 32. Stock professionnel

Renforcer la gestion de stock.

Créer ou améliorer :

```text
warehouses
stock_items
stock_movements
stock_adjustments
stock_transfers
inventory_counts
stock_lots
serial_numbers
stock_reservations
stock_valuation
```

Fonctionnalités obligatoires :

- entrées de stock
- sorties de stock
- transfert entre entrepôts
- inventaire physique
- ajustement de stock
- pertes
- lots
- dates d’expiration
- numéros de série
- seuil minimum
- alertes rupture
- valorisation FIFO
- valorisation LIFO
- coût moyen pondéré

Exemple d’intégration :

```text
Achat aliment porc
↓
Réception magasin
↓
Stock augmente
↓
Distribution aux animaux
↓
Stock diminue
↓
Coût élevage augmente
↓
Finance mise à jour
```

---

## 33. Approvisionnement complet

Renforcer l’approvisionnement avec :

```text
purchase_requisitions
purchase_requisition_items
purchase_orders
purchase_order_items
supplier_quotations
supplier_comparisons
goods_receipts
supplier_invoices
supplier_payments
supplier_contracts
```

Processus cible :

```text
Demande d’achat
↓
Approbation
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

## 34. Rapports financiers officiels

Créer ou renforcer les rapports :

- grand livre
- journal général
- balance générale
- bilan
- compte de résultat
- flux de trésorerie
- dettes fournisseurs
- créances clients
- dépenses par projet
- dépenses par département
- dépenses par site
- budget vs réalisé
- rapports d’audit
- rapports de taxes
- rapports de trésorerie
- rapports d’approvisionnement
- rapports de stock

Exports nécessaires :

```text
PDF
Excel
CSV
```

---

## 35. Gestion documentaire

Chaque opération importante doit pouvoir avoir des pièces jointes :

- facture PDF
- reçu
- bon de commande
- bon de réception
- contrat
- preuve de paiement
- photo
- rapport terrain
- document juridique

Créer ou renforcer :

```text
documents
document_versions
document_links
document_approvals
document_signatures
document_categories
document_audit_logs
```

Chaque document doit pouvoir être lié à :

```text
transaction
facture
paiement
fournisseur
client
employé
contrat
projet
site
activité
bien immobilier
animal
champ agricole
véhicule
chantier
```

Fonctions souhaitées :

- upload
- classement
- versionnage
- validation
- signature
- recherche
- OCR plus tard
- archivage

---

## 36. Audit avancé

Renforcer l’audit.

Le système doit enregistrer :

```text
userId
organizationId
module
entityType
entityId
action
oldValue
newValue
ipAddress
userAgent
device
createdAt
```

Actions à suivre :

- création
- modification
- suppression
- approbation
- rejet
- publication comptable
- annulation
- connexion
- échec connexion
- export rapport
- changement permission
- changement rôle

---

## 37. Périodes comptables

Ajouter un module de périodes comptables.

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
```

Statuts :

```text
OPEN
LOCKED
CLOSED
```

Règles :

- impossible de publier dans une période fermée
- impossible de modifier une transaction publiée dans une période fermée
- autorisation spéciale pour réouverture
- toute réouverture doit être auditée

---

## 38. Numérotation automatique

Créer un système de numérotation automatique pour :

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

La numérotation doit pouvoir dépendre de :

- organisation
- année
- module
- site
- type de document

---

## 39. Gestion des taxes

Prévoir un module taxes configurable.

```text
taxes
tax_rates
tax_rules
tax_reports
```

Fonctions :

- taxe à l’achat
- taxe à la vente
- taxe récupérable
- taxe collectée
- exonération
- rapport de taxes
- taxes selon pays
- taxes selon organisation

---

## 40. Sécurité et permissions fines

Renforcer les permissions.

Permissions détaillées :

```text
Voir facture
Créer facture
Modifier facture
Approuver facture
Supprimer facture
Exporter facture
Valider paiement
Voir salaire
Modifier salaire
Approuver salaire
Voir transaction
Publier transaction
Annuler transaction
Voir rapport financier
Exporter rapport financier
```

Les permissions doivent être limitées par :

- organisation
- département
- site
- projet
- module
- rôle

Exemple :

Un superviseur du site Kasangulu ne doit pas voir les données du site Kinshasa, sauf autorisation.

---

## 41. RH et paie

Renforcer RH avec :

- employés
- contrats
- présence
- congés
- horaires
- évaluations
- formations
- paie
- historique salarial
- organigramme
- documents employés
- avances sur salaire
- primes
- déductions

Intégration finance :

```text
Salaire approuvé
↓
Transaction salaire créée
↓
Écriture comptable générée
↓
Paiement effectué
↓
Rapport masse salariale mis à jour
```

---

## 42. Immobilier

Renforcer immobilier avec :

- propriétés
- bâtiments
- unités locatives
- locataires
- contrats de location
- loyers
- paiements
- maintenance
- documents
- échéances
- renouvellements
- dépôts de garantie

Intégration finance :

```text
Paiement loyer
↓
Revenu immobilier
↓
Caisse/banque augmente
↓
Rapport financier mis à jour
```

---

## 43. Construction / BTP

Renforcer construction avec :

- projets de construction
- chantiers
- matériaux
- fournisseurs
- main-d’œuvre
- sous-traitants
- dépenses chantier
- budget chantier
- avancement chantier
- planning
- documents chantier
- stock matériaux
- rapports de chantier

Intégration finance/stock :

```text
Achat ciment
↓
Stock matériaux augmente
↓
Utilisation sur chantier
↓
Stock diminue
↓
Coût chantier augmente
↓
Finance mise à jour
```

---

## 44. Agriculture

Renforcer agriculture avec :

- champs
- cultures
- saisons agricoles
- semis
- récoltes
- intrants
- rendement
- coûts par champ
- coûts par culture
- calendrier agricole
- stocks agricoles
- ventes agricoles

Intégration finance/stock :

```text
Achat semences
↓
Stock intrants augmente
↓
Utilisation dans champ
↓
Coût de production agricole augmente
↓
Récolte enregistrée
↓
Stock produit agricole augmente
↓
Vente
↓
Revenu agricole
```

---

## 45. Élevage

Renforcer élevage pour plusieurs espèces :

- bovins
- porcs
- chèvres
- moutons
- volailles

Pour chaque espèce :

- identification
- sexe
- race
- naissance
- achat
- vente
- reproduction
- gestation
- mise bas
- vaccination
- traitement
- médicaments
- mortalité
- alimentation
- croissance
- poids
- historique sanitaire
- coût par animal
- coût par lot
- production

Intégration finance/stock :

```text
Achat médicament
↓
Stock médicament augmente
↓
Traitement animal
↓
Stock médicament diminue
↓
Coût élevage augmente
```

---

## 46. Gestion de projets ONG

Ajouter un module projets ONG.

Fonctions :

- projets
- bailleurs
- activités
- indicateurs
- budget par projet
- dépenses par projet
- rapports narratifs
- rapports financiers
- documents bailleurs
- suivi des objectifs
- taux d’exécution

Intégration :

```text
Projet
↓
Budget
↓
Activités
↓
Achats
↓
Dépenses
↓
Rapports bailleurs
```

---

## 47. Logistique

Ajouter ou renforcer :

- véhicules
- chauffeurs
- carburant
- missions
- entretiens
- réparations
- kilométrage
- documents véhicules
- assurance
- contrôle technique

Intégration finance :

```text
Achat carburant
↓
Dépense logistique
↓
Budget carburant diminue
↓
Rapport véhicule mis à jour
```

---

## 48. Tableau de bord décisionnel

Créer un dashboard global pour la direction.

Afficher :

- solde caisse
- solde banque
- revenus du mois
- dépenses du mois
- dettes fournisseurs
- créances clients
- salaires à payer
- stocks critiques
- budgets dépassés
- contrats qui expirent
- projets en retard
- factures impayées
- top fournisseurs
- top clients
- performance par activité

---

## 49. Assistant IA futur

Préparer les données pour un assistant IA.

L’utilisateur pourra demander :

```text
Combien avons-nous dépensé en carburant cette année ?
Quel fournisseur coûte le plus cher ?
Quels projets dépassent le budget ?
Quels employés ont beaucoup d’absences ?
Combien avons-nous dépensé pour les porcs à Kasangulu ?
Quel site est le plus rentable ?
Quels contrats expirent ce mois-ci ?
```

Mais l’IA ne doit pas être prioritaire avant que les données soient propres.

Priorité :

```text
1. Données propres
2. Transactions fiables
3. Rapports exacts
4. IA ensuite
```

---

## 50. Mode hors-ligne / faible connexion

Prévoir une architecture compatible avec les zones à faible connexion.

Fonctions souhaitées :

- PWA
- saisie hors-ligne
- synchronisation plus tard
- file d’attente locale
- résolution de conflits
- upload différé de documents

Très utile pour :

- agriculture
- élevage
- entrepôt
- terrain
- sites éloignés

---

## 51. API et intégrations

Prévoir intégrations futures :

- Excel
- Power BI
- banques
- mobile money
- SMS
- email
- signature électronique
- API gouvernementale
- import/export comptable
- scanners code-barres
- QR code
- imprimantes reçus

---

# PARTIE 3 — LIVRABLES ATTENDUS

## 52. Livrable A — Audit complet

Pour chaque module, produire :

```text
Module
Existe
Partiel
Manquant
À corriger
À renforcer
Priorité
Complexité
Impact métier
Commentaire
```

---

## 53. Livrable B — Note de maturité

Attribuer une note sur 100 pour :

```text
Architecture
Transactions
Finance
Approvisionnement
Stock
Budget
Workflow
RH
Immobilier
Construction
Agriculture
Élevage
Projets ONG
Logistique
Documents
Audit
Sécurité
Reporting
IA future
```

---

## 54. Livrable C — Gap Analysis

Créer un tableau :

```text
Module | Fonction | Existe | Partiel | Manquant | Priorité | Commentaire
```

---

## 55. Livrable D — Architecture cible

Proposer :

- schéma des modules
- relations entre modules
- tables à ajouter
- tables à modifier
- services backend à créer
- endpoints API à ajouter
- règles métier
- validations
- workflows
- rapports
- permissions

---

## 56. Livrable E — Plan de migration

Le projet existant ne doit pas être cassé.

Proposer :

```text
Phase 1 : analyse réelle de l’existant
Phase 2 : consolidation transaction/finance
Phase 3 : workflow + budget
Phase 4 : stock + approvisionnement avancé
Phase 5 : documents + audit avancé
Phase 6 : projets ONG + logistique
Phase 7 : agriculture + élevage avancés
Phase 8 : IA + assistant décisionnel
```

---

## 57. Livrable F — Roadmap réaliste

Créer une feuille de route :

### Phase 1 — Audit et stabilisation

- analyse du backend
- analyse de la base de données
- correction des incohérences
- documentation des modules
- nettoyage des duplications

### Phase 2 — Cœur ERP/SIFA

- moteur transaction
- journal entries
- journal entry lines
- transaction type rules
- validations comptables
- périodes comptables
- numérotation automatique

### Phase 3 — Gouvernance

- workflow d’approbation
- audit avancé
- permissions fines
- documents
- budget

### Phase 4 — Opérations

- stock professionnel
- approvisionnement avancé
- ventes avancées
- fournisseurs
- clients
- paiements

### Phase 5 — Modules spécialisés

- RH/paie avancée
- immobilier
- construction
- agriculture
- élevage
- logistique
- projets ONG

### Phase 6 — Niveau institutionnel

- rapports officiels
- multi-organisation
- multi-site
- sécurité renforcée
- sauvegarde
- conformité
- exports PDF/Excel

### Phase 7 — Intelligence

- assistant IA
- prévisions
- alertes intelligentes
- analyse décisionnelle

---

# PARTIE 4 — RÈGLES À RESPECTER

## 58. Ne pas recommencer le projet

Règle absolue :

```text
Ne pas proposer de recommencer le projet.
```

Il faut travailler avec l’existant.

Objectif :

```text
Renforcer
Normaliser
Connecter
Automatiser
Sécuriser
Professionnaliser
```

---

## 59. Priorités principales

L’ordre de priorité recommandé est :

```text
1. Audit complet de l’existant
2. Moteur transaction comptable
3. Workflow d’approbation
4. Budget + projet + département + site
5. Stock professionnel
6. Rapports financiers officiels
7. Gestion documentaire
8. Audit avancé
9. Périodes comptables
10. Permissions fines
11. Tableau de bord décisionnel
12. Modules spécialisés
13. IA future
```

---

## 60. Skill attendu : ERP/SIFA Architect

Créer aussi une logique de skill nommée :

```text
ERP/SIFA Architect
```

Ce skill doit aider à :

- analyser le backend existant
- comprendre les modules
- détecter les manques
- proposer des améliorations
- concevoir les tables
- concevoir les workflows
- concevoir les règles comptables
- concevoir les intégrations
- produire les prompts de développement
- produire les tickets techniques
- produire les specs API
- produire la roadmap
- évaluer le niveau commercial du produit

Le skill doit toujours respecter cette logique :

```text
1. Ne jamais recommencer le projet inutilement.
2. Toujours réutiliser l’existant.
3. Toujours analyser l’existant avant de proposer.
4. Toujours vérifier transaction, finance, workflow, budget, stock, audit.
5. Toujours penser multi-organisation et multi-site.
6. Toujours séparer opération métier et écriture comptable.
7. Toujours cacher la complexité débit/crédit aux utilisateurs simples.
8. Toujours garder une trace audit.
9. Toujours prévoir documents et approbations.
10. Toujours connecter les modules entre eux.
11. Toujours viser un ERP commercialisable.
12. Toujours produire des tickets techniques exploitables.
```

---

# PARTIE 5 — RÉSULTAT FINAL ATTENDU

À la fin de l’analyse, produire un document clair qui explique :

1. Si le projet actuel peut devenir un ERP/SIFA mature.
2. Le niveau réel de maturité actuel.
3. Ce qui existe déjà.
4. Ce qui est partiel.
5. Ce qui manque.
6. Ce qui doit être fait exactement.
7. Les tables à créer.
8. Les tables à modifier.
9. Les services à renforcer.
10. Les endpoints à ajouter.
11. Les modules prioritaires.
12. Les risques techniques.
13. Les risques métier.
14. Les opportunités commerciales.
15. La possibilité de vendre à des ONG, entreprises, municipalités ou gouvernements.
16. La roadmap réaliste.
17. Les tickets techniques à exécuter.
18. Les dépendances entre les tâches.
19. Les impacts sur frontend, backend et base de données.
20. Les recommandations pour rendre le produit commercialisable.

---

# Conclusion

L’objectif final est de transformer le projet existant en un système complet où :

```text
Une seule action métier met à jour automatiquement les modules concernés.
```

Exemples :

```text
Achat fournisseur
→ Stock
→ Finance
→ Budget
→ Projet
→ Rapport

Paiement salaire
→ RH
→ Finance
→ Trésorerie
→ Rapport

Paiement loyer
→ Immobilier
→ Finance
→ Trésorerie
→ Rapport

Traitement animal
→ Élevage
→ Stock médicament
→ Coût animal
→ Finance

Dépense chantier
→ Construction
→ Stock matériaux
→ Coût chantier
→ Finance

Projet ONG
→ Budget
→ Activités
→ Dépenses
→ Rapport bailleur
```

Ce système doit devenir un vrai **ERP/SIFA Enterprise**, pas une simple collection de modules.

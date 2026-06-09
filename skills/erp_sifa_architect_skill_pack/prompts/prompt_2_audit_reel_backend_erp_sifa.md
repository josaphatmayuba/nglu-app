# PROMPT 2 — EXÉCUTION DE L’AUDIT RÉEL DU BACKEND ERP/SIFA EXISTANT

## Objectif de ce prompt

Tu dois maintenant analyser concrètement le projet ERP/SIFA existant à partir des fichiers du backend et produire un diagnostic technique et métier exploitable.

Le but n’est pas de théoriser.

Le but est de regarder le code réel, la structure réelle, les modules réels, les tables réelles, les services réels et les endpoints réels afin de répondre clairement :

> Est-ce que ce projet peut devenir un ERP/SIFA mature capable de rivaliser avec des solutions régionales ?

Et surtout :

> Quelles actions techniques faut-il exécuter maintenant, dans quel ordre, sans casser l’existant ?

---

# 1. Contexte du projet

Le projet actuel est déjà une base ERP/SIFA.

Il contient déjà plusieurs modules tels que :

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

Le projet ne doit pas être recommencé à zéro.

---

# 2. Mission principale

Analyser le backend actuel en profondeur.

Tu dois produire :

1. Une cartographie réelle des modules.
2. Une cartographie réelle des tables ou schémas.
3. Une cartographie réelle des services.
4. Une cartographie réelle des endpoints API.
5. Une analyse de la gestion des transactions.
6. Une analyse de la finance.
7. Une analyse de l’approvisionnement.
8. Une analyse du stock.
9. Une analyse de la sécurité.
10. Une analyse de l’audit.
11. Une analyse des permissions.
12. Une analyse des modules spécialisés.
13. Une note de maturité sur 100.
14. Une liste claire de ce qui manque.
15. Une roadmap technique.
16. Des tickets techniques prêts à donner à un développeur ou à un agent IA.

---

# 3. Règle absolue

Ne propose pas de recommencer le projet.

Tu dois respecter cette logique :

```text
Analyser
Comprendre
Réutiliser
Renforcer
Connecter
Normaliser
Sécuriser
Professionnaliser
```

Le projet actuel est la base.

L’objectif est de le transformer progressivement en ERP/SIFA mature.

---

# 4. Méthode d’analyse obligatoire

## Étape 1 — Lire la structure du projet

Analyser :

```text
src/
modules/
controllers/
services/
dto/
schemas/
database/
migrations/
guards/
decorators/
middlewares/
config/
```

Identifier :

- les modules existants
- les fichiers principaux
- les dépendances entre modules
- les services partagés
- les conventions de nommage
- les parties dupliquées
- les parties mal organisées

---

## Étape 2 — Cartographier les modules

Créer un tableau :

```text
Module | Existe | Fichiers détectés | Tables liées | Endpoints | Maturité | Commentaire
```

Modules à vérifier :

```text
Auth
Users
Roles
Permissions
Audit
Dashboard
Accounts
SubAccounts
Transactions
TransactionTypes
Customers
Suppliers
Products
ProductCategories
PurchaseInvoices
SaleInvoices
Payments
PaymentMethods
Currencies
HR
PropertyManagement
Construction
Agriculture
Livestock
Notifications
Messages
Settings
Documents
Workflow
Budget
Stock
Procurement
Projects
Logistics
```

Pour chaque module, dire clairement :

- complet
- partiel
- absent
- mal intégré
- critique à renforcer

---

# 5. Analyse prioritaire : Transactions et Finance

La gestion de transaction est le cœur du SIFA.

Analyser en premier :

```text
transactions
transaction-types
accounts
sub-accounts
purchase-invoices
sale-invoices
payments
currencies
```

Répondre à ces questions :

1. Est-ce que le système utilise bien débit/crédit ?
2. Est-ce que chaque transaction a un compte débit ?
3. Est-ce que chaque transaction a un compte crédit ?
4. Est-ce que le système vérifie que débit = crédit ?
5. Est-ce que les transactions sont reliées à une organisation ?
6. Est-ce que les transactions sont reliées à une devise ?
7. Est-ce que les transactions sont reliées à une facture ?
8. Est-ce que les transactions sont reliées à un paiement ?
9. Est-ce que les transactions sont reliées à un module d’origine ?
10. Est-ce que les transactions peuvent être modifiées après validation ?
11. Est-ce que les transactions peuvent être supprimées ?
12. Est-ce qu’il existe une annulation par contre-passation ?
13. Est-ce qu’il existe un journal comptable ?
14. Est-ce qu’il existe des lignes comptables multi-lignes ?
15. Est-ce que les transaction types automatisent débit/crédit ?
16. Est-ce que les salaires créent des transactions ?
17. Est-ce que les loyers créent des transactions ?
18. Est-ce que les ventes créent des transactions ?
19. Est-ce que les achats créent des transactions ?
20. Est-ce que le stock crée ou reçoit des transactions ?

---

# 6. Évaluation du modèle actuel de transaction

Si le modèle actuel ressemble à ceci :

```text
transaction
- debitId
- creditId
- amount
- type
- relatedId
```

Alors il faut l’évaluer comme une bonne base, mais limitée.

Dire clairement :

- ce qui est bien
- ce qui est risqué
- ce qui manque pour un vrai ERP
- comment migrer sans casser l’existant

Comparer le modèle actuel avec le modèle cible :

```text
business_transactions
journal_entries
journal_entry_lines
transaction_type_rules
```

Produire une recommandation de migration progressive.

---

# 7. Analyse de Transaction Types

Analyser le module `transaction-types`.

Vérifier s’il contient :

```text
name
debitAccountId
creditAccountId
description
isActive
```

Puis recommander comment l’améliorer avec :

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
```

Proposer une table :

```text
transaction_type_rules
```

avec des exemples concrets :

```text
PURCHASE_INVOICE
SUPPLIER_PAYMENT
CUSTOMER_PAYMENT
SALARY_PAYMENT
RENT_PAYMENT_RECEIVED
STOCK_ADJUSTMENT
FUEL_EXPENSE
PROJECT_EXPENSE
```

---

# 8. Analyse Finance complète

Vérifier l’existence de :

```text
Plan comptable
Grand livre
Journal général
Balance générale
Bilan
Compte de résultat
Flux de trésorerie
Comptes fournisseurs
Comptes clients
Caisse
Banque
Rapprochement bancaire
Budget
Centres de coûts
Périodes comptables
Taxes
Taux de change
Immobilisations
Amortissements
```

Créer un tableau :

```text
Fonction Finance | Existe | Partiel | Absent | Priorité | Commentaire
```

---

# 9. Analyse Approvisionnement

Vérifier l’existence de :

```text
Demande d’achat
Workflow d’approbation
Fournisseurs
Demande de prix
Comparaison fournisseurs
Bon de commande
Réception
Facture fournisseur
Paiement fournisseur
Contrats fournisseurs
Documents fournisseurs
```

Comparer avec le processus cible :

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

Identifier les écarts.

---

# 10. Analyse Stock

Vérifier l’existence de :

```text
Produits
Catégories
Entrepôts
Mouvements de stock
Entrées
Sorties
Transferts
Inventaires physiques
Ajustements
Lots
Numéros de série
Dates d’expiration
Stock minimum
Alertes rupture
FIFO
LIFO
Coût moyen pondéré
```

Dire si le stock actuel est :

```text
Simple catalogue produits
Stock de base
Stock ERP professionnel
```

---

# 11. Analyse Workflow

Vérifier si le système possède un workflow configurable.

Le workflow doit pouvoir gérer :

```text
achat
paiement
salaire
facture
stock
contrat
document
budget
projet
chantier
loyer
```

Si absent, proposer une architecture :

```text
workflows
workflow_steps
workflow_approvals
workflow_rules
workflow_instances
```

Le workflow doit pouvoir dépendre de :

```text
organisation
module
montant
devise
rôle
département
site
projet
type de transaction
```

---

# 12. Analyse Budget

Vérifier s’il existe :

```text
budgets
budget_lines
budget_allocations
budget_consumptions
budget_revisions
```

Chaque dépense doit pouvoir être liée à :

```text
budgetId
budgetLineId
projectId
departmentId
siteId
activityId
costCenterId
```

Le système doit pouvoir produire :

```text
Budget prévu
Montant engagé
Montant dépensé
Solde disponible
Pourcentage consommé
Dépassement
```

---

# 13. Analyse Multi-organisation / Multi-site

Vérifier si les modules utilisent bien :

```text
organizationId
siteId
departmentId
projectId
activityId
```

Identifier les tables où ces champs manquent.

Produire un tableau :

```text
Table | organizationId | siteId | departmentId | projectId | Problème | Correction
```

---

# 14. Analyse Audit

Vérifier si l’audit capture :

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
createdAt
```

Vérifier si l’audit couvre :

```text
création
modification
suppression
approbation
rejet
publication comptable
annulation
connexion
échec connexion
export
changement permission
changement rôle
```

Identifier les manques.

---

# 15. Analyse Permissions

Vérifier si les permissions sont fines.

Exemples attendus :

```text
invoice.create
invoice.read
invoice.update
invoice.delete
invoice.approve
invoice.export
transaction.create
transaction.post
transaction.reverse
salary.read
salary.approve
report.finance.read
report.finance.export
```

Vérifier si les permissions peuvent être limitées par :

```text
organisation
site
département
projet
module
```

---

# 16. Analyse Documents

Vérifier si le système permet de lier des documents à :

```text
transactions
factures
paiements
fournisseurs
clients
employés
contrats
projets
sites
activités
biens immobiliers
animaux
champs agricoles
véhicules
chantiers
```

Si absent ou incomplet, proposer :

```text
documents
document_versions
document_links
document_approvals
document_signatures
document_categories
document_audit_logs
```

---

# 17. Analyse Modules spécialisés

Analyser aussi :

## RH

```text
employés
contrats
présences
congés
salaires
paie
primes
déductions
documents
intégration finance
```

## Immobilier

```text
propriétés
unités
locataires
baux
loyers
paiements
maintenance
documents
intégration finance
```

## Construction

```text
chantiers
matériaux
main-d’œuvre
budget chantier
dépenses
avancement
stock matériaux
intégration finance
```

## Agriculture

```text
champs
cultures
saisons
semis
récoltes
intrants
rendement
coûts
stock agricole
vente
intégration finance
```

## Élevage

```text
animaux
espèces
identification
reproduction
santé
vaccins
médicaments
mortalité
alimentation
coûts
vente
intégration stock
intégration finance
```

## Logistique

```text
véhicules
chauffeurs
missions
carburant
entretien
kilométrage
documents
intégration finance
```

## Projets ONG

```text
projets
bailleurs
activités
indicateurs
budget
dépenses
rapports narratifs
rapports financiers
```

---

# 18. Notes de maturité à produire

Attribuer une note sur 100 pour chaque domaine :

```text
Architecture
Base de données
Sécurité
Permissions
Audit
Transactions
Transaction Types
Finance
Approvisionnement
Stock
Workflow
Budget
Documents
Reporting
RH
Immobilier
Construction
Agriculture
Élevage
Logistique
Projets ONG
Multi-organisation
Multi-site
Capacité gouvernementale
Capacité commerciale
```

Donner aussi une note globale :

```text
Maturité ERP/SIFA actuelle : __ / 100
```

---

# 19. Classification des priorités

Classer les améliorations selon :

```text
P0 = critique, bloque la maturité ERP
P1 = très important
P2 = important
P3 = amélioration future
```

Exemple :

```text
P0 : transaction/journal comptable
P0 : workflow d’approbation
P0 : audit avancé
P1 : budget
P1 : stock professionnel
P1 : documents
P2 : projets ONG
P2 : logistique
P3 : IA
```

Adapter selon l’état réel du code.

---

# 20. Tickets techniques attendus

Produire des tickets techniques exploitables.

Chaque ticket doit contenir :

```text
Titre
Contexte
Objectif
Fichiers ou modules concernés
Tables concernées
Travail à faire
Règles métier
Critères d’acceptation
Priorité
Complexité estimée
Risques
Tests à faire
```

Exemple :

```text
Ticket 1 — Ajouter journal_entries et journal_entry_lines

Contexte :
Le système possède actuellement des transactions simples avec debitId/creditId.

Objectif :
Permettre des écritures comptables multi-lignes.

Travail à faire :
- créer table journal_entries
- créer table journal_entry_lines
- ajouter service de génération
- valider total débit = total crédit
- empêcher publication si déséquilibré

Critères d’acceptation :
- une facture avec taxe peut générer 3 lignes comptables
- total débit = total crédit
- une transaction publiée ne peut plus être modifiée directement
```

---

# 21. Roadmap attendue

Produire une roadmap claire :

## Phase 1 — Stabilisation et diagnostic

- cartographie modules
- cartographie tables
- corrections critiques
- documentation

## Phase 2 — Cœur transactionnel

- business_transactions
- journal_entries
- journal_entry_lines
- transaction_type_rules
- validation comptable
- contre-passation

## Phase 3 — Gouvernance

- workflow
- audit avancé
- permissions fines
- périodes comptables
- numérotation automatique

## Phase 4 — Finance et budget

- grand livre
- balance
- bilan
- compte de résultat
- budget
- centres de coûts
- rapports

## Phase 5 — Approvisionnement et stock

- demandes d’achat
- bons de commande
- réception
- stock professionnel
- inventaire
- valorisation

## Phase 6 — Documents et reporting

- gestion documentaire
- pièces jointes
- exports PDF/Excel
- dashboards

## Phase 7 — Modules spécialisés

- RH/paie avancée
- immobilier avancé
- construction
- agriculture
- élevage
- logistique
- projets ONG

## Phase 8 — Niveau institutionnel

- multi-organisation renforcé
- multi-site
- sécurité gouvernementale
- sauvegardes
- conformité
- performance

## Phase 9 — IA future

- assistant IA
- questions en langage naturel
- prévisions
- alertes intelligentes

---

# 22. Format final de la réponse attendue

La réponse doit être structurée comme ceci :

```text
1. Résumé exécutif
2. Verdict global
3. Cartographie des modules
4. Cartographie des tables
5. Analyse transactionnelle
6. Analyse finance
7. Analyse approvisionnement
8. Analyse stock
9. Analyse sécurité
10. Analyse audit
11. Analyse permissions
12. Analyse modules spécialisés
13. Gap analysis
14. Notes de maturité
15. Risques critiques
16. Recommandations prioritaires
17. Roadmap
18. Tickets techniques
19. Conclusion commerciale
```

---

# 23. Conclusion commerciale attendue

Répondre clairement :

1. Est-ce que le projet peut être vendu aujourd’hui à une PME ?
2. Est-ce que le projet peut être vendu aujourd’hui à une ONG ?
3. Est-ce que le projet peut être vendu aujourd’hui à une municipalité ?
4. Est-ce que le projet peut être vendu aujourd’hui à un ministère ?
5. Quelles améliorations sont nécessaires avant vente ?
6. Quel module peut devenir l’avantage concurrentiel ?
7. Quel risque peut faire échouer le projet ?
8. Quelle stratégie adopter pour commercialiser progressivement ?

---

# 24. Rappel final

Ne pas imaginer un nouveau projet.

Analyser celui qui existe.

Ne pas casser l’existant.

Réutiliser ce qui est déjà développé.

Priorité absolue :

```text
Transaction
Finance
Workflow
Budget
Stock
Audit
Documents
Permissions
Reporting
```

Le but final est de transformer ce projet en vrai ERP/SIFA Enterprise.

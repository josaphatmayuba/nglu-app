# PROMPT 9 — BACKLOG COMPLET ET TICKETS DE DÉVELOPPEMENT ERP/SIFA PAR PRIORITÉ

## Objectif de ce prompt

Ce prompt sert à transformer toute l’analyse ERP/SIFA en un backlog de développement clair, organisé et directement exécutable.

L’objectif est de produire des tickets techniques prêts à être donnés à :

- un développeur backend
- un développeur frontend
- un agent IA de code
- VS Code / Cursor / Claude
- une équipe produit
- un chef de projet
- un architecte logiciel

Le backlog doit être classé par priorité :

```text
P0 = critique, bloque la maturité ERP/SIFA
P1 = très important, nécessaire avant produit commercial
P2 = important, amélioration forte
P3 = futur, différenciation ou optimisation
```

---

# 1. Contexte

Le projet ERP/SIFA existe déjà.

Il contient déjà plusieurs modules :

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

Le projet ne doit pas être recommencé.

Il faut produire un backlog qui renforce l’existant.

---

# 2. Mission principale

Créer un backlog complet avec :

1. épics
2. features
3. tickets techniques
4. priorités
5. dépendances
6. complexité estimée
7. critères d’acceptation
8. tests à faire
9. risques
10. ordre d’exécution

Le backlog doit couvrir :

- backend
- frontend
- base de données
- sécurité
- DevOps
- documentation
- démo
- commercialisation
- support
- tests

---

# 3. Règle absolue

Ne pas créer des tickets vagues.

Chaque ticket doit être actionnable.

Mauvais ticket :

```text
Améliorer la finance
```

Bon ticket :

```text
Créer la table journal_entries et journal_entry_lines pour supporter les écritures comptables multi-lignes.
```

---

# 4. Format obligatoire des tickets

Chaque ticket doit suivre ce format :

```text
ID :
Titre :
Priorité :
Épic :
Module :
Type :
Contexte :
Objectif :
Travail à faire :
Tables concernées :
Fichiers concernés :
Endpoints concernés :
Règles métier :
Critères d’acceptation :
Tests à faire :
Dépendances :
Risques :
Complexité :
```

Types possibles :

```text
Backend
Frontend
Database
DevOps
Security
Documentation
Testing
UX
Data
Commercial
```

Complexité :

```text
S = petit
M = moyen
L = grand
XL = très grand
```

---

# 5. Épics principaux

Organiser les tickets par épics :

```text
EPIC-01 — Audit et stabilisation
EPIC-02 — Moteur transactionnel ERP
EPIC-03 — Transaction Type Rules
EPIC-04 — Workflow d’approbation
EPIC-05 — Budget et centres de coûts
EPIC-06 — Stock professionnel
EPIC-07 — Approvisionnement avancé
EPIC-08 — Rapports financiers
EPIC-09 — Documents
EPIC-10 — Audit avancé
EPIC-11 — Permissions fines
EPIC-12 — Multi-organisation / multi-site
EPIC-13 — Frontend UX
EPIC-14 — Modules spécialisés
EPIC-15 — DevOps / Production
EPIC-16 — Tests automatisés
EPIC-17 — Documentation
EPIC-18 — Données demo
EPIC-19 — Commercialisation
EPIC-20 — IA future
```

---

# 6. Priorité P0 — Critique

Les tickets P0 sont obligatoires pour transformer le projet en vrai ERP/SIFA.

## P0.1 — Audit réel du backend

Créer les tickets pour :

```text
cartographier modules
cartographier tables
cartographier endpoints
cartographier permissions
cartographier transactions
cartographier relations entre modules
identifier données sans organizationId
identifier endpoints non protégés
identifier modules sans audit
identifier duplications
```

---

## P0.2 — Moteur transactionnel ERP

Créer les tickets pour :

```text
créer business_transactions
créer journal_entries
créer journal_entry_lines
créer AccountingEngineService
créer validation débit = crédit
créer prévisualisation comptable
créer publication comptable
créer contre-passation
empêcher modification transaction publiée
lier transaction à entity source
lier transaction à organisation/site/projet
```

---

## P0.3 — Transaction Type Rules

Créer les tickets pour :

```text
renforcer transaction_types
créer transaction_type_rules
créer accountSource
créer amountFormula
seed transaction types système
connecter purchase invoice aux rules
connecter sale invoice aux rules
connecter payments aux rules
connecter salary aux rules
connecter rent payment aux rules
```

---

## P0.4 — Périodes comptables

Créer les tickets pour :

```text
créer accounting_periods
empêcher publication période fermée
ajouter fermeture période
ajouter verrouillage période
ajouter réouverture avec permission
auditer période fermée/réouverte
```

---

## P0.5 — Audit avancé

Créer les tickets pour :

```text
renforcer audit_logs
capturer oldValue/newValue
capturer IP/userAgent
auditer approbations
auditer transactions publiées
auditer annulations
auditer exports
auditer changements permissions
auditer changements rôles
```

---

## P0.6 — Sécurité et permissions critiques

Créer les tickets pour :

```text
protéger tous endpoints sensibles
ajouter permissions transaction.post
ajouter permissions transaction.reverse
ajouter permissions invoice.approve
ajouter permissions report.finance.export
vérifier accès par organizationId
bloquer accès inter-organisation
tester rôle insuffisant
```

---

# 7. Priorité P1 — Très important

## P1.1 — Workflow d’approbation

Créer les tickets pour :

```text
créer workflows
créer workflow_steps
créer workflow_rules
créer workflow_instances
créer workflow_actions
connecter workflow aux transactions
connecter workflow aux achats
connecter workflow aux paiements
connecter workflow aux salaires
interface mes approbations
interface détail approbation
notifications approbation
```

---

## P1.2 — Budget

Créer les tickets pour :

```text
créer budgets
créer budget_lines
créer budget_consumptions
créer cost_centers
lier transactions aux budgets
vérifier budget disponible
alerter dépassement
bloquer dépassement selon configuration
rapport budget vs réel
dashboard budget
```

---

## P1.3 — Stock professionnel

Créer les tickets pour :

```text
créer warehouses
créer stock_movements
créer stock_transfers
créer stock_adjustments
créer inventory_counts
créer stock_lots
créer dates expiration
créer seuil minimum
alerte stock critique
valorisation stock
connecter achat à entrée stock
connecter vente à sortie stock
connecter élevage à consommation stock
connecter agriculture à consommation stock
connecter construction à consommation matériaux
```

---

## P1.4 — Approvisionnement avancé

Créer les tickets pour :

```text
créer purchase_requisitions
créer purchase_requisition_items
créer purchase_orders
créer purchase_order_items
créer goods_receipts
créer goods_receipt_items
créer supplier_quotations
créer supplier_comparisons
connecter demande achat à workflow
connecter réception à stock
connecter facture fournisseur à finance
```

---

## P1.5 — Rapports financiers officiels

Créer les tickets pour :

```text
rapport grand livre
rapport journal général
rapport balance générale
rapport dettes fournisseurs
rapport créances clients
rapport dépenses par projet
rapport dépenses par site
rapport budget vs réel
export PDF
export Excel
export CSV
```

---

## P1.6 — Gestion documentaire

Créer les tickets pour :

```text
créer documents
créer document_versions
créer document_links
créer document_categories
upload sécurisé
lier document à transaction
lier document à facture
lier document à paiement
lier document à fournisseur/client
lier document à employé
lier document à projet
prévisualisation document
permissions téléchargement
audit téléchargement
```

---

# 8. Priorité P2 — Important

## P2.1 — Frontend UX professionnel

Créer les tickets pour :

```text
nouvelle navigation ERP/SIFA
dashboard global direction
interface transaction métier
prévisualisation comptable
écran mes approbations
écran budget
écran stock
écran documents
centre de rapports
homepages par rôle
design system
status badges
approval timeline
audit timeline
mobile/tablette
```

---

## P2.2 — Multi-organisation / multi-site

Créer les tickets pour :

```text
vérifier organizationId partout
ajouter siteId sur tables critiques
ajouter departmentId
ajouter projectId
ajouter activityId
filtrer toutes les requêtes par organisation
ajouter sélecteur organisation/site/projet frontend
tester séparation données
```

---

## P2.3 — Modules spécialisés

Créer les tickets pour :

### RH / Paie

```text
connecter salaire à finance
connecter paie à workflow
documents employés
rapport masse salariale
```

### Immobilier

```text
connecter loyer à finance
créer reçu loyer
contrats expirants
maintenance immobilière
rapport immobilier
```

### Construction

```text
budget chantier
stock matériaux
dépenses chantier
rapport avancement
connecter chantier à finance
```

### Agriculture

```text
champs
cultures
intrants
récoltes
coûts agricoles
stock agricole
rapport rendement
```

### Élevage

```text
animaux
vaccination
traitements
médicaments
mortalité
alimentation
coûts par animal/lot
rapport sanitaire
```

### Logistique

```text
véhicules
chauffeurs
missions
carburant
entretien
rapport logistique
```

### Projets ONG

```text
bailleurs
activités
indicateurs
budgets projet
rapports narratifs
rapports financiers
```

---

## P2.4 — DevOps et production

Créer les tickets pour :

```text
Dockerfile backend
Dockerfile frontend
docker-compose prod
nginx reverse proxy
HTTPS
env.example
pipeline CI/CD
health check endpoint
logs structurés
monitoring
backup database
restore procedure
backup uploads
checklist production
```

---

## P2.5 — Tests automatisés

Créer les tickets pour :

```text
tests auth
tests permissions
tests transaction debit=credit
tests contre-passation
tests workflow
tests budget
tests stock
tests factures
tests paiements
tests rapports
tests accès inter-organisation
```

---

# 9. Priorité P3 — Futur / différenciation

## P3.1 — IA future

Créer les tickets pour :

```text
préparer modèle données pour assistant IA
créer endpoints analytics
créer questions prédéfinies
préparer recherche en langage naturel
préparer alertes intelligentes
prévisions trésorerie
prévisions stock
prévisions budget
```

---

## P3.2 — Offline / PWA

Créer les tickets pour :

```text
PWA frontend
cache local
file d’attente offline
synchronisation différée
résolution conflits
upload différé documents
mode terrain agriculture/élevage
```

---

## P3.3 — Intégrations externes

Créer les tickets pour :

```text
import Excel
export Power BI
SMS
email avancé
mobile money
banque
signature électronique
QR code
scanner code-barres
```

---

# 10. Dépendances entre tickets

L’agent doit produire un graphe de dépendances.

Exemples :

```text
journal_entry_lines dépend de journal_entries
AccountingEngineService dépend de transaction_type_rules
workflow_instances dépend de workflows
budget_consumptions dépend de business_transactions
stock_movements dépend de warehouses
goods_receipts dépend de purchase_orders
```

---

# 11. Roadmap d’exécution

Créer une roadmap en sprints.

## Sprint 0 — Audit et préparation

```text
audit backend
audit DB
audit endpoints
audit transactions
audit permissions
```

## Sprint 1 — Moteur comptable

```text
business_transactions
journal_entries
journal_entry_lines
AccountingEngineService
validation debit=credit
```

## Sprint 2 — Transaction rules

```text
transaction_type_rules
seeds
preview
connecter factures/paiements
```

## Sprint 3 — Gouvernance

```text
workflow
audit avancé
permissions fines
périodes comptables
numérotation
```

## Sprint 4 — Budget et stock

```text
budgets
cost centers
warehouses
stock movements
inventory
```

## Sprint 5 — Approvisionnement

```text
purchase requisitions
purchase orders
goods receipts
supplier comparisons
```

## Sprint 6 — Frontend critique

```text
dashboard
transactions métier
approbations
budget
stock
documents
```

## Sprint 7 — Rapports et documents

```text
rapports financiers
exports
documents
audit timeline
```

## Sprint 8 — Production

```text
tests
docker
CI/CD
backup
monitoring
documentation
```

## Sprint 9 — Démo et vente

```text
seed demo
scénarios
brochure
script commercial
formation
```

---

# 12. Format final attendu

La réponse finale doit contenir :

```text
1. Résumé exécutif
2. Liste des épics
3. Backlog P0
4. Backlog P1
5. Backlog P2
6. Backlog P3
7. Tickets détaillés
8. Dépendances
9. Roadmap sprint par sprint
10. Risques
11. Recommandation d’ordre d’exécution
```

---

# 13. Minimum de tickets détaillés à générer

L’agent doit générer au moins 40 tickets détaillés :

```text
10 tickets P0
12 tickets P1
10 tickets P2
8 tickets P3
```

Chaque ticket doit être complet avec critères d’acceptation.

---

# 14. Exemple de ticket attendu

```text
ID : ERP-P0-001
Titre : Créer la table journal_entries
Priorité : P0
Épic : EPIC-02 — Moteur transactionnel ERP
Module : Finance
Type : Database / Backend

Contexte :
Le système actuel possède des transactions simples avec debitId et creditId. Ce modèle ne permet pas de gérer proprement les écritures comptables multi-lignes.

Objectif :
Créer une table journal_entries pour représenter l’écriture comptable officielle liée à une opération métier.

Travail à faire :
- Créer le schéma journal_entries.
- Ajouter businessTransactionId.
- Ajouter journalNumber.
- Ajouter status.
- Ajouter reversedEntryId.
- Ajouter timestamps.
- Ajouter migration.
- Ajouter relations avec organizationId et createdBy.

Tables concernées :
- journal_entries
- business_transactions
- organizations
- users

Endpoints concernés :
- GET /accounting/journal-entries
- GET /accounting/journal-entries/:id

Règles métier :
- Une écriture appartient à une organisation.
- Une écriture peut être DRAFT, POSTED, REVERSED ou CANCELLED.
- Une écriture publiée ne peut pas être supprimée.

Critères d’acceptation :
- La migration crée la table correctement.
- La table est liée à business_transactions.
- Les écritures peuvent être listées par organisation.
- Les tests passent.

Tests à faire :
- test création journal entry
- test filtrage par organisation
- test status par défaut DRAFT

Dépendances :
- business_transactions

Risques :
- mauvaise migration sur données existantes

Complexité :
M
```

---

# 15. Conclusion

Ce backlog doit permettre de passer de :

```text
ERP/SIFA en construction
```

à :

```text
ERP/SIFA structuré, priorisé et exécutable par étapes
```

L’objectif est que chaque prochaine action soit claire.

Le développeur ou l’agent IA ne doit pas se demander quoi faire.

Il doit pouvoir prendre un ticket et l’exécuter.

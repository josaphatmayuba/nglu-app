# PROMPT 13 — MIGRATION DES DONNÉES, COMPATIBILITÉ ET ÉVOLUTION SANS CASSER L’EXISTANT ERP/SIFA

## Objectif de ce prompt

Ce prompt sert à préparer une stratégie de migration propre pour faire évoluer le projet ERP/SIFA existant sans casser les modules déjà développés.

Le projet possède déjà :

- modules existants
- tables existantes
- transactions existantes
- factures existantes
- utilisateurs existants
- rôles et permissions existants
- données potentiellement déjà saisies

L’objectif est de renforcer le système vers un ERP/SIFA mature tout en gardant la compatibilité.

Il ne faut pas perdre les données.

Il ne faut pas casser les anciens endpoints.

Il ne faut pas rendre inutilisables les modules existants.

---

# 1. Contexte

Le projet ERP/SIFA contient déjà plusieurs modules :

```text
Auth
Users
Roles
Permissions
Audit
Finance
Accounts
Sub-Accounts
Transactions
Transaction Types
Customers
Suppliers
Products
Purchase Invoices
Sale Invoices
Payments
HR
Property Management
Construction
Agriculture / FarmOS
Notifications
Messages
Settings
```

Le projet doit évoluer vers une architecture plus mature :

```text
business_transactions
journal_entries
journal_entry_lines
transaction_type_rules
workflows
budgets
documents
stock_movements
multi-organization
multi-site
audit avancé
```

Mais cette évolution doit se faire progressivement.

---

# 2. Mission principale

Créer un plan complet de migration et compatibilité.

L’agent doit produire :

1. Analyse des tables existantes.
2. Identification des données à protéger.
3. Plan de migration de base de données.
4. Plan de migration transactionnelle.
5. Plan de compatibilité API.
6. Plan de migration frontend.
7. Plan de rollback.
8. Plan de tests de migration.
9. Plan de sauvegarde avant migration.
10. Tickets techniques de migration.
11. Critères d’acceptation.

---

# 3. Règle absolue

Avant toute migration :

```text
Faire une sauvegarde complète.
Tester sur staging.
Valider les données migrées.
Prévoir un rollback.
Ne jamais supprimer les anciennes données avant validation.
```

---

# 4. Approche recommandée

Utiliser une stratégie progressive :

```text
1. Ajouter les nouvelles tables sans supprimer les anciennes.
2. Ajouter les nouveaux champs nullable au départ.
3. Remplir les nouvelles structures à partir des anciennes.
4. Créer des services de compatibilité.
5. Connecter progressivement les modules.
6. Tester.
7. Déprécier les anciens champs après validation.
8. Nettoyer seulement dans une version future.
```

---

# 5. Analyse préalable obligatoire

Avant de migrer, analyser :

```text
tables existantes
colonnes existantes
relations
données nulles
données incohérentes
transactions orphelines
factures sans paiement
paiements sans facture
transactions sans organizationId
transactions sans currencyId
transactions sans compte débit/crédit
produits sans catégorie
factures sans fournisseur/client
utilisateurs sans rôle
permissions non utilisées
```

Produire un rapport :

```text
Table | Problème détecté | Nombre de lignes | Risque | Correction proposée
```

---

# 6. Sauvegarde avant migration

Créer une procédure obligatoire :

```text
backup database
backup uploads
backup .env
backup docker compose
backup nginx config
export schema
export migrations actuelles
```

Documenter :

```text
date
environnement
responsable
nom du fichier backup
emplacement
checksum si possible
```

---

# 7. Migration transactionnelle

## 7.1 Situation actuelle probable

Le système utilise actuellement :

```text
transactions
- debitId
- creditId
- amount
- type
- relatedId
- currencyId
- organizationId
- status
```

Ce modèle doit rester lisible.

Mais il faut créer progressivement :

```text
business_transactions
journal_entries
journal_entry_lines
```

---

## 7.2 Stratégie de migration

Pour chaque ancienne transaction :

Créer une business transaction :

```text
business_transaction.amount = transaction.amount
business_transaction.currencyId = transaction.currencyId
business_transaction.organizationId = transaction.organizationId
business_transaction.relatedEntityId = transaction.relatedId
business_transaction.transactionTypeId = transaction.type si possible
business_transaction.status = POSTED si ancienne transaction validée
```

Créer un journal entry :

```text
journal_entry.businessTransactionId = business_transaction.id
journal_entry.status = POSTED
journal_entry.date = transaction.date
journal_entry.description = transaction.particulars
```

Créer deux lignes :

```text
ligne 1 :
accountId = transaction.debitId
debitAmount = transaction.amount
creditAmount = 0

ligne 2 :
accountId = transaction.creditId
debitAmount = 0
creditAmount = transaction.amount
```

---

## 7.3 Cas particuliers

Gérer :

```text
transaction sans debitId
transaction sans creditId
transaction montant <= 0
transaction sans currencyId
transaction sans organizationId
transaction type inconnu
debitId = creditId
compte supprimé
compte inactif
```

Pour chaque cas :

```text
ne pas migrer automatiquement
marquer comme erreur migration
produire rapport de correction
```

---

# 8. Migration des transaction types

## 8.1 Ancien modèle

```text
transaction_types
- name
- debitAccountId
- creditAccountId
- description
- isActive
```

## 8.2 Nouveau modèle

Ajouter :

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

## 8.3 Migration rules

Pour chaque ancien transaction type :

```text
Créer code à partir du nom
Garder debitAccountId/creditAccountId
Créer transaction_type_rules correspondantes
Créer une règle débit
Créer une règle crédit
```

Exemple :

```text
Ancien type : Paiement fournisseur

Nouvelle règle :
Débit  : supplier payable account
Crédit : cash/bank account
Montant : amount
```

---

# 9. Migration multi-organisation

Si certaines tables n’ont pas organizationId :

1. Identifier l’organisation par défaut.
2. Ajouter organizationId nullable.
3. Remplir avec organisation par défaut.
4. Vérifier.
5. Rendre organizationId obligatoire plus tard.
6. Ajouter index.
7. Ajouter filtre dans services.

Tables à vérifier :

```text
transactions
invoices
payments
customers
suppliers
products
stocks
employees
properties
documents
audit_logs
workflows
budgets
```

---

# 10. Migration stock

Si le système contient seulement produits et quantités simples, migrer vers :

```text
warehouses
stock_movements
stock_items
stock_lots
```

Stratégie :

```text
Créer entrepôt par défaut
Pour chaque produit avec quantité :
créer stock_item
créer mouvement INITIAL_BALANCE
```

Garder l’ancien stock comme référence jusqu’à validation.

---

# 11. Migration documents

Si des documents existent déjà :

Migrer vers :

```text
documents
document_versions
document_links
```

Stratégie :

```text
Créer document principal
Créer version 1
Créer lien vers entité source
Conserver ancien chemin fichier
Vérifier fichier existe
```

Gérer :

```text
fichier introuvable
mime type inconnu
taille inconnue
entité source absente
```

---

# 12. Migration permissions

Si permissions actuelles sont simples, migrer vers permissions fines.

Stratégie :

```text
garder anciens rôles
ajouter nouvelles permissions
mapper anciens rôles vers nouvelles permissions
ne pas retirer permissions existantes au début
```

Exemples :

```text
admin → toutes permissions
accountant → finance + transaction + report
manager → approval + dashboard + reports
viewer → read-only
```

---

# 13. Compatibilité API

Ne pas casser les endpoints existants.

Créer une stratégie :

## Phase 1

Anciens endpoints continuent de fonctionner.

```text
POST /transactions
GET /transactions
```

Mais en interne, ils peuvent appeler le nouveau AccountingEngineService.

## Phase 2

Ajouter nouveaux endpoints :

```text
POST /accounting/business-transactions
GET /accounting/journal-entries
POST /accounting/journal-entries/:id/post
```

## Phase 3

Marquer anciens endpoints comme deprecated.

## Phase 4

Migrer frontend vers nouveaux endpoints.

## Phase 5

Retirer anciens endpoints seulement dans une version majeure future.

---

# 14. Compatibilité frontend

Le frontend actuel doit continuer de fonctionner.

Stratégie :

```text
ajouter nouveaux écrans sans supprimer anciens
mettre warning sur anciens écrans si nécessaire
rediriger progressivement
garder anciens formulaires en compatibilité
ajouter preview comptable sur nouveaux écrans
```

---

# 15. Migration progressive par module

## Finance

```text
transactions anciennes → business transactions + journal entries
transaction types → transaction type rules
rapports anciens → rapports nouveaux
```

## Achat

```text
purchase invoice existantes → business transactions liées
paiements fournisseurs → journal entries
```

## Vente

```text
sale invoices existantes → business transactions liées
paiements clients → journal entries
```

## RH

```text
salaires existants → business transactions salaire
```

## Immobilier

```text
loyers existants → business transactions loyer
```

## Stock

```text
quantité produits → stock initial
```

---

# 16. Tests de migration

Créer tests :

```text
migration transactions simples
migration transaction sans compte
migration transaction sans devise
migration transaction équilibrée
migration transaction type
migration organizationId
migration stock initial
migration documents
migration permissions
```

Critères :

```text
nombre lignes avant = nombre attendu après
aucune transaction valide perdue
transactions invalides dans rapport erreurs
débit total = crédit total après migration
anciens endpoints fonctionnent encore
nouveaux endpoints fonctionnent
```

---

# 17. Validation post-migration

Après migration, vérifier :

```text
nombre utilisateurs
nombre clients
nombre fournisseurs
nombre produits
nombre factures
nombre paiements
nombre transactions
nombre business_transactions
nombre journal_entries
nombre journal_entry_lines
total debit
total credit
écarts
documents accessibles
permissions fonctionnent
rapports cohérents
```

Produire un rapport :

```text
Migration réussie : oui/non
Erreurs :
Warnings :
Corrections manuelles :
Recommandations :
```

---

# 18. Rollback

Prévoir rollback.

Plan :

```text
arrêter application
restaurer backup database
restaurer uploads
restaurer config
redémarrer application
valider login
valider transactions
valider factures
```

Si migration partielle :

```text
désactiver nouveaux endpoints
revenir anciens services
conserver logs migration
```

---

# 19. Versionnement migration

Chaque migration doit avoir :

```text
id
nom
description
date
auteur
environnement
statut
logs
rollback possible oui/non
```

Créer table optionnelle :

```text
migration_runs
- id
- migrationName
- status
- startedAt
- completedAt
- errors
- executedBy
```

---

# 20. Scripts attendus

Créer scripts :

```text
backup-before-migration
validate-current-data
migrate-transactions
migrate-transaction-types
migrate-stock-initial
migrate-documents
migrate-permissions
validate-after-migration
rollback-migration
```

---

# 21. Tickets techniques attendus

Créer des tickets pour :

```text
1. Auditer données existantes avant migration
2. Créer script backup avant migration
3. Créer business_transactions
4. Créer journal_entries
5. Créer journal_entry_lines
6. Créer script migration anciennes transactions
7. Créer rapport erreurs migration transactions
8. Migrer transaction_types vers transaction_type_rules
9. Ajouter organizationId aux tables critiques
10. Créer script validation organizationId
11. Créer entrepôt par défaut
12. Migrer quantités produits vers stock initial
13. Migrer documents existants
14. Mapper anciennes permissions vers nouvelles
15. Créer compatibilité anciens endpoints transactions
16. Ajouter nouveaux endpoints accounting
17. Ajouter tests migration
18. Ajouter validation post-migration
19. Créer procédure rollback
20. Documenter migration
```

---

# 22. Format des tickets

Chaque ticket doit contenir :

```text
Titre :
Priorité :
Module :
Contexte :
Objectif :
Tables concernées :
Scripts concernés :
Travail à faire :
Critères d’acceptation :
Tests :
Risques :
Rollback :
Dépendances :
```

---

# 23. Risques de migration

Identifier et mitiger :

## Risque 1 — Perte de données

Mitigation :

```text
backup
test staging
migration dry-run
rapport validation
```

## Risque 2 — Transactions déséquilibrées

Mitigation :

```text
validation debit=credit
rapport erreurs
correction manuelle
```

## Risque 3 — Endpoints cassés

Mitigation :

```text
compatibilité API
tests non-régression
versioning
```

## Risque 4 — Mauvaise organisationId

Mitigation :

```text
organisation par défaut
validation
tests isolation
```

## Risque 5 — Fichiers documents perdus

Mitigation :

```text
vérifier chemin fichier
backup uploads
rapport fichiers manquants
```

---

# 24. Livrables attendus

L’agent doit produire :

1. Plan de migration complet.
2. Rapport d’analyse pré-migration.
3. Mapping ancien modèle → nouveau modèle.
4. Scripts à créer.
5. Tests à faire.
6. Plan de rollback.
7. Plan de compatibilité API.
8. Plan de migration frontend.
9. Tickets techniques.
10. Checklist migration.

---

# 25. Format final attendu

La réponse doit être structurée comme ceci :

```text
1. Résumé exécutif
2. Risques principaux
3. Analyse pré-migration
4. Stratégie de migration progressive
5. Migration transactionnelle
6. Migration transaction types
7. Migration organizationId
8. Migration stock
9. Migration documents
10. Migration permissions
11. Compatibilité API
12. Compatibilité frontend
13. Scripts nécessaires
14. Tests migration
15. Validation post-migration
16. Rollback
17. Tickets techniques
18. Checklist finale
```

---

# 26. Conclusion

L’objectif est de faire évoluer le projet sans casser l’existant.

La règle principale :

```text
Ajouter d’abord, migrer ensuite, supprimer beaucoup plus tard.
```

Un ERP/SIFA qui contient déjà des données doit être traité avec prudence.

La migration doit être :

```text
préparée
testée
sauvegardée
validée
réversible
documentée
```

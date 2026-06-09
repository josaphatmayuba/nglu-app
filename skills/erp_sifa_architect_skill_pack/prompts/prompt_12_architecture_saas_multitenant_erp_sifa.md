# PROMPT 12 — ARCHITECTURE SAAS, MULTI-TENANT ET MULTI-ORGANISATION ERP/SIFA

## Objectif de ce prompt

Ce prompt sert à concevoir une architecture SaaS et multi-organisation robuste pour le projet ERP/SIFA.

L’objectif est de permettre au système de gérer plusieurs clients ou organisations sans mélanger les données.

Le système doit pouvoir fonctionner pour :

- une seule organisation
- plusieurs organisations
- plusieurs sites
- plusieurs départements
- plusieurs projets
- plusieurs clients SaaS
- plusieurs abonnements
- plusieurs environnements de déploiement

Le but est de préparer l’ERP/SIFA à devenir une plateforme commerciale utilisable par plusieurs clients.

---

# 1. Contexte

Le projet ERP/SIFA existe déjà.

Il contient déjà plusieurs modules :

- Authentification
- Utilisateurs
- Rôles
- Permissions
- Audit
- Finance
- Transactions
- Approvisionnement
- Stock
- Ventes
- RH
- Immobilier
- Construction
- Agriculture
- Élevage
- Projets ONG
- Logistique
- Documents
- Workflow
- Budget
- Rapports

Tous les modules utilisent déjà le même backend et la même base de données.

L’objectif est maintenant de vérifier et renforcer l’architecture pour supporter plusieurs organisations et éventuellement plusieurs clients SaaS.

---

# 2. Mission principale

Analyser et concevoir une architecture multi-tenant / multi-organisation pour ERP/SIFA.

L’agent doit produire :

1. Analyse de l’architecture actuelle.
2. Choix du modèle multi-tenant.
3. Structure organisationnelle cible.
4. Règles d’isolation des données.
5. Gestion des utilisateurs multi-organisations.
6. Gestion des rôles et permissions par organisation.
7. Gestion des sites, départements, projets et activités.
8. Gestion des abonnements.
9. Gestion des plans SaaS.
10. Gestion des limites par client.
11. Sécurité multi-tenant.
12. Audit multi-tenant.
13. Migration progressive.
14. Tickets techniques.
15. Critères d’acceptation.

---

# 3. Règle absolue

Ne jamais permettre qu’un utilisateur d’une organisation puisse voir ou modifier les données d’une autre organisation sans autorisation explicite.

La séparation des données est une règle critique.

Toutes les requêtes sensibles doivent être filtrées par :

```text
organizationId
tenantId si applicable
siteId si applicable
projectId si applicable
```

---

# 4. Concepts à clarifier

Définir clairement ces concepts :

## Tenant

Un tenant représente un client SaaS ou une entité principale qui utilise la plateforme.

Exemples :

```text
ONGD NGOLU
Entreprise ABC
Municipalité X
Coopérative Y
```

## Organisation

Une organisation représente une structure opérationnelle dans un tenant.

Selon le modèle choisi, tenant et organization peuvent être identiques ou séparés.

## Site

Un site représente un emplacement physique ou opérationnel.

Exemples :

```text
Kinshasa
Kasangulu
Kiselele
Entrepôt Central
Chantier A
Ferme B
```

## Département

Un département représente une unité interne.

Exemples :

```text
Finance
RH
Approvisionnement
Agriculture
Élevage
Logistique
```

## Projet

Un projet représente une activité structurée avec budget et rapports.

Exemples :

```text
Projet Agriculture Durable
Projet Élevage Communautaire
Projet Construction Dépôt
```

## Activité

Une activité représente une action dans un projet.

Exemples :

```text
Achat semences
Formation agriculteurs
Vaccination troupeau
Construction fondation
```

---

# 5. Modèles multi-tenant possibles

Analyser les trois options.

## Option A — Base de données partagée avec tenantId/organizationId

Toutes les organisations utilisent la même base de données.

Chaque table critique contient :

```text
tenantId
organizationId
```

Avantages :

```text
simple à gérer
moins coûteux
déploiement rapide
facile pour SaaS
```

Inconvénients :

```text
risque si filtrage oublié
sécurité dépend du code
données mélangées dans la même base
```

## Option B — Base de données séparée par tenant

Chaque client a sa propre base de données.

Avantages :

```text
meilleure isolation
plus rassurant pour clients institutionnels
backup par client plus facile
migration par client possible
```

Inconvénients :

```text
plus complexe
coût plus élevé
maintenance plus lourde
CI/CD plus complexe
```

## Option C — Modèle hybride

Petits clients en base partagée, gros clients en base dédiée.

Avantages :

```text
flexible
adapté SaaS et gouvernement
bon compromis commercial
```

Inconvénients :

```text
architecture plus complexe
nécessite stratégie claire
```

L’agent doit recommander le meilleur modèle pour ce projet ERP/SIFA.

---

# 6. Recommandation attendue

Proposer une approche progressive.

Recommandation probable :

```text
Phase 1 : organizationId obligatoire partout dans une base partagée
Phase 2 : tenantId ajouté pour préparer SaaS
Phase 3 : support base dédiée pour gros clients
Phase 4 : modèle hybride
```

Ne pas commencer avec une complexité excessive si le produit n’a pas encore plusieurs clients.

---

# 7. Tables structurelles à prévoir

Créer ou vérifier :

```text
tenants
organizations
sites
departments
projects
activities
organization_users
user_organizations
subscriptions
subscription_plans
tenant_settings
organization_settings
```

---

## 7.1 tenants

```text
id
name
slug
status
planId
primaryDomain
createdAt
updatedAt
```

Statuts :

```text
ACTIVE
SUSPENDED
TRIAL
CANCELLED
```

---

## 7.2 organizations

```text
id
tenantId
name
legalName
type
country
currencyId
status
createdAt
updatedAt
```

Types :

```text
ONG
PME
COOPERATIVE
GOVERNMENT
MUNICIPALITY
COMPANY
FARM
PROPERTY_COMPANY
CONSTRUCTION_COMPANY
```

---

## 7.3 sites

```text
id
organizationId
name
code
type
address
city
country
status
createdAt
updatedAt
```

Types :

```text
HEADQUARTER
FARM
WAREHOUSE
CONSTRUCTION_SITE
OFFICE
BRANCH
PROJECT_SITE
```

---

## 7.4 departments

```text
id
organizationId
name
code
parentDepartmentId
managerId
status
createdAt
updatedAt
```

---

## 7.5 projects

```text
id
organizationId
siteId
departmentId
name
code
type
startDate
endDate
budgetId
status
createdAt
updatedAt
```

---

## 7.6 activities

```text
id
projectId
name
code
description
startDate
endDate
status
createdAt
updatedAt
```

---

## 7.7 user_organizations

```text
id
userId
organizationId
roleId
isDefault
status
createdAt
updatedAt
```

---

## 7.8 subscription_plans

```text
id
name
code
maxUsers
maxOrganizations
maxSites
maxProjects
modulesEnabled
storageLimit
priceMonthly
priceYearly
status
```

---

## 7.9 subscriptions

```text
id
tenantId
planId
status
startDate
endDate
trialEndsAt
billingCycle
createdAt
updatedAt
```

---

# 8. Champs obligatoires sur les tables métier

Identifier toutes les tables métier et vérifier si elles contiennent :

```text
tenantId si SaaS
organizationId
siteId si applicable
departmentId si applicable
projectId si applicable
activityId si applicable
createdBy
updatedBy
createdAt
updatedAt
deletedAt si soft delete
```

Tables critiques :

```text
transactions
business_transactions
journal_entries
journal_entry_lines
purchase_invoices
sale_invoices
payments
customers
suppliers
products
stock_movements
warehouses
documents
employees
properties
construction_sites
animals
fields
budgets
workflows
audit_logs
reports
```

---

# 9. Isolation des données

Définir des règles strictes.

## Règle 1

Toutes les requêtes doivent être filtrées par organisation active.

## Règle 2

Un utilisateur ne peut accéder qu’aux organisations auxquelles il est lié.

## Règle 3

Les rôles peuvent varier selon l’organisation.

Exemple :

```text
Utilisateur A = Admin dans Organisation 1
Utilisateur A = Viewer dans Organisation 2
```

## Règle 4

Les exports doivent respecter les mêmes filtres.

## Règle 5

L’audit doit conserver organizationId et tenantId.

---

# 10. Middleware / Guard recommandé

Créer un guard ou middleware :

```text
TenantContextMiddleware
OrganizationContextGuard
```

Responsabilités :

```text
lire utilisateur connecté
identifier tenant actif
identifier organisation active
vérifier accès
injecter contexte dans request
bloquer accès non autorisé
```

Contexte disponible :

```text
request.context = {
  tenantId,
  organizationId,
  siteIds,
  departmentIds,
  projectIds,
  userId,
  roles,
  permissions
}
```

---

# 11. Service de contexte

Créer un service :

```text
ContextService
```

Responsabilités :

```text
getTenantId()
getOrganizationId()
getUserId()
getAllowedSites()
getAllowedProjects()
ensureOrganizationAccess()
ensureSiteAccess()
ensureProjectAccess()
```

---

# 12. Permissions multi-organisation

Les permissions doivent être liées à :

```text
userId
organizationId
roleId
permissionId
scope
```

Scopes possibles :

```text
GLOBAL
ORGANIZATION
SITE
DEPARTMENT
PROJECT
OWN
```

Exemples :

```text
transaction.read:ORGANIZATION
transaction.post:ORGANIZATION
stock.read:SITE
project.expense.create:PROJECT
salary.read:DEPARTMENT
```

---

# 13. Filtrage automatique des requêtes

Créer une stratégie pour éviter d’oublier organizationId.

Exemples :

```text
findAllByOrganization()
findOneByOrganization()
createWithOrganization()
updateWithinOrganization()
deleteWithinOrganization()
```

Interdire les requêtes globales sauf Super Admin.

---

# 14. Super Admin vs Admin Organisation

Définir clairement :

## Super Admin

```text
gère la plateforme
voit tenants si autorisé
gère plans SaaS
gère support global
ne doit pas modifier données client sans traçabilité
```

## Admin Organisation

```text
gère les utilisateurs de son organisation
gère les rôles internes
gère les paramètres
ne voit pas les autres organisations
```

---

# 15. Gestion des plans SaaS

Créer des plans :

## Starter

```text
maxUsers: 5
modules: finance, ventes, achats de base
storage: limité
```

## Business

```text
maxUsers: 25
modules: finance, stock, RH, documents, workflow simple
```

## Enterprise

```text
maxUsers: 100+
modules: tous modules
multi-site
workflow avancé
audit avancé
```

## Government / Dedicated

```text
déploiement dédié
utilisateurs illimités selon contrat
sécurité renforcée
support prioritaire
```

---

# 16. Feature flags par plan

Prévoir :

```text
modulesEnabled
featuresEnabled
limits
```

Exemples :

```text
finance.enabled
stock.enabled
hr.enabled
property.enabled
agriculture.enabled
livestock.enabled
workflow.advanced
reports.advanced
api.access
```

---

# 17. Limites par abonnement

Vérifier les limites :

```text
nombre utilisateurs
nombre sites
nombre projets
stockage documents
nombre transactions par mois
nombre rapports avancés
API access
```

Le système doit bloquer ou alerter si limite atteinte.

---

# 18. Facturation SaaS future

Prévoir une structure, même si pas implémentée immédiatement :

```text
invoices_saas
subscription_payments
billing_events
usage_records
```

Ne pas prioriser avant MVP, mais prévoir l’architecture.

---

# 19. Audit multi-tenant

Audit logs doivent inclure :

```text
tenantId
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
createdAt
```

L’audit doit permettre de répondre :

```text
Qui a fait quoi ?
Dans quelle organisation ?
Dans quel tenant ?
Depuis quelle IP ?
Quand ?
```

---

# 20. Sauvegarde par tenant / organisation

Prévoir :

```text
backup global
backup par tenant si base dédiée
export organisation
restauration organisation
archivage client
```

Pour les clients gouvernementaux :

```text
base dédiée recommandée
backup dédié
restauration dédiée
audit dédié
```

---

# 21. Migration progressive

Ne pas casser l’existant.

Plan recommandé :

## Phase 1

Auditer les tables sans organizationId.

## Phase 2

Ajouter organizationId aux tables critiques.

## Phase 3

Remplir organizationId pour les données existantes.

## Phase 4

Ajouter guards et filtres automatiques.

## Phase 5

Tester séparation des données.

## Phase 6

Ajouter tenantId si nécessaire.

## Phase 7

Préparer base dédiée pour clients enterprise.

---

# 22. Tests obligatoires multi-tenant

Créer des tests :

```text
utilisateur org A ne voit pas données org B
utilisateur org A ne modifie pas données org B
export org A ne contient pas org B
dashboard org A ne calcule pas org B
audit contient organizationId
permissions par site fonctionnent
permissions par projet fonctionnent
admin organisation ne voit pas tenants
super admin audité
```

---

# 23. Risques

Identifier et mitiger :

## Risque 1 — Fuite de données entre organisations

Mitigation :

```text
guards obligatoires
tests automatisés
filtrage centralisé
revue code
```

## Risque 2 — Permissions incohérentes

Mitigation :

```text
modèle scope clair
tests permissions
interface admin claire
```

## Risque 3 — Requêtes sans organizationId

Mitigation :

```text
repository helper
lint rule ou checklist
tests sécurité
```

## Risque 4 — Trop de complexité trop tôt

Mitigation :

```text
commencer organizationId
ajouter tenantId plus tard
base dédiée seulement pour gros clients
```

---

# 24. Tickets techniques attendus

Créer des tickets pour :

```text
1. Auditer toutes les tables sans organizationId
2. Créer ou renforcer table organizations
3. Créer table sites
4. Créer table departments
5. Créer table projects
6. Créer table activities
7. Créer user_organizations
8. Ajouter organizationId aux tables critiques
9. Créer OrganizationContextGuard
10. Créer ContextService
11. Filtrer transactions par organizationId
12. Filtrer factures par organizationId
13. Filtrer stock par organizationId/siteId
14. Filtrer documents par organizationId
15. Filtrer rapports par organizationId
16. Ajouter audit tenant/organization
17. Tester isolation données
18. Créer subscription_plans
19. Créer subscriptions
20. Créer feature flags par plan
```

---

# 25. Format des tickets

Chaque ticket doit contenir :

```text
Titre :
Priorité :
Module :
Contexte :
Objectif :
Tables concernées :
Services concernés :
Endpoints concernés :
Travail à faire :
Critères d’acceptation :
Tests :
Risques :
Dépendances :
```

---

# 26. Livrables attendus

L’agent doit produire :

1. Analyse du modèle multi-tenant recommandé.
2. Architecture cible.
3. Tables à créer.
4. Tables à modifier.
5. Règles d’isolation.
6. Stratégie permissions par scope.
7. Stratégie SaaS plans/abonnements.
8. Plan de migration.
9. Tests de sécurité multi-tenant.
10. Tickets techniques.

---

# 27. Format final attendu

La réponse finale doit être structurée ainsi :

```text
1. Résumé exécutif
2. Modèle multi-tenant recommandé
3. Architecture tenant / organisation / site / projet
4. Tables à créer
5. Tables à modifier
6. Règles d’isolation des données
7. Permissions et scopes
8. Plans SaaS et limites
9. Audit multi-tenant
10. Migration progressive
11. Tests obligatoires
12. Risques et mitigations
13. Tickets techniques
14. Conclusion
```

---

# 28. Conclusion

Le but final est de préparer l’ERP/SIFA à devenir une plateforme SaaS ou semi-SaaS.

Le système doit pouvoir gérer plusieurs clients sans confusion.

La règle principale :

```text
Aucune donnée d’une organisation ne doit être visible par une autre organisation sans autorisation explicite.
```

Cette architecture est essentielle pour vendre à plusieurs clients, ONG, PME, municipalités ou institutions.

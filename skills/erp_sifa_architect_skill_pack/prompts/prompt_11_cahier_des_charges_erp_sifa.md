# PROMPT 11 — CAHIER DES CHARGES FONCTIONNEL ET TECHNIQUE ERP/SIFA ENTERPRISE

## Objectif de ce prompt

Ce prompt sert à produire un **cahier des charges complet** pour le projet ERP/SIFA.

Le cahier des charges doit être suffisamment clair pour être utilisé par :

- développeurs
- architectes logiciels
- chefs de projet
- clients
- partenaires
- investisseurs
- ONG
- PME
- institutions publiques
- équipes de formation
- équipes support

Le but est de transformer les idées, prompts, audits et roadmaps en un document professionnel qui décrit précisément :

```text
ce que le système doit faire
pour qui
comment
avec quelles règles métier
avec quels modules
avec quelles priorités
avec quelles exigences techniques
avec quels critères d’acceptation
```

---

# 1. Contexte du projet

Le projet ERP/SIFA existe déjà.

Il contient déjà plusieurs modules fonctionnels ou partiels :

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

Le système doit devenir un vrai :

```text
ERP/SIFA Enterprise
```

SIFA signifie :

```text
Système Intégré de Finance et d’Approvisionnement
```

Mais le produit doit dépasser la finance et l’approvisionnement pour devenir une plateforme complète de gestion d’organisation.

---

# 2. Vision du produit

La vision du produit est :

```text
Une seule plateforme intégrée pour gérer les finances, l’approvisionnement, les stocks, les RH, les projets, l’immobilier, la construction, l’agriculture, l’élevage, la logistique, les documents, les workflows et les rapports.
```

Objectif central :

```text
Une seule action métier doit mettre à jour automatiquement tous les modules concernés.
```

Exemples :

```text
Achat fournisseur
→ workflow
→ stock
→ finance
→ budget
→ document
→ rapport

Paiement salaire
→ RH
→ finance
→ trésorerie
→ rapport

Paiement loyer
→ immobilier
→ finance
→ reçu
→ rapport

Traitement animal
→ élevage
→ stock médicament
→ coût élevage
→ rapport sanitaire

Dépense projet ONG
→ projet
→ budget
→ finance
→ document
→ rapport bailleur
```

---

# 3. Objectifs généraux

Le système doit permettre de :

1. Centraliser les données de l’organisation.
2. Éviter la double saisie.
3. Relier les opérations métier à la finance.
4. Automatiser les transactions comptables.
5. Contrôler les dépenses.
6. Suivre les budgets.
7. Gérer les stocks.
8. Gérer les approbations.
9. Archiver les documents.
10. Produire des rapports fiables.
11. Tracer toutes les actions.
12. Sécuriser les données.
13. Gérer plusieurs organisations, sites et projets.
14. Préparer une future intelligence décisionnelle.

---

# 4. Public cible

Le cahier des charges doit couvrir les besoins de :

```text
PME
ONG
coopératives agricoles
sociétés immobilières
entreprises de construction
fermes
institutions publiques
municipalités
provinces
ministères
gouvernements
```

---

# 5. Utilisateurs et rôles

Décrire les rôles principaux :

```text
Super Admin
Administrateur organisation
Directeur général
Directeur financier
Comptable
Auditeur
Responsable approvisionnement
Magasinier
Responsable RH
Gestionnaire immobilier
Chef chantier
Agronome
Vétérinaire
Superviseur élevage
Responsable projet ONG
Responsable logistique
Agent terrain
Caissier
Utilisateur simple
Lecture seule
```

Pour chaque rôle, préciser :

```text
objectifs
permissions principales
modules accessibles
limitations
actions sensibles
```

---

# 6. Périmètre fonctionnel global

Le système doit couvrir les modules suivants :

```text
Administration
Authentification
Utilisateurs
Rôles et permissions
Finance
Transactions
Approvisionnement
Stock
Ventes
RH et paie
Immobilier
Construction
Agriculture
Élevage
Projets ONG
Logistique
Documents
Workflow
Budget
Audit
Rapports
Dashboard
Paramètres
Notifications
```

---

# 7. Module Administration

Fonctions attendues :

```text
Créer organisation
Créer site
Créer département
Créer projet
Créer activité
Créer utilisateur
Créer rôle
Attribuer permissions
Configurer devise
Configurer langue
Configurer paramètres généraux
Configurer numérotation
Configurer workflow
Configurer transaction types
```

Règles métier :

```text
Un utilisateur appartient à une organisation.
Un utilisateur peut avoir plusieurs rôles selon configuration.
Les données doivent être filtrées par organisation.
Les actions sensibles doivent être auditées.
```

---

# 8. Module Authentification et sécurité

Fonctions attendues :

```text
Connexion
Déconnexion
JWT
Refresh token
MFA
Réinitialisation mot de passe
Blocage après tentatives échouées
Historique connexions
Gestion sessions
```

Exigences :

```text
mot de passe hashé
MFA disponible
permissions backend obligatoires
audit des connexions
rate limiting
CORS strict
validation des entrées
```

---

# 9. Module Finance

Fonctions attendues :

```text
Plan comptable
Comptes
Sous-comptes
Transactions
Journal comptable
Grand livre
Balance générale
Caisse
Banque
Paiements
Comptes clients
Comptes fournisseurs
Périodes comptables
Contre-passation
Rapports financiers
```

Exigences principales :

```text
Chaque écriture comptable doit être équilibrée.
Total débit = total crédit.
Une transaction publiée ne doit pas être supprimée.
Une transaction publiée doit être annulée par contre-passation.
Les périodes fermées doivent bloquer les écritures.
```

---

# 10. Moteur transactionnel

Le système doit évoluer vers un moteur transactionnel central.

Structures recommandées :

```text
business_transactions
journal_entries
journal_entry_lines
transaction_type_rules
```

Fonctions attendues :

```text
Créer opération métier
Prévisualiser écriture comptable
Générer journal entry
Générer lignes débit/crédit
Publier écriture
Annuler par contre-passation
Lier écriture à facture/paiement/salaire/loyer/stock/projet
```

Règles métier :

```text
L’utilisateur simple choisit une action métier.
Le système génère débit/crédit automatiquement.
Les comptables peuvent voir la prévisualisation comptable.
Le système bloque toute écriture déséquilibrée.
```

---

# 11. Module Transaction Types

Fonctions attendues :

```text
Créer type de transaction
Définir compte débit par défaut
Définir compte crédit par défaut
Définir module concerné
Définir règles comptables
Définir si workflow requis
Définir si budget impacté
Définir si stock impacté
Activer/désactiver type
```

Exemples :

```text
PURCHASE_INVOICE
SUPPLIER_PAYMENT
SALE_INVOICE
CUSTOMER_PAYMENT
SALARY_PAYMENT
RENT_PAYMENT_RECEIVED
STOCK_ADJUSTMENT
FUEL_EXPENSE
PROJECT_EXPENSE
LIVESTOCK_MEDICINE_USAGE
CONSTRUCTION_MATERIAL_PURCHASE
```

---

# 12. Module Approvisionnement

Fonctions attendues :

```text
Demande d’achat
Lignes de demande d’achat
Approbation
Demande de prix
Comparaison fournisseurs
Bon de commande
Réception
Facture fournisseur
Paiement fournisseur
Contrats fournisseurs
Documents fournisseurs
```

Processus cible :

```text
Demande d’achat
→ workflow
→ demande de prix
→ comparaison
→ bon de commande
→ réception
→ facture
→ paiement
→ comptabilisation
```

---

# 13. Module Stock

Fonctions attendues :

```text
Produits
Catégories
Entrepôts
Entrées stock
Sorties stock
Transferts
Ajustements
Inventaires physiques
Lots
Dates expiration
Numéros de série
Stock minimum
Alertes
Valorisation
```

Règles métier :

```text
Une réception augmente le stock.
Une sortie diminue le stock.
Le stock négatif doit être bloqué sauf autorisation.
Les médicaments et semences doivent gérer expiration.
Les mouvements de stock doivent être auditables.
```

---

# 14. Module Ventes

Fonctions attendues :

```text
Clients
Devis
Factures de vente
Paiements clients
Livraisons
Retours
Créances clients
Reçus
Rapports vente
```

Intégration :

```text
Facture vente
→ créance client
→ revenu
→ stock si produit
→ rapport
```

---

# 15. Module RH et Paie

Fonctions attendues :

```text
Employés
Contrats
Départements
Postes
Présences
Congés
Horaires
Salaires
Paie
Primes
Déductions
Documents employés
Rapports RH
```

Intégration :

```text
Salaire approuvé
→ transaction salaire
→ écriture comptable
→ trésorerie
→ rapport masse salariale
```

---

# 16. Module Immobilier

Fonctions attendues :

```text
Propriétés
Bâtiments
Unités locatives
Locataires
Contrats de location
Loyers
Paiements loyers
Reçus
Maintenance
Dépôts de garantie
Documents
Rapports immobilier
```

Intégration :

```text
Paiement loyer
→ revenu immobilier
→ caisse/banque
→ reçu
→ rapport
```

---

# 17. Module Construction

Fonctions attendues :

```text
Chantiers
Budget chantier
Matériaux
Main-d’œuvre
Sous-traitants
Dépenses chantier
Stock matériaux
Avancement
Documents chantier
Rapports chantier
```

Intégration :

```text
Achat matériaux
→ stock
→ utilisation chantier
→ coût chantier
→ finance
```

---

# 18. Module Agriculture

Fonctions attendues :

```text
Champs
Cultures
Saisons
Semis
Intrants
Récoltes
Rendements
Coûts par champ
Coûts par culture
Stock agricole
Ventes agricoles
Rapports agricoles
```

Intégration :

```text
Achat semences
→ stock intrants
→ utilisation champ
→ coût agricole
→ récolte
→ stock produit
→ vente
→ finance
```

---

# 19. Module Élevage

Fonctions attendues :

```text
Espèces
Animaux
Lots
Identification
Naissances
Achats
Ventes
Reproduction
Gestation
Mise bas
Vaccinations
Traitements
Médicaments
Mortalité
Alimentation
Poids
Production
Rapports sanitaires
```

Espèces à prévoir :

```text
Bovins
Porcs
Chèvres
Moutons
Volailles
```

Intégration :

```text
Traitement animal
→ stock médicament
→ coût élevage
→ rapport sanitaire
```

---

# 20. Module Projets ONG

Fonctions attendues :

```text
Projets
Bailleurs
Activités
Indicateurs
Budget projet
Dépenses projet
Documents bailleurs
Rapports narratifs
Rapports financiers
Taux d’exécution
```

Intégration :

```text
Dépense projet
→ workflow
→ budget
→ finance
→ rapport bailleur
```

---

# 21. Module Logistique

Fonctions attendues :

```text
Véhicules
Chauffeurs
Missions
Carburant
Entretien
Réparations
Kilométrage
Documents véhicules
Rapports logistique
```

Intégration :

```text
Achat carburant
→ dépense logistique
→ budget
→ finance
→ rapport véhicule
```

---

# 22. Module Documents

Fonctions attendues :

```text
Upload document
Classement
Catégories
Versionnage
Association à entité
Prévisualisation
Téléchargement
Validation
Signature future
Archivage
Audit téléchargement
```

Entités supportées :

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
animal
champ
véhicule
chantier
```

---

# 23. Module Workflow

Fonctions attendues :

```text
Créer workflow
Créer étapes
Définir approbateurs
Définir règles par montant
Définir règles par module
Soumettre demande
Approuver
Rejeter
Retourner pour correction
Historique
Notifications
Audit
```

Règles :

```text
Une transaction nécessitant approbation ne peut pas être publiée avant validation.
Tout rejet doit avoir un motif.
Toute approbation doit être auditée.
```

---

# 24. Module Budget

Fonctions attendues :

```text
Créer budget
Créer lignes budgétaires
Allouer budget
Réviser budget
Suivre budget engagé
Suivre budget dépensé
Calculer solde
Alerter dépassement
Bloquer dépassement si configuré
Rapport budget vs réel
```

---

# 25. Module Audit

Fonctions attendues :

```text
Tracer création
Tracer modification
Tracer suppression
Tracer approbation
Tracer rejet
Tracer publication comptable
Tracer annulation
Tracer connexion
Tracer échec connexion
Tracer export
Tracer changement rôle
Tracer changement permission
```

Champs audit :

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

---

# 26. Module Rapports

Rapports attendus :

```text
Dashboard global
Grand livre
Journal général
Balance générale
Bilan
Compte de résultat
Flux de trésorerie
Dettes fournisseurs
Créances clients
Budget vs réel
Stock
Ventes
Achats
RH
Immobilier
Construction
Agriculture
Élevage
Projets ONG
Audit
```

Exports :

```text
PDF
Excel
CSV
```

---

# 27. Exigences UX

L’interface doit être :

```text
simple
moderne
responsive
mobile/tablette
adaptée par rôle
claire pour non-comptables
professionnelle
```

Principe :

```text
L’utilisateur simple voit des actions métier.
Le comptable voit les écritures.
L’auditeur voit l’historique.
La direction voit les rapports.
```

---

# 28. Exigences techniques

Le système doit prévoir :

```text
Backend modulaire
API sécurisée
Base de données relationnelle
Migrations versionnées
Validation DTO
Permissions backend
Audit global
Logs structurés
Tests automatisés
Docker
CI/CD
Sauvegardes
Monitoring
Documentation
```

---

# 29. Exigences de performance

Le système doit :

```text
paginer toutes les listes
indexer les colonnes filtrées
filtrer par organisation/site/projet
éviter les requêtes lourdes dashboard
gérer exports volumineux
optimiser rapports
```

---

# 30. Exigences de sécurité

Le système doit :

```text
protéger toutes les routes sensibles
séparer les données par organisation
appliquer permissions fines
auditer actions sensibles
chiffrer secrets
sécuriser uploads
bloquer accès non autorisé
protéger contre brute force
utiliser HTTPS
sauvegarder données
```

---

# 31. Exigences de déploiement

Prévoir :

```text
local
development
staging
production
Docker
Nginx
HTTPS
variables environnement
backup
restore
monitoring
logs
```

---

# 32. Critères d’acceptation globaux

Le système sera considéré mature quand :

```text
les transactions sont fiables
les écritures sont équilibrées
les workflows fonctionnent
les budgets sont suivis
les stocks sont corrects
les documents sont liés
les rapports sont exportables
les permissions sont respectées
l’audit est complet
les sauvegardes fonctionnent
l’interface est claire
les utilisateurs peuvent travailler sans double saisie
```

---

# 33. Priorités

## P0

```text
moteur transactionnel
finance
audit
permissions
sécurité
périodes comptables
contre-passation
```

## P1

```text
workflow
budget
stock
approvisionnement
documents
rapports
```

## P2

```text
frontend UX
modules spécialisés
multi-site
multi-projet
DevOps
tests
documentation
```

## P3

```text
IA
offline avancé
intégrations externes
haute disponibilité
```

---

# 34. Livrables attendus du cahier des charges

Le document final doit contenir :

```text
1. Présentation du projet
2. Objectifs
3. Public cible
4. Rôles utilisateurs
5. Périmètre fonctionnel
6. Modules détaillés
7. Règles métier
8. Exigences UX
9. Exigences techniques
10. Exigences sécurité
11. Exigences performance
12. Exigences déploiement
13. Priorités
14. Critères d’acceptation
15. Roadmap
16. Risques
17. Glossaire
```

---

# 35. Format final attendu

L’agent doit produire un cahier des charges structuré comme suit :

```text
# Cahier des charges ERP/SIFA Enterprise

## 1. Introduction
## 2. Contexte
## 3. Vision produit
## 4. Objectifs
## 5. Public cible
## 6. Rôles utilisateurs
## 7. Périmètre fonctionnel
## 8. Description détaillée des modules
## 9. Règles métier
## 10. Exigences UX
## 11. Exigences techniques
## 12. Exigences sécurité
## 13. Exigences performance
## 14. Exigences déploiement
## 15. Priorités
## 16. Critères d’acceptation
## 17. Roadmap
## 18. Risques
## 19. Glossaire
## 20. Conclusion
```

---

# 36. Conclusion

Ce cahier des charges doit permettre de transformer le projet ERP/SIFA en produit clairement défini.

Il doit servir de référence pour :

```text
développement
tests
vente
formation
support
audit
partenariat
présentation client
```

Un produit bien défini est plus facile à développer, à vendre et à maintenir.

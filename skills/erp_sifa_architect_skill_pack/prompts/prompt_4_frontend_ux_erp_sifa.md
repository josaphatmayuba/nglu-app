# PROMPT 4 — CONCEPTION FRONTEND / UX POUR ERP/SIFA ENTERPRISE MATURE

## Objectif de ce prompt

Ce prompt doit être utilisé après :

1. l’audit du backend existant,
2. le plan d’exécution technique backend,
3. la définition du moteur transactionnel, workflow, budget, stock, audit et documents.

L’objectif ici est de concevoir une interface frontend moderne, simple et professionnelle pour un ERP/SIFA mature.

Le frontend doit être adapté à :

- PME
- ONG
- coopératives agricoles
- sociétés immobilières
- entreprises de construction
- institutions publiques
- municipalités
- provinces
- ministères
- gouvernements

Le frontend ne doit pas simplement afficher des tables CRUD.

Il doit guider l’utilisateur selon son rôle et cacher la complexité technique.

---

# 1. Vision UX générale

Le système doit être perçu comme une plateforme simple, claire et professionnelle.

L’utilisateur ne doit pas avoir l’impression d’utiliser un logiciel compliqué.

L’objectif UX :

```text
Une action métier claire
→ une interface guidée
→ une validation
→ un workflow si nécessaire
→ une mise à jour automatique des modules concernés
```

Exemple :

```text
Créer une demande d’achat
→ sélectionner besoin
→ choisir projet/site/département
→ joindre document
→ envoyer pour approbation
→ suivre statut
```

L’utilisateur simple ne doit pas gérer manuellement :

```text
débit
crédit
journal entry
écriture comptable
compte technique
règle comptable
```

Ces éléments doivent être visibles seulement pour les rôles finance, comptable, auditeur ou administrateur.

---

# 2. Mission de l’agent

Analyser le frontend existant et proposer une refonte / amélioration UX progressive.

Tu dois produire :

1. Cartographie des écrans existants.
2. Évaluation UX actuelle.
3. Écrans manquants.
4. Navigation cible.
5. Design system cible.
6. Composants réutilisables.
7. Parcours utilisateur par rôle.
8. Interfaces pour transactions modernes.
9. Interfaces pour workflow.
10. Interfaces pour budget.
11. Interfaces pour stock.
12. Interfaces pour documents.
13. Interfaces pour reporting.
14. Interfaces mobile/tablette.
15. Tickets frontend à exécuter.

Ne pas proposer de recommencer tout le frontend sauf si c’est absolument nécessaire.

---

# 3. Règle absolue

Ne pas casser l’existant.

Il faut travailler progressivement :

```text
1. Auditer les écrans existants
2. Réutiliser les composants existants
3. Créer un design system
4. Améliorer les pages critiques
5. Ajouter les nouveaux écrans ERP
6. Harmoniser la navigation
7. Optimiser mobile/tablette
```

---

# 4. Principes UX obligatoires

## 4.1 Simplicité

Chaque écran doit répondre à une question simple :

```text
Qu’est-ce que l’utilisateur veut faire maintenant ?
```

Exemples :

- créer une dépense
- approuver une demande
- payer un fournisseur
- voir un budget
- consulter un stock
- créer une facture
- enregistrer un loyer
- consulter un rapport

---

## 4.2 Actions métier au lieu de jargon comptable

Mauvais exemple :

```text
Créer débit/crédit
```

Bon exemple :

```text
Enregistrer un paiement fournisseur
```

Mauvais exemple :

```text
Journal entry lines
```

Bon exemple :

```text
Prévisualisation comptable
```

---

## 4.3 Interfaces selon rôle

Chaque utilisateur doit voir ce qui correspond à son travail.

Exemples :

### Directeur

- dashboard global
- budgets
- approbations en attente
- rapports
- alertes critiques

### Comptable

- transactions
- journaux
- rapports financiers
- paiements
- rapprochements

### Approvisionnement

- demandes d’achat
- fournisseurs
- bons de commande
- réceptions
- factures fournisseurs

### Magasinier

- stock
- entrées
- sorties
- transferts
- inventaires

### RH

- employés
- contrats
- présences
- salaires
- congés

### Immobilier

- propriétés
- locataires
- loyers
- contrats
- maintenance

### Agriculture

- champs
- cultures
- intrants
- récoltes
- rendements

### Élevage

- animaux
- traitements
- vaccins
- alimentation
- mortalité
- reproduction

---

# 5. Navigation cible

Proposer une navigation claire par domaines :

```text
Tableau de bord
Finance
Approvisionnement
Stock
Ventes
RH & Paie
Immobilier
Construction
Agriculture
Élevage
Projets ONG
Logistique
Documents
Rapports
Administration
```

Chaque domaine doit contenir des sous-menus simples.

---

## 5.1 Finance

```text
Dashboard finance
Transactions
Écritures comptables
Comptes
Journaux
Paiements
Caisse & Banque
Budget
Périodes comptables
Rapports financiers
```

---

## 5.2 Approvisionnement

```text
Demandes d’achat
Approbations
Fournisseurs
Demandes de prix
Comparaison fournisseurs
Bons de commande
Réceptions
Factures fournisseurs
Contrats fournisseurs
```

---

## 5.3 Stock

```text
Produits
Entrepôts
Mouvements
Entrées
Sorties
Transferts
Inventaires
Lots
Alertes stock
Valorisation
```

---

## 5.4 Ventes

```text
Clients
Devis
Factures de vente
Paiements clients
Livraisons
Créances
Rapports de vente
```

---

## 5.5 RH & Paie

```text
Employés
Contrats
Présences
Congés
Horaires
Salaires
Paie
Documents employés
Rapports RH
```

---

## 5.6 Immobilier

```text
Propriétés
Unités locatives
Locataires
Contrats de location
Loyers
Paiements
Maintenance
Documents
Rapports immobilier
```

---

## 5.7 Construction

```text
Chantiers
Matériaux
Budget chantier
Dépenses chantier
Main-d’œuvre
Avancement
Documents chantier
Rapports chantier
```

---

## 5.8 Agriculture

```text
Champs
Cultures
Saisons
Semis
Intrants
Récoltes
Rendement
Coûts agricoles
Rapports agricoles
```

---

## 5.9 Élevage

```text
Animaux
Espèces
Reproduction
Santé animale
Vaccinations
Traitements
Médicaments
Alimentation
Mortalité
Production
Rapports élevage
```

---

## 5.10 Projets ONG

```text
Projets
Bailleurs
Activités
Indicateurs
Budgets projet
Dépenses projet
Rapports narratifs
Rapports financiers
Documents bailleurs
```

---

# 6. Dashboard global

Créer un dashboard global pour la direction.

Il doit afficher :

```text
Solde caisse
Solde banque
Revenus du mois
Dépenses du mois
Dettes fournisseurs
Créances clients
Budgets dépassés
Stocks critiques
Salaires à payer
Contrats qui expirent
Demandes en attente
Factures impayées
Projets en retard
Alertes audit
```

Le dashboard doit avoir des filtres :

```text
Organisation
Site
Département
Projet
Période
Devise
```

---

# 7. Interface transaction moderne

## 7.1 Objectif

Remplacer l’expérience “choisir débit/crédit” pour les utilisateurs simples par une expérience métier.

L’écran doit proposer :

```text
Que voulez-vous faire ?
```

Options :

```text
Payer fournisseur
Recevoir paiement client
Enregistrer dépense
Recevoir loyer
Payer salaire
Acheter stock
Vendre produit
Dépenser pour projet
Acheter carburant
Utiliser médicament vétérinaire
Acheter matériaux chantier
```

---

## 7.2 Formulaire transaction métier

Exemple : Paiement fournisseur

Champs :

```text
Type de transaction
Fournisseur
Facture liée
Montant
Devise
Compte de paiement
Projet
Site
Département
Budget line
Date
Description
Pièces jointes
```

Boutons :

```text
Enregistrer brouillon
Prévisualiser
Envoyer pour approbation
Publier
Annuler
```

---

## 7.3 Prévisualisation comptable

Pour les utilisateurs autorisés :

```text
Prévisualisation comptable

Compte                     Débit      Crédit
Fournisseur ABC            1 000
Banque                                1 000
```

Afficher aussi :

```text
Budget impacté
Stock impacté
Projet impacté
Documents attachés
Workflow requis
```

---

# 8. Interface workflow

Créer une interface pour :

- mes approbations
- demandes envoyées
- demandes rejetées
- historique d’approbation
- configuration workflow

## Écran Mes approbations

Colonnes :

```text
Type
Référence
Demandeur
Montant
Devise
Projet
Site
Date
Statut
Action
```

Actions :

```text
Voir
Approuver
Rejeter
Retourner pour correction
Commenter
```

---

## Écran détail approbation

Afficher :

```text
Résumé de la demande
Montant
Budget disponible
Documents joints
Historique
Étape actuelle
Prochaine étape
Prévisualisation comptable si applicable
```

---

# 9. Interface budget

Créer un module budget visuel.

## Dashboard budget

Afficher :

```text
Budget total
Montant engagé
Montant dépensé
Solde disponible
Pourcentage consommé
Dépassements
Alertes
```

Filtres :

```text
Projet
Site
Département
Activité
Période
Devise
```

## Détail ligne budgétaire

Afficher :

```text
Ligne budgétaire
Montant prévu
Engagé
Dépensé
Disponible
Transactions liées
Documents liés
Historique des révisions
```

---

# 10. Interface stock

Créer une UX claire pour le stock.

## Dashboard stock

Afficher :

```text
Produits critiques
Valeur totale du stock
Entrées récentes
Sorties récentes
Stocks proches expiration
Transferts en attente
Inventaires ouverts
```

## Écran mouvement de stock

Champs :

```text
Type de mouvement
Produit
Entrepôt source
Entrepôt destination
Quantité
Lot
Date expiration
Projet
Site
Département
Motif
Document joint
```

Types :

```text
Entrée achat
Sortie vente
Transfert
Ajustement
Perte
Consommation
Retour
Production
```

---

# 11. Interface approvisionnement

Créer une UX en étapes.

Processus :

```text
1. Demande d’achat
2. Approbation
3. Demande de prix
4. Comparaison fournisseurs
5. Bon de commande
6. Réception
7. Facture fournisseur
8. Paiement
```

Chaque étape doit montrer :

```text
Statut
Responsable
Documents
Montants
Historique
Actions disponibles
```

---

# 12. Interface documents

Chaque module doit permettre d’attacher des documents.

Composant réutilisable :

```text
DocumentUploader
DocumentList
DocumentPreview
DocumentHistory
```

Fonctions :

```text
Upload
Télécharger
Prévisualiser
Remplacer version
Associer à une entité
Valider
Signer plus tard
Archiver
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

# 13. Interface rapports

Créer un centre de rapports.

Catégories :

```text
Finance
Approvisionnement
Stock
Ventes
RH
Immobilier
Agriculture
Élevage
Construction
Projets ONG
Audit
```

Chaque rapport doit avoir :

```text
Filtres
Aperçu
Export PDF
Export Excel
Export CSV
Sauvegarde du filtre
Planification future
```

---

# 14. UX mobile/tablette

Le système doit bien fonctionner sur :

```text
desktop
laptop
tablette
iPad
mobile
```

Priorités mobile :

- consultation rapide
- approbation
- prise de photo document
- mouvement stock
- activité terrain
- agriculture
- élevage
- inventaire
- livraison
- mission logistique

## Interfaces mobiles prioritaires

```text
Mes approbations
Créer demande d’achat
Scanner produit
Entrée/sortie stock
Ajouter document/photo
Enregistrer traitement animal
Enregistrer récolte
Enregistrer dépense terrain
```

---

# 15. Design system

Créer ou normaliser :

## Couleurs

- couleur primaire
- succès
- avertissement
- danger
- neutre
- information

## Composants

```text
PageHeader
DataTable
FilterBar
StatusBadge
AmountDisplay
CurrencyDisplay
ActionMenu
ConfirmModal
AuditTimeline
ApprovalTimeline
DocumentUploader
EntitySelector
ProjectSelector
SiteSelector
DepartmentSelector
DateRangePicker
KpiCard
StatCard
EmptyState
LoadingState
ErrorState
```

---

# 16. Statuts visuels

Normaliser les statuts :

```text
DRAFT
PENDING_APPROVAL
APPROVED
REJECTED
POSTED
PAID
PARTIALLY_PAID
CANCELLED
REVERSED
CLOSED
OVERDUE
LOW_STOCK
OUT_OF_STOCK
```

Chaque statut doit avoir :

```text
label utilisateur
couleur
icône
description
actions disponibles
```

---

# 17. Permissions côté frontend

Le frontend doit cacher ou désactiver les actions selon permissions.

Exemples :

```text
invoice.create
invoice.approve
transaction.post
journal.reverse
salary.read
report.finance.export
workflow.configure
budget.override
```

Ne jamais se fier uniquement au frontend.

Le backend reste l’autorité.

Mais le frontend doit améliorer l’expérience en affichant seulement les actions disponibles.

---

# 18. Expérience par rôle

Créer des homepages par rôle.

## Direction

```text
Dashboard global
Approbations critiques
Budget
Rapports
Alertes
```

## Finance

```text
Transactions
Paiements
Journaux
Budgets
Rapports financiers
```

## Approvisionnement

```text
Demandes d’achat
Bons de commande
Fournisseurs
Réceptions
Factures fournisseurs
```

## Magasinier

```text
Stock
Entrées
Sorties
Transferts
Inventaire
Alertes
```

## Terrain agriculture / élevage

```text
Activités du jour
Stock intrants
Traitements
Récoltes
Photos
Rapports terrain
```

---

# 19. Tickets frontend attendus

Produire des tickets techniques frontend au format :

```text
Titre :
Priorité :
Module :
Écran concerné :
Objectif :
Composants à créer :
API nécessaires :
Règles UX :
Critères d’acceptation :
Tests :
Risques :
```

---

# 20. Tickets minimum à produire

Générer au minimum :

```text
1. Créer nouvelle navigation ERP/SIFA
2. Créer dashboard global direction
3. Créer composant StatusBadge
4. Créer composant ApprovalTimeline
5. Créer composant AuditTimeline
6. Créer composant DocumentUploader
7. Créer écran Mes approbations
8. Créer écran détail approbation
9. Créer interface transaction métier
10. Créer prévisualisation comptable
11. Créer dashboard budget
12. Créer détail ligne budgétaire
13. Créer dashboard stock
14. Créer mouvement de stock
15. Créer cycle demande d’achat en étapes
16. Créer centre de rapports
17. Créer filtres globaux organisation/site/projet/période
18. Adapter pages critiques pour mobile/tablette
19. Ajouter contrôle permissions côté frontend
20. Créer homepages par rôle
```

---

# 21. Critères d’acceptation globaux

Le frontend sera considéré mature si :

- l’utilisateur simple comprend quoi faire sans formation lourde
- la comptabilité complexe est cachée aux non-comptables
- les approbations sont visibles et simples
- les documents sont faciles à joindre
- les statuts sont clairs
- les rapports sont faciles à filtrer
- l’interface fonctionne sur mobile et tablette
- chaque rôle voit une expérience adaptée
- les actions sensibles respectent les permissions
- les modules sont reliés visuellement
- le système donne une impression professionnelle et commerciale

---

# 22. Résultat final attendu

Produire :

1. Audit UX du frontend existant.
2. Nouvelle architecture de navigation.
3. Liste des écrans à garder.
4. Liste des écrans à améliorer.
5. Liste des écrans à créer.
6. Design system recommandé.
7. Parcours utilisateur par rôle.
8. Interfaces transaction/workflow/budget/stock/documents.
9. Roadmap frontend.
10. Tickets frontend prêts à exécuter.

---

# 23. Conclusion

Le frontend doit transformer le backend ERP/SIFA en produit vendable.

Le backend peut être puissant, mais si l’interface est confuse, le produit ne sera pas accepté.

L’objectif final est :

```text
Un ERP/SIFA puissant techniquement,
mais simple pour l’utilisateur final.
```

Le système doit donner l’impression d’un produit professionnel, moderne, institutionnel et commercialisable.

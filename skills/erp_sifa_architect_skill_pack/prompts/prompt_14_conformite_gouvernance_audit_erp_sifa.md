# PROMPT 14 — CONFORMITÉ, GOUVERNANCE, CONTRÔLE INTERNE ET AUDIT ERP/SIFA

## Objectif de ce prompt

Ce prompt sert à définir les exigences de conformité, gouvernance, contrôle interne et audit pour le projet ERP/SIFA.

Un ERP/SIFA qui gère :

- finances
- achats
- stocks
- salaires
- projets
- documents
- contrats
- approbations
- budgets

doit être conçu pour inspirer confiance aux :

- dirigeants
- comptables
- auditeurs
- ONG
- bailleurs
- municipalités
- institutions publiques
- ministères
- gouvernements

L’objectif est de transformer le système en plateforme contrôlable, vérifiable et auditable.

---

# 1. Contexte

Le projet ERP/SIFA existe déjà et vise à devenir une solution complète de gestion.

Il couvre ou doit couvrir :

```text
Finance
Comptabilité
Transactions
Approvisionnement
Stock
RH
Paie
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
```

Le système doit pouvoir être utilisé par des organisations qui exigent :

```text
traçabilité
séparation des responsabilités
contrôle des dépenses
justification documentaire
historique complet
rapports fiables
sécurité des accès
audit interne et externe
```

---

# 2. Mission principale

Produire un cadre complet de gouvernance et contrôle interne.

L’agent doit définir :

1. principes de gouvernance
2. séparation des responsabilités
3. contrôles internes
4. règles d’approbation
5. règles d’audit
6. règles de justification documentaire
7. contrôle budgétaire
8. contrôle des stocks
9. contrôle des paiements
10. contrôle RH/paie
11. contrôle des accès
12. contrôle des rapports
13. politiques système
14. indicateurs d’audit
15. tickets techniques à implémenter

---

# 3. Règle absolue

Aucune opération financière sensible ne doit pouvoir être faite sans trace.

Le système doit répondre à tout moment :

```text
Qui a fait quoi ?
Quand ?
Pourquoi ?
Avec quelle autorisation ?
Avec quel document justificatif ?
Quel budget a été impacté ?
Quelle écriture comptable a été générée ?
Quelle personne a approuvé ?
```

---

# 4. Principes de gouvernance

Appliquer les principes suivants :

## 4.1 Traçabilité

Chaque action importante doit être tracée.

## 4.2 Séparation des tâches

La même personne ne doit pas toujours pouvoir :

```text
créer
approuver
payer
comptabiliser
auditer
```

la même opération sans contrôle.

## 4.3 Justification documentaire

Les opérations sensibles doivent avoir des pièces justificatives.

## 4.4 Validation hiérarchique

Les montants élevés doivent exiger plusieurs validations.

## 4.5 Non-répudiation

Une fois une action validée, l’utilisateur ne doit pas pouvoir nier l’avoir faite.

## 4.6 Intégrité comptable

Les transactions publiées ne doivent pas être modifiées directement.

## 4.7 Sécurité des accès

Chaque utilisateur doit avoir seulement les droits nécessaires.

---

# 5. Séparation des responsabilités

Définir des règles.

## Exemple finance

```text
Demandeur crée la demande.
Responsable approuve.
Comptable prépare le paiement.
Directeur valide le paiement.
Auditeur consulte l’historique.
```

## Exemple achat

```text
Demandeur crée demande achat.
Approvisionnement demande prix.
Finance vérifie budget.
Direction approuve.
Magasinier réceptionne.
Comptable comptabilise.
```

## Exemple stock

```text
Magasinier enregistre entrée/sortie.
Superviseur valide inventaire.
Finance valide valorisation.
Auditeur vérifie écarts.
```

## Exemple paie

```text
RH prépare paie.
Finance vérifie.
Direction approuve.
Comptable publie.
```

---

# 6. Matrice de séparation des tâches

Créer une matrice :

```text
Action | Créateur | Approbateur | Exécutant | Auditeur | Restriction
```

Actions à inclure :

```text
Créer facture fournisseur
Approuver facture
Payer fournisseur
Publier écriture
Annuler écriture
Créer salaire
Approuver salaire
Créer demande achat
Approuver demande achat
Réceptionner stock
Ajuster stock
Créer budget
Modifier budget
Exporter rapport financier
Modifier permissions
```

---

# 7. Contrôles internes finance

Définir les contrôles :

```text
montant positif obligatoire
débit = crédit
compte actif obligatoire
devise obligatoire
organisation obligatoire
période ouverte obligatoire
document justificatif si requis
workflow approuvé si requis
budget disponible si requis
impossibilité suppression écriture publiée
annulation par contre-passation seulement
```

---

# 8. Contrôles internes approvisionnement

Contrôles à appliquer :

```text
demande achat obligatoire avant commande si configuré
approbation obligatoire selon montant
comparaison fournisseurs si montant élevé
bon de commande obligatoire avant réception
réception obligatoire avant facture si stock
écarts commande/réception/facture détectés
documents obligatoires
historique complet
```

---

# 9. Contrôles internes stock

Contrôles :

```text
stock négatif interdit sauf permission spéciale
mouvement stock doit avoir motif
ajustement stock doit être approuvé
inventaire physique audité
écart inventaire justifié
lot obligatoire pour produits sensibles
expiration obligatoire pour médicaments/semences
sortie stock liée à activité/projet si applicable
```

---

# 10. Contrôles internes budget

Contrôles :

```text
dépense liée à ligne budgétaire
budget disponible vérifié
dépassement budget alerté
dépassement bloqué selon règle
révision budget approuvée
budget fermé non modifiable
budget vs réel disponible
```

---

# 11. Contrôles internes RH/paie

Contrôles :

```text
salaire lié à employé actif
contrat actif requis
modification salaire auditée
paie approuvée avant paiement
doublon paie période bloqué
déductions justifiées
documents employés protégés
accès salaire limité
```

---

# 12. Contrôles internes documents

Contrôles :

```text
document obligatoire selon type transaction
versionnage obligatoire
suppression document sensible interdite ou contrôlée
téléchargement audité
document lié à entité
preuve de paiement obligatoire pour paiement
contrat obligatoire pour loyer si configuré
facture obligatoire pour dépense si configuré
```

---

# 13. Contrôles des accès

Définir les règles :

```text
principe du moindre privilège
permissions par rôle
permissions par organisation
permissions par site
permissions par projet
accès salaire limité
accès rapports financiers limité
exports sensibles audités
MFA pour rôles sensibles
```

Rôles sensibles :

```text
Super Admin
Finance Manager
Accountant
Auditor
HR Manager
Director
System Admin
```

---

# 14. Workflow et seuils d’approbation

Créer des seuils configurables.

Exemple :

```text
0 à 500 USD       → Superviseur
501 à 5 000 USD   → Finance + Direction
5 001 à 20 000 USD → Finance + Direction + Audit
20 001 USD+        → Comité / Conseil / Autorité supérieure
```

Le système doit permettre de configurer :

```text
montant
devise
module
organisation
site
département
projet
type transaction
rôle approbateur
nombre d’approbateurs
```

---

# 15. Politiques système configurables

Créer un module ou une section :

```text
Governance Settings
```

Paramètres :

```text
requireDocumentForPayments
requireApprovalForPayments
requireApprovalForStockAdjustment
requireBudgetCheck
blockBudgetOverrun
requireMfaForFinance
requireMfaForAdmin
allowNegativeStock
allowPostingClosedPeriod
allowDeletePublishedEntry
maxApprovalAmountByRole
```

---

# 16. Audit avancé

Actions à auditer obligatoirement :

```text
login
login_failed
logout
password_change
mfa_enabled
mfa_disabled
user_created
role_changed
permission_changed
transaction_created
transaction_posted
transaction_reversed
invoice_created
invoice_approved
payment_created
payment_approved
stock_adjusted
budget_modified
workflow_approved
workflow_rejected
document_uploaded
document_downloaded
report_exported
period_closed
period_reopened
```

---

# 17. Rapport d’audit

Créer des rapports :

```text
journal des actions
transactions modifiées
écritures annulées
tentatives connexion échouées
exports de rapports
changements permissions
paiements sans document
dépenses sans budget
stock ajusté
approbations rejetées
dépassements budget
```

Filtres :

```text
date
utilisateur
module
organisation
site
projet
action
niveau risque
```

---

# 18. Scoring de risque

Créer un système de risque pour certaines actions.

Exemples actions à haut risque :

```text
annulation transaction
réouverture période comptable
modification permissions
export rapport financier
paiement élevé
ajustement stock important
suppression document
connexion échouée répétée
```

Niveaux :

```text
LOW
MEDIUM
HIGH
CRITICAL
```

---

# 19. Alertes de contrôle interne

Créer des alertes :

```text
paiement sans document
dépense sans budget
budget dépassé
transaction annulée
stock négatif tenté
connexion suspecte
permission modifiée
période réouverte
facture fournisseur sans réception
écart inventaire élevé
salaire modifié
```

---

# 20. Conformité documentaire pour ONG/bailleurs

Pour ONG et bailleurs, prévoir :

```text
rapport dépenses par projet
rapport budget vs réalisé
liste pièces justificatives
rapport activités
rapport indicateurs
rapport approbations
rapport audit
export PDF/Excel
```

Chaque dépense projet doit idéalement avoir :

```text
facture ou reçu
description
activité
ligne budgétaire
approbation
preuve paiement
```

---

# 21. Conformité institutionnelle

Pour municipalité/province/gouvernement, prévoir :

```text
workflow strict
passation de marché
budget public
traçabilité complète
périodes comptables
rapports officiels
contrôle des accès
audit externe
sauvegardes
plan de reprise
```

---

# 22. Tableaux de bord gouvernance

Créer dashboard gouvernance :

```text
approbations en attente
transactions annulées
budgets dépassés
paiements sans document
stock critique
actions haut risque
connexions échouées
exports récents
changements permissions
périodes ouvertes/fermées
```

---

# 23. Tickets techniques attendus

Créer des tickets pour :

```text
1. Créer Governance Settings
2. Ajouter séparation des tâches
3. Ajouter contrôles paiement
4. Ajouter contrôles budget
5. Ajouter contrôles stock
6. Ajouter contrôles paie
7. Ajouter documents obligatoires selon transaction type
8. Ajouter audit des exports
9. Ajouter audit des téléchargements documents
10. Ajouter scoring de risque audit
11. Ajouter alertes contrôle interne
12. Créer rapport audit avancé
13. Créer dashboard gouvernance
14. Ajouter MFA obligatoire pour rôles sensibles
15. Ajouter règles seuils approbation
16. Ajouter blocage suppression transaction publiée
17. Ajouter blocage modification période fermée
18. Ajouter rapport dépenses sans justificatif
19. Ajouter rapport paiements sans approbation
20. Ajouter rapport stock ajusté
```

---

# 24. Format des tickets

Chaque ticket doit contenir :

```text
Titre :
Priorité :
Module :
Contexte :
Objectif :
Règle de contrôle :
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

# 25. Tests obligatoires

Tester :

```text
paiement sans document bloqué si règle active
dépense dépasse budget bloquée si règle active
utilisateur créateur ne peut pas approuver sa propre demande si règle active
transaction publiée non modifiable
période fermée bloque publication
stock négatif bloqué
export rapport audité
modification permission auditée
MFA requis pour rôle finance
```

---

# 26. Livrables attendus

L’agent doit produire :

1. Cadre de gouvernance.
2. Matrice séparation des tâches.
3. Liste contrôles internes.
4. Politiques système configurables.
5. Règles workflow/seuils.
6. Plan audit avancé.
7. Rapports d’audit.
8. Dashboard gouvernance.
9. Alertes contrôle interne.
10. Tickets techniques.
11. Tests obligatoires.
12. Recommandations pour ONG/gouvernement.

---

# 27. Format final attendu

La réponse doit être structurée comme ceci :

```text
1. Résumé exécutif
2. Principes de gouvernance
3. Séparation des responsabilités
4. Matrice de contrôle
5. Contrôles finance
6. Contrôles approvisionnement
7. Contrôles stock
8. Contrôles budget
9. Contrôles RH/paie
10. Contrôles documents
11. Contrôles accès
12. Workflow et seuils
13. Audit avancé
14. Scoring de risque
15. Alertes
16. Rapports conformité
17. Dashboard gouvernance
18. Tickets techniques
19. Tests
20. Conclusion
```

---

# 28. Conclusion

Le but final est de rendre l’ERP/SIFA contrôlable et auditable.

Un bon ERP/SIFA ne permet pas seulement de saisir des données.

Il doit permettre de prouver :

```text
la dépense était autorisée
la dépense était budgétée
la dépense avait un justificatif
la dépense a été approuvée
la transaction comptable est équilibrée
l’historique est conservé
```

Cette gouvernance est essentielle pour vendre à des ONG, bailleurs, institutions publiques et gouvernements.

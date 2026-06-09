# PROMPT 16 — IA, ANALYTIQUE, TABLEAUX DE BORD INTELLIGENTS ET AIDE À LA DÉCISION ERP/SIFA

## Objectif

Ce prompt sert à concevoir la couche intelligence de l’ERP/SIFA.

L’objectif n’est pas de remplacer les modules métier par l’IA.  
L’objectif est de préparer les données, rapports, indicateurs et assistants afin que l’ERP/SIFA puisse aider les dirigeants, comptables, gestionnaires, ONG et institutions à prendre de meilleures décisions.

L’IA doit être ajoutée seulement après stabilisation de :

```text
transactions
finance
budget
stock
workflow
audit
documents
rapports
permissions
```

---

# 1. Mission principale

Concevoir une stratégie IA et analytique pour l’ERP/SIFA.

L’agent doit produire :

1. architecture IA cible
2. données nécessaires
3. indicateurs clés
4. assistant conversationnel ERP
5. tableaux de bord intelligents
6. alertes intelligentes
7. prévisions financières
8. prévisions stock
9. prévisions budget
10. prévisions RH
11. prévisions agriculture/élevage
12. sécurité IA
13. limites IA
14. tickets techniques

---

# 2. Règle absolue

L’IA ne doit jamais modifier directement les données financières sans validation humaine.

Elle peut :

```text
analyser
suggérer
alerter
expliquer
résumer
prévoir
```

Elle ne doit pas :

```text
publier une transaction sans autorisation
approuver une dépense automatiquement sans règle
modifier une écriture comptable publiée
supprimer des données
contourner les permissions
```

---

# 3. Assistant conversationnel ERP

L’utilisateur doit pouvoir poser des questions comme :

```text
Combien avons-nous dépensé ce mois-ci ?
Quel fournisseur coûte le plus cher ?
Quels projets dépassent le budget ?
Quels produits sont en rupture ?
Quels employés ont beaucoup d’absences ?
Combien avons-nous dépensé pour l’élevage à Kasangulu ?
Quels loyers sont en retard ?
Quels contrats expirent ce mois-ci ?
Quels paiements sont sans justificatif ?
```

L’assistant doit répondre selon les permissions de l’utilisateur.

---

# 4. Architecture recommandée

Créer une couche :

```text
Analytics Layer
AI Assistant Layer
Semantic Data Layer
```

Composants :

```text
analytics_views
kpi_definitions
saved_questions
ai_query_logs
ai_access_policies
insight_rules
prediction_jobs
alert_rules
```

---

# 5. Couche sémantique

Créer une définition claire des concepts métier :

```text
dépense
revenu
budget consommé
stock critique
dette fournisseur
créance client
coût par projet
coût par animal
coût par chantier
coût par champ
loyer impayé
```

Chaque concept doit être relié aux tables réelles.

---

# 6. Indicateurs clés

## Finance

```text
revenus du mois
dépenses du mois
solde caisse
solde banque
dettes fournisseurs
créances clients
trésorerie nette
dépenses par projet
dépenses par site
```

## Approvisionnement

```text
demandes en attente
bons de commande ouverts
fournisseurs les plus utilisés
écarts commande/réception/facture
délais moyens d’approbation
```

## Stock

```text
stock critique
stock expirant
valeur stock
sorties mensuelles
ruptures fréquentes
produits dormants
```

## RH

```text
masse salariale
absences
congés
contrats expirants
salaires à payer
```

## Immobilier

```text
loyers dus
loyers reçus
taux occupation
maintenance ouverte
contrats expirants
```

## Agriculture / Élevage

```text
coût par champ
rendement par culture
coût par animal ou lot
mortalité
vaccinations à faire
aliments consommés
```

---

# 7. Alertes intelligentes

Créer des alertes comme :

```text
budget dépassé
stock bas
stock bientôt expiré
paiement sans document
transaction annulée
connexion suspecte
loyer en retard
contrat expirant
fournisseur trop cher
dépense inhabituelle
mortalité élevée
consommation carburant anormale
```

---

# 8. Prévisions

Prévoir plus tard :

```text
prévision trésorerie
prévision dépenses
prévision stock
prévision rupture
prévision revenus loyers
prévision récoltes
prévision coûts élevage
prévision budget fin projet
```

---

# 9. Sécurité IA

L’assistant IA doit respecter :

```text
permissions utilisateur
organisation active
site autorisé
projet autorisé
données sensibles
audit des questions
audit des réponses
```

Ne jamais exposer :

```text
salaires sans permission
données autre organisation
rapports financiers interdits
documents confidentiels
```

---

# 10. Logs IA

Créer :

```text
ai_query_logs
- userId
- organizationId
- question
- interpretedIntent
- dataAccessed
- responseSummary
- createdAt
```

---

# 11. Tickets attendus

Créer des tickets pour :

```text
1. Créer couche analytics_views
2. Créer kpi_definitions
3. Créer dashboard KPI direction
4. Créer assistant questions prédéfinies
5. Créer contrôle permissions IA
6. Créer ai_query_logs
7. Créer alert_rules
8. Créer insight_rules
9. Créer rapport fournisseurs coûteux
10. Créer rapport dépenses inhabituelles
11. Créer prévisions stock futures
12. Créer prévisions trésorerie futures
```

---

# 12. Format final attendu

```text
1. Résumé exécutif
2. Architecture IA cible
3. Données nécessaires
4. KPI prioritaires
5. Assistant conversationnel
6. Alertes intelligentes
7. Prévisions futures
8. Sécurité IA
9. Roadmap IA
10. Tickets techniques
```

---

# Conclusion

L’IA doit venir après la fiabilité des données.

La priorité est :

```text
données propres
transactions fiables
rapports exacts
permissions solides
IA ensuite
```

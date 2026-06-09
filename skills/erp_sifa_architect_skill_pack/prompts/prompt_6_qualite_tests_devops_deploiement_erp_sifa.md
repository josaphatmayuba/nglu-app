# PROMPT 6 — QUALITÉ, TESTS, DEVOPS, DÉPLOIEMENT ET MAINTENANCE ERP/SIFA

## Objectif de ce prompt

Ce prompt doit être utilisé après :

1. l’audit du backend ERP/SIFA,
2. le plan d’exécution technique,
3. la conception frontend / UX,
4. la stratégie commerciale et sécurité institutionnelle.

L’objectif est maintenant de préparer le projet ERP/SIFA pour un usage réel en production.

Un ERP/SIFA mature ne doit pas seulement avoir des modules.

Il doit être :

- stable
- testé
- sécurisé
- sauvegardé
- monitoré
- facile à déployer
- facile à mettre à jour
- maintenable
- récupérable après panne
- prêt pour plusieurs clients

Ce prompt vise à créer une stratégie complète de qualité, tests, déploiement, DevOps et maintenance.

---

# 1. Contexte

Le projet ERP/SIFA existe déjà et vise à couvrir :

- Finance
- Transactions
- Approvisionnement
- Stock
- Ventes
- RH
- Paie
- Immobilier
- Construction
- Agriculture
- Élevage
- Logistique
- Projets ONG
- Documents
- Audit
- Workflow
- Budget
- Rapports
- IA future

Le projet doit pouvoir être vendu à :

- PME
- ONG
- coopératives
- entreprises
- municipalités
- institutions publiques
- gouvernements

Pour cela, le système doit être fiable en production.

---

# 2. Mission principale

Analyser et proposer une stratégie complète pour :

1. qualité du code
2. tests automatisés
3. sécurité technique
4. sauvegarde
5. restauration
6. monitoring
7. logs
8. performance
9. CI/CD
10. déploiement
11. gestion des environnements
12. migration base de données
13. support client
14. maintenance
15. documentation technique

---

# 3. Règle absolue

Un ERP/SIFA qui gère la finance ne doit pas être déployé sans :

```text
tests
sauvegardes
audit
logs
monitoring
plan de restauration
sécurité
documentation
```

Le système doit être traité comme une application critique.

---

# 4. Environnements obligatoires

Prévoir au minimum trois environnements :

```text
LOCAL
DEVELOPMENT
PRODUCTION
```

Recommandé :

```text
LOCAL
DEVELOPMENT
STAGING
PRODUCTION
```

## 4.1 LOCAL

Utilisé par le développeur.

Doit permettre :

- démarrage rapide
- base de données locale
- seed de données
- tests
- logs visibles

## 4.2 DEVELOPMENT

Environnement partagé pour tests internes.

Doit permettre :

- tester les nouvelles fonctionnalités
- connecter le frontend
- tester migrations
- tester intégrations

## 4.3 STAGING

Copie proche de production.

Doit permettre :

- tester avant mise en production
- valider migrations
- valider performances
- valider démo client

## 4.4 PRODUCTION

Environnement client réel.

Doit être :

- sécurisé
- sauvegardé
- monitoré
- stable
- documenté

---

# 5. Configuration des environnements

Prévoir des fichiers :

```text
.env.local
.env.development
.env.staging
.env.production
```

Variables importantes :

```text
NODE_ENV
APP_PORT
DATABASE_URL
JWT_SECRET
JWT_EXPIRES_IN
REFRESH_TOKEN_SECRET
MFA_SECRET
CORS_ORIGIN
UPLOAD_DIR
MAX_FILE_SIZE
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASSWORD
REDIS_URL
LOG_LEVEL
BACKUP_DIR
SENTRY_DSN
```

Ne jamais commiter les secrets.

Prévoir :

```text
.env.example
```

avec des valeurs fictives.

---

# 6. Stratégie Docker

Prévoir un déploiement Docker.

Créer ou vérifier :

```text
Dockerfile
docker-compose.yml
docker-compose.prod.yml
.dockerignore
```

Services recommandés :

```text
backend
frontend
database
redis
nginx
backup
monitoring
```

Pour production :

```text
restart: always
volumes persistants
réseau interne
ports contrôlés
variables d’environnement sécurisées
```

---

# 7. Reverse proxy

Prévoir Nginx ou équivalent.

Nginx doit gérer :

```text
HTTPS
certificats SSL
redirection HTTP vers HTTPS
proxy backend API
proxy frontend
upload size
compression
headers sécurité
rate limiting
logs accès
```

Headers recommandés :

```text
X-Frame-Options
X-Content-Type-Options
Referrer-Policy
Content-Security-Policy
Strict-Transport-Security
```

---

# 8. CI/CD

Créer une pipeline CI/CD.

La pipeline doit exécuter :

```text
install dependencies
lint
format check
unit tests
integration tests
build backend
build frontend
security scan
database migration check
docker build
deploy staging
manual approval
deploy production
```

Supporter :

- Bitbucket Pipelines
- GitHub Actions
- GitLab CI

Produire un exemple adapté au projet.

---

# 9. Stratégie de branches Git

Proposer :

```text
main
develop
feature/*
hotfix/*
release/*
```

Règles :

- `main` = production stable
- `develop` = intégration
- `feature/*` = nouvelles fonctionnalités
- `hotfix/*` = correction urgente production
- `release/*` = préparation version

---

# 10. Versionnement

Utiliser le versionnement sémantique :

```text
MAJOR.MINOR.PATCH
```

Exemples :

```text
1.0.0
1.1.0
1.1.1
2.0.0
```

Règles :

- MAJOR = changement incompatible
- MINOR = nouvelle fonctionnalité
- PATCH = correction bug

Prévoir :

```text
CHANGELOG.md
RELEASE_NOTES.md
```

---

# 11. Tests automatisés

## 11.1 Tests unitaires

Tester :

- services
- règles métier
- calculs
- validations
- permissions
- règles transactionnelles

Exemples critiques :

```text
total débit = total crédit
budget disponible
période comptable ouverte
permission utilisateur
stock suffisant
workflow approuvé
```

---

## 11.2 Tests d’intégration

Tester :

- endpoints API
- base de données
- auth
- permissions
- workflow
- transaction
- stock
- budget
- documents

---

## 11.3 Tests end-to-end

Tester les parcours complets :

```text
Créer facture achat
→ réception stock
→ comptabilisation
→ paiement fournisseur
→ rapport finance

Créer facture vente
→ sortie stock
→ paiement client
→ rapport vente

Payer salaire
→ écriture comptable
→ rapport RH

Recevoir loyer
→ finance
→ rapport immobilier

Créer dépense projet
→ workflow
→ budget
→ finance
```

---

## 11.4 Tests de non-régression

Chaque correction doit éviter de casser :

- transactions
- paiements
- factures
- stock
- permissions
- rapports

---

# 12. Jeux de données de test

Créer des seeds pour :

```text
organisations
sites
départements
utilisateurs
rôles
permissions
comptes
fournisseurs
clients
produits
stocks
factures
paiements
transactions
budgets
projets
documents
```

Prévoir :

```text
seed.dev.ts
seed.demo.ts
seed.test.ts
```

---

# 13. Tests financiers obligatoires

Créer des scénarios de test pour :

## Achat avec taxe

```text
Débit stock/charge
Débit taxe récupérable
Crédit fournisseur
```

## Paiement fournisseur

```text
Débit fournisseur
Crédit banque
```

## Vente avec taxe

```text
Débit client
Crédit revenu
Crédit taxe collectée
```

## Paiement client

```text
Débit banque
Crédit client
```

## Salaire

```text
Débit charge salariale
Crédit banque
Crédit dettes sociales
```

## Annulation

```text
Contre-passation automatique
```

---

# 14. Sécurité technique

Vérifier et renforcer :

```text
hash mot de passe
JWT sécurisé
refresh token
MFA
rate limiting
CORS strict
Helmet
validation DTO
sanitization
protection upload
protection fichiers
permissions backend
audit actions sensibles
```

Tests sécurité :

```text
accès sans token
token expiré
rôle insuffisant
tentative accès autre organisation
upload fichier dangereux
injection SQL
payload invalide
brute force login
```

---

# 15. Sauvegardes

Créer une stratégie de sauvegarde.

## 15.1 Base de données

Sauvegarde :

```text
quotidienne
hebdomadaire
mensuelle
avant migration
avant mise à jour
```

Conserver :

```text
7 jours quotidiens
4 semaines hebdomadaires
12 mois mensuels
```

Adapter selon besoin client.

---

## 15.2 Documents

Sauvegarder :

```text
uploads
factures PDF
contrats
preuves de paiement
rapports
images terrain
```

---

## 15.3 Configuration

Sauvegarder :

```text
.env production
nginx config
docker compose
certificats
scripts déploiement
```

Les secrets doivent être stockés de façon sécurisée.

---

# 16. Restauration

Créer un plan de restauration.

Tester régulièrement :

```text
restaurer base de données
restaurer fichiers
redémarrer services
valider connexion
valider transactions
valider documents
```

Produire un document :

```text
RESTORE_PROCEDURE.md
```

Critère :

```text
Une sauvegarde non testée n’est pas une vraie sauvegarde.
```

---

# 17. Monitoring

Mettre en place monitoring pour :

```text
CPU
RAM
disque
base de données
temps réponse API
erreurs 500
connexions utilisateurs
jobs échoués
migrations
stockage uploads
certificats SSL
```

Outils possibles :

```text
Prometheus
Grafana
Uptime Kuma
Sentry
PM2 monitoring
Docker logs
Nginx logs
```

---

# 18. Logs

Structurer les logs :

```text
application logs
error logs
access logs
audit logs
security logs
database logs
job logs
```

Chaque log important doit contenir :

```text
timestamp
requestId
userId si disponible
organizationId si disponible
module
action
status
error
duration
```

Ne pas logger :

```text
mot de passe
token complet
secret
données bancaires sensibles
```

---

# 19. Performance

Analyser :

```text
temps réponse API
requêtes lentes
index manquants
pagination
filtres
exports lourds
uploads
rapports
dashboard
```

Règles :

- toutes les listes doivent avoir pagination
- tous les rapports lourds doivent utiliser filtres
- les exports lourds doivent être asynchrones si nécessaire
- les colonnes souvent filtrées doivent être indexées
- les dashboards doivent éviter les requêtes trop lourdes

---

# 20. Base de données

Prévoir :

```text
migrations versionnées
rollback si possible
index
contraintes
foreign keys
unique constraints
soft delete si nécessaire
audit timestamps
```

Avant chaque migration production :

```text
backup
test staging
plan rollback
validation post-migration
```

---

# 21. Jobs et tâches planifiées

Prévoir des jobs pour :

```text
sauvegarde automatique
notifications
relance factures impayées
alertes stock
contrats expirants
rapports planifiés
nettoyage fichiers temporaires
synchronisation future
```

Chaque job doit avoir :

```text
logs
statut
dernière exécution
prochaine exécution
erreurs
retry
```

---

# 22. Gestion des fichiers

Pour les documents :

```text
limite taille fichier
types autorisés
scan sécurité si possible
nommage unique
stockage organisé
liens avec entités
permissions téléchargement
audit téléchargement
sauvegarde uploads
```

Types recommandés :

```text
PDF
PNG
JPG
JPEG
DOCX
XLSX
CSV
```

---

# 23. Documentation technique

Créer :

```text
README.md
INSTALLATION.md
DEPLOYMENT.md
ENVIRONMENT.md
DATABASE.md
BACKUP.md
RESTORE_PROCEDURE.md
SECURITY.md
API.md
TESTING.md
CONTRIBUTING.md
CHANGELOG.md
```

---

# 24. Documentation utilisateur

Créer :

```text
Guide administrateur
Guide finance
Guide approvisionnement
Guide stock
Guide RH
Guide direction
Guide documents
Guide rapports
FAQ
```

---

# 25. Support client

Prévoir un système de support :

```text
ticket support
priorité
catégorie
client
module concerné
capture d’écran
logs associés
statut
responsable
SLA
```

Priorités support :

```text
P0 = système indisponible
P1 = finance bloquée
P2 = module important bloqué
P3 = bug mineur
P4 = demande amélioration
```

---

# 26. Maintenance

Prévoir :

```text
mises à jour planifiées
fenêtre de maintenance
communication client
backup avant maintenance
test après maintenance
rollback si problème
notes de version
```

---

# 27. Haute disponibilité future

Pour clients importants :

Prévoir éventuellement :

```text
load balancer
réplication base de données
stockage externe documents
backup distant
monitoring avancé
serveur secondaire
plan reprise sinistre
```

Pas nécessaire pour MVP, mais à prévoir dans l’architecture.

---

# 28. Checklist production

Avant mise en production, vérifier :

```text
.env production configuré
secrets sécurisés
HTTPS actif
CORS strict
database backup actif
uploads backup actif
migrations testées
admin créé
MFA disponible
permissions configurées
logs actifs
monitoring actif
alertes actives
tests passés
documentation prête
plan rollback prêt
```

---

# 29. Livrables attendus

Produire :

## A. Audit DevOps

```text
Élément | État actuel | Risque | Recommandation | Priorité
```

## B. Plan de tests

```text
Type de test | Scénarios | Outils | Priorité
```

## C. Plan de déploiement

```text
Local
Development
Staging
Production
```

## D. Plan sauvegarde/restauration

```text
Fréquence
Emplacement
Rétention
Procédure restauration
Test restauration
```

## E. Pipeline CI/CD

Produire un exemple adapté au projet.

## F. Checklist production

Liste complète avant lancement client.

## G. Tickets techniques

Créer des tickets exploitables.

---

# 30. Tickets minimum à générer

Générer au minimum :

```text
1. Créer configuration multi-environnements
2. Créer Dockerfile backend
3. Créer docker-compose production
4. Configurer Nginx HTTPS reverse proxy
5. Ajouter pipeline CI/CD
6. Ajouter tests unitaires services critiques
7. Ajouter tests intégration auth/permissions
8. Ajouter tests transaction débit/crédit
9. Ajouter tests workflow
10. Ajouter tests budget
11. Ajouter tests stock
12. Ajouter seed demo
13. Ajouter script backup database
14. Ajouter script restore database
15. Ajouter backup uploads
16. Ajouter monitoring API
17. Ajouter logs structurés
18. Ajouter requestId dans logs
19. Ajouter health check endpoint
20. Ajouter documentation deployment
21. Ajouter checklist production
22. Ajouter sécurité upload fichiers
23. Ajouter pagination obligatoire
24. Ajouter index base de données critiques
25. Ajouter rapport erreurs production
```

---

# 31. Format des tickets

Chaque ticket doit contenir :

```text
Titre :
Priorité :
Complexité :
Contexte :
Objectif :
Fichiers concernés :
Travail à faire :
Critères d’acceptation :
Tests :
Risques :
Dépendances :
```

---

# 32. Résultat final attendu

La réponse finale doit contenir :

1. Résumé exécutif.
2. Évaluation DevOps actuelle.
3. Risques production.
4. Plan environnements.
5. Plan Docker.
6. Plan CI/CD.
7. Plan tests.
8. Plan sécurité technique.
9. Plan sauvegarde/restauration.
10. Plan monitoring/logs.
11. Checklist production.
12. Roadmap DevOps.
13. Tickets techniques.
14. Conclusion : prêt ou pas prêt pour client réel.

---

# 33. Conclusion

Le but final est de rendre l’ERP/SIFA :

```text
déployable
testable
sécurisé
sauvegardé
monitoré
maintenable
commercialisable
```

Un ERP/SIFA qui gère la finance, les stocks, les salaires et les documents doit être traité comme un système critique.

La qualité technique est une condition essentielle pour vendre à des clients sérieux.

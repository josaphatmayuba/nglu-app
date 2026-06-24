# NgluERP — Deployment Guide

Three environments, three configurations.

| Environnement | Domaine | Branche Git | Localisation | BD |
|---|---|---|---|---|
| **Local** | http://localhost:3000 | n'importe quelle branche | Machine du dev | MySQL container local |
| **Development** | https://dev.ongdngolu.org + https://dev.avelomi.com | `develop` | Lightsail (16.54.167.125) | MySQL container sur le serveur |
| **Production** | https://ongdngolu.org | `master` | Lightsail (16.54.167.125) | MySQL externe (35.169.124.49) |

---

## Contrat de routage production

Ne pas remettre le CRM a la racine du domaine.

- `https://ongdngolu.org/` sert le build Vue `marketing-site/dist/`.
- `https://ongdngolu.org/crm` est l'entree officielle du CRM.
- Le CRM React utilise encore les routes internes `/admin/*` et les chunks Vite `/assets/*`; nginx les reserve au frontend CRM.
- `https://ongdngolu.org/api/*` reste le proxy vers middleware/backend.
- Do not move the CRM back to the production domain root.

Les garde-fous sont dans `nginx/nginx.frontend.conf`, `docker-compose.prod.yml`, `PRODUCTION_ROUTING.md` et `marketing-site/README.md`. Si le routage change, mettre a jour ces fichiers dans le meme commit.

Verifier le contrat avant de merger tout changement de routing :

```bash
node scripts/check-routing-contract.mjs
node scripts/smoke-routing-contract.mjs
```

Voir aussi `DEVELOPMENT_RULES.md` pour les règles globales, notamment la politique de suppression logique: toute suppression fonctionnelle doit mettre `status=false` sauf validation explicite d'une suppression physique.

---

## Statut backend actif et deprecation Laravel

`backend2/` (NestJS, port local `8001`) est l'API active pour le local, le dev et la production. Toute nouvelle API, regle metier, correction de comportement serveur ou migration applicative doit etre faite dans `backend2/`, avec le schema Drizzle dans `backend2/src/database/schema.ts`.

`backend/` (Laravel, port local `8000`) est deprecie. Il reste dans le depot pour l'historique de migration, la reference des anciennes migrations et les verifications de compatibilite. Ne pas y ajouter de nouveaux endpoints ni de nouvelles fonctionnalites, sauf ticket explicite de nettoyage/documentation Laravel.

La base MySQL reste partagee: le schema initial cree pendant la phase Laravel est encore consomme par NestJS. Les changements de schema courants doivent etre portes cote backend2/migrations actuelles, sans modifier Laravel par habitude.

En local, le service Laravel peut etre arrete quand il n'est pas necessaire:

```bash
docker compose stop backend
```

Garder `mysql`, `backend2`, `middleware` et `frontend` actifs pour tester l'application courante.

---

## 1. Workflow Local

Démarre l'application complète sur ta machine pour développer rapidement.

```bash
# Stack Docker complete (MySQL + backend + frontend + marketing Vue + phpMyAdmin + Mailpit)
docker compose up -d
# Frontend     : http://localhost:3000
# Marketing    : http://localhost:3002
# Backend2 API : http://localhost:8001
# phpMyAdmin   : http://localhost:8080
# Mailpit      : http://localhost:8025
```

**Ou** seulement le frontend en hot-reload (le backend doit déjà tourner ailleurs) :
```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```

**Note** : Le frontend lit `frontend/.env` (par défaut `VITE_APP_API=http://localhost:8001`). Pour viser un autre backend, crée `frontend/.env.local` qui override.

Pour travailler seulement sur le marketing-site Vue :
```bash
cd marketing-site
npm install
npm run dev
```

Avant de deployer dev/prod, generer le build statique attendu par nginx :
```bash
cd marketing-site
npm install
npm run build
```

---

## 2. Workflow Development

Bitbucket Pipelines is currently not the source of truth for dev deployment. Manual AWS dev deployment is required until the pipeline is restored and validated.

Use the standard deployment tools:

```powershell
# Frontend (build:dev + assert API target + upload + smoke)
.\scripts\deploy-dev-aws.ps1

# Backend2 (NestJS build + upload dist + restart container + health check)
.\scripts\deploy-dev-backend-aws.ps1

# Middleware (pack src/ + rebuild container image + health check)
.\scripts\deploy-dev-middleware-aws.ps1

# All three in sequence
.\scripts\deploy-dev-aws.ps1; .\scripts\deploy-dev-backend-aws.ps1; .\scripts\deploy-dev-middleware-aws.ps1
```

See `DEPLOYMENT_DEV_AWS.md` for PEM keys, lock behavior, smoke checks, and browser validation rules.

Push sur `develop` garde le remote a jour, puis le deploiement manuel publie sur dev.ongdngolu.org.

```bash
git checkout develop
# ... tes changements ...
git add -A && git commit -m "feat: nouvelle feature"
git push origin develop
```

Surveiller le déploiement :
- Site : https://dev.ongdngolu.org
- Logs serveur : `ssh admin@16.54.167.125 'docker logs -f nglu_dev_backend2'`

---

## 3. Workflow Production (promotion develop → master)

Une fois testé sur dev :

```bash
git checkout master
git merge --no-ff develop
git push origin master
# La pipeline déploie sur ongdngolu.org
```

Ou via Pull Request dans Bitbucket : `develop → master`, puis merge.


Bitbucket Pipelines is currently not the source of truth for production deployment either. After release approval and after `master` is updated, use the standard production deployment tool:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\deploy-prod-aws.ps1 -ConfirmProduction DEPLOY_PROD
```

See `DEPLOYMENT_PROD_AWS.md` for production lock behavior, PEM keys, routing smoke checks, and final browser validation rules.

---

## 4. Setup serveur initial (UNE seule fois)

Toutes les commandes ci-dessous sont à exécuter sur le serveur Lightsail `admin@16.54.167.125`.

### a. Cloner et initialiser

```bash
ssh -i ~/.ssh/LightsailDefaultKey-ca-central-1.pem admin@16.54.167.125

# Si /opt/nglu-app existe déjà (prod) — sauter le clone prod
ls /opt/nglu-app && echo "Prod déjà en place"

# Initialiser le serveur (réseau partagé, dossiers, etc.)
chmod +x /opt/nglu-app/scripts/init-server.sh
/opt/nglu-app/scripts/init-server.sh

# Cloner la branche develop pour le dev stack
git clone -b develop https://bitbucket.org/ngolu-ong-gestion/nglu-app.git /opt/nglu-app-dev
```

### b. Remplir les fichiers .env

```bash
# Production
cp /opt/nglu-app/.env.prod.example /opt/nglu-app/.env.prod
nano /opt/nglu-app/.env.prod   # Remplir DB_PASSWORD, JWT_SECRET, etc.
cp /opt/nglu-app/.env.prod /opt/nglu-app/.env  # Docker Compose lit .env par défaut

# Development
cp /opt/nglu-app-dev/.env.dev.example /opt/nglu-app-dev/.env.dev
# Générer un JWT_SECRET unique pour dev (différent de prod !) :
echo "JWT_SECRET=$(openssl rand -hex 32)" >> /opt/nglu-app-dev/.env.dev
nano /opt/nglu-app-dev/.env.dev   # Remplir DB_PASSWORD, DB_ROOT_PASSWORD
cp /opt/nglu-app-dev/.env.dev /opt/nglu-app-dev/.env
```

### c. Émettre le certificat SSL pour les domaines dev

**Prérequis** :
- DNS `dev.ongdngolu.org` doit pointer vers `16.54.167.125`
- DNS `dev.avelomi.com` doit pointer vers `16.54.167.125`
- Le port 80 doit être accessible
- Le container `nglu_prod_frontend` doit tourner (il sert le challenge ACME)

```bash
chmod +x /opt/nglu-app/scripts/issue-cert-dev.sh
/opt/nglu-app/scripts/issue-cert-dev.sh
```

### d. Installer le cron de protection mémoire

```bash
chmod +x /opt/nglu-app/scripts/monitor-memory.sh
(crontab -l 2>/dev/null; echo "*/5 * * * * /opt/nglu-app/scripts/monitor-memory.sh") | crontab -
crontab -l   # Vérifier
```

### e. Lancer les stacks

```bash
cd /opt/nglu-app && make prod-build         # rebuild prod avec le nouveau nginx config
cd /opt/nglu-app-dev && make dev-build      # premier démarrage dev (build MySQL + backend + middleware)
make status
```

---

## 5. Gestion mémoire

Le serveur Lightsail n'a que **512MB RAM** + 2GB de swap. Les deux stacks combinés consomment ~600MB.

**Vérifier l'état** :
```bash
make mem
```

**Arrêter dev quand inutilisé** (libère ~400MB) :
```bash
make dev-down
```

**Redémarrer dev** (le volume MySQL persiste, les données restent) :
```bash
make dev-up
```

**Le cron auto-stop** dev si swap > 1.5GB. Voir les évènements :
```bash
journalctl -t nglu-monitor --since "1 hour ago"
```

---

## 6. Renouvellement SSL

Let's Encrypt expire tous les 90 jours. Certbot a normalement un cron auto. Tester :

```bash
sudo certbot renew --dry-run
# Doit lister ongdngolu.org ET dev.ongdngolu.org
```

Après renew, recharger nginx :
```bash
make nginx-reload
```

---

## 7. Tester la configuration nginx avant reload

Si tu modifies `nginx/nginx.frontend.conf` (monté en volume — pas besoin de rebuild) :

```bash
# Pousse les changements via git develop/master ou édite directement /opt/nglu-app/nginx/nginx.frontend.conf
make nginx-test       # vérifie la syntaxe
make nginx-reload     # test + reload si OK
```

---

## 7b. Smoke test apres deploiement

Apres chaque deploiement dev/prod, utiliser la checklist centralisee :

- [`DEPLOYMENT_SMOKE_CHECKLIST.md`](./DEPLOYMENT_SMOKE_CHECKLIST.md)

Elle couvre les routes frontend, l'entree CRM, la racine marketing, l'API health, Docker Compose, les migrations backend et les assets frontend.

---

## 7c. Deploiement CRM dev sans build sur Lightsail

La petite instance Lightsail peut echouer pendant le build React/Vite du CRM avec `JavaScript heap out of memory`. Ne pas builder le CRM complet sur le serveur quand la memoire est limitee.

Procedure officielle: builder `frontend/dist` localement, puis deployer via le script canonique:

```powershell
.\scripts\deploy-dev-aws.ps1
```

Le script:

- execute `npm run build:dev` dans `frontend/` (cible `https://dev.ongdngolu.org/api`);
- compresse `frontend/dist`;
- acquiert le verrou `/tmp/nglu-dev-deploy.lock` sur le serveur;
- remplace seulement le contenu de `/opt/nglu-app-dev/frontend/dist`;
- verifie que le dist deploye contient `https://dev.ongdngolu.org/api`;
- verifie que `/`, `/admin/dashboard`, `/admin/company-setting` et `/api/health` repondent.

Pour ignorer la phase de build (si `frontend/dist` est deja frais):

```powershell
.\scripts\deploy-dev-aws.ps1 -SkipLocalBuild
```

Pour rafraichir le bind mount nginx apres un remplacement complet du dossier `dist`:

```powershell
.\scripts\deploy-dev-aws.ps1 -RestartFrontendContainer
```

Le marketing-site Vue reste separe et continue d'etre servi depuis `marketing-site/dist`. Le routage ne change pas: racine = marketing, `/crm` = CRM.

> `scripts/deploy-dev-frontend-artifact.ps1` est garde pour reference historique mais est remplace par `deploy-dev-aws.ps1` qui inclut le verrou de deploiement et les smoke checks complets.

---

## 8. Architecture mémo

```
                Internet
                   ↓ :80 / :443
        ┌──────────────────────────────────┐
        │  nglu_prod_frontend  (nginx)     │
        │  ─ Termine SSL pour les 2 domains│
        │  ─ Config montée /nginx/         │
        └──────────────────────────────────┘
                ↓                ↓
        ongdngolu.org      dev.ongdngolu.org
                ↓                ↓
        nglu_prod_*        nglu_dev_*
        ─ backend2         ─ backend2
        ─ middleware       ─ middleware
                           ─ mysql (container)
        ↓
        External DB
        35.169.124.49
```

**Réseaux Docker** :
- `nglu_prod_network` — interne au stack prod
- `nglu_dev_network` — interne au stack dev
- `nglu_shared` (externe) — frontend ↔ dev_middleware (cross-stack DNS resolution)

---

## 9. Troubleshooting

### "Cannot connect to dev.ongdngolu.org"
1. Vérifier DNS : `dig dev.ongdngolu.org +short` → doit retourner `16.54.167.125`
2. Vérifier que le cert existe : `sudo certbot certificates | grep dev`
3. Vérifier nginx : `make nginx-test`
4. Vérifier que dev_middleware tourne : `docker ps | grep nglu_dev_middleware`

### "502 Bad Gateway sur dev"
- Le container `nglu_dev_middleware` n'est pas dans le réseau `nglu_shared`
- Vérifier : `docker network inspect nglu_shared` → doit lister nglu_dev_middleware ET nglu_prod_frontend

### "Dev MySQL refuse les connexions"
- Vérifier que mysql est healthy : `docker ps | grep nglu_dev_mysql`
- Vérifier les credentials dans `.env.dev`
- Logs : `docker logs nglu_dev_mysql --tail 50`

### Swap > 1.5GB → dev s'arrête tout seul
- Comportement attendu (protection prod)
- Redémarrer manuellement quand tu en as besoin : `make dev-up`
- Si récurrent, considérer migrer dev MySQL vers le serveur DB externe (option simple) ou réduire encore mem_limit

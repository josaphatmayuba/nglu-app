# Incident prod — frontend nginx (juin 2026)

> **Statut : RÉSOLU (contournement appliqué).** Un nettoyage propre reste à faire — voir §4.

## 1. Symptômes
- `https://ongdngolu.org/` (site marketing) → **HTTP 500**
- `https://ongdngolu.org/domus/` → **HTTP 500**
- `https://ongdngolu.org/admin/` (CRM) → 200 (OK)
- Logs nginx : `rewrite or internal redirection cycle while internally redirecting to "/index.html"`
- Détecté le **2026-06-04**, cassé depuis le **2 juin ~10 h** (conteneur `nglu_prod_frontend` recréé à ce moment-là).

## 2. Cause racine
Le conteneur `nglu_prod_frontend` a été **recréé sous le mauvais projet docker compose** : `nglu-app`
(image `nglu-app-frontend`) au lieu de **`nglu_prod`** (où vivent redis/backend/middleware).

Le design prévu (`frontend/Dockerfile.prod`) **bake** le CRM (`frontend/dist`) **et** le site marketing
(`marketing-site/dist`) dans l'image, et ne bind-monte que les dist **dev**. L'image utilisée le 2 juin
ne contenait **pas** la racine marketing `/usr/share/nginx/html-marketing-prod` → `try_files … /index.html`
boucle → 500. Le CRM `/admin` survivait car son contenu (`/usr/share/nginx/html`) était baké.

> ⚠️ **Sans rapport avec les déploiements dev.** `scripts/deploy-dev-*.ps1` ne touchent que
> `/opt/nglu-app-dev/...` et ne redémarrent pas nginx (uptime 40 h au moment du diagnostic).

## 3. Contournement appliqué (le 2026-06-04)
Sur l'hôte `admin@16.54.167.125`, fichier `/opt/nglu-app/docker-compose.prod.yml` (backup
`docker-compose.prod.yml.bak-<timestamp>` créé) — ajout sous `volumes:` du service `frontend`,
pointant vers les dist prod **déjà présents sur l'hôte** (build du 30 mai) :

```yaml
      - /opt/nglu-app/frontend/dist:/usr/share/nginx/html:ro
      - /opt/nglu-app/marketing-site/dist:/usr/share/nginx/html-marketing-prod:ro
```

Puis recréation du **frontend seul**, sans rebuild ni toucher aux dépendances :

```bash
cd /opt/nglu-app
docker compose -p nglu-app -f docker-compose.prod.yml up -d --no-deps --no-build frontend
```

- `--no-deps` est **obligatoire** : sinon compose tente de recréer `nglu_prod_redis`/backend
  (projet `nglu_prod`) → conflit de `container_name` → abort.
- `--no-build` : réutilise l'image existante.

Vérif : `/` 200, `/admin/` 200. ✅

## 4. À faire proprement (à froid, hors urgence)
1. **Remettre le frontend sous le bon projet `nglu_prod`** et rebuild conforme au design baked :
   ```bash
   cd /opt/nglu-app
   make prod-build   # = docker compose -p nglu_prod -f docker-compose.prod.yml --env-file .env.prod up -d --build
   ```
   Valider d'abord que ça ne recrée/casse pas les autres conteneurs `nglu_prod_*` (container_name fixes).
   Si on reste sur l'approche bind-mount, committer les 2 lignes ajoutées dans le compose versionné.
2. **`/farmos/` prod = 404** et **`/domus/` prod = contenu marketing** : les dist `farmos-app/dist`
   et `domus-app/dist` n'existent pas sur l'hôte prod, et la config nginx prod montée est plus
   ancienne que le repo (pas de bloc `/domus/`). Déploiement prod FarmOS/Domus = travail à part
   (voir `MIGRATION-PROD-DOMUS.md`).
3. S'assurer que le **script de déploiement prod** recrée toujours le frontend avec `-p nglu_prod`
   pour éviter que la régression se reproduise.

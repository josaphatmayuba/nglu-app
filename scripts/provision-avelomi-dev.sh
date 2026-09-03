#!/bin/bash
# ──────────────────────────────────────────────────────────────────────────────
# One-time provisioning of the ISOLATED DEV stack on the Avelomi server
# (3.128.45.29). This brings up a self-contained dev environment alongside the
# existing Avelomi PROD stack on the SAME machine, so that dev.avelomi.com tests
# the dev backend (branche develop) instead of pointing at prod.
#
# Apres ce script + le pipeline (push develop), dev.avelomi.com proxie /api vers
# nglu_dev_middleware (cf nginx.avelomi-dev.conf), lui-meme relie a nglu_dev_backend2
# + nglu_dev_mysql, totalement separes du prod (nglu_prod_*).
#
# Run this ONCE on the Avelomi server as the `admin` user:
#     ssh -i <avelomi-key>.pem admin@3.128.45.29
#     bash provision-avelomi-dev.sh        # scp ce fichier d'abord
#
# Idempotent : re-jouable. Il S'ARRETE et te demande le secret (.env.dev).
#
# Cohabitation prod/dev sur la meme machine :
#   - Projet compose -p nglu_dev (vs -p nglu_prod) : conteneurs/volumes distincts.
#   - docker-compose.dev.yml n'expose AUCUN port hote => zero collision avec prod.
#   - DB dev = conteneur LOCAL nglu_dev_mysql (volume nglu_dev_mysql_data), PAS la
#     base prod distante. Donnees dev jetables, etanches du prod Avelomi.
#   - Reseau nglu_shared (externe, partage avec nglu_prod_frontend) => le nginx
#     dev.avelomi.com peut joindre nglu_dev_middleware par son nom.
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

APP=/opt/nglu-app-dev

log() { echo "─── $* ───"; }

# ── 1. Prerequis : Docker + reseau partage (normalement deja la via prod) ─────
if ! command -v docker >/dev/null 2>&1; then
  echo "  ✗ Docker absent — lance d'abord provision-avelomi.sh (stack prod)." >&2
  exit 1
fi
log "Reseau partage nglu_shared"
docker network create nglu_shared 2>/dev/null && echo "  ✓ nglu_shared cree" || echo "  ✓ nglu_shared deja present"

# ── 2. Dossier dev ────────────────────────────────────────────────────────────
log "Dossier $APP"
sudo mkdir -p "$APP"
sudo chown -R "$(id -un):$(id -un)" "$APP"

# ── 3. .env.dev (SECRET — a ta charge) ────────────────────────────────────────
# Le compose dev lit DB_*, JWT_SECRET, REFRESH_SECRET, CORS_ORIGIN, APP_URL...
# (cf docker-compose.dev.yml). Surcharge CORS/APP_URL pour dev.avelomi.com.
if [ ! -f "$APP/.env.dev" ]; then
  cat >&2 <<'EOF'

  ⚠ ACTION REQUISE — cree /opt/nglu-app-dev/.env.dev AVANT de relancer.
    Stack dev ISOLE (DB locale jetable dans le conteneur nglu_dev_mysql) :

      DB_ROOT_PASSWORD=...            # openssl rand -hex 16
      DB_DATABASE=nglu_dev_db
      DB_USERNAME=nglu_dev
      DB_PASSWORD=...                 # openssl rand -hex 16
      JWT_SECRET=...                  # openssl rand -hex 32 (distinct du prod)
      REFRESH_SECRET=...              # openssl rand -hex 32 (distinct du prod)
      CORS_ORIGIN=https://dev.avelomi.com
      APP_URL=https://dev.avelomi.com
      FRONTEND_URL=https://dev.avelomi.com/crm
      REDIS_ENABLED=true

    NB : la DB dev est CREEE par le conteneur nglu_dev_mysql au 1er boot
    (MYSQL_DATABASE/USER/PASSWORD ci-dessus) ; le backend2 applique ensuite
    les migrations Drizzle. Rien a creer sur un serveur distant.

  Relance ce script une fois .env.dev rempli.
EOF
  exit 10
else
  echo "  ✓ .env.dev present"
fi

# ── 4. Compose dev present ? (sinon le pipeline le scp au 1er deploy) ─────────
if [ ! -f "$APP/docker-compose.dev.yml" ]; then
  echo "  ⚠ $APP/docker-compose.dev.yml absent — le pipeline (push develop) le scp."
  echo "    Tu peux aussi le scp a la main depuis ton poste pour booter tout de suite."
fi

# ── 5. Premier boot du stack dev (si le compose est la) ───────────────────────
if [ -f "$APP/docker-compose.dev.yml" ]; then
  log "Boot du stack dev (projet nglu_dev)"
  cd "$APP"
  docker compose -p nglu_dev -f docker-compose.dev.yml --env-file .env.dev up -d --build
  log "Status"
  docker compose -p nglu_dev -f docker-compose.dev.yml ps
fi

cat <<EOF

✓ Stack dev Avelomi provisionne (ou pret a l'etre apres le 1er push develop).

Pour que dev.avelomi.com tape ce backend dev :
  - nginx.avelomi-dev.conf pointe deja \$backend -> nglu_dev_middleware:3001.
  - Le step "Avelomi-site → dev" du pipeline reinstalle cette conf nginx et
    recree nglu_prod_frontend ; verifie que dev.avelomi.com repond apres deploy.

Verifs :
  docker logs nglu_dev_backend2 --tail 50      # migrations Drizzle au boot
  curl -sk https://dev.avelomi.com/api/ -I     # via nglu_dev_middleware
EOF

#!/bin/bash
# ──────────────────────────────────────────────────────────────────────────────
# One-time provisioning for the Avelomi production server (3.128.45.29).
#
# Avelomi is a SEPARATE, self-contained production stack (its own DB, its own
# frontend/backend) serving the avelomi.com domain. It reuses the SAME
# docker-compose.prod.yml as ongdngolu — only the .env.prod differs.
#
# Run this ONCE on the Avelomi server as the `admin` user:
#     ssh -i LightsailDefaultKey-us-east-2-3.128.45.29.pem admin@3.128.45.29
#     curl -fsSL <repo>/scripts/provision-avelomi.sh | bash      # or scp + bash
#
# It is idempotent: re-running it skips steps already done. It STOPS and prompts
# you at the points that need real secrets (.env.prod, TLS cert, DB password).
#
# Prerequisites you must arrange BEFORE running:
#   - DNS: avelomi.com (and www) → 3.128.45.29
#   - The Bitbucket CI SSH *public* key is in ~/.ssh/authorized_keys here, so the
#     pipeline can deploy after provisioning (see "Pipeline access" at the end).
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

APP=/opt/nglu-app
REPO_URL="${REPO_URL:-https://bitbucket.org/ngolu-ong-gestion/nglu-app.git}"
BRANCH="${BRANCH:-master}"
DOMAIN="${DOMAIN:-avelomi.com}"
CERT_EMAIL="${CERT_EMAIL:-admin@avelomi.com}"
# Static apps that the prod compose bind-mounts from /opt/nglu-app-dev (dev assets).
# On a server WITHOUT a dev stack these paths don't exist and the frontend
# container fails to start, so we create empty dirs to satisfy the :ro mounts.
DEV_MOUNT_APPS="frontend marketing-site farmos-app batipro-app hr-app comptabilite-app domus-app journal-app migration-app tickets-app chat-app"

log() { echo "─── $* ───"; }

# ── 1. Docker ────────────────────────────────────────────────────────────────
if ! command -v docker >/dev/null 2>&1; then
  log "Installing Docker"
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$(id -un)"
  echo "  ✓ Docker installed — you may need to re-login for the docker group to apply"
else
  echo "  ✓ Docker already installed"
fi

# certbot for TLS
if ! command -v certbot >/dev/null 2>&1; then
  log "Installing certbot"
  sudo apt-get update -y && sudo apt-get install -y certbot
fi

# ── 2. Shared resources (mirror init-server.sh) ──────────────────────────────
log "Creating shared Docker network"
docker network create nglu_shared 2>/dev/null && echo "  ✓ nglu_shared created" || echo "  ✓ nglu_shared already exists"

log "Creating certbot webroot"
sudo mkdir -p /var/www/certbot && sudo chmod 755 /var/www/certbot

# ── 3. Clone the repo ────────────────────────────────────────────────────────
if [ ! -d "$APP/.git" ]; then
  log "Cloning $BRANCH into $APP"
  sudo mkdir -p "$APP"
  sudo chown "$(id -un):$(id -un)" "$APP"
  git clone -b "$BRANCH" "$REPO_URL" "$APP"
else
  log "Repo present — pulling $BRANCH"
  git -C "$APP" pull origin "$BRANCH" || echo "  (pull skipped)"
fi

# ── 4. Empty dirs for the dev bind-mounts (so the prod frontend can boot) ─────
log "Creating placeholder dirs for dev :ro bind-mounts"
for a in $DEV_MOUNT_APPS; do
  sudo mkdir -p "/opt/nglu-app-dev/$a/dist"
done
sudo chown -R "$(id -un):$(id -un)" /opt/nglu-app-dev
echo "  ✓ placeholder dev dirs created (Avelomi has no dev stack — these stay empty)"

# ── 5. .env.prod ─────────────────────────────────────────────────────────────
if [ ! -f "$APP/.env.prod" ]; then
  log "Creating $APP/.env.prod from template (Avelomi values)"
  cp "$APP/.env.prod.example" "$APP/.env.prod"
  # Pre-fill domain-derived URLs + the Avelomi DB target. Avelomi uses the SAME
  # DB SERVER as ongdngolu (35.169.124.49:9306) but a SEPARATE database
  # (avelomi_db) — données clients commerciaux étanches de l'ONG. Secrets still
  # need YOUR input. The avelomi_db database + grant must exist on that server.
  sed -i \
    -e "s#https://ongdngolu.org/crm#https://$DOMAIN/crm#g" \
    -e "s#https://ongdngolu.org#https://$DOMAIN#g" \
    -e "s#^DB_DATABASE=.*#DB_DATABASE=${AVELOMI_DB:-avelomi_db}#" \
    "$APP/.env.prod"
  cat >&2 <<EOF

  ⚠ ACTION REQUISE — édite $APP/.env.prod AVANT de continuer :
     - DB : MÊME serveur qu'ongdngolu (DB_HOST=35.169.124.49 DB_PORT=9306) mais
       BASE DIFFÉRENTE → DB_DATABASE=avelomi_db (déjà pré-rempli). Vérifie
       DB_USERNAME/DB_PASSWORD (un user ayant accès à avelomi_db). La base
       avelomi_db + le GRANT doivent EXISTER sur 35.169.124.49 (créer si besoin :
       CREATE DATABASE avelomi_db; GRANT ... ON avelomi_db.*). Le backend2
       applique les migrations Drizzle au boot → schéma créé dans avelomi_db.
     - JWT_SECRET / REFRESH_SECRET : openssl rand -hex 32  (NOUVEAUX, distincts d'ongdngolu)
     - SMTP_*/IMAP_*/STALWART_* : la messagerie Avelomi (ou laisse vide si pas de mail)
     - TWILIO_* : si SMS

  Relance ce script une fois .env.prod rempli — il reprendra à l'étape TLS.
EOF
  exit 10
else
  echo "  ✓ .env.prod already present"
fi

# ── 6. TLS certificate (needs nginx serving the ACME challenge OR standalone) ─
if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
  log "Issuing Let's Encrypt cert for $DOMAIN (standalone — port 80 must be free)"
  sudo certbot certonly --standalone \
    -d "$DOMAIN" -d "www.$DOMAIN" \
    --email "$CERT_EMAIL" --agree-tos --non-interactive
  echo "  ✓ cert issued"
else
  echo "  ✓ cert for $DOMAIN already present"
fi

# ── 7. Install Avelomi nginx config (single-domain avelomi.com) ──────────────
# The compose frontend mounts nginx/nginx.frontend.conf. On Avelomi that path
# must hold the avelomi.com config, NOT the ongdngolu dual-domain one (whose
# dev.ongdngolu.org cert is absent here -> nginx -t fails). The pipeline keeps
# this in sync on every static deploy via SUPPORT_CONF; we seed it here so the
# very first boot already serves the right vhost.
log "Installing Avelomi nginx config"
cp "$APP/nginx/nginx.avelomi.conf" "$APP/nginx/nginx.frontend.conf"

# ── 8. First boot of the full prod stack ─────────────────────────────────────
log "Building & starting the Avelomi prod stack"
cd "$APP"
docker compose -p nglu_prod -f docker-compose.prod.yml --env-file .env.prod up -d --build

log "Status"
docker compose -p nglu_prod -f docker-compose.prod.yml ps

cat <<EOF

✓ Avelomi provisionné.

Vérifs :
  curl -I https://$DOMAIN
  docker logs nglu_prod_backend2 --tail 50      # migrations Drizzle auto-appliquées au boot

Pipeline access (pour que Bitbucket déploie ensuite) :
  - La clé PUBLIQUE CI doit être dans ~/.ssh/authorized_keys ici.
  - Côté pipeline : le step master déploiera vers ce serveur via les variables
    AVELOMI_SERVER / AVELOMI_BASE_URL (voir bitbucket-pipelines.yml).

NB nginx : nginx/nginx.frontend.conf contient des server_name ongdngolu.org en dur.
Le frontend répond quand même par défaut, mais pour un vrai vhost avelomi.com
(redirections/HSTS propres), adapte la conf — étape distincte de ce provisioning.
EOF

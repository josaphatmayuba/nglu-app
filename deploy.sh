#!/bin/bash
# Usage:
#   ./deploy.sh           # deploys prod (default)
#   ./deploy.sh prod
#   ./deploy.sh dev
set -e

ENV="${1:-prod}"

case "$ENV" in
  prod)
    APP_DIR="/opt/nglu-app"
    COMPOSE_FILE="docker-compose.prod.yml"
    ENV_FILE=".env.prod"
    PROJECT="nglu_prod"
    BRANCH="master"
    DOMAIN="ongdngolu.org"
    ;;
  dev)
    APP_DIR="/opt/nglu-app-dev"
    COMPOSE_FILE="docker-compose.dev.yml"
    ENV_FILE=".env.dev"
    PROJECT="nglu_dev"
    BRANCH="develop"
    DOMAIN="dev.ongdngolu.org"
    ;;
  *)
    echo "Usage: $0 [prod|dev]"
    exit 1
    ;;
esac

REPO_URL="https://bitbucket.org/ngolu-ong-gestion/nglu-app.git"

echo "=============================="
echo "  NgluApp Deploy: $ENV"
echo "  Target: $DOMAIN"
echo "  Dir:    $APP_DIR"
echo "=============================="

# Swap (important pour 512 Mo RAM)
if [ ! -f /swapfile ]; then
  echo "[1/6] Creation swap 2Go..."
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "     Swap activé"
else
  echo "[1/6] Swap déjà present"
fi

# Docker
if ! command -v docker &> /dev/null; then
  echo "[2/6] Installation Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
  echo "     Docker installé"
else
  echo "[2/6] Docker déjà installé : $(docker --version)"
fi

# Shared network (used by both stacks)
echo "[3/6] Réseau Docker partagé..."
docker network create nglu_shared 2>/dev/null && echo "     nglu_shared créé" || echo "     nglu_shared déjà présent"

# Clone ou pull
echo "[4/6] Mise à jour du code ($BRANCH)..."
if [ -d "$APP_DIR/.git" ]; then
  cd "$APP_DIR"
  git fetch origin
  git checkout "$BRANCH"
  git pull origin "$BRANCH"
else
  git clone -b "$BRANCH" "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

# .env file
if [ ! -f "$APP_DIR/$ENV_FILE" ]; then
  echo "[5/6] $ENV_FILE manquant — copie depuis le template..."
  if [ -f "$APP_DIR/${ENV_FILE}.example" ]; then
    cp "$APP_DIR/${ENV_FILE}.example" "$APP_DIR/$ENV_FILE"
  else
    cp "$APP_DIR/.env.${ENV}.example" "$APP_DIR/$ENV_FILE"
  fi
  echo "     ⚠️  Modifie $APP_DIR/$ENV_FILE avant de relancer (secrets à remplir)"
  exit 1
else
  echo "[5/6] $ENV_FILE existe déjà"
fi

# Build et démarrage
echo "[6/6] Build et démarrage des conteneurs ($PROJECT)..."
cd "$APP_DIR"
docker compose -p "$PROJECT" -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up --build -d

echo ""
echo "=============================="
echo "  Déploiement $ENV terminé"
echo "=============================="
docker compose -p "$PROJECT" -f "$COMPOSE_FILE" ps
echo ""
echo "  URL: https://$DOMAIN"
echo "=============================="

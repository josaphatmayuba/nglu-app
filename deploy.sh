#!/bin/bash
set -e

APP_DIR="/opt/nglu-app"
REPO_URL="https://bitbucket.org/ngolu-ong-gestion/nglu-app.git"

echo "=============================="
echo "  NgluApp Production Deploy"
echo "=============================="

# Swap (important pour 512 Mo RAM)
if [ ! -f /swapfile ]; then
  echo "[1/5] Creation swap 2Go..."
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "     Swap activé"
else
  echo "[1/5] Swap déjà present"
fi

# Docker
if ! command -v docker &> /dev/null; then
  echo "[2/5] Installation Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
  echo "     Docker installé"
else
  echo "[2/5] Docker déjà installé : $(docker --version)"
fi

# Clone ou pull
echo "[3/5] Mise à jour du code..."
if [ -d "$APP_DIR/.git" ]; then
  cd "$APP_DIR"
  git pull
else
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

# Fichier .env production
if [ ! -f "$APP_DIR/.env.prod" ]; then
  echo "[4/5] Création .env.prod (à personnaliser)..."
  cat > "$APP_DIR/.env.prod" <<EOF
DB_DATABASE=nglu_db
DB_USERNAME=nglu_user
DB_PASSWORD=ChangeMe_SecurePassword
DB_ROOT_PASSWORD=ChangeMe_RootPassword
CORS_ORIGIN=http://3.96.200.54
FRONTEND_URL=http://3.96.200.54
VITE_APP_API=http://3.96.200.54:8001
VITE_API_URL=http://3.96.200.54:8001
VITE_APP_API_NODE=http://3.96.200.54:8001
JWT_SECRET=ChangeMe_JwtSecret_$(openssl rand -hex 16)
EOF
  echo "     ATTENTION: Modifiez les mots de passe dans $APP_DIR/.env.prod"
fi

# Build et démarrage
echo "[5/5] Build et démarrage des conteneurs..."
cd "$APP_DIR"
docker compose -f docker-compose.prod.yml --env-file .env.prod down --remove-orphans 2>/dev/null || true
docker compose -f docker-compose.prod.yml --env-file .env.prod up --build -d

echo ""
echo "=============================="
echo "  Déploiement terminé !"
echo "=============================="
docker compose -f docker-compose.prod.yml ps
echo ""
echo "  Frontend : http://3.96.200.54"
echo "  Backend2 : http://3.96.200.54:8001"
echo "=============================="

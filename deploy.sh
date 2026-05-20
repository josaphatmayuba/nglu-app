#!/bin/bash

# Deployment script for NgluERP
# Usage: ./deploy.sh [dev|prod|both]

TARGET=${1:-both}
SSH_USER="admin"
SSH_HOST="16.54.167.125"
DEV_DIR="/opt/nglu-app-dev"
PROD_DIR="/opt/nglu-app"

echo "🚀 Starting deployment to AWS..."

deploy_dev() {
  echo "📦 Deploying to DEV (dev.ongdngolu.org)..."
  
  # SCP frontend dist
  echo "  Uploading frontend..."
  scp -r frontend/dist ${SSH_USER}@${SSH_HOST}:${DEV_DIR}/frontend/ 2>/dev/null
  
  # SCP backend dist
  echo "  Uploading backend..."
  scp -r backend2/dist ${SSH_USER}@${SSH_HOST}:${DEV_DIR}/backend2/ 2>/dev/null
  
  # Restart containers
  echo "  Restarting containers..."
  ssh ${SSH_USER}@${SSH_HOST} "cd ${DEV_DIR} && docker compose -p nglu_dev -f docker-compose.dev.yml --env-file .env.dev up --build -d" 2>/dev/null
  
  echo "✅ Dev deployment complete"
}

deploy_prod() {
  echo "📦 Deploying to PROD (ongdngolu.org)..."
  
  # SCP frontend dist
  echo "  Uploading frontend..."
  scp -r frontend/dist ${SSH_USER}@${SSH_HOST}:${PROD_DIR}/frontend/ 2>/dev/null
  
  # SCP backend dist
  echo "  Uploading backend..."
  scp -r backend2/dist ${SSH_USER}@${SSH_HOST}:${PROD_DIR}/backend2/ 2>/dev/null
  
  # Restart containers
  echo "  Restarting containers..."
  ssh ${SSH_USER}@${SSH_HOST} "cd ${PROD_DIR} && docker compose -p nglu_prod -f docker-compose.prod.yml --env-file .env.prod up --build -d" 2>/dev/null
  
  echo "✅ Prod deployment complete"
}

case $TARGET in
  dev)
    deploy_dev
    ;;
  prod)
    deploy_prod
    ;;
  both)
    deploy_dev
    deploy_prod
    ;;
  *)
    echo "Usage: $0 [dev|prod|both]"
    exit 1
    ;;
esac

echo "🎉 Deployment finished!"

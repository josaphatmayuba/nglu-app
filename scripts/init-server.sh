#!/bin/bash
# One-time server initialization for dev + prod stack support
# Run on admin@16.54.167.125 ONCE

set -e

echo "─── Creating shared Docker network ───"
docker network create nglu_shared 2>/dev/null && echo "  ✓ nglu_shared created" || echo "  ✓ nglu_shared already exists"

echo "─── Creating certbot webroot directory ───"
sudo mkdir -p /var/www/certbot
sudo chmod 755 /var/www/certbot

echo "─── Creating dev application directory ───"
sudo mkdir -p /opt/nglu-app-dev
sudo chown admin:admin /opt/nglu-app-dev

echo ""
echo "✓ Server initialized."
echo ""
echo "Next steps:"
echo "  1. Clone develop branch:"
echo "     git clone -b develop https://bitbucket.org/ngolu-ong-gestion/nglu-app.git /opt/nglu-app-dev"
echo "  2. Copy and fill /opt/nglu-app-dev/.env.dev (template at .env.dev.example)"
echo "  3. Run scripts/issue-cert-dev.sh to get SSL cert for dev.ongdngolu.org"
echo "  4. Install monitor cron: see DEPLOY.md"
echo "  5. Restart prod with new nginx config: cd /opt/nglu-app && make prod-build"
echo "  6. Start dev: cd /opt/nglu-app-dev && make dev-build"

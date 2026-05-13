#!/bin/bash
# Issue Let's Encrypt SSL certificate for dev.ongdngolu.org
# Prerequisite: prod nginx must be running and serving /.well-known/acme-challenge/
#               (it does — see nginx.frontend.conf HTTP server block)
# Prerequisite: DNS for dev.ongdngolu.org must point to this server (16.54.167.125)

set -e

EMAIL="${CERT_EMAIL:-admin@ongdngolu.org}"
DOMAIN="dev.ongdngolu.org"

echo "─── Issuing cert for $DOMAIN ───"
sudo certbot certonly --webroot \
  -w /var/www/certbot \
  -d "$DOMAIN" \
  --email "$EMAIL" \
  --agree-tos \
  --non-interactive

echo ""
echo "─── Reloading prod nginx to pick up new cert ───"
docker exec nglu_prod_frontend nginx -t
docker exec nglu_prod_frontend nginx -s reload

echo ""
echo "✓ Certificate issued and nginx reloaded."
echo "  Verify: curl -I https://$DOMAIN"
echo "  Cert location: /etc/letsencrypt/live/$DOMAIN/"

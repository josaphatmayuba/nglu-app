#!/bin/bash
# Issue / expand the ongdngolu development Let's Encrypt certificate.
#
# Prerequisites:
#   - DNS for dev.ongdngolu.org must point to 16.54.167.125.
#   - The prod nginx container must be running and serving /.well-known/acme-challenge/.

set -euo pipefail

EMAIL="${CERT_EMAIL:-admin@ongdngolu.org}"
PRIMARY_DOMAIN="${DEV_DOMAIN:-dev.ongdngolu.org}"

echo "Issuing/expanding dev cert: $PRIMARY_DOMAIN"
sudo certbot certonly --webroot \
  -w /var/www/certbot \
  --cert-name "$PRIMARY_DOMAIN" \
  -d "$PRIMARY_DOMAIN" \
  --expand \
  --email "$EMAIL" \
  --agree-tos \
  --non-interactive

echo ""
echo "Reloading prod nginx to pick up the dev cert"
docker exec nglu_prod_frontend nginx -t
docker exec nglu_prod_frontend nginx -s reload

echo ""
echo "Certificate issued and nginx reloaded."
echo "  Verify: curl -I https://$PRIMARY_DOMAIN"
echo "  Cert location: /etc/letsencrypt/live/$PRIMARY_DOMAIN/"

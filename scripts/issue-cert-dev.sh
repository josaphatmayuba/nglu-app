#!/bin/bash
# Issue / expand the shared development Let's Encrypt certificate.
#
# Prerequisites:
#   - DNS for dev.ongdngolu.org must point to 16.54.167.125.
#   - DNS for dev.avelomi.com must point to 16.54.167.125.
#   - The prod nginx container must be running and serving /.well-known/acme-challenge/.

set -euo pipefail

EMAIL="${CERT_EMAIL:-admin@ongdngolu.org}"
PRIMARY_DOMAIN="${DEV_DOMAIN:-dev.ongdngolu.org}"
AVELOMI_DEV_DOMAIN="${AVELOMI_DEV_DOMAIN:-dev.avelomi.com}"

DOMAINS=("$PRIMARY_DOMAIN")
if [ -n "$AVELOMI_DEV_DOMAIN" ]; then
  DOMAINS+=("$AVELOMI_DEV_DOMAIN")
fi

CERTBOT_DOMAIN_ARGS=()
for domain in "${DOMAINS[@]}"; do
  CERTBOT_DOMAIN_ARGS+=("-d" "$domain")
done

echo "Issuing/expanding dev cert: ${DOMAINS[*]}"
sudo certbot certonly --webroot \
  -w /var/www/certbot \
  --cert-name "$PRIMARY_DOMAIN" \
  "${CERTBOT_DOMAIN_ARGS[@]}" \
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
for domain in "${DOMAINS[@]}"; do
  echo "  Verify: curl -I https://$domain"
done
echo "  Cert location: /etc/letsencrypt/live/$PRIMARY_DOMAIN/"

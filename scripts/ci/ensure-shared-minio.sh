#!/usr/bin/env sh
# Garantit UNE seule instance MinIO partagee par dev + prod sur le reseau
# externe `nglu_shared`, avec alias reseau `minio` (ce que le backend attend
# par defaut via OBJECT_STORAGE_ENDPOINT=http://minio:9000).
#
# Contexte: le pipeline lance les services en `up --no-deps`, donc le service
# `minio` du docker-compose n'est JAMAIS cree. Sans ce script, tout endpoint
# photos (Domus) renvoie 500 -> `getaddrinfo EAI_AGAIN minio`.
#
# Idempotent: peut etre rejoue a chaque deploiement backend (dev ET prod).
# A executer SUR le serveur (via ssh). Prend un unique argument: le nom du
# conteneur backend a rattacher au reseau partage.
#
# Usage: ensure-shared-minio.sh <backend_container_name>
set -eu

BACKEND_CONTAINER="${1:?usage: ensure-shared-minio.sh <backend_container_name>}"
MINIO_CONTAINER="nglu_minio_shared"
SHARED_NETWORK="nglu_shared"
MINIO_ALIAS="minio"
MINIO_VOLUME="nglu_prod_minio_data"
MINIO_IMAGE="minio/minio:latest"
BUCKET="${OBJECT_STORAGE_BUCKET:-nglu-files}"

# docker peut exiger sudo selon l'hote
DOCKER=docker
if ! docker ps >/dev/null 2>&1; then
  DOCKER="sudo -n docker"
fi

# 1) Reseau partage (idempotent)
$DOCKER network inspect "$SHARED_NETWORK" >/dev/null 2>&1 \
  || $DOCKER network create "$SHARED_NETWORK"

# 2) Instance MinIO unique. On derive les credentials du backend deja deploye
#    (OBJECT_STORAGE_ACCESS_KEY_ID / _SECRET_ACCESS_KEY) pour rester aligne
#    sans jamais les afficher.
if ! $DOCKER ps --format '{{.Names}}' | grep -qx "$MINIO_CONTAINER"; then
  MU="$($DOCKER exec "$BACKEND_CONTAINER" printenv OBJECT_STORAGE_ACCESS_KEY_ID)"
  MP="$($DOCKER exec "$BACKEND_CONTAINER" printenv OBJECT_STORAGE_SECRET_ACCESS_KEY)"
  $DOCKER rm -f "$MINIO_CONTAINER" >/dev/null 2>&1 || true
  $DOCKER run -d --name "$MINIO_CONTAINER" --restart unless-stopped \
    --network "$SHARED_NETWORK" --network-alias "$MINIO_ALIAS" \
    -v "$MINIO_VOLUME":/data \
    -e MINIO_ROOT_USER="$MU" -e MINIO_ROOT_PASSWORD="$MP" \
    "$MINIO_IMAGE" server /data --console-address ":9001" >/dev/null
  echo "[minio] instance partagee lancee ($MINIO_CONTAINER)"
else
  echo "[minio] instance partagee deja active ($MINIO_CONTAINER)"
fi

# 3) Alias `minio` sur le reseau partage (idempotent: reconnecte avec alias)
if ! $DOCKER exec "$MINIO_CONTAINER" getent hosts "$MINIO_ALIAS" >/dev/null 2>&1; then
  $DOCKER network disconnect "$SHARED_NETWORK" "$MINIO_CONTAINER" >/dev/null 2>&1 || true
  $DOCKER network connect --alias "$MINIO_ALIAS" "$SHARED_NETWORK" "$MINIO_CONTAINER"
fi

# 4) Rattacher le backend au reseau partage (idempotent)
$DOCKER network connect "$SHARED_NETWORK" "$BACKEND_CONTAINER" 2>/dev/null \
  && echo "[minio] $BACKEND_CONTAINER rattache a $SHARED_NETWORK" \
  || echo "[minio] $BACKEND_CONTAINER deja sur $SHARED_NETWORK"

# 5) Creer le bucket (idempotent). mc est embarque dans l'image minio.
$DOCKER exec "$MINIO_CONTAINER" sh -c \
  'mc alias set local http://127.0.0.1:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null 2>&1; \
   mc mb --ignore-existing "local/'"$BUCKET"'" >/dev/null 2>&1' \
  && echo "[minio] bucket '$BUCKET' pret" \
  || echo "[minio] bucket: verification ignoree"

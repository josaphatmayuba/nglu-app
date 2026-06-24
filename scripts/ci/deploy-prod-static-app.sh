#!/bin/sh
set -eu

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <app-dir> <smoke-route> [dist-subdir]" >&2
  exit 2
fi

APP_DIR="$1"
SMOKE_ROUTE="$2"
DIST_SUBDIR="${3:-dist}"
DIST_DIR="$APP_DIR/$DIST_SUBDIR"

SERVER="${SERVER:-admin@16.54.167.125}"
REMOTE_ROOT="${APP:-/opt/nglu-app}"
SSH_CMD="${SSH:-ssh -o StrictHostKeyChecking=no}"
SCP_CMD="${SCP:-scp -o StrictHostKeyChecking=no}"
COMPOSE_PROJECT="${COMPOSE_PROJECT:-nglu_prod}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.prod}"
LOCK_WAIT_SECONDS="${LOCK_WAIT_SECONDS:-900}"
# Public base URL used by the remote smoke test. Override for other targets
# (e.g. BASE_URL=https://avelomi.com) so the deploy verifies the right domain.
BASE_URL="${BASE_URL:-https://ongdngolu.org}"

if [ ! -d "$DIST_DIR" ]; then
  echo "Missing dist directory: $DIST_DIR" >&2
  exit 1
fi

if [ ! -f "$DIST_DIR/index.html" ]; then
  echo "Missing $DIST_DIR/index.html; refusing to deploy an incomplete build." >&2
  exit 1
fi

case "$SMOKE_ROUTE" in
  /*) ;;
  *) SMOKE_ROUTE="/$SMOKE_ROUTE" ;;
esac

APP_SAFE="$(printf "%s" "$APP_DIR" | tr -c 'A-Za-z0-9._-' '-')"
STAMP="${BITBUCKET_BUILD_NUMBER:-manual}-$(date +%s)"
LOCAL_DIST_ARCHIVE="/tmp/nglu-prod-${APP_SAFE}-${STAMP}.tgz"
LOCAL_SUPPORT_ARCHIVE="/tmp/nglu-prod-support-${APP_SAFE}-${STAMP}.tgz"
REMOTE_DIST_ARCHIVE="/tmp/nglu-prod-${APP_SAFE}-${STAMP}.tgz"
REMOTE_SUPPORT_ARCHIVE="/tmp/nglu-prod-support-${APP_SAFE}-${STAMP}.tgz"

cleanup_local() {
  rm -f "$LOCAL_DIST_ARCHIVE" "$LOCAL_SUPPORT_ARCHIVE"
}
trap cleanup_local EXIT INT TERM

tar -czf "$LOCAL_DIST_ARCHIVE" -C "$DIST_DIR" .
# Per-target nginx config. The server always mounts nginx/nginx.frontend.conf,
# so whichever source file SUPPORT_CONF names is shipped UNDER that path.
# ongdngolu keeps the default (dual-domain); Avelomi passes SUPPORT_CONF=
# nginx/nginx.avelomi.conf so it gets its own single-domain config without the
# shared file overwriting it. Lets the two prods diverge over time.
# Portable rename (busybox tar on alpine has no --transform): stage a copy
# under the canonical name in a temp dir, then tar that path.
SUPPORT_CONF="${SUPPORT_CONF:-nginx/nginx.frontend.conf}"
CONF_STAGE=""
if [ "$SUPPORT_CONF" != "nginx/nginx.frontend.conf" ]; then
  CONF_STAGE="$(mktemp -d)"
  mkdir -p "$CONF_STAGE/nginx"
  cp "$SUPPORT_CONF" "$CONF_STAGE/nginx/nginx.frontend.conf"
  tar -czf "$LOCAL_SUPPORT_ARCHIVE" \
    docker-compose.prod.yml \
    frontend/Dockerfile.prod \
    -C "$CONF_STAGE" nginx/nginx.frontend.conf
  rm -rf "$CONF_STAGE"
else
  tar -czf "$LOCAL_SUPPORT_ARCHIVE" \
    docker-compose.prod.yml \
    frontend/Dockerfile.prod \
    nginx/nginx.frontend.conf
fi

$SCP_CMD "$LOCAL_DIST_ARCHIVE" "$SERVER:$REMOTE_DIST_ARCHIVE"
$SCP_CMD "$LOCAL_SUPPORT_ARCHIVE" "$SERVER:$REMOTE_SUPPORT_ARCHIVE"

$SSH_CMD "$SERVER" \
  "APP_DIR='$APP_DIR' SMOKE_ROUTE='$SMOKE_ROUTE' REMOTE_ROOT='$REMOTE_ROOT' REMOTE_DIST_ARCHIVE='$REMOTE_DIST_ARCHIVE' REMOTE_SUPPORT_ARCHIVE='$REMOTE_SUPPORT_ARCHIVE' COMPOSE_PROJECT='$COMPOSE_PROJECT' COMPOSE_FILE='$COMPOSE_FILE' ENV_FILE='$ENV_FILE' LOCK_WAIT_SECONDS='$LOCK_WAIT_SECONDS' BASE_URL='$BASE_URL' bash -s" <<'REMOTE_SCRIPT'
set -euo pipefail

BASE_URL="${BASE_URL:-https://ongdngolu.org}"
LOCK_DIR="/tmp/nglu-prod-deploy.lock"
LOCK_META="$LOCK_DIR/meta.txt"
START_TS="$(date +%s)"

while ! mkdir "$LOCK_DIR" 2>/dev/null; do
  NOW_TS="$(date +%s)"
  if [ $((NOW_TS - START_TS)) -ge "$LOCK_WAIT_SECONDS" ]; then
    echo "Another production deployment is still running after ${LOCK_WAIT_SECONDS}s." >&2
    if [ -f "$LOCK_META" ]; then cat "$LOCK_META" >&2; fi
    exit 42
  fi
  echo "[remote] waiting for production deploy lock..."
  sleep 5
done

cleanup() {
  rm -rf "$LOCK_DIR"
}
trap cleanup EXIT

{
  echo "started_at=$(date -Iseconds)"
  echo "user=$(whoami)"
  echo "app_dir=$APP_DIR"
  echo "smoke_route=$SMOKE_ROUTE"
} > "$LOCK_META"

cd "$REMOTE_ROOT"
REMOTE_USER="$(id -un)"
TARGET_DIST="$REMOTE_ROOT/$APP_DIR/dist"
FE_IMG="$COMPOSE_PROJECT-frontend"
FE_HAVE_PREV=0
FE_CURRENT_IMAGE="$(docker inspect -f '{{.Config.Image}}' nglu_prod_frontend 2>/dev/null || true)"
FE_CURRENT_PROJECT="$(docker inspect -f '{{with index .Config.Labels "com.docker.compose.project"}}{{.}}{{end}}' nglu_prod_frontend 2>/dev/null || true)"

rollback_frontend() {
  if [ "$FE_HAVE_PREV" = "1" ]; then
    echo "[remote] rolling back frontend image to $FE_IMG:previous"
    docker tag "$FE_IMG:previous" "$FE_IMG:latest"
    docker compose -p "$COMPOSE_PROJECT" -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --force-recreate --no-deps frontend || true
  else
    echo "[remote] no previous frontend image available for rollback" >&2
  fi
}

write_placeholder() {
  path="$1"
  label="$2"
  sudo mkdir -p "$path"
  if [ ! -f "$path/index.html" ]; then
    sudo tee "$path/index.html" >/dev/null <<HTML
<!doctype html>
<html lang="fr">
  <head><meta charset="utf-8"><title>${label} non deploye</title></head>
  <body>${label} non deploye.</body>
</html>
HTML
  fi
}

echo "[remote] syncing prod frontend support files"
sudo mkdir -p "$REMOTE_ROOT/frontend" "$REMOTE_ROOT/nginx"
sudo tar -xzf "$REMOTE_SUPPORT_ARCHIVE" -C "$REMOTE_ROOT"
sudo chown "$REMOTE_USER:$REMOTE_USER" \
  "$REMOTE_ROOT/docker-compose.prod.yml" \
  "$REMOTE_ROOT/frontend/Dockerfile.prod" \
  "$REMOTE_ROOT/nginx/nginx.frontend.conf"

echo "[remote] ensuring first-deploy dist directories exist"
for static_app in frontend marketing-site avelomi-site farmos-app domus-app journal-app tickets-app batipro-app hr-app comptabilite-app migration-app chat-app; do
  write_placeholder "$REMOTE_ROOT/$static_app/dist" "$static_app"
done

echo "[remote] replacing $TARGET_DIST contents"
sudo mkdir -p "$TARGET_DIST"
sudo find "$TARGET_DIST" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
sudo tar -xzf "$REMOTE_DIST_ARCHIVE" -C "$TARGET_DIST"
if [ ! -f "$TARGET_DIST/index.html" ]; then
  echo "[remote] deployed artifact did not produce $TARGET_DIST/index.html" >&2
  exit 1
fi
sudo chown -R "$REMOTE_USER:$REMOTE_USER" "$TARGET_DIST"
rm -f "$REMOTE_DIST_ARCHIVE" "$REMOTE_SUPPORT_ARCHIVE"

if [ -n "$FE_CURRENT_IMAGE" ] && docker image inspect "$FE_CURRENT_IMAGE" >/dev/null 2>&1; then
  docker tag "$FE_CURRENT_IMAGE" "$FE_IMG:previous"
  FE_HAVE_PREV=1
  echo "[remote] tagged current container image ($FE_CURRENT_IMAGE) as $FE_IMG:previous"
elif docker image inspect "$FE_IMG:latest" >/dev/null 2>&1; then
  docker tag "$FE_IMG:latest" "$FE_IMG:previous"
  FE_HAVE_PREV=1
  echo "[remote] tagged current frontend image as $FE_IMG:previous"
fi

echo "[remote] building prod frontend image"
if ! docker compose -p "$COMPOSE_PROJECT" -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build frontend; then
  echo "[remote] frontend image build failed; live container was not changed" >&2
  exit 1
fi

echo "[remote] recreating prod frontend container"
if [ -n "$FE_CURRENT_PROJECT" ] && [ "$FE_CURRENT_PROJECT" != "$COMPOSE_PROJECT" ]; then
  echo "[remote] existing nglu_prod_frontend belongs to compose project $FE_CURRENT_PROJECT; replacing it under $COMPOSE_PROJECT"
  docker rm -f nglu_prod_frontend
fi
if ! docker compose -p "$COMPOSE_PROJECT" -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --force-recreate --no-deps frontend; then
  echo "[remote] frontend recreate failed" >&2
  rollback_frontend
  exit 1
fi

check_url() {
  curl -fsSIL --connect-timeout 5 --max-time 10 "$1" >/dev/null 2>&1
}

smoke_once() {
  route_url="$BASE_URL$SMOKE_ROUTE"
  check_url "$BASE_URL/" \
    && check_url "$BASE_URL/crm" \
    && check_url "$BASE_URL/admin/auth/login" \
    && check_url "$route_url" \
    && docker exec nglu_prod_frontend nginx -t >/dev/null 2>&1
}

diagnose_smoke() {
  route_url="$BASE_URL$SMOKE_ROUTE"
  failed=0

  for check in \
    "marketing root|$BASE_URL/" \
    "crm entry|$BASE_URL/crm" \
    "crm login|$BASE_URL/admin/auth/login" \
    "app route|$route_url"; do
    label="${check%%|*}"
    url="${check#*|}"
    if check_url "$url"; then
      echo "[remote] smoke ok: $label ($url)"
    else
      echo "[remote] smoke fail: $label ($url)" >&2
      failed=1
    fi
  done

  nginx_test_log="$(mktemp)"
  if docker exec nglu_prod_frontend nginx -t >"$nginx_test_log" 2>&1; then
    echo "[remote] smoke ok: nginx config"
  else
    echo "[remote] smoke fail: nginx config" >&2
    sed 's/^/[remote] nginx-test: /' "$nginx_test_log" >&2
    failed=1
  fi
  rm -f "$nginx_test_log"

  return "$failed"
}

check_web() {
  # Static app deploys run in parallel with backend deploys. Keep this smoke
  # limited to frontend/nginx checks so an API restart cannot rollback a valid
  # static app image.
  for _ in $(seq 1 20); do
    if smoke_once; then
      return 0
    fi
    sleep 3
  done

  diagnose_smoke || true
  return 1
}

if check_web; then
  echo "[remote] smoke ok for $SMOKE_ROUTE"
else
  echo "[remote] smoke failed for $SMOKE_ROUTE" >&2
  rollback_frontend
  exit 1
fi
REMOTE_SCRIPT

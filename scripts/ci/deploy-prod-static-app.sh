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
# Build secondaire optionnel (ex. EXTRA_DIST=dist-avelomi : build:avelomi base "/"
# des sous-domaines <app>.avelomi.com). Copie dans $REMOTE_ROOT/$APP_DIR/$EXTRA_DIST
# et cuit dans l'image par frontend/Dockerfile.prod, dans le MEME rebuild que dist.
# Tolerant : absent ou sans index.html => ignore (placeholder garde cote serveur).
EXTRA_DIST="${EXTRA_DIST:-}"

# Garde provisionnement : verifie que le serveur cible est reellement pret avant
# tar/scp/cd. Trois conditions (un .env.prod VIDE a deja existe sur Avelomi) :
#   1. $ENV_FILE present ET NON vide (test -s) ;
#   2. docker-compose.prod.yml present cote serveur (repo clone) ;
#   3. frontend/Dockerfile.prod present cote serveur (rebuild image possible).
# Le dossier peut n'etre lisible que par root : on essaie `test` puis `sudo -n test`.
# REQUIRE_READY=1 (CI prod) : serveur pas pret = ECHEC (exit 1), plus de skip vert.
# REQUIRE_READY=0 (defaut) : ::warning:: + exit 0.
REQUIRE_READY="${REQUIRE_READY:-0}"
READY_CHECK="test -s '$REMOTE_ROOT/$ENV_FILE' && test -f '$REMOTE_ROOT/docker-compose.prod.yml' && test -f '$REMOTE_ROOT/frontend/Dockerfile.prod'"
READY_CHECK_SUDO="sudo -n test -s '$REMOTE_ROOT/$ENV_FILE' && sudo -n test -f '$REMOTE_ROOT/docker-compose.prod.yml' && sudo -n test -f '$REMOTE_ROOT/frontend/Dockerfile.prod'"
if ! $SSH_CMD "$SERVER" "($READY_CHECK) || ($READY_CHECK_SUDO)"; then
  if [ "$REQUIRE_READY" = "1" ]; then
    echo "::error title=Deploy saute::$SERVER pas pret : $ENV_FILE vide/absent ou repo ($REMOTE_ROOT) non clone/inaccessible. Lance scripts/provision-avelomi.sh puis relance." >&2
    exit 1
  fi
  echo "::warning title=Deploy saute::$SERVER pas pret : $ENV_FILE vide/absent ou repo ($REMOTE_ROOT) non clone. Step ignore." >&2
  exit 0
fi

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
# Numero de build : Bitbucket ou GitHub Actions selon le CI qui execute le script.
STAMP="${BITBUCKET_BUILD_NUMBER:-${GITHUB_RUN_NUMBER:-manual}}-$(date +%s)"
LOCAL_DIST_ARCHIVE="/tmp/nglu-prod-${APP_SAFE}-${STAMP}.tgz"
LOCAL_SUPPORT_ARCHIVE="/tmp/nglu-prod-support-${APP_SAFE}-${STAMP}.tgz"
LOCAL_EXTRA_ARCHIVE="/tmp/nglu-prod-extra-${APP_SAFE}-${STAMP}.tgz"
REMOTE_DIST_ARCHIVE="/tmp/nglu-prod-${APP_SAFE}-${STAMP}.tgz"
REMOTE_SUPPORT_ARCHIVE="/tmp/nglu-prod-support-${APP_SAFE}-${STAMP}.tgz"
REMOTE_EXTRA_ARCHIVE=""
CONF_STAGE=""

cleanup_local() {
  rm -f "$LOCAL_DIST_ARCHIVE" "$LOCAL_SUPPORT_ARCHIVE" "$LOCAL_EXTRA_ARCHIVE"
  if [ -n "$CONF_STAGE" ]; then
    rm -rf "$CONF_STAGE"
  fi
}
trap cleanup_local EXIT INT TERM

tar -czf "$LOCAL_DIST_ARCHIVE" -C "$DIST_DIR" .
if [ -n "$EXTRA_DIST" ]; then
  if [ -f "$APP_DIR/$EXTRA_DIST/index.html" ]; then
    tar -czf "$LOCAL_EXTRA_ARCHIVE" -C "$APP_DIR/$EXTRA_DIST" .
    REMOTE_EXTRA_ARCHIVE="/tmp/nglu-prod-extra-${APP_SAFE}-${STAMP}.tgz"
  else
    echo "[deploy] $APP_DIR/$EXTRA_DIST/index.html absent : build secondaire ignore." >&2
    EXTRA_DIST=""
  fi
fi
# Per-target nginx config. The server always mounts nginx/nginx.frontend.conf,
# so whichever source file SUPPORT_CONF names is shipped UNDER that path.
# ongdngolu keeps the default (dual-domain); Avelomi passes SUPPORT_CONF=
# nginx/nginx.avelomi.conf so it gets its own single-domain config without the
# shared file overwriting it. Lets the two prods diverge over time.
# Portable rename (busybox tar on alpine has no --transform): stage the support
# files together under their final paths, then tar from that directory.
SUPPORT_CONF="${SUPPORT_CONF:-nginx/nginx.frontend.conf}"
if [ "$SUPPORT_CONF" != "nginx/nginx.frontend.conf" ]; then
  CONF_STAGE="$(mktemp -d)"
  # mktemp -d = mode 700 : l'entree "./" de l'archive porterait uid runner/700 et
  # root l'appliquerait a $REMOTE_ROOT a l'extraction (cause du /opt/nglu-app 700).
  chmod 755 "$CONF_STAGE"
  mkdir -p "$CONF_STAGE/frontend" "$CONF_STAGE/nginx"
  cp docker-compose.prod.yml "$CONF_STAGE/docker-compose.prod.yml"
  cp frontend/Dockerfile.prod "$CONF_STAGE/frontend/Dockerfile.prod"
  cp "$SUPPORT_CONF" "$CONF_STAGE/nginx/nginx.frontend.conf"
  tar -czf "$LOCAL_SUPPORT_ARCHIVE" -C "$CONF_STAGE" .
  rm -rf "$CONF_STAGE"
  CONF_STAGE=""
else
  tar -czf "$LOCAL_SUPPORT_ARCHIVE" \
    docker-compose.prod.yml \
    frontend/Dockerfile.prod \
    nginx/nginx.frontend.conf
fi

$SCP_CMD "$LOCAL_DIST_ARCHIVE" "$SERVER:$REMOTE_DIST_ARCHIVE"
$SCP_CMD "$LOCAL_SUPPORT_ARCHIVE" "$SERVER:$REMOTE_SUPPORT_ARCHIVE"
if [ -n "$REMOTE_EXTRA_ARCHIVE" ]; then
  $SCP_CMD "$LOCAL_EXTRA_ARCHIVE" "$SERVER:$REMOTE_EXTRA_ARCHIVE"
fi

$SSH_CMD "$SERVER" \
  "APP_DIR='$APP_DIR' SMOKE_ROUTE='$SMOKE_ROUTE' REMOTE_ROOT='$REMOTE_ROOT' REMOTE_DIST_ARCHIVE='$REMOTE_DIST_ARCHIVE' REMOTE_SUPPORT_ARCHIVE='$REMOTE_SUPPORT_ARCHIVE' EXTRA_DIST='$EXTRA_DIST' REMOTE_EXTRA_ARCHIVE='$REMOTE_EXTRA_ARCHIVE' COMPOSE_PROJECT='$COMPOSE_PROJECT' COMPOSE_FILE='$COMPOSE_FILE' ENV_FILE='$ENV_FILE' LOCK_WAIT_SECONDS='$LOCK_WAIT_SECONDS' BASE_URL='$BASE_URL' DOCKER='${DOCKER:-docker}' bash -s" <<'REMOTE_SCRIPT'
set -euo pipefail

BASE_URL="${BASE_URL:-https://ongdngolu.org}"
# Avelomi: l'utilisateur SSH n'est pas dans le groupe docker => bascule sur 'sudo -n docker'.
# ongdngolu: groupe docker OK => 'docker'. Auto-detecte si DOCKER non fourni.
DOCKER="${DOCKER:-docker}"
$DOCKER ps >/dev/null 2>&1 || DOCKER="sudo -n docker"
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

# $REMOTE_ROOT (/opt/nglu-app) peut appartenir a root (provisioning sudo) => "cd: Permission denied".
# On garantit la propriete du dossier avant le cd (idempotent).
[ -x "$REMOTE_ROOT" ] && [ -r "$REMOTE_ROOT" ] || sudo -n chown "$(id -un):$(id -gn)" "$REMOTE_ROOT"
cd "$REMOTE_ROOT"
REMOTE_USER="$(id -un)"
TARGET_DIST="$REMOTE_ROOT/$APP_DIR/dist"
FE_IMG="$COMPOSE_PROJECT-frontend"
FE_HAVE_PREV=0
FE_CURRENT_IMAGE="$($DOCKER inspect -f '{{.Config.Image}}' nglu_prod_frontend 2>/dev/null || true)"
FE_CURRENT_PROJECT="$($DOCKER inspect -f '{{with index .Config.Labels "com.docker.compose.project"}}{{.}}{{end}}' nglu_prod_frontend 2>/dev/null || true)"

rollback_frontend() {
  if [ "$FE_HAVE_PREV" = "1" ]; then
    echo "[remote] rolling back frontend image to $FE_IMG:previous"
    $DOCKER tag "$FE_IMG:previous" "$FE_IMG:latest"
    $DOCKER compose -p "$COMPOSE_PROJECT" -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --force-recreate --no-deps frontend || true
  else
    echo "[remote] no previous frontend image available for rollback" >&2
  fi
}

write_placeholder() {
  path="$1"
  label="$2"
  sudo -n mkdir -p "$path"
  if [ ! -f "$path/index.html" ]; then
    sudo -n tee "$path/index.html" >/dev/null <<HTML
<!doctype html>
<html lang="fr">
  <head><meta charset="utf-8"><title>${label} non deploye</title></head>
  <body>${label} non deploye.</body>
</html>
HTML
  fi
}

echo "[remote] syncing prod frontend support files"
sudo -n mkdir -p "$REMOTE_ROOT/frontend" "$REMOTE_ROOT/nginx"
sudo -n tar --no-same-owner --no-same-permissions --no-overwrite-dir -xzf "$REMOTE_SUPPORT_ARCHIVE" -C "$REMOTE_ROOT"
# Garde-fou idempotent (racine seulement, pas -R) : jamais un /opt/nglu-app 700/autre uid.
sudo -n chown "$REMOTE_USER:$(id -gn)" "$REMOTE_ROOT" 2>/dev/null || true
sudo -n chmod 755 "$REMOTE_ROOT"
sudo -n chown "$REMOTE_USER:$REMOTE_USER" \
  "$REMOTE_ROOT/docker-compose.prod.yml" \
  "$REMOTE_ROOT/frontend/Dockerfile.prod" \
  "$REMOTE_ROOT/nginx/nginx.frontend.conf"

# Un dist absent / reduit au placeholder sur le disque serait cuit tel quel par le
# rebuild et ECRASERAIT une app qui tourne (bug #63). On le recupere d'abord depuis
# le conteneur en cours (docker cp) ; placeholder seulement si rien de recuperable.
# Convention placeholder = texte "non deploye" (cf. write_placeholder).
is_placeholder() {
  [ ! -f "$1/index.html" ] || sudo -n grep -q 'non deploye' "$1/index.html"
}

# $1=dossier source (relatif a $REMOTE_ROOT) $2=chemin dans le conteneur. 0 = recupere.
recover_from_container() {
  rc_src="$REMOTE_ROOT/$1"
  rc_dest="$2"
  rc_tmp="$(mktemp -d)"
  if $DOCKER cp "nglu_prod_frontend:$rc_dest/." "$rc_tmp" >/dev/null 2>&1 \
     && [ -f "$rc_tmp/index.html" ] && ! grep -q 'non deploye' "$rc_tmp/index.html"; then
    sudo -n mkdir -p "$rc_src"
    sudo -n find "$rc_src" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
    sudo -n cp -a "$rc_tmp/." "$rc_src/"
    sudo -n chown -R "$REMOTE_USER:$REMOTE_USER" "$rc_src"
    sudo -n rm -rf "$rc_tmp"
    return 0
  fi
  sudo -n rm -rf "$rc_tmp"
  return 1
}

# Liste source|destination = COPY de frontend/Dockerfile.prod (garder synchronise).
DIST_MAP="frontend/dist|/usr/share/nginx/html
marketing-site/dist|/usr/share/nginx/html-marketing-prod
avelomi-site/dist|/usr/share/nginx/html-avelomi-prod
farmos-app/dist|/usr/share/nginx/html-farmos-prod
domus-app/dist|/usr/share/nginx/html-domus-prod
journal-app/dist|/usr/share/nginx/html-journal-prod
tickets-app/dist|/usr/share/nginx/html-tickets-prod
batipro-app/dist|/usr/share/nginx/html-batipro-prod
hr-app/dist|/usr/share/nginx/html-hr-prod
comptabilite-app/dist|/usr/share/nginx/html-comptabilite-prod
migration-app/dist|/usr/share/nginx/html-migration-prod
chat-app/dist|/usr/share/nginx/html-chat-prod
kodatill-app/dist|/usr/share/nginx/html-kodatill-prod
farmos-app/dist-avelomi|/usr/share/nginx/html-farmos-avelomi-prod
domus-app/dist-avelomi|/usr/share/nginx/html-domus-avelomi-prod
batipro-app/dist-avelomi|/usr/share/nginx/html-batipro-avelomi-prod
hr-app/dist-avelomi|/usr/share/nginx/html-hr-avelomi-prod
comptabilite-app/dist-avelomi|/usr/share/nginx/html-comptabilite-avelomi-prod
journal-app/dist-avelomi|/usr/share/nginx/html-journal-avelomi-prod
kodatill-app/dist-avelomi|/usr/share/nginx/html-kodatill-avelomi-prod
tickets-app/dist-avelomi|/usr/share/nginx/html-tickets-avelomi-prod
chat-app/dist-avelomi|/usr/share/nginx/html-chat-avelomi-prod
migration-app/dist-avelomi|/usr/share/nginx/html-migration-avelomi-prod"

echo "[remote] recovering missing dist directories from running container, then placeholders"
while IFS='|' read -r dm_src dm_dest; do
  # Le dist deploye par ce run est remplace plus bas : rien a recuperer.
  [ "$dm_src" = "$APP_DIR/dist" ] && continue
  if [ -n "${EXTRA_DIST:-}" ] && [ -n "${REMOTE_EXTRA_ARCHIVE:-}" ] && [ "$dm_src" = "$APP_DIR/$EXTRA_DIST" ]; then continue; fi
  if is_placeholder "$REMOTE_ROOT/$dm_src"; then
    if recover_from_container "$dm_src" "$dm_dest"; then
      echo "[remote] recovered $dm_src from nglu_prod_frontend:$dm_dest"
    else
      dm_label="${dm_src%%/*}"
      case "$dm_src" in */dist-avelomi) dm_label="$dm_label (avelomi)" ;; esac
      sudo -n rm -f "$REMOTE_ROOT/$dm_src/index.html"
      write_placeholder "$REMOTE_ROOT/$dm_src" "$dm_label"
      echo "::warning title=Placeholder cuit::$dm_src absent du disque et non recuperable depuis nglu_prod_frontend : placeholder dans la nouvelle image"
    fi
  fi
done <<EOF_MAP
$DIST_MAP
EOF_MAP

echo "[remote] replacing $TARGET_DIST contents"
sudo -n mkdir -p "$TARGET_DIST"
sudo -n find "$TARGET_DIST" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
sudo -n tar --no-same-owner --no-same-permissions --no-overwrite-dir -xzf "$REMOTE_DIST_ARCHIVE" -C "$TARGET_DIST"
# tar tourne en sudo => index.html appartient a root, et le dossier peut ne pas
# etre traversable par l'utilisateur SSH tant que le chown ci-dessous n'a pas eu
# lieu. On chown D'ABORD, puis on verifie (sinon faux negatif "did not produce").
sudo -n chown -R "$REMOTE_USER:$REMOTE_USER" "$TARGET_DIST"
if [ ! -f "$TARGET_DIST/index.html" ]; then
  echo "[remote] deployed artifact did not produce $TARGET_DIST/index.html" >&2
  exit 1
fi
if [ -n "${EXTRA_DIST:-}" ] && [ -n "${REMOTE_EXTRA_ARCHIVE:-}" ]; then
  TARGET_EXTRA="$REMOTE_ROOT/$APP_DIR/$EXTRA_DIST"
  echo "[remote] replacing $TARGET_EXTRA contents"
  sudo -n mkdir -p "$TARGET_EXTRA"
  sudo -n find "$TARGET_EXTRA" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
  sudo -n tar --no-same-owner --no-same-permissions --no-overwrite-dir -xzf "$REMOTE_EXTRA_ARCHIVE" -C "$TARGET_EXTRA"
  sudo -n chown -R "$REMOTE_USER:$REMOTE_USER" "$TARGET_EXTRA"
  rm -f "$REMOTE_EXTRA_ARCHIVE"
fi
rm -f "$REMOTE_DIST_ARCHIVE" "$REMOTE_SUPPORT_ARCHIVE"

if [ -n "$FE_CURRENT_IMAGE" ] && $DOCKER image inspect "$FE_CURRENT_IMAGE" >/dev/null 2>&1; then
  $DOCKER tag "$FE_CURRENT_IMAGE" "$FE_IMG:previous"
  FE_HAVE_PREV=1
  echo "[remote] tagged current container image ($FE_CURRENT_IMAGE) as $FE_IMG:previous"
elif $DOCKER image inspect "$FE_IMG:latest" >/dev/null 2>&1; then
  $DOCKER tag "$FE_IMG:latest" "$FE_IMG:previous"
  FE_HAVE_PREV=1
  echo "[remote] tagged current frontend image as $FE_IMG:previous"
fi

echo "[remote] building prod frontend image"
if ! $DOCKER compose -p "$COMPOSE_PROJECT" -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build frontend; then
  echo "[remote] frontend image build failed; live container was not changed" >&2
  exit 1
fi

echo "[remote] recreating prod frontend container"
if [ -n "$FE_CURRENT_PROJECT" ] && [ "$FE_CURRENT_PROJECT" != "$COMPOSE_PROJECT" ]; then
  echo "[remote] existing nglu_prod_frontend belongs to compose project $FE_CURRENT_PROJECT; replacing it under $COMPOSE_PROJECT"
  $DOCKER rm -f nglu_prod_frontend
fi
if ! $DOCKER compose -p "$COMPOSE_PROJECT" -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --force-recreate --no-deps frontend; then
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
    && $DOCKER exec nglu_prod_frontend nginx -t >/dev/null 2>&1
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
  if $DOCKER exec nglu_prod_frontend nginx -t >"$nginx_test_log" 2>&1; then
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

# ---------- Controle de version (cote runner) ----------
# Le smoke ci-dessus ne prouve pas que le NOUVEAU build est servi (un ancien
# build passerait). On verifie que le bundle hache de l'index.html deploye
# apparait dans la page publique (3 essais espaces de 10 s).
bundle_of() {
  grep -o 'index-[A-Za-z0-9_-]*.js' "$1/index.html" 2>/dev/null | head -n 1 || true
}

verify_bundle() {
  label="$1"; url="$2"; bundle="$3"
  n=1
  while [ "$n" -le 3 ]; do
    if curl -fsSL --connect-timeout 5 --max-time 20 -H 'Cache-Control: no-cache' "$url" 2>/dev/null | grep -q "$bundle"; then
      echo "[deploy] version ok: $label ($url sert $bundle)"
      return 0
    fi
    [ "$n" -lt 3 ] && sleep 10
    n=$((n + 1))
  done
  echo "::error title=Version non servie::$label : $url ne sert pas $bundle apres deploy" >&2
  return 1
}

VERSION_FAILED=0
MAIN_BUNDLE="$(bundle_of "$DIST_DIR")"
if [ -n "$MAIN_BUNDLE" ]; then
  verify_bundle "$APP_DIR" "$BASE_URL$SMOKE_ROUTE" "$MAIN_BUNDLE" || VERSION_FAILED=1
else
  echo "::warning::$DIST_DIR/index.html sans index-*.js reconnaissable : controle de version ignore"
fi

if [ -n "$EXTRA_DIST" ]; then
  SUB=""
  MAP_FILE="scripts/ci/avelomi-domains.json"
  if [ -f "$MAP_FILE" ] && command -v node >/dev/null 2>&1; then
    SUB="$(node -e 'const j=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));const a=(j.apps||j).find(x=>x.dir===process.argv[2]);if(a&&a.sub)process.stdout.write(a.sub)' "$MAP_FILE" "$APP_DIR" 2>/dev/null || true)"
  fi
  if [ -z "$SUB" ]; then
    case "$APP_DIR" in
      farmos-app) SUB=farmos ;;
      domus-app) SUB=domus ;;
      batipro-app) SUB=batipro ;;
      comptabilite-app) SUB=compta ;;
      hr-app) SUB=rh ;;
      journal-app) SUB=journal ;;
      kodatill-app) SUB=kodatill ;;
      tickets-app) SUB=tickets ;;
      chat-app) SUB=chat ;;
      migration-app) SUB=migration ;;
    esac
  fi
  EXTRA_BUNDLE="$(bundle_of "$APP_DIR/$EXTRA_DIST")"
  if [ -z "$SUB" ]; then
    echo "::warning::sous-domaine Avelomi inconnu pour $APP_DIR : controle $EXTRA_DIST ignore"
  elif [ -z "$EXTRA_BUNDLE" ]; then
    echo "::warning::$APP_DIR/$EXTRA_DIST/index.html sans index-*.js reconnaissable : controle ignore"
  else
    verify_bundle "$APP_DIR ($EXTRA_DIST)" "https://$SUB.${AVELOMI_DOMAIN:-avelomi.com}/" "$EXTRA_BUNDLE" || VERSION_FAILED=1
  fi
fi

[ "$VERSION_FAILED" = "0" ] || exit 1

#!/usr/bin/env sh
# Arrete la pile dev (projet compose nglu_dev) apres IDLE_MIN minutes sans push.
# Lance par cron toutes les 5 min sur le serveur dev. Ne touche JAMAIS a la prod
# (filtre strict sur le projet nglu_dev ; MinIO partage = nglu_minio_shared, hors projet).
#
# Garde-fous :
#   - fichier <app>/.keep-alive present  -> pas d'arret (session QA longue)
#   - <app>/.last-push absent            -> pas d'arret (compteur non initialise)
#
# Usage: dev-autostop.sh <app_dir> [idle_minutes]     ex: dev-autostop.sh /opt/nglu-app-dev 60
set -eu

APP="${1:?usage: dev-autostop.sh <app_dir> [idle_minutes]}"
IDLE_MIN="${2:-60}"
PROJECT="nglu_dev"

DOCKER=docker
if ! docker ps >/dev/null 2>&1; then
  DOCKER="sudo -n docker"
fi

[ -f "$APP/.keep-alive" ] && exit 0
[ -f "$APP/.last-push" ] || exit 0

# Fichier plus recent que IDLE_MIN minutes ? alors on garde.
if [ -n "$(find "$APP/.last-push" -mmin "-$IDLE_MIN" 2>/dev/null)" ]; then
  exit 0
fi

RUNNING="$($DOCKER ps --filter "label=com.docker.compose.project=$PROJECT" --format '{{.Names}}' \
  | grep '^nglu_dev_' | grep -v -e '^nglu_prod_' -e '^nglu_minio_shared$' || true)"
[ -z "$RUNNING" ] && exit 0

# Memorise ce qu'on arrete : dev-wake ne redemarre QUE cette liste.
echo "$RUNNING" > "$APP/.autostopped"

echo "$(date -u +%FT%TZ) dev-autostop: inactif > ${IDLE_MIN} min, arret de: $(echo "$RUNNING" | tr '\n' ' ')"
# shellcheck disable=SC2086
$DOCKER stop $RUNNING >/dev/null

#!/usr/bin/env sh
# Reveille la pile dev (projet compose nglu_dev) si elle a ete arretee par
# dev-autostop.sh, puis (re)demarre le compteur d'inactivite.
# A executer SUR le serveur dev (ongdngolu). Idempotent. Ne touche JAMAIS a la prod.
#
# Usage: dev-wake.sh <app_dir>     ex: dev-wake.sh /opt/nglu-app-dev
set -eu

APP="${1:?usage: dev-wake.sh <app_dir>}"
PROJECT="nglu_dev"

DOCKER=docker
if ! docker ps >/dev/null 2>&1; then
  DOCKER="sudo -n docker"
fi

# Compteur d'inactivite : date du dernier push.
touch "$APP/.last-push"

# Conteneurs de la pile dev a l'arret (crees par un deploiement precedent).
STOPPED=""
[ -f "$APP/.autostopped" ] && STOPPED="$(cat "$APP/.autostopped")"
if [ -z "$STOPPED" ]; then
  echo "dev-wake: pile dev deja allumee (ou jamais creee), rien a demarrer."
  exit 0
fi

echo "dev-wake: demarrage de la pile dev ($(echo "$STOPPED" | tr '\n' ' '))"
# Ordre : donnees d'abord, puis le reste.
for first in nglu_dev_mysql nglu_dev_redis; do
  echo "$STOPPED" | grep -qx "$first" && $DOCKER start "$first" >/dev/null || true
done
for name in $STOPPED; do
  case "$name" in nglu_dev_mysql|nglu_dev_redis) continue ;; esac
  $DOCKER start "$name" >/dev/null || echo "dev-wake: echec demarrage $name"
done

rm -f "$APP/.autostopped"

# Attente (max ~120 s) que backend2 tourne, sans bloquer le deploiement au-dela.
i=0
while [ "$i" -lt 24 ]; do
  state="$($DOCKER inspect -f '{{.State.Running}}' nglu_dev_backend2 2>/dev/null || echo false)"
  [ "$state" = "true" ] && break
  i=$((i + 1))
  sleep 5
done
echo "dev-wake: termine."

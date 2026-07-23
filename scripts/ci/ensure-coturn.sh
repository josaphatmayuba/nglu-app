#!/usr/bin/env sh
# Garantit qu'un serveur TURN (coturn) tourne pour les appels audio du chat.
#
# Contexte: le pipeline lance les services en `up --no-deps`, donc le service
# `coturn` du docker-compose n'est JAMAIS cree. Sans relais TURN, une part
# importante des appels WebRTC echoue sur les reseaux mobiles d'Afrique
# centrale (NAT symetrique des operateurs) -> l'appel sonne mais ne connecte pas.
#
# Idempotent: peut etre rejoue a chaque deploiement. Ne recree le conteneur que
# si la conf ou les variables ont change.
#
# A executer SUR le serveur (via ssh).
# Usage: ensure-coturn.sh <compose_project> <compose_file> <env_file>
set -eu

PROJECT="${1:?usage: ensure-coturn.sh <compose_project> <compose_file> <env_file>}"
COMPOSE_FILE="${2:?compose file requis}"
ENV_FILE="${3:?env file requis}"

# docker peut exiger sudo selon l'hote
if docker info >/dev/null 2>&1; then
  DOCKER="docker"
else
  DOCKER="sudo -n docker"
fi

# TURN_SECRET est indispensable : l'entrypoint coturn sort en erreur sans lui.
# On le lit depuis le fichier d'environnement du deploiement.
if ! grep -qE '^TURN_SECRET=.+' "$ENV_FILE" 2>/dev/null; then
  echo "[coturn] TURN_SECRET absent ou vide dans $ENV_FILE — coturn NON demarre." >&2
  echo "[coturn] Les appels resteront en P2P direct (taux d'echec eleve sur mobile)." >&2
  echo "[coturn] Corriger: ajouter TURN_SECRET et TURN_EXTERNAL_IP dans $ENV_FILE" >&2
  exit 0   # non bloquant : le reste du deploiement doit aboutir
fi

if ! grep -qE '^TURN_EXTERNAL_IP=.+' "$ENV_FILE" 2>/dev/null; then
  echo "[coturn] AVERTISSEMENT: TURN_EXTERNAL_IP absent de $ENV_FILE." >&2
  echo "[coturn] Derriere le NAT d'un VPS, coturn annoncera son IP privee et" >&2
  echo "[coturn] les candidats relay seront inutilisables depuis l'exterieur." >&2
fi

echo "[coturn] demarrage/mise a jour du service"
$DOCKER compose -p "$PROJECT" -f "$COMPOSE_FILE" --env-file "$ENV_FILE" \
  up -d --no-deps coturn

# Verification : coturn doit ecouter sur 3478. En network_mode host, on teste
# directement sur l'hote.
sleep 2
if $DOCKER compose -p "$PROJECT" -f "$COMPOSE_FILE" ps coturn 2>/dev/null | grep -q "Up\|running"; then
  echo "[coturn] OK — conteneur actif"
else
  echo "[coturn] ATTENTION: le conteneur ne tourne pas. Logs :" >&2
  $DOCKER compose -p "$PROJECT" -f "$COMPOSE_FILE" logs --tail 30 coturn >&2 || true
fi

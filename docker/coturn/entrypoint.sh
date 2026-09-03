#!/bin/sh
# Entrypoint coturn : injecte le secret et l'adresse publique au demarrage.
#
# La conf de base (turnserver.conf) est montee en lecture seule ; on en derive
# une copie enrichie dans /tmp avec les valeurs sensibles issues de l'environnement.
# Cela evite d'ecrire TURN_SECRET dans un fichier versionne.
set -eu

CONF_SRC=/etc/coturn/turnserver.conf
CONF_RUN=/tmp/turnserver.run.conf

if [ -z "${TURN_SECRET:-}" ]; then
  echo "[coturn] ERREUR: TURN_SECRET est vide. Definir TURN_SECRET dans .env" >&2
  exit 1
fi

cp "$CONF_SRC" "$CONF_RUN"

# Secret partage avec le backend (genere les credentials ephemeres).
echo "static-auth-secret=$TURN_SECRET" >> "$CONF_RUN"

# Adresse publique : indispensable derriere le NAT d'un VPS (Lightsail).
# Sans external-ip, coturn annonce son IP privee et les candidats relay sont
# inutilisables depuis l'exterieur.
if [ -n "${TURN_EXTERNAL_IP:-}" ]; then
  echo "external-ip=$TURN_EXTERNAL_IP" >> "$CONF_RUN"
  echo "[coturn] external-ip=$TURN_EXTERNAL_IP"
else
  echo "[coturn] AVERTISSEMENT: TURN_EXTERNAL_IP non defini." >&2
  echo "[coturn] En local c'est normal. Sur un serveur, les appels relayes echoueront." >&2
fi

if [ -n "${TURN_REALM:-}" ]; then
  echo "realm=$TURN_REALM" >> "$CONF_RUN"
fi

echo "[coturn] demarrage (ports 3478/5349, media 49160-49200)"
exec turnserver -c "$CONF_RUN" "$@"

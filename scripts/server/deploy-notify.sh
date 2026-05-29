#!/usr/bin/env bash
# Records a PRODUCTION deploy outcome and, on failure/rollback, emails an alert.
# This is for prod only — dev deploys do not call it.
#
# Usage: deploy-notify.sh <service> <result> <commit>
#   result: DEPLOYED | ROLLED_BACK | BUILD_FAILED
#
# Reads SMTP settings and DEPLOY_ALERT_EMAIL from /opt/nglu-app/.env.prod.
# Writes:
#   /opt/nglu-app/deploy-history.log  (append-only history)
#   /opt/nglu-app/DEPLOY_STATE.txt    (latest state, overwritten)
set -u

SERVICE="${1:-unknown}"
RESULT="${2:-unknown}"
COMMIT="${3:-unknown}"

PROD_DIR="/opt/nglu-app"
ENV_FILE="$PROD_DIR/.env.prod"
TS="$(date '+%Y-%m-%d %H:%M:%S %Z')"
LINE="$TS | $SERVICE | $RESULT | commit $COMMIT"

echo "$LINE" | sudo tee -a "$PROD_DIR/deploy-history.log" >/dev/null

if [ "$RESULT" = "DEPLOYED" ]; then
  printf '%s\nLa prod est a jour sur ce commit.\n' "$LINE" | sudo tee "$PROD_DIR/DEPLOY_STATE.txt" >/dev/null
else
  printf '%s\n>>> ATTENTION: le deploiement a ECHOUE. La PROD tourne TOUJOURS sur la version PRECEDENTE (rollback automatique). <<<\n' "$LINE" | sudo tee "$PROD_DIR/DEPLOY_STATE.txt" >/dev/null
fi

# Email alert only when something went wrong.
if [ "$RESULT" != "DEPLOYED" ]; then
  TO="$(sudo grep -E '^DEPLOY_ALERT_EMAIL=' "$ENV_FILE" 2>/dev/null | cut -d= -f2-)"
  SH="$(sudo grep -E '^SMTP_HOST=' "$ENV_FILE" 2>/dev/null | cut -d= -f2-)"
  SP="$(sudo grep -E '^SMTP_PORT=' "$ENV_FILE" 2>/dev/null | cut -d= -f2-)"
  SU="$(sudo grep -E '^SMTP_USER=' "$ENV_FILE" 2>/dev/null | cut -d= -f2-)"
  SPW="$(sudo grep -E '^SMTP_PASS=' "$ENV_FILE" 2>/dev/null | cut -d= -f2-)"
  SF="$(sudo grep -E '^SMTP_FROM=' "$ENV_FILE" 2>/dev/null | cut -d= -f2-)"
  : "${SF:=$SU}"
  : "${SP:=587}"

  if [ -n "$TO" ] && [ -n "$SH" ] && [ -n "$SU" ]; then
    BODY="$(printf 'From: %s\r\nTo: %s\r\nSubject: [PROD ALERTE] %s %s\r\n\r\nUn deploiement production a echoue.\r\n\r\n%s\r\n\r\nLa production tourne toujours sur la version precedente (rollback automatique).\r\nVerifier l etat: ssh admin@16.54.167.125 "cat /opt/nglu-app/DEPLOY_STATE.txt"\r\n' "$SF" "$TO" "$SERVICE" "$RESULT" "$LINE")"
    if printf '%s' "$BODY" | curl --silent --show-error --ssl-reqd --url "smtp://$SH:$SP" --user "$SU:$SPW" --mail-from "$SF" --mail-rcpt "$TO" --upload-file - ; then
      echo "[notify] alert email sent to $TO"
    else
      echo "[notify] alert email FAILED to send (outcome still logged)"
    fi
  else
    echo "[notify] DEPLOY_ALERT_EMAIL or SMTP not configured — logged to files only"
  fi
fi

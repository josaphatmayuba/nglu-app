#!/bin/bash
# Memory protection: auto-stop dev stack if system swap exceeds threshold
# Install in cron: */5 * * * * /opt/nglu-app/scripts/monitor-memory.sh
# View log:        journalctl -t nglu-monitor --since "1 hour ago"

THRESHOLD_KB=1572864          # 1.5 GB
SWAP_USED_KB=$(free -k | awk '/Swap:/ {print $3}')

if [ "$SWAP_USED_KB" -gt "$THRESHOLD_KB" ]; then
  # Only act if dev stack is actually running
  if docker ps --format '{{.Names}}' | grep -q nglu_dev_; then
    logger -t nglu-monitor "Swap ${SWAP_USED_KB} KB > ${THRESHOLD_KB} KB — stopping dev stack to protect prod"
    cd /opt/nglu-app-dev && docker compose -p nglu_dev -f docker-compose.dev.yml down >> /var/log/nglu-monitor.log 2>&1
    logger -t nglu-monitor "Dev stack stopped. Restart manually with: make dev-up"
  else
    logger -t nglu-monitor "Swap high (${SWAP_USED_KB} KB) but dev already down — nothing to do"
  fi
fi

#!/bin/sh
set -eu

MODE="${1:-}"

cd "$(dirname "$0")/../.."

if [ "$MODE" != "on" ] && [ "$MODE" != "off" ]; then
  echo "Usage: $0 on|off"
  exit 1
fi

COMPOSE="docker compose -f deploy/compose.prod.yml"

if [ "$MODE" = "on" ]; then
  CONFIG="/srv/caddy/Caddyfile.maintenance.example"
else
  CONFIG="/etc/caddy/Caddyfile"
fi

$COMPOSE exec -T proxy caddy reload --config "$CONFIG" --adapter caddyfile
echo "Maintenance mode: $MODE"

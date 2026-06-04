#!/bin/sh
set -eu

cd "$(dirname "$0")/../.."

require_file() {
  if [ ! -f "$1" ]; then
    echo "Missing required file: $1"
    echo "Copy the matching .example file, fill real values, then run again."
    exit 1
  fi
}

require_file "deploy/env/proxy.env"
require_file "deploy/env/postgres.env"
require_file "deploy/env/backend-prod.env"
require_file "deploy/env/backend-staging.env"

COMPOSE="docker compose -f deploy/compose.prod.yml"

$COMPOSE config >/dev/null
$COMPOSE up -d --build --remove-orphans
$COMPOSE ps

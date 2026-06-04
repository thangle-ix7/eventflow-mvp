#!/bin/sh
set -eu

cd "$(dirname "$0")/../.."

TARGET="${1:-prod}"
BACKUP_DIR="${BACKUP_DIR:-/opt/eventflow/backups/postgres}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"

if [ "$TARGET" = "prod" ]; then
  ENV_FILE="deploy/env/backend-prod.env"
  DB_NAME="eventflow_prod"
elif [ "$TARGET" = "staging" ]; then
  ENV_FILE="deploy/env/backend-staging.env"
  DB_NAME="eventflow_staging"
else
  echo "Usage: $0 [prod|staging]"
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE"
  exit 1
fi

set -a
. "$ENV_FILE"
set +a

mkdir -p "$BACKUP_DIR"
OUT="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.dump"

docker exec -e PGPASSWORD="$DB_PASSWORD" eventflow-db \
  pg_dump -U "$DB_USERNAME" -d "$DB_NAME" -Fc > "$OUT"

sha256sum "$OUT" > "$OUT.sha256"
find "$BACKUP_DIR" -name "${DB_NAME}_*.dump" -type f -mtime +14 -delete
find "$BACKUP_DIR" -name "${DB_NAME}_*.dump.sha256" -type f -mtime +14 -delete

echo "Backup written: $OUT"

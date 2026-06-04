#!/bin/sh
set -eu

cd "$(dirname "$0")/../.."

TARGET="${1:-}"
BACKUP_FILE="${2:-}"

if [ "$TARGET" != "prod" ] && [ "$TARGET" != "staging" ]; then
  echo "Usage: CONFIRM_RESTORE=yes $0 [prod|staging] /path/to/backup.dump"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Backup file not found: $BACKUP_FILE"
  exit 1
fi

if [ "${CONFIRM_RESTORE:-no}" != "yes" ]; then
  echo "Refusing to restore without CONFIRM_RESTORE=yes"
  exit 1
fi

if [ "$TARGET" = "prod" ]; then
  ENV_FILE="deploy/env/backend-prod.env"
  DB_NAME="eventflow_prod"
else
  ENV_FILE="deploy/env/backend-staging.env"
  DB_NAME="eventflow_staging"
fi

set -a
. "$ENV_FILE"
set +a

cat "$BACKUP_FILE" | docker exec -i -e PGPASSWORD="$DB_PASSWORD" eventflow-db \
  pg_restore -U "$DB_USERNAME" -d "$DB_NAME" --clean --if-exists --no-owner

echo "Restore completed for $DB_NAME"

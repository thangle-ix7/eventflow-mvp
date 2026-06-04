#!/bin/sh
set -eu

create_user_and_db() {
  db_name="$1"
  db_user="$2"
  db_password="$3"

  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
    -v db_name="$db_name" \
    -v db_user="$db_user" \
    -v db_password="$db_password" <<-'EOSQL'
    SELECT format('CREATE USER %I WITH PASSWORD %L', :'db_user', :'db_password')
    WHERE NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = :'db_user')\gexec

    SELECT format('CREATE DATABASE %I OWNER %I', :'db_name', :'db_user')
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = :'db_name')\gexec

    SELECT format('GRANT ALL PRIVILEGES ON DATABASE %I TO %I', :'db_name', :'db_user')\gexec
EOSQL
}

create_user_and_db "eventflow_prod" "$EVENTFLOW_PROD_DB_USER" "$EVENTFLOW_PROD_DB_PASSWORD"
create_user_and_db "eventflow_staging" "$EVENTFLOW_STAGING_DB_USER" "$EVENTFLOW_STAGING_DB_PASSWORD"

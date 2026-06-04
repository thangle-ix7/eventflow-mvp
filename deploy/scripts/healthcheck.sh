#!/bin/sh
set -eu

BASE_URL="${1:-}"

if [ -z "$BASE_URL" ]; then
  echo "Usage: $0 https://event-flow.example.com"
  exit 1
fi

curl -fsS "$BASE_URL/" >/dev/null
curl -fsS "$BASE_URL/actuator/health" >/dev/null && {
  echo "ERROR: actuator is public"
  exit 1
} || true
curl -fsS "$BASE_URL/swagger-ui.html" >/dev/null && {
  echo "ERROR: swagger is public"
  exit 1
} || true

echo "Healthcheck completed for $BASE_URL"

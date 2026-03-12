#!/usr/bin/env bash
# Start the platform-api dev server with all required environment variables.
#
# Usage: ./start-dev.sh
# Requires: OnlyOffice Document Server running (docker compose up -d from ../onlyoffice/)

set -euo pipefail
cd "$(dirname "$0")"

# Load Supabase credentials
if [ -f ../../.env ]; then
  set -a
  source ../../.env
  set +a
fi

# Load OnlyOffice JWT secret (must match Document Server's JWT_SECRET)
if [ -f ../onlyoffice/.env ]; then
  set -a
  source ../onlyoffice/.env
  set +a
fi

# Bridge URL: how the Document Server container reaches this API
export ONLYOFFICE_BRIDGE_URL="${ONLYOFFICE_BRIDGE_URL:-http://host.docker.internal:8000}"

# Document Server URL: how the browser reaches the Document Server (unused by bridge directly,
# but used for SSRF validation on callbacks)
export ONLYOFFICE_DOCSERVER_URL="${ONLYOFFICE_DOCSERVER_URL:-http://localhost:9980}"
export ONLYOFFICE_DOCSERVER_INTERNAL_URL="${ONLYOFFICE_DOCSERVER_INTERNAL_URL:-http://localhost:9980}"

# Local cache directory for editing sessions
export ONLYOFFICE_STORAGE_DIR="${ONLYOFFICE_STORAGE_DIR:-/tmp/onlyoffice-cache}"
mkdir -p "$ONLYOFFICE_STORAGE_DIR"

echo "=== OnlyOffice Bridge Config ==="
echo "BRIDGE_URL:    $ONLYOFFICE_BRIDGE_URL"
echo "DOCSERVER_URL: $ONLYOFFICE_DOCSERVER_URL"
echo "JWT_SECRET:    ${ONLYOFFICE_JWT_SECRET:+set (${#ONLYOFFICE_JWT_SECRET} chars)}"
echo "STORAGE_DIR:   $ONLYOFFICE_STORAGE_DIR"
echo "SUPABASE_URL:  $SUPABASE_URL"
echo "================================"

exec python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

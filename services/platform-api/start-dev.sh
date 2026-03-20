#!/usr/bin/env bash
# Start the platform-api dev server with local environment variables.
#
# Usage: ./start-dev.sh

set -euo pipefail
cd "$(dirname "$0")"

# Load Supabase credentials
if [ -f ../../.env ]; then
  set -a
  source ../../.env
  set +a
fi

echo "=== platform-api Config ==="
echo "SUPABASE_URL:  $SUPABASE_URL"
echo "LOG_LEVEL:     ${LOG_LEVEL:-INFO}"
echo "OTEL_ENABLED:  ${OTEL_ENABLED:-false}"
echo "OTEL_OTLP:     ${OTEL_EXPORTER_OTLP_ENDPOINT:-http://localhost:4318}"
echo "JAEGER_UI_URL: ${JAEGER_UI_URL:-http://localhost:16686}"
echo "==========================="

exec python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

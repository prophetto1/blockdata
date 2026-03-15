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
echo "==========================="

exec python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

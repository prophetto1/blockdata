#!/usr/bin/env bash
# Serve a Supabase edge function locally with Deno.
#
# Usage:
#   ./scripts/serve-edge.sh admin-integration-catalog        # port 8099
#   ./scripts/serve-edge.sh admin-integration-catalog 9000   # port 9000
#
# Reads env vars from .env in repo root. The function runs at:
#   http://localhost:<port>/

set -euo pipefail

FUNCTION_NAME="${1:?Usage: serve-edge.sh <function-name> [port]}"
PORT="${2:-8099}"

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENTRY="$REPO_ROOT/supabase/functions/$FUNCTION_NAME/index.ts"

if [ ! -f "$ENTRY" ]; then
  echo "Error: $ENTRY not found"
  exit 1
fi

# Load .env into environment
set -a
# shellcheck disable=SC1091
source "$REPO_ROOT/.env"
set +a

echo "Serving $FUNCTION_NAME on http://localhost:$PORT"
echo "Entry: $ENTRY"
echo ""

exec deno run \
  --allow-net \
  --allow-env \
  --allow-read \
  --env="$REPO_ROOT/.env" \
  "$ENTRY"

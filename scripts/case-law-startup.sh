#!/bin/bash
# Log to serial console (port 1) so we can see output remotely
exec > >(tee /dev/ttyS0 /var/log/case-law-loader.log) 2>&1

echo "=== Starting case-law-loader $(date) ==="

echo "=== Installing packages ==="
apt-get update -qq || echo "apt-get update failed"
apt-get install -y -qq postgresql-client bzip2 || echo "apt-get install failed"
# Use system node if available, otherwise install
which node || apt-get install -y -qq nodejs npm || echo "node install failed"

echo "=== Checking tools ==="
which psql && echo "psql OK" || echo "psql MISSING"
which node && echo "node OK" || echo "node MISSING"
which gcloud && echo "gcloud OK" || echo "gcloud MISSING"
which bunzip2 && echo "bunzip2 OK" || echo "bunzip2 MISSING"

echo "=== Testing Cloud SQL connection ==="
export PGPASSWORD="caselaw2026!"
psql -h 10.97.0.5 -U postgres -d case_law -c "SELECT 1 AS connected;" || echo "Cloud SQL connection FAILED"

echo "=== Downloading scripts from GCS ==="
gcloud storage cp gs://agchain-case-law/schema-cloud-sql.sql /tmp/schema-cloud-sql.sql || echo "schema download FAILED"
gcloud storage cp gs://agchain-case-law/case-law-load.sh /tmp/case-law-load.sh || echo "loader download FAILED"

echo "=== Running schema creation ==="
psql -h 10.97.0.5 -U postgres -d case_law -f /tmp/schema-cloud-sql.sql || echo "schema creation FAILED"

echo "=== Running data loader ==="
chmod +x /tmp/case-law-load.sh
bash /tmp/case-law-load.sh || echo "data loader FAILED"

echo "=== COMPLETE $(date) ==="

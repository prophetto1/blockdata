#!/bin/bash
# Case Law Data Loader — runs on GCE instance case-law-loader
# Loads CourtListener bulk CSV data into Cloud SQL Postgres
set -euo pipefail

DB_HOST="10.97.0.5"
DB_NAME="case_law"
DB_USER="postgres"
DB_PASS="caselaw2026!"
BUCKET="gs://agchain-case-law"

export PGPASSWORD="$DB_PASS"

psql_cmd() {
  psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" "$@"
}

echo "=== Step 1: Create schema ==="
# Upload schema.sql to bucket first, or inline it
gcloud storage cat "$BUCKET/schema-cloud-sql.sql" | psql_cmd

echo "=== Step 2: Load relational tables (order matters for FKs) ==="

# Helper: load CSV into relational table
load_relational() {
  local table=$1
  local csv_file=$2
  echo "Loading $table from $csv_file..."
  gcloud storage cat "$BUCKET/csv/$csv_file" | \
    psql_cmd -c "\COPY case_law.$table FROM STDIN WITH (FORMAT csv, HEADER true, NULL '')"
  echo "  Done: $(psql_cmd -t -c "SELECT COUNT(*) FROM case_law.$table") rows"
}

# Load in FK-safe order
load_relational "courts" "courts.csv"
load_relational "court_appeals_to" "court-appeals-to.csv"
load_relational "courthouses" "courthouses.csv"
load_relational "races" "people_db_race.csv"
load_relational "schools" "people-db-schools.csv"
load_relational "people" "people-db-people.csv"
load_relational "person_races" "people-db-races.csv"
load_relational "positions" "people-db-positions.csv"
load_relational "educations" "people-db-educations.csv"
load_relational "political_affiliations" "people-db-political-affiliations.csv"
load_relational "retention_events" "people-db-retention-events.csv"

echo "=== Step 3: Load JSONB tables ==="

# Helper: stream CSV → convert each row to JSON → insert as JSONB
load_jsonb() {
  local table=$1
  local csv_file=$2
  local compressed=${3:-false}
  echo "Loading $table from $csv_file (compressed=$compressed)..."

  if [ "$compressed" = "true" ]; then
    gcloud storage cat "$BUCKET/$csv_file" | bunzip2
  else
    gcloud storage cat "$BUCKET/csv/$csv_file"
  fi | node -e "
    const readline = require('readline');
    const rl = readline.createInterface({ input: process.stdin });
    let headers = null;
    let batch = [];
    let count = 0;
    const BATCH_SIZE = 1000;

    function escapeSql(s) {
      return s.replace(/'/g, \"''\");
    }

    function flush() {
      if (batch.length === 0) return;
      const values = batch.map(row => {
        const obj = {};
        headers.forEach((h, i) => {
          const val = row[i];
          if (val !== '' && val !== undefined) obj[h] = val;
        });
        const id = obj.id || count;
        return '(' + id + ',\\'' + escapeSql(JSON.stringify(obj)) + '\\'::jsonb)';
      }).join(',');
      console.log('INSERT INTO case_law.$table (id, data) VALUES ' + values + ' ON CONFLICT (id) DO NOTHING;');
      batch = [];
    }

    rl.on('line', (line) => {
      // Simple CSV parse (handles quoted fields)
      const fields = [];
      let field = '';
      let inQuote = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '\"' && (i === 0 || line[i-1] !== '\\\\')) {
          inQuote = !inQuote;
        } else if (c === ',' && !inQuote) {
          fields.push(field);
          field = '';
        } else {
          field += c;
        }
      }
      fields.push(field);

      if (!headers) {
        headers = fields.map(h => h.trim());
        return;
      }

      batch.push(fields);
      count++;

      if (batch.length >= BATCH_SIZE) flush();
      if (count % 100000 === 0) process.stderr.write('  ' + count + ' rows...\\n');
    });

    rl.on('close', () => {
      flush();
      process.stderr.write('  Total: ' + count + ' rows\\n');
    });
  " | psql_cmd
  echo "  Done loading $table"
}

# Small JSONB tables first
load_jsonb "financial_disclosure_agreements" "financial-disclosures-agreements.csv"
load_jsonb "financial_disclosure_gifts" "financial-disclosures-gifts.csv"
load_jsonb "financial_disclosure_debts" "financial-disclosures-debts.csv"
load_jsonb "financial_disclosure_income" "financial-disclosures-non-investment-income.csv"
load_jsonb "financial_disclosure_spousal_income" "financial-disclosures-spousal-income.csv"
load_jsonb "financial_disclosure_positions" "financial-disclosures-positions.csv"
load_jsonb "financial_disclosure_reimbursements" "financial-disclosures-reimbursements.csv"
load_jsonb "financial_disclosures" "financial-disclosures.csv"
load_jsonb "financial_disclosure_investments" "financial-disclosure-investments.csv"
load_jsonb "originating_court_information" "originating-court-information.csv"
load_jsonb "opinioncluster_panel" "opinioncluster-panel.csv"
load_jsonb "opinion_joined_by" "search_opinion_joined_by.csv"
load_jsonb "cluster_non_participating_judges" "search_opinioncluster_non_participating_judges.csv"

# Large JSONB tables
load_jsonb "oral_arguments" "oral-arguments.csv" "true"
load_jsonb "dockets" "dockets.csv"
load_jsonb "fjc_integrated_database" "fjc-integrated-database.csv"

echo "=== Step 4: Load opinions (the big one) ==="
load_jsonb "opinions" "opinions.csv.bz2" "true"

echo "=== DONE ==="
psql_cmd -c "SELECT table_name, pg_size_pretty(pg_total_relation_size('case_law.' || table_name)) as size FROM information_schema.tables WHERE table_schema = 'case_law' ORDER BY pg_total_relation_size('case_law.' || table_name) DESC;"
#!/bin/bash
# Case Law Data Loader — runs on GCE instance case-law-loader
# Loads CourtListener bulk CSV data into Cloud SQL Postgres
# Strategy: load everything as JSONB first (avoids type-casting issues),
# then populate relational tables from JSONB staging.

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
gcloud storage cat "$BUCKET/schema-cloud-sql.sql" | psql_cmd || echo "Schema errors (OK if tables exist)"

echo "=== Step 2: Load JSONB tables ==="

# Create staging JSONB tables for relational data
psql_cmd <<'SQL'
CREATE TABLE IF NOT EXISTS case_law._staging_courts (id text, data jsonb);
CREATE TABLE IF NOT EXISTS case_law._staging_court_appeals_to (id text, data jsonb);
CREATE TABLE IF NOT EXISTS case_law._staging_courthouses (id text, data jsonb);
CREATE TABLE IF NOT EXISTS case_law._staging_races (id text, data jsonb);
CREATE TABLE IF NOT EXISTS case_law._staging_schools (id text, data jsonb);
CREATE TABLE IF NOT EXISTS case_law._staging_people (id text, data jsonb);
CREATE TABLE IF NOT EXISTS case_law._staging_person_races (id text, data jsonb);
CREATE TABLE IF NOT EXISTS case_law._staging_positions (id text, data jsonb);
CREATE TABLE IF NOT EXISTS case_law._staging_educations (id text, data jsonb);
CREATE TABLE IF NOT EXISTS case_law._staging_political_affiliations (id text, data jsonb);
CREATE TABLE IF NOT EXISTS case_law._staging_retention_events (id text, data jsonb);
SQL

# Helper: stream CSV → node CSV-to-JSON → psql COPY as JSONB
load_csv_as_jsonb() {
  local table=$1
  local csv_file=$2
  local compressed=${3:-false}
  echo "Loading $table from $csv_file..."

  # Truncate first in case of re-run
  psql_cmd -c "TRUNCATE case_law.$table;" 2>/dev/null || true

  if [ "$compressed" = "true" ]; then
    gcloud storage cat "$BUCKET/$csv_file" | bunzip2
  else
    gcloud storage cat "$BUCKET/csv/$csv_file"
  fi | node -e '
    const readline = require("readline");
    const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
    let headers = null;
    let batch = [];
    let count = 0;
    const BATCH_SIZE = 500;

    function escSql(s) { return s.replace(/\x27/g, "\x27\x27").replace(/\\/g, "\\\\"); }

    function parseCSVLine(line) {
      const fields = [];
      let field = "", inQuote = false, i = 0;
      while (i < line.length) {
        const c = line[i];
        if (inQuote) {
          if (c === "\x22" && i + 1 < line.length && line[i + 1] === "\x22") {
            field += "\x22"; i += 2;
          } else if (c === "\x22") {
            inQuote = false; i++;
          } else {
            field += c; i++;
          }
        } else {
          if (c === "\x22") { inQuote = true; i++; }
          else if (c === ",") { fields.push(field); field = ""; i++; }
          else { field += c; i++; }
        }
      }
      fields.push(field);
      return fields;
    }

    function flush() {
      if (batch.length === 0) return;
      const values = batch.map(obj => {
        const id = obj.id || "0";
        return "(\x27" + escSql(String(id)) + "\x27,\x27" + escSql(JSON.stringify(obj)) + "\x27::jsonb)";
      }).join(",\n");
      console.log("INSERT INTO case_law.TABLE_NAME (id, data) VALUES\n" + values + "\nON CONFLICT DO NOTHING;");
      batch = [];
    }

    rl.on("line", (line) => {
      if (!line.trim()) return;
      const fields = parseCSVLine(line);
      if (!headers) { headers = fields.map(h => h.trim()); return; }
      const obj = {};
      headers.forEach((h, i) => {
        const val = fields[i];
        if (val !== undefined && val !== "") obj[h] = val;
      });
      batch.push(obj);
      count++;
      if (batch.length >= BATCH_SIZE) flush();
      if (count % 100000 === 0) process.stderr.write("  " + count + " rows...\n");
    });
    rl.on("close", () => {
      flush();
      process.stderr.write("  Total: " + count + " rows\n");
    });
  ' | sed "s/TABLE_NAME/$table/g" | psql_cmd -q
  echo "  Done: $(psql_cmd -t -c "SELECT COUNT(*) FROM case_law.$table") rows"
}

# --- Staging tables for relational data ---
load_csv_as_jsonb "_staging_courts" "courts.csv"
load_csv_as_jsonb "_staging_court_appeals_to" "court-appeals-to.csv"
load_csv_as_jsonb "_staging_courthouses" "courthouses.csv"
load_csv_as_jsonb "_staging_races" "people_db_race.csv"
load_csv_as_jsonb "_staging_schools" "people-db-schools.csv"
load_csv_as_jsonb "_staging_people" "people-db-people.csv"
load_csv_as_jsonb "_staging_person_races" "people-db-races.csv"
load_csv_as_jsonb "_staging_positions" "people-db-positions.csv"
load_csv_as_jsonb "_staging_educations" "people-db-educations.csv"
load_csv_as_jsonb "_staging_political_affiliations" "people-db-political-affiliations.csv"
load_csv_as_jsonb "_staging_retention_events" "people-db-retention-events.csv"

# --- JSONB-native tables ---
load_csv_as_jsonb "financial_disclosure_agreements" "financial-disclosures-agreements.csv"
load_csv_as_jsonb "financial_disclosure_gifts" "financial-disclosures-gifts.csv"
load_csv_as_jsonb "financial_disclosure_debts" "financial-disclosures-debts.csv"
load_csv_as_jsonb "financial_disclosure_income" "financial-disclosures-non-investment-income.csv"
load_csv_as_jsonb "financial_disclosure_spousal_income" "financial-disclosures-spousal-income.csv"
load_csv_as_jsonb "financial_disclosure_positions" "financial-disclosures-positions.csv"
load_csv_as_jsonb "financial_disclosure_reimbursements" "financial-disclosures-reimbursements.csv"
load_csv_as_jsonb "financial_disclosures" "financial-disclosures.csv"
load_csv_as_jsonb "financial_disclosure_investments" "financial-disclosure-investments.csv"
load_csv_as_jsonb "originating_court_information" "originating-court-information.csv"
load_csv_as_jsonb "opinioncluster_panel" "opinioncluster-panel.csv"
load_csv_as_jsonb "opinion_joined_by" "search_opinion_joined_by.csv"
load_csv_as_jsonb "cluster_non_participating_judges" "search_opinioncluster_non_participating_judges.csv"

# --- Large JSONB tables ---
load_csv_as_jsonb "oral_arguments" "oral-arguments.csv" "true"
load_csv_as_jsonb "dockets" "dockets.csv"
load_csv_as_jsonb "fjc_integrated_database" "fjc-integrated-database.csv"

echo "=== Step 3: Populate relational tables from staging JSONB ==="

psql_cmd <<'RELATIONAL'
-- Courts (id is varchar, not integer)
INSERT INTO case_law.courts
SELECT
  data->>'id',
  (data->>'date_modified')::timestamptz,
  COALESCE((data->>'in_use')::boolean, true),
  COALESCE((data->>'has_opinion_scraper')::boolean, false),
  COALESCE((data->>'has_oral_argument_scraper')::boolean, false),
  COALESCE((data->>'position')::float, 0),
  COALESCE(data->>'citation_string', ''),
  COALESCE(data->>'short_name', ''),
  COALESCE(data->>'full_name', ''),
  COALESCE(data->>'url', ''),
  NULLIF(data->>'start_date', '')::date,
  NULLIF(data->>'end_date', '')::date,
  COALESCE(data->>'jurisdiction', ''),
  COALESCE(data->>'notes', ''),
  NULLIF(data->>'pacer_court_id', '')::smallint,
  COALESCE(data->>'fjc_court_id', ''),
  NULLIF(data->>'pacer_has_rss_feed', '')::boolean,
  NULLIF(data->>'date_last_pacer_contact', '')::timestamptz,
  COALESCE(data->>'pacer_rss_entry_types', ''),
  NULLIF(data->>'parent_court_id', '')
FROM case_law._staging_courts
ON CONFLICT (id) DO NOTHING;

-- Court appeals to
INSERT INTO case_law.court_appeals_to (id, from_court_id, to_court_id)
SELECT (data->>'id')::int, data->>'from_court_id', data->>'to_court_id'
FROM case_law._staging_court_appeals_to
ON CONFLICT (id) DO NOTHING;

-- Courthouses
INSERT INTO case_law.courthouses (id, court_seat, building_name, address1, address2, city, county, state, zip_code, country_code, court_id)
SELECT (data->>'id')::int,
  NULLIF(data->>'court_seat', '')::boolean,
  COALESCE(data->>'building_name', ''),
  COALESCE(data->>'address1', ''),
  COALESCE(data->>'address2', ''),
  COALESCE(data->>'city', ''),
  COALESCE(data->>'county', ''),
  COALESCE(data->>'state', ''),
  COALESCE(data->>'zip_code', ''),
  COALESCE(data->>'country_code', ''),
  data->>'court_id'
FROM case_law._staging_courthouses
ON CONFLICT (id) DO NOTHING;

-- Races
INSERT INTO case_law.races (id, race)
SELECT (data->>'id')::int, data->>'race'
FROM case_law._staging_races
ON CONFLICT (id) DO NOTHING;

-- Schools
INSERT INTO case_law.schools (id, date_created, date_modified, name, ein, is_alias_of_id)
SELECT (data->>'id')::int,
  (data->>'date_created')::timestamptz,
  (data->>'date_modified')::timestamptz,
  COALESCE(data->>'name', ''),
  NULLIF(data->>'ein', '')::int,
  NULLIF(data->>'is_alias_of_id', '')::int
FROM case_law._staging_schools
ON CONFLICT (id) DO NOTHING;

-- People
INSERT INTO case_law.people (id, date_created, date_modified, fjc_id, slug, name_first, name_middle, name_last, name_suffix,
  date_dob, date_granularity_dob, date_dod, date_granularity_dod,
  dob_city, dob_state, dob_country, dod_city, dod_state, dod_country,
  gender, religion, has_photo, ftm_total_received, ftm_eid, date_completed, is_alias_of_id)
SELECT (data->>'id')::int,
  (data->>'date_created')::timestamptz,
  (data->>'date_modified')::timestamptz,
  NULLIF(data->>'fjc_id', '')::int,
  COALESCE(data->>'slug', ''),
  COALESCE(data->>'name_first', ''),
  COALESCE(data->>'name_middle', ''),
  COALESCE(data->>'name_last', ''),
  COALESCE(data->>'name_suffix', ''),
  NULLIF(data->>'date_dob', '')::date,
  COALESCE(data->>'date_granularity_dob', ''),
  NULLIF(data->>'date_dod', '')::date,
  COALESCE(data->>'date_granularity_dod', ''),
  COALESCE(data->>'dob_city', ''),
  COALESCE(data->>'dob_state', ''),
  COALESCE(data->>'dob_country', ''),
  COALESCE(data->>'dod_city', ''),
  COALESCE(data->>'dod_state', ''),
  COALESCE(data->>'dod_country', ''),
  COALESCE(data->>'gender', ''),
  COALESCE(data->>'religion', ''),
  COALESCE((data->>'has_photo')::boolean, false),
  NULLIF(data->>'ftm_total_received', '')::float,
  NULLIF(data->>'ftm_eid', ''),
  NULLIF(data->>'date_completed', '')::timestamptz,
  NULLIF(data->>'is_alias_of_id', '')::int
FROM case_law._staging_people
ON CONFLICT (id) DO NOTHING;

-- Person races
INSERT INTO case_law.person_races (id, person_id, race_id)
SELECT (data->>'id')::int, (data->>'person_id')::int, (data->>'race_id')::int
FROM case_law._staging_person_races
ON CONFLICT (id) DO NOTHING;

-- Positions
INSERT INTO case_law.positions (id, position_type, job_title, organization_name, date_created, date_modified,
  date_nominated, date_elected, date_recess_appointment,
  date_referred_to_judicial_committee, date_judicial_committee_action, date_hearing, date_confirmation,
  date_start, date_granularity_start, date_retirement, date_termination, date_granularity_termination,
  judicial_committee_action, nomination_process, voice_vote, votes_yes, votes_no, votes_yes_percent, votes_no_percent,
  how_selected, termination_reason, vote_type, location_city, location_state, has_inferred_values, sector,
  court_id, person_id, school_id, appointer_id, predecessor_id, supervisor_id)
SELECT (data->>'id')::int,
  NULLIF(data->>'position_type', ''),
  COALESCE(data->>'job_title', ''),
  NULLIF(data->>'organization_name', ''),
  (data->>'date_created')::timestamptz,
  (data->>'date_modified')::timestamptz,
  NULLIF(data->>'date_nominated', '')::date,
  NULLIF(data->>'date_elected', '')::date,
  NULLIF(data->>'date_recess_appointment', '')::date,
  NULLIF(data->>'date_referred_to_judicial_committee', '')::date,
  NULLIF(data->>'date_judicial_committee_action', '')::date,
  NULLIF(data->>'date_hearing', '')::date,
  NULLIF(data->>'date_confirmation', '')::date,
  NULLIF(data->>'date_start', '')::date,
  COALESCE(data->>'date_granularity_start', ''),
  NULLIF(data->>'date_retirement', '')::date,
  NULLIF(data->>'date_termination', '')::date,
  COALESCE(data->>'date_granularity_termination', ''),
  COALESCE(data->>'judicial_committee_action', ''),
  COALESCE(data->>'nomination_process', ''),
  NULLIF(data->>'voice_vote', '')::boolean,
  NULLIF(data->>'votes_yes', '')::int,
  NULLIF(data->>'votes_no', '')::int,
  NULLIF(data->>'votes_yes_percent', '')::float,
  NULLIF(data->>'votes_no_percent', '')::float,
  COALESCE(data->>'how_selected', ''),
  COALESCE(data->>'termination_reason', ''),
  COALESCE(data->>'vote_type', ''),
  COALESCE(data->>'location_city', ''),
  COALESCE(data->>'location_state', ''),
  COALESCE((data->>'has_inferred_values')::boolean, false),
  NULLIF(data->>'sector', '')::smallint,
  NULLIF(data->>'court_id', ''),
  NULLIF(data->>'person_id', '')::int,
  NULLIF(data->>'school_id', '')::int,
  NULLIF(data->>'appointer_id', '')::int,
  NULLIF(data->>'predecessor_id', '')::int,
  NULLIF(data->>'supervisor_id', '')::int
FROM case_law._staging_positions
ON CONFLICT (id) DO NOTHING;

-- Educations
INSERT INTO case_law.educations (id, date_created, date_modified, degree_detail, degree_level, degree_year, person_id, school_id)
SELECT (data->>'id')::int,
  (data->>'date_created')::timestamptz,
  (data->>'date_modified')::timestamptz,
  COALESCE(data->>'degree_detail', ''),
  COALESCE(data->>'degree_level', ''),
  NULLIF(data->>'degree_year', '')::smallint,
  NULLIF(data->>'person_id', '')::int,
  (data->>'school_id')::int
FROM case_law._staging_educations
ON CONFLICT (id) DO NOTHING;

-- Political affiliations
INSERT INTO case_law.political_affiliations (id, date_created, date_modified, political_party, source,
  date_start, date_granularity_start, date_end, date_granularity_end, person_id)
SELECT (data->>'id')::int,
  (data->>'date_created')::timestamptz,
  (data->>'date_modified')::timestamptz,
  COALESCE(data->>'political_party', ''),
  COALESCE(data->>'source', ''),
  NULLIF(data->>'date_start', '')::date,
  COALESCE(data->>'date_granularity_start', ''),
  NULLIF(data->>'date_end', '')::date,
  COALESCE(data->>'date_granularity_end', ''),
  NULLIF(data->>'person_id', '')::int
FROM case_law._staging_political_affiliations
ON CONFLICT (id) DO NOTHING;

-- Retention events
INSERT INTO case_law.retention_events (id, date_created, date_modified, retention_type, date_retention,
  votes_yes, votes_no, votes_yes_percent, votes_no_percent, unopposed, won, position_id)
SELECT (data->>'id')::int,
  (data->>'date_created')::timestamptz,
  (data->>'date_modified')::timestamptz,
  COALESCE(data->>'retention_type', ''),
  (data->>'date_retention')::date,
  NULLIF(data->>'votes_yes', '')::int,
  NULLIF(data->>'votes_no', '')::int,
  NULLIF(data->>'votes_yes_percent', '')::float,
  NULLIF(data->>'votes_no_percent', '')::float,
  NULLIF(data->>'unopposed', '')::boolean,
  NULLIF(data->>'won', '')::boolean,
  NULLIF(data->>'position_id', '')::int
FROM case_law._staging_retention_events
ON CONFLICT (id) DO NOTHING;

-- Drop staging tables
DROP TABLE IF EXISTS case_law._staging_courts;
DROP TABLE IF EXISTS case_law._staging_court_appeals_to;
DROP TABLE IF EXISTS case_law._staging_courthouses;
DROP TABLE IF EXISTS case_law._staging_races;
DROP TABLE IF EXISTS case_law._staging_schools;
DROP TABLE IF EXISTS case_law._staging_people;
DROP TABLE IF EXISTS case_law._staging_person_races;
DROP TABLE IF EXISTS case_law._staging_positions;
DROP TABLE IF EXISTS case_law._staging_educations;
DROP TABLE IF EXISTS case_law._staging_political_affiliations;
DROP TABLE IF EXISTS case_law._staging_retention_events;
RELATIONAL

echo "=== Step 4: Load opinions (the big one) ==="
load_csv_as_jsonb "opinions" "opinions.csv.bz2" "true"

echo "=== DONE ==="
psql_cmd -c "SELECT table_name, pg_size_pretty(pg_total_relation_size('case_law.' || table_name)) as size FROM information_schema.tables WHERE table_schema = 'case_law' ORDER BY pg_total_relation_size('case_law.' || table_name) DESC;"
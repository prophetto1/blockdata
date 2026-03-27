#!/usr/bin/env python
import sys
from pathlib import Path
import duckdb

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

IN_PARQUET = Path("datasets/citation_inventory.parquet")
DB_PATH = Path("datasets/legal10-updates.duckdb")
OUT_JSONL = Path("datasets/scotus_to_cap_map.jsonl")

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    if not IN_PARQUET.exists():
        print(f"ERROR: {IN_PARQUET} not found", file=sys.stderr)
        sys.exit(1)
    
    if not DB_PATH.exists():
        print(f"ERROR: {DB_PATH} not found", file=sys.stderr)
        sys.exit(1)

    print(f"Connecting to DuckDB (Read-Only Mode)...")
    conn = duckdb.connect(str(DB_PATH), read_only=True)

    try:
        # 1. Schema Validation (Sequential Step)
        print("Validating CAP metadata schema...")
        col_res = conn.execute("PRAGMA table_info(cap_cases_meta)").fetchall()
        columns = [row[1] for row in col_res]
        required = ['cap_id', 'official_cite', 'cite_key', 'decision_date_raw', 'cap_source', 'name']
        missing = [c for c in required if c not in columns]
        if missing:
            print(f"ERROR: Missing columns in cap_cases_meta: {missing}", file=sys.stderr)
            sys.exit(1)

        print("Executing Stage 2 'Legally Defensible' Crosswalk (V4.3)...")
        
        # 2. Sequential Thinking - The SQL Core
        sql = f"""
        COPY (
            WITH inventory_source AS (
                SELECT * FROM read_parquet('{IN_PARQUET}')
            ),
            inventory_base AS (
                SELECT DISTINCT 
                    normalized_cite,
                    cite_type,
                    LOWER(REGEXP_REPLACE(normalized_cite, '[^a-zA-Z0-9]', '', 'g')) as match_slug
                FROM inventory_source
                WHERE cite_type != 'U.S.'
            ),
            valid_reporter_pairs(cite_prefix, sourcename_prefix) AS (
                VALUES 
                    ('F.', 'cap_f1d'),
                    ('F.2d', 'cap_f2d'),
                    ('F.3d', 'cap_f3d'),
                    ('F.4th', 'cap_f3d'),
                    ('F. Supp.', 'cap_f1supp'),
                    ('F. Supp. 2d', 'cap_f2supp'),
                    ('F. Supp. 3d', 'cap_f3supp')
            ),
            tier1_matches AS (
                -- TIER 1: Exact matches (with Reporter Guard)
                SELECT 
                    ib.normalized_cite,
                    ib.cite_type,
                    cm.cap_id,
                    cm.cap_source,
                    cm.name AS cap_case_name,
                    cm.decision_date_raw AS cap_date,
                    cm.official_cite AS cap_official_cite,
                    'exact' as match_type
                FROM inventory_base ib
                JOIN cap_cases_meta cm ON ib.normalized_cite = cm.official_cite
                JOIN valid_reporter_pairs vrp ON ib.cite_type = vrp.cite_prefix 
                    AND cm.cap_source LIKE vrp.sourcename_prefix || '%'
            ),
            tier2_matches AS (
                -- TIER 2: Slug fallback (with Anti-Join on Tier 1)
                SELECT 
                    ib.normalized_cite,
                    ib.cite_type,
                    cm.cap_id,
                    cm.cap_source,
                    cm.name AS cap_case_name,
                    cm.decision_date_raw AS cap_date,
                    cm.official_cite AS cap_official_cite,
                    'slug' as match_type
                FROM inventory_base ib
                JOIN cap_cases_meta cm ON ib.match_slug = cm.cite_key
                JOIN valid_reporter_pairs vrp ON ib.cite_type = vrp.cite_prefix 
                    AND cm.cap_source LIKE vrp.sourcename_prefix || '%'
                WHERE NOT EXISTS (
                    SELECT 1 FROM tier1_matches t1
                    WHERE t1.normalized_cite = ib.normalized_cite 
                      AND t1.cite_type = ib.cite_type
                )
            ),
            all_potential_matches AS (
                SELECT * FROM tier1_matches
                UNION ALL
                SELECT * FROM tier2_matches
            ),
            ranked_matches AS (
                SELECT 
                    *,
                    COUNT(*) OVER (PARTITION BY normalized_cite, cite_type) as n_candidates,
                    ROW_NUMBER() OVER (PARTITION BY normalized_cite, cite_type ORDER BY 
                        CASE WHEN match_type = 'exact' THEN 1 ELSE 2 END,
                        cap_date DESC,
                        cap_id DESC
                    ) as rank
                FROM all_potential_matches
            ),
            resolved_matches AS (
                SELECT 
                    *,
                    CASE 
                        WHEN n_candidates > 1 THEN 'ambiguous-resolved'
                        ELSE match_type || '-resolved'
                    END as match_status
                FROM ranked_matches
                WHERE rank = 1
            )
            SELECT 
                inv.anchor_caseId,
                inv.normalized_cite,
                inv.cite_type,
                m.cap_id,
                m.cap_source,
                m.cap_case_name,
                m.cap_date,
                m.cap_official_cite,
                m.match_status,
                m.n_candidates,
                inv.start AS cite_start,
                inv.end AS cite_end
            FROM inventory_source inv
            LEFT JOIN resolved_matches m ON inv.normalized_cite = m.normalized_cite 
                AND inv.cite_type = m.cite_type
            WHERE inv.cite_type != 'U.S.'
        ) TO '{OUT_JSONL}' (FORMAT JSON, ARRAY FALSE)
        """
        
        conn.execute(sql)

        # 3. Verification Post-Completion (Legal Audit)
        print(f"Exported crosswalk result to {OUT_JSONL}...")
        print("\n--- Crosswalk Legal Audit (V4.3) ---")
        
        stats_query = f"""
            SELECT 
                COUNT(*) as total_occurrences,
                COUNT(cap_id) as matched_occurrences,
                COUNT(DISTINCT normalized_cite || cite_type) as unique_federal_cites,
                COUNT(DISTINCT CASE WHEN cap_id IS NOT NULL THEN normalized_cite || cite_type END) as unique_matched
            FROM read_json_auto('{OUT_JSONL}')
        """
        stats = conn.execute(stats_query).fetchone()

        total_occ, match_occ, unique_tot, unique_match = stats
        miss_rate_cite = (1 - (unique_match / unique_tot)) * 100 if unique_tot > 0 else 0
        
        print(f"Total Unique Federal Local Cites: {unique_tot:,}")
        print(f"Successfully Matched to CAP:    {unique_match:,}")
        print(f"Missed Citations (No CAP ID):   {unique_tot - unique_match:,}")
        print(f"Final Citation Miss Rate:       {miss_rate_cite:.2f}%")
        
        match_stats = conn.execute(f"""
            SELECT match_status, COUNT(DISTINCT normalized_cite || cite_type) 
            FROM read_json_auto('{OUT_JSONL}')
            WHERE cap_id IS NOT NULL
            GROUP BY 1 ORDER BY 2 DESC
        """).fetchall()
        
        print("\nMatch Distribution (Unique Cites):")
        for status, count in match_stats:
            print(f"  - {status}: {count:,}")

        print("\nStage 2 Certified Complete (V4.3).")

    except Exception as e:
        print(f"CRITICAL ERROR: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        conn.close()

if __name__ == "__main__":
    main()

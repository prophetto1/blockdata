#!/usr/bin/env python
"""
Stage 2b: SCOTUS-to-SCOTUS Citation Crosswalk

Maps U.S. citations from SCOTUS opinions to other SCOTUS cases in scdb_cases.
Unlike Stage 2 (CAP), no extraction step is needed - text is already in
scdb_full_with_text.jsonl.

Input:  datasets/citation_inventory.parquet (cite_type='U.S.', ~323K rows)
        datasets/legal10-updates.duckdb (scdb_cases table)
Output: datasets/scotus_to_scotus_map.parquet (primary)
        datasets/scotus_to_scotus_map.jsonl (portable)

Normalization:
  - Uses normalized_cite from Stage 1 as join key (no re-normalization on inventory side)
  - SCDB usCite is TRIM'd to handle trailing/leading whitespace drift
  - Format: "{vol} U.S. {page}" e.g., "347 U.S. 483"

Output Schema:
  anchor_caseId, anchor_usCite, normalized_cite,
  cited_caseId, cited_usCite, cited_lexisCite, cited_caseName, cited_term,
  cited_has_opinion_text, cited_missing_text_reason,
  match_status, match_reason, n_candidates, cite_start, cite_end

Match Status Taxonomy:
  - resolved: Exact single match found
  - ambiguous-resolved: Multiple matches, best one selected (most recent term)
  - unresolved: No match found

Match Reason Codes:
  - exact: Direct match on usCite
  - no_match: Citation not found in scdb_cases
  - duplicate_usCite: Multiple scdb_cases have same usCite (rare)
"""
import sys
from pathlib import Path
import duckdb

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

IN_PARQUET = Path("datasets/citation_inventory.parquet")
DB_PATH = Path("datasets/legal10-updates.duckdb")
OUT_PARQUET = Path("datasets/scotus_to_scotus_map.parquet")
OUT_JSONL = Path("datasets/scotus_to_scotus_map.jsonl")

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    # Input validation
    if not IN_PARQUET.exists():
        print(f"ERROR: {IN_PARQUET} not found", file=sys.stderr)
        sys.exit(1)

    if not DB_PATH.exists():
        print(f"ERROR: {DB_PATH} not found", file=sys.stderr)
        sys.exit(1)

    print("Stage 2b: SCOTUS-to-SCOTUS Citation Crosswalk")
    print("=" * 60)
    print(f"Connecting to DuckDB (Read-Only Mode)...")
    conn = duckdb.connect(str(DB_PATH), read_only=True)

    try:
        # 1. Schema Validation
        print("Validating scdb_cases schema...")
        col_res = conn.execute("PRAGMA table_info(scdb_cases)").fetchall()
        columns = [row[1] for row in col_res]
        required = ['caseId', 'usCite', 'lexisCite', 'caseName', 'term']
        missing = [c for c in required if c not in columns]
        if missing:
            print(f"ERROR: Missing columns in scdb_cases: {missing}", file=sys.stderr)
            sys.exit(1)

        # 2. Pre-flight: Check for duplicate usCite values in scdb_cases
        print("Checking for duplicate usCite values in scdb_cases...")
        dup_check = conn.execute("""
            SELECT TRIM(usCite) as usCite_norm, COUNT(*) as cnt
            FROM scdb_cases
            WHERE usCite IS NOT NULL AND TRIM(usCite) != ''
            GROUP BY TRIM(usCite)
            HAVING COUNT(*) > 1
            ORDER BY cnt DESC
            LIMIT 10
        """).fetchall()

        if dup_check:
            print(f"  WARNING: Found {len(dup_check)} duplicate usCite values:")
            for cite, cnt in dup_check[:5]:
                print(f"    - '{cite}': {cnt} cases")
                # Show actual caseIds/terms for debugging
                details = conn.execute(f"""
                    SELECT caseId, term, caseName
                    FROM scdb_cases
                    WHERE TRIM(usCite) = '{cite}'
                    ORDER BY term DESC
                """).fetchall()
                for cid, term, name in details:
                    print(f"        caseId={cid}, term={term}, name={name[:40]}...")
            print("  (Will use most recent term for ambiguous matches)")
        else:
            print("  No duplicate usCite values found.")

        # 3. Execute Crosswalk Query
        print("\nExecuting Stage 2b Crosswalk...")

        crosswalk_sql = f"""
        WITH inventory_source AS (
            SELECT * FROM read_parquet('{IN_PARQUET}')
            WHERE cite_type = 'U.S.'
        ),
        -- Unique U.S. citations to match (filter NULL/empty)
        unique_us_cites AS (
            SELECT DISTINCT normalized_cite
            FROM inventory_source
            WHERE normalized_cite IS NOT NULL AND normalized_cite != ''
        ),
        -- SCDB lookup with duplicate detection
        -- NOTE: TRIM usCite to handle any trailing/leading whitespace drift
        scdb_lookup AS (
            SELECT
                TRIM(usCite) AS usCite_norm,
                usCite AS usCite_raw,
                caseId,
                lexisCite,
                caseName,
                term,
                has_opinion_text,
                missing_text_reason,
                COUNT(*) OVER (PARTITION BY TRIM(usCite)) as n_scdb_matches,
                ROW_NUMBER() OVER (PARTITION BY TRIM(usCite) ORDER BY term DESC, caseId DESC) as scdb_rank
            FROM scdb_cases
            WHERE usCite IS NOT NULL AND TRIM(usCite) != ''
        ),
        -- Best match per usCite (handles duplicates)
        scdb_best AS (
            SELECT * FROM scdb_lookup WHERE scdb_rank = 1
        ),
        -- Match citations to SCDB (join on TRIM'd key)
        matched AS (
            SELECT
                uc.normalized_cite,
                sb.caseId AS cited_caseId,
                sb.usCite_raw AS cited_usCite,
                sb.lexisCite AS cited_lexisCite,
                sb.caseName AS cited_caseName,
                sb.term AS cited_term,
                sb.has_opinion_text AS cited_has_opinion_text,
                sb.missing_text_reason AS cited_missing_text_reason,
                sb.n_scdb_matches,
                CASE
                    WHEN sb.caseId IS NULL THEN 'unresolved'
                    WHEN sb.n_scdb_matches > 1 THEN 'ambiguous-resolved'
                    ELSE 'resolved'
                END AS match_status,
                CASE
                    WHEN sb.caseId IS NULL THEN 'no_match'
                    WHEN sb.n_scdb_matches > 1 THEN 'duplicate_usCite'
                    ELSE 'exact'
                END AS match_reason
            FROM unique_us_cites uc
            LEFT JOIN scdb_best sb ON uc.normalized_cite = sb.usCite_norm
        )
        -- Final join back to inventory for full output with positions
        SELECT
            inv.anchor_caseId,
            inv.anchor_usCite,
            inv.normalized_cite,
            m.cited_caseId,
            m.cited_usCite,
            m.cited_lexisCite,
            m.cited_caseName,
            m.cited_term,
            m.cited_has_opinion_text,
            m.cited_missing_text_reason,
            m.match_status,
            m.match_reason,
            COALESCE(m.n_scdb_matches, 0) AS n_candidates,
            inv.start AS cite_start,
            inv.end AS cite_end
        FROM inventory_source inv
        LEFT JOIN matched m ON inv.normalized_cite = m.normalized_cite
        """

        # 4. Write Parquet (primary artifact)
        print(f"Writing primary artifact: {OUT_PARQUET}")
        conn.execute(f"""
            COPY ({crosswalk_sql}) TO '{OUT_PARQUET}' (FORMAT PARQUET, COMPRESSION ZSTD)
        """)

        # 5. Write JSONL from Parquet (guarantees identical rows, avoids re-running query)
        print(f"Writing portable artifact: {OUT_JSONL}")
        conn.execute(f"""
            COPY (SELECT * FROM read_parquet('{OUT_PARQUET}')) TO '{OUT_JSONL}' (FORMAT JSON, ARRAY FALSE)
        """)

        # 6. Verification & Coverage Metrics
        print("\n" + "=" * 60)
        print("Stage 2b Verification & Coverage Metrics")
        print("=" * 60)

        stats = conn.execute(f"""
            SELECT
                COUNT(*) as total_occurrences,
                COUNT(cited_caseId) as matched_occurrences,
                COUNT(DISTINCT normalized_cite) as unique_us_cites,
                COUNT(DISTINCT CASE WHEN cited_caseId IS NOT NULL THEN normalized_cite END) as unique_matched
            FROM read_parquet('{OUT_PARQUET}')
        """).fetchone()

        total_occ, match_occ, unique_tot, unique_match = stats
        coverage = (unique_match / unique_tot) * 100 if unique_tot > 0 else 0

        print(f"\nCitation Occurrences:")
        print(f"  Total U.S. citation occurrences: {total_occ:,}")
        print(f"  Matched occurrences:             {match_occ:,}")

        print(f"\nUnique Citations:")
        print(f"  Total unique U.S. citations:     {unique_tot:,}")
        print(f"  Successfully matched:            {unique_match:,}")
        print(f"  Unresolved:                      {unique_tot - unique_match:,}")
        print(f"  Coverage rate:                   {coverage:.2f}%")

        # Match status distribution
        status_stats = conn.execute(f"""
            SELECT match_status, COUNT(DISTINCT normalized_cite) as cnt
            FROM read_parquet('{OUT_PARQUET}')
            GROUP BY match_status
            ORDER BY cnt DESC
        """).fetchall()

        print(f"\nMatch Status Distribution (Unique Cites):")
        for status, count in status_stats:
            pct = (count / unique_tot) * 100 if unique_tot > 0 else 0
            print(f"  - {status}: {count:,} ({pct:.1f}%)")

        # Match reason distribution
        reason_stats = conn.execute(f"""
            SELECT match_reason, COUNT(DISTINCT normalized_cite) as cnt
            FROM read_parquet('{OUT_PARQUET}')
            GROUP BY match_reason
            ORDER BY cnt DESC
        """).fetchall()

        print(f"\nMatch Reason Distribution (Unique Cites):")
        for reason, count in reason_stats:
            pct = (count / unique_tot) * 100 if unique_tot > 0 else 0
            print(f"  - {reason}: {count:,} ({pct:.1f}%)")

        # Top unresolved patterns (for debugging)
        print(f"\nTop 10 Unresolved Citations (by frequency):")
        unresolved = conn.execute(f"""
            SELECT normalized_cite, COUNT(*) as occurrences
            FROM read_parquet('{OUT_PARQUET}')
            WHERE match_status = 'unresolved'
            GROUP BY normalized_cite
            ORDER BY occurrences DESC
            LIMIT 10
        """).fetchall()

        if unresolved:
            for cite, occ in unresolved:
                print(f"  - '{cite}': {occ:,} occurrences")
        else:
            print("  (None - 100% coverage!)")

        # File sizes
        parquet_size = OUT_PARQUET.stat().st_size / 1024
        jsonl_size = OUT_JSONL.stat().st_size / 1024
        print(f"\nOutput Artifacts:")
        print(f"  {OUT_PARQUET.name}: {parquet_size:,.0f} KB")
        print(f"  {OUT_JSONL.name}: {jsonl_size:,.0f} KB")

        print("\n" + "=" * 60)
        print("Stage 2b Complete.")
        print("=" * 60)

    except Exception as e:
        print(f"CRITICAL ERROR: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        conn.close()


if __name__ == "__main__":
    main()

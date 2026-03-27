"""
Rank SCOTUS citations by Fowler authority score.

Source: citation_inventory.parquet (cite_type = 'U.S.')
Output: datasets/scotus_citations_ranked.jsonl

For each anchor, lists all unique SCOTUS citations ranked by Fowler pauth_score.
Unresolved citations get NULL score and rank last.

Expected counts (must match):
- 21,154 unique anchors
- 293,816 unique (anchor, citation) pairs
"""

import json
import duckdb
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent.parent
DATASETS = PROJECT_ROOT / "datasets"
DUCKDB_PATH = DATASETS / "legal10-updates.duckdb"
OUTPUT_PATH = DATASETS / "scotus_citations_ranked.jsonl"

# Expected counts for verification
EXPECTED_ANCHORS = 21154
EXPECTED_PAIRS = 293816


def main():
    con = duckdb.connect(str(DUCKDB_PATH), read_only=True)

    print("Ranking SCOTUS citations by Fowler score...")
    print(f"Source: citation_inventory.parquet (cite_type = 'U.S.')")

    # Query: Get unique citations per anchor, join to get Fowler scores, rank
    query = """
    WITH unique_citations AS (
        -- Get unique (anchor, citation) pairs from citation_inventory
        SELECT
            anchor_caseId,
            anchor_usCite,
            normalized_cite,
            COUNT(*) as occurrence_count,
            MIN(start) as first_offset
        FROM read_parquet(?)
        WHERE cite_type = 'U.S.'
        GROUP BY anchor_caseId, anchor_usCite, normalized_cite
    ),
    with_resolution AS (
        -- Join to scotus_to_scotus_map to get cited case info
        SELECT DISTINCT
            uc.anchor_caseId,
            uc.anchor_usCite,
            uc.normalized_cite,
            uc.occurrence_count,
            uc.first_offset,
            sm.cited_caseId,
            sm.cited_usCite,
            sm.cited_caseName,
            sm.cited_lexisCite,
            sm.match_status
        FROM unique_citations uc
        LEFT JOIN read_parquet(?) sm
            ON uc.anchor_caseId = sm.anchor_caseId
            AND uc.normalized_cite = sm.normalized_cite
    ),
    with_fowler AS (
        -- Join to fowler_scores to get pauth_score
        SELECT
            wr.*,
            f.pauth_score as fowler_score
        FROM with_resolution wr
        LEFT JOIN fowler_scores f ON wr.cited_lexisCite = f.lexis_cite
    ),
    ranked AS (
        -- Rank within each anchor by Fowler score (NULLs last)
        SELECT
            *,
            ROW_NUMBER() OVER (
                PARTITION BY anchor_caseId
                ORDER BY fowler_score DESC NULLS LAST, normalized_cite ASC
            ) as fowler_rank
        FROM with_fowler
    )
    SELECT
        anchor_caseId,
        anchor_usCite,
        LIST({
            'rank': fowler_rank,
            'normalized_cite': normalized_cite,
            'cited_caseId': cited_caseId,
            'cited_usCite': cited_usCite,
            'cited_caseName': cited_caseName,
            'fowler_score': ROUND(fowler_score, 6),
            'occurrences': occurrence_count,
            'resolved': match_status = 'resolved'
        } ORDER BY fowler_rank) as citations,
        COUNT(*) as n_citations
    FROM ranked
    GROUP BY anchor_caseId, anchor_usCite
    ORDER BY anchor_caseId
    """

    citation_inv_path = str(DATASETS / "citation_inventory.parquet")
    scotus_map_path = str(DATASETS / "scotus_to_scotus_map.parquet")

    print("Executing query...")
    result = con.execute(query, [citation_inv_path, scotus_map_path]).fetchall()

    # Verify counts
    n_anchors = len(result)
    n_pairs = sum(row[3] for row in result)  # n_citations column

    print(f"\nVerification:")
    print(f"  Anchors: {n_anchors:,} (expected {EXPECTED_ANCHORS:,}) {'OK' if n_anchors == EXPECTED_ANCHORS else 'MISMATCH!'}")
    print(f"  Pairs: {n_pairs:,} (expected {EXPECTED_PAIRS:,}) {'OK' if n_pairs == EXPECTED_PAIRS else 'MISMATCH!'}")

    if n_anchors != EXPECTED_ANCHORS or n_pairs != EXPECTED_PAIRS:
        print("\nERROR: Count mismatch! Aborting.")
        con.close()
        return

    # Write JSONL
    print(f"\nWriting to {OUTPUT_PATH}...")
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        for row in result:
            obj = {
                'anchor_caseId': row[0],
                'anchor_usCite': row[1],
                'citations': row[2],
                'n_citations': row[3]
            }
            f.write(json.dumps(obj, ensure_ascii=False) + '\n')

    # Summary stats
    print(f"\nDone! Summary:")
    print(f"  Total anchors: {n_anchors:,}")
    print(f"  Total citation pairs: {n_pairs:,}")

    # Sample output
    sample = result[0]
    print(f"\nSample (first anchor {sample[0]}):")
    for cite in sample[2][:3]:
        print(f"  #{cite['rank']}: {cite['cited_usCite']} (Fowler: {cite['fowler_score']})")

    con.close()


if __name__ == "__main__":
    main()
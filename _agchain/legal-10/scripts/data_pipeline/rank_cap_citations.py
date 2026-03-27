"""
Rank CAP citations by PageRank percentile.

Source: citation_inventory.parquet (cite_type != 'U.S.')
Output: datasets/cap_citations_ranked.jsonl

For each anchor, lists all unique CAP citations ranked by pagerank_percentile.
Unresolved citations get NULL score and rank last.

Expected counts (must match):
- 10,928 unique anchors
- 50,364 unique (anchor, citation) pairs
"""

import json
import duckdb
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent.parent
DATASETS = PROJECT_ROOT / "datasets"
DUCKDB_PATH = DATASETS / "legal10-updates.duckdb"
OUTPUT_PATH = DATASETS / "cap_citations_ranked.jsonl"

# Expected counts for verification
EXPECTED_ANCHORS = 10928
EXPECTED_PAIRS = 50364


def main():
    con = duckdb.connect(str(DUCKDB_PATH), read_only=True)

    print("Ranking CAP citations by PageRank...")
    print(f"Source: citation_inventory.parquet (cite_type != 'U.S.')")

    # Query: Get unique citations per anchor, join to get PageRank scores, rank
    query = """
    WITH unique_citations AS (
        -- Get unique (anchor, citation) pairs from citation_inventory
        SELECT
            anchor_caseId,
            anchor_usCite,
            cite_type,
            normalized_cite,
            COUNT(*) as occurrence_count,
            MIN(start) as first_offset
        FROM read_parquet(?)
        WHERE cite_type != 'U.S.'
        GROUP BY anchor_caseId, anchor_usCite, cite_type, normalized_cite
    ),
    with_resolution AS (
        -- Join to scotus_to_cap_map to get cap_id
        SELECT DISTINCT
            uc.anchor_caseId,
            uc.anchor_usCite,
            uc.cite_type,
            uc.normalized_cite,
            uc.occurrence_count,
            uc.first_offset,
            cm.cap_id,
            cm.cap_case_name,
            cm.match_status
        FROM unique_citations uc
        LEFT JOIN read_json(?) cm
            ON uc.normalized_cite = cm.normalized_cite
    ),
    with_pagerank AS (
        -- Join to cap_text_stats to get pagerank_percentile
        SELECT
            wr.*,
            cts.pagerank_percentile
        FROM with_resolution wr
        LEFT JOIN cap_text_stats cts ON wr.cap_id = cts.cap_id
    ),
    ranked AS (
        -- Rank within each anchor by PageRank (NULLs last)
        SELECT
            *,
            ROW_NUMBER() OVER (
                PARTITION BY anchor_caseId
                ORDER BY pagerank_percentile DESC NULLS LAST, normalized_cite ASC
            ) as pagerank_rank
        FROM with_pagerank
    )
    SELECT
        anchor_caseId,
        anchor_usCite,
        LIST({
            'rank': pagerank_rank,
            'cite_type': cite_type,
            'normalized_cite': normalized_cite,
            'cap_id': cap_id,
            'cap_name': cap_case_name,
            'pagerank_percentile': ROUND(pagerank_percentile, 6),
            'occurrences': occurrence_count,
            'resolved': match_status = 'resolved'
        } ORDER BY pagerank_rank) as citations,
        COUNT(*) as n_citations
    FROM ranked
    GROUP BY anchor_caseId, anchor_usCite
    ORDER BY anchor_caseId
    """

    citation_inv_path = str(DATASETS / "citation_inventory.parquet")
    cap_map_path = str(DATASETS / "scotus_to_cap_map.jsonl")

    print("Executing query...")
    result = con.execute(query, [citation_inv_path, cap_map_path]).fetchall()

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
        print(f"  #{cite['rank']}: {cite['normalized_cite']} (PageRank: {cite['pagerank_percentile']})")

    con.close()


if __name__ == "__main__":
    main()
"""
Create KA (Known Authority) views in legal10-updates.duckdb

Run with: python scripts/data_pipeline/create_ka_views.py
"""

import duckdb

DB_PATH = "datasets/legal10-updates.duckdb"


def create_views(con: duckdb.DuckDBPyConnection) -> None:
    """Create all KA-related views."""

    # 1) anchor_polarity: Shepards polarity per (anchor, cited_usid, treatment)
    con.execute("""
        CREATE OR REPLACE VIEW anchor_polarity AS
        SELECT
            s.caseId as anchor_caseId,
            e.cited_usid,
            e.treatment_norm,
            CASE
                WHEN e.treatment_norm IN ('follows') THEN 'in_favor'
                WHEN e.treatment_norm IN ('distinguishes', 'overrules', 'questions', 'criticizes', 'limits') THEN 'against'
                ELSE 'ignore'
            END as polarity,
            COUNT(*) as edge_count
        FROM scdb_cases s
        JOIN shepards_edges e ON s.lexisCite = e.citing_lexis
        WHERE e.supreme_court = 1 AND e.cited_usid IS NOT NULL
        GROUP BY s.caseId, e.cited_usid, e.treatment_norm
    """)
    print("Created view: anchor_polarity")

    # 2) anchor_polarity_agg: Aggregated polarity with "against dominates" rule
    con.execute("""
        CREATE OR REPLACE VIEW anchor_polarity_agg AS
        SELECT
            anchor_caseId,
            cited_usid,
            CASE
                WHEN MAX(CASE WHEN polarity = 'against' THEN 1 ELSE 0 END) = 1 THEN 'against'
                WHEN MAX(CASE WHEN polarity = 'in_favor' THEN 1 ELSE 0 END) = 1 THEN 'in_favor'
                ELSE 'ignore'
            END as final_polarity,
            SUM(edge_count) as total_edges
        FROM anchor_polarity
        GROUP BY anchor_caseId, cited_usid
    """)
    print("Created view: anchor_polarity_agg")

    # 3) ka_sc_in_favor: In-favor citations per anchor
    con.execute("""
        CREATE OR REPLACE VIEW ka_sc_in_favor AS
        SELECT
            anchor_caseId,
            LIST(cited_usid ORDER BY total_edges DESC) as in_favor_cites,
            COUNT(*) as n_in_favor
        FROM anchor_polarity_agg
        WHERE final_polarity = 'in_favor'
        GROUP BY anchor_caseId
    """)
    print("Created view: ka_sc_in_favor")

    # 4) ka_sc_against: Against citations per anchor
    con.execute("""
        CREATE OR REPLACE VIEW ka_sc_against AS
        SELECT
            anchor_caseId,
            LIST(cited_usid ORDER BY total_edges DESC) as against_cites,
            COUNT(*) as n_against
        FROM anchor_polarity_agg
        WHERE final_polarity = 'against'
        GROUP BY anchor_caseId
    """)
    print("Created view: ka_sc_against")

    # 5) ka_sc_ground_truth: Full KA-SC ground truth per anchor
    con.execute("""
        CREATE OR REPLACE VIEW ka_sc_ground_truth AS
        SELECT
            sr.anchor_caseId,
            sr.anchor_usCite,
            sr.n_citations as n_sc_citations,
            (SELECT c.cited_usCite
             FROM scotus_citations_ranked_flat c
             WHERE c.anchor_caseId = sr.anchor_caseId
               AND c.resolved = true
               AND c.fowler_score IS NOT NULL
             ORDER BY c.rank
             LIMIT 1) as controlling_authority,
            COALESCE(inf.in_favor_cites, []::VARCHAR[]) as in_favor,
            COALESCE(inf.n_in_favor, 0) as n_in_favor,
            COALESCE(ag.against_cites, []::VARCHAR[]) as against,
            COALESCE(ag.n_against, 0) as n_against,
            (SELECT c.normalized_cite
             FROM scotus_citations_ranked_flat c
             WHERE c.anchor_caseId = sr.anchor_caseId
             ORDER BY c.occurrences DESC, c.rank ASC
             LIMIT 1) as most_frequent
        FROM scotus_citations_ranked sr
        LEFT JOIN ka_sc_in_favor inf ON sr.anchor_caseId = inf.anchor_caseId
        LEFT JOIN ka_sc_against ag ON sr.anchor_caseId = ag.anchor_caseId
    """)
    print("Created view: ka_sc_ground_truth")

    # 6) ka_cap_ground_truth: KA-CAP ground truth (no polarity)
    con.execute("""
        CREATE OR REPLACE VIEW ka_cap_ground_truth AS
        SELECT
            cr.anchor_caseId,
            cr.anchor_usCite,
            cr.n_citations as n_cap_citations,
            (SELECT c.normalized_cite
             FROM cap_citations_ranked_flat c
             WHERE c.anchor_caseId = cr.anchor_caseId
               AND c.resolved = true
             ORDER BY c.rank
             LIMIT 1) as controlling_authority,
            []::VARCHAR[] as in_favor,
            []::VARCHAR[] as against,
            (SELECT c.normalized_cite
             FROM cap_citations_ranked_flat c
             WHERE c.anchor_caseId = cr.anchor_caseId
             ORDER BY c.occurrences DESC, c.rank ASC
             LIMIT 1) as most_frequent
        FROM cap_citations_ranked cr
    """)
    print("Created view: ka_cap_ground_truth")

    # 7) anchor_eligibility: Master view for admin webapp
    con.execute("""
        CREATE OR REPLACE VIEW anchor_eligibility AS
        WITH polarity_counts AS (
            SELECT anchor_caseId, COUNT(*) as n_polarity_edges
            FROM anchor_polarity_agg
            WHERE final_polarity != 'ignore'
            GROUP BY anchor_caseId
        )
        SELECT
            s.caseId as anchor_caseId,
            s.usCite as anchor_usCite,
            s.caseName,
            s.term,
            s.lexisCite,
            COALESCE(sc.n_citations, 0) as n_sc_citations,
            COALESCE(cap.n_citations, 0) as n_cap_citations,
            COALESCE(sc.n_citations, 0) + COALESCE(cap.n_citations, 0) as n_total_citations,
            CASE WHEN cap.n_citations > 0 THEN true ELSE false END as has_ka_cap,
            COALESCE(pol.n_polarity_edges, 0) as n_shepards_polarity_edges,
            CASE WHEN sc.n_citations >= 3 THEN true ELSE false END as eligible_ka_sc,
            CASE WHEN cap.n_citations >= 2 THEN true ELSE false END as eligible_ka_cap
        FROM scdb_cases s
        LEFT JOIN scotus_citations_ranked sc ON s.caseId = sc.anchor_caseId
        LEFT JOIN cap_citations_ranked cap ON s.caseId = cap.anchor_caseId
        LEFT JOIN polarity_counts pol ON s.caseId = pol.anchor_caseId
        WHERE COALESCE(sc.n_citations, 0) > 0 OR COALESCE(cap.n_citations, 0) > 0
    """)
    print("Created view: anchor_eligibility")

    # 8) Reporter hierarchy table for KA-CAP authority proxy
    con.execute("""
        CREATE OR REPLACE TABLE reporter_hierarchy (
            reporter VARCHAR,
            rank INTEGER,
            court_level VARCHAR
        )
    """)
    con.execute("""
        INSERT INTO reporter_hierarchy VALUES
            ('F.3d', 6, 'appellate'),
            ('F.2d', 5, 'appellate'),
            ('F.', 4, 'appellate'),
            ('F. Supp. 3d', 3, 'district'),
            ('F. Supp. 2d', 2, 'district'),
            ('F. Supp.', 1, 'district')
    """)
    print("Created table: reporter_hierarchy")


def verify_views(con: duckdb.DuckDBPyConnection) -> None:
    """Verify all views work correctly."""
    print("\n=== Verification ===")

    # Check ka_sc_ground_truth
    result = con.execute("""
        SELECT anchor_caseId, controlling_authority,
               len(in_favor) as n_in_favor, len(against) as n_against, most_frequent
        FROM ka_sc_ground_truth
        WHERE n_sc_citations >= 10
        LIMIT 3
    """).fetchdf()
    print("\nka_sc_ground_truth sample:")
    print(result.to_string())

    # Check anchor_eligibility
    result = con.execute("""
        SELECT anchor_caseId, term, n_sc_citations, n_cap_citations,
               has_ka_cap, n_shepards_polarity_edges
        FROM anchor_eligibility
        ORDER BY term DESC
        LIMIT 3
    """).fetchdf()
    print("\nanchor_eligibility sample:")
    print(result.to_string())

    # Count totals
    counts = con.execute("""
        SELECT
            (SELECT COUNT(*) FROM ka_sc_ground_truth) as ka_sc_anchors,
            (SELECT COUNT(*) FROM ka_cap_ground_truth) as ka_cap_anchors,
            (SELECT COUNT(*) FROM anchor_eligibility) as eligible_anchors,
            (SELECT COUNT(*) FROM anchor_polarity_agg WHERE final_polarity != 'ignore') as polarity_edges
    """).fetchone()
    print(f"\nTotals: {counts[0]} KA-SC anchors, {counts[1]} KA-CAP anchors, "
          f"{counts[2]} eligible anchors, {counts[3]} polarity edges")


def main():
    print(f"Connecting to {DB_PATH} (read-write)...")
    con = duckdb.connect(DB_PATH, read_only=False)

    try:
        create_views(con)
        verify_views(con)
        print("\nAll views created and verified successfully!")
    finally:
        con.close()


if __name__ == "__main__":
    main()

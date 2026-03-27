"""Add Martin-Quinn ideology scores to Legal-10 database.

Loads MQ scores from CSV and joins to SCDB cases.
Run: python scripts/add_martin_quinn.py
"""

import csv
import duckdb
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "datasets" / "legal10-updates.duckdb"
CSV_PATH = Path(__file__).parent.parent / "datasets" / "martin_quinn_justices.csv"


def load_mq_from_csv() -> list[tuple]:
    """Load Martin-Quinn scores from downloaded CSV.

    CSV columns: term, justice, justiceName, post_mn, post_sd, post_med, post_025, post_975
    Returns: list of (scdb_justice_id, term, post_mn, post_sd, justice_name)
    """
    rows = []
    with open(CSV_PATH, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append((
                int(row['justice']),      # scdb_justice_id
                int(row['term']),         # term
                float(row['post_mn']),    # ideology score
                float(row['post_sd']),    # uncertainty
                row['justiceName']        # justice name
            ))
    return rows


def create_tables(conn: duckdb.DuckDBPyConnection, mq_data: list[tuple]) -> None:
    """Create MQ scores table from CSV data."""

    conn.execute("DROP TABLE IF EXISTS martin_quinn_scores")
    conn.execute("""
        CREATE TABLE martin_quinn_scores (
            scdb_justice_id INTEGER,
            term INTEGER,
            post_mn DOUBLE,      -- ideology: neg=liberal, pos=conservative
            post_sd DOUBLE,      -- uncertainty
            justice_name VARCHAR,
            PRIMARY KEY (scdb_justice_id, term)
        )
    """)

    for row in mq_data:
        conn.execute(
            "INSERT INTO martin_quinn_scores VALUES (?, ?, ?, ?, ?)",
            row
        )

    print(f"Created martin_quinn_scores: {len(mq_data)} rows")

    # Show term range
    result = conn.execute("""
        SELECT MIN(term) as min_term, MAX(term) as max_term,
               COUNT(DISTINCT scdb_justice_id) as justices
        FROM martin_quinn_scores
    """).fetchone()
    print(f"  Terms: {result[0]}-{result[1]}, Justices: {result[2]}")


def create_enriched_view(conn: duckdb.DuckDBPyConnection) -> None:
    """Create view joining SCDB cases to MQ scores."""

    conn.execute("DROP VIEW IF EXISTS scdb_with_ideology")
    conn.execute("""
        CREATE VIEW scdb_with_ideology AS
        SELECT
            s.caseId,
            s.caseName,
            s.term,
            s.majOpinWriter,
            m.justice_name as author_name,
            m.post_mn as author_ideology,
            m.post_sd as ideology_uncertainty,
            s.decisionDirection,
            s.partyWinning,
            s.issueArea
        FROM scdb_cases s
        LEFT JOIN martin_quinn_scores m
            ON CAST(s.majOpinWriter AS INTEGER) = m.scdb_justice_id
            AND CAST(s.term AS INTEGER) = m.term
        WHERE s.majOpinWriter IS NOT NULL
    """)

    # Check coverage
    result = conn.execute("""
        SELECT
            COUNT(*) as total_cases,
            COUNT(author_ideology) as with_ideology,
            ROUND(100.0 * COUNT(author_ideology) / COUNT(*), 1) as coverage_pct
        FROM scdb_with_ideology
    """).fetchone()

    print(f"\nCreated scdb_with_ideology view:")
    print(f"  Total cases with author: {result[0]}")
    print(f"  Cases with ideology score: {result[1]}")
    print(f"  Coverage: {result[2]}%")


def show_sample(conn: duckdb.DuckDBPyConnection) -> None:
    """Show sample of enriched data."""

    print("\n--- Sample: Cases with Author Ideology ---")
    result = conn.execute("""
        SELECT
            caseName,
            term,
            author_name,
            ROUND(author_ideology, 2) as ideology,
            CASE
                WHEN decisionDirection = '1' THEN 'conservative'
                WHEN decisionDirection = '2' THEN 'liberal'
                ELSE 'unknown'
            END as direction
        FROM scdb_with_ideology
        WHERE author_ideology IS NOT NULL
        ORDER BY term DESC
        LIMIT 10
    """).fetchall()

    for row in result:
        name = row[2][:20] if row[2] else "Unknown"
        print(f"  {row[1]} | {name:20} | ideology={row[3]:+.2f} | {row[4]}")


def main():
    print(f"Loading MQ scores from: {CSV_PATH}")

    if not CSV_PATH.exists():
        print(f"ERROR: CSV not found. Download from:")
        print("  https://mqscores.wustl.edu/media/2024/justices.csv")
        return

    mq_data = load_mq_from_csv()
    print(f"Loaded {len(mq_data)} justice-term pairs from CSV")

    print(f"\nConnecting to: {DB_PATH}")
    if not DB_PATH.exists():
        print(f"ERROR: Database not found at {DB_PATH}")
        return

    conn = duckdb.connect(str(DB_PATH))

    try:
        create_tables(conn, mq_data)
        create_enriched_view(conn)
        show_sample(conn)

        print("\n--- New Question Types Enabled ---")
        print("Q12: Given case facts, predict author ideology (liberal/conservative)")
        print("Q13: Given author ideology, predict decision direction")
        print("Q14: Identify swing vote (median ideology that term)")

    finally:
        conn.close()

    print("\nDone! Martin-Quinn scores added to database.")


if __name__ == "__main__":
    main()

from __future__ import annotations

import argparse
from pathlib import Path

import duckdb


DEFAULT_DB_PATH = Path(__file__).resolve().parents[1] / "datasets" / "legal10-updates.duckdb"


def main() -> int:
    parser = argparse.ArgumentParser(description="Sanity-check that the DuckDB file opens and can be queried.")
    parser.add_argument(
        "--db-path",
        type=Path,
        default=DEFAULT_DB_PATH,
        help="Path to the .duckdb database file",
    )
    args = parser.parse_args()

    db_path = args.db_path.resolve()
    print(f"duckdb_version={duckdb.__version__}")
    print(f"db_path={db_path}")
    print(f"db_exists={db_path.exists()}")

    con = duckdb.connect(str(db_path), read_only=True)
    try:
        one = con.execute("select 1").fetchone()
        print(f"select_1={one}")
        table_count = con.execute(
            "select count(*) from information_schema.tables "
            "where table_schema not in ('information_schema','pg_catalog')"
        ).fetchone()
        print(f"user_table_count={table_count}")
    finally:
        con.close()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

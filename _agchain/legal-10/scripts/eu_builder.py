"""EU Builder for Legal-10 3-Step MVP.

Converts existing RP directories into sealed EU v2 packets:
  eus/<eu_id>/p1.json         (anchor payload)
  eus/<eu_id>/p2.json         (authorities payload)
  eus/<eu_id>/ground_truth.json (runner-only; never staged)

Uses Option B approach: takes an existing RP dir and maps it to EU v2.

Ground truth computation:
  - anchor_inventory_full: from citation_inventory.parquet
  - rp_subset: from shipped p2 authorities
  - known_authority: from DuckDB using fdq-01-ka-sc.md SQL queries

Usage:
  python eu_builder.py --rp-dir datasets/rps/rpv1__1826-018 --out datasets/eus/legal10_3step_v1 --db datasets/legal10-updates.duckdb --inventory datasets/citation_inventory.parquet
  python eu_builder.py --rp-root datasets/rps --out datasets/eus/legal10_3step_v1 --db datasets/legal10-updates.duckdb --inventory datasets/citation_inventory.parquet [--limit N]
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

try:
    import duckdb
except ImportError:
    print("ERROR: duckdb is required. Install with: pip install duckdb", file=sys.stderr)
    sys.exit(1)

try:
    import pyarrow.parquet as pq
except ImportError:
    print("ERROR: pyarrow is required. Install with: pip install pyarrow", file=sys.stderr)
    sys.exit(1)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _write_json(path: Path, data: dict | list) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(data, indent=2, ensure_ascii=False, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def _load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


# ---------------------------------------------------------------------------
# Ground truth: anchor_inventory_full from citation_inventory.parquet
# ---------------------------------------------------------------------------

def load_anchor_inventory(inventory_path: Path, anchor_case_id: str) -> list[str]:
    """Load all unique in-scope normalized_cite values for an anchor from citation_inventory.parquet."""
    table = pq.read_table(
        inventory_path,
        filters=[("anchor_caseId", "=", anchor_case_id)],
        columns=["normalized_cite"],
    )
    cites = sorted(set(
        row.as_py()
        for row in table.column("normalized_cite")
        if row.as_py() is not None
    ))
    return cites


# ---------------------------------------------------------------------------
# Ground truth: known_authority from DuckDB (fdq-01-ka-sc.md SQL queries)
# ---------------------------------------------------------------------------

_SQL_CONTROLLING = """\
SELECT cited_usCite
FROM scotus_citations_ranked_flat
WHERE anchor_usCite = ?
  AND fowler_score IS NOT NULL
ORDER BY fowler_score DESC, occurrences DESC, cited_usCite ASC
LIMIT 1;
"""

_SQL_IN_FAVOR = """\
SELECT DISTINCT c.cited_usCite
FROM scotus_citations_ranked_flat c
JOIN scdb_cases anchor_scdb ON c.anchor_usCite = anchor_scdb.usCite
JOIN scdb_cases cited_scdb ON c.cited_usCite = cited_scdb.usCite
JOIN shepards_edges s
    ON anchor_scdb.lexisCite = s.citing_lexis
    AND cited_scdb.lexisCite = s.cited_lexis
WHERE c.anchor_usCite = ?
  AND s.treatment_norm = 'follows';
"""

_SQL_AGAINST = """\
SELECT DISTINCT c.cited_usCite
FROM scotus_citations_ranked_flat c
JOIN scdb_cases anchor_scdb ON c.anchor_usCite = anchor_scdb.usCite
JOIN scdb_cases cited_scdb ON c.cited_usCite = cited_scdb.usCite
JOIN shepards_edges s
    ON anchor_scdb.lexisCite = s.citing_lexis
    AND cited_scdb.lexisCite = s.cited_lexis
WHERE c.anchor_usCite = ?
  AND s.treatment_norm IN ('distinguishes', 'questions', 'criticizes', 'overrules', 'limits');
"""

_SQL_MOST_FREQUENT = """\
SELECT cited_usCite
FROM scotus_citations_ranked_flat
WHERE anchor_usCite = ?
  AND occurrences IS NOT NULL
ORDER BY occurrences DESC, fowler_score DESC, cited_usCite ASC
LIMIT 1;
"""


def compute_known_authority(db_path: Path, anchor_us_cite: str) -> dict[str, Any]:
    """Compute KA-SC ground truth from DuckDB."""
    con = duckdb.connect(str(db_path), read_only=True)
    try:
        row = con.execute(_SQL_CONTROLLING, [anchor_us_cite]).fetchone()
        controlling = row[0] if row else None

        rows = con.execute(_SQL_IN_FAVOR, [anchor_us_cite]).fetchall()
        in_favor = sorted([r[0] for r in rows]) if rows else []

        rows = con.execute(_SQL_AGAINST, [anchor_us_cite]).fetchall()
        against = sorted([r[0] for r in rows]) if rows else []

        row = con.execute(_SQL_MOST_FREQUENT, [anchor_us_cite]).fetchone()
        most_frequent = row[0] if row else None
    finally:
        con.close()

    return {
        "controlling_authority": controlling,
        "in_favor": in_favor,
        "against": against,
        "most_frequent": most_frequent,
    }


# ---------------------------------------------------------------------------
# EU v2 packet builders
# ---------------------------------------------------------------------------

def build_p1(rp_d1: dict, doc3: dict) -> dict:
    """Build EU p1.json (anchor payload) from RP payloads/d1.json + doc3.json."""
    # Enrich citations with inventory_normalized_cite from doc3
    doc3_cite_map = {c["citation_id"]: c for c in doc3.get("citations", [])}
    enriched_citations = []
    for cite in rp_d1.get("citations", []):
        doc3_cite = doc3_cite_map.get(cite.get("citation_id"), {})
        enriched_citations.append({
            "citation_id": cite["citation_id"],
            "source": cite.get("source", "SCOTUS"),
            "inventory_normalized_cite": doc3_cite.get("inventory_normalized_cite", cite.get("usCite")),
            "usCite": cite.get("usCite"),
            "capCite": cite.get("capCite"),
            "caseName": cite.get("caseName"),
            "cite_offset": cite.get("cite_offset"),
        })

    return {
        "payload_id": "p1",
        "payload_version": "1.0.0",
        "type": "anchor",
        "candidate_visible": True,
        "content": {
            "anchor": rp_d1["anchor"],
        },
        "metadata": {
            "citations": enriched_citations,
            "scdb": doc3.get("scdb", {}),
            "rp_id": doc3.get("rp_id"),
        },
    }


def build_p2(rp_d2: dict, doc3: dict) -> dict:
    """Build EU p2.json (authorities payload) from RP payloads/d2.json + doc3.json."""
    doc3_cite_map = {c["citation_id"]: c for c in doc3.get("citations", [])}
    enriched_authorities = []
    for auth in rp_d2.get("authorities", []):
        doc3_cite = doc3_cite_map.get(auth.get("authority_id"), {})
        enriched_authorities.append({
            "authority_id": auth["authority_id"],
            "source": auth.get("source", "SCOTUS"),
            "inventory_normalized_cite": doc3_cite.get("inventory_normalized_cite", auth.get("usCite")),
            "usCite": auth.get("usCite"),
            "capCite": auth.get("capCite"),
            "caseName": auth.get("caseName"),
            "text": auth.get("text"),
            "char_count": auth.get("char_count"),
            "ranking": auth.get("ranking"),
        })

    return {
        "payload_id": "p2",
        "payload_version": "1.0.0",
        "type": "authorities",
        "candidate_visible": True,
        "content": {
            "authorities": enriched_authorities,
        },
    }


def compute_rp_subset(p2: dict) -> list[str]:
    """Extract sorted unique normalized_cite values from shipped p2 authorities."""
    cites = set()
    for auth in p2.get("content", {}).get("authorities", []):
        nc = auth.get("inventory_normalized_cite")
        if nc:
            cites.add(nc)
    return sorted(cites)


def build_ground_truth(
    *,
    anchor_case_id: str,
    anchor_us_cite: str,
    anchor_inventory_full: list[str],
    rp_subset: list[str],
    known_authority: dict[str, Any],
    rp_id: str,
    db_path: str,
    inventory_path: str,
) -> dict:
    """Build EU ground_truth.json (runner-only)."""
    return {
        "eu_id": f"eu__{anchor_case_id}",
        "eu_version": "1.0.0",
        "anchor_caseId": anchor_case_id,
        "anchor_usCite": anchor_us_cite,
        "anchor_inventory_full": anchor_inventory_full,
        "rp_subset": rp_subset,
        "known_authority": known_authority,
        "provenance": {
            "dataset_db": str(db_path),
            "citation_inventory_parquet": str(inventory_path),
            "rp_id": rp_id,
        },
    }


# ---------------------------------------------------------------------------
# Single EU build
# ---------------------------------------------------------------------------

def build_eu_from_rp(
    rp_dir: Path,
    out_root: Path,
    db_path: Path,
    inventory_path: Path,
    *,
    dry_run: bool = False,
) -> Path | None:
    """Build one EU from an existing RP directory."""
    doc3 = _load_json(rp_dir / "doc3.json")
    rp_d1 = _load_json(rp_dir / "payloads" / "d1.json")
    rp_d2 = _load_json(rp_dir / "payloads" / "d2.json")

    anchor_case_id = doc3["anchor"]["caseId"]
    anchor_us_cite = doc3["anchor"]["usCite"]
    rp_id = doc3["rp_id"]
    eu_id = f"eu__{anchor_case_id}"
    eu_dir = out_root / "eus" / eu_id

    print(f"  Building EU: {eu_id} (anchor: {anchor_us_cite})")

    # Build p1 and p2
    p1 = build_p1(rp_d1, doc3)
    p2 = build_p2(rp_d2, doc3)
    rp_subset = compute_rp_subset(p2)

    # Ground truth: anchor_inventory_full
    anchor_inventory_full = load_anchor_inventory(inventory_path, anchor_case_id)
    if not anchor_inventory_full:
        print(f"    WARNING: No citations found in inventory for anchor {anchor_case_id}")

    # Ground truth: known_authority
    known_authority = compute_known_authority(db_path, anchor_us_cite)
    if known_authority["controlling_authority"] is None:
        print(f"    WARNING: No controlling_authority found for anchor {anchor_us_cite}")

    gt = build_ground_truth(
        anchor_case_id=anchor_case_id,
        anchor_us_cite=anchor_us_cite,
        anchor_inventory_full=anchor_inventory_full,
        rp_subset=rp_subset,
        known_authority=known_authority,
        rp_id=rp_id,
        db_path=str(db_path),
        inventory_path=str(inventory_path),
    )

    if dry_run:
        print(f"    [DRY RUN] Would write to {eu_dir}")
        print(f"    p1: {len(json.dumps(p1)):,} bytes, {len(p1['metadata']['citations'])} citations")
        print(f"    p2: {len(json.dumps(p2)):,} bytes, {len(p2['content']['authorities'])} authorities")
        print(f"    GT: anchor_inventory_full={len(anchor_inventory_full)}, rp_subset={len(rp_subset)}")
        print(f"    GT: controlling={known_authority['controlling_authority']}, "
              f"in_favor={len(known_authority['in_favor'])}, "
              f"against={len(known_authority['against'])}, "
              f"most_frequent={known_authority['most_frequent']}")
        return None

    _write_json(eu_dir / "p1.json", p1)
    _write_json(eu_dir / "p2.json", p2)
    _write_json(eu_dir / "ground_truth.json", gt)

    print(f"    OK  p1.json ({(eu_dir / 'p1.json').stat().st_size:,} bytes)")
    print(f"    OK  p2.json ({(eu_dir / 'p2.json').stat().st_size:,} bytes)")
    print(f"    OK  ground_truth.json ({(eu_dir / 'ground_truth.json').stat().st_size:,} bytes)")
    print(f"    anchor_inventory_full: {len(anchor_inventory_full)} citations")
    print(f"    rp_subset: {len(rp_subset)} citations")
    print(f"    known_authority.controlling: {known_authority['controlling_authority']}")

    return eu_dir


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="Legal-10 EU Builder (RP -> EU v2)")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--rp-dir", type=Path, help="Path to a single RP directory")
    group.add_argument("--rp-root", type=Path, help="Root dir containing multiple RP dirs (datasets/rps)")
    parser.add_argument("--out", type=Path, required=True, help="EU output root (e.g. datasets/eus/legal10_3step_v1)")
    parser.add_argument("--db", type=Path, required=True, help="DuckDB database path")
    parser.add_argument("--inventory", type=Path, required=True, help="citation_inventory.parquet path")
    parser.add_argument("--limit", type=int, default=0, help="Max EUs to build (0 = all)")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be built without writing")
    args = parser.parse_args()

    if not args.db.exists():
        print(f"ERROR: DuckDB not found: {args.db}", file=sys.stderr)
        sys.exit(1)
    if not args.inventory.exists():
        print(f"ERROR: Inventory parquet not found: {args.inventory}", file=sys.stderr)
        sys.exit(1)

    rp_dirs: list[Path] = []
    if args.rp_dir:
        if not args.rp_dir.exists():
            print(f"ERROR: RP directory not found: {args.rp_dir}", file=sys.stderr)
            sys.exit(1)
        rp_dirs = [args.rp_dir]
    else:
        if not args.rp_root.exists():
            print(f"ERROR: RP root not found: {args.rp_root}", file=sys.stderr)
            sys.exit(1)
        rp_dirs = sorted([
            d for d in args.rp_root.iterdir()
            if d.is_dir() and d.name.startswith("rpv1__")
        ])
        if not rp_dirs:
            print(f"ERROR: No RP directories found in {args.rp_root}", file=sys.stderr)
            sys.exit(1)

    if args.limit > 0:
        rp_dirs = rp_dirs[:args.limit]

    mode = "[DRY RUN] " if args.dry_run else ""
    print(f"{mode}Building {len(rp_dirs)} EU(s) -> {args.out}")
    print()

    built = 0
    errors = 0
    for rp_dir in rp_dirs:
        try:
            result = build_eu_from_rp(
                rp_dir, args.out, args.db, args.inventory, dry_run=args.dry_run,
            )
            if result is not None or args.dry_run:
                built += 1
        except Exception as e:
            print(f"  ERROR building EU from {rp_dir.name}: {e}", file=sys.stderr)
            errors += 1
        print()

    print(f"Done. Built: {built}, Errors: {errors}")


if __name__ == "__main__":
    main()

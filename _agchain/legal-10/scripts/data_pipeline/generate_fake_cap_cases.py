#!/usr/bin/env python3
"""Generate fake CAP (federal reporter) citations for S8 hallucination detection.

Generates deterministic fake federal reporter citations and collision-checks them
against the CAP official-cite universe from DuckDB (cap_cases_meta.official_cite).

Outputs (by default):
- datasets/fake_cap_cases.csv
- datasets/fake_cap_cases_manifest.json

Usage:
  py -3 scripts/data_pipeline/generate_fake_cap_cases.py --seed 20260107 --count 1000
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import random
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from core.ids.canonical import canonicalize_cite


PERSON_POOL: tuple[str, ...] = (
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
    "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
    "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson",
    "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson",
)

COMPANY_POOL: tuple[str, ...] = (
    "Google LLC", "Meta Platforms Inc.", "Amazon Inc.", "Apple Inc.",
    "Microsoft Corp.", "Tesla Inc.", "Uber Technologies", "Twitter Inc.",
    "General Motors Corp.", "Ford Motor Co.", "Exxon Mobil Corp.",
)

STATE_POOL: tuple[str, ...] = (
    "California", "Texas", "New York", "Florida", "Illinois", "Pennsylvania",
    "Ohio", "Georgia", "Michigan", "North Carolina", "New Jersey", "Virginia",
)

CITY_POOL: tuple[str, ...] = (
    "Boston", "Chicago", "Houston", "Phoenix", "Philadelphia", "San Antonio",
    "San Diego", "Dallas", "San Jose", "Austin", "Jacksonville", "Fort Worth",
)


def generate_case_name(rng: random.Random) -> str:
    """Generate a plausible-looking case name."""
    pattern = rng.randint(0, 5)

    if pattern == 0:  # Person v. Person
        p1 = rng.choice(PERSON_POOL)
        p2 = rng.choice(PERSON_POOL)
        while p2 == p1:
            p2 = rng.choice(PERSON_POOL)
        return f"{p1} v. {p2}"

    if pattern == 1:  # United States v. Person
        return f"United States v. {rng.choice(PERSON_POOL)}"

    if pattern == 2:  # State v. Person
        return f"{rng.choice(STATE_POOL)} v. {rng.choice(PERSON_POOL)}"

    if pattern == 3:  # Person v. Company
        return f"{rng.choice(PERSON_POOL)} v. {rng.choice(COMPANY_POOL)}"

    if pattern == 4:  # City v. Company
        return f"City of {rng.choice(CITY_POOL)} v. {rng.choice(COMPANY_POOL)}"

    # In re Company
    return f"In re {rng.choice(COMPANY_POOL)}"


# CAP DB has exactly these 6 reporter patterns in official_cite (no F.4th)
CITE_TYPES: tuple[str, ...] = (
    "F.",
    "F.2d",
    "F.3d",
    "F. Supp.",
    "F. Supp. 2d",
    "F. Supp. 3d",
)


def generate_cap_citation(rng: random.Random) -> str:
    """Generate a plausible-looking federal reporter citation."""
    cite_type = rng.choice(CITE_TYPES)
    volume = rng.randint(1, 5000)
    page = rng.randint(1, 5000)
    return f"{volume} {cite_type} {page}"


def load_cap_universe(db_path: Path) -> tuple[set[str], str]:
    """Load and canonicalize CAP official cites from DuckDB.

    Returns:
        (set of canonical cites, sha256 hash of the sorted canonical set)
    """
    import duckdb

    if not db_path.exists():
        raise FileNotFoundError(f"DuckDB not found: {db_path}")

    conn = duckdb.connect(str(db_path), read_only=True)
    try:
        rows = conn.execute(
            """
            SELECT DISTINCT official_cite
            FROM cap_cases_meta
            WHERE official_cite IS NOT NULL AND TRIM(official_cite) != ''
            """
        ).fetchall()
    finally:
        conn.close()

    canonical_cites: set[str] = set()
    for (cite,) in rows:
        canonical_cites.add(canonicalize_cite(cite))

    sorted_cites = sorted(canonical_cites)
    universe_sha256 = hashlib.sha256("\n".join(sorted_cites).encode("utf-8")).hexdigest()
    return canonical_cites, universe_sha256


def generate_fake_cap_cases(
    *,
    seed: int,
    count: int,
    cap_universe: set[str],
) -> tuple[list[dict[str, str]], int]:
    """Generate fake CAP citations with collision checking.

    Returns:
        (list of fake case dicts, number of collisions skipped)
    """
    rng = random.Random(seed)
    fake_cases: list[dict[str, str]] = []
    used_canonical_cites: set[str] = set()
    collisions_skipped = 0

    max_attempts = count * 25
    attempts = 0

    while len(fake_cases) < count and attempts < max_attempts:
        attempts += 1

        case_name = generate_case_name(rng)
        cap_citation = generate_cap_citation(rng)
        canonical = canonicalize_cite(cap_citation)

        if canonical in cap_universe:
            collisions_skipped += 1
            continue

        if canonical in used_canonical_cites:
            collisions_skipped += 1
            continue

        used_canonical_cites.add(canonical)
        fake_cases.append({"case_name": case_name, "cap_citation": cap_citation})

    if len(fake_cases) < count:
        raise RuntimeError(
            f"Could not generate {count} unique fake CAP cites after {max_attempts} attempts. "
            f"Generated {len(fake_cases)}, skipped {collisions_skipped} collisions."
        )

    return fake_cases, collisions_skipped


def write_csv(fake_cases: list[dict[str, str]], output_path: Path) -> str:
    """Write fake CAP cases to CSV and return sha256 of the file."""
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["case_name", "cap_citation"])
        writer.writeheader()
        writer.writerows(fake_cases)

    return hashlib.sha256(output_path.read_bytes()).hexdigest()


def write_manifest(
    *,
    manifest_path: Path,
    seed: int,
    count: int,
    cap_official_cite_universe_sha256: str,
    collisions_skipped: int,
    output_sha256: str,
) -> None:
    """Write the manifest JSON."""
    manifest = {
        "seed": seed,
        "count": count,
        "cap_official_cite_universe_sha256": cap_official_cite_universe_sha256,
        "collisions_skipped": collisions_skipped,
        "output_sha256": output_sha256,
    }

    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
        f.write("\n")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate fake CAP (federal reporter) citations for S8 hallucination detection."
    )
    parser.add_argument("--seed", type=int, default=20260107)
    parser.add_argument("--count", type=int, default=1000)
    parser.add_argument(
        "--db-path",
        type=Path,
        default=PROJECT_ROOT / "datasets" / "legal10-updates.duckdb",
        help="Path to DuckDB containing cap_cases_meta",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=PROJECT_ROOT / "datasets",
        help="Output directory for CSV + manifest",
    )

    args = parser.parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)

    print(f"Loading CAP cite universe from {args.db_path}...")
    cap_universe, universe_sha256 = load_cap_universe(args.db_path)
    print(f"  Loaded {len(cap_universe):,} canonical CAP official cites")
    print(f"  Universe SHA256: {universe_sha256[:16]}...")

    print(f"Generating {args.count} fake CAP citations with seed {args.seed}...")
    fake_cases, collisions_skipped = generate_fake_cap_cases(
        seed=args.seed,
        count=args.count,
        cap_universe=cap_universe,
    )
    print(f"  Generated {len(fake_cases)} fake CAP citations")
    print(f"  Collisions skipped: {collisions_skipped}")

    csv_path = args.output_dir / "fake_cap_cases.csv"
    manifest_path = args.output_dir / "fake_cap_cases_manifest.json"

    print(f"Writing {csv_path}...")
    output_sha256 = write_csv(fake_cases, csv_path)
    print(f"  Output SHA256: {output_sha256[:16]}...")

    print(f"Writing {manifest_path}...")
    write_manifest(
        manifest_path=manifest_path,
        seed=args.seed,
        count=args.count,
        cap_official_cite_universe_sha256=universe_sha256,
        collisions_skipped=collisions_skipped,
        output_sha256=output_sha256,
    )

    print("Done.")


if __name__ == "__main__":
    main()

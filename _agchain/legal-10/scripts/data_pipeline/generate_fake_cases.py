#!/usr/bin/env python3
"""Generate fake case citations for S8 hallucination detection.

Produces deterministic fake citations that are guaranteed not to collide
with the SCDB U.S.-cite universe through collision-checking.

Usage:
    python scripts/data_pipeline/generate_fake_cases.py --seed 20260107 --count 1000
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import random
import sys
from pathlib import Path

# Add project root to path for imports
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from core.ids.canonical import canonicalize_cite

# =============================================================================
# NAME POOLS (from spec)
# =============================================================================

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

    elif pattern == 1:  # United States v. Person
        return f"United States v. {rng.choice(PERSON_POOL)}"

    elif pattern == 2:  # State v. Person
        return f"{rng.choice(STATE_POOL)} v. {rng.choice(PERSON_POOL)}"

    elif pattern == 3:  # Person v. Company
        return f"{rng.choice(PERSON_POOL)} v. {rng.choice(COMPANY_POOL)}"

    elif pattern == 4:  # City v. Company
        return f"City of {rng.choice(CITY_POOL)} v. {rng.choice(COMPANY_POOL)}"

    else:  # In re Company
        return f"In re {rng.choice(COMPANY_POOL)}"


def generate_us_citation(rng: random.Random) -> str:
    """Generate a plausible U.S. Reports citation."""
    # U.S. Reports volumes range roughly 1-600 in reality
    # Generate across full plausible range
    volume = rng.randint(1, 999)
    page = rng.randint(1, 999)
    return f"{volume} U.S. {page}"


def load_scdb_universe(scdb_path: Path) -> tuple[set[str], str]:
    """Load and canonicalize all usCite values from SCDB.

    Returns:
        (set of canonical cites, sha256 hash of the sorted canonical set)
    """
    canonical_cites: set[str] = set()

    with open(scdb_path, "r", encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            row = json.loads(line)
            us_cite = row.get("usCite")
            if us_cite:
                canonical_cites.add(canonicalize_cite(us_cite))

    # Compute hash of sorted set for reproducibility tracking
    sorted_cites = sorted(canonical_cites)
    hash_input = "\n".join(sorted_cites).encode("utf-8")
    universe_sha256 = hashlib.sha256(hash_input).hexdigest()

    return canonical_cites, universe_sha256


def generate_fake_cases(
    *,
    seed: int,
    count: int,
    scdb_universe: set[str],
) -> tuple[list[dict[str, str]], int]:
    """Generate fake cases with collision checking.

    Returns:
        (list of fake case dicts, number of collisions skipped)
    """
    rng = random.Random(seed)
    fake_cases: list[dict[str, str]] = []
    used_canonical_cites: set[str] = set()
    collisions_skipped = 0

    # Allow up to 10x attempts to find non-colliding citations
    max_attempts = count * 10
    attempts = 0

    while len(fake_cases) < count and attempts < max_attempts:
        attempts += 1

        # Generate candidate
        case_name = generate_case_name(rng)
        us_citation = generate_us_citation(rng)
        canonical = canonicalize_cite(us_citation)

        # Check for collisions
        if canonical in scdb_universe:
            collisions_skipped += 1
            continue

        if canonical in used_canonical_cites:
            collisions_skipped += 1
            continue

        # Accept this fake case
        used_canonical_cites.add(canonical)
        fake_cases.append({
            "case_name": case_name,
            "us_citation": us_citation,
        })

    if len(fake_cases) < count:
        raise RuntimeError(
            f"Could not generate {count} unique fake cases after {max_attempts} attempts. "
            f"Generated {len(fake_cases)}, skipped {collisions_skipped} collisions."
        )

    return fake_cases, collisions_skipped


def write_csv(fake_cases: list[dict[str, str]], output_path: Path) -> str:
    """Write fake cases to CSV and return sha256 of the file."""
    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["case_name", "us_citation"])
        writer.writeheader()
        writer.writerows(fake_cases)

    # Compute hash
    content = output_path.read_bytes()
    return hashlib.sha256(content).hexdigest()


def write_manifest(
    *,
    manifest_path: Path,
    seed: int,
    count: int,
    scdb_us_cite_universe_sha256: str,
    collisions_skipped: int,
    output_sha256: str,
) -> None:
    """Write the manifest JSON."""
    manifest = {
        "seed": seed,
        "count": count,
        "scdb_us_cite_universe_sha256": scdb_us_cite_universe_sha256,
        "collisions_skipped": collisions_skipped,
        "output_sha256": output_sha256,
    }

    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
        f.write("\n")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate fake case citations for S8 hallucination detection."
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=20260107,
        help="Random seed for reproducibility (default: 20260107)",
    )
    parser.add_argument(
        "--count",
        type=int,
        default=1000,
        help="Number of fake cases to generate (default: 1000)",
    )
    parser.add_argument(
        "--scdb-path",
        type=Path,
        default=PROJECT_ROOT / "datasets" / "scdb_full_with_text.jsonl",
        help="Path to SCDB JSONL file",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=PROJECT_ROOT / "datasets",
        help="Output directory for CSV and manifest",
    )

    args = parser.parse_args()

    # Validate inputs
    if not args.scdb_path.exists():
        print(f"Error: SCDB file not found: {args.scdb_path}", file=sys.stderr)
        sys.exit(1)

    args.output_dir.mkdir(parents=True, exist_ok=True)

    print(f"Loading SCDB universe from {args.scdb_path}...")
    scdb_universe, universe_sha256 = load_scdb_universe(args.scdb_path)
    print(f"  Loaded {len(scdb_universe)} canonical U.S. citations")
    print(f"  Universe SHA256: {universe_sha256[:16]}...")

    print(f"Generating {args.count} fake cases with seed {args.seed}...")
    fake_cases, collisions_skipped = generate_fake_cases(
        seed=args.seed,
        count=args.count,
        scdb_universe=scdb_universe,
    )
    print(f"  Generated {len(fake_cases)} fake cases")
    print(f"  Collisions skipped: {collisions_skipped}")

    csv_path = args.output_dir / "fake_cases.csv"
    manifest_path = args.output_dir / "fake_cases_manifest.json"

    print(f"Writing {csv_path}...")
    output_sha256 = write_csv(fake_cases, csv_path)
    print(f"  Output SHA256: {output_sha256[:16]}...")

    print(f"Writing {manifest_path}...")
    write_manifest(
        manifest_path=manifest_path,
        seed=args.seed,
        count=args.count,
        scdb_us_cite_universe_sha256=universe_sha256,
        collisions_skipped=collisions_skipped,
        output_sha256=output_sha256,
    )

    print("Done.")


if __name__ == "__main__":
    main()

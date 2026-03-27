#!/usr/bin/env python
"""
build_cap_byte_index.py (V2.4 "Absolute Correctness + Completeness Gate")

Stage 3: Generate a byte-offset index for CAP JSONL text shards.

V2.4 Additions:
- Completeness Gate: Hard fail if coverage < 100%, writes missing_ids.jsonl.
- Explicit Shard Map: CAP_SOURCE_TO_SHARD dictionary contract (no string interpolation).
- cap_source Column: Added to Parquet index for explicit join key back to Stage 2.
- TRY_CAST: Prevents one malformed cap_id from crashing the entire load.

V2.3 Features:
- Resume: Loads existing parquet and unions with new rows before writing.
- Zero-Pandas: Uses fetchall() instead of .df(), no pandas anywhere.
- Parquet Write: Uses executemany() for proper DuckDB inserts.
- Coverage: Computed from final union index, not delta.
- Skip Logic: Requires size_bytes + header_sha256 match.
- Collisions: Logged with warning + collision artifact.

Provenance: header_sha256 is a heuristic change detector (first 1KB),
not a cryptographic file signature. Combined with size_bytes for safety.
"""

import sys
import json
import re
import hashlib
import random
from pathlib import Path
import duckdb

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

CROSSWALK_JSONL = Path("datasets/scotus_to_cap_map.jsonl")
SHARD_DIR = Path("datasets/dataset-full")
OUT_PARQUET = Path("datasets/cap_byte_index.parquet")
MANIFEST_JSON = Path("datasets/cap_byte_index_manifest.json")
COLLISIONS_JSONL = Path("datasets/cap_byte_index_collisions.jsonl")
MISSING_IDS_JSONL = Path("datasets/cap_byte_index_missing_ids.jsonl")

# Statistical sample size for verification
VERIFICATION_SAMPLE_SIZE = 100

# ---------------------------------------------------------------------------
# Explicit Shard Map Contract
# ---------------------------------------------------------------------------
# This dictionary is the ONLY source of truth for cap_source -> shard filename.
# If a cap_source value from the crosswalk is not in this map, the script
# will fail loudly rather than silently construct a wrong filename.

CAP_SOURCE_TO_SHARD = {
    "cap_f1d": "cap_f1d_text.jsonl",
    "cap_f2d": "cap_f2d_text.jsonl",
    "cap_f3d": "cap_f3d_text.jsonl",
    "cap_f1supp": "cap_f1supp_text.jsonl",
    "cap_f2supp": "cap_f2supp_text.jsonl",
    "cap_f3supp": "cap_f3supp_text.jsonl",
}

# Reverse map for shard_name -> cap_source lookup during scan
SHARD_TO_CAP_SOURCE = {v: k for k, v in CAP_SOURCE_TO_SHARD.items()}

# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------

def get_file_provenance(path: Path):
    """Generate a shallow provenance fingerprint (Size + Header SHA-256).

    Note: This is a heuristic change detector, not a full-file signature.
    The header_sha256 covers only the first 1KB. Combined with size_bytes
    for reliable skip logic.
    """
    try:
        stats = path.stat()
        sha256 = hashlib.sha256()
        with open(path, 'rb') as f:
            header = f.read(1024)
            sha256.update(header)
            header_hash = sha256.hexdigest()
        return {
            "size_bytes": stats.st_size,
            "mtime": stats.st_mtime,
            "header_sha256": header_hash
        }
    except Exception as e:
        print(f"ERROR: Could not fingerprint {path.name}: {e}", file=sys.stderr)
        return None

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    if not CROSSWALK_JSONL.exists():
        print(f"ERROR: {CROSSWALK_JSONL} not found", file=sys.stderr)
        sys.exit(1)

    print(f"Loading target IDs from {CROSSWALK_JSONL} (Zero-Pandas with TRY_CAST)...")
    conn = duckdb.connect(':memory:')

    try:
        # TRY_CAST: One malformed cap_id won't crash the whole load
        # Also get cap_source values for shard filtering
        result = conn.execute(f"""
            SELECT DISTINCT TRY_CAST(cap_id AS BIGINT) as cap_id, cap_source
            FROM read_ndjson_auto('{str(CROSSWALK_JSONL)}')
            WHERE TRY_CAST(cap_id AS BIGINT) IS NOT NULL
              AND cap_source IS NOT NULL
        """).fetchall()

        # Build target set and cap_id -> cap_source map for later lookup
        target_ids = set()
        target_cap_source = {}  # cap_id -> cap_source (for Parquet output)
        required_shards = set()
        unknown_sources = set()

        for row in result:
            cap_id = int(row[0])
            cap_source = row[1]

            target_ids.add(cap_id)
            target_cap_source[cap_id] = cap_source

            # EXPLICIT SHARD MAP: Use dictionary lookup, not string interpolation
            if cap_source in CAP_SOURCE_TO_SHARD:
                required_shards.add(CAP_SOURCE_TO_SHARD[cap_source])
            else:
                unknown_sources.add(cap_source)

        # FAIL LOUDLY on unknown cap_source values
        if unknown_sources:
            print(f"ERROR: Unknown cap_source values in crosswalk: {sorted(unknown_sources)}", file=sys.stderr)
            print(f"  Known sources: {sorted(CAP_SOURCE_TO_SHARD.keys())}", file=sys.stderr)
            print("  Update CAP_SOURCE_TO_SHARD if these are valid sources.", file=sys.stderr)
            sys.exit(1)

    except Exception as e:
        print(f"ERROR: Failed to load crosswalk: {e}", file=sys.stderr)
        sys.exit(1)

    num_targets = len(target_ids)
    print(f"Loaded {num_targets:,} unique target IDs to index.")
    print(f"Required shards from crosswalk: {sorted(required_shards)}")

    # Only scan shards that have matching cap_source in crosswalk
    all_shards = sorted(list(SHARD_DIR.glob("cap_*_text.jsonl")))
    shards = [s for s in all_shards if s.name in required_shards]

    if not shards:
        print(f"ERROR: No matching CAP text shards found in {SHARD_DIR}", file=sys.stderr)
        print(f"  Available: {[s.name for s in all_shards]}", file=sys.stderr)
        print(f"  Required:  {sorted(required_shards)}", file=sys.stderr)
        sys.exit(1)

    print(f"Will scan {len(shards)} of {len(all_shards)} shards.")

    # 1. Load Manifest (Resumability)
    manifest = {}
    if MANIFEST_JSON.exists():
        try:
            with open(MANIFEST_JSON, 'r') as f:
                manifest = json.load(f)
            print(f"Loaded manifest for {len(manifest)} shards.")
        except Exception:
            pass

    # RESUME FIX: Load existing parquet into registry and index_data
    registry = {}  # cap_id -> {cap_source, shard_name, offset, length} for dedup + collision detection
    index_data = []  # List of tuples for executemany: (cap_id, cap_source, shard_name, offset, length)
    existing_count = 0

    if OUT_PARQUET.exists():
        print(f"Loading existing index from {OUT_PARQUET}...")
        try:
            # ZERO-PANDAS: Use fetchall()
            # Check if cap_source column exists (backward compatibility)
            cols = conn.execute(f"DESCRIBE SELECT * FROM read_parquet('{str(OUT_PARQUET)}')").fetchall()
            col_names = [c[0] for c in cols]

            if 'cap_source' in col_names:
                existing_rows = conn.execute(f"""
                    SELECT CAST(cap_id AS BIGINT), cap_source, shard_name,
                           CAST("offset" AS BIGINT), CAST("length" AS BIGINT)
                    FROM read_parquet('{str(OUT_PARQUET)}')
                """).fetchall()

                for row in existing_rows:
                    cap_id = int(row[0])
                    cap_source = row[1]
                    shard_name = row[2]
                    offset = int(row[3])
                    length = int(row[4])
                    registry[cap_id] = {'cap_source': cap_source, 'shard_name': shard_name, 'offset': offset, 'length': length}
                    index_data.append((cap_id, cap_source, shard_name, offset, length))
                    existing_count += 1
            else:
                # Legacy parquet without cap_source - derive from shard_name
                existing_rows = conn.execute(f"""
                    SELECT CAST(cap_id AS BIGINT), shard_name,
                           CAST("offset" AS BIGINT), CAST("length" AS BIGINT)
                    FROM read_parquet('{str(OUT_PARQUET)}')
                """).fetchall()

                for row in existing_rows:
                    cap_id = int(row[0])
                    shard_name = row[1]
                    offset = int(row[2])
                    length = int(row[3])
                    cap_source = SHARD_TO_CAP_SOURCE.get(shard_name, "unknown")
                    registry[cap_id] = {'cap_source': cap_source, 'shard_name': shard_name, 'offset': offset, 'length': length}
                    index_data.append((cap_id, cap_source, shard_name, offset, length))
                    existing_count += 1

            print(f"  Loaded {existing_count:,} existing index entries.")
        except Exception as e:
            print(f"WARNING: Could not load existing parquet: {e}", file=sys.stderr)
            print("  Starting fresh index.")

    # Collision tracking
    collisions = []

    # 2. Sequential Scan
    id_pattern = re.compile(br'"id"\s*:\s*"?(\d+)"?')

    for shard in shards:
        shard_name = shard.name
        cap_source = SHARD_TO_CAP_SOURCE.get(shard_name, "unknown")

        # Check Provenance
        prov = get_file_provenance(shard)
        if not prov:
            continue

        # SKIP LOGIC: Require BOTH size_bytes AND header_sha256 match
        if shard_name in manifest:
            cached = manifest[shard_name]
            if (cached.get('size_bytes') == prov['size_bytes'] and
                cached.get('header_sha256') == prov['header_sha256']):
                print(f"Shard {shard_name} unchanged (size + hash match). Skipping scan.")
                continue

        print(f"Scanning {shard_name} ({prov['size_bytes'] / 1e9:.2f} GB)...")

        matches_in_shard = 0
        collisions_in_shard = 0

        try:
            with open(shard, 'rb') as f:
                while True:
                    # Use f.tell() before readline() for absolute offset
                    offset = f.tell()
                    line = f.readline()
                    if not line:
                        break

                    line_len = len(line)
                    # Scan first 1KB for robust ID detection
                    match = id_pattern.search(line[:1024])
                    if match:
                        cap_id = int(match.group(1))
                        if cap_id in target_ids:
                            if cap_id in registry:
                                # COLLISION: Log with details
                                existing = registry[cap_id]
                                if existing['shard_name'] != shard_name:
                                    collision_record = {
                                        'cap_id': cap_id,
                                        'existing_shard': existing['shard_name'],
                                        'existing_offset': existing['offset'],
                                        'new_shard': shard_name,
                                        'new_offset': offset,
                                        'action': 'kept_existing'
                                    }
                                    collisions.append(collision_record)
                                    collisions_in_shard += 1
                                # First-found-wins: skip this duplicate
                            else:
                                # Use cap_source from crosswalk (authoritative), fallback to shard-derived
                                record_cap_source = target_cap_source.get(cap_id, cap_source)
                                registry[cap_id] = {'cap_source': record_cap_source, 'shard_name': shard_name, 'offset': offset, 'length': line_len}
                                index_data.append((cap_id, record_cap_source, shard_name, offset, line_len))
                                matches_in_shard += 1

            manifest[shard_name] = prov
            collision_note = f" ({collisions_in_shard} collisions)" if collisions_in_shard else ""
            print(f"  - Done. Found {matches_in_shard:,} new.{collision_note} Total: {len(index_data):,}")

        except Exception as e:
            print(f"CRITICAL ERROR scanning {shard_name}: {e}", file=sys.stderr)
            sys.exit(1)

    # Write collision artifact if any
    if collisions:
        print(f"\nWARNING: {len(collisions)} collisions detected. Writing to {COLLISIONS_JSONL}")
        with open(COLLISIONS_JSONL, 'w') as f:
            for c in collisions:
                f.write(json.dumps(c) + '\n')

    # 3. Final Verification (Statistically Significant)
    if not index_data:
        print("WARNING: No data indexed. Skipping audit.")
        sys.exit(0)

    print(f"\nPerforming Statistically Significant Audit (N={VERIFICATION_SAMPLE_SIZE})...")
    sample_size = min(VERIFICATION_SAMPLE_SIZE, len(index_data))
    verification_samples = random.sample(index_data, sample_size)

    passes = 0
    for row in verification_samples:
        cap_id, cap_source, shard_name, offset, length = row
        try:
            with open(SHARD_DIR / shard_name, 'rb') as f:
                f.seek(offset)
                blob = f.read(length)
                data = json.loads(blob.decode('utf-8'))
                if int(data['id']) == int(cap_id):
                    passes += 1
                else:
                    print(f"FAIL: Data mismatch for ID {cap_id} at offset {offset}.", file=sys.stderr)
                    sys.exit(1)
        except Exception as e:
            print(f"FAIL: Verification crash for ID {cap_id}: {e}", file=sys.stderr)
            sys.exit(1)

    print(f"Audit Result: {passes}/{sample_size} verified (100% Success).")

    # 4. Save Artifacts
    print(f"\nSaving Index to {OUT_PARQUET} (Zero-Pandas with executemany)...")
    try:
        temp_conn = duckdb.connect(':memory:')

        # Create table with explicit types (now includes cap_source)
        # Note: "offset" is a reserved keyword in DuckDB, must be quoted
        temp_conn.execute("""
            CREATE TABLE idx_raw(
                cap_id BIGINT,
                cap_source VARCHAR,
                shard_name VARCHAR,
                "offset" BIGINT,
                "length" BIGINT
            )
        """)

        # PARQUET WRITE: Use executemany() for proper insertion
        temp_conn.executemany(
            "INSERT INTO idx_raw VALUES (?, ?, ?, ?, ?)",
            index_data
        )

        # Verify row count
        row_count = temp_conn.execute("SELECT COUNT(*) FROM idx_raw").fetchone()[0]
        print(f"  Inserted {row_count:,} rows into temp table.")

        # Write to Parquet
        temp_conn.execute(f"COPY idx_raw TO '{str(OUT_PARQUET)}' (FORMAT PARQUET)")

        # Save manifest
        with open(MANIFEST_JSON, 'w') as f:
            json.dump(manifest, f, indent=2)

        # COVERAGE REPORT: Computed from final union index
        indexed = len(index_data)
        indexed_ids = set(row[0] for row in index_data)
        new_this_run = indexed - existing_count

        print(f"\n--- Final Coverage Report ---")
        print(f"Target IDs:     {num_targets:,}")
        print(f"Total Indexed:  {indexed:,}")
        print(f"New This Run:   {new_this_run:,}")
        print(f"From Resume:    {existing_count:,}")
        print(f"Coverage:       {(indexed/num_targets)*100:.2f}%")

        if collisions:
            print(f"Collisions:     {len(collisions)} (see {COLLISIONS_JSONL})")

        # 5. COMPLETENESS GATE (Must Pass)
        missing_ids = target_ids - indexed_ids

        if missing_ids:
            print(f"\nCOMPLETENESS GATE FAILED: Missing {len(missing_ids):,} IDs.", file=sys.stderr)
            print(f"Writing missing IDs to {MISSING_IDS_JSONL}...", file=sys.stderr)

            # Write missing IDs with their expected cap_source for diagnosis
            with open(MISSING_IDS_JSONL, 'w') as f:
                for mid in sorted(missing_ids):
                    record = {
                        'cap_id': mid,
                        'expected_cap_source': target_cap_source.get(mid, 'unknown'),
                        'expected_shard': CAP_SOURCE_TO_SHARD.get(target_cap_source.get(mid, ''), 'unknown')
                    }
                    f.write(json.dumps(record) + '\n')

            print(f"  Sample missing IDs: {sorted(list(missing_ids))[:10]}", file=sys.stderr)
            sys.exit(1)

        print("\nCOMPLETENESS GATE PASSED: 100% coverage achieved.")
        print("Stage 3 (V2.4) Complete.")

    except Exception as e:
        print(f"ERROR: Failed to save artifacts: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()

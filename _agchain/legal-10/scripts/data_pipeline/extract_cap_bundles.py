#!/usr/bin/env python
"""
extract_cap_bundles.py (Stage 3.5)

Surgically extract CAP text into two portable bundles using the byte-offset index.

Inputs:
- datasets/cap_byte_index.parquet (cap_id, cap_source, shard_name, offset, length)
- datasets/dataset-full/*.jsonl shards

Outputs:
- datasets/cap_appellate_text.jsonl (cap_f1d, cap_f2d, cap_f3d)
- datasets/cap_trial_text.jsonl (cap_f1supp, cap_f2supp, cap_f3supp)

Extraction Logic:
- Stream writes (no memory accumulation)
- Pre-select verification sample before extraction
- Newline safety (ensure each line ends with newline)
- Fail fast on verification errors
"""

import sys
import json
import random
from pathlib import Path
from collections import defaultdict
import duckdb

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

INDEX_PARQUET = Path("datasets/cap_byte_index.parquet")
SHARD_DIR = Path("datasets/dataset-full")
OUT_APPELLATE = Path("datasets/cap_appellate_text.jsonl")
OUT_TRIAL = Path("datasets/cap_trial_text.jsonl")

# Bundle classification
APPELLATE_SOURCES = {"cap_f1d", "cap_f2d", "cap_f3d"}
TRIAL_SOURCES = {"cap_f1supp", "cap_f2supp", "cap_f3supp"}

# Verification sample size
VERIFICATION_SAMPLE_SIZE = 25

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    if not INDEX_PARQUET.exists():
        print(f"ERROR: {INDEX_PARQUET} not found. Run Stage 3 first.", file=sys.stderr)
        sys.exit(1)

    print(f"Loading byte index from {INDEX_PARQUET}...")
    conn = duckdb.connect(':memory:')

    # Load index with zero-pandas
    # Note: "offset" and "length" are reserved keywords in DuckDB, must be quoted
    rows = conn.execute(f"""
        SELECT CAST(cap_id AS BIGINT), cap_source, shard_name,
               CAST("offset" AS BIGINT), CAST("length" AS BIGINT)
        FROM read_parquet('{str(INDEX_PARQUET)}')
    """).fetchall()
    conn.close()

    total_entries = len(rows)
    print(f"Loaded {total_entries:,} index entries.")

    # Pre-select verification sample (cap_ids to buffer for verification)
    sample_size = min(VERIFICATION_SAMPLE_SIZE, total_entries)
    sample_indices = set(random.sample(range(total_entries), sample_size))
    verification_buffer = {}  # cap_id -> line_bytes

    # Group by shard for efficient I/O
    # Structure: shard_name -> [(original_idx, cap_id, cap_source, offset, length), ...]
    by_shard = defaultdict(list)
    for idx, row in enumerate(rows):
        cap_id, cap_source, shard_name, offset, length = row
        by_shard[shard_name].append((idx, int(cap_id), cap_source, int(offset), int(length)))

    print(f"Grouped into {len(by_shard)} shards.")

    # Counters
    appellate_count = 0
    trial_count = 0
    appellate_ids = set()
    trial_ids = set()
    skipped_entries = 0
    missing_shards = []

    # Open output files for streaming writes
    with open(OUT_APPELLATE, 'wb') as f_appellate, open(OUT_TRIAL, 'wb') as f_trial:

        # Extract from each shard
        for shard_name, entries in sorted(by_shard.items()):
            shard_path = SHARD_DIR / shard_name
            if not shard_path.exists():
                missing_shards.append(shard_name)
                skipped_entries += len(entries)
                print(f"WARNING: Shard {shard_name} not found. Skipping {len(entries)} entries.", file=sys.stderr)
                continue

            print(f"Extracting from {shard_name} ({len(entries):,} entries)...")

            # Sort by offset for sequential read efficiency
            entries_sorted = sorted(entries, key=lambda x: x[3])  # sort by offset

            with open(shard_path, 'rb') as f:
                for original_idx, cap_id, cap_source, offset, length in entries_sorted:
                    f.seek(offset)
                    line_bytes = f.read(length)

                    # Newline safety: ensure line ends with newline
                    if not line_bytes.endswith(b"\n"):
                        line_bytes = line_bytes + b"\n"

                    # Buffer if this is a verification sample
                    if original_idx in sample_indices:
                        verification_buffer[cap_id] = line_bytes

                    # Stream write to correct bundle
                    if cap_source in APPELLATE_SOURCES:
                        f_appellate.write(line_bytes)
                        appellate_count += 1
                        appellate_ids.add(cap_id)
                    elif cap_source in TRIAL_SOURCES:
                        f_trial.write(line_bytes)
                        trial_count += 1
                        trial_ids.add(cap_id)
                    else:
                        print(f"WARNING: Unknown cap_source '{cap_source}' for cap_id {cap_id}. Skipping.", file=sys.stderr)
                        skipped_entries += 1

    print(f"\nExtracted:")
    print(f"  Appellate: {appellate_count:,} lines, {len(appellate_ids):,} distinct cap_ids")
    print(f"  Trial:     {trial_count:,} lines, {len(trial_ids):,} distinct cap_ids")

    if skipped_entries > 0:
        print(f"  Skipped:   {skipped_entries:,} entries")
    if missing_shards:
        print(f"  Missing shards: {missing_shards}")

    # Verification (fail fast)
    print(f"\nVerifying sample (N={len(verification_buffer)})...")

    for cap_id, line_bytes in verification_buffer.items():
        try:
            data = json.loads(line_bytes.decode('utf-8'))
            if int(data['id']) != cap_id:
                print(f"FAIL: ID mismatch for cap_id {cap_id}: got {data['id']}", file=sys.stderr)
                sys.exit(1)
        except Exception as e:
            print(f"FAIL: Parse error for cap_id {cap_id}: {e}", file=sys.stderr)
            sys.exit(1)

    print(f"Verification: {len(verification_buffer)}/{len(verification_buffer)} passed.")

    # Final report
    print(f"\n--- Final Report ---")
    print(f"Index entries:    {total_entries:,}")
    print(f"Extracted:        {appellate_count + trial_count:,}")
    print(f"Skipped:          {skipped_entries:,}")

    # File sizes
    if OUT_APPELLATE.exists():
        print(f"\n{OUT_APPELLATE.name}: {OUT_APPELLATE.stat().st_size / 1e6:.1f} MB")
    if OUT_TRIAL.exists():
        print(f"{OUT_TRIAL.name}: {OUT_TRIAL.stat().st_size / 1e6:.1f} MB")

    # Fail if too many skipped (more than 1% of total)
    skip_threshold = total_entries * 0.01
    if skipped_entries > skip_threshold:
        print(f"\nERROR: Skipped {skipped_entries} entries (>{skip_threshold:.0f} threshold).", file=sys.stderr)
        sys.exit(1)

    print("\nStage 3.5 Complete.")

if __name__ == "__main__":
    main()

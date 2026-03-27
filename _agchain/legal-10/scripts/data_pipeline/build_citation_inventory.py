#!/usr/bin/env python
"""
Build a citation inventory from scdb_full_with_text.jsonl.

Stage 1 (atomic): extract every citation from every SCOTUS anchor opinion.
Outputs a Parquet file with one row per citation occurrence.

Fixes applied (2026-01-05):
- U.S. regex: \\s* between U and S (was \\s+, missed "U.S.")
- Captures actual raw text (m.group(0)), not normalized
- Captures pin cites (e.g., "410 U.S. 113, 115") without leading comma
- Filters self-citations (anchor citing itself)
- Adds anchor_caseId, anchor_term, span offsets (start, end)
- Writes chunks to Parquet to avoid RAM explosion
- Adds F.4th support
- Uses spaced canonical form: "F. Supp. 2d" (matches Bluebook/CAP)

Fixes applied (2026-01-06):
- Nominative reporter handling: "35 U.S. 10 Pet. 368" now correctly extracts as
  "35 U.S. 368" (not "35 U.S. 10" which was a mis-parse)
- Recognizes Pet., Wheat., Cranch, Cr., How., Wall., Black, Dall. nominative forms
- Negative lookahead prevents plain U.S. regex from matching nominative fragments
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Iterator

import pyarrow as pa
import pyarrow.parquet as pq

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

SCDB_JSONL = Path("datasets/scdb_full_with_text.jsonl")
OUT_PARQUET = Path("datasets/citation_inventory.parquet")
CHUNK_SIZE = 10_000  # rows per chunk write

# ---------------------------------------------------------------------------
# Citation Patterns
# ---------------------------------------------------------------------------

# Nominative reporters (early SCOTUS) - must be checked BEFORE plain U.S. pattern
# Format: "35 U.S. 10 Pet. 368" = volume 35 U.S. (= 10 Peters), page 368
# The nominative volume (10 Pet.) is redundant; we extract the final page number.
NOMINATIVE_REPORTERS = r"(?:Pet|Wheat|Cranch|Cr|How|Wall|Black|Dall)"
RE_US_NOMINATIVE = re.compile(
    r"\b(?P<vol>\d{1,3})\s+U\.?\s*S\.?\s+"
    r"(?P<nom_vol>\d{1,2})\s*" + NOMINATIVE_REPORTERS + r"\.?\s*"
    r"(?P<page>\d{1,4})"
    r"(?P<pin>(?:,\s*\d{1,4}(?:-\d{1,4})?)?)?\b",
    re.IGNORECASE,
)

# U.S. Reports (SCOTUS) - plain format without nominative reporter
# note \s* between U and S to match "U.S." and "U. S."
# Optional pin cite: ", 115" or ", 115-120"
# IGNORECASE for defensive matching against rare casing variants
# Negative lookahead to avoid matching when followed by nominative reporter
RE_US = re.compile(
    r"\b(?P<vol>\d{1,3})\s+U\.?\s*S\.?\s+(?P<page>\d{1,4})"
    r"(?!\s*(?:" + NOMINATIVE_REPORTERS + r"))"  # negative lookahead for nominative
    r"(?P<pin>(?:,\s*\d{1,4}(?:-\d{1,4})?)?)?\b",
    re.IGNORECASE,
)

# Federal reporters - F., F.2d, F.3d, F.4th
RE_F_SERIES = re.compile(
    r"\b(?P<vol>\d{1,4})\s+F\.?\s*(?P<series>2d|3d|4th)\s+(?P<page>\d{1,4})"
    r"(?P<pin>(?:,\s*\d{1,4}(?:-\d{1,4})?)?)?\b",
    re.IGNORECASE,
)

# F. (original Federal Reporter, no series)
RE_F_PLAIN = re.compile(
    r"\b(?P<vol>\d{1,4})\s+F\.\s+(?P<page>\d{1,4})"
    r"(?P<pin>(?:,\s*\d{1,4}(?:-\d{1,4})?)?)?\b",
    re.IGNORECASE,
)

# F.Supp, F.Supp.2d, F.Supp.3d
RE_F_SUPP = re.compile(
    r"\b(?P<vol>\d{1,4})\s+F\.?\s*Supp\.?\s*(?P<series>2d|3d)?\s+(?P<page>\d{1,4})"
    r"(?P<pin>(?:,\s*\d{1,4}(?:-\d{1,4})?)?)?\b",
    re.IGNORECASE,
)


# ---------------------------------------------------------------------------
# Normalization
# ---------------------------------------------------------------------------


def norm_us(vol: int, page: int) -> str:
    """Canonical U.S. cite: '336 U.S. 245'"""
    return f"{vol} U.S. {page}"


def norm_federal(vol: int, reporter: str, page: int) -> str:
    """Canonical federal cite: '123 F.2d 456' or '123 F. Supp. 2d 456'"""
    return f"{vol} {reporter} {page}"


def clean_pin(raw_pin: str) -> str | None:
    """Strip leading comma and whitespace from pin cite, return None if empty."""
    if not raw_pin:
        return None
    cleaned = raw_pin.lstrip(",").strip()
    return cleaned if cleaned else None


# ---------------------------------------------------------------------------
# Extraction
# ---------------------------------------------------------------------------


def extract_us_citations(text: str) -> Iterator[dict]:
    """
    Extract U.S. Reports citations with position and pin cite.
    Handles both plain format (347 U.S. 483) and nominative format (35 U.S. 10 Pet. 368).
    Nominative citations are normalized to U.S. volume + final page (35 U.S. 368).
    """
    # Track spans to avoid double-matching
    spans: list[tuple[int, int]] = []

    def overlaps(m: re.Match) -> bool:
        return any(not (m.end() <= s or m.start() >= e) for s, e in spans)

    # First: extract nominative format (more specific, must come first)
    for m in RE_US_NOMINATIVE.finditer(text):
        if overlaps(m):
            continue
        spans.append((m.start(), m.end()))

        vol = int(m.group("vol"))
        page = int(m.group("page"))  # This is the actual page, not nom_vol
        pin = clean_pin(m.group("pin") or "")
        yield {
            "cite_type": "U.S.",
            "raw_cite": m.group(0),
            "normalized_cite": norm_us(vol, page),
            "pin_cite": pin,
            "start": m.start(),
            "end": m.end(),
        }

    # Second: extract plain U.S. format (has negative lookahead to avoid nominative)
    for m in RE_US.finditer(text):
        if overlaps(m):
            continue
        spans.append((m.start(), m.end()))

        vol = int(m.group("vol"))
        page = int(m.group("page"))
        pin = clean_pin(m.group("pin") or "")
        yield {
            "cite_type": "U.S.",
            "raw_cite": m.group(0),
            "normalized_cite": norm_us(vol, page),
            "pin_cite": pin,
            "start": m.start(),
            "end": m.end(),
        }


def extract_federal_citations(text: str) -> Iterator[dict]:
    """
    Extract federal reporter citations.
    Handles overlapping patterns by tracking spans.
    Uses spaced canonical form (F. Supp. 2d) to match Bluebook/CAP.
    """
    spans: list[tuple[int, int]] = []

    def overlaps(m: re.Match) -> bool:
        return any(not (m.end() <= s or m.start() >= e) for s, e in spans)

    # F.Supp variants (check first - more specific)
    for m in RE_F_SUPP.finditer(text):
        if overlaps(m):
            continue
        spans.append((m.start(), m.end()))

        vol = int(m.group("vol"))
        page = int(m.group("page"))
        series = (m.group("series") or "").lower()
        pin = clean_pin(m.group("pin") or "")

        # Spaced canonical form to match Bluebook/CAP
        if series == "2d":
            reporter = "F. Supp. 2d"
        elif series == "3d":
            reporter = "F. Supp. 3d"
        else:
            reporter = "F. Supp."

        yield {
            "cite_type": reporter,
            "raw_cite": m.group(0),
            "normalized_cite": norm_federal(vol, reporter, page),
            "pin_cite": pin,
            "start": m.start(),
            "end": m.end(),
        }

    # F.2d, F.3d, F.4th
    for m in RE_F_SERIES.finditer(text):
        if overlaps(m):
            continue
        spans.append((m.start(), m.end()))

        vol = int(m.group("vol"))
        page = int(m.group("page"))
        series = m.group("series").lower()
        pin = clean_pin(m.group("pin") or "")

        if series == "2d":
            reporter = "F.2d"
        elif series == "3d":
            reporter = "F.3d"
        else:
            reporter = "F.4th"

        yield {
            "cite_type": reporter,
            "raw_cite": m.group(0),
            "normalized_cite": norm_federal(vol, reporter, page),
            "pin_cite": pin,
            "start": m.start(),
            "end": m.end(),
        }

    # F. (plain, no series)
    for m in RE_F_PLAIN.finditer(text):
        if overlaps(m):
            continue
        spans.append((m.start(), m.end()))

        vol = int(m.group("vol"))
        page = int(m.group("page"))
        pin = clean_pin(m.group("pin") or "")

        yield {
            "cite_type": "F.",
            "raw_cite": m.group(0),
            "normalized_cite": norm_federal(vol, "F.", page),
            "pin_cite": pin,
            "start": m.start(),
            "end": m.end(),
        }


def extract_all_citations(text: str) -> Iterator[dict]:
    """Extract all citations from text."""
    yield from extract_us_citations(text)
    yield from extract_federal_citations(text)


# ---------------------------------------------------------------------------
# Parquet Schema
# ---------------------------------------------------------------------------

SCHEMA = pa.schema([
    ("anchor_caseId", pa.string()),
    ("anchor_lexisCite", pa.string()),
    ("anchor_usCite", pa.string()),
    ("anchor_caseName", pa.string()),
    ("anchor_term", pa.int32()),
    ("cite_type", pa.string()),
    ("raw_cite", pa.string()),
    ("normalized_cite", pa.string()),
    ("pin_cite", pa.string()),
    ("start", pa.int32()),
    ("end", pa.int32()),
])


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def coerce_term(term_value) -> int | None:
    """Safely coerce term to int, return None if not possible."""
    if term_value is None:
        return None
    if isinstance(term_value, int):
        return term_value
    term_str = str(term_value).strip()
    if term_str.isdigit():
        return int(term_str)
    return None


def main():
    if not SCDB_JSONL.exists():
        print(f"ERROR: {SCDB_JSONL} not found", file=sys.stderr)
        sys.exit(1)

    # Delete existing output (ParquetWriter fails if file exists)
    if OUT_PARQUET.exists():
        print(f"WARN: {OUT_PARQUET} exists, deleting", file=sys.stderr)
        OUT_PARQUET.unlink()

    OUT_PARQUET.parent.mkdir(parents=True, exist_ok=True)

    writer: pq.ParquetWriter | None = None
    rows: list[dict] = []
    total_anchors = 0
    total_citations = 0
    skipped_self = 0
    errors = 0

    try:
        with SCDB_JSONL.open("r", encoding="utf-8") as f:
            for line_num, line in enumerate(f, 1):
                line = line.strip()
                if not line:
                    continue

                try:
                    obj = json.loads(line)
                except json.JSONDecodeError as e:
                    print(f"WARN: line {line_num}: JSON error: {e}", file=sys.stderr)
                    errors += 1
                    continue

                # Anchor metadata
                anchor_case_id = obj.get("caseId") or ""
                anchor_lexis = obj.get("lexisCite") or ""
                anchor_us = obj.get("usCite") or ""
                anchor_name = obj.get("caseName") or ""
                anchor_term = coerce_term(obj.get("term"))
                text = obj.get("majority_opinion") or ""

                # Normalize anchor U.S. cite for self-citation filtering
                anchor_us_normalized = None
                if anchor_us:
                    # Parse and re-normalize to canonical form
                    m = RE_US.search(anchor_us)
                    if m:
                        anchor_us_normalized = norm_us(
                            int(m.group("vol")), int(m.group("page"))
                        )

                total_anchors += 1

                for cite in extract_all_citations(text):
                    # Filter self-citations
                    if (
                        cite["cite_type"] == "U.S."
                        and anchor_us_normalized
                        and cite["normalized_cite"] == anchor_us_normalized
                    ):
                        skipped_self += 1
                        continue

                    rows.append({
                        "anchor_caseId": anchor_case_id,
                        "anchor_lexisCite": anchor_lexis,
                        "anchor_usCite": anchor_us,
                        "anchor_caseName": anchor_name,
                        "anchor_term": anchor_term,
                        **cite,
                    })
                    total_citations += 1

                # Write chunk if needed
                if len(rows) >= CHUNK_SIZE:
                    table = pa.Table.from_pylist(rows, schema=SCHEMA)
                    if writer is None:
                        writer = pq.ParquetWriter(OUT_PARQUET, SCHEMA)
                    writer.write_table(table)
                    rows.clear()

                # Progress
                if total_anchors % 5000 == 0:
                    print(
                        f"  processed {total_anchors:,} anchors, "
                        f"{total_citations:,} citations..."
                    )

        # Write remaining rows
        if rows:
            table = pa.Table.from_pylist(rows, schema=SCHEMA)
            if writer is None:
                writer = pq.ParquetWriter(OUT_PARQUET, SCHEMA)
            writer.write_table(table)

    finally:
        if writer is not None:
            writer.close()

    print(f"\nDone!")
    print(f"  Anchors processed: {total_anchors:,}")
    print(f"  Citations extracted: {total_citations:,}")
    print(f"  Self-citations skipped: {skipped_self:,}")
    print(f"  JSON errors: {errors}")
    print(f"  Output: {OUT_PARQUET}")


if __name__ == "__main__":
    main()

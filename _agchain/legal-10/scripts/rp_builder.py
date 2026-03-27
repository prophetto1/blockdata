#!/usr/bin/env python3
"""
Stage 4A: Build sealed ResearchPacks (RPv1).

For each eligible SCOTUS anchor opinion, we select:
- Top-K SCOTUS authorities by Fowler score (default K=10)
- Top-K CAP authorities by PageRank percentile (default K=5)

We materialize a sealed RP directory:

<out_dir>/rpv1__<anchor_caseId>/
  payloads/
    d1.json   # Delivery 1: anchor + citations roster (NO authority text, NO labels)
    d2.json   # Delivery 2: authorities text (SCOTUS syllabi + CAP head_matter)
  doc3.json   # Non-model metadata/ground truth for EU assembly + scoring
  manifest.json  # (optional) sha256/bytes for all files except itself

Defaults:
- out_dir defaults to datasets/rps/ (ignored by git via .gitignore).

Notes:
- cite_offset_policy is v1: we use MIN(start) per (anchor_caseId, normalized_cite)
  from citation_inventory.parquet. This yields one cite_offset per unique citation.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).parent.parent
DATASETS = PROJECT_ROOT / "datasets"


def utc_now_iso() -> str:
    return (
        datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )


def sha256_path(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def write_json(path: Path, obj: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=2, ensure_ascii=False, sort_keys=True)
        f.write("\n")


def parse_int(value: Any) -> int | None:
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def iter_jsonl(path: Path):
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            yield json.loads(line)


def load_casesumm_syllabi(syllabi_path: Path) -> dict[str, str]:
    import duckdb

    con = duckdb.connect()
    try:
        rows = con.execute(
            "SELECT usCite, syllabus FROM read_parquet(?)",
            [str(syllabi_path)],
        ).fetchall()
    finally:
        con.close()

    syllabi: dict[str, str] = {}
    for us_cite, syllabus in rows:
        if not us_cite or not syllabus:
            continue
        text = str(syllabus).strip()
        if not text:
            continue
        syllabi[str(us_cite)] = text

    return syllabi


def load_cap_head_matter(cap_head_matter_path: Path) -> dict[int, dict[str, Any]]:
    by_id: dict[int, dict[str, Any]] = {}
    with open(cap_head_matter_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            rec = json.loads(line)
            cap_id = rec.get("cap_id")
            head_matter = rec.get("head_matter")
            if cap_id is None or not head_matter:
                continue
            by_id[int(cap_id)] = rec
    return by_id


def load_cite_offsets(
    citation_inventory_path: Path,
) -> dict[tuple[str, str], dict[str, Any]]:
    import duckdb

    con = duckdb.connect()
    try:
        rows = con.execute(
            """
            SELECT
              anchor_caseId,
              normalized_cite,
              MIN(start) AS cite_offset,
              COUNT(*) AS occurrences,
              MIN(cite_type) AS cite_type
            FROM read_parquet(?)
            GROUP BY anchor_caseId, normalized_cite
            """,
            [str(citation_inventory_path)],
        ).fetchall()
    finally:
        con.close()

    out: dict[tuple[str, str], dict[str, Any]] = {}
    for anchor_caseId, normalized_cite, cite_offset, occurrences, cite_type in rows:
        if anchor_caseId is None or normalized_cite is None or cite_offset is None:
            continue
        out[(str(anchor_caseId), str(normalized_cite))] = {
            "cite_offset": int(cite_offset),
            "occurrences": int(occurrences) if occurrences is not None else None,
            "cite_type": str(cite_type) if cite_type is not None else None,
        }
    return out


def load_depth_labels(
    citation_depth_labels_path: Path,
) -> dict[tuple[str, str, int], dict[str, Any]]:
    import duckdb

    con = duckdb.connect()
    try:
        rows = con.execute(
            """
            SELECT
              anchor_caseId,
              cited_usCite,
              cite_offset,
              label,
              confidence,
              reason,
              factor,
              tfidf_score
            FROM read_parquet(?)
            """,
            [str(citation_depth_labels_path)],
        ).fetchall()
    finally:
        con.close()

    out: dict[tuple[str, str, int], dict[str, Any]] = {}
    for (
        anchor_caseId,
        cited_usCite,
        cite_offset,
        label,
        confidence,
        reason,
        factor,
        tfidf_score,
    ) in rows:
        if anchor_caseId is None or cited_usCite is None or cite_offset is None:
            continue
        out[(str(anchor_caseId), str(cited_usCite), int(cite_offset))] = {
            "label": str(label) if label is not None else None,
            "confidence": float(confidence) if confidence is not None else None,
            "reason": str(reason) if reason is not None else None,
            "factor": int(factor) if factor is not None else None,
            "tfidf_score": float(tfidf_score) if tfidf_score is not None else None,
        }
    return out


def load_top_scotus_by_anchor(
    scotus_ranked_path: Path,
    *,
    k_scotus: int,
    syllabi_by_us_cite: dict[str, str],
) -> dict[str, list[dict[str, Any]]]:
    out: dict[str, list[dict[str, Any]]] = {}

    for rec in iter_jsonl(scotus_ranked_path):
        anchor_caseId = str(rec["anchor_caseId"])
        selected: list[dict[str, Any]] = []

        for cite in rec.get("citations", []):
            normalized = cite.get("normalized_cite")
            if not normalized:
                continue

            us_cite = str(normalized)
            if us_cite not in syllabi_by_us_cite:
                continue  # not shippable (no syllabus)

            selected.append(
                {
                    "source": "SCOTUS",
                    "rank": cite.get("rank"),
                    "normalized_cite": us_cite,
                    "usCite": us_cite,
                    "caseName": cite.get("cited_caseName"),
                    "fowler_score": cite.get("fowler_score"),
                }
            )

            if len(selected) >= k_scotus:
                break

        if selected:
            out[anchor_caseId] = selected

    return out


def load_top_cap_by_anchor(
    cap_ranked_path: Path,
    *,
    k_cap: int,
    cap_head_matter_by_id: dict[int, dict[str, Any]],
) -> dict[str, list[dict[str, Any]]]:
    out: dict[str, list[dict[str, Any]]] = {}

    for rec in iter_jsonl(cap_ranked_path):
        anchor_caseId = str(rec["anchor_caseId"])
        selected: list[dict[str, Any]] = []

        for cite in rec.get("citations", []):
            cap_id = cite.get("cap_id")
            if cap_id is None:
                continue

            cap_id_int = int(cap_id)
            hm = cap_head_matter_by_id.get(cap_id_int)
            if not hm or not hm.get("head_matter"):
                continue  # not shippable

            normalized_cite = cite.get("normalized_cite")
            if not normalized_cite:
                continue

            selected.append(
                {
                    "source": "CAP",
                    "rank": cite.get("rank"),
                    "normalized_cite": str(normalized_cite),
                    "cite_type": cite.get("cite_type"),
                    "cap_id": cap_id_int,
                    "caseName": cite.get("cap_name")
                    or hm.get("cap_name_abbreviation")
                    or hm.get("cap_case_name"),
                    "capCite": hm.get("cap_official_cite") or str(normalized_cite),
                    "pagerank_percentile": cite.get("pagerank_percentile"),
                }
            )

            if len(selected) >= k_cap:
                break

        if selected:
            out[anchor_caseId] = selected

    return out


def build_one_rp(
    *,
    anchor_rec: dict[str, Any],
    scotus_sel: list[dict[str, Any]],
    cap_sel: list[dict[str, Any]],
    k_scotus_config: int,
    k_cap_config: int,
    syllabi_by_us_cite: dict[str, str],
    cap_head_matter_by_id: dict[int, dict[str, Any]],
    offsets_by_anchor_and_cite: dict[tuple[str, str], dict[str, Any]],
    depth_labels_by_key: dict[tuple[str, str, int], dict[str, Any]],
    out_dir: Path,
    overwrite: bool,
    write_manifest: bool,
    dry_run: bool,
    generator_version: str,
    dataset_snapshot_id: str | None,
) -> bool:
    anchor_caseId = str(anchor_rec.get("caseId") or "")
    anchor_usCite = str(anchor_rec.get("usCite") or "")
    anchor_caseName = str(anchor_rec.get("caseName") or "")

    anchor_text = anchor_rec.get("majority_opinion") or anchor_rec.get("text") or ""
    anchor_text = str(anchor_text)
    anchor_char_count = len(anchor_text)

    rp_id = f"rpv1__{anchor_caseId}"
    rp_dir = out_dir / rp_id
    payloads_dir = rp_dir / "payloads"

    if rp_dir.exists():
        if not overwrite:
            return False
        if not dry_run:
            shutil.rmtree(rp_dir)

    # Deterministic ordering for selection inputs
    scotus_sel_sorted = sorted(
        scotus_sel,
        key=lambda x: (x.get("rank") or 10**9, x.get("usCite") or ""),
    )
    cap_sel_sorted = sorted(
        cap_sel,
        key=lambda x: (x.get("rank") or 10**9, x.get("capCite") or ""),
    )

    selected_scotus = len(scotus_sel_sorted)
    selected_cap = len(cap_sel_sorted)

    citations_d1: list[dict[str, Any]] = []
    authorities_d2: list[dict[str, Any]] = []
    citations_doc3: list[dict[str, Any]] = []

    next_id = 1
    skipped = {
        "scotus_missing_offset": 0,
        "scotus_missing_syllabus": 0,
        "cap_missing_offset": 0,
        "cap_missing_head_matter": 0,
        "cap_missing_normalized_cite": 0,
    }

    for sel in scotus_sel_sorted + cap_sel_sorted:
        source = sel["source"]

        if source == "SCOTUS":
            join_key = str(sel.get("normalized_cite") or sel.get("usCite") or "")
            if not join_key:
                continue

            syllabus = syllabi_by_us_cite.get(join_key)
            if not syllabus:
                skipped["scotus_missing_syllabus"] += 1
                continue

            off = offsets_by_anchor_and_cite.get((anchor_caseId, join_key))
            if not off:
                skipped["scotus_missing_offset"] += 1
                continue

            cite_offset = int(off["cite_offset"])
            occurrences = off.get("occurrences")
            cite_type = off.get("cite_type")

            citation_id = f"CITE_{next_id:03d}"
            next_id += 1

            case_name = sel.get("caseName")
            citations_d1.append(
                {
                    "citation_id": citation_id,
                    "source": "SCOTUS",
                    "usCite": join_key,
                    "capCite": None,
                    "caseName": case_name,
                    "cite_offset": cite_offset,
                }
            )

            authorities_d2.append(
                {
                    "authority_id": citation_id,
                    "source": "SCOTUS",
                    "usCite": join_key,
                    "capCite": None,
                    "caseName": case_name,
                    "text": syllabus,
                    "char_count": len(syllabus),
                    "ranking": {
                        "rank": sel.get("rank"),
                        "fowler_score": sel.get("fowler_score"),
                        "pagerank_percentile": None,
                    },
                }
            )

            label_info = depth_labels_by_key.get(
                (anchor_caseId, join_key, cite_offset), {}
            )

            citations_doc3.append(
                {
                    "citation_id": citation_id,
                    "source": "SCOTUS",
                    "inventory_normalized_cite": join_key,
                    "cite_type": cite_type,
                    "usCite": join_key,
                    "capCite": None,
                    "caseName": case_name,
                    "cite_offset": cite_offset,
                    "occurrences": occurrences,
                    "ranking": {
                        "rank": sel.get("rank"),
                        "fowler_score": sel.get("fowler_score"),
                        "pagerank_percentile": None,
                    },
                    "depth_label": label_info.get("label"),
                    "depth_confidence": label_info.get("confidence"),
                    "depth_reason": label_info.get("reason"),
                    "depth_factor": label_info.get("factor"),
                    "tfidf_score": label_info.get("tfidf_score"),
                }
            )
            continue

        if source == "CAP":
            join_key = sel.get("normalized_cite")
            if not join_key:
                skipped["cap_missing_normalized_cite"] += 1
                continue
            join_key = str(join_key)

            off = offsets_by_anchor_and_cite.get((anchor_caseId, join_key))
            if not off:
                skipped["cap_missing_offset"] += 1
                continue

            cite_offset = int(off["cite_offset"])
            occurrences = off.get("occurrences")
            cite_type = off.get("cite_type")

            cap_id = int(sel["cap_id"])
            hm = cap_head_matter_by_id.get(cap_id)
            if not hm or not hm.get("head_matter"):
                skipped["cap_missing_head_matter"] += 1
                continue

            cap_cite = (
                hm.get("cap_official_cite") or sel.get("capCite") or join_key
            )
            cap_cite = str(cap_cite) if cap_cite is not None else None

            case_name = (
                sel.get("caseName")
                or hm.get("cap_name_abbreviation")
                or hm.get("cap_case_name")
            )
            head_matter = str(hm.get("head_matter") or "")

            citation_id = f"CITE_{next_id:03d}"
            next_id += 1

            citations_d1.append(
                {
                    "citation_id": citation_id,
                    "source": "CAP",
                    "usCite": None,
                    "capCite": cap_cite,
                    "caseName": case_name,
                    "cite_offset": cite_offset,
                }
            )

            authorities_d2.append(
                {
                    "authority_id": citation_id,
                    "source": "CAP",
                    "usCite": None,
                    "capCite": cap_cite,
                    "caseName": case_name,
                    "text": head_matter,
                    "char_count": len(head_matter),
                    "ranking": {
                        "rank": sel.get("rank"),
                        "fowler_score": None,
                        "pagerank_percentile": sel.get("pagerank_percentile"),
                    },
                }
            )

            citations_doc3.append(
                {
                    "citation_id": citation_id,
                    "source": "CAP",
                    "inventory_normalized_cite": join_key,
                    "cite_type": cite_type,
                    "usCite": None,
                    "capCite": cap_cite,
                    "cap_id": cap_id,
                    "caseName": case_name,
                    "cite_offset": cite_offset,
                    "occurrences": occurrences,
                    "ranking": {
                        "rank": sel.get("rank"),
                        "fowler_score": None,
                        "pagerank_percentile": sel.get("pagerank_percentile"),
                    },
                    "depth_label": None,
                    "depth_confidence": None,
                    "depth_reason": None,
                    "depth_factor": None,
                    "tfidf_score": None,
                }
            )
            continue

        raise ValueError(f"Unexpected source: {source}")

    if not citations_d1:
        return False

    shipped_scotus = sum(1 for c in citations_doc3 if c["source"] == "SCOTUS")
    shipped_cap = sum(1 for c in citations_doc3 if c["source"] == "CAP")

    d1 = {
        "protocol_version": "rp-d1-v1",
        "delivery_id": 1,
        "anchor": {
            "caseId": anchor_caseId,
            "usCite": anchor_usCite,
            "caseName": anchor_caseName,
            "term": parse_int(anchor_rec.get("term")),
            "text": anchor_text,
            "char_count": anchor_char_count,
        },
        "citations": citations_d1,
    }

    d2 = {
        "protocol_version": "rp-d2-v1",
        "delivery_id": 2,
        "authorities": authorities_d2,
    }

    doc3 = {
        "protocol_version": "rp-doc3-v1",
        "rp_id": rp_id,
        "created_at": utc_now_iso(),
        "generator_version": generator_version,
        "dataset_snapshot_id": dataset_snapshot_id,
        "cite_offset_policy": "min_start_per_(anchor_caseId, normalized_cite) from citation_inventory.parquet",
        "anchor": {
            "caseId": anchor_caseId,
            "usCite": anchor_usCite,
            "caseName": anchor_caseName,
            "term": parse_int(anchor_rec.get("term")),
            "char_count": anchor_char_count,
        },
        "k_policy": {
            "scotus_k_config": k_scotus_config,
            "cap_k_config": k_cap_config,
            "scotus_selected": selected_scotus,
            "cap_selected": selected_cap,
            "scotus_shipped": shipped_scotus,
            "cap_shipped": shipped_cap,
        },
        "build_stats": skipped,
        "citations": citations_doc3,
        "scdb": {
            "caseDisposition": anchor_rec.get("caseDisposition"),
            "partyWinning": anchor_rec.get("partyWinning"),
            "fowler_pauth_score": anchor_rec.get("fowler_pauth_score"),
        },
    }

    if dry_run:
        print(f"[DRY RUN] Would write {rp_dir}")
        print(f"  selected: scotus={selected_scotus}, cap={selected_cap}")
        print(f"  shipped:  scotus={shipped_scotus}, cap={shipped_cap}")
        print(f"  skipped:  {skipped}")
        return True

    write_json(payloads_dir / "d1.json", d1)
    write_json(payloads_dir / "d2.json", d2)
    write_json(rp_dir / "doc3.json", doc3)

    if write_manifest:
        files = [
            payloads_dir / "d1.json",
            payloads_dir / "d2.json",
            rp_dir / "doc3.json",
        ]

        manifest = {
            "protocol_version": "manifest-v1",
            "rp_id": rp_id,
            "created_at": utc_now_iso(),
            "generator_version": generator_version,
            "dataset_snapshot_id": dataset_snapshot_id,
            "files": [],
        }

        entries = []
        for fp in files:
            rel = fp.relative_to(rp_dir).as_posix()
            entries.append(
                {
                    "path": rel,
                    "sha256": sha256_path(fp),
                    "bytes": fp.stat().st_size,
                }
            )

        manifest["files"] = sorted(entries, key=lambda e: e["path"])

        write_json(rp_dir / "manifest.json", manifest)

    return True


def main() -> None:
    p = argparse.ArgumentParser(
        description="Stage 4A: Build sealed ResearchPacks (RPv1)."
    )
    p.add_argument(
        "--scdb-path",
        type=Path,
        default=DATASETS / "scdb_full_with_text.jsonl",
    )
    p.add_argument(
        "--scotus-ranked-path",
        type=Path,
        default=DATASETS / "scotus_citations_ranked.jsonl",
    )
    p.add_argument(
        "--cap-ranked-path",
        type=Path,
        default=DATASETS / "cap_citations_ranked.jsonl",
    )
    p.add_argument(
        "--syllabi-path",
        type=Path,
        default=DATASETS / "casesumm_syllabi.parquet",
    )
    p.add_argument(
        "--cap-head-matter-path",
        type=Path,
        default=DATASETS / "cap_head_matter.jsonl",
    )
    p.add_argument(
        "--citation-inventory-path",
        type=Path,
        default=DATASETS / "citation_inventory.parquet",
    )
    p.add_argument(
        "--depth-labels-path",
        type=Path,
        default=DATASETS / "citation_depth_labels.parquet",
    )

    p.add_argument("--out-dir", type=Path, default=DATASETS / "rps")
    p.add_argument("--k-scotus", type=int, default=10)
    p.add_argument("--k-cap", type=int, default=5)

    p.add_argument("--min-anchor-chars", type=int, default=1000)
    p.add_argument("--max-anchor-chars", type=int, default=100000)

    p.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Build first N eligible anchors (0 = all).",
    )
    p.add_argument(
        "--anchor-caseid",
        action="append",
        default=[],
        help="Build only these anchor caseIds (repeatable).",
    )
    p.add_argument(
        "--anchor-us-cite",
        action="append",
        default=[],
        help="Build only these anchor usCites (repeatable).",
    )

    p.add_argument("--overwrite", action="store_true")
    p.add_argument("--no-manifest", action="store_true")
    p.add_argument("--dry-run", action="store_true")

    p.add_argument("--generator-version", type=str, default="stage4a-rpv1")
    p.add_argument("--dataset-snapshot-id", type=str, default=None)

    args = p.parse_args()

    for path in [
        args.scdb_path,
        args.scotus_ranked_path,
        args.cap_ranked_path,
        args.syllabi_path,
        args.cap_head_matter_path,
        args.citation_inventory_path,
        args.depth_labels_path,
    ]:
        if not path.exists():
            print(f"ERROR: missing required input: {path}", file=sys.stderr)
            sys.exit(1)

    print("Loading syllabi...")
    syllabi_by_us_cite = load_casesumm_syllabi(args.syllabi_path)
    print(f"  {len(syllabi_by_us_cite):,} syllabi loaded")

    print("Loading CAP head matter...")
    cap_head_matter_by_id = load_cap_head_matter(args.cap_head_matter_path)
    print(f"  {len(cap_head_matter_by_id):,} CAP head_matter records loaded")

    print("Loading citation offsets (citation_inventory.parquet)...")
    offsets_by_anchor_and_cite = load_cite_offsets(args.citation_inventory_path)
    print(f"  {len(offsets_by_anchor_and_cite):,} (anchor, cite) offsets loaded")

    print("Loading depth labels (citation_depth_labels.parquet)...")
    depth_labels_by_key = load_depth_labels(args.depth_labels_path)
    print(f"  {len(depth_labels_by_key):,} depth-label rows loaded")

    print("Loading top-K SCOTUS citations per anchor...")
    scotus_top = load_top_scotus_by_anchor(
        args.scotus_ranked_path,
        k_scotus=args.k_scotus,
        syllabi_by_us_cite=syllabi_by_us_cite,
    )
    print(f"  anchors with SCOTUS selections: {len(scotus_top):,}")

    print("Loading top-K CAP citations per anchor...")
    cap_top = load_top_cap_by_anchor(
        args.cap_ranked_path,
        k_cap=args.k_cap,
        cap_head_matter_by_id=cap_head_matter_by_id,
    )
    print(f"  anchors with CAP selections: {len(cap_top):,}")

    anchor_caseids_filter = set(args.anchor_caseid or [])
    anchor_us_cites_filter = set(args.anchor_us_cite or [])

    if not args.dry_run:
        args.out_dir.mkdir(parents=True, exist_ok=True)

    built = 0
    skipped_ineligible = 0
    skipped_filtered = 0
    skipped_exists = 0

    print("Building ResearchPacks...")
    for rec in iter_jsonl(args.scdb_path):
        anchor_caseId = str(rec.get("caseId") or "")
        anchor_usCite = str(rec.get("usCite") or "")

        if anchor_caseids_filter and anchor_caseId not in anchor_caseids_filter:
            skipped_filtered += 1
            continue
        if anchor_us_cites_filter and anchor_usCite not in anchor_us_cites_filter:
            skipped_filtered += 1
            continue

        anchor_text = rec.get("majority_opinion") or rec.get("text") or ""
        anchor_text = str(anchor_text)
        char_count = len(anchor_text)

        if not anchor_text:
            skipped_ineligible += 1
            continue
        if char_count < args.min_anchor_chars or char_count > args.max_anchor_chars:
            skipped_ineligible += 1
            continue

        sc_sel = scotus_top.get(anchor_caseId, [])
        cap_sel = cap_top.get(anchor_caseId, [])
        if not sc_sel and not cap_sel:
            skipped_ineligible += 1
            continue

        rp_dir = args.out_dir / f"rpv1__{anchor_caseId}"
        if rp_dir.exists() and not args.overwrite and not args.dry_run:
            skipped_exists += 1
            continue

        ok = build_one_rp(
            anchor_rec=rec,
            scotus_sel=sc_sel,
            cap_sel=cap_sel,
            k_scotus_config=args.k_scotus,
            k_cap_config=args.k_cap,
            syllabi_by_us_cite=syllabi_by_us_cite,
            cap_head_matter_by_id=cap_head_matter_by_id,
            offsets_by_anchor_and_cite=offsets_by_anchor_and_cite,
            depth_labels_by_key=depth_labels_by_key,
            out_dir=args.out_dir,
            overwrite=args.overwrite,
            write_manifest=not args.no_manifest,
            dry_run=args.dry_run,
            generator_version=args.generator_version,
            dataset_snapshot_id=args.dataset_snapshot_id,
        )
        if ok:
            built += 1

        if args.limit and built >= args.limit:
            break

        if built and built % 250 == 0:
            print(f"  progress: built {built:,}")

    print("\nDone.")
    print(f"  Built:            {built:,}")
    print(f"  Skipped (exists): {skipped_exists:,}")
    print(f"  Skipped (inelig): {skipped_ineligible:,}")
    if anchor_caseids_filter or anchor_us_cites_filter:
        print(f"  Skipped (filter): {skipped_filtered:,}")
    print(f"  Output dir:       {args.out_dir}")


if __name__ == "__main__":
    main()

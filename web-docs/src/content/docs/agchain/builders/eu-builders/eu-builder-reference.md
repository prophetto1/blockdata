---
title: "EU builder reference implementation"
sidebar:
  order: 2
---

#!/usr/bin/env python3
"""Stage 4B: Build sealed Evaluation Units (EUv1) from Stage 4A ResearchPacks (RPv1). 

This document is a legacy version but should provide refeence understanding. We are about to rebuilt the following components today.

This script is build-time. It assembles on-disk EU folders that a future runner can execute with *no runtime retrieval*.

Key upgrades for scale + flexibility:
- RunSpec is a first-class input (--runspec): plan/prompt/rubric/steps live in a JSON file.
- Benchmark roster is supported (--roster): instances.jsonl is the benchmark contract.
- Payloads are plan-driven: copy/link only plan.deliveries[].payload_ref files (skip null, dedupe).
- Optional byte reuse at scale: hardlink-in-lab (copy fallback) via --payload-mode.
- Robustness: validation modes + atomic EU writes (temp dir -> rename).

Inputs (per RP):
  <rp_root>/rpv1__<anchor_caseId>/
    payloads/d1.json
    payloads/d2.json
    doc3.json
    (optional) manifest.json

Outputs (per EU):
  <out_root>/<benchmark_id>/<eu_id>/
    eu.json          (metadata + ground_truth; NEVER sent to model)
    plan.json        (delivery schedule / step mapping)
    payloads/*       (model-visible payloads referenced by plan)
    manifest.json    (required integrity binder; hashes all EU files except itself)

Notes:
- Delivery payload refs are treated as *relative* POSIX-style paths like "payloads/d1.json".
- If plan.delivery.payload_ref is null, that delivery introduces no new evidence bytes.
  The runner must NOT re-inject prior payload bytes for such deliveries.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
from typing import Any, Iterable, Iterator

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
DATASETS = PROJECT_ROOT / "datasets"

DEFAULT_RP_ROOT = DATASETS / "rps"
DEFAULT_EU_ROOT = DATASETS / "eus"


def utc_now_iso() -> str:
    return (
        datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z")
    )


def read_json(path: Path) -> Any:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def read_jsonl(path: Path) -> Iterator[dict[str, Any]]:
    with open(path, "r", encoding="utf-8") as f:
        for i, line in enumerate(f, start=1):
            raw = line.strip()
            if not raw:
                continue
            try:
                obj = json.loads(raw)
            except json.JSONDecodeError as e:
                raise ValueError(f"Invalid JSON on line {i} in {path}: {e}") from e
            if not isinstance(obj, dict):
                raise ValueError(f"Expected object per line in {path} (line {i})")
            yield obj


def write_json(path: Path, obj: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=2, ensure_ascii=False, sort_keys=True)
        f.write("\n")


def sha256_path(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def parse_csv_list(value: str) -> list[str]:
    items = [x.strip() for x in value.split(",")]
    return [x for x in items if x]


def normalize_payload_ref(ref: str) -> PurePosixPath:
    # Normalize Windows separators to POSIX.
    ref = str(ref).replace("\\", "/")
    p = PurePosixPath(ref)

    # Disallow absolute paths and traversal.
    if p.is_absolute():
        raise ValueError(f"payload_ref must be relative, got: {ref}")

    parts = p.parts
    if not parts:
        raise ValueError("payload_ref cannot be empty")
    if parts[0] != "payloads":
        raise ValueError(f"payload_ref must start with 'payloads/', got: {ref}")
    if len(parts) < 2:
        raise ValueError(f"payload_ref must include a filename under payloads/, got: {ref}")

    # Disallow drive-letter style paths (e.g., C:/...)
    if ":" in parts[0]:
        raise ValueError(f"payload_ref must be relative (no drive), got: {ref}")

    if any(part == ".." for part in parts):
        raise ValueError(f"payload_ref must not contain '..', got: {ref}")

    return p


def stable_shard(key: str, shard_count: int, shard_index: int) -> bool:
    if shard_count <= 1:
        return True
    digest = hashlib.sha256(key.encode("utf-8")).digest()
    bucket = int.from_bytes(digest[:8], "big") % shard_count
    return bucket == shard_index


def link_or_copy(src: Path, dst: Path, *, mode: str) -> str:
    dst.parent.mkdir(parents=True, exist_ok=True)

    if mode not in {"auto", "copy", "hardlink"}:
        raise ValueError(f"Unknown payload mode: {mode}")

    if mode in {"hardlink", "auto"}:
        try:
            os.link(src, dst)
            return "hardlink"
        except OSError:
            if mode == "hardlink":
                raise

    shutil.copy2(src, dst)
    return "copy"


def validate_plan(plan: dict[str, Any]) -> None:
    deliveries = plan.get("deliveries")
    if not isinstance(deliveries, list) or not deliveries:
        raise ValueError("plan.deliveries must be a non-empty list")

    seen_ids: set[int] = set()
    for d in deliveries:
        if not isinstance(d, dict):
            raise ValueError("plan.deliveries entries must be objects")

        did = d.get("delivery_id")
        if not isinstance(did, int):
            raise ValueError("each delivery must have integer delivery_id")
        if did in seen_ids:
            raise ValueError(f"duplicate delivery_id in plan: {did}")
        seen_ids.add(did)

        ref = d.get("payload_ref", None)
        if ref is None:
            continue
        if not isinstance(ref, str):
            raise ValueError(f"delivery {did} payload_ref must be string or null")
        normalize_payload_ref(ref)


def plan_payload_refs(plan: dict[str, Any]) -> list[PurePosixPath]:
    refs: list[PurePosixPath] = []
    for d in plan.get("deliveries", []):
        if not isinstance(d, dict):
            continue
        ref = d.get("payload_ref")
        if ref is None:
            continue
        refs.append(normalize_payload_ref(ref))

    # Dedupe while preserving deterministic order.
    unique = sorted({r.as_posix(): r for r in refs}.values(), key=lambda p: p.as_posix())
    return unique


def build_default_plan(
    *,
    include_delivery_3: bool,
    d1_steps: list[str],
    d2_steps: list[str],
    d3_steps: list[str],
) -> dict[str, Any]:
    plan: dict[str, Any] = {
        "protocol_version": "delivery-protocol-v1",
        "enforcement_mode": "strict",
        "session_strategy": "stateful_cumulative",
        "max_turns": 50,
        "deliveries": [
            {
                "delivery_id": 1,
                "name": "closed_universe_anchor",
                "description": "Delivery 1: Anchor evidence only (closed universe).",
                "payload_ref": "payloads/d1.json",
                "steps": d1_steps,
                "admissible_evidence": ["anchor"],
                "prompt_frame_id": "closed_universe_v1",
                "output_contract_id": "citation_extraction_v1",
                "scoring_rubric_id": "canary_discipline_v1",
                "expectations": {
                    "canary_active": True,
                    "allow_refusal": True,
                    "require_citations": True,
                },
            },
            {
                "delivery_id": 2,
                "name": "open_book_authorities",
                "description": "Delivery 2: Authority texts become admissible (open book).",
                "payload_ref": "payloads/d2.json",
                "steps": d2_steps,
                "admissible_evidence": ["anchor", "authorities"],
                "prompt_frame_id": "open_book_v1",
                "output_contract_id": "synthesis_v1",
                "scoring_rubric_id": "legal_accuracy_v1",
                "expectations": {
                    "canary_active": False,
                    "allow_refusal": False,
                    "require_citations": True,
                },
            },
        ],
    }

    if include_delivery_3:
        plan["deliveries"].append(
            {
                "delivery_id": 3,
                "name": "integrity_check",
                "description": "Delivery 3: S8 citation integrity gate (no new evidence).",
                "payload_ref": None,
                "steps": d3_steps,
                "admissible_evidence": ["anchor", "authorities"],
                "prompt_frame_id": "integrity_v1",
                "output_contract_id": "citation_verification_v1",
                "scoring_rubric_id": "fabrication_gate_v1",
                "expectations": {
                    "canary_active": False,
                    "allow_refusal": False,
                    "require_citations": True,
                },
            }
        )

    validate_plan(plan)
    return plan


def load_plan_and_labels(
    *,
    runspec_path: Path | None,
    include_delivery_3: bool,
    d1_steps: list[str],
    d2_steps: list[str],
    d3_steps: list[str],
    cli_benchmark_labels: list[str],
) -> tuple[dict[str, Any], dict[str, Any], list[str]]:
    meta: dict[str, Any] = {
        "runspec_path": None,
        "runspec_sha256": None,
        "runspec_source": "embedded_default",
    }

    if runspec_path is None:
        plan = build_default_plan(
            include_delivery_3=include_delivery_3,
            d1_steps=d1_steps,
            d2_steps=d2_steps,
            d3_steps=d3_steps,
        )
        labels = cli_benchmark_labels or ["canary", "s6_composite", "s8_integrity"]
        return plan, meta, labels

    obj = read_json(runspec_path)
    if not isinstance(obj, dict):
        raise ValueError("runspec JSON must be an object")

    plan_obj = obj.get("plan") if "plan" in obj else obj
    if not isinstance(plan_obj, dict):
        raise ValueError("runspec.plan must be an object")

    validate_plan(plan_obj)

    meta = {
        "runspec_path": runspec_path.as_posix(),
        "runspec_sha256": sha256_path(runspec_path),
        "runspec_source": "file",
    }

    labels = cli_benchmark_labels or obj.get("benchmark_labels") or ["canary", "s6_composite", "s8_integrity"]
    if not isinstance(labels, list) or not all(isinstance(x, str) for x in labels):
        raise ValueError("benchmark_labels must be a list of strings")

    return plan_obj, meta, labels


@dataclass(frozen=True)
class InstanceSpec:
    anchor_caseId: str
    eu_id: str
    rp_dir: Path
    instance_meta: dict[str, Any]


def infer_anchor_caseId_from_rp_dir(rp_dir: Path) -> str:
    if rp_dir.name.startswith("rpv1__"):
        return rp_dir.name.split("rpv1__", 1)[1]
    return rp_dir.name


def load_instances(
    *,
    roster_path: Path | None,
    rp_root: Path,
    eu_prefix: str,
    benchmark_id: str,
) -> tuple[list[InstanceSpec], dict[str, Any]]:
    meta: dict[str, Any] = {
        "roster_path": None,
        "roster_sha256": None,
        "roster_source": "rp_dir_scan",
    }

    instances: list[InstanceSpec] = []

    if roster_path is None:
        # Fallback: iterate RP directories (not a benchmark contract).
        if not rp_root.exists():
            raise FileNotFoundError(f"RP root not found: {rp_root}")

        rp_dirs = [p for p in rp_root.iterdir() if p.is_dir() and p.name.startswith("rpv1__")]
        for rp_dir in sorted(rp_dirs, key=lambda p: p.name):
            anchor_caseId = infer_anchor_caseId_from_rp_dir(rp_dir)
            eu_id = f"{eu_prefix}{anchor_caseId}"
            instances.append(
                InstanceSpec(
                    anchor_caseId=str(anchor_caseId),
                    eu_id=eu_id,
                    rp_dir=rp_dir,
                    instance_meta={},
                )
            )

        instances = sorted(instances, key=lambda i: i.eu_id)
        return instances, meta

    if not roster_path.exists():
        raise FileNotFoundError(f"Roster not found: {roster_path}")

    meta = {
        "roster_path": roster_path.as_posix(),
        "roster_sha256": sha256_path(roster_path),
        "roster_source": "instances_jsonl",
    }

    for row in read_jsonl(roster_path):
        if row.get("disabled") is True:
            continue

        row_benchmark_id = row.get("benchmark_id")
        if row_benchmark_id is not None and str(row_benchmark_id) != benchmark_id:
            raise ValueError(
                f"Roster benchmark_id mismatch: got {row_benchmark_id}, expected {benchmark_id}"
            )

        anchor_caseId = row.get("anchor_caseId")
        rp_id = row.get("rp_id")
        rp_path = row.get("rp_path")

        if not anchor_caseId:
            # Try infer from rp_id or rp_path.
            if isinstance(rp_id, str) and rp_id.startswith("rpv1__"):
                anchor_caseId = rp_id.split("rpv1__", 1)[1]
            elif isinstance(rp_path, str):
                anchor_caseId = infer_anchor_caseId_from_rp_dir(Path(rp_path))

        if not anchor_caseId:
            raise ValueError("Roster row missing anchor_caseId (and could not infer it)")

        if rp_path:
            rp_dir = Path(str(rp_path))
            if not rp_dir.is_absolute():
                rp_dir = PROJECT_ROOT / rp_dir
        elif rp_id:
            rp_dir = rp_root / str(rp_id)
        else:
            rp_dir = rp_root / f"rpv1__{anchor_caseId}"

        eu_id = str(row.get("eu_id") or f"{eu_prefix}{anchor_caseId}")

        instance_meta: dict[str, Any] = {}
        for k in ("split", "tags", "difficulty_bucket", "canary", "notes"):
            if k in row:
                instance_meta[k] = row[k]

        instances.append(
            InstanceSpec(
                anchor_caseId=str(anchor_caseId),
                eu_id=eu_id,
                rp_dir=rp_dir,
                instance_meta=instance_meta,
            )
        )

    # Deterministic processing order.
    instances = sorted(instances, key=lambda i: i.eu_id)
    return instances, meta


def validate_doc3(doc3: dict[str, Any]) -> None:
    if doc3.get("protocol_version") not in {"rp-doc3-v1"}:
        # Allow forward versions, but fail fast on missing.
        if not doc3.get("protocol_version"):
            raise ValueError("doc3.json missing protocol_version")

    if not doc3.get("rp_id"):
        raise ValueError("doc3.json missing rp_id")

    anchor = doc3.get("anchor")
    if not isinstance(anchor, dict):
        raise ValueError("doc3.json missing anchor object")

    if not anchor.get("caseId"):
        raise ValueError("doc3.anchor.caseId missing")

    k_policy = doc3.get("k_policy")
    if not isinstance(k_policy, dict):
        raise ValueError("doc3.json missing k_policy")

    scdb = doc3.get("scdb")
    if scdb is not None and not isinstance(scdb, dict):
        raise ValueError("doc3.scdb must be an object if present")


def build_eu_json(
    *,
    benchmark_id: str,
    eu_id: str,
    rp_doc3: dict[str, Any],
    benchmark_labels: list[str],
    runspec_meta: dict[str, Any],
    roster_meta: dict[str, Any],
    instance_meta: dict[str, Any],
) -> dict[str, Any]:
    anchor = rp_doc3.get("anchor", {}) if isinstance(rp_doc3.get("anchor"), dict) else {}

    anchor_caseId = str(anchor.get("caseId") or "")
    anchor_usCite = anchor.get("usCite")
    anchor_caseName = anchor.get("caseName")
    anchor_term = anchor.get("term")

    depth_labels: list[dict[str, Any]] = []
    for c in rp_doc3.get("citations", []):
        if not isinstance(c, dict):
            continue
        if c.get("source") != "SCOTUS":
            continue
        label = c.get("depth_label")
        if not label:
            continue
        depth_labels.append(
            {
                "citation_id": c.get("citation_id"),
                "cited_usCite": c.get("usCite"),
                "cited_caseName": c.get("caseName"),
                "cite_offset": c.get("cite_offset"),
                "label": label,
                "confidence": c.get("depth_confidence"),
                "reason": c.get("depth_reason"),
                "factor": c.get("depth_factor"),
                "tfidf_score": c.get("tfidf_score"),
            }
        )

    # Deterministic ordering (useful for diffing)
    depth_labels.sort(key=lambda r: (r.get("cite_offset") or 0, r.get("citation_id") or ""))

    scdb = rp_doc3.get("scdb", {}) if isinstance(rp_doc3.get("scdb"), dict) else {}
    k_policy = rp_doc3.get("k_policy", {}) if isinstance(rp_doc3.get("k_policy"), dict) else {}

    metadata: dict[str, Any] = {
        "anchor_caseId": anchor_caseId,
        "anchor_usCite": anchor_usCite,
        "anchor_caseName": anchor_caseName,
        "anchor_term": anchor_term,
        "benchmark_labels": benchmark_labels,
        "rp_id": rp_doc3.get("rp_id"),
        "rp_generator_version": rp_doc3.get("generator_version"),
        "dataset_snapshot_id": rp_doc3.get("dataset_snapshot_id"),
        "cite_offset_policy": rp_doc3.get("cite_offset_policy"),
    }

    if runspec_meta.get("runspec_sha256"):
        metadata["runspec_sha256"] = runspec_meta.get("runspec_sha256")
    if roster_meta.get("roster_sha256"):
        metadata["roster_sha256"] = roster_meta.get("roster_sha256")

    if instance_meta:
        metadata["instance"] = instance_meta

    return {
        "protocol_version": "eu-v1",
        "eu_id": eu_id,
        "benchmark_id": benchmark_id,
        "created_at": utc_now_iso(),
        "enforcement_mode": "strict",
        "metadata": metadata,
        "ground_truth": {
            "citation_depth_labels": depth_labels,
            "caseDisposition": scdb.get("caseDisposition"),
            "partyWinning": scdb.get("partyWinning"),
            "fowler_pauth_score": scdb.get("fowler_pauth_score"),
            "k_policy": k_policy,
        },
    }


def write_manifest(
    *,
    eu_dir: Path,
    eu_id: str,
    generator_version: str,
    provenance: dict[str, Any],
) -> None:
    entries: list[dict[str, Any]] = []

    for fp in eu_dir.rglob("*"):
        if not fp.is_file():
            continue
        if fp.name == "manifest.json":
            continue
        rel = fp.relative_to(eu_dir).as_posix()
        entries.append(
            {
                "path": rel,
                "sha256": sha256_path(fp),
                "bytes": fp.stat().st_size,
            }
        )

    manifest = {
        "protocol_version": "manifest-v1",
        "eu_id": eu_id,
        "created_at": utc_now_iso(),
        "generator_version": generator_version,
        "files": sorted(entries, key=lambda e: e["path"]),
        "provenance": provenance,
    }

    write_json(eu_dir / "manifest.json", manifest)


def main() -> None:
    p = argparse.ArgumentParser(
        description="Stage 4B: Build sealed EUs (EUv1) from RPv1 directories.",
    )

    p.add_argument("--rp-root", type=Path, default=DEFAULT_RP_ROOT, help="Root directory containing RPv1 packs")
    p.add_argument("--out-root", type=Path, default=DEFAULT_EU_ROOT, help="Output root directory for EUs")
    p.add_argument("--benchmark-id", type=str, default="legal10_v1")
    p.add_argument("--eu-prefix", type=str, default="eu__")

    p.add_argument(
        "--roster",
        type=Path,
        default=None,
        help="Path to instances.jsonl (benchmark contract). If omitted, scans rp-root (non-contract).",
    )
    p.add_argument(
        "--runspec",
        type=Path,
        default=None,
        help="Path to RunSpec JSON. If omitted, uses embedded default plan.",
    )

    p.add_argument("--payload-mode", choices=["auto", "copy", "hardlink"], default="auto")
    p.add_argument("--validation", choices=["off", "light", "full"], default="light")

    p.add_argument("--shard-count", type=int, default=1)
    p.add_argument("--shard-index", type=int, default=0)

    p.add_argument("--limit", type=int, default=0, help="Build first N EUs after filtering (0 = all)")
    p.add_argument("--overwrite", action="store_true")
    p.add_argument("--dry-run", action="store_true")

    # Default-plan only knobs (ignored when --runspec is provided)
    p.add_argument("--no-delivery-3", action="store_true", help="Default plan: omit Delivery 3")
    p.add_argument("--d1-steps", type=str, default="s1,s2,s3,s4")
    p.add_argument("--d2-steps", type=str, default="s5,s6,s7")
    p.add_argument("--d3-steps", type=str, default="s8")

    p.add_argument("--generator-version", type=str, default="stage4b-euv1")
    p.add_argument("--dataset-snapshot-id", type=str, default=None)
    p.add_argument(
        "--benchmark-label",
        action="append",
        default=[],
        help="Repeatable benchmark label (stored in eu.json metadata)",
    )

    args = p.parse_args()

    if args.shard_count < 1:
        print("ERROR: --shard-count must be >= 1", file=sys.stderr)
        sys.exit(1)
    if not (0 <= args.shard_index < args.shard_count):
        print("ERROR: --shard-index must be in [0, shard-count)", file=sys.stderr)
        sys.exit(1)

    d1_steps = parse_csv_list(args.d1_steps)
    d2_steps = parse_csv_list(args.d2_steps)
    d3_steps = parse_csv_list(args.d3_steps)

    plan_obj, runspec_meta, benchmark_labels = load_plan_and_labels(
        runspec_path=args.runspec,
        include_delivery_3=not args.no_delivery_3,
        d1_steps=d1_steps,
        d2_steps=d2_steps,
        d3_steps=d3_steps,
        cli_benchmark_labels=args.benchmark_label,
    )

    payload_refs = plan_payload_refs(plan_obj)

    instances, roster_meta = load_instances(
        roster_path=args.roster,
        rp_root=args.rp_root,
        eu_prefix=args.eu_prefix,
        benchmark_id=args.benchmark_id,
    )

    # Shard filter
    instances = [
        inst
        for inst in instances
        if stable_shard(inst.eu_id, args.shard_count, args.shard_index)
    ]

    out_root = args.out_root / args.benchmark_id

    built = 0
    skipped_exists = 0
    skipped_invalid = 0

    if args.dry_run:
        print("[DRY RUN] No files will be written.")

    if args.runspec is None:
        print("Using embedded default plan (use --runspec for variants).")
    else:
        print(f"Using runspec: {args.runspec}")

    if args.roster is None:
        print("No roster provided; scanning RP directories (non-contract).")
    else:
        print(f"Using roster: {args.roster}")

    print(f"Payload refs (from plan): {[p.as_posix() for p in payload_refs]}")

    if args.limit and args.limit < 0:
        print("ERROR: --limit must be >= 0", file=sys.stderr)
        sys.exit(1)

    for inst in instances:
        if args.limit and built >= args.limit:
            break

        rp_dir = inst.rp_dir
        doc3_path = rp_dir / "doc3.json"

        if not doc3_path.exists():
            skipped_invalid += 1
            continue

        try:
            rp_doc3 = read_json(doc3_path)
            if not isinstance(rp_doc3, dict):
                raise ValueError("doc3.json must be an object")

            if args.validation != "off":
                validate_doc3(rp_doc3)

            anchor = rp_doc3.get("anchor") if isinstance(rp_doc3.get("anchor"), dict) else {}
            anchor_caseId_doc3 = str(anchor.get("caseId") or "")
            if anchor_caseId_doc3 and anchor_caseId_doc3 != inst.anchor_caseId:
                raise ValueError(
                    f"anchor_caseId mismatch: roster={inst.anchor_caseId} doc3={anchor_caseId_doc3}"
                )

            if args.validation != "off":
                # Cross-check against d1 (helps catch mismatched RP directories early).
                d1_payload_path = rp_dir / "payloads" / "d1.json"
                if d1_payload_path.exists():
                    d1_obj = read_json(d1_payload_path)
                    if not isinstance(d1_obj, dict):
                        raise ValueError("payloads/d1.json must be an object")
                    d1_anchor = d1_obj.get("anchor") if isinstance(d1_obj.get("anchor"), dict) else {}
                    d1_caseId = str(d1_anchor.get("caseId") or "")
                    if not d1_caseId:
                        raise ValueError("payloads/d1.json missing anchor.caseId")
                    if d1_caseId != inst.anchor_caseId:
                        raise ValueError(
                            f"anchor_caseId mismatch: roster={inst.anchor_caseId} d1={d1_caseId}"
                        )
                    if anchor_caseId_doc3 and d1_caseId != anchor_caseId_doc3:
                        raise ValueError(
                            f"anchor_caseId mismatch: d1={d1_caseId} doc3={anchor_caseId_doc3}"
                        )

            # Ensure all referenced payloads exist in RP.
            for ref in payload_refs:
                src = rp_dir / Path(ref.as_posix())
                if not src.exists():
                    raise FileNotFoundError(f"Missing payload in RP: {src}")

            # Optional deeper validation: parse payload JSONs (can be slow if d1 is large).
            if args.validation == "full":
                for ref in payload_refs:
                    payload_obj = read_json(rp_dir / Path(ref.as_posix()))
                    if not isinstance(payload_obj, dict):
                        raise ValueError(f"payload {ref.as_posix()} must be an object")
                    if not payload_obj.get("protocol_version"):
                        raise ValueError(f"payload {ref.as_posix()} missing protocol_version")

            eu_id = inst.eu_id
            eu_dir = out_root / eu_id

            if eu_dir.exists() and not args.overwrite:
                skipped_exists += 1
                continue

            if args.dry_run:
                print(f"[DRY RUN] Would build EU: {eu_dir}")
                built += 1
                continue

            # Atomic build: write into temp dir, then rename to final.
            tmp_dir = out_root / f".{eu_id}.tmp_{os.getpid()}_{int(time.time() * 1000)}"
            if tmp_dir.exists():
                shutil.rmtree(tmp_dir)
            tmp_dir.mkdir(parents=True, exist_ok=False)

            try:
                # Copy/link payloads
                payload_counts = {"hardlink": 0, "copy": 0}
                for ref in payload_refs:
                    src = rp_dir / Path(ref.as_posix())
                    dst = tmp_dir / Path(ref.as_posix())
                    method = link_or_copy(src, dst, mode=args.payload_mode)
                    payload_counts[method] += 1

                eu_obj = build_eu_json(
                    benchmark_id=args.benchmark_id,
                    eu_id=eu_id,
                    rp_doc3=rp_doc3,
                    benchmark_labels=benchmark_labels,
                    runspec_meta=runspec_meta,
                    roster_meta=roster_meta,
                    instance_meta=inst.instance_meta,
                )

                write_json(tmp_dir / "eu.json", eu_obj)
                write_json(tmp_dir / "plan.json", plan_obj)

                provenance = {
                    "dataset_snapshot_id": args.dataset_snapshot_id
                    or eu_obj.get("metadata", {}).get("dataset_snapshot_id"),
                    "rp_id": rp_doc3.get("rp_id"),
                    "rp_generator_version": rp_doc3.get("generator_version"),
                    "runspec_sha256": runspec_meta.get("runspec_sha256"),
                    "roster_sha256": roster_meta.get("roster_sha256"),
                    "payload_mode_requested": args.payload_mode,
                    "payloads_hardlinked": payload_counts["hardlink"],
                    "payloads_copied": payload_counts["copy"],
                }
                if payload_counts["hardlink"] and payload_counts["copy"]:
                    provenance["payload_mode_effective"] = "mixed"
                elif payload_counts["hardlink"]:
                    provenance["payload_mode_effective"] = "hardlink"
                else:
                    provenance["payload_mode_effective"] = "copy"

                write_manifest(
                    eu_dir=tmp_dir,
                    eu_id=eu_id,
                    generator_version=args.generator_version,
                    provenance=provenance,
                )

                # Finalize
                if eu_dir.exists() and args.overwrite:
                    shutil.rmtree(eu_dir)
                tmp_dir.rename(eu_dir)

            except Exception:
                # Clean up temp dir on failure.
                if tmp_dir.exists():
                    shutil.rmtree(tmp_dir)
                raise

            built += 1

        except Exception as e:
            skipped_invalid += 1
            print(f"[SKIP] {inst.anchor_caseId} ({inst.rp_dir}): {e}")
            continue

    print("Done.")
    print(f"  Built:             {built:,}")
    print(f"  Skipped (exists):  {skipped_exists:,}")
    print(f"  Skipped (invalid): {skipped_invalid:,}")
    print(f"  Output root:       {out_root}")


if __name__ == "__main__":
    main()

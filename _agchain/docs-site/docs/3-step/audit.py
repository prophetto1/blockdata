"""Audit: SHA-256 hashing and audit log emission."""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def hash_file(path: Path) -> str:
    """Compute SHA-256 hex digest of a file."""
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def hash_bytes(data: bytes) -> str:
    """Compute SHA-256 hex digest of raw bytes."""
    return hashlib.sha256(data).hexdigest()


def emit_audit_record(
    audit_log_path: Path,
    *,
    run_id: str,
    step_id: str,
    call_id: str,
    staged_files: dict[str, str],
    message_hash: str,
    response_hash: str | None = None,
    payloads_admitted: list[str] | None = None,
    message_byte_count: int | None = None,
    ground_truth_accessed: bool = False,
    judge_prompts_accessed: bool = False,
) -> None:
    """Append an audit record to audit_log.jsonl."""
    record = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "run_id": run_id,
        "step_id": step_id,
        "call_id": call_id,
        "staged_files": staged_files,
        "message_hash": message_hash,
        "payloads_admitted": payloads_admitted or [],
        "message_byte_count": message_byte_count,
        "ground_truth_accessed": ground_truth_accessed,
        "judge_prompts_accessed": judge_prompts_accessed,
    }
    if response_hash is not None:
        record["response_hash"] = response_hash

    audit_log_path.parent.mkdir(parents=True, exist_ok=True)
    with open(audit_log_path, "a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False) + "\n")


def emit_run_record(
    run_log_path: Path,
    record: dict[str, Any],
) -> None:
    """Append a record to run.jsonl, including optional supporting metadata."""
    run_log_path.parent.mkdir(parents=True, exist_ok=True)
    with open(run_log_path, "a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False) + "\n")
